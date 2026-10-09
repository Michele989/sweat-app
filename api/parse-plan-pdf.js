// Funzione serverless (Vercel). Riceve un PDF (scheda di allenamento o piano
// alimentare che l'utente ha ricevuto dal suo personal trainer/nutrizionista),
// ne estrae il testo con pdf-parse, poi chiede a Claude di trasformarlo in un
// JSON strutturato compatibile con "La mia scheda" / "Alimentazione" dell'app,
// così l'utente può importarlo e poi continuare a modificarlo a mano.
const pdfParse = require('pdf-parse');

const WEEK_DAYS = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const { pdfBase64, kind } = req.body || {};
    if (!pdfBase64 || (kind !== 'scheda' && kind !== 'dieta')) {
      res.status(400).json({ error: 'missing_pdf_or_kind' });
      return;
    }

    let extractedText = '';
    try {
      const buffer = Buffer.from(pdfBase64, 'base64');
      const parsed = await pdfParse(buffer);
      extractedText = (parsed.text || '').trim();
    } catch (e2) {
      res.status(422).json({ error: 'pdf_unreadable' });
      return;
    }

    if (!extractedText) {
      res.status(422).json({ error: 'pdf_empty' });
      return;
    }
    // Teniamo il prompt entro una lunghezza ragionevole (costo/tempo di risposta).
    const safeText = extractedText.slice(0, 12000);

    const prompt = kind === 'scheda'
      ? "Il testo seguente è stato estratto da un PDF con una scheda di allenamento che una persona ha ricevuto " +
        "(da un personal trainer o da un'app). Trasformalo in un piano settimanale, dal lunedì alla domenica. " +
        'Rispondi SOLO con un array JSON di 7 oggetti, uno per ogni giorno nell\'ordine LUN,MAR,MER,GIO,VEN,SAB,DOM, ognuno con: ' +
        '{"day": "sigla (LUN..DOM)", "title": "titolo breve del giorno, es. \'Petto e tricipiti\' oppure \'Riposo\' se non c\'è allenamento quel giorno", ' +
        '"exercises": [{"name": "nome esercizio", "sets": numero_serie_o_null, "reps": numero_ripetizioni_o_null, "weight_kg": peso_in_kg_o_null}]}. ' +
        'Se il testo non specifica quali giorni corrispondono a quali allenamenti, distribuisci gli allenamenti trovati sui primi giorni disponibili e lascia "Riposo" con exercises vuoto negli altri. ' +
        'Se un dato (serie, ripetizioni, peso) non è specificato nel testo, usa null, non inventarlo. Non aggiungere testo prima o dopo il JSON.\n\n' +
        'TESTO ESTRATTO DAL PDF:\n' + safeText
      : "Il testo seguente è stato estratto da un PDF con un piano alimentare che una persona ha ricevuto " +
        "(da un nutrizionista o da un'app). Trasformalo in un piano settimanale, dal lunedì alla domenica. " +
        'Rispondi SOLO con un oggetto JSON: {"calorie_target": numero_kcal_o_null, "days": [array di 7 oggetti nell\'ordine LUN,MAR,MER,GIO,VEN,SAB,DOM, ognuno con: ' +
        '{"day": "sigla (LUN..DOM)", "colazione": "testo", "pranzo": "testo", "cena": "testo", "spuntini": "testo"}]}. ' +
        'Se il piano nel PDF è uguale tutti i giorni (non diviso per giorno della settimana), ripeti lo stesso contenuto su tutti e 7 i giorni. ' +
        'Se una sezione non è specificata nel testo, lascia una stringa vuota, non inventare cibi. Non aggiungere testo prima o dopo il JSON.\n\n' +
        'TESTO ESTRATTO DAL PDF:\n' + safeText;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = (data.content && data.content[0] && data.content[0].text) || (kind === 'scheda' ? '[]' : '{}');
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (kind === 'scheda') {
      const days = Array.isArray(parsed) ? parsed : [];
      // Normalizza sempre a 7 giorni nell'ordine corretto, anche se l'IA ne ha restituiti meno.
      const byDay = {};
      days.forEach(function (d) { if (d && d.day) byDay[String(d.day).toUpperCase().slice(0, 3)] = d; });
      const normalized = WEEK_DAYS.map(function (label) {
        const d = byDay[label];
        return {
          day: label,
          title: (d && d.title) ? String(d.title) : 'Riposo',
          exercises: (d && Array.isArray(d.exercises)) ? d.exercises.map(function (ex) {
            return {
              name: String(ex.name || '').trim(),
              sets: (ex.sets === null || ex.sets === undefined || ex.sets === '') ? null : parseInt(ex.sets, 10),
              reps: (ex.reps === null || ex.reps === undefined || ex.reps === '') ? null : parseInt(ex.reps, 10),
              weight_kg: (ex.weight_kg === null || ex.weight_kg === undefined || ex.weight_kg === '') ? null : parseFloat(ex.weight_kg)
            };
          }).filter(function (ex) { return ex.name; }) : []
        };
      });
      res.status(200).json({ days: normalized });
    } else {
      const byDay = {};
      (parsed.days || []).forEach(function (d) { if (d && d.day) byDay[String(d.day).toUpperCase().slice(0, 3)] = d; });
      const normalized = WEEK_DAYS.map(function (label) {
        const d = byDay[label] || {};
        return {
          day: label,
          colazione: String(d.colazione || ''),
          pranzo: String(d.pranzo || ''),
          cena: String(d.cena || ''),
          spuntini: String(d.spuntini || '')
        };
      });
      res.status(200).json({ calorie_target: (parsed.calorie_target || null), days: normalized });
    }
  } catch (e) {
    res.status(500).json({ error: 'parse_failed' });
  }
};
