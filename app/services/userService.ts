import * as SecureStore from 'expo-secure-store';
import { 
  UserProfile, 
  SubscriptionTier, 
  canPerformAction, 
  validateEmail, 
  sanitizeEmail, 
  sanitizeInput,
  SECURITY_CONFIG,
  DietaryPreferences,
} from '../database/schema';

const USER_PROFILE_KEY = 'mealswipe_user_profile';
const AUTH_TOKEN_KEY = 'mealswipe_auth_token';
const LOGIN_ATTEMPTS_KEY = 'mealswipe_login_attempts';

// Default dietary preferences
const DEFAULT_DIETARY_PREFERENCES: DietaryPreferences = {
  vegetarian: false,
  vegan: false,
  glutenFree: false,
  keto: false,
  dairyFree: false,
  nutFree: false,
  lowCarb: false,
  highProtein: false,
};

// Create a new user profile
export function createUserProfile(
  id: string,
  email: string,
  name: string,
  provider: 'apple' | 'google' | 'email',
  photo?: string
): UserProfile {
  const now = new Date();
  
  return {
    id,
    email: sanitizeEmail(email),
    name: sanitizeInput(name),
    photo,
    provider,
    
    // Start with free tier
    subscriptionTier: 'free',
    
    // Default preferences
    dietaryPreferences: { ...DEFAULT_DIETARY_PREFERENCES },
    allergies: [],
    appliances: [],
    
    // Usage
    likedRecipesCount: 0,
    weeklyPlansCreated: 0,
    
    // Timestamps
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    
    // Security
    emailVerified: provider !== 'email', // Social logins are pre-verified
  };
}

// User service with security
export const userService = {
  // Get stored user profile
  async getProfile(): Promise<UserProfile | null> {
    try {
      const profileJson = await SecureStore.getItemAsync(USER_PROFILE_KEY);
      if (!profileJson) return null;
      
      const profile = JSON.parse(profileJson);
      
      // Validate session hasn't expired
      const lastLogin = new Date(profile.lastLoginAt);
      const sessionAge = Date.now() - lastLogin.getTime();
      
      if (sessionAge > SECURITY_CONFIG.sessionTimeout) {
        // Session expired, clear data
        await this.clearSession();
        return null;
      }
      
      return profile;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },

  // Save user profile
  async saveProfile(profile: UserProfile): Promise<void> {
    try {
      profile.updatedAt = new Date();
      const profileJson = JSON.stringify(profile);
      await SecureStore.setItemAsync(USER_PROFILE_KEY, profileJson);
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw new Error('Failed to save profile');
    }
  },

  // Update profile
  async updateProfile(
    updates: Partial<Pick<UserProfile, 'name' | 'photo' | 'dietaryPreferences' | 'allergies' | 'appliances'>>
  ): Promise<UserProfile | null> {
    const profile = await this.getProfile();
    if (!profile) return null;

    // Sanitize inputs
    if (updates.name) {
      updates.name = sanitizeInput(updates.name);
    }
    
    const updatedProfile = {
      ...profile,
      ...updates,
      updatedAt: new Date(),
    };

    await this.saveProfile(updatedProfile);
    return updatedProfile;
  },

  // Upgrade subscription
  async upgradeSubscription(
    tier: SubscriptionTier,
    stripeCustomerId?: string,
    stripeSubscriptionId?: string
  ): Promise<UserProfile | null> {
    const profile = await this.getProfile();
    if (!profile) return null;

    const now = new Date();
    const updatedProfile: UserProfile = {
      ...profile,
      subscriptionTier: tier,
      subscriptionStartDate: now,
      subscriptionEndDate: tier === 'free' ? undefined : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      stripeCustomerId,
      stripeSubscriptionId,
      updatedAt: now,
    };

    await this.saveProfile(updatedProfile);
    return updatedProfile;
  },

  // Increment usage counters
  async incrementLikedRecipes(): Promise<{ success: boolean; reason?: string }> {
    const profile = await this.getProfile();
    if (!profile) {
      return { success: false, reason: 'Not authenticated' };
    }

    // Check if action is allowed
    const check = canPerformAction(profile, 'like_recipe');
    if (!check.allowed) {
      return { success: false, reason: check.reason };
    }

    profile.likedRecipesCount++;
    await this.saveProfile(profile);
    return { success: true };
  },

  async incrementWeeklyPlans(): Promise<{ success: boolean; reason?: string }> {
    const profile = await this.getProfile();
    if (!profile) {
      return { success: false, reason: 'Not authenticated' };
    }

    const check = canPerformAction(profile, 'create_plan');
    if (!check.allowed) {
      return { success: false, reason: check.reason };
    }

    profile.weeklyPlansCreated++;
    await this.saveProfile(profile);
    return { success: true };
  },

  // Update last login
  async updateLastLogin(): Promise<void> {
    const profile = await this.getProfile();
    if (profile) {
      profile.lastLoginAt = new Date();
      await this.saveProfile(profile);
    }
  },

  // Check if user can access a feature
  async canAccessFeature(feature: 'groceryLists' | 'familySharing' | 'customRecipes' | 'nutritionInfo' | 'exportPlans'): Promise<boolean> {
    const profile = await this.getProfile();
    if (!profile) return false;

    const tierFeatures: Record<SubscriptionTier, Record<string, boolean>> = {
      free: {
        groceryLists: true,
        familyVoting: false,
        customRecipes: false,
        nutritionInfo: false,
        exportPlans: false,
        aiSuggestions: false,
        mealReminders: false,
      },
      premium: {
        groceryLists: true,
        familyVoting: true,
        customRecipes: true,
        nutritionInfo: true,
        exportPlans: true,
        aiSuggestions: true,
        mealReminders: true,
      },
    };

    return tierFeatures[profile.subscriptionTier]?.[feature] ?? false;
  },

  // Clear session (logout)
  async clearSession(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(USER_PROFILE_KEY);
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(LOGIN_ATTEMPTS_KEY);
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  },

  // Track login attempts for rate limiting
  async recordLoginAttempt(success: boolean): Promise<void> {
    try {
      if (success) {
        await SecureStore.deleteItemAsync(LOGIN_ATTEMPTS_KEY);
        return;
      }

      const attemptsJson = await SecureStore.getItemAsync(LOGIN_ATTEMPTS_KEY);
      const attempts = attemptsJson ? JSON.parse(attemptsJson) : { count: 0, firstAttempt: Date.now() };
      
      attempts.count++;
      attempts.lastAttempt = Date.now();
      
      await SecureStore.setItemAsync(LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts));
    } catch (error) {
      console.error('Error recording login attempt:', error);
    }
  },

  // Check if account is locked due to too many failed attempts
  async isAccountLocked(): Promise<boolean> {
    try {
      const attemptsJson = await SecureStore.getItemAsync(LOGIN_ATTEMPTS_KEY);
      if (!attemptsJson) return false;

      const attempts = JSON.parse(attemptsJson);
      
      if (attempts.count >= SECURITY_CONFIG.maxLoginAttempts) {
        const lockoutEnd = attempts.lastAttempt + SECURITY_CONFIG.lockoutDuration;
        if (Date.now() < lockoutEnd) {
          return true;
        }
        // Lockout expired, clear attempts
        await SecureStore.deleteItemAsync(LOGIN_ATTEMPTS_KEY);
      }
      
      return false;
    } catch (error) {
      return false;
    }
  },

  // Get remaining lockout time in minutes
  async getLockoutRemaining(): Promise<number> {
    try {
      const attemptsJson = await SecureStore.getItemAsync(LOGIN_ATTEMPTS_KEY);
      if (!attemptsJson) return 0;

      const attempts = JSON.parse(attemptsJson);
      const lockoutEnd = attempts.lastAttempt + SECURITY_CONFIG.lockoutDuration;
      const remaining = Math.max(0, lockoutEnd - Date.now());
      
      return Math.ceil(remaining / 60000); // Convert to minutes
    } catch (error) {
      return 0;
    }
  },
};

// Export convenience functions
export { validateEmail, sanitizeInput, sanitizeEmail };
