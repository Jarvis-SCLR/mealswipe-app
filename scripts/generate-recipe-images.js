#!/usr/bin/env node
/**
 * Recipe Image Generator
 * Generates AI images for all recipes and stores them permanently
 * 
 * Usage: GEMINI_API_KEY=xxx node scripts/generate-recipe-images.js
 */

const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Using Nano Banana Pro with simplified prompt for photorealism
const GEMINI_IMAGE_MODEL = 'nano-banana-pro-preview';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`;

// Output directory for generated images
const OUTPUT_DIR = path.join(__dirname, '../assets/generated-images');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');

// Rate limiting
const DELAY_BETWEEN_REQUESTS_MS = 2000;

// Sample recipes to generate images for (will be replaced with actual DB fetch)
const FALLBACK_RECIPES = [
  {
    id: 'fallback-1',
    name: 'Classic Margherita Pizza',
    description: 'Fresh tomatoes, mozzarella, and basil on a crispy crust.',
  },
  {
    id: 'fallback-2',
    name: 'Honey Garlic Salmon',
    description: 'Glazed salmon with a sweet and savory honey garlic sauce.',
  },
  {
    id: 'fallback-3',
    name: 'Vegetable Stir Fry',
    description: 'Crispy vegetables in a savory sauce, ready in minutes.',
  },
  {
    id: 'fallback-4',
    name: 'Chicken Tikka Masala',
    description: 'Creamy, spiced tomato curry with tender chicken.',
  },
  {
    id: 'fallback-5',
    name: 'Classic Caesar Salad',
    description: 'Crisp romaine with creamy dressing and parmesan.',
  },
  {
    id: 'local-1',
    name: 'Classic Margherita Pizza',
    description: 'Fresh tomatoes, mozzarella, and basil on a crispy crust.',
  },
  {
    id: 'local-2',
    name: 'Honey Garlic Salmon',
    description: 'Glazed salmon with a sweet and savory honey garlic sauce.',
  },
  {
    id: 'local-3',
    name: 'Thai Green Curry',
    description: 'Creamy coconut curry with vegetables and aromatic herbs.',
  },
  {
    id: 'local-4',
    name: 'Mediterranean Grain Bowl',
    description: 'Hearty quinoa bowl with feta, olives, and lemon dressing.',
  },
  {
    id: 'local-5',
    name: 'Spicy Korean Fried Chicken',
    description: 'Extra crispy chicken coated in gochujang glaze.',
  },
  {
    id: 'local-6',
    name: 'Creamy Tuscan Pasta',
    description: 'Sun-dried tomatoes and spinach in a garlic cream sauce.',
  },
];

// Unique styling for each recipe - different angles, surfaces, plates
const RECIPE_STYLES = {
  'fallback-1': { // Margherita Pizza
    angle: 'overhead flat lay',
    surface: 'rustic wooden pizza peel',
    lighting: 'dramatic side light with shadows',
    extra: 'charred crust edges, bubbling cheese, fresh basil scattered'
  },
  'fallback-2': { // Honey Garlic Salmon
    angle: '45 degree hero shot',
    surface: 'dark slate plate on black marble',
    lighting: 'moody window light from the left',
    extra: 'fork flaking the fish, glistening glaze, sesame seeds'
  },
  'fallback-3': { // Vegetable Stir Fry
    angle: 'slightly above, looking into wok',
    surface: 'carbon steel wok on gas burner',
    lighting: 'warm kitchen lighting with steam',
    extra: 'chopsticks lifting vegetables, visible flames'
  },
  'fallback-4': { // Chicken Tikka Masala
    angle: 'low angle, eye level with bowl',
    surface: 'hammered copper bowl on dark fabric',
    lighting: 'candlelit warm glow',
    extra: 'naan bread dipping in, cilantro garnish, cream swirl'
  },
  'fallback-5': { // Caesar Salad
    angle: 'overhead looking down',
    surface: 'large white ceramic bowl on marble',
    lighting: 'bright airy natural light',
    extra: 'parmesan being shaved over top, lemon wedge'
  },
  'local-1': { // Margherita Pizza (variant)
    angle: 'close-up slice pull with cheese stretch',
    surface: 'pizza on wooden board, checkered napkin',
    lighting: 'golden hour warm light',
    extra: 'melted mozzarella stretching, basil leaves'
  },
  'local-2': { // Honey Garlic Salmon (variant)
    angle: 'straight down overhead',
    surface: 'white rectangular plate on light wood',
    lighting: 'soft diffused daylight',
    extra: 'asparagus side, lemon slices, herb garnish'
  },
  'local-3': { // Thai Green Curry
    angle: '3/4 angle from front',
    surface: 'clay bowl on bamboo mat',
    lighting: 'natural window light, soft shadows',
    extra: 'jasmine rice in separate bowl, thai basil, red chilies floating'
  },
  'local-4': { // Mediterranean Grain Bowl
    angle: 'flat lay overhead',
    surface: 'speckled ceramic bowl on concrete',
    lighting: 'bright even lighting, minimal shadows',
    extra: 'ingredients in sections, tahini drizzle being poured'
  },
  'local-5': { // Korean Fried Chicken
    angle: 'close-up pile, eye level',
    surface: 'black stone plate, newspaper underneath',
    lighting: 'dramatic dark background, spotlight on food',
    extra: 'sticky sauce dripping, sesame seeds, pickled radish side'
  },
  'local-6': { // Creamy Tuscan Pasta
    angle: 'fork twirling pasta, mid-action',
    surface: 'shallow pasta bowl on rustic table',
    lighting: 'warm italian trattoria ambiance',
    extra: 'sun-dried tomatoes visible, parmesan shavings falling'
  }
};

function buildImagePrompt(name, description, recipeId) {
  const style = RECIPE_STYLES[recipeId] || {
    angle: '45 degree angle',
    surface: 'ceramic plate on wood',
    lighting: 'natural window light',
    extra: 'garnished beautifully'
  };
  
  return `Professional food photograph of ${name}. ${style.angle}. Served on ${style.surface}. ${style.lighting}. ${style.extra}. Tight crop filling frame. Shallow depth of field. Real photography not illustration.`;
}

async function generateImage(recipe) {
  const prompt = buildImagePrompt(recipe.name, recipe.description, recipe.id);
  
  console.log(`\n📸 Generating image for: ${recipe.name}`);
  
  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
          temperature: 0.4, // Lower temp for more realistic output
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API error for ${recipe.name}:`, errorText);
      return null;
    }

    const data = await response.json();
    const candidates = Array.isArray(data.candidates) ? data.candidates : [];

    for (const candidate of candidates) {
      const parts = candidate?.content?.parts || [];
      for (const part of parts) {
        const inlineData = part.inlineData || part.inline_data;
        const base64Data = inlineData?.data;
        if (base64Data) {
          const mimeType = inlineData?.mimeType || inlineData?.mime_type || 'image/png';
          const extension = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
          
          console.log(`✅ Generated image for ${recipe.name} (${mimeType})`);
          
          return {
            base64: base64Data,
            mimeType,
            extension,
          };
        }
      }
    }

    console.error(`❌ No image data in response for ${recipe.name}`);
    return null;
  } catch (error) {
    console.error(`❌ Error generating image for ${recipe.name}:`, error.message);
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY environment variable is required');
    process.exit(1);
  }

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created output directory: ${OUTPUT_DIR}`);
  }

  // Load existing manifest or create new one
  let manifest = {};
  if (fs.existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    console.log(`📋 Loaded existing manifest with ${Object.keys(manifest).length} entries`);
  }

  const recipes = FALLBACK_RECIPES;
  console.log(`\n🍽️  Processing ${recipes.length} recipes...\n`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const recipe of recipes) {
    // Skip if already generated
    if (manifest[recipe.id]) {
      console.log(`⏭️  Skipping ${recipe.name} (already generated)`);
      skipped++;
      continue;
    }

    const result = await generateImage(recipe);
    
    if (result) {
      // Save image file
      const filename = `${recipe.id}.${result.extension}`;
      const filepath = path.join(OUTPUT_DIR, filename);
      const buffer = Buffer.from(result.base64, 'base64');
      fs.writeFileSync(filepath, buffer);
      
      // Update manifest
      manifest[recipe.id] = {
        filename,
        mimeType: result.mimeType,
        generatedAt: new Date().toISOString(),
        recipeName: recipe.name,
      };
      
      // Save manifest after each successful generation
      fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
      
      generated++;
      console.log(`💾 Saved: ${filename}`);
    } else {
      failed++;
    }

    // Rate limiting
    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log(`\n✨ Done!`);
  console.log(`   Generated: ${generated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log(`\n📁 Images saved to: ${OUTPUT_DIR}`);
  console.log(`📋 Manifest saved to: ${MANIFEST_PATH}`);
}

main().catch(console.error);
