/**
 * Supabase Client
 * Database and authentication for MealSwipe community features
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Environment variables (fallback to empty for local-only mode)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Custom storage adapter for Expo SecureStore
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      // SecureStore has a 2KB limit per item, use AsyncStorage for larger data
      if (key.includes('auth-token')) {
        return await SecureStore.getItemAsync(key);
      }
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (key.includes('auth-token')) {
        await SecureStore.setItemAsync(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.warn('Storage setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (key.includes('auth-token')) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('Storage removeItem error:', error);
    }
  },
};

// Helper to check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// Create Supabase client or null if not configured
let _supabaseClient: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  _supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
} else {
  console.warn('Supabase not configured - community features will use local storage');
}

// Export the client (may be null)
export const supabase = _supabaseClient!;

// Database types (matches our migration schema)
export interface Database {
  public: {
    Tables: {
      community_recipes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          image_urls: string[];
          prep_time: number | null;
          cook_time: number | null;
          calories: number | null;
          servings: number;
          ingredients: unknown;
          instructions: unknown;
          tags: string[];
          ai_generated: boolean;
          status: string;
          view_count: number;
          like_count: number;
          plan_add_count: number;
          created_at: string;
          updated_at: string;
        };
      };
      recipe_engagement: {
        Row: {
          id: string;
          recipe_id: string;
          user_id: string;
          engagement_type: string;
          created_at: string;
        };
      };
      user_follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
      };
      user_streaks: {
        Row: {
          user_id: string;
          current_streak: number;
          longest_streak: number;
          last_activity_date: string | null;
          streak_protectors: number;
        };
      };
      daily_spins: {
        Row: {
          id: string;
          user_id: string;
          spin_date: string;
          reward_type: string;
          reward_value: string | null;
          created_at: string;
        };
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          unlocked_at: string;
        };
      };
    };
  };
}
