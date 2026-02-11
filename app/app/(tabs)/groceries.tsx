import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Colors } from '../../constants/Colors';
import { getSavedRecipes, type SavedRecipe } from '../../services/menuStorage';

interface GroceryItem {
  id: string;
  name: string;
  fromRecipes: string[];
  checked: boolean;
}

// Parse and normalize ingredients
function parseIngredients(recipes: SavedRecipe[]): GroceryItem[] {
  const ingredientMap = new Map<string, { name: string; recipes: string[] }>();
  
  recipes.forEach(recipe => {
    recipe.ingredients.forEach(ingredient => {
      // Normalize: lowercase, trim
      const normalized = ingredient.toLowerCase().trim();
      // Create a simple key (remove quantities for grouping)
      const key = normalized
        .replace(/^\d+[\s\/\d]*/, '') // Remove leading numbers
        .replace(/^(cups?|tbsps?|tsps?|oz|lbs?|g|kg|ml|l|pieces?|cloves?|cans?|packages?|bunch|head)\s*/i, '')
        .trim();
      
      if (key.length < 2) return; // Skip very short items
      
      if (ingredientMap.has(key)) {
        const existing = ingredientMap.get(key)!;
        if (!existing.recipes.includes(recipe.name)) {
          existing.recipes.push(recipe.name);
        }
      } else {
        ingredientMap.set(key, {
          name: ingredient, // Keep original with quantity
          recipes: [recipe.name]
        });
      }
    });
  });
  
  return Array.from(ingredientMap.entries()).map(([key, value], idx) => ({
    id: `item-${idx}`,
    name: value.name,
    fromRecipes: value.recipes,
    checked: false,
  }));
}

export default function GroceryScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipeCount, setRecipeCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadGroceryList();
    }, [])
  );

  const loadGroceryList = async () => {
    const recipes = await getSavedRecipes();
    setRecipeCount(recipes.length);
    const groceryItems = parseIngredients(recipes);
    setItems(groceryItems);
    setLoading(false);
  };

  const toggleItem = (itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, checked: !item.checked } : item
    ));
  };

  const clearChecked = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItems(prev => prev.filter(item => !item.checked));
  };

  const shareList = async () => {
    const uncheckedItems = items.filter(i => !i.checked);
    const listText = uncheckedItems.map(i => `☐ ${i.name}`).join('\n');
    const message = `🛒 Grocery List (${uncheckedItems.length} items)\n\n${listText}`;
    
    try {
      await Share.share({ message });
    } catch (error) {
      console.warn('Error sharing:', error);
    }
  };

  const checkedCount = items.filter(i => i.checked).length;
  const uncheckedItems = items.filter(i => !i.checked);
  const checkedItems = items.filter(i => i.checked);

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
        <View>
          <Text style={styles.headerTitle}>Grocery List</Text>
          <Text style={styles.headerSubtitle}>
            {items.length} items from {recipeCount} recipes
          </Text>
        </View>
        {items.length > 0 && (
          <TouchableOpacity style={styles.shareButton} onPress={shareList}>
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>No ingredients yet</Text>
          <Text style={styles.emptySubtitle}>
            Save some recipes and your{'\n'}grocery list will appear here!
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Unchecked items */}
          {uncheckedItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.itemRow}
              activeOpacity={0.7}
              onPress={() => toggleItem(item.id)}
            >
              <View style={styles.checkbox}>
                <Text style={styles.checkboxIcon}></Text>
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.fromRecipes.length > 0 && (
                  <Text style={styles.itemSource} numberOfLines={1}>
                    {item.fromRecipes.join(', ')}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}

          {/* Checked items section */}
          {checkedItems.length > 0 && (
            <>
              <View style={styles.checkedHeader}>
                <Text style={styles.checkedTitle}>
                  Checked ({checkedItems.length})
                </Text>
                <TouchableOpacity onPress={clearChecked}>
                  <Text style={styles.clearButton}>Clear</Text>
                </TouchableOpacity>
              </View>
              
              {checkedItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemRow, styles.itemRowChecked]}
                  activeOpacity={0.7}
                  onPress={() => toggleItem(item.id)}
                >
                  <View style={[styles.checkbox, styles.checkboxChecked]}>
                    <Text style={styles.checkboxIconChecked}>✓</Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, styles.itemNameChecked]}>
                      {item.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
          
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'Playfair Display Bold',
    fontSize: 32,
    color: Colors.espresso,
  },
  headerSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: '#7A7067',
    marginTop: 2,
  },
  shareButton: {
    backgroundColor: Colors.espresso,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  shareButtonText: {
    fontFamily: 'DM Sans Bold',
    fontSize: 14,
    color: Colors.foam,
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
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.foam,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(45,36,32,0.06)',
  },
  itemRowChecked: {
    opacity: 0.6,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.espresso,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  checkboxChecked: {
    backgroundColor: Colors.verde,
    borderColor: Colors.verde,
  },
  checkboxIcon: {
    fontSize: 14,
    color: Colors.espresso,
  },
  checkboxIconChecked: {
    fontSize: 14,
    color: Colors.foam,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontFamily: 'DM Sans Medium',
    fontSize: 16,
    color: Colors.espresso,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#7A7067',
  },
  itemSource: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: '#A89F91',
    marginTop: 2,
  },
  checkedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  checkedTitle: {
    fontFamily: 'DM Sans Medium',
    fontSize: 14,
    color: '#7A7067',
  },
  clearButton: {
    fontFamily: 'DM Sans Medium',
    fontSize: 14,
    color: Colors.pepe,
  },
  bottomPadding: {
    height: 100,
  },
});
