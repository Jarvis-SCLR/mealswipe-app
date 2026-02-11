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
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: 'User ID and email required' });
    }

    // Try to find customer by userId first
    // Try to find customer by userId first
    const searchResult = await stripe.customers.search({
      query: `metadata['userId']:'${userId}'`,
      limit: 1,
    });

    let customer = searchResult.data[0];

    // If not found, try by email
    if (!customer) {
      const listResult = await stripe.customers.list({
        email,
        limit: 1,
      });
      customer = listResult.data[0];
    }

    if (!customer) {
      return res.status(200).json({ hasActiveSubscription: false });
    }

    // Update customer metadata if needed
    if (customer.metadata?.userId !== userId) {
      await stripe.customers.update(customer.id, {
        metadata: { userId },
      });
    }

    // Check for active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      return res.status(200).json({
        hasActiveSubscription: true,
        subscriptionId: subscription.id,
        currentPeriodEnd: subscription.current_period_end,
      });
    }

    // Check for trialing subscription
    const trialingSubscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'trialing',
      limit: 1,
    });

    if (trialingSubscriptions.data.length > 0) {
      const subscription = trialingSubscriptions.data[0];
      return res.status(200).json({
        hasActiveSubscription: true,
        subscriptionId: subscription.id,
        currentPeriodEnd: subscription.current_period_end,
      });
    }

    return res.status(200).json({ hasActiveSubscription: false });
  } catch (error: any) {
    console.error('Error restoring purchases:', error);
    return res.status(500).json({
      error: 'Failed to restore purchases',
      message: error.message,
    });
  }
}
