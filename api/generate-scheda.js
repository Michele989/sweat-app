module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const { goal, level, days, pro } = req.body || {};
    const safeGoal = String(goal || 'Tonificazione');
    const safeLevel = String(level || 'Intermedio');
    const safeDays = String(days || '3').replace('+', '');

    let proLines = '';
    if (pro && typeof pro === 'object') {
      // NB: eventuali condizioni mediche NON arrivano mai qui (il client non le invia).
      if (pro.age) proLines += `Età: ${pro.age} anni. `;
      if (pro.sex) proLines += `Sesso: ${pro.sex}. `;
      if (pro.experienceLevel) proLines += `Livello di esperienza dichiarato: ${pro.experienceLevel}. `;
      if (Array.isArray(pro.trainingTypes) && pro.trainingTypes.length) proLines += `Attività preferite: ${pro.trainingTypes.join(', ')}. `;
      if (pro.equipmentAccess) proLines += `Attrezzatura disponibile: ${pro.equipmentAccess.replace('_', ' ')}. `;
      if (pro.trainingConstraints) proLines += `Vincoli pratici indicati dall'utente: ${pro.trainingConstraints}. `;
      if (pro.primaryGoal) proLines += `Obiettivo primario a lungo termine: ${pro.primaryGoal}. `;
    }

    const prompt =
      "Crea una scheda di allenamento settimanale per un'app fitness " +
      "(contesto dimostrativo, non un vero piano clinico). " +
      `Obiettivo: ${safeGoal}. Livello della persona: ${safeLevel}. Giorni a settimana disponibili: ${safeDays}. ` +
      (proLines ? `Dati aggiuntivi dell'utente (account Pro): ${proLines}` : '') +
      `Adatta la difficolta, il volume degli esercizi, l'attrezzatura richiesta e i vincoli pratici ai dati forniti. ` +
      `Rispondi SOLO con un array JSON di ${safeDays} oggetti, uno per giorno di allenamento, ognuno con: ` +
      '{"day": "sigla breve del giorno (es. LUN)", "title": "titolo breve del giorno (es. Petto e Tricipiti)", ' +
      '"detail": "elenco di 3-5 esercizi concreti con serie x ripetizioni, separati da · (es. \'Panca piana 4x8-10 · Croci manubri 3x12 · Dip 3x12\')"}. ' +
      'Testo in italiano, generico e sicuro (nessun carico assoluto in kg, solo serie x ripetizioni), nessun numero di ripetizioni estremo. ' +
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
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = (data.content && data.content[0] && data.content[0].text) || '[]';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: 'generation_failed' });
  }
};
