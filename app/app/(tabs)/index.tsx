import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  Pressable,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Colors } from '../../constants/Colors';
import { RecipeCard } from '../../components/RecipeCard';
import {
  getRecipes,
  getRecipesWithCommunity,
  getUserPreferences,
  filterRecipesByPreferences,
  recordRecipeLike,
  type Recipe,
} from '../../services/recipeApi';
import { saveRecipe, getSavedCount } from '../../services/menuStorage';
import { useSubscription, FREE_LIMITS } from '../../contexts/SubscriptionContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CARD_WIDTH = SCREEN_WIDTH * 0.9;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.72;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;

export default function SwipeDeckScreen() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [likedCount, setLikedCount] = useState(0);
  const { isPremium, setShowPaywall, setPaywallFeature } = useSubscription();

  const position = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const prefs = await getUserPreferences();
      // Fetch recipes with 30% community recipes mixed in
      const fetched = await getRecipesWithCommunity(30, 0.3);
      const filtered = filterRecipesByPreferences(fetched, prefs);
      const result = filtered.length > 0 ? filtered : fetched;
      // If API failed and returned empty, use hardcoded fallback
      if (result.length === 0) {
        setRecipes(getLocalFallbackRecipes());
      } else {
        setRecipes(result);
      }
    } catch (error) {
      console.warn('Error loading recipes:', error);
      // Use local fallback on any error
      setRecipes(getLocalFallbackRecipes());
    } finally {
      setLoading(false);
    }
  };
  
  // Local fallback recipes in case API fails
  const getLocalFallbackRecipes = () => [
    {
      id: 'local-1',
      name: 'Classic Margherita Pizza',
      description: 'Fresh tomatoes, mozzarella, and basil on a crispy crust.',
      image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1200&q=85',
      prepTime: '20 min',
      cookTime: '15 min',
      servings: 4,
      difficulty: 'Easy' as const,
      tags: ['Italian', 'Dinner'],
      mealType: 'dinner' as const,
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
      difficulty: 'Easy' as const,
      tags: ['Seafood', 'Healthy'],
      mealType: 'dinner' as const,
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
      difficulty: 'Medium' as const,
      tags: ['Thai', 'Curry', 'Spicy'],
      mealType: 'dinner' as const,
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
      difficulty: 'Easy' as const,
      tags: ['Healthy', 'Vegetarian', 'Mediterranean'],
      mealType: 'dinner' as const,
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
      difficulty: 'Medium' as const,
      tags: ['Korean', 'Fried', 'Spicy'],
      mealType: 'dinner' as const,
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
      difficulty: 'Easy' as const,
      tags: ['Italian', 'Pasta', 'Creamy'],
      mealType: 'dinner' as const,
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
      difficulty: 'Easy' as const,
      tags: ['Mexican', 'Quick', 'Family'],
      mealType: 'dinner' as const,
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
      difficulty: 'Medium' as const,
      tags: ['Roasted', 'Classic', 'Sunday Dinner'],
      mealType: 'dinner' as const,
      ingredients: ['Whole chicken', 'Lemon', 'Rosemary', 'Thyme', 'Garlic', 'Butter'],
      instructions: ['Season chicken', 'Stuff with lemon and herbs', 'Roast at 425°F', 'Rest before carving'],
      nutrition: { calories: 380, protein: 42, carbs: 2, fat: 22 }
    }
  ];

  const current = recipes[index];
  const next = recipes[index + 1];

  const openDetails = () => {
    if (!current) return;
    // Pass recipe data as URL params for local recipes
    router.push({
      pathname: `/recipe/${current.id}`,
      params: { recipeData: JSON.stringify(current) }
    });
  };

  const resetCard = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  const advance = () => {
    setIndex((prev) => prev + 1);
    position.setValue({ x: 0, y: 0 });

    // Load more recipes when running low
    if (index >= recipes.length - 5) {
      loadMoreRecipes();
    }
  };

  const loadMoreRecipes = async () => {
    try {
      const prefs = await getUserPreferences();
      // Fetch more recipes with 30% community recipes mixed in
      const more = await getRecipesWithCommunity(20, 0.3);
      const filtered = filterRecipesByPreferences(more, prefs);
      setRecipes(prev => [...prev, ...filtered]);
    } catch (error) {
      console.warn('Error loading more recipes:', error);
    }
  };

  const completeSwipe = async (direction: 'left' | 'right') => {
    const targetX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;

    if (direction === 'right' && current) {
      // Check if user is at the free tier limit
      if (!isPremium) {
        const currentCount = await getSavedCount();
        if (currentCount >= FREE_LIMITS.maxLikedRecipes) {
          // Show paywall instead of saving
          setPaywallFeature(`Save more than ${FREE_LIMITS.maxLikedRecipes} recipes`);
          setShowPaywall(true);
          resetCard();
          return;
        }
      }
      
      // Track engagement for community recipes (sends notification to creator)
      recordRecipeLike(current.id).catch(() => {}); // Fire and forget
      
      // Save liked recipe to menu
      await saveRecipe(current);
      setLikedCount(prev => prev + 1);
    }

    Animated.timing(position, {
      toValue: { x: targetX, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      advance();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        position.stopAnimation();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: position.x, dy: position.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: async (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          completeSwipe('right');
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          completeSwipe('left');
        } else {
          resetCard();
        }
      },
    })
  ).current;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-15deg', '0deg', '15deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const nextCardScale = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    outputRange: [1, 0.95, 1],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.apricot} />
          <Text style={styles.loadingText}>Finding delicious recipes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const emptyState = !current;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>Kitchen</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.deck}>
        {emptyState ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>All done!</Text>
            <Text style={styles.emptySubtitle}>You've seen all available recipes.</Text>
            <Pressable style={styles.refreshButton} onPress={loadRecipes}>
              <Text style={styles.refreshText}>Load More</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {next && (
              <Animated.View
                style={[
                  styles.cardContainer,
                  { transform: [{ scale: nextCardScale }] },
                ]}
                pointerEvents="none"
              >
                <RecipeCard recipe={next} />
              </Animated.View>
            )}

            <Animated.View
              style={[
                styles.cardContainer,
                {
                  transform: [
                    { translateX: position.x },
                    { translateY: position.y },
                    { rotate },
                  ],
                },
              ]}
              {...panResponder.panHandlers}
            >
              <RecipeCard recipe={current} />

              <Animated.View style={[styles.overlay, styles.likeOverlay, { opacity: likeOpacity }]}>
                <Text style={[styles.overlayText, { color: Colors.apricot }]}>❤️ LIKE</Text>
              </Animated.View>

              <Animated.View style={[styles.overlay, styles.nopeOverlay, { opacity: nopeOpacity }]}>
                <Text style={[styles.overlayText, { color: Colors.pepe }]}>✕ NOPE</Text>
              </Animated.View>
            </Animated.View>
          </>
        )}
      </View>

      <View style={styles.actionBar}>
        <Pressable
          style={styles.actionPill}
          onPress={() => completeSwipe('left')}
        >
          <Text style={[styles.actionText, { color: Colors.pepe }]}>✕</Text>
        </Pressable>
        <Pressable
          style={[styles.actionPill, styles.actionPillCenter]}
          onPress={openDetails}
        >
          <Text style={styles.actionText}>🤤</Text>
        </Pressable>
        <Pressable
          style={styles.actionPill}
          onPress={() => completeSwipe('right')}
        >
          <Text style={[styles.actionText, { color: Colors.apricot }]}>❤</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.milk,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: Colors.espresso,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
    elevation: 20,
  },
  headerLeft: {
    width: 90,
    fontFamily: 'DM Sans Medium',
    color: Colors.espresso,
    fontSize: 14,
  },
  headerTitle: {
    fontFamily: 'Playfair Display SemiBold',
    fontSize: 22,
    color: Colors.espresso,
  },
  headerRight: {
    width: 90,
  },
  deck: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  overlay: {
    position: 'absolute',
    top: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  likeOverlay: {
    left: 20,
    borderColor: Colors.apricot,
  },
  nopeOverlay: {
    right: 20,
    borderColor: Colors.pepe,
  },
  overlayText: {
    fontFamily: 'DM Sans Bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontFamily: 'Playfair Display Bold',
    fontSize: 28,
    color: Colors.espresso,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: 'rgba(45,36,32,0.65)',
    textAlign: 'center',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: Colors.apricot,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  refreshText: {
    fontFamily: 'DM Sans Bold',
    fontSize: 16,
    color: '#fff',
  },
  actionBar: {
    paddingHorizontal: 34,
    paddingBottom: 18,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionPill: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Colors.foam,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  actionPillCenter: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  actionText: {
    fontSize: 22,
  },
});
