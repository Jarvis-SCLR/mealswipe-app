/**
 * Pre-generated AI images for fallback and local recipes
 * These are bundled with the app for offline-first experience
 */

// Import all generated images (Nano Banana Pro - photorealistic)
export const generatedImages: Record<string, any> = {
  'fallback-1': require('./fallback-1.jpg'),
  'fallback-2': require('./fallback-2.jpg'),
  'fallback-3': require('./fallback-3.jpg'),
  'fallback-4': require('./fallback-4.jpg'),
  'fallback-5': require('./fallback-5.jpg'),
  'local-1': require('./local-1.jpg'),
  'local-2': require('./local-2.jpg'),
  'local-3': require('./local-3.jpg'),
  'local-4': require('./local-4.jpg'),
  'local-5': require('./local-5.jpg'),
  'local-6': require('./local-6.jpg'),
};

/**
 * Get a pre-generated image by recipe ID
 * Returns the bundled image asset if available, otherwise undefined
 */
export function getGeneratedImage(recipeId: string): any | undefined {
  return generatedImages[recipeId];
}

/**
 * Check if a recipe has a pre-generated image
 */
export function hasGeneratedImage(recipeId: string): boolean {
  return recipeId in generatedImages;
}
