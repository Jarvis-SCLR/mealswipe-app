/**
 * Community Recipe Service
 * Handles user-generated recipes, engagement tracking, and creator features
 * Works with Supabase when configured, falls back to local storage otherwise
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { getGeneratedRecipeImage } from './recipeImageService';

export interface CommunityRecipe {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  image_urls: string[];
  prep_time?: number;
  cook_time?: number;
  calories?: number;
  servings: number;
  ingredients: Ingredient[];
  instructions: Instruction[];
  tags: string[];
  ai_generated: boolean;
  status: 'active' | 'flagged' | 'removed' | 'draft';
  view_count: number;
  like_count: number;
  plan_add_count: number;
  created_at: string;
  updated_at: string;
}

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

export interface Instruction {
  step_number: number;
  text: string;
  image_url?: string;
}

export interface CreateRecipeInput {
  name: string;
  description?: string;
  image_urls: string[];
  prep_time?: number;
  cook_time?: number;
  calories?: number;
  servings?: number;
  ingredients: Ingredient[];
  instructions: Instruction[];
  tags: string[];
  ai_generated?: boolean;
  share_with_community?: boolean;
}

export interface CreatorStats {
  total_recipes: number;
  total_views: number;
  total_likes: number;
  total_plan_adds: number;
  follower_count: number;
  following_count: number;
}

export type EngagementType = 'view' | 'like' | 'add_to_plan' | 'share' | 'report';

// Storage keys for local-first mode
const STORAGE_KEYS = {
  MY_RECIPES: 'mealswipe_my_recipes',
  ENGAGEMENT: 'mealswipe_engagement',
  USER_ID: 'mealswipe_local_user_id',
};

// Get or create a local user ID for offline mode
async function getLocalUserId(): Promise<string> {
  let userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
  if (!userId) {
    userId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
  }
  return userId;
}

// ============ RECIPE CRUD ============

export async function createRecipe(input: CreateRecipeInput): Promise<CommunityRecipe | null> {
  const userId = isSupabaseConfigured() 
    ? (await supabase.auth.getUser()).data.user?.id 
    : await getLocalUserId();
    
  if (!userId) {
    console.error('User not authenticated');
    return null;
  }

  const newRecipe: CommunityRecipe = {
    id: `recipe-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    user_id: userId,
    name: input.name,
    description: input.description,
    image_urls: input.image_urls,
    prep_time: input.prep_time,
    cook_time: input.cook_time,
    calories: input.calories,
    servings: input.servings || 4,
    ingredients: input.ingredients,
    instructions: input.instructions,
    tags: input.tags,
    ai_generated: input.ai_generated || false,
    status: input.share_with_community ? 'active' : 'draft',
    view_count: 0,
    like_count: 0,
    plan_add_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('community_recipes')
        .insert(newRecipe)
        .select()
        .single();

      if (error) throw error;
      return data as CommunityRecipe;
    } catch (error) {
      console.error('Error creating recipe in Supabase:', error);
      // Fall through to local storage
    }
  }

  // Local storage fallback
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.MY_RECIPES);
    const recipes: CommunityRecipe[] = existing ? JSON.parse(existing) : [];
    recipes.unshift(newRecipe);
    await AsyncStorage.setItem(STORAGE_KEYS.MY_RECIPES, JSON.stringify(recipes));
    return newRecipe;
  } catch (error) {
    console.error('Error saving recipe locally:', error);
    return null;
  }
}

export async function getMyRecipes(): Promise<CommunityRecipe[]> {
  if (isSupabaseConfigured()) {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return [];

      const { data, error } = await supabase
        .from('community_recipes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return await applyGeneratedImagesToCommunity((data || []) as CommunityRecipe[]);
    } catch (error) {
      console.error('Error fetching recipes from Supabase:', error);
    }
  }

  // Local storage fallback
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.MY_RECIPES);
    const recipes: CommunityRecipe[] = existing ? JSON.parse(existing) : [];
    return await applyGeneratedImagesToCommunity(recipes);
  } catch {
    return [];
  }
}

export async function getCommunityRecipes(
  limit: number = 20,
  offset: number = 0
): Promise<CommunityRecipe[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('community_recipes')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return await applyGeneratedImagesToCommunity((data || []) as CommunityRecipe[]);
    } catch (error) {
      console.error('Error fetching community recipes:', error);
    }
  }

  // Return empty for local-only mode (no community)
  return [];
}

async function applyGeneratedImagesToCommunity(recipes: CommunityRecipe[]): Promise<CommunityRecipe[]> {
  const results = await Promise.all(
    recipes.map(async recipe => {
      const primaryImage = recipe.image_urls?.[0] || '';
      if (primaryImage.startsWith('data:image')) {
        return recipe;
      }

      const generated = await getGeneratedRecipeImage({
        id: recipe.id,
        name: recipe.name,
        description: recipe.description || `A delicious ${recipe.name} recipe.`,
        image: primaryImage,
      });

      if (!generated || generated === primaryImage) {
        return recipe;
      }

      return {
        ...recipe,
        image_urls: [generated, ...recipe.image_urls.filter(url => url !== generated)],
      };
    })
  );

  return results;
}

// ============ ENGAGEMENT ============

export async function recordEngagement(
  recipeId: string,
  type: EngagementType
): Promise<boolean> {
  const userId = isSupabaseConfigured()
    ? (await supabase.auth.getUser()).data.user?.id
    : await getLocalUserId();
    
  if (!userId) return false;

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('recipe_engagement')
        .upsert({
          recipe_id: recipeId,
          user_id: userId,
          engagement_type: type,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error recording engagement:', error);
    }
  }

  // Local storage tracking
  try {
    const key = `${STORAGE_KEYS.ENGAGEMENT}_${recipeId}`;
    const existing = await AsyncStorage.getItem(key);
    const engagements: string[] = existing ? JSON.parse(existing) : [];
    if (!engagements.includes(type)) {
      engagements.push(type);
      await AsyncStorage.setItem(key, JSON.stringify(engagements));
    }
    return true;
  } catch {
    return false;
  }
}

// ============ CREATOR STATS ============

export async function getCreatorStats(): Promise<CreatorStats> {
  const defaultStats: CreatorStats = {
    total_recipes: 0,
    total_views: 0,
    total_likes: 0,
    total_plan_adds: 0,
    follower_count: 0,
    following_count: 0,
  };

  const recipes = await getMyRecipes();
  
  if (recipes.length === 0) return defaultStats;

  return {
    total_recipes: recipes.length,
    total_views: recipes.reduce((sum, r) => sum + (r.view_count || 0), 0),
    total_likes: recipes.reduce((sum, r) => sum + (r.like_count || 0), 0),
    total_plan_adds: recipes.reduce((sum, r) => sum + (r.plan_add_count || 0), 0),
    follower_count: 0, // Would need Supabase for this
    following_count: 0,
  };
}

// ============ IMAGE UPLOAD ============

export async function uploadRecipeImage(uri: string): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    // Return the local URI for local-only mode
    return uri;
  }

  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return uri;

    const response = await fetch(uri);
    const blob = await response.blob();
    
    const fileExt = uri.split('.').pop() || 'jpg';
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const filePath = `recipe-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('public')
      .upload(filePath, blob);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return uri; // Return local URI as fallback
    }

    const { data } = supabase.storage.from('public').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return uri;
  }
}

// ============ AI RECIPE COMPLETION ============

export interface AIRecipeCompletion {
  description: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  tags: string[];
  prep_time: number;
  cook_time: number;
  calories: number;
  servings: number;
}

export async function completeRecipeWithAI(
  name: string,
  imageUrls: string[],
  partialIngredients?: string[]
): Promise<AIRecipeCompletion | null> {
  // API URL from environment or default to deployed endpoint
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://api-hazel-seven-66.vercel.app';
  
  try {
    // Try API endpoint first
    const response = await fetch(`${apiUrl}/api/ai-complete-recipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, imageUrls, partialIngredients }),
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('AI API unavailable, using heuristics:', error);
  }

  // Fallback heuristic completion
  return {
    description: `A delicious homemade ${name} recipe.`,
    ingredients: partialIngredients?.map(ing => ({
      name: ing,
      amount: '1',
      unit: 'serving',
    })) || [
      { name: 'Main ingredient', amount: '1', unit: 'lb' },
      { name: 'Olive oil', amount: '2', unit: 'tbsp' },
      { name: 'Salt and pepper', amount: '1', unit: 'pinch' },
    ],
    instructions: [
      { step_number: 1, text: 'Prepare all ingredients.' },
      { step_number: 2, text: 'Cook according to your preference.' },
      { step_number: 3, text: 'Serve and enjoy!' },
    ],
    tags: ['Homemade', 'Community'],
    prep_time: 15,
    cook_time: 30,
    calories: 350,
    servings: 4,
  };
}
