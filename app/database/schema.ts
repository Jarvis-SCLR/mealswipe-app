// User Database Schema with Subscription Tiers
// This would typically be in a backend service (Supabase, Firebase, etc.)

export type SubscriptionTier = 'free' | 'premium';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  photo?: string;
  provider: 'apple' | 'google' | 'email';
  
  // Subscription
  subscriptionTier: SubscriptionTier;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  
  // Profile
  dietaryPreferences: DietaryPreferences;
  allergies: string[];
  appliances: string[];
  
  // Usage limits
  likedRecipesCount: number;
  weeklyPlansCreated: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  
  // Security
  emailVerified: boolean;
}

export interface DietaryPreferences {
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  keto: boolean;
  dairyFree: boolean;
  nutFree: boolean;
  lowCarb: boolean;
  highProtein: boolean;
}

// Subscription Tier Features
export const TIER_FEATURES = {
  free: {
    name: 'Free',
    price: 0,
    features: {
      maxLikedRecipes: 20,
      maxWeeklyPlans: 1,
      maxRecipesPerPlan: 7,
      groceryLists: true,
      groceryExportApps: 1, // Can export to ONE app only
      familyVoting: false,
      aiSuggestions: false,
      customRecipes: false,
      nutritionInfo: false,
      mealReminders: false,
      recipeImport: false,
    },
  },
  premium: {
    name: 'Premium',
    price: 3.99,
    priceAnnual: 29.99,
    features: {
      maxLikedRecipes: -1, // Unlimited
      maxWeeklyPlans: -1, // Unlimited
      maxRecipesPerPlan: -1, // Unlimited
      groceryLists: true,
      groceryExportApps: -1, // All export options
      familyVoting: true,
      aiSuggestions: true,
      customRecipes: true,
      nutritionInfo: true,
      mealReminders: true,
      recipeImport: true,
    },
  },
} as const;

// Feature flags for easy checking
export type FeatureName = keyof typeof TIER_FEATURES.free.features;

export function hasFeatureAccess(
  tier: SubscriptionTier,
  feature: FeatureName
): boolean {
  const tierFeatures = TIER_FEATURES[tier].features;
  const value = tierFeatures[feature as keyof typeof tierFeatures];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0 || value === -1; // -1 means unlimited
  return false;
}

export function getFeatureLimit(
  tier: SubscriptionTier,
  feature: FeatureName
): number | boolean {
  const tierFeatures = TIER_FEATURES[tier].features;
  return tierFeatures[feature as keyof typeof tierFeatures] as number | boolean;
}

export function canPerformAction(
  profile: UserProfile,
  action: 'like_recipe' | 'create_plan' | 'add_to_plan' | 'family_vote'
): { allowed: boolean; reason?: string; upgradeRequired?: boolean } {
  const tier = profile.subscriptionTier;
  const features = TIER_FEATURES[tier].features;

  switch (action) {
    case 'like_recipe':
      if (features.maxLikedRecipes !== -1 && profile.likedRecipesCount >= features.maxLikedRecipes) {
        return {
          allowed: false,
          reason: `Free tier limited to ${features.maxLikedRecipes} liked recipes.`,
          upgradeRequired: true,
        };
      }
      return { allowed: true };

    case 'create_plan':
      if (features.maxWeeklyPlans !== -1 && profile.weeklyPlansCreated >= features.maxWeeklyPlans) {
        return {
          allowed: false,
          reason: `Free tier limited to ${features.maxWeeklyPlans} weekly plan.`,
          upgradeRequired: true,
        };
      }
      return { allowed: true };

    case 'add_to_plan':
      return { allowed: true };

    case 'family_vote':
      if (!features.familyVoting) {
        return {
          allowed: false,
          reason: 'Family voting requires Premium.',
          upgradeRequired: true,
        };
      }
      return { allowed: true };

    default:
      return { allowed: true };
  }
}

// Security measures
export const SECURITY_CONFIG = {
  // Rate limiting
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  
  // Session
  sessionTimeout: 30 * 24 * 60 * 60 * 1000, // 30 days
  refreshTokenExpiry: 90 * 24 * 60 * 60 * 1000, // 90 days
  
  // Audit logging
  logAllAuthEvents: true,
  retainLogsDays: 90,
};

// Validation helpers
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  if (email.length > 255) {
    return { valid: false, error: 'Email too long' };
  }
  return { valid: true };
}

// Sanitization helpers
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
