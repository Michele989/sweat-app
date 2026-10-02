module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const { hasAnalysis, allergies } = req.body || {};
    const allergyList = Array.isArray(allergies) && allergies.length ? allergies : ['Nessuna'];

    const prompt =
      "Crea un piano alimentare informativo di 5 giorni (lunedi-venerdi) per un'app fitness " +
      "(contesto dimostrativo, NON una dieta clinica). " +
      `L'utente ha fatto di recente le analisi del sangue: ${hasAnalysis === 'si' ? 'si' : 'no'}. ` +
      `Allergie/intolleranze dichiarate: ${allergyList.includes('Nessuna') ? 'nessuna' : allergyList.join(', ')}. ` +
      'REGOLA CRITICA: non includere MAI, in nessun giorno e in nessun pasto, alimenti che contengono gli allergeni dichiarati. ' +
      "Varia i pasti tra un giorno e l'altro (non ripetere lo stesso pasto ogni giorno). " +
      'Rispondi SOLO con un oggetto JSON con questa forma esatta: ' +
      '{"days": [' +
      '{"day": "LUN", "colazione": "...", "pranzo": "...", "cena": "...", "spuntini": "..."}, ' +
      '... (un oggetto per LUN, MAR, MER, GIO, VEN)' +
      ']}. ' +
      'Ogni valore (colazione/pranzo/cena/spuntini) e una frase breve in italiano (max 18 parole), generica, equilibrata, ' +
      'senza quantita precise o marchi, senza consigli medici, evitando completamente gli allergeni indicati. ' +
      'Rispondi SOLO con il JSON, senza testo prima o dopo.';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = (data.content && data.content[0] && data.content[0].text) || '{}';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: 'generation_failed' });
  }
};
