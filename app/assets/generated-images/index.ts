/**
 * Pre-generated AI images for fallback and local recipes
 * These are bundled with the app for offline-first experience
 */

// Import all generated images
export const generatedImages: Record<string, any> = {
  'fallback-1': require('./fallback-1.png'),
  'fallback-2': require('./fallback-2.png'),
  'fallback-3': require('./fallback-3.png'),
  'fallback-4': require('./fallback-4.png'),
  'fallback-5': require('./fallback-5.png'),
  'local-1': require('./local-1.png'),
  'local-2': require('./local-2.png'),
  'local-3': require('./local-3.png'),
  'local-4': require('./local-4.png'),
  'local-5': require('./local-5.png'),
  'local-6': require('./local-6.png'),
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
