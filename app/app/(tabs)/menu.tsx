import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Colors } from '../../constants/Colors';
import { getSavedRecipes, removeRecipe, type SavedRecipe } from '../../services/menuStorage';

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reload recipes when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadRecipes();
    }, [])
  );

  const loadRecipes = async () => {
    const saved = await getSavedRecipes();
    setRecipes(saved);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecipes();
    setRefreshing(false);
  };

  const handleRemove = async (recipeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await removeRecipe(recipeId);
    setRecipes(prev => prev.filter(r => r.id !== recipeId));
  };

  const openRecipe = (recipe: SavedRecipe) => {
    router.push({
      pathname: `/recipe/${recipe.id}`,
      params: { recipeData: JSON.stringify(recipe) }
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.espresso} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Menu</Text>
        <Text style={styles.headerCount}>{recipes.length} saved</Text>
      </View>

      {recipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🍽️</Text>
          <Text style={styles.emptyTitle}>No recipes saved yet</Text>
          <Text style={styles.emptySubtitle}>
            Swipe right on recipes you love{'\n'}and they'll appear here!
          </Text>
          <TouchableOpacity 
            style={styles.discoverButton}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.discoverButtonText}>Start Discovering</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {recipes.map((recipe) => (
            <TouchableOpacity
              key={recipe.id}
              style={styles.recipeCard}
              activeOpacity={0.9}
              onPress={() => openRecipe(recipe)}
            >
              <Image source={{ uri: recipe.image }} style={styles.recipeImage} />
              <View style={styles.recipeInfo}>
                <Text style={styles.recipeName} numberOfLines={2}>
                  {recipe.name}
                </Text>
                <Text style={styles.recipeMeta}>
                  {recipe.prepTime} • {recipe.nutrition?.calories || '—'} cal
                </Text>
                <View style={styles.tagsRow}>
                  {recipe.tags.slice(0, 2).map((tag, idx) => (
                    <View key={`${tag}-${idx}`} style={styles.tagPill}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemove(recipe.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.removeButtonText}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.milk,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: 'Playfair Display Bold',
    fontSize: 32,
    color: Colors.espresso,
  },
  headerCount: {
    fontFamily: 'DM Sans Medium',
    fontSize: 16,
    color: '#7A7067',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Playfair Display SemiBold',
    fontSize: 24,
    color: Colors.espresso,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: '#7A7067',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  discoverButton: {
    backgroundColor: Colors.espresso,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  discoverButtonText: {
    fontFamily: 'DM Sans Bold',
    fontSize: 16,
    color: Colors.foam,
  },
  recipeCard: {
    flexDirection: 'row',
    backgroundColor: Colors.foam,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(45,36,32,0.06)',
  },
  recipeImage: {
    width: 100,
    height: 100,
  },
  recipeInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  recipeName: {
    fontFamily: 'DM Sans Bold',
    fontSize: 16,
    color: Colors.espresso,
    marginBottom: 4,
  },
  recipeMeta: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: '#7A7067',
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tagPill: {
    backgroundColor: Colors.verde,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontFamily: 'DM Sans Medium',
    fontSize: 11,
    color: Colors.foam,
  },
  removeButton: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 18,
    color: '#C0B8AF',
  },
  bottomPadding: {
    height: 100,
  },
});
