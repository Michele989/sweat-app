// Funzione serverless (Vercel). Riceve la foto dal browser, chiama Claude
// in modo sicuro (la chiave API resta solo sul server) e risponde con un
// piccolo oggetto JSON che il front-end usa per riempire le 4 "insight cell".

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const { imageBase64, mediaType } = req.body || {};
    if (!imageBase64 || !mediaType) {
      res.status(400).json({ error: 'missing_image' });
      return;
    }

    const prompt =
      "Guarda questa foto per un prototipo dimostrativo di un'app fitness (NON è una valutazione medica reale). " +
      "Rispondi SOLO con un oggetto JSON con queste 4 chiavi, ciascuna un testo breve in italiano (massimo 6 parole), " +
      "generico, positivo, mai relativo al peso o a giudizi sul corpo, mai una diagnosi:\n" +
      '{"corporatura": "...", "focus": "...", "postura": "...", "livello": "..."}\n' +
      'Esempio di tono: corporatura="Corporatura atletica", focus="Focus suggerito: mobilità", ' +
      'postura="Postura eretta, spalle allineate", livello="Livello stimato: intermedio". ' +
      "Rispondi SOLO con il JSON, nessun altro testo.";

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = (data.content && data.content[0] && data.content[0].text) || '{}';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: 'analysis_failed' });
  }
};
