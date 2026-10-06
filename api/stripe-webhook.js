const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', (chunk) => chunks.push(chunk));
    readable.on('end', () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    res.status(400).send('Webhook signature invalid');
    return;
  }

  const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.client_reference_id;
      if (userId) {
        await supabaseAdmin.from('profiles').update({
          is_premium: true,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          stripe_subscription_status: 'active'
        }).eq('id', userId);
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const active = sub.status === 'active' || sub.status === 'trialing';
      await supabaseAdmin.from('profiles').update({
        is_premium: active,
        stripe_subscription_status: sub.status
      }).eq('stripe_subscription_id', sub.id);
    }
  } catch (e) {
    res.status(500).json({ error: 'webhook_processing_failed' });
    return;
  }

  res.status(200).json({ received: true });
};

handler.config = { api: { bodyParser: false } };
module.exports = handler;
