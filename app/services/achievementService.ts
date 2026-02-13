/**
 * Achievement System
 * Badges and milestones for MealSwipe engagement
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const ACHIEVEMENTS_STORAGE_KEY = 'mealswipe_achievements';
const PROGRESS_STORAGE_KEY = 'mealswipe_achievement_progress';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: 'swiper' | 'creator' | 'planner' | 'streak' | 'social' | 'special';
  requirement: number;
  progressKey: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Swiper achievements
  {
    id: 'first_swipe',
    name: 'First Taste',
    description: 'Swipe on your first recipe',
    emoji: '👆',
    category: 'swiper',
    requirement: 1,
    progressKey: 'total_swipes',
  },
  {
    id: 'swipe_50',
    name: 'Recipe Explorer',
    description: 'Swipe on 50 recipes',
    emoji: '🔍',
    category: 'swiper',
    requirement: 50,
    progressKey: 'total_swipes',
  },
  {
    id: 'swipe_200',
    name: 'Culinary Adventurer',
    description: 'Swipe on 200 recipes',
    emoji: '🌎',
    category: 'swiper',
    requirement: 200,
    progressKey: 'total_swipes',
  },
  {
    id: 'like_10',
    name: 'Picky Eater',
    description: 'Like 10 recipes',
    emoji: '❤️',
    category: 'swiper',
    requirement: 10,
    progressKey: 'total_likes',
  },
  {
    id: 'like_50',
    name: 'Food Lover',
    description: 'Like 50 recipes',
    emoji: '😍',
    category: 'swiper',
    requirement: 50,
    progressKey: 'total_likes',
  },
  
  // Creator achievements
  {
    id: 'first_recipe',
    name: 'Home Chef',
    description: 'Create your first recipe',
    emoji: '🍳',
    category: 'creator',
    requirement: 1,
    progressKey: 'recipes_created',
  },
  {
    id: 'recipe_5',
    name: 'Recipe Maker',
    description: 'Create 5 recipes',
    emoji: '📝',
    category: 'creator',
    requirement: 5,
    progressKey: 'recipes_created',
  },
  {
    id: 'recipe_shared',
    name: 'Community Chef',
    description: 'Share a recipe with the community',
    emoji: '🌟',
    category: 'creator',
    requirement: 1,
    progressKey: 'recipes_shared',
  },
  {
    id: 'recipe_liked_10',
    name: 'Popular Cook',
    description: 'Get 10 likes on your recipes',
    emoji: '👨‍🍳',
    category: 'creator',
    requirement: 10,
    progressKey: 'total_recipe_likes',
  },
  
  // Planner achievements
  {
    id: 'first_plan',
    name: 'Meal Planner',
    description: 'Plan your first week of meals',
    emoji: '📅',
    category: 'planner',
    requirement: 1,
    progressKey: 'weeks_planned',
  },
  {
    id: 'plan_4',
    name: 'Organized Chef',
    description: 'Plan 4 weeks of meals',
    emoji: '📊',
    category: 'planner',
    requirement: 4,
    progressKey: 'weeks_planned',
  },
  {
    id: 'grocery_list',
    name: 'Smart Shopper',
    description: 'Generate your first grocery list',
    emoji: '🛒',
    category: 'planner',
    requirement: 1,
    progressKey: 'grocery_lists',
  },
  
  // Streak achievements
  {
    id: 'streak_3',
    name: 'Getting Started',
    description: 'Reach a 3 day streak',
    emoji: '🔥',
    category: 'streak',
    requirement: 3,
    progressKey: 'max_streak',
  },
  {
    id: 'streak_7',
    name: 'One Week Wonder',
    description: 'Reach a 7 day streak',
    emoji: '⭐',
    category: 'streak',
    requirement: 7,
    progressKey: 'max_streak',
  },
  {
    id: 'streak_30',
    name: 'Streak Master',
    description: 'Reach a 30 day streak',
    emoji: '🏆',
    category: 'streak',
    requirement: 30,
    progressKey: 'max_streak',
  },
  {
    id: 'streak_100',
    name: 'Legendary',
    description: 'Reach a 100 day streak',
    emoji: '💎',
    category: 'streak',
    requirement: 100,
    progressKey: 'max_streak',
  },
  
  // Special achievements
  {
    id: 'daily_spin',
    name: 'Lucky Spinner',
    description: 'Spin the wheel 7 times',
    emoji: '🎰',
    category: 'special',
    requirement: 7,
    progressKey: 'total_spins',
  },
  {
    id: 'spin_win',
    name: 'Jackpot',
    description: 'Win a premium reward from spin',
    emoji: '🎁',
    category: 'special',
    requirement: 1,
    progressKey: 'premium_wins',
  },
];

interface AchievementProgress {
  [key: string]: number;
}

interface UnlockedAchievements {
  [achievementId: string]: {
    unlockedAt: number;
  };
}

/**
 * Get all achievement progress
 */
export async function getProgress(): Promise<AchievementProgress> {
  try {
    const stored = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Error getting progress:', error);
    return {};
  }
}

/**
 * Get unlocked achievements
 */
export async function getUnlockedAchievements(): Promise<UnlockedAchievements> {
  try {
    const stored = await AsyncStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Error getting achievements:', error);
    return {};
  }
}

/**
 * Update progress for a specific key
 * Returns newly unlocked achievements
 */
export async function updateProgress(key: string, value: number): Promise<Achievement[]> {
  const progress = await getProgress();
  progress[key] = value;
  
  try {
    await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.warn('Error saving progress:', error);
  }
  
  // Check for newly unlocked achievements
  return checkNewUnlocks(key, value);
}

/**
 * Increment progress for a specific key
 * Returns newly unlocked achievements
 */
export async function incrementProgress(key: string, amount: number = 1): Promise<Achievement[]> {
  const progress = await getProgress();
  const newValue = (progress[key] || 0) + amount;
  return updateProgress(key, newValue);
}

/**
 * Check for newly unlocked achievements
 */
async function checkNewUnlocks(progressKey: string, value: number): Promise<Achievement[]> {
  const unlocked = await getUnlockedAchievements();
  const newlyUnlocked: Achievement[] = [];
  
  for (const achievement of ACHIEVEMENTS) {
    if (achievement.progressKey !== progressKey) continue;
    if (unlocked[achievement.id]) continue;
    if (value >= achievement.requirement) {
      // Unlock achievement!
      unlocked[achievement.id] = { unlockedAt: Date.now() };
      newlyUnlocked.push(achievement);
    }
  }
  
  if (newlyUnlocked.length > 0) {
    try {
      await AsyncStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(unlocked));
    } catch (error) {
      console.warn('Error saving unlocked achievements:', error);
    }
  }
  
  return newlyUnlocked;
}

/**
 * Get achievement status (unlocked, progress, etc.)
 */
export async function getAchievementStatus(): Promise<{
  unlocked: string[];
  inProgress: { achievement: Achievement; current: number }[];
  total: number;
}> {
  const [progress, unlocked] = await Promise.all([
    getProgress(),
    getUnlockedAchievements(),
  ]);
  
  const unlockedIds = Object.keys(unlocked);
  const inProgress: { achievement: Achievement; current: number }[] = [];
  
  for (const achievement of ACHIEVEMENTS) {
    if (unlockedIds.includes(achievement.id)) continue;
    
    const current = progress[achievement.progressKey] || 0;
    if (current > 0 && current < achievement.requirement) {
      inProgress.push({ achievement, current });
    }
  }
  
  // Sort by closest to completion
  inProgress.sort((a, b) => {
    const aPercent = a.current / a.achievement.requirement;
    const bPercent = b.current / b.achievement.requirement;
    return bPercent - aPercent;
  });
  
  return {
    unlocked: unlockedIds,
    inProgress: inProgress.slice(0, 3), // Top 3 in progress
    total: ACHIEVEMENTS.length,
  };
}

/**
 * Get achievements grouped by category
 */
export function getAchievementsByCategory(): Record<string, Achievement[]> {
  const grouped: Record<string, Achievement[]> = {};
  
  for (const achievement of ACHIEVEMENTS) {
    if (!grouped[achievement.category]) {
      grouped[achievement.category] = [];
    }
    grouped[achievement.category].push(achievement);
  }
  
  return grouped;
}

/**
 * Category display names
 */
export const CATEGORY_NAMES: Record<string, string> = {
  swiper: 'Recipe Discovery',
  creator: 'Recipe Creation',
  planner: 'Meal Planning',
  streak: 'Consistency',
  social: 'Community',
  special: 'Special',
};
