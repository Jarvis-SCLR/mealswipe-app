import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.payment_status === 'paid' && session.subscription) {
      const subscription = session.subscription as Stripe.Subscription;
      
      // Determine plan type from price
      const priceId = subscription.items.data[0]?.price.id;
      const isAnnual = priceId === process.env.STRIPE_PRICE_ANNUAL;

      return res.status(200).json({
        paid: true,
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        plan: isAnnual ? 'annual' : 'monthly',
      });
    }

    return res.status(200).json({
      paid: false,
      status: session.payment_status,
    });
  } catch (error: any) {
    console.error('Error verifying session:', error);
    return res.status(500).json({
      error: 'Failed to verify session',
      message: error.message,
    });
  }
}
