import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Colors } from '../../constants/Colors';
import { getRecipeById, type Recipe } from '../../services/recipeApi';
import { saveRecipe } from '../../services/menuStorage';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Local fallback recipes (same as in index.tsx)
const LOCAL_RECIPES: Recipe[] = [
  {
    id: 'local-1',
    name: 'Classic Margherita Pizza',
    description: 'Fresh tomatoes, mozzarella, and basil on a crispy crust.',
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1200&q=85',
    prepTime: '20 min',
    cookTime: '15 min',
    servings: 4,
    difficulty: 'Easy',
    tags: ['Italian', 'Dinner'],
    mealType: 'dinner',
    ingredients: ['Pizza dough', 'San Marzano tomatoes', 'Fresh mozzarella', 'Fresh basil', 'Olive oil'],
    instructions: ['Preheat oven to 500°F', 'Roll out dough', 'Add toppings', 'Bake 12-15 min'],
    nutrition: { calories: 285, protein: 12, carbs: 36, fat: 10 }
  },
  {
    id: 'local-2',
    name: 'Honey Garlic Salmon',
    description: 'Glazed salmon with a sweet and savory honey garlic sauce.',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=1200&q=85',
    prepTime: '10 min',
    cookTime: '20 min',
    servings: 4,
    difficulty: 'Easy',
    tags: ['Seafood', 'Healthy'],
    mealType: 'dinner',
    ingredients: ['Salmon fillets', 'Honey', 'Garlic', 'Soy sauce', 'Butter'],
    instructions: ['Mix glaze', 'Sear salmon', 'Add glaze and bake'],
    nutrition: { calories: 320, protein: 34, carbs: 18, fat: 12 }
  },
  {
    id: 'local-3',
    name: 'Thai Green Curry',
    description: 'Creamy coconut curry with vegetables and aromatic herbs.',
    image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=1200&q=85',
    prepTime: '15 min',
    cookTime: '25 min',
    servings: 4,
    difficulty: 'Medium',
    tags: ['Thai', 'Curry', 'Spicy'],
    mealType: 'dinner',
    ingredients: ['Coconut milk', 'Green curry paste', 'Chicken', 'Bamboo shoots', 'Thai basil'],
    instructions: ['Sauté curry paste', 'Add coconut milk', 'Add protein and veggies', 'Simmer'],
    nutrition: { calories: 380, protein: 28, carbs: 14, fat: 24 }
  },
  {
    id: 'local-4',
    name: 'Mediterranean Grain Bowl',
    description: 'Hearty quinoa bowl with feta, olives, and lemon dressing.',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=85',
    prepTime: '10 min',
    cookTime: '20 min',
    servings: 2,
    difficulty: 'Easy',
    tags: ['Healthy', 'Vegetarian', 'Mediterranean'],
    mealType: 'dinner',
    ingredients: ['Quinoa', 'Cucumber', 'Cherry tomatoes', 'Feta cheese', 'Kalamata olives'],
    instructions: ['Cook quinoa', 'Chop vegetables', 'Assemble bowl', 'Drizzle with dressing'],
    nutrition: { calories: 420, protein: 14, carbs: 48, fat: 20 }
  },
  {
    id: 'local-5',
    name: 'Spicy Korean Fried Chicken',
    description: 'Extra crispy chicken coated in gochujang glaze.',
    image: 'https://images.unsplash.com/photo-1575932444877-5106bee2a599?w=1200&q=85',
    prepTime: '30 min',
    cookTime: '20 min',
    servings: 4,
    difficulty: 'Medium',
    tags: ['Korean', 'Fried', 'Spicy'],
    mealType: 'dinner',
    ingredients: ['Chicken wings', 'Gochujang', 'Soy sauce', 'Honey', 'Sesame seeds'],
    instructions: ['Coat chicken', 'Fry until crispy', 'Toss in sauce', 'Garnish'],
    nutrition: { calories: 450, protein: 32, carbs: 24, fat: 26 }
  },
  {
    id: 'local-6',
    name: 'Creamy Tuscan Pasta',
    description: 'Sun-dried tomatoes and spinach in a garlic cream sauce.',
    image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=1200&q=85',
    prepTime: '10 min',
    cookTime: '20 min',
    servings: 4,
    difficulty: 'Easy',
    tags: ['Italian', 'Pasta', 'Creamy'],
    mealType: 'dinner',
    ingredients: ['Penne pasta', 'Heavy cream', 'Sun-dried tomatoes', 'Spinach', 'Parmesan'],
    instructions: ['Cook pasta', 'Make cream sauce', 'Add tomatoes and spinach', 'Combine'],
    nutrition: { calories: 520, protein: 18, carbs: 56, fat: 26 }
  },
  {
    id: 'local-7',
    name: 'Beef Tacos',
    description: 'Seasoned ground beef with fresh toppings in corn tortillas.',
    image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=1200&q=85',
    prepTime: '15 min',
    cookTime: '15 min',
    servings: 4,
    difficulty: 'Easy',
    tags: ['Mexican', 'Quick', 'Family'],
    mealType: 'dinner',
    ingredients: ['Ground beef', 'Taco seasoning', 'Corn tortillas', 'Lettuce', 'Cheese'],
    instructions: ['Brown beef', 'Add seasoning', 'Warm tortillas', 'Assemble tacos'],
    nutrition: { calories: 340, protein: 24, carbs: 28, fat: 16 }
  },
  {
    id: 'local-8',
    name: 'Lemon Herb Roasted Chicken',
    description: 'Juicy whole chicken with herbs and crispy golden skin.',
    image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=1200&q=85',
    prepTime: '20 min',
    cookTime: '90 min',
    servings: 6,
    difficulty: 'Medium',
    tags: ['Roasted', 'Classic', 'Sunday Dinner'],
    mealType: 'dinner',
    ingredients: ['Whole chicken', 'Lemon', 'Rosemary', 'Thyme', 'Garlic', 'Butter'],
    instructions: ['Season chicken', 'Stuff with lemon and herbs', 'Roast at 425°F', 'Rest before carving'],
    nutrition: { calories: 380, protein: 42, carbs: 2, fat: 22 }
  }
];

export default function RecipeDetailModal() {
  const { id, recipeData } = useLocalSearchParams<{ id?: string; recipeData?: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipe();
  }, [id, recipeData]);

  const loadRecipe = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    // First try to parse recipe data passed from swipe screen
    if (recipeData) {
      try {
        const parsed = JSON.parse(recipeData);
        setRecipe(parsed);
        setLoading(false);
        return;
      } catch (e) {
        console.warn('Failed to parse recipe data');
      }
    }

    // Check if it's a local recipe
    const localRecipe = LOCAL_RECIPES.find(r => r.id === id);
    if (localRecipe) {
      setRecipe(localRecipe);
      setLoading(false);
      return;
    }

    // Try to fetch from API
    const fetched = await getRecipeById(id);
    setRecipe(fetched);
    setLoading(false);
  };

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState(false);

  const toggleIngredient = (index: number) => {
    setChecked((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleAddToMenu = async () => {
    if (!recipe || adding) return;
    
    setAdding(true);
    try {
      await saveRecipe(recipe);
      router.back();
    } catch (error) {
      console.warn('Failed to add recipe to menu:', error);
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: '' }} />
        <View style={styles.notFound}>
          <ActivityIndicator size="large" color={Colors.espresso} />
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: '' }} />
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>Recipe not found</Text>
          <Text style={styles.notFoundSubtitle}>Recipe id: {String(id ?? '')}</Text>
          <TouchableOpacity style={styles.backButtonAlt} onPress={() => router.back()}>
            <Text style={styles.backButtonAltText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '' }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <Image source={{ uri: recipe.image }} style={styles.heroImage} />
          <SafeAreaView style={styles.heroSafe}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{recipe.name}</Text>

          <Text style={styles.meta}>
            ⏱️ {recipe.prepTime}  |  🔥 {recipe.nutrition?.calories || '—'} cal  |  🍽️ {recipe.servings} servings
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsRow}
          >
            {recipe.tags.map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </ScrollView>

          <Text style={styles.description}>{recipe.description}</Text>

          <Text style={styles.sectionTitle}>Ingredients</Text>
          <View style={styles.sectionBody}>
            {recipe.ingredients.map((ingredient, idx) => {
              const isChecked = Boolean(checked[idx]);
              return (
                <TouchableOpacity
                  key={`${idx}-${ingredient}`}
                  style={styles.ingredientRow}
                  activeOpacity={0.85}
                  onPress={() => toggleIngredient(idx)}
                >
                  <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                    <Text style={styles.checkboxIcon}>{isChecked ? '✓' : ''}</Text>
                  </View>
                  <Text
                    style={[styles.ingredientText, isChecked && styles.ingredientTextChecked]}
                  >
                    {ingredient}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Instructions</Text>
          <View style={[styles.sectionBody, styles.instructionsBody]}>
            {recipe.instructions.map((step, idx) => (
              <View key={`${idx}-${step}`} style={styles.stepRow}>
                <View style={styles.stepNumberPill}>
                  <Text style={styles.stepNumber}>{idx + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <SafeAreaView style={styles.bottomSafe}>
          <TouchableOpacity 
            activeOpacity={0.9} 
            style={[styles.cta, adding && styles.ctaDisabled]} 
            onPress={handleAddToMenu}
            disabled={adding}
          >
            <Text style={styles.ctaText}>{adding ? 'Adding...' : 'Add to Menu'}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.milk,
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.milk,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  heroWrap: {
    width: '100%',
    height: Math.round(SCREEN_HEIGHT * 0.4),
    backgroundColor: Colors.caramello,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(253,251,247,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(45,36,32,0.08)',
  },
  backButtonPressed: {
    opacity: 0.85,
  },
  backIcon: {
    fontSize: 20,
    color: Colors.espresso,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  title: {
    fontFamily: 'Playfair Display Bold',
    fontSize: 32,
    lineHeight: 38,
    color: Colors.espresso,
    marginBottom: 10,
  },
  meta: {
    fontFamily: 'DM Sans Medium',
    fontSize: 14,
    color: 'rgba(45,36,32,0.72)',
    marginBottom: 14,
  },
  tagsRow: {
    paddingBottom: 8,
    gap: 10,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.verde,
  },
  tagText: {
    fontFamily: 'DM Sans Medium',
    fontSize: 13,
    color: Colors.foam,
  },
  description: {
    marginTop: 8,
    fontFamily: 'DM Sans',
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(45,36,32,0.82)',
  },
  sectionTitle: {
    marginTop: 22,
    marginBottom: 12,
    fontFamily: 'Playfair Display SemiBold',
    fontSize: 20,
    color: Colors.espresso,
  },
  sectionBody: {
    backgroundColor: Colors.foam,
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(45,36,32,0.06)',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(45,36,32,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.foam,
  },
  checkboxChecked: {
    borderColor: Colors.verde,
    backgroundColor: 'rgba(107,142,94,0.12)',
  },
  checkboxIcon: {
    fontFamily: 'DM Sans Bold',
    fontSize: 14,
    color: Colors.verde,
    marginTop: -1,
  },
  ingredientText: {
    flex: 1,
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: 'rgba(45,36,32,0.88)',
  },
  ingredientTextChecked: {
    color: 'rgba(45,36,32,0.45)',
    textDecorationLine: 'line-through',
  },
  instructionsBody: {
    paddingVertical: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 12,
  },
  stepNumberPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.caramello,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(45,36,32,0.06)',
  },
  stepNumber: {
    fontFamily: 'DM Sans Bold',
    fontSize: 14,
    color: Colors.espresso,
  },
  stepText: {
    flex: 1,
    fontFamily: 'DM Sans',
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(45,36,32,0.82)',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(253,251,247,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(45,36,32,0.06)',
  },
  bottomSafe: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  cta: {
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.apricot,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  ctaText: {
    fontFamily: 'DM Sans Bold',
    fontSize: 16,
    color: Colors.espresso,
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  notFound: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundTitle: {
    fontFamily: 'Playfair Display Bold',
    fontSize: 26,
    color: Colors.espresso,
    marginBottom: 8,
  },
  notFoundSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: 'rgba(45,36,32,0.7)',
  },
  backButtonAlt: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.espresso,
    borderRadius: 12,
  },
  backButtonAltText: {
    fontFamily: 'DM Sans Medium',
    fontSize: 16,
    color: Colors.foam,
  },
});
