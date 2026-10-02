module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const { hasAnalysis, allergies } = req.body || {};
    const allergyList = Array.isArray(allergies) && allergies.length ? allergies : ['Nessuna'];

    const prompt =
      "Suggerisci indicazioni alimentari generiche e informative per un'app fitness " +
      "(contesto dimostrativo, NON una dieta clinica). " +
      `L'utente ha fatto di recente le analisi del sangue: ${hasAnalysis === 'si' ? 'sì' : 'no'}. ` +
      `Allergie/intolleranze dichiarate: ${allergyList.includes('Nessuna') ? 'nessuna' : allergyList.join(', ')}. ` +
      'REGOLA CRITICA: non includere MAI alimenti che contengono gli allergeni dichiarati, in nessun pasto. ' +
      'Rispondi SOLO con un oggetto JSON: ' +
      '{"colazione": "...", "pranzo": "...", "cena": "...", "spuntini": "..."}, ' +
      'ogni valore una frase breve in italiano (max 20 parole), generica, equilibrata, senza quantità o marchi specifici, ' +
      'senza consigli medici, evitando completamente gli allergeni indicati. Rispondi SOLO con il JSON.';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
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
