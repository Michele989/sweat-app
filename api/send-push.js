const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:michele1198@live.it',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    // Supabase Database Webhooks mandano { type, table, record, old_record, schema }
    const record = req.body && req.body.record;
    if (!record || !record.user_id) {
      res.status(400).json({ error: 'missing_record' });
      return;
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: subs, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', record.user_id);

    if (error) throw error;
    if (!subs || subs.length === 0) {
      res.status(200).json({ sent: 0 });
      return;
    }

    const payload = JSON.stringify({
      title: 'Sweat',
      body: record.content || 'Hai una nuova notifica',
      url: '/index.html'
    });

    let sent = 0;
    for (const s of subs) {
      const pushSubscription = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth_key }
      };
      try {
        await webpush.sendNotification(pushSubscription, payload);
        sent++;
      } catch (err) {
        // Abbonamento scaduto/non valido: lo rimuoviamo per non riprovare a vuoto
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', s.id);
        }
      }
    }

    res.status(200).json({ sent: sent });
  } catch (e) {
    res.status(500).json({ error: 'send_failed' });
  }
};
