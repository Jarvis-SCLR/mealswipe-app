#!/usr/bin/env node
/**
 * Generate AI images for ALL recipes in constants/Recipes.ts
 * 
 * Usage: GEMINI_API_KEY=xxx node scripts/generate-all-recipe-images.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_IMAGE_MODEL = 'nano-banana-pro-preview';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`;

const OUTPUT_DIR = path.join(__dirname, '../assets/generated-images');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');

const DELAY_BETWEEN_REQUESTS_MS = 2500; // Slightly longer to avoid rate limits

// Extract recipes from constants/Recipes.ts
function extractRecipes() {
  const recipesPath = path.join(__dirname, '../app/constants/Recipes.ts');
  const content = fs.readFileSync(recipesPath, 'utf-8');
  
  const recipes = [];
  const regex = /{\s*id:\s*'(\d+)',\s*name:\s*'([^']+)',\s*description:\s*'([^']+)'/g;
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    recipes.push({
      id: match[1],
      name: match[2],
      description: match[3]
    });
  }
  
  return recipes;
}

// Varied backgrounds to avoid same-table look
const BACKGROUNDS = [
  'rustic wooden farmhouse table with soft window light',
  'marble kitchen countertop with pendant light above',
  'white ceramic tiles countertop with morning light',
  'dark slate surface with warm ambient lighting',
  'butcher block wood with natural daylight',
  'concrete textured surface with soft diffused light',
  'blue checkered picnic blanket outdoors grass',
  'woven bamboo placemat on white table',
  'red brick pattern backdrop with warm glow',
  'terracotta tiles with afternoon sun',
  'white linen tablecloth with candlelight ambiance',
  'black granite surface with dramatic side lighting',
  'weathered wood planks with garden view window',
  'stainless steel countertop with cool white light',
  'colorful mosaic tile surface with bohemian vibe',
  'light oak table with sheer curtains backlight',
  'vintage floral tablecloth with soft golden hour light',
  'polished copper surface with industrial kitchen lighting',
  'repurposed barn wood with exposed beam lighting',
  'clean white quartz countertop with bright overhead light',
];

function buildImagePrompt(recipe, index) {
  // Rotate through backgrounds based on index
  const background = BACKGROUNDS[index % BACKGROUNDS.length];
  return `Close-up ${recipe.name.toLowerCase()} filling frame, ${recipe.description.toLowerCase()}, on ${background}, vertical portrait orientation, 9:16 aspect ratio, professional food photography`;
}

async function generateImage(recipe, index) {
  const prompt = buildImagePrompt(recipe, index);
  console.log(`📸 Generating image for: ${recipe.name}`);
  
  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
          temperature: 0.4,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API error for ${recipe.name}:`, errorText.substring(0, 200));
      return null;
    }

    const data = await response.json();
    const candidates = Array.isArray(data.candidates) ? data.candidates : [];
    
    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || 'image/jpeg';
          const extension = mimeType.includes('png') ? 'png' : 'jpg';
          console.log(`✅ Generated image for ${recipe.name} (${mimeType})`);
          return {
            base64: part.inlineData.data,
            mimeType,
            extension
          };
        }
      }
    }
    
    console.warn(`⚠️ No image in response for ${recipe.name}`);
    return null;
  } catch (error) {
    console.error(`❌ Error generating ${recipe.name}:`, error.message);
    return null;
  }
}

function cropToPortrait(filepath) {
  try {
    const widthOut = execSync(`sips -g pixelWidth "${filepath}" | grep pixelWidth | awk '{print $2}'`).toString().trim();
    const heightOut = execSync(`sips -g pixelHeight "${filepath}" | grep pixelHeight | awk '{print $2}'`).toString().trim();
    const width = parseInt(widthOut);
    const height = parseInt(heightOut);
    
    const targetRatio = 9 / 16;
    const currentRatio = width / height;
    
    let newWidth, newHeight;
    
    if (currentRatio > targetRatio) {
      newHeight = height;
      newWidth = Math.round(height * targetRatio);
    } else {
      newWidth = width;
      newHeight = Math.round(width / targetRatio);
    }
    
    execSync(`sips -c ${newHeight} ${newWidth} "${filepath}" --out "${filepath}"`);
    console.log(`   📐 Cropped to 9:16 portrait (${newWidth}x${newHeight})`);
  } catch (error) {
    console.warn(`   ⚠️ Could not crop: ${error.message}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY environment variable required');
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load existing manifest
  let manifest = {};
  if (fs.existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  }

  // Extract all recipes
  const recipes = extractRecipes();
  console.log(`\n🍽️  Found ${recipes.length} recipes in constants/Recipes.ts\n`);

  // Check which ones already have images
  const toGenerate = recipes.filter(r => !manifest[r.id]);
  console.log(`📊 Already have: ${recipes.length - toGenerate.length}`);
  console.log(`📊 Need to generate: ${toGenerate.length}\n`);

  if (toGenerate.length === 0) {
    console.log('✅ All recipes already have images!');
    return;
  }

  let generated = 0;
  let failed = 0;

  for (let i = 0; i < toGenerate.length; i++) {
    const recipe = toGenerate[i];
    const result = await generateImage(recipe, parseInt(recipe.id) - 1);
    
    if (result) {
      const filename = `recipe-${recipe.id}.${result.extension}`;
      const filepath = path.join(OUTPUT_DIR, filename);
      const buffer = Buffer.from(result.base64, 'base64');
      fs.writeFileSync(filepath, buffer);
      
      // Crop to portrait
      cropToPortrait(filepath);
      
      // Update manifest
      manifest[recipe.id] = {
        filename,
        mimeType: result.mimeType,
        generatedAt: new Date().toISOString(),
        recipeName: recipe.name,
      };
      
      console.log(`💾 Saved: ${filename}\n`);
      generated++;
      
      // Save manifest after each image (in case of crash)
      fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    } else {
      failed++;
    }
    
    // Rate limiting
    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log(`\n✨ Done!`);
  console.log(`   Generated: ${generated}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total in manifest: ${Object.keys(manifest).length}`);
  console.log(`\n📁 Images saved to: ${OUTPUT_DIR}`);
}

main().catch(console.error);
