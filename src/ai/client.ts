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
  const maxRetries = opts.retries ?? 2;

  const fullPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON for schema ${schemaName}. Do not include markdown code blocks, explanatory text, or any other formatting. Output must be pure JSON starting with { and ending with }.`;

  let lastError: Error | null = null;
  let lastResponse = '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 180 second timeout (3 minutes)
      
      const response = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          prompt: attempt === 0 ? fullPrompt : `The previous attempt generated invalid JSON. Try again.\n\n${fullPrompt}\n\nRemember: Output ONLY valid JSON, nothing else.`,
          options: {
            temperature: attempt > 0 ? 0.0 : temperature  // Use zero temp on retries for consistency
          },
          stream: false
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { response: string };
      const responseText = data.response;
      lastResponse = responseText;

      // Strip markdown code fences and any leading/trailing text
      let cleanedText = responseText.trim();
      
      // Remove markdown code blocks
      cleanedText = cleanedText.replace(/^```json\s*/gim, '');
      cleanedText = cleanedText.replace(/^```\s*/gim, '');
      cleanedText = cleanedText.replace(/\s*```$/gim, '');
      
      // Try to extract JSON object if there's surrounding text
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }
      
      cleanedText = cleanedText.trim();

      // Parse JSON
      const parsed = JSON.parse(cleanedText);
      return parsed as T;

    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        // Silently retry without logging unless DEBUG is enabled
        if (process.env.DEBUG) {
          console.warn(`JSON parsing failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`);
          console.error('Parse error:', lastError.message);
          console.error('Raw response:', lastResponse.substring(0, 500));
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  const errorMessage = `Failed to get valid JSON from Ollama after ${maxRetries + 1} attempts: ${lastError?.message}`;
  
  // Log error to database if we have a job context
  if (process.env.JOB_ID) {
    try {
      const { logRun } = await import('../lib/db.js');
      logRun({
        job_id: process.env.JOB_ID,
        step: 'ollama_json_parse',
        ok: false,
        log: errorMessage
      });
    } catch (dbError) {
      // Don't let database logging errors interfere with the main error
      console.error('Failed to log Ollama error to database:', dbError);
    }
  }
  
  throw new Error(errorMessage);
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


