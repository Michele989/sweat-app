// Lavoro giornaliero automatico (chiamato da un Vercel Cron Job, vedi
// vercel.json): 1) notifiche di "ri-coinvolgimento" a chi non si è visto
// da un po' — scrivere sulla tabella "notifications" fa scattare anche la
// push reale, lo stesso webhook già usato per i like/commenti/follow;
// 2) pulizia delle Storie scadute (più vecchie di 24 ore), che altrimenti
// resterebbero per sempre nel database anche se nessuno le vede più.
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // Protezione: solo Vercel Cron (o chi conosce il segreto) può chiamarla.
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
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();

    // Utenti inattivi da 3-14 giorni (oltre i 14 evitiamo di continuare a
    // scrivergli all'infinito: a quel punto serve una strategia diversa,
    // non una notifica quotidiana), a cui non abbiamo già scritto nei
    // 3 giorni precedenti.
    const { data: inactive, error } = await supabaseAdmin
      .from('profiles')
      .select('id,name,last_seen,last_reengagement_sent')
      .lt('last_seen', threeDaysAgo)
      .gt('last_seen', fourteenDaysAgo);

    if (error) throw error;

    const toNotify = (inactive || []).filter(function (p) {
      return !p.last_reengagement_sent || p.last_reengagement_sent < threeDaysAgo;
    });

    let sent = 0;
    for (const p of toNotify) {
      await supabaseAdmin.from('notifications').insert({
        user_id: p.id,
        type: 'reengagement',
        content: 'Ci manchi! Torna su Sweat per non perdere la tua serie e la classifica settimanale 🏃'
      });
      await supabaseAdmin.from('profiles').update({ last_reengagement_sent: new Date().toISOString() }).eq('id', p.id);
      sent++;
    }

    // Pulizia delle Storie scadute: nessuno può più leggerle (RLS), ma la
    // riga resterebbe comunque per sempre se non la cancelliamo.
    let storiesDeleted = 0;
    try {
      const { data: deletedStories } = await supabaseAdmin
        .from('stories')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');
      storiesDeleted = (deletedStories || []).length;
    } catch (e2) { /* la pulizia delle storie non deve far fallire le notifiche */ }

    res.status(200).json({ checked: (inactive || []).length, notified: sent, stories_deleted: storiesDeleted });
  } catch (e) {
    res.status(500).json({ error: 'cron_failed' });
  }
};
