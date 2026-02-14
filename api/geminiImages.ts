export const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';
const GEMINI_IMAGE_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`;

export interface GeminiImageRequest {
  name: string;
  description: string;
}

export interface GeminiImageResult {
  base64Data: string;
  mimeType: string;
  dataUrl: string;
}

export function buildRecipeImagePrompt(name: string, description: string): string {
  const cleanedDescription = description?.trim().replace(/\s+/g, ' ');
  const detailLine = cleanedDescription ? `\nDish details: ${cleanedDescription}` : '';

  return `Create a high-resolution, photorealistic food photograph of "${name}".${detailLine}

Style requirements:
- appetizing, restaurant-quality plating
- warm, natural lighting with gentle highlights
- shallow depth of field, crisp focus on the hero bite
- vibrant, true-to-life colors
- no people, no text, no watermark, no logos
- overhead or 3/4 angle on a neutral tabletop`;
}

export async function generateGeminiImage(
  apiKey: string,
  recipe: GeminiImageRequest
): Promise<GeminiImageResult | null> {
  const prompt = buildRecipeImagePrompt(recipe.name, recipe.description);

  const response = await fetch(GEMINI_IMAGE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini image API error:', errorText);
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
        return {
          base64Data,
          mimeType,
          dataUrl: `data:${mimeType};base64,${base64Data}`,
        };
      }
    }
  }

  console.error('Gemini image API returned no image data');
  return null;
}
