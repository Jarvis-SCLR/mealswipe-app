import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * AI Recipe Completion Endpoint
 * Uses Claude/Gemini vision to complete recipe details from photos
 */

interface RecipeCompletionRequest {
  name: string;
  imageUrls: string[];
  partialIngredients?: string[];
}

interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

interface Instruction {
  step_number: number;
  text: string;
}

interface RecipeCompletion {
  description: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  tags: string[];
  prep_time: number;
  cook_time: number;
  calories: number;
  servings: number;
}

// Common recipe tags for categorization
const RECIPE_TAGS = [
  'Quick', 'Healthy', 'Comfort Food', 'Vegetarian', 'Vegan',
  'Keto', 'Gluten-Free', 'Dairy-Free', 'Spicy', 'Kid-Friendly',
  'Budget', 'Meal Prep', 'One-Pot', 'Air Fryer', 'Instant Pot',
  'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert',
  'Italian', 'Mexican', 'Asian', 'Mediterranean', 'American',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, imageUrls, partialIngredients } = req.body as RecipeCompletionRequest;

  if (!name) {
    return res.status(400).json({ error: 'Recipe name is required' });
  }

  try {
    // Try Claude first, fall back to Gemini, then to heuristics
    let completion: RecipeCompletion | null = null;

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey = process.env.GOOGLE_AI_API_KEY;

    if (anthropicKey && imageUrls?.length > 0) {
      completion = await completeWithClaude(anthropicKey, name, imageUrls, partialIngredients);
    } else if (geminiKey && imageUrls?.length > 0) {
      completion = await completeWithGemini(geminiKey, name, imageUrls, partialIngredients);
    }

    // Fall back to heuristic completion if AI unavailable
    if (!completion) {
      completion = generateHeuristicCompletion(name, partialIngredients);
    }

    return res.status(200).json(completion);
  } catch (error) {
    console.error('AI completion error:', error);
    // Return heuristic fallback on any error
    const fallback = generateHeuristicCompletion(name, partialIngredients);
    return res.status(200).json(fallback);
  }
}

async function completeWithClaude(
  apiKey: string,
  name: string,
  imageUrls: string[],
  partialIngredients?: string[]
): Promise<RecipeCompletion | null> {
  try {
    // Fetch first image as base64
    const imageResponse = await fetch(imageUrls[0]);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mediaType = imageUrls[0].includes('.png') ? 'image/png' : 'image/jpeg';

    const prompt = buildPrompt(name, partialIngredients);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Claude API error:', await response.text());
      return null;
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    
    return parseAIResponse(text, name, partialIngredients);
  } catch (error) {
    console.error('Claude completion failed:', error);
    return null;
  }
}

async function completeWithGemini(
  apiKey: string,
  name: string,
  imageUrls: string[],
  partialIngredients?: string[]
): Promise<RecipeCompletion | null> {
  try {
    // Fetch first image as base64
    const imageResponse = await fetch(imageUrls[0]);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageUrls[0].includes('.png') ? 'image/png' : 'image/jpeg';

    const prompt = buildPrompt(name, partialIngredients);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType, data: base64Image } },
                { text: prompt },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      console.error('Gemini API error:', await response.text());
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return parseAIResponse(text, name, partialIngredients);
  } catch (error) {
    console.error('Gemini completion failed:', error);
    return null;
  }
}

function buildPrompt(name: string, partialIngredients?: string[]): string {
  return `Analyze this food photo and complete the recipe details.

Recipe name: ${name}
${partialIngredients?.length ? `Known ingredients: ${partialIngredients.join(', ')}` : ''}

Return a JSON object with these exact fields:
{
  "description": "2-3 sentence appetizing description",
  "ingredients": [{"name": "ingredient", "amount": "1", "unit": "cup"}],
  "instructions": [{"step_number": 1, "text": "Step description"}],
  "tags": ["tag1", "tag2"],
  "prep_time": 15,
  "cook_time": 30,
  "calories": 400,
  "servings": 4
}

Be specific with ingredient amounts. Tags should be from: ${RECIPE_TAGS.slice(0, 10).join(', ')}.
Return ONLY valid JSON, no markdown or extra text.`;
}

function parseAIResponse(
  text: string,
  name: string,
  partialIngredients?: string[]
): RecipeCompletion | null {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate and sanitize
    return {
      description: String(parsed.description || `A delicious ${name} recipe.`),
      ingredients: Array.isArray(parsed.ingredients) 
        ? parsed.ingredients.map((i: any) => ({
            name: String(i.name || ''),
            amount: String(i.amount || '1'),
            unit: String(i.unit || 'serving'),
          }))
        : [],
      instructions: Array.isArray(parsed.instructions)
        ? parsed.instructions.map((i: any, idx: number) => ({
            step_number: Number(i.step_number) || idx + 1,
            text: String(i.text || ''),
          }))
        : [],
      tags: Array.isArray(parsed.tags) 
        ? parsed.tags.filter((t: string) => RECIPE_TAGS.includes(t)).slice(0, 5)
        : ['Homemade'],
      prep_time: Number(parsed.prep_time) || 15,
      cook_time: Number(parsed.cook_time) || 30,
      calories: Number(parsed.calories) || 350,
      servings: Number(parsed.servings) || 4,
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return null;
  }
}

function generateHeuristicCompletion(
  name: string,
  partialIngredients?: string[]
): RecipeCompletion {
  // Detect cuisine/type from name
  const nameLower = name.toLowerCase();
  const tags: string[] = ['Homemade'];
  let prepTime = 15;
  let cookTime = 30;
  let calories = 400;

  // Tag detection
  if (nameLower.includes('pasta') || nameLower.includes('spaghetti')) {
    tags.push('Italian', 'Dinner');
  }
  if (nameLower.includes('taco') || nameLower.includes('burrito') || nameLower.includes('mexican')) {
    tags.push('Mexican', 'Dinner');
  }
  if (nameLower.includes('salad')) {
    tags.push('Healthy', 'Quick');
    prepTime = 10;
    cookTime = 0;
    calories = 200;
  }
  if (nameLower.includes('soup') || nameLower.includes('stew')) {
    tags.push('Comfort Food', 'Dinner');
    cookTime = 45;
  }
  if (nameLower.includes('chicken')) {
    tags.push('Dinner');
    calories = 350;
  }
  if (nameLower.includes('quick') || nameLower.includes('easy')) {
    tags.push('Quick');
    prepTime = 10;
    cookTime = 15;
  }

  // Build ingredients from partial or generate defaults
  const ingredients: Ingredient[] = partialIngredients?.length
    ? partialIngredients.map(ing => ({
        name: ing,
        amount: '1',
        unit: 'serving',
      }))
    : [
        { name: 'Main ingredient', amount: '1', unit: 'lb' },
        { name: 'Olive oil', amount: '2', unit: 'tbsp' },
        { name: 'Salt', amount: '1', unit: 'tsp' },
        { name: 'Pepper', amount: '1/2', unit: 'tsp' },
      ];

  return {
    description: `A delicious homemade ${name}. Perfect for any occasion!`,
    ingredients,
    instructions: [
      { step_number: 1, text: 'Gather and prepare all ingredients.' },
      { step_number: 2, text: `Prepare the ${name} according to your preferred method.` },
      { step_number: 3, text: 'Serve hot and enjoy!' },
    ],
    tags: tags.slice(0, 4),
    prep_time: prepTime,
    cook_time: cookTime,
    calories,
    servings: 4,
  };
}
