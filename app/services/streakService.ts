/**
 * Streak Tracking Service
 * Gamification for daily app usage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_STORAGE_KEY = 'mealswipe_streak';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  streakProtectors: number;
  totalDaysActive: number;
}

/**
 * Get today's date string in YYYY-MM-DD format
 */
function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Get yesterday's date string
 */
function getYesterdayString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
}

/**
 * Get current streak data
 */
export async function getStreakData(): Promise<StreakData> {
  try {
    const stored = await AsyncStorage.getItem(STREAK_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Error getting streak data:', error);
  }
  
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    streakProtectors: 0,
    totalDaysActive: 0,
  };
}

/**
 * Record daily activity and update streak
 */
export async function recordDailyActivity(): Promise<StreakData> {
  const today = getTodayString();
  const yesterday = getYesterdayString();
  
  let data = await getStreakData();
  
  // Already recorded today
  if (data.lastActivityDate === today) {
    return data;
  }
  
  // Check if streak continues
  if (data.lastActivityDate === yesterday) {
    // Streak continues!
    data.currentStreak += 1;
  } else if (data.lastActivityDate && data.lastActivityDate !== today) {
    // Streak broken - check for protector
    if (data.streakProtectors > 0) {
      // Use protector to save streak
      data.streakProtectors -= 1;
      data.currentStreak += 1;
    } else {
      // Reset streak
      data.currentStreak = 1;
    }
  } else {
    // First activity ever
    data.currentStreak = 1;
  }
  
  // Update records
  data.lastActivityDate = today;
  data.totalDaysActive += 1;
  
  if (data.currentStreak > data.longestStreak) {
    data.longestStreak = data.currentStreak;
  }
  
  try {
    await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Error saving streak:', error);
  }
  
  return data;
}

/**
 * Add streak protectors
 */
export async function addStreakProtectors(count: number): Promise<void> {
  const data = await getStreakData();
  data.streakProtectors += count;
  
  try {
    await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Error adding protectors:', error);
  }
}

/**
 * Check if user needs to be reminded to maintain streak
 */
export async function isStreakAtRisk(): Promise<boolean> {
  const data = await getStreakData();
  const today = getTodayString();
  
  // No streak to lose
  if (data.currentStreak === 0) return false;
  
  // Already active today
  if (data.lastActivityDate === today) return false;
  
  // Streak could be lost if they don't open app today
  return data.currentStreak >= 3;
}

/**
 * Get streak milestone message if applicable
 */
export function getStreakMilestone(streak: number): string | null {
  const milestones: Record<number, string> = {
    3: '🔥 3 day streak! Keep it up!',
    7: '⭐ 1 week streak! Amazing!',
    14: '🌟 2 week streak! You\'re on fire!',
    30: '🏆 30 day streak! Legend!',
    50: '👑 50 day streak! Unstoppable!',
    100: '💎 100 day streak! LEGENDARY!',
  };
  
  return milestones[streak] || null;
}

/**
 * Get streak emoji based on current streak
 */
export function getStreakEmoji(streak: number): string {
  if (streak >= 100) return '💎';
  if (streak >= 50) return '👑';
  if (streak >= 30) return '🏆';
  if (streak >= 14) return '🌟';
  if (streak >= 7) return '⭐';
  if (streak >= 3) return '🔥';
  return '✨';
}
