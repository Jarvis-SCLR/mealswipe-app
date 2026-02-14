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
  {
    id: 'local-7',
    name: 'Beef Tacos',
    description: 'Seasoned ground beef with fresh toppings in corn tortillas.',
  },
  {
    id: 'local-8',
    name: 'Lemon Herb Roasted Chicken',
    description: 'Juicy whole chicken with herbs and crispy golden skin.',
  },
];

// Close-up home cooking shots - fills the frame, homemade feel
const UNIQUE_PROMPTS = {
  'fallback-1': 'Extreme close-up homemade margherita pizza filling entire frame, bubbling mozzarella texture visible, fresh basil leaves, on a simple cutting board, home kitchen counter, natural window light',
  
  'fallback-2': 'Close-up pan-seared salmon fillet filling frame, crispy skin texture, honey garlic glaze glistening, on a regular dinner plate, home dining table, evening indoor lighting',
  
  'fallback-3': 'Close-up vegetable stir fry filling the frame, colorful peppers broccoli carrots, glistening with sauce, in a regular frying pan, home stovetop, steam rising',
  
  'fallback-4': 'Close-up homemade chicken curry filling frame, creamy orange sauce, chunks of tender chicken, in a regular bowl, kitchen table, warm home lighting',
  
  'fallback-5': 'Close-up fresh caesar salad filling frame, crisp romaine leaves, shaved parmesan, croutons, in a mixing bowl, kitchen counter, bright daylight',
  
  'local-1': 'Extreme close-up pizza slice, melted cheese and tomato sauce visible, held on a regular plate, casual home setting, soft lighting',
  
  'local-2': 'Close-up baked salmon on dinner plate filling frame, flaky fish texture, lemon wedge, steamed vegetables, wooden dining table at home',
  
  'local-3': 'Close-up green curry in a bowl filling frame, coconut milk broth, vegetables floating, served with rice, home kitchen table, natural light',
  
  'local-4': 'Close-up grain bowl from above filling frame, quinoa chickpeas vegetables feta, colorful ingredients, regular bowl, kitchen counter, daylight',
  
  'local-5': 'Close-up crispy fried chicken pieces filling frame, golden brown coating, sticky sauce, on a regular plate, home kitchen, casual lighting',
  
  'local-6': 'Close-up creamy pasta filling frame, fettuccine in sauce, sun dried tomatoes spinach, in a pasta bowl, home dinner table, cozy lighting',
  
  'local-7': 'Close-up beef tacos filling frame, seasoned ground beef in corn tortillas, fresh cilantro lime, diced onions, on a plate, home kitchen table, natural lighting',
  
  'local-8': 'Close-up roasted whole chicken filling frame, golden crispy skin, lemon slices herbs visible, in a roasting pan, home oven fresh, warm lighting'
};

function buildImagePrompt(name, description, recipeId) {
  const basePrompt = UNIQUE_PROMPTS[recipeId] || `${name}, appetizing food photo`;
  // Add portrait/vertical orientation for mobile card format
  return `${basePrompt}, vertical portrait orientation, tall format photo, 9:16 aspect ratio`;
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
          temperature: 0.4,
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

// Crop image to 9:16 portrait aspect ratio (center crop)
async function cropToPortrait(filepath) {
  const { execSync } = require('child_process');
  try {
    // Get current dimensions
    const widthOut = execSync(`sips -g pixelWidth "${filepath}" | grep pixelWidth | awk '{print $2}'`).toString().trim();
    const heightOut = execSync(`sips -g pixelHeight "${filepath}" | grep pixelHeight | awk '{print $2}'`).toString().trim();
    const width = parseInt(widthOut);
    const height = parseInt(heightOut);
    
    // Target 9:16 aspect ratio
    const targetRatio = 9 / 16;
    const currentRatio = width / height;
    
    let newWidth, newHeight, cropX, cropY;
    
    if (currentRatio > targetRatio) {
      // Image is too wide, crop width
      newHeight = height;
      newWidth = Math.round(height * targetRatio);
      cropX = Math.round((width - newWidth) / 2);
      cropY = 0;
    } else {
      // Image is too tall, crop height
      newWidth = width;
      newHeight = Math.round(width / targetRatio);
      cropX = 0;
      cropY = Math.round((height - newHeight) / 2);
    }
    
    // Crop using sips
    execSync(`sips -c ${newHeight} ${newWidth} "${filepath}" --out "${filepath}"`);
    console.log(`   📐 Cropped to 9:16 portrait (${newWidth}x${newHeight})`);
  } catch (error) {
    console.warn(`   ⚠️ Could not crop image: ${error.message}`);
  }
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
      
      // Crop to 9:16 portrait for mobile cards
      await cropToPortrait(filepath);
      
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
