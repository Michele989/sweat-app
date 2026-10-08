// Cancella definitivamente l'account di chi chiama (GDPR / "diritto all'oblio").
// Il client manda il proprio token di accesso Supabase nell'header Authorization;
// qui verifichiamo chi è davvero e cancelliamo l'utente con la chiave service_role
// (unica chiave che può farlo). Tutte le tabelle collegate (profili, post, like,
// commenti, follow, messaggi, notifiche, storie, sfide, ecc.) hanno "on delete
// cascade" verso auth.users, quindi cancellare l'utente cancella automaticamente
// tutti i suoi dati.
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      res.status(401).json({ error: 'missing_token' });
      return;
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData || !userData.user) {
      res.status(401).json({ error: 'invalid_token' });
      return;
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
    if (deleteError) throw deleteError;

    res.status(200).json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: 'delete_failed' });
  }
};
