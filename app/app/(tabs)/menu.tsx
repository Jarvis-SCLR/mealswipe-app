import React, { useCallback, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
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
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/Colors';
import { getSavedRecipes, removeRecipe, type SavedRecipe } from '../../services/menuStorage';
import { MealType } from '../../services/recipeApi';
import { applyGeneratedImages } from '../../services/recipeImageService';
import { getGeneratedImage } from '../../assets/generated-images';

const BUNDLED_IMAGE_PREFIX = 'bundled://';

// Resolve image source - handles bundled images and remote URLs
function getImageSource(imageUrl: string): ImageSourcePropType {
  if (imageUrl.startsWith(BUNDLED_IMAGE_PREFIX)) {
    const recipeId = imageUrl.replace(BUNDLED_IMAGE_PREFIX, '');
    const bundledAsset = getGeneratedImage(recipeId);
    if (bundledAsset) {
      return bundledAsset;
    }
  }
  return { uri: imageUrl };
}

// Meal type folder configuration
const MEAL_FOLDERS: { type: MealType | 'all'; label: string; icon: string; color: string }[] = [
  { type: 'all', label: 'All', icon: '🍽️', color: '#6B7280' },
  { type: 'breakfast', label: 'Breakfast', icon: '🍳', color: '#F59E0B' },
  { type: 'lunch', label: 'Lunch', icon: '🥗', color: '#10B981' },
  { type: 'dinner', label: 'Dinner', icon: '🍝', color: '#EF4444' },
  { type: 'snack', label: 'Snacks', icon: '🍿', color: '#8B5CF6' },
  { type: 'dessert', label: 'Dessert', icon: '🍰', color: '#EC4899' },
  { type: 'drink', label: 'Drinks', icon: '🥤', color: '#06B6D4' },
];

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<MealType | 'all'>('all');

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
    if (saved.length > 0) {
      setImageLoading(true);
      const withImages = await applyGeneratedImages(saved);
      setRecipes(withImages);
      setImageLoading(false);
    }
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

  const selectFolder = (folder: MealType | 'all') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFolder(folder);
  };

  // Filter recipes by selected folder
  const filteredRecipes = useMemo(() => {
    if (selectedFolder === 'all') return recipes;
    return recipes.filter(r => r.mealType === selectedFolder);
  }, [recipes, selectedFolder]);

  // Count recipes per folder
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { all: recipes.length };
    MEAL_FOLDERS.forEach(f => {
      if (f.type !== 'all') {
        counts[f.type] = recipes.filter(r => r.mealType === f.type).length;
      }
    });
    return counts;
  }, [recipes]);

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

      {imageLoading && (
        <View style={styles.imageLoadingBanner}>
          <ActivityIndicator size="small" color={Colors.espresso} />
          <Text style={styles.imageLoadingText}>Generating AI images...</Text>
        </View>
      )}

      {/* Folder/Category Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.folderContainer}
      >
        {MEAL_FOLDERS.map((folder) => {
          const isSelected = selectedFolder === folder.type;
          const count = folderCounts[folder.type] || 0;
          
          return (
            <TouchableOpacity
              key={folder.type}
              style={[
                styles.folderTab,
                isSelected && { backgroundColor: folder.color + '20', borderColor: folder.color }
              ]}
              onPress={() => selectFolder(folder.type)}
              activeOpacity={0.7}
            >
              <Text style={styles.folderIcon}>{folder.icon}</Text>
              <Text style={[
                styles.folderLabel,
                isSelected && { color: folder.color, fontWeight: '600' }
              ]}>
                {folder.label}
              </Text>
              {count > 0 && (
                <View style={[styles.folderBadge, { backgroundColor: isSelected ? folder.color : '#E5E7EB' }]}>
                  <Text style={[styles.folderBadgeText, isSelected && { color: '#fff' }]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {filteredRecipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>
            {selectedFolder === 'all' ? '🍽️' : MEAL_FOLDERS.find(f => f.type === selectedFolder)?.icon}
          </Text>
          <Text style={styles.emptyTitle}>
            {selectedFolder === 'all' 
              ? 'No recipes saved yet'
              : `No ${selectedFolder} recipes`}
          </Text>
          <Text style={styles.emptySubtitle}>
            {selectedFolder === 'all'
              ? "Swipe right on recipes you love\nand they'll appear here!"
              : `Swipe right on ${selectedFolder} recipes\nto add them to this folder!`}
          </Text>
          {selectedFolder === 'all' && (
            <TouchableOpacity 
              style={styles.discoverButton}
              onPress={() => router.push('/(tabs)')}
            >
              <Text style={styles.discoverButtonText}>Start Discovering</Text>
            </TouchableOpacity>
          )}
          {selectedFolder !== 'all' && (
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => setSelectedFolder('all')}
            >
              <Text style={styles.viewAllButtonText}>View All Recipes</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredRecipes.map((recipe) => (
            <TouchableOpacity
              key={recipe.id}
              style={styles.recipeCard}
              activeOpacity={0.9}
              onPress={() => openRecipe(recipe)}
            >
              <Image source={getImageSource(recipe.image)} style={styles.recipeImage} />
              
              {/* Meal type badge */}
              {recipe.mealType && (
                <View style={[
                  styles.mealTypeBadge, 
                  { backgroundColor: MEAL_FOLDERS.find(f => f.type === recipe.mealType)?.color || '#6B7280' }
                ]}>
                  <Text style={styles.mealTypeBadgeText}>
                    {MEAL_FOLDERS.find(f => f.type === recipe.mealType)?.icon} {recipe.mealType}
                  </Text>
                </View>
              )}
              
              <View style={styles.recipeInfo}>
                <Text style={styles.recipeName} numberOfLines={1}>
                  {recipe.name}
                </Text>
                <View style={styles.recipeMetaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color={Colors.mocha} />
                    <Text style={styles.metaText}>{recipe.prepTime}</Text>
                  </View>
                  {recipe.nutrition?.calories && (
                    <View style={styles.metaItem}>
                      <Ionicons name="flame-outline" size={14} color={Colors.mocha} />
                      <Text style={styles.metaText}>{recipe.nutrition.calories} cal</Text>
                    </View>
                  )}
                  <View style={styles.metaItem}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.metaText}>{recipe.difficulty}</Text>
                  </View>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemove(recipe.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="heart" size={24} color={Colors.coral} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          
          {/* Bottom padding for tab bar */}
          <View style={{ height: 100 }} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  imageLoadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.latte,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  imageLoadingText: {
    fontFamily: 'DM Sans Medium',
    fontSize: 12,
    color: Colors.espresso,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Playfair Display SemiBold',
    color: Colors.espresso,
  },
  headerCount: {
    fontSize: 14,
    fontFamily: 'DM Sans Medium',
    color: Colors.mocha,
  },
  folderContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  folderTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginRight: 8,
    gap: 6,
  },
  folderIcon: {
    fontSize: 16,
  },
  folderLabel: {
    fontSize: 14,
    fontFamily: 'DM Sans Medium',
    color: '#6B7280',
  },
  folderBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  folderBadgeText: {
    fontSize: 11,
    fontFamily: 'DM Sans Bold',
    color: '#6B7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Playfair Display SemiBold',
    color: Colors.espresso,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'DM Sans',
    color: Colors.mocha,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  discoverButton: {
    backgroundColor: Colors.coral,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
  },
  discoverButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'DM Sans Bold',
  },
  viewAllButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  viewAllButtonText: {
    color: Colors.coral,
    fontSize: 16,
    fontFamily: 'DM Sans Bold',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  recipeCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  recipeImage: {
    width: 100,
    height: 100,
    backgroundColor: Colors.oatmeal,
  },
  mealTypeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mealTypeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'DM Sans Bold',
    textTransform: 'capitalize',
  },
  recipeInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  recipeName: {
    fontSize: 16,
    fontFamily: 'DM Sans SemiBold',
    color: Colors.espresso,
    marginBottom: 6,
  },
  recipeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'DM Sans',
    color: Colors.mocha,
  },
  removeButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
