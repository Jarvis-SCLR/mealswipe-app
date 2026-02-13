/**
 * Creator Dashboard
 * View recipe stats, engagement, and manage your community recipes
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors } from '../../constants/Colors';
import {
  getMyRecipes,
  getCreatorStats,
  type CommunityRecipe,
  type CreatorStats,
} from '../../services/communityRecipeService';

export default function CreatorDashboardScreen() {
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [recipes, setRecipes] = useState<CommunityRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [statsData, recipesData] = await Promise.all([
        getCreatorStats(),
        getMyRecipes(),
      ]);
      setStats(statsData);
      setRecipes(recipesData);
    } catch (error) {
      console.error('Error loading creator data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData();
  };

  const navigateToCreateRecipe = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/create-recipe');
  };

  const navigateToRecipe = (recipe: CommunityRecipe) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/recipe/${recipe.id}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.apricot} />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Creator Dashboard</Text>
          <Pressable style={styles.createButton} onPress={navigateToCreateRecipe}>
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: Colors.apricot + '20' }]}>
            <Ionicons name="eye-outline" size={28} color={Colors.apricot} />
            <Text style={styles.statValue}>{stats?.total_views || 0}</Text>
            <Text style={styles.statLabel}>Views</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.pepe + '20' }]}>
            <Ionicons name="heart" size={28} color={Colors.pepe} />
            <Text style={styles.statValue}>{stats?.total_likes || 0}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.verde + '20' }]}>
            <Ionicons name="calendar-outline" size={28} color={Colors.verde} />
            <Text style={styles.statValue}>{stats?.total_plan_adds || 0}</Text>
            <Text style={styles.statLabel}>Meal Plans</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.cielo + '20' }]}>
            <Ionicons name="people-outline" size={28} color={Colors.cielo} />
            <Text style={styles.statValue}>{stats?.follower_count || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable style={styles.actionButton} onPress={navigateToCreateRecipe}>
            <View style={styles.actionIcon}>
              <Ionicons name="add-circle" size={24} color={Colors.apricot} />
            </View>
            <Text style={styles.actionText}>New Recipe</Text>
          </Pressable>
          <Pressable style={styles.actionButton}>
            <View style={styles.actionIcon}>
              <Ionicons name="analytics" size={24} color={Colors.cielo} />
            </View>
            <Text style={styles.actionText}>Analytics</Text>
          </Pressable>
          <Pressable style={styles.actionButton}>
            <View style={styles.actionIcon}>
              <Ionicons name="share-social" size={24} color={Colors.verde} />
            </View>
            <Text style={styles.actionText}>Share</Text>
          </Pressable>
        </View>

        {/* My Recipes */}
        <View style={styles.recipesSection}>
          <Text style={styles.sectionTitle}>My Recipes</Text>
          
          {recipes.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={64} color={Colors.latte} />
              <Text style={styles.emptyTitle}>No recipes yet</Text>
              <Text style={styles.emptyDescription}>
                Share your first recipe with the MealSwipe community!
              </Text>
              <Pressable style={styles.emptyButton} onPress={navigateToCreateRecipe}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>Create Recipe</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.recipeGrid}>
              {recipes.map((recipe) => (
                <Pressable
                  key={recipe.id}
                  style={styles.recipeCard}
                  onPress={() => navigateToRecipe(recipe)}
                >
                  <Image
                    source={{ uri: recipe.image_urls[0] }}
                    style={styles.recipeImage}
                  />
                  {recipe.status === 'draft' && (
                    <View style={styles.draftBadge}>
                      <Text style={styles.draftBadgeText}>Draft</Text>
                    </View>
                  )}
                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeName} numberOfLines={1}>
                      {recipe.name}
                    </Text>
                    <View style={styles.recipeStats}>
                      <View style={styles.recipeStat}>
                        <Ionicons name="heart" size={14} color={Colors.pepe} />
                        <Text style={styles.recipeStatText}>{recipe.like_count}</Text>
                      </View>
                      <View style={styles.recipeStat}>
                        <Ionicons name="eye" size={14} color={Colors.mocha} />
                        <Text style={styles.recipeStatText}>{recipe.view_count}</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>💡 Creator Tips</Text>
          <View style={styles.tipCard}>
            <Ionicons name="camera" size={20} color={Colors.cielo} />
            <Text style={styles.tipText}>
              High-quality photos get 3x more engagement. Use natural lighting!
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Ionicons name="time" size={20} color={Colors.verde} />
            <Text style={styles.tipText}>
              Post during meal planning hours (Sunday 6-9pm) for best reach.
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Ionicons name="chatbubble" size={20} color={Colors.apricot} />
            <Text style={styles.tipText}>
              Recipes with detailed steps get added to more meal plans.
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.milk,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.mocha,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.espresso,
    fontFamily: 'PlayfairDisplay-Bold',
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.apricot,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.apricot,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.espresso,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.mocha,
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.milk,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 13,
    color: Colors.espresso,
    fontWeight: '500',
  },
  recipesSection: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.espresso,
    marginBottom: 16,
    fontFamily: 'DMSans-SemiBold',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.espresso,
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.mocha,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.apricot,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  recipeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  recipeCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  recipeImage: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.caramello,
  },
  draftBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.mocha,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  draftBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  recipeInfo: {
    padding: 12,
  },
  recipeName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.espresso,
  },
  recipeStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  recipeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recipeStatText: {
    fontSize: 12,
    color: Colors.mocha,
  },
  tipsSection: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: Colors.mocha,
    lineHeight: 20,
  },
});
