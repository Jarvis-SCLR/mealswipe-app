import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { stripeService, SubscriptionStatus } from '../services/stripeService';
import { useAuth } from './AuthContext';

interface SubscriptionState {
  status: SubscriptionStatus;
  isLoading: boolean;
  expiresAt?: Date;
  isPremium: boolean;
}

interface SubscriptionContextType extends SubscriptionState {
  refreshSubscription: () => Promise<void>;
  checkFeatureAccess: (feature: PremiumFeature) => boolean;
  showPaywall: boolean;
  setShowPaywall: (show: boolean) => void;
  paywallFeature?: string;
  setPaywallFeature: (feature?: string) => void;
}

// Features that require premium
export type PremiumFeature = 
  | 'unlimited_recipes'
  | 'family_voting'
  | 'ai_suggestions'
  | 'nutrition_tracking'
  | 'meal_reminders'
  | 'custom_recipes'
  | 'export_all_apps';

// Free tier limits
const FREE_LIMITS = {
  maxLikedRecipes: 20,
  maxWeeklyPlans: 1,
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [expiresAt, setExpiresAt] = useState<Date | undefined>();
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<string | undefined>();

  const isPremium = status === 'premium';

  // Refresh subscription status
  const refreshSubscription = async () => {
    if (!user) {
      setStatus('free');
      setExpiresAt(undefined);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const result = await stripeService.getSubscriptionStatus(user.id);
      setStatus(result.status);
      setExpiresAt(result.expiresAt);
    } catch (error) {
      console.error('Error refreshing subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user has access to a premium feature
  const checkFeatureAccess = (feature: PremiumFeature): boolean => {
    if (isPremium) return true;
    
    // All premium features require subscription
    return false;
  };

  // Refresh on mount and when user changes
  useEffect(() => {
    refreshSubscription();
  }, [user?.id]);

  // Refresh when app comes to foreground (to catch checkout completion)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        refreshSubscription();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [user?.id]);

  return (
    <SubscriptionContext.Provider
      value={{
        status,
        isLoading,
        expiresAt,
        isPremium,
        refreshSubscription,
        checkFeatureAccess,
        showPaywall,
        setShowPaywall,
        paywallFeature,
        setPaywallFeature,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

// Hook for checking feature access with automatic paywall trigger
export function usePremiumFeature(feature: PremiumFeature) {
  const { isPremium, setShowPaywall, setPaywallFeature } = useSubscription();

  const requirePremium = (featureName?: string) => {
    if (isPremium) return true;
    
    setPaywallFeature(featureName || getFeatureDisplayName(feature));
    setShowPaywall(true);
    return false;
  };

  return { isPremium, requirePremium };
}

// Display names for features
function getFeatureDisplayName(feature: PremiumFeature): string {
  const names: Record<PremiumFeature, string> = {
    unlimited_recipes: 'Unlimited Recipes',
    family_voting: 'Family Voting',
    ai_suggestions: 'AI Suggestions',
    nutrition_tracking: 'Nutrition Tracking',
    meal_reminders: 'Meal Reminders',
    custom_recipes: 'Custom Recipes',
    export_all_apps: 'Export to All Apps',
  };
  return names[feature];
}

// Free tier limits export
export { FREE_LIMITS };
