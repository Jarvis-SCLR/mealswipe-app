// Spoonacular API Service
// 150 points/day free tier - each random recipe = 1 point

import AsyncStorage from '@react-native-async-storage/async-storage';

const SPOONACULAR_API_KEY = '40dfd38b55ea4c108a0318e420ff8e42';
const BASE_URL = 'https://api.spoonacular.com';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'drink';

export interface Recipe {
  id: string;
  name: string;
  description: string;
  image: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  mealType: MealType;
  tags: string[];
  appliances?: string[];
  ingredients: string[];
  instructions: string[];
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  summary: string;
  extendedIngredients?: Array<{
    original: string;
  }>;
  analyzedInstructions?: Array<{
    steps: Array<{
      step: string;
    }>;
  }>;
  nutrition?: {
    nutrients: Array<{
      name: string;
      amount: number;
    }>;
  };
  diets?: string[];
  dishTypes?: string[];
}

// Convert Spoonacular recipe to our format
function convertRecipe(spoon: SpoonacularRecipe): Recipe {
  // Strip HTML from summary and remove time references to avoid mismatches
  let description = spoon.summary
    ?.replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\d+\s*(minutes?|mins?|hours?|hrs?)/gi, '') // Remove time mentions
    .replace(/ready in|takes about|can be (done|made) in/gi, '') // Remove time phrases
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .split('.')[0] + '.' || 'A delicious recipe to try!';
  
  // Clean up any double spaces or weird punctuation from removals
  description = description.replace(/\s+\./g, '.').replace(/\s+/g, ' ').trim();
  
  // Determine difficulty based on time and ingredients
  let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
  if (spoon.readyInMinutes <= 20) difficulty = 'Easy';
  else if (spoon.readyInMinutes >= 60) difficulty = 'Hard';
  
  // Extract ingredients
  const ingredients = spoon.extendedIngredients?.map(i => i.original) || [];
  
  // Extract instructions
  const instructions = spoon.analyzedInstructions?.[0]?.steps?.map(s => s.step) || 
    ['Follow recipe instructions from the original source.'];
  
  // Build tags from diets and dish types
  const tags = [
    ...(spoon.diets || []),
    ...(spoon.dishTypes?.slice(0, 2) || [])
  ].map(t => t.charAt(0).toUpperCase() + t.slice(1));
  
  // Extract nutrition
  let nutrition: Recipe['nutrition'];
  if (spoon.nutrition?.nutrients) {
    const getNutrient = (name: string) => 
      spoon.nutrition?.nutrients.find(n => n.name === name)?.amount || 0;
    nutrition = {
      calories: Math.round(getNutrient('Calories')),
      protein: Math.round(getNutrient('Protein')),
      carbs: Math.round(getNutrient('Carbohydrates')),
      fat: Math.round(getNutrient('Fat'))
    };
  }
  
  // Get larger image (636x393 is the largest Spoonacular size)
  let imageUrl = spoon.image || '';
  if (imageUrl && spoon.id) {
    // Replace any size suffix with larger size
    imageUrl = `https://img.spoonacular.com/recipes/${spoon.id}-636x393.jpg`;
  }
  if (!imageUrl) {
    imageUrl = 'https://via.placeholder.com/636x393?text=No+Image';
  }
  
  // Determine meal type from dish types
  const dishTypes = (spoon.dishTypes || []).map(d => d.toLowerCase());
  const title = spoon.title.toLowerCase();
  let mealType: MealType = 'dinner'; // default
  
  if (dishTypes.some(d => ['breakfast', 'morning meal', 'brunch'].includes(d)) ||
      title.includes('breakfast') || title.includes('pancake') || title.includes('omelette') ||
      title.includes('waffle') || title.includes('french toast')) {
    mealType = 'breakfast';
  } else if (dishTypes.some(d => ['lunch', 'salad', 'sandwich', 'soup'].includes(d)) ||
      title.includes('lunch') || title.includes('sandwich') || title.includes('wrap')) {
    mealType = 'lunch';
  } else if (dishTypes.some(d => ['snack', 'appetizer', 'fingerfood', 'antipasti'].includes(d)) ||
      title.includes('snack') || title.includes('bites') || title.includes('dip')) {
    mealType = 'snack';
  } else if (dishTypes.some(d => ['dessert', 'sweet'].includes(d)) ||
      title.includes('cake') || title.includes('cookie') || title.includes('brownie') ||
      title.includes('ice cream') || title.includes('pudding')) {
    mealType = 'dessert';
  } else if (dishTypes.some(d => ['beverage', 'drink', 'smoothie', 'cocktail'].includes(d)) ||
      title.includes('smoothie') || title.includes('shake') || title.includes('juice')) {
    mealType = 'drink';
  }
  
  return {
    id: String(spoon.id),
    name: spoon.title,
    description,
    image: imageUrl,
    prepTime: `${Math.max(5, Math.floor(spoon.readyInMinutes * 0.3))} min`,
    cookTime: `${Math.ceil(spoon.readyInMinutes * 0.7)} min`,
    servings: spoon.servings || 4,
    difficulty,
    mealType,
    tags: tags.length > 0 ? tags : ['Dinner'],
    ingredients,
    instructions,
    nutrition
  };
}

// Fetch random recipes
export async function fetchRandomRecipes(count: number = 10): Promise<Recipe[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/recipes/random?apiKey=${SPOONACULAR_API_KEY}&number=${count}&includeNutrition=true`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.recipes.map(convertRecipe);
  } catch (error) {
    // Use warn instead of error to avoid red screen in dev
    console.warn('API unavailable, using fallback recipes');
    return getFallbackRecipes();
  }
}

// Search recipes with filters
export async function searchRecipes(params: {
  query?: string;
  cuisine?: string;
  diet?: string;
  intolerances?: string;
  maxReadyTime?: number;
  number?: number;
}): Promise<Recipe[]> {
  try {
    const searchParams = new URLSearchParams({
      apiKey: SPOONACULAR_API_KEY,
      number: String(params.number || 10),
      addRecipeInformation: 'true',
      addRecipeNutrition: 'true',
      fillIngredients: 'true'
    });
    
    if (params.query) searchParams.set('query', params.query);
    if (params.cuisine) searchParams.set('cuisine', params.cuisine);
    if (params.diet) searchParams.set('diet', params.diet);
    if (params.intolerances) searchParams.set('intolerances', params.intolerances);
    if (params.maxReadyTime) searchParams.set('maxReadyTime', String(params.maxReadyTime));
    
    const response = await fetch(
      `${BASE_URL}/recipes/complexSearch?${searchParams.toString()}`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results.map(convertRecipe);
  } catch (error) {
    console.warn('Error searching recipes:', error);
    return getFallbackRecipes();
  }
}

// Get recipe by ID with full details
export async function getRecipeById(id: string): Promise<Recipe | null> {
  try {
    const response = await fetch(
      `${BASE_URL}/recipes/${id}/information?apiKey=${SPOONACULAR_API_KEY}&includeNutrition=true`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return convertRecipe(data);
  } catch (error) {
    console.warn('Error fetching recipe:', error);
    return null;
  }
}

// ============ App Integration Functions ============

// Main function used by swipe screen
export async function getRecipes(count: number = 10): Promise<Recipe[]> {
  return fetchRandomRecipes(count);
}

// Cache a liked recipe (stored in memory for now)
const cachedRecipes: Recipe[] = [];
export async function cacheRecipe(recipe: Recipe): Promise<void> {
  if (!cachedRecipes.find(r => r.id === recipe.id)) {
    cachedRecipes.push(recipe);
  }
}

export function getCachedRecipes(): Recipe[] {
  return cachedRecipes;
}

// User preferences - loaded from AsyncStorage
export interface UserPreferences {
  avoidIngredients: string[];
  dietaryRestrictions: string[];
  allergies: string[];
}

// Allergy to ingredient mapping
const ALLERGY_INGREDIENTS: Record<string, string[]> = {
  'peanuts': ['peanut', 'peanuts', 'groundnut'],
  'tree-nuts': ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'macadamia', 'hazelnut', 'chestnut'],
  'shellfish': ['shrimp', 'crab', 'lobster', 'crawfish', 'prawn', 'scallop', 'clam', 'mussel', 'oyster'],
  'fish': ['salmon', 'tuna', 'cod', 'tilapia', 'halibut', 'trout', 'sardine', 'anchovy', 'bass', 'fish'],
  'eggs': ['egg', 'eggs', 'mayonnaise', 'meringue'],
  'milk': ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey', 'casein', 'dairy'],
  'soy': ['soy', 'soya', 'tofu', 'tempeh', 'edamame', 'miso'],
  'wheat': ['wheat', 'flour', 'bread', 'pasta', 'gluten', 'seitan'],
  'sesame': ['sesame', 'tahini'],
};

export async function getUserPreferences(): Promise<UserPreferences> {
  try {
    const stored = await AsyncStorage.getItem('userPreferences');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        avoidIngredients: parsed.avoidIngredients || [],
        dietaryRestrictions: parsed.dietaryRestrictions || [],
        allergies: parsed.allergies || [],
      };
    }
  } catch (error) {
    console.warn('Error loading preferences:', error);
  }
  return { avoidIngredients: [], dietaryRestrictions: [], allergies: [] };
}

export async function setUserPreferences(prefs: UserPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem('userPreferences', JSON.stringify(prefs));
  } catch (error) {
    console.warn('Error saving preferences:', error);
  }
}

// Filter recipes based on user preferences
export function filterRecipesByPreferences(recipes: Recipe[], prefs: UserPreferences): Recipe[] {
  if (prefs.avoidIngredients.length === 0 && prefs.allergies.length === 0) {
    return recipes;
  }
  
  // Build list of all ingredients to avoid (including allergy-related)
  const allAvoided = [...prefs.avoidIngredients];
  for (const allergy of prefs.allergies) {
    const allergyIngredients = ALLERGY_INGREDIENTS[allergy];
    if (allergyIngredients) {
      allAvoided.push(...allergyIngredients);
    }
  }
  
  return recipes.filter(recipe => {
    const ingredientText = recipe.ingredients.join(' ').toLowerCase();
    const nameAndDesc = (recipe.name + ' ' + recipe.description).toLowerCase();
    const fullText = ingredientText + ' ' + nameAndDesc;
    
    for (const avoid of allAvoided) {
      if (fullText.includes(avoid.toLowerCase())) {
        return false;
      }
    }
    return true;
  });
}

// ============ Fallback Data ============

// Fallback recipes when API fails
function getFallbackRecipes(): Recipe[] {
  return [
    {
      id: 'fallback-1',
      name: 'Classic Margherita Pizza',
      description: 'Fresh tomatoes, mozzarella, and basil on a crispy crust.',
      image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1200&q=85',
      prepTime: '20 min',
      cookTime: '15 min',
      servings: 4,
      difficulty: 'Easy',
      mealType: 'dinner',
      tags: ['Italian', 'Dinner'],
      ingredients: ['Pizza dough', 'San Marzano tomatoes', 'Fresh mozzarella', 'Fresh basil', 'Olive oil', 'Salt'],
      instructions: ['Preheat oven to 500°F', 'Roll out dough', 'Add sauce and cheese', 'Bake 12-15 minutes', 'Top with fresh basil'],
      nutrition: { calories: 285, protein: 12, carbs: 36, fat: 10 }
    },
    {
      id: 'fallback-2',
      name: 'Honey Garlic Salmon',
      description: 'Glazed salmon with a sweet and savory honey garlic sauce.',
      image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=1200&q=85',
      prepTime: '10 min',
      cookTime: '20 min',
      servings: 4,
      difficulty: 'Easy',
      mealType: 'dinner',
      tags: ['Seafood', 'Healthy', 'Quick'],
      ingredients: ['Salmon fillets', 'Honey', 'Garlic', 'Soy sauce', 'Butter', 'Lemon'],
      instructions: ['Mix honey, garlic, and soy sauce', 'Sear salmon', 'Add glaze and bake', 'Serve with lemon'],
      nutrition: { calories: 320, protein: 34, carbs: 18, fat: 12 }
    },
    {
      id: 'fallback-3',
      name: 'Vegetable Stir Fry',
      description: 'Crispy vegetables in a savory sauce, ready in minutes.',
      image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=1200&q=85',
      prepTime: '15 min',
      cookTime: '10 min',
      servings: 4,
      difficulty: 'Easy',
      mealType: 'dinner',
      tags: ['Vegetarian', 'Quick', 'Asian'],
      ingredients: ['Mixed vegetables', 'Soy sauce', 'Ginger', 'Garlic', 'Sesame oil', 'Rice'],
      instructions: ['Prep vegetables', 'Heat wok', 'Stir fry vegetables', 'Add sauce', 'Serve over rice'],
      nutrition: { calories: 180, protein: 6, carbs: 28, fat: 6 }
    },
    {
      id: 'fallback-4',
      name: 'Chicken Tikka Masala',
      description: 'Creamy, spiced tomato curry with tender chicken.',
      image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=1200&q=85',
      prepTime: '20 min',
      cookTime: '30 min',
      servings: 6,
      difficulty: 'Medium',
      mealType: 'dinner',
      tags: ['Indian', 'Curry', 'Dinner'],
      ingredients: ['Chicken breast', 'Yogurt', 'Tomato sauce', 'Cream', 'Garam masala', 'Ginger', 'Garlic'],
      instructions: ['Marinate chicken', 'Grill or pan-fry chicken', 'Make masala sauce', 'Combine and simmer', 'Serve with naan'],
      nutrition: { calories: 380, protein: 32, carbs: 14, fat: 22 }
    },
    {
      id: 'fallback-5',
      name: 'Classic Caesar Salad',
      description: 'Crisp romaine with creamy dressing and parmesan.',
      image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=1200&q=85',
      prepTime: '15 min',
      cookTime: '0 min',
      servings: 4,
      difficulty: 'Easy',
      mealType: 'lunch',
      tags: ['Salad', 'Quick', 'Lunch'],
      ingredients: ['Romaine lettuce', 'Caesar dressing', 'Parmesan', 'Croutons', 'Lemon', 'Anchovy'],
      instructions: ['Wash and chop lettuce', 'Make dressing', 'Toss salad', 'Top with croutons and parmesan'],
      nutrition: { calories: 220, protein: 8, carbs: 12, fat: 16 }
    }
  ];
}

// ============ COMMUNITY RECIPES INTEGRATION ============

import { getCommunityRecipes, type CommunityRecipe, recordEngagement } from './communityRecipeService';

/**
 * Convert a community recipe to the standard Recipe format
 */
export function convertCommunityRecipe(community: CommunityRecipe): Recipe & { isCommunity: true; creatorId: string } {
  return {
    id: `community-${community.id}`,
    name: community.name,
    description: community.description || `A community recipe by a MealSwipe creator.`,
    image: community.image_urls[0] || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=1200&q=85',
    prepTime: community.prep_time ? `${community.prep_time} min` : '15 min',
    cookTime: community.cook_time ? `${community.cook_time} min` : '30 min',
    servings: community.servings || 4,
    difficulty: getDifficultyFromTime(community.prep_time, community.cook_time),
    mealType: getMealTypeFromTags(community.tags),
    tags: [...community.tags, 'Community'],
    ingredients: community.ingredients?.map(i => 
      typeof i === 'string' ? i : `${i.amount} ${i.unit} ${i.name}`.trim()
    ) || [],
    instructions: community.instructions?.map(i =>
      typeof i === 'string' ? i : i.text
    ) || [],
    nutrition: community.calories ? {
      calories: community.calories,
      protein: Math.round(community.calories * 0.15 / 4), // estimate
      carbs: Math.round(community.calories * 0.45 / 4),
      fat: Math.round(community.calories * 0.35 / 9),
    } : undefined,
    // Community-specific fields
    isCommunity: true,
    creatorId: community.user_id,
  };
}

function getDifficultyFromTime(prepTime?: number, cookTime?: number): 'Easy' | 'Medium' | 'Hard' {
  const total = (prepTime || 15) + (cookTime || 30);
  if (total <= 30) return 'Easy';
  if (total <= 60) return 'Medium';
  return 'Hard';
}

function getMealTypeFromTags(tags: string[]): MealType {
  const tagsLower = tags.map(t => t.toLowerCase());
  if (tagsLower.some(t => t.includes('breakfast'))) return 'breakfast';
  if (tagsLower.some(t => t.includes('lunch'))) return 'lunch';
  if (tagsLower.some(t => t.includes('dinner'))) return 'dinner';
  if (tagsLower.some(t => t.includes('snack'))) return 'snack';
  if (tagsLower.some(t => t.includes('dessert'))) return 'dessert';
  if (tagsLower.some(t => t.includes('drink') || t.includes('cocktail'))) return 'drink';
  return 'dinner'; // default
}

/**
 * Fetch recipes with community recipes mixed in
 * @param count Total number of recipes to return
 * @param communityRatio Percentage of results that should be community recipes (0-1)
 */
export async function getRecipesWithCommunity(
  count: number = 30,
  communityRatio: number = 0.3
): Promise<Recipe[]> {
  const communityCount = Math.floor(count * communityRatio);
  const apiCount = count - communityCount;
  
  try {
    // Fetch both in parallel
    const [apiRecipes, communityRecipes] = await Promise.all([
      getRecipes(apiCount),
      getCommunityRecipes(communityCount),
    ]);

    // Convert community recipes to standard format
    const convertedCommunity = communityRecipes.map(convertCommunityRecipe);

    // Interleave: every 3rd recipe is from community
    const result: Recipe[] = [];
    let apiIdx = 0;
    let comIdx = 0;

    while (result.length < count && (apiIdx < apiRecipes.length || comIdx < convertedCommunity.length)) {
      // Add 2-3 API recipes
      for (let i = 0; i < 2 + Math.floor(Math.random() * 2) && apiIdx < apiRecipes.length; i++) {
        result.push(apiRecipes[apiIdx++]);
      }
      // Add 1 community recipe
      if (comIdx < convertedCommunity.length) {
        result.push(convertedCommunity[comIdx++]);
      }
    }

    return result;
  } catch (error) {
    console.warn('Error fetching mixed recipes:', error);
    return getRecipes(count); // Fallback to API only
  }
}

/**
 * Record that a user viewed a community recipe
 */
export async function recordRecipeView(recipeId: string): Promise<void> {
  if (recipeId.startsWith('community-')) {
    const actualId = recipeId.replace('community-', '');
    await recordEngagement(actualId, 'view');
  }
}

/**
 * Record that a user liked (swiped right on) a community recipe
 */
export async function recordRecipeLike(recipeId: string): Promise<void> {
  if (recipeId.startsWith('community-')) {
    const actualId = recipeId.replace('community-', '');
    await recordEngagement(actualId, 'like');
  }
}

/**
 * Record that a user added a community recipe to their meal plan
 */
export async function recordRecipeAddToPlan(recipeId: string): Promise<void> {
  if (recipeId.startsWith('community-')) {
    const actualId = recipeId.replace('community-', '');
    await recordEngagement(actualId, 'add_to_plan');
  }
}
