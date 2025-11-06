import { loadTechnicalConfig } from '../lib/session.js';

// Timeout for LLM requests (30 seconds)
const LLM_REQUEST_TIMEOUT_MS = 30000;

// Timeout for health checks (5 seconds)
const HEALTH_CHECK_TIMEOUT_MS = 5000;

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

// Cache for Ollama health status (avoid checking too frequently)
let ollamaHealthStatus: { isHealthy: boolean; lastChecked: number } = {
  isHealthy: true,
  lastChecked: 0,
};
const HEALTH_CHECK_CACHE_MS = 30000; // Cache health status for 30 seconds

/**
 * Create an AbortController that times out after specified milliseconds
 */
function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if Ollama is available and responsive
 * Uses cached result to avoid checking too frequently
 */
export async function isOllamaHealthy(): Promise<boolean> {
  const now = Date.now();
  
  // Return cached status if recent
  if (now - ollamaHealthStatus.lastChecked < HEALTH_CHECK_CACHE_MS) {
    return ollamaHealthStatus.isHealthy;
  }
  
  const config = loadTechnicalConfig();
  
  try {
    const response = await fetch(`${config.ollamaBaseUrl}/api/tags`, {
      method: 'GET',
      signal: createTimeoutSignal(HEALTH_CHECK_TIMEOUT_MS),
    });
    
    ollamaHealthStatus = {
      isHealthy: response.ok,
      lastChecked: now,
    };
    
    return response.ok;
  } catch (error) {
    console.warn('Ollama health check failed:', error instanceof Error ? error.message : String(error));
    ollamaHealthStatus = {
      isHealthy: false,
      lastChecked: now,
    };
    return false;
  }
}

/**
 * Mark Ollama as unhealthy (useful when operations fail repeatedly)
 */
export function markOllamaUnhealthy(): void {
  ollamaHealthStatus = {
    isHealthy: false,
    lastChecked: Date.now(),
  };
}

/**
 * Mark Ollama as healthy (useful when operations succeed)
 */
export function markOllamaHealthy(): void {
  ollamaHealthStatus = {
    isHealthy: true,
    lastChecked: Date.now(),
  };
}

export interface OllamaGenerateOptions {
  model?: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  timeout?: number;
  retries?: number;
}

export interface OllamaGenerateResponse {
  response: string;
}

/**
 * Call Ollama API with timeout and retry logic
 * Returns the generated text on success, or throws an error on failure
 */
export async function generateWithOllama(
  prompt: string,
  options: OllamaGenerateOptions = {}
): Promise<string> {
  const config = loadTechnicalConfig();
  const model = options.model || config.llmModel;
  const temperature = options.temperature ?? 0.7;
  const timeout = options.timeout || LLM_REQUEST_TIMEOUT_MS;
  const maxRetries = options.retries ?? MAX_RETRIES;

  // Check if Ollama is healthy before attempting generation
  const isHealthy = await isOllamaHealthy();
  if (!isHealthy) {
    throw new Error('Ollama is not available');
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Wait before retrying (exponential backoff)
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt - 1));
        console.log(`Retrying Ollama request (attempt ${attempt + 1}/${maxRetries + 1})...`);
      }

      // Call Ollama API with timeout
      const response = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            temperature,
            top_p: options.top_p,
            top_k: options.top_k,
          },
        }),
        signal: createTimeoutSignal(timeout),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as OllamaGenerateResponse;
      const generated = data.response?.trim() || '';

      if (!generated) {
        throw new Error('Empty response from LLM');
      }

      // Mark Ollama as healthy since we got a successful response
      markOllamaHealthy();

      return generated;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if this is an abort (timeout) error
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`Ollama request timed out after ${timeout}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      } else if (error instanceof TypeError && error.message === 'fetch failed') {
        console.warn(`Ollama connection failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error.message);
      } else {
        console.warn(`Error calling Ollama (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
      }

      // Don't retry if this is the last attempt
      if (attempt === maxRetries) {
        break;
      }
    }
  }

  // All retries failed, mark Ollama as unhealthy
  console.error('All Ollama request attempts failed');
  console.error('Last error:', lastError);
  markOllamaUnhealthy();

  throw new Error(`Ollama request failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
}

