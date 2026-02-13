/**
 * Daily Spin Wheel Service
 * Gamification feature for MealSwipe engagement
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Spin rewards with their probabilities (weights)
export interface SpinReward {
  id: string;
  label: string;
  emoji: string;
  color: string;
  weight: number; // Higher = more likely
  value?: number;
}

export const SPIN_REWARDS: SpinReward[] = [
  { id: 'free_recipe', label: 'Free Recipe', emoji: '🍳', color: '#F5A962', weight: 15 },
  { id: 'extra_5', label: '5 Extra Swipes', emoji: '👆', color: '#6B8E5E', weight: 20 },
  { id: 'badge', label: 'Badge Unlock', emoji: '🏅', color: '#8B7355', weight: 10 },
  { id: 'streak_protect', label: 'Streak Protector', emoji: '🛡️', color: '#5C9EAD', weight: 12 },
  { id: 'premium_trial', label: '1 Day Premium', emoji: '⭐', color: '#D4AF37', weight: 5 },
  { id: 'nothing', label: 'Better Luck!', emoji: '🍀', color: '#E8A598', weight: 18 },
  { id: 'extra_10', label: '10 Extra Swipes', emoji: '🔥', color: '#FF6B6B', weight: 8 },
  { id: 'mystery', label: 'Mystery Recipe', emoji: '🎁', color: '#9B59B6', weight: 12 },
];

const SPIN_STORAGE_KEY = 'mealswipe_daily_spin';
const REWARDS_STORAGE_KEY = 'mealswipe_spin_rewards';

interface SpinRecord {
  date: string;
  rewardId: string;
  timestamp: number;
}

interface UserRewards {
  extraSwipes: number;
  streakProtectors: number;
  premiumTrialDays: number;
  unlockedBadges: string[];
  mysteryRecipes: string[];
}

/**
 * Get today's date string in YYYY-MM-DD format
 */
function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Check if user can spin today
 */
export async function canSpinToday(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(SPIN_STORAGE_KEY);
    if (!stored) return true;
    
    const records: SpinRecord[] = JSON.parse(stored);
    const today = getTodayString();
    
    return !records.some(r => r.date === today);
  } catch (error) {
    console.warn('Error checking spin status:', error);
    return true;
  }
}

/**
 * Get today's spin result if already spun
 */
export async function getTodaySpinResult(): Promise<SpinReward | null> {
  try {
    const stored = await AsyncStorage.getItem(SPIN_STORAGE_KEY);
    if (!stored) return null;
    
    const records: SpinRecord[] = JSON.parse(stored);
    const today = getTodayString();
    const todayRecord = records.find(r => r.date === today);
    
    if (!todayRecord) return null;
    
    return SPIN_REWARDS.find(r => r.id === todayRecord.rewardId) || null;
  } catch (error) {
    console.warn('Error getting today spin:', error);
    return null;
  }
}

/**
 * Weighted random selection for spin result
 */
function selectReward(): SpinReward {
  const totalWeight = SPIN_REWARDS.reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const reward of SPIN_REWARDS) {
    random -= reward.weight;
    if (random <= 0) {
      return reward;
    }
  }
  
  return SPIN_REWARDS[SPIN_REWARDS.length - 1];
}

/**
 * Perform a spin and record the result
 */
export async function performSpin(): Promise<SpinReward> {
  const canSpin = await canSpinToday();
  if (!canSpin) {
    throw new Error('Already spun today');
  }
  
  const reward = selectReward();
  
  // Record the spin
  try {
    const stored = await AsyncStorage.getItem(SPIN_STORAGE_KEY);
    const records: SpinRecord[] = stored ? JSON.parse(stored) : [];
    
    records.push({
      date: getTodayString(),
      rewardId: reward.id,
      timestamp: Date.now(),
    });
    
    // Keep only last 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const trimmed = records.filter(r => r.timestamp > thirtyDaysAgo);
    
    await AsyncStorage.setItem(SPIN_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn('Error recording spin:', error);
  }
  
  // Award the reward
  await awardReward(reward);
  
  return reward;
}

/**
 * Award a spin reward to the user
 */
async function awardReward(reward: SpinReward): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(REWARDS_STORAGE_KEY);
    const rewards: UserRewards = stored ? JSON.parse(stored) : {
      extraSwipes: 0,
      streakProtectors: 0,
      premiumTrialDays: 0,
      unlockedBadges: [],
      mysteryRecipes: [],
    };
    
    switch (reward.id) {
      case 'extra_5':
        rewards.extraSwipes += 5;
        break;
      case 'extra_10':
        rewards.extraSwipes += 10;
        break;
      case 'streak_protect':
        rewards.streakProtectors += 1;
        break;
      case 'premium_trial':
        rewards.premiumTrialDays += 1;
        break;
      case 'badge':
        // Generate a random badge
        const badgeId = `spin_badge_${Date.now()}`;
        if (!rewards.unlockedBadges.includes(badgeId)) {
          rewards.unlockedBadges.push(badgeId);
        }
        break;
      case 'mystery':
        // Add a mystery recipe unlock
        const mysteryId = `mystery_${Date.now()}`;
        rewards.mysteryRecipes.push(mysteryId);
        break;
      // 'nothing' and 'free_recipe' don't need storage tracking
    }
    
    await AsyncStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(rewards));
  } catch (error) {
    console.warn('Error awarding reward:', error);
  }
}

/**
 * Get user's accumulated rewards
 */
export async function getUserRewards(): Promise<UserRewards> {
  try {
    const stored = await AsyncStorage.getItem(REWARDS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {
      extraSwipes: 0,
      streakProtectors: 0,
      premiumTrialDays: 0,
      unlockedBadges: [],
      mysteryRecipes: [],
    };
  } catch (error) {
    console.warn('Error getting rewards:', error);
    return {
      extraSwipes: 0,
      streakProtectors: 0,
      premiumTrialDays: 0,
      unlockedBadges: [],
      mysteryRecipes: [],
    };
  }
}

/**
 * Use extra swipes (deduct from balance)
 */
export async function useExtraSwipes(count: number): Promise<boolean> {
  try {
    const rewards = await getUserRewards();
    if (rewards.extraSwipes < count) return false;
    
    rewards.extraSwipes -= count;
    await AsyncStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(rewards));
    return true;
  } catch (error) {
    console.warn('Error using swipes:', error);
    return false;
  }
}

/**
 * Get time until next spin (for countdown)
 */
export function getTimeUntilNextSpin(): { hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const diff = tomorrow.getTime() - now.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { hours, minutes, seconds };
}

/**
 * Get spin history for the last N days
 */
export async function getSpinHistory(days: number = 7): Promise<SpinRecord[]> {
  try {
    const stored = await AsyncStorage.getItem(SPIN_STORAGE_KEY);
    if (!stored) return [];
    
    const records: SpinRecord[] = JSON.parse(stored);
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    return records
      .filter(r => r.timestamp > cutoff)
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.warn('Error getting spin history:', error);
    return [];
  }
}
