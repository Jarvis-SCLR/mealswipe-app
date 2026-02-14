import { VercelRequest, VercelResponse } from '@vercel/node';
import { generateGeminiImage } from '../geminiImages';

interface ImageRequestBody {
  name: string;
  description: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, description } = req.body as ImageRequestBody;

  if (!name || !description) {
    return res.status(400).json({ error: 'Recipe name and description are required' });
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GOOGLE_AI_API_KEY' });
  }

  try {
    const result = await generateGeminiImage(apiKey, { name, description });

    if (!result) {
      return res.status(502).json({ error: 'Image generation failed' });
    }

    return res.status(200).json({
      imageUrl: result.dataUrl,
      mimeType: result.mimeType,
    });
  } catch (error) {
    console.error('Gemini image generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
