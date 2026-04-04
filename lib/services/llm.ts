import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface LLMResponse {
  result: unknown;
  usedFallback: boolean;
}

export async function complete(
  systemPrompt: string,
  userPrompt: string,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    expectJson?: boolean;
  } = {}
): Promise<unknown> {
  const {
    model = 'gpt-4o',
    temperature = 0.2,
    maxTokens = 2000,
    expectJson = true,
  } = options;

  const modelsToTry = [model, 'gpt-4o-mini'];

  for (const m of modelsToTry) {
    try {
      const response = await openai.chat.completions.create({
        model: m,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: expectJson ? { type: 'json_object' } : undefined,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response');

      if (expectJson) {
        return JSON.parse(content);
      }
      return content;
    } catch (error) {
      console.warn(`LLM attempt failed with model ${m}:`, error);
      if (m === modelsToTry[modelsToTry.length - 1]) {
        throw error;
      }
    }
  }
}

export async function completeWithFallback(
  systemPrompt: string,
  userPrompt: string,
  fallbackValue: unknown,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    expectJson?: boolean;
  } = {}
): Promise<LLMResponse> {
  try {
    const result = await complete(systemPrompt, userPrompt, options);
    return { result, usedFallback: false };
  } catch (error) {
    console.error('LLM completeWithFallback: returning fallback. Error:', error);
    return { result: fallbackValue, usedFallback: true };
  }
}
