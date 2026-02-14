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
const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image'; // Gemini image generation model
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

function buildImagePrompt(name, description) {
  const cleanedDescription = description?.trim().replace(/\s+/g, ' ') || '';
  const detailLine = cleanedDescription ? `\nDish details: ${cleanedDescription}` : '';

  return `Create a high-resolution, photorealistic food photograph of "${name}".${detailLine}

Style requirements:
- Appetizing, restaurant-quality plating on a beautiful ceramic plate
- Warm, natural lighting with gentle highlights and soft shadows
- Shallow depth of field, crisp focus on the main dish
- Vibrant, true-to-life colors that make the food look delicious
- Professional food photography composition
- Clean, minimalist background (marble, wood, or neutral surface)
- No people, no text, no watermark, no logos
- Overhead or 3/4 angle showing the best view of the dish
- Include appropriate garnishes and props (herbs, utensils, ingredients)`;
}

async function generateImage(recipe) {
  const prompt = buildImagePrompt(recipe.name, recipe.description);
  
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
          temperature: 0.8,
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
