import { hasGeneratedImage } from '../assets/generated-images';

const imageCache = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<string>>();
const DATA_URL_PREFIX = 'data:image';
const BUNDLED_IMAGE_PREFIX = 'bundled://';
const DEFAULT_DESCRIPTION_FALLBACK = 'A delicious recipe.';
const MAX_GENERATION_ATTEMPTS = 3;
const RETRY_BASE_MS = 600;
const REQUEST_TIMEOUT_MS = 15000;

const generationStats = {
  success: 0,
  failed: 0,
  skipped: 0,
};

export interface RecipeImageTarget {
  id: string;
  name: string;
  description?: string;
  image?: string;
}

function normalizeDescription(description?: string) {
  const cleaned = description?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : DEFAULT_DESCRIPTION_FALLBACK;
}

function getCacheKey(recipe: Pick<RecipeImageTarget, 'id' | 'name' | 'description'>) {
  return `${recipe.id}::${recipe.name}::${normalizeDescription(recipe.description)}`;
}

function logImageGeneration(event: 'success' | 'failed' | 'skipped', details: Record<string, unknown>) {
  if (event === 'success') generationStats.success += 1;
  if (event === 'failed') generationStats.failed += 1;
  if (event === 'skipped') generationStats.skipped += 1;

  console.info('[image-generation]', {
    event,
    ...details,
    stats: { ...generationStats },
  });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(input: RequestInfo, init: RequestInit, timeoutMs: number) {
  const timeoutPromise = new Promise<Response>((_, reject) => {
    const timer = setTimeout(() => {
      clearTimeout(timer);
      reject(new Error('Request timed out'));
    }, timeoutMs);
  });
  return Promise.race([fetch(input, init), timeoutPromise]);
}

export async function getGeneratedRecipeImage(
  recipe: Pick<RecipeImageTarget, 'id' | 'name' | 'description' | 'image'>
): Promise<string> {
  // Check for bundled pre-generated images first
  if (hasGeneratedImage(recipe.id)) {
    const bundledUrl = `${BUNDLED_IMAGE_PREFIX}${recipe.id}`;
    logImageGeneration('skipped', { reason: 'bundled-image', recipeId: recipe.id });
    return bundledUrl;
  }

  if (recipe.image?.startsWith(DATA_URL_PREFIX) || recipe.image?.startsWith(BUNDLED_IMAGE_PREFIX)) {
    logImageGeneration('skipped', { reason: 'already-generated', recipeId: recipe.id });
    return recipe.image;
  }

  const cacheKey = getCacheKey(recipe);
  const cached = imageCache.get(cacheKey);
  if (cached) {
    logImageGeneration('skipped', { reason: 'cache-hit', recipeId: recipe.id });
    return cached;
  }

  const existingRequest = inFlightRequests.get(cacheKey);
  if (existingRequest) {
    return existingRequest;
  }

  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://api-hazel-seven-66.vercel.app';
  const description = normalizeDescription(recipe.description);

  const requestPromise = (async () => {
    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
      try {
        const response = await fetchWithTimeout(
          `${apiUrl}/api/ai-generate-image`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: recipe.name, description }),
          },
          REQUEST_TIMEOUT_MS
        );

        if (response.ok) {
          const data = await response.json();
          if (data?.imageUrl) {
            imageCache.set(cacheKey, data.imageUrl);
            logImageGeneration('success', {
              recipeId: recipe.id,
              attempt,
            });
            return data.imageUrl as string;
          }
        }

        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          logImageGeneration('failed', {
            recipeId: recipe.id,
            attempt,
            status: response.status,
            reason: 'non-retryable',
          });
          break;
        }

        logImageGeneration('failed', {
          recipeId: recipe.id,
          attempt,
          status: response.status,
          reason: 'retryable',
        });
      } catch (error) {
        logImageGeneration('failed', {
          recipeId: recipe.id,
          attempt,
          reason: error instanceof Error ? error.message : 'unknown',
        });
      }

      if (attempt < MAX_GENERATION_ATTEMPTS) {
        await sleep(RETRY_BASE_MS * attempt);
      }
    }

    return recipe.image || '';
  })();

  inFlightRequests.set(cacheKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

export async function applyGeneratedImages<T extends RecipeImageTarget>(recipes: T[]): Promise<T[]> {
  const results = await Promise.all(
    recipes.map(async recipe => {
      const image = await getGeneratedRecipeImage(recipe);
      return { ...recipe, image };
    })
  );

  return results;
}
