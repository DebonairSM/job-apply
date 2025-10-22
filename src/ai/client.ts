import { loadConfig } from '../lib/session.js';

export interface OllamaOptions {
  model?: string;
  temperature?: number;
  retries?: number;
}

// Generic function to query Ollama with structured output
export async function askOllama<T>(
  prompt: string,
  schemaName: string,
  opts: OllamaOptions = {}
): Promise<T> {
  const config = loadConfig();
  const model = opts.model ?? config.llmModel;
  const temperature = opts.temperature ?? config.llmTemperature;
  const maxRetries = opts.retries ?? 1;

  const fullPrompt = `${prompt}\n\nReturn ONLY valid JSON for schema ${schemaName}. Do not include any explanatory text.`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          prompt: attempt === 0 ? fullPrompt : `The previous JSON was invalid. ${fullPrompt}`,
          options: {
            temperature
          },
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { response: string };
      const responseText = data.response;

      // Strip markdown code fences if present
      let cleanedText = responseText.trim();
      cleanedText = cleanedText.replace(/^```json\s*/i, '');
      cleanedText = cleanedText.replace(/^```\s*/i, '');
      cleanedText = cleanedText.replace(/\s*```$/i, '');
      cleanedText = cleanedText.trim();

      // Parse JSON
      const parsed = JSON.parse(cleanedText);
      return parsed as T;

    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        console.warn(`JSON parsing failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  throw new Error(`Failed to get valid JSON from Ollama after ${maxRetries + 1} attempts: ${lastError?.message}`);
}

// Check if Ollama is available
export async function checkOllamaHealth(): Promise<boolean> {
  const config = loadConfig();
  
  try {
    const response = await fetch(`${config.ollamaBaseUrl}/api/tags`, {
      method: 'GET'
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// List available models
export async function listModels(): Promise<string[]> {
  const config = loadConfig();
  
  try {
    const response = await fetch(`${config.ollamaBaseUrl}/api/tags`);
    if (!response.ok) return [];
    
    const data = await response.json() as { models?: Array<{ name: string }> };
    return (data.models || []).map((m) => m.name);
  } catch (error) {
    return [];
  }
}


