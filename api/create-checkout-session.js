const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  try {
    const { userId, email } = req.body || {};
    if (!userId) {
      res.status(400).json({ error: 'missing_user' });
      return;
    }

    const origin = req.headers.origin || ('https://' + req.headers.host);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      client_reference_id: userId,
      customer_email: email || undefined,
      success_url: origin + '/index.html?pro=success',
      cancel_url: origin + '/index.html?pro=cancel'
    });

    res.status(200).json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: 'checkout_failed' });
  }
};
