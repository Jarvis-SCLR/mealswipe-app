import { Alert, Platform, Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Stripe Configuration
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51RrLsAAVbwDXgub4LudbW4vq8YslNYLTmKvtvKlhDBPEMnmaWwhPYgF3pvH4dFkoaqyeq9gqIKFoCTPPKX66G2zX00pYBa7SWU';

// Price IDs from Stripe Dashboard
export const STRIPE_PRICES = {
  premium_monthly: 'price_1SzUKNAVbwDXgub4FOpFaciF',  // $3.99/month
  premium_annual: 'price_1SzULPAVbwDXgub4NF9EX5GT',   // $29.99/year
};

// Pricing display values
export const PRICING = {
  monthly: {
    price: 3.99,
    priceId: STRIPE_PRICES.premium_monthly,
    period: 'month',
    label: '$3.99/month',
  },
  annual: {
    price: 29.99,
    monthlyEquivalent: 2.50,
    priceId: STRIPE_PRICES.premium_annual,
    period: 'year',
    label: '$29.99/year',
    savings: 37, // percent saved vs monthly
  },
};

// Backend API URL - Vercel serverless functions
const API_URL = process.env.API_URL || 'https://mealswipe-api.vercel.app/api';

export type SubscriptionStatus = 'free' | 'premium' | 'expired' | 'canceled';

interface SubscriptionInfo {
  status: SubscriptionStatus;
  expiresAt?: Date;
  cancelAtPeriodEnd?: boolean;
  plan?: 'monthly' | 'annual';
}

class StripeService {
  /**
   * Create a Stripe Checkout session and open in browser
   */
  async createCheckoutSession(
    userId: string,
    email: string,
    plan: 'monthly' | 'annual'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const priceId = plan === 'annual' 
        ? STRIPE_PRICES.premium_annual 
        : STRIPE_PRICES.premium_monthly;

      const response = await fetch(`${API_URL}/stripe/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email,
          priceId,
          successUrl: 'mealswipe://subscription-success',
          cancelUrl: 'mealswipe://subscription-cancel',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create checkout session');
      }

      const { url, sessionId } = await response.json();

      // Store session ID for verification later
      await SecureStore.setItemAsync('pending_checkout_session', sessionId);

      // Open Stripe Checkout in browser
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return { success: true };
      } else {
        throw new Error('Cannot open checkout URL');
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      return { success: false, error: error.message || 'Payment failed' };
    }
  }

  /**
   * Verify a completed checkout session
   */
  async verifyCheckoutSession(sessionId: string): Promise<{ 
    success: boolean; 
    subscription?: SubscriptionInfo;
    error?: string;
  }> {
    try {
      const response = await fetch(`${API_URL}/stripe/verify-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to verify session');
      }

      const data = await response.json();
      
      if (data.paid) {
        // Store subscription info locally
        await SecureStore.setItemAsync('subscription_status', 'premium');
        await SecureStore.setItemAsync('subscription_id', data.subscriptionId);
        
        return {
          success: true,
          subscription: {
            status: 'premium',
            expiresAt: new Date(data.currentPeriodEnd * 1000),
            plan: data.plan,
          },
        };
      }

      return { success: false, error: 'Payment not completed' };
    } catch (error: any) {
      console.error('Error verifying session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current subscription status
   */
  async getSubscriptionStatus(userId: string): Promise<SubscriptionInfo> {
    try {
      // Check local cache first
      const cachedStatus = await SecureStore.getItemAsync('subscription_status');
      const cachedExpiry = await SecureStore.getItemAsync('subscription_expiry');
      
      // If we have a cached premium status and it hasn't expired, use it
      if (cachedStatus === 'premium' && cachedExpiry) {
        const expiryDate = new Date(cachedExpiry);
        if (expiryDate > new Date()) {
          return {
            status: 'premium',
            expiresAt: expiryDate,
          };
        }
      }

      // Verify with backend
      const response = await fetch(`${API_URL}/stripe/subscription-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        // If backend unavailable, trust local cache
        if (cachedStatus === 'premium') {
          return { status: 'premium' };
        }
        return { status: 'free' };
      }

      const data = await response.json();

      // Update local cache
      if (data.status === 'active' || data.status === 'trialing') {
        await SecureStore.setItemAsync('subscription_status', 'premium');
        if (data.currentPeriodEnd) {
          await SecureStore.setItemAsync(
            'subscription_expiry',
            new Date(data.currentPeriodEnd * 1000).toISOString()
          );
        }
        return {
          status: 'premium',
          expiresAt: data.currentPeriodEnd ? new Date(data.currentPeriodEnd * 1000) : undefined,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd,
          plan: data.plan,
        };
      }

      // Clear local cache if not premium
      await SecureStore.deleteItemAsync('subscription_status');
      await SecureStore.deleteItemAsync('subscription_expiry');

      return { status: 'free' };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      // Fallback to local cache
      const cachedStatus = await SecureStore.getItemAsync('subscription_status');
      return { status: cachedStatus === 'premium' ? 'premium' : 'free' };
    }
  }

  /**
   * Open customer portal for subscription management
   */
  async openCustomerPortal(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_URL}/stripe/create-portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId,
          returnUrl: 'mealswipe://settings',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();

      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return { success: true };
      } else {
        throw new Error('Cannot open portal URL');
      }
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Restore purchases - verify subscription via email
   */
  async restorePurchases(userId: string, email: string): Promise<{
    success: boolean;
    subscription?: SubscriptionInfo;
    error?: string;
  }> {
    try {
      const response = await fetch(`${API_URL}/stripe/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email }),
      });

      if (!response.ok) {
        return { success: false, error: 'No subscription found' };
      }

      const data = await response.json();

      if (data.hasActiveSubscription) {
        await SecureStore.setItemAsync('subscription_status', 'premium');
        if (data.currentPeriodEnd) {
          await SecureStore.setItemAsync(
            'subscription_expiry',
            new Date(data.currentPeriodEnd * 1000).toISOString()
          );
        }

        return {
          success: true,
          subscription: {
            status: 'premium',
            expiresAt: data.currentPeriodEnd ? new Date(data.currentPeriodEnd * 1000) : undefined,
          },
        };
      }

      return { success: false, error: 'No active subscription found' };
    } catch (error: any) {
      console.error('Error restoring purchases:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear local subscription cache (for logout)
   */
  async clearSubscriptionCache(): Promise<void> {
    await SecureStore.deleteItemAsync('subscription_status');
    await SecureStore.deleteItemAsync('subscription_expiry');
    await SecureStore.deleteItemAsync('subscription_id');
    await SecureStore.deleteItemAsync('pending_checkout_session');
  }
}

export const stripeService = new StripeService();

// Price display helpers
export function formatPrice(plan: 'monthly' | 'annual'): string {
  return PRICING[plan].label;
}

export function getMonthlyEquivalent(plan: 'monthly' | 'annual'): string {
  if (plan === 'annual') {
    return `$${PRICING.annual.monthlyEquivalent.toFixed(2)}/mo`;
  }
  return `$${PRICING.monthly.price.toFixed(2)}/mo`;
}

export function getSavingsPercent(): number {
  return PRICING.annual.savings;
}
