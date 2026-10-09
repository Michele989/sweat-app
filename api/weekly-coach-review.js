// Lavoro settimanale automatico (chiamato da un Vercel Cron Job, vedi
// vercel.json): guarda gli ultimi 14 giorni di ogni utente (allenamenti
// pubblicati, pesi registrati in "performance_logs", peso corporeo in
// "weight_logs", pasti segnati nel diario) e chiede a Claude un consiglio
// breve, personale e in italiano. Il consiglio arriva come una normale
// notifica (tabella "notifications"), che fa scattare anche la push reale
// esattamente come già succede per i like o i commenti.
// NB: niente qui sostituisce un vero personal trainer o nutrizionista —
// il testo lo ricorda sempre esplicitamente.
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  const auth = req.headers['authorization'] || '';
  if (!process.env.CRON_SECRET || auth !== 'Bearer ' + process.env.CRON_SECRET) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const now = Date.now();
    const since14 = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();
    const since7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const since14date = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Solo utenti che si sono visti di recente: a chi è sparito da un mese
    // non ha senso commentare "progressi" che non esistono.
    const { data: activeUsers, error } = await supabaseAdmin
      .from('profiles')
      .select('id,name')
      .gt('last_seen', since30);
    if (error) throw error;

    let reviewed = 0;
    let sent = 0;

    for (const u of (activeUsers || [])) {
      reviewed++;
      try {
        const [postsRes, perfRes, weightRes, mealsRes] = await Promise.all([
          supabaseAdmin.from('posts').select('type,perceived_effort,duration_min,created_at').eq('author_id', u.id).eq('archived', false).gte('created_at', since14),
          supabaseAdmin.from('performance_logs').select('exercise,weight_kg,reps,sets,log_date').eq('user_id', u.id).gte('log_date', since14date).order('log_date', { ascending: true }),
          supabaseAdmin.from('weight_logs').select('weight_kg,log_date').eq('user_id', u.id).gte('log_date', since14date).order('log_date', { ascending: true }),
          supabaseAdmin.from('meal_logs').select('id').eq('user_id', u.id).gte('created_at', since7)
        ]);

        const posts = postsRes.data || [];
        const perf = perfRes.data || [];
        const weights = weightRes.data || [];
        const mealsCount = (mealsRes.data || []).length;

        // Niente da commentare: salta, non mandiamo notifiche vuote.
        if (!posts.length && !perf.length && !weights.length && !mealsCount) continue;

        // Progressione per esercizio: primo vs ultimo peso registrato nella finestra.
        const byExercise = {};
        perf.forEach(function (p) {
          const key = (p.exercise || '').trim().toLowerCase();
          if (!key) return;
          if (!byExercise[key]) byExercise[key] = { name: p.exercise, first: p.weight_kg, last: p.weight_kg };
          byExercise[key].last = p.weight_kg;
        });
        const progressionLines = Object.values(byExercise).map(function (e) {
          if (e.first == null || e.last == null) return e.name + ": dati registrati";
          const delta = e.last - e.first;
          return e.name + ": da " + e.first + "kg a " + e.last + "kg (" + (delta >= 0 ? "+" : "") + delta.toFixed(1) + "kg)";
        });

        const weightTrend = weights.length >= 2
          ? ("peso corporeo da " + weights[0].weight_kg + "kg a " + weights[weights.length - 1].weight_kg + "kg")
          : (weights.length === 1 ? ("un solo peso corporeo registrato: " + weights[0].weight_kg + "kg") : "nessun peso corporeo registrato");

        const summary =
          "Allenamenti pubblicati negli ultimi 14 giorni: " + posts.length + ". " +
          "Sforzo percepito medio: " + (posts.filter(function (p) { return p.perceived_effort; }).length
            ? (posts.reduce(function (s, p) { return s + (p.perceived_effort || 0); }, 0) / Math.max(1, posts.filter(function (p) { return p.perceived_effort; }).length)).toFixed(1)
            : "non indicato") + "/10. " +
          "Progressione pesi: " + (progressionLines.length ? progressionLines.join("; ") : "nessun dato di performance registrato") + ". " +
          "Peso corporeo: " + weightTrend + ". " +
          "Pasti segnati nel diario negli ultimi 7 giorni: " + mealsCount + ".";

        const prompt =
          "Sei un assistente dentro un'app fitness (NON sei un personal trainer o nutrizionista reale, questo va detto chiaramente). " +
          "Guarda questo riepilogo delle ultime due settimane di un utente e scrivi un consiglio breve, in italiano, massimo 3 frasi, " +
          "concreto e motivante, basato SOLO sui numeri forniti (non inventare nulla che non sia nel riepilogo). " +
          "Se i dati sono troppo pochi per dire qualcosa di utile, invita gentilmente a registrare qualche dato in più. " +
          "Chiudi sempre ricordando in poche parole che non sostituisci un professionista reale. " +
          "Rispondi SOLO col testo del consiglio, senza introduzioni.\n\nRIEPILOGO:\n" + summary;

        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 300,
            messages: [{ role: 'user', content: prompt }]
          })
        });
        const aiData = await aiRes.json();
        const advice = (aiData.content && aiData.content[0] && aiData.content[0].text) ? aiData.content[0].text.trim() : null;
        if (!advice) continue;

        await supabaseAdmin.from('notifications').insert({
          user_id: u.id,
          type: 'coach_review',
          content: '🧭 Il tuo check settimanale: ' + advice
        });
        sent++;
      } catch (userErr) {
        // Un errore su un utente non deve bloccare gli altri.
        continue;
      }
    }

    res.status(200).json({ reviewed: reviewed, sent: sent });
  } catch (e) {
    res.status(500).json({ error: 'cron_failed' });
  }
};
