import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Prioritize high-availability models with instant latency and automatic fallback
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
];

export async function generateContentWithFallback(prompt: string): Promise<string> {
  let lastError: unknown;

  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });

        if (response && response.text) {
          return response.text;
        }
      } catch (error: unknown) {
        lastError = error;
        const err = error as { status?: number; message?: string };
        const isTransient =
          err?.status === 503 ||
          err?.status === 429 ||
          err?.message?.includes('503') ||
          err?.message?.includes('high demand') ||
          err?.message?.includes('overloaded');

        if (isTransient) {
          console.warn(`[Gemini API] Model ${model} returned transient error (${err.status || '503'}). Attempt ${attempt + 1}/2.`);
          if (attempt === 0) {
            // Short delay before second attempt on same model
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          // After 2 attempts on this model, break to try next fallback model
          break;
        }

        // If not a transient overload error, break and try next candidate
        console.warn(`[Gemini API] Model ${model} failed with non-transient error:`, err?.message || error);
        break;
      }
    }
  }

  throw lastError || new Error('All Gemini models failed to generate content');
}
