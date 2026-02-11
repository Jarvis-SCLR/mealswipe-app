// Spoonacular API Service
// 150 points/day free tier - each random recipe = 1 point

import AsyncStorage from '@react-native-async-storage/async-storage';

const SPOONACULAR_API_KEY = '40dfd38b55ea4c108a0318e420ff8e42';
const BASE_URL = 'https://api.spoonacular.com';

export interface Recipe {
  id: string;
  name: string;
  description: string;
  image: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
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
  // Strip HTML from summary
  const description = spoon.summary
    ?.replace(/<[^>]*>/g, '')
    .split('.')[0] + '.' || 'A delicious recipe to try!';
  
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
  
  return {
    id: String(spoon.id),
    name: spoon.title,
    description,
    image: imageUrl,
    prepTime: `${Math.max(5, Math.floor(spoon.readyInMinutes * 0.3))} min`,
    cookTime: `${Math.ceil(spoon.readyInMinutes * 0.7)} min`,
    servings: spoon.servings || 4,
    difficulty,
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
      image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800',
      prepTime: '20 min',
      cookTime: '15 min',
      servings: 4,
      difficulty: 'Easy',
      tags: ['Italian', 'Dinner'],
      ingredients: ['Pizza dough', 'San Marzano tomatoes', 'Fresh mozzarella', 'Fresh basil', 'Olive oil', 'Salt'],
      instructions: ['Preheat oven to 500°F', 'Roll out dough', 'Add sauce and cheese', 'Bake 12-15 minutes', 'Top with fresh basil'],
      nutrition: { calories: 285, protein: 12, carbs: 36, fat: 10 }
    },
    {
      id: 'fallback-2',
      name: 'Honey Garlic Salmon',
      description: 'Glazed salmon with a sweet and savory honey garlic sauce.',
      image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
      prepTime: '10 min',
      cookTime: '20 min',
      servings: 4,
      difficulty: 'Easy',
      tags: ['Seafood', 'Healthy', 'Quick'],
      ingredients: ['Salmon fillets', 'Honey', 'Garlic', 'Soy sauce', 'Butter', 'Lemon'],
      instructions: ['Mix honey, garlic, and soy sauce', 'Sear salmon', 'Add glaze and bake', 'Serve with lemon'],
      nutrition: { calories: 320, protein: 34, carbs: 18, fat: 12 }
    },
    {
      id: 'fallback-3',
      name: 'Vegetable Stir Fry',
      description: 'Crispy vegetables in a savory sauce, ready in minutes.',
      image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800',
      prepTime: '15 min',
      cookTime: '10 min',
      servings: 4,
      difficulty: 'Easy',
      tags: ['Vegetarian', 'Quick', 'Asian'],
      ingredients: ['Mixed vegetables', 'Soy sauce', 'Ginger', 'Garlic', 'Sesame oil', 'Rice'],
      instructions: ['Prep vegetables', 'Heat wok', 'Stir fry vegetables', 'Add sauce', 'Serve over rice'],
      nutrition: { calories: 180, protein: 6, carbs: 28, fat: 6 }
    },
    {
      id: 'fallback-4',
      name: 'Chicken Tikka Masala',
      description: 'Creamy, spiced tomato curry with tender chicken.',
      image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800',
      prepTime: '20 min',
      cookTime: '30 min',
      servings: 6,
      difficulty: 'Medium',
      tags: ['Indian', 'Curry', 'Dinner'],
      ingredients: ['Chicken breast', 'Yogurt', 'Tomato sauce', 'Cream', 'Garam masala', 'Ginger', 'Garlic'],
      instructions: ['Marinate chicken', 'Grill or pan-fry chicken', 'Make masala sauce', 'Combine and simmer', 'Serve with naan'],
      nutrition: { calories: 380, protein: 32, carbs: 14, fat: 22 }
    },
    {
      id: 'fallback-5',
      name: 'Classic Caesar Salad',
      description: 'Crisp romaine with creamy dressing and parmesan.',
      image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=800',
      prepTime: '15 min',
      cookTime: '0 min',
      servings: 4,
      difficulty: 'Easy',
      tags: ['Salad', 'Quick', 'Lunch'],
      ingredients: ['Romaine lettuce', 'Caesar dressing', 'Parmesan', 'Croutons', 'Lemon', 'Anchovy'],
      instructions: ['Wash and chop lettuce', 'Make dressing', 'Toss salad', 'Top with croutons and parmesan'],
      nutrition: { calories: 220, protein: 8, carbs: 12, fat: 16 }
    }
  ];
}
