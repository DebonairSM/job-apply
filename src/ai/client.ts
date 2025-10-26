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
  let lastCleanedText = '';

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
      
      // Try to extract JSON (object or array) if there's surrounding text
      // Use a more sophisticated approach to handle nested braces/brackets
      let extractedJson = '';
      
      // Find both object and array starts to choose the one that appears first
      const objectStart = cleanedText.indexOf('{');
      const arrayStart = cleanedText.indexOf('[');
      
      // Prefer objects over arrays (most schemas expect objects)
      // But if array comes first, use that
      const useObject = objectStart !== -1 && (arrayStart === -1 || objectStart < arrayStart);
      
      if (useObject && objectStart !== -1) {
        // Extract object
        let depth = 0;
        let inString = false;
        let escapeNext = false;
        
        for (let i = objectStart; i < cleanedText.length; i++) {
          const char = cleanedText[i];
          
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          
          if (char === '\\') {
            escapeNext = true;
            continue;
          }
          
          if (char === '"') {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '{') depth++;
            if (char === '}') {
              depth--;
              if (depth === 0) {
                extractedJson = cleanedText.substring(objectStart, i + 1);
                break;
              }
            }
          }
        }
      } else if (arrayStart !== -1) {
        // Extract array
        let depth = 0;
        let inString = false;
        let escapeNext = false;
        
        for (let i = arrayStart; i < cleanedText.length; i++) {
          const char = cleanedText[i];
          
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          
          if (char === '\\') {
            escapeNext = true;
            continue;
          }
          
          if (char === '"') {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '[') depth++;
            if (char === ']') {
              depth--;
              if (depth === 0) {
                extractedJson = cleanedText.substring(arrayStart, i + 1);
                break;
              }
            }
          }
        }
      }
      
      // Use extracted JSON if found, otherwise use the whole cleaned text
      cleanedText = extractedJson || cleanedText;
      
      // Fix common JSON issues
      cleanedText = cleanedText.replace(/:\s*\+(\d+)/g, ': $1'); // Fix +0 -> 0
      cleanedText = cleanedText.replace(/:\s*\+(\d+\.\d+)/g, ': $1'); // Fix +0.5 -> 0.5
      
      // Fix unquoted or single-quoted property names
      // We need to handle three cases separately for reliability
      
      // Case 1: Single-quoted property names: 'name': value
      cleanedText = cleanedText.replace(/'([a-zA-Z_][a-zA-Z0-9_\s]*)'\s*:/g, (match, propName) => {
        const cleanPropName = propName.trim().replace(/\s+/g, '_');
        return `"${cleanPropName}":`;
      });
      
      // Case 2: Unquoted property names after { or ,
      // Matches: {name: or ,name: or { name: or , name:
      cleanedText = cleanedText.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_\s]*)\s*:/g, (match, prefix, propName) => {
        const cleanPropName = propName.trim().replace(/\s+/g, '_');
        return `${prefix}"${cleanPropName}":`;
      });
      
      // Fix single-quoted string values (convert to double quotes)
      // This is tricky because we need to avoid breaking already-valid JSON
      // Strategy: Replace single quotes with double quotes, but handle escaped quotes
      cleanedText = cleanedText.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, (match, content) => {
        // Unescape single quotes inside the string
        const unescaped = content.replace(/\\'/g, "'");
        // Escape double quotes inside the string
        const escaped = unescaped.replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      
      // Remove comments (both // and /* */ style)
      // Handle // comments (but be careful not to remove // inside strings)
      // Strategy: Split by newlines, remove comment portions, rejoin
      cleanedText = cleanedText.split('\n').map(line => {
        // Check if line has // comment
        const singleCommentIndex = line.indexOf('//');
        if (singleCommentIndex !== -1) {
          // Check if // is inside quotes
          const beforeComment = line.substring(0, singleCommentIndex);
          const quoteCount = (beforeComment.match(/"/g) || []).length;
          // If even number of quotes before //, it's not inside a string
          if (quoteCount % 2 === 0) {
            return line.substring(0, singleCommentIndex).trim();
          }
        }
        return line;
      }).join('\n');
      
      // Remove /* */ style comments
      cleanedText = cleanedText.replace(/\/\*[\s\S]*?\*\//g, '');
      
      cleanedText = cleanedText.trim();
      lastCleanedText = cleanedText;

      // Parse JSON
      let parsed = JSON.parse(cleanedText);
      
      // If we got an array with a single object, unwrap it
      // (LLM sometimes wraps the response in an array)
      if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0] === 'object') {
        parsed = parsed[0];
      }
      
      return parsed as T;

    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        // Silently retry without logging unless DEBUG is enabled
        if (process.env.DEBUG) {
          console.warn(`JSON parsing failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`);
          console.error('Parse error:', lastError.message);
          console.error('Raw response (first 500 chars):', lastResponse.substring(0, 500));
          console.error('Cleaned text (first 500 chars):', lastCleanedText.substring(0, 500) || 'N/A');
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        // On final attempt, log more details even without DEBUG
        console.error(`❌ LLM returned invalid JSON after ${maxRetries + 1} attempts`);
        console.error('Error:', lastError.message);
        console.error('Raw response (first 500 chars):', lastResponse.substring(0, 500));
        console.error('Cleaned text (first 500 chars):', lastCleanedText.substring(0, 500) || 'N/A');
        
        // If response is short enough, show the whole thing
        if (lastResponse.length < 1000) {
          console.error('\nFull raw response:');
          console.error(lastResponse);
          console.error('\nFull cleaned text:');
          console.error(lastCleanedText);
        }
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


