// Menu Storage Service - Persists saved recipes to AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Recipe } from './recipeApi';
import { recordRecipeAddToPlan } from './recipeApi';

const MENU_STORAGE_KEY = 'savedMenuRecipes';

export interface SavedRecipe extends Recipe {
  savedAt: string;
  scheduledFor?: string; // ISO date string for meal planning
}

// Get all saved recipes
export async function getSavedRecipes(): Promise<SavedRecipe[]> {
  try {
    const stored = await AsyncStorage.getItem(MENU_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Error loading saved recipes:', error);
  }
  return [];
}

// Save a recipe (from right swipe)
export async function saveRecipe(recipe: Recipe): Promise<void> {
  try {
    const existing = await getSavedRecipes();
    
    // Don't add duplicates
    if (existing.find(r => r.id === recipe.id)) {
      return;
    }
    
    const savedRecipe: SavedRecipe = {
      ...recipe,
      savedAt: new Date().toISOString(),
    };
    
    const updated = [savedRecipe, ...existing];
    await AsyncStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Error saving recipe:', error);
  }
}

// Remove a recipe from saved
export async function removeRecipe(recipeId: string): Promise<void> {
  try {
    const existing = await getSavedRecipes();
    const updated = existing.filter(r => r.id !== recipeId);
    await AsyncStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Error removing recipe:', error);
  }
}

// Schedule a recipe for a specific day
export async function scheduleRecipe(recipeId: string, date: string): Promise<void> {
  try {
    const existing = await getSavedRecipes();
    const updated = existing.map(r => 
      r.id === recipeId ? { ...r, scheduledFor: date } : r
    );
    await AsyncStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(updated));
    
    // Track engagement for community recipes (notifies creator)
    recordRecipeAddToPlan(recipeId).catch(() => {}); // Fire and forget
  } catch (error) {
    console.warn('Error scheduling recipe:', error);
  }
}

// Get recipes scheduled for a specific day
export async function getRecipesForDay(date: string): Promise<SavedRecipe[]> {
  const all = await getSavedRecipes();
  return all.filter(r => r.scheduledFor === date);
}

// Clear all saved recipes (for testing/reset)
export async function clearAllRecipes(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MENU_STORAGE_KEY);
  } catch (error) {
    console.warn('Error clearing recipes:', error);
  }
}

// Get count of saved recipes
export async function getSavedCount(): Promise<number> {
  const recipes = await getSavedRecipes();
  return recipes.length;
}
