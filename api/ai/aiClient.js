import OpenAI from 'openai';

/**
 * Dynamically instantiates and returns the OpenAI client and model name.
 * 
 * @returns {{ client: OpenAI, model: string }}
 * @throws {Error} if OPENAI_API_KEY is missing
 */
export function getAiClient() {
  const openAiKey = process.env.OPENAI_API_KEY;

  if (!openAiKey) {
    throw new Error('OpenAI API Key is missing. Please configure OPENAI_API_KEY in your environment variables.');
  }

  return {
    client: new OpenAI({
      apiKey: openAiKey.trim(),
    }),
    model: 'gpt-4o-mini',
  };
}
