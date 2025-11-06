/**
 * Integration test to verify JSON parsing handles real-world LLM responses
 * These patterns were causing "Expected ',' or ']' after array element" errors
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// Simulate the full JSON cleaning pipeline from client.ts
function simulateJsonCleaning(responseText: string): string {
  let cleanedText = responseText.trim();
  
  // Remove markdown code blocks
  cleanedText = cleanedText.replace(/^```json\s*/gim, '');
  cleanedText = cleanedText.replace(/^```\s*/gim, '');
  cleanedText = cleanedText.replace(/\s*```$/gim, '');
  
  // Extract JSON object or array
  let extractedJson = '';
  const objectStart = cleanedText.indexOf('{');
  const arrayStart = cleanedText.indexOf('[');
  const useObject = objectStart !== -1 && (arrayStart === -1 || objectStart < arrayStart);
  
  if (useObject && objectStart !== -1) {
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
  }
  
  cleanedText = extractedJson || cleanedText;
  
  // Fix common issues
  cleanedText = cleanedText.replace(/:\s*\+(\d+)/g, ': $1');
  cleanedText = cleanedText.replace(/:\s*\+(\d+\.\d+)/g, ': $1');
  
  // Fix array elements using the new robust logic
  cleanedText = fixArrayElements(cleanedText);
  
  // Fix property names
  cleanedText = cleanedText.replace(/'([a-zA-Z_][a-zA-Z0-9_\s]*)'\s*:/g, (match, propName) => {
    const cleanPropName = propName.trim().replace(/\s+/g, '_');
    return `"${cleanPropName}":`;
  });
  
  cleanedText = cleanedText.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_\s]*)\s*:/g, (match, prefix, propName) => {
    const cleanPropName = propName.trim().replace(/\s+/g, '_');
    return `${prefix}"${cleanPropName}":`;
  });
  
  // Fix single-quoted values
  cleanedText = cleanedText.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, (match, content) => {
    const unescaped = content.replace(/\\'/g, "'");
    const escaped = unescaped.replace(/"/g, '\\"');
    return `"${escaped}"`;
  });
  
  // Remove comments
  cleanedText = cleanedText.split('\n').map(line => {
    const singleCommentIndex = line.indexOf('//');
    if (singleCommentIndex !== -1) {
      const beforeComment = line.substring(0, singleCommentIndex);
      const quoteCount = (beforeComment.match(/"/g) || []).length;
      if (quoteCount % 2 === 0) {
        return line.substring(0, singleCommentIndex).trim();
      }
    }
    return line;
  }).join('\n');
  
  cleanedText = cleanedText.replace(/\/\*[\s\S]*?\*\//g, '');
  cleanedText = cleanedText.trim();
  
  return cleanedText;
}

// Import the array fixing functions from the unit test
function fixArrayElements(jsonText: string): string {
  let result = '';
  let i = 0;
  
  while (i < jsonText.length) {
    const char = jsonText[i];
    
    if (char === '[') {
      const arrayResult = processArray(jsonText, i);
      
      if (arrayResult) {
        result += arrayResult.fixed;
        i = arrayResult.endIndex + 1;
        continue;
      }
    }
    
    result += char;
    i++;
  }
  
  return result;
}

function processArray(text: string, startIndex: number): { fixed: string; endIndex: number } | null {
  let result = '[';
  let i = startIndex + 1;
  let inString = false;
  let escapeNext = false;
  let currentToken = '';
  let expectingValue = true;
  
  while (i < text.length) {
    const char = text[i];
    
    if (inString && escapeNext) {
      currentToken += char;
      escapeNext = false;
      i++;
      continue;
    }
    
    if (inString && char === '\\') {
      currentToken += char;
      escapeNext = true;
      i++;
      continue;
    }
    
    if (char === '"') {
      if (!inString && !expectingValue) {
        result += ',';
        expectingValue = true;
      }
      
      inString = !inString;
      currentToken += char;
      
      if (!inString && currentToken.startsWith('"')) {
        result += currentToken;
        currentToken = '';
        expectingValue = false;
      }
      
      i++;
      continue;
    }
    
    if (inString) {
      currentToken += char;
      i++;
      continue;
    }
    
    if (char === '[') {
      const nestedResult = processArray(text, i);
      if (nestedResult) {
        if (expectingValue) {
          result += nestedResult.fixed;
          expectingValue = false;
        }
        currentToken = '';
        i = nestedResult.endIndex + 1;
        continue;
      }
    }
    
    if (char === '{') {
      const objEnd = findMatchingBrace(text, i);
      if (objEnd !== -1) {
        if (expectingValue) {
          result += text.substring(i, objEnd + 1);
          expectingValue = false;
        }
        currentToken = '';
        i = objEnd + 1;
        continue;
      }
    }
    
    if (char === ']') {
      if (currentToken.trim() && expectingValue) {
        const quoted = quoteIfNeeded(currentToken.trim());
        result += quoted;
      }
      result += ']';
      return { fixed: result, endIndex: i };
    }
    
    if (char === ',') {
      if (currentToken.trim() && expectingValue) {
        const quoted = quoteIfNeeded(currentToken.trim());
        result += quoted;
      }
      
      result += ',';
      currentToken = '';
      expectingValue = true;
      i++;
      continue;
    }
    
    if (/\s/.test(char)) {
      if (currentToken.trim() && !inString) {
        let j = i;
        while (j < text.length && /\s/.test(text[j])) j++;
        
        if (j < text.length && (text[j] === ',' || text[j] === ']')) {
          if (expectingValue) {
            const quoted = quoteIfNeeded(currentToken.trim());
            result += quoted;
            expectingValue = false;
          }
          currentToken = '';
        } else {
          currentToken += char;
        }
      }
      i++;
      continue;
    }
    
    currentToken += char;
    i++;
  }
  
  return null;
}

function findMatchingBrace(text: string, startIndex: number): number {
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];
    
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
        if (depth === 0) return i;
      }
    }
  }
  
  return -1;
}

function quoteIfNeeded(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value;
  }
  
  if (value === 'true' || value === 'false' || value === 'null') {
    return value;
  }
  
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value)) {
    return value;
  }
  
  if (!value) {
    return '""';
  }
  
  const escaped = value.replace(/"/g, '\\"');
  return `"${escaped}"`;
}

describe('Integration: Real-world LLM JSON Responses', () => {
  it('should handle job ranking response with unquoted technical terms', async () => {
    // This is the type of response that was causing errors at position 255
    const llmResponse = `{
  "categoryScores": {
    "coreAzure": 85,
    "seniority": 75,
    "coreNet": 90,
    "frontendFrameworks": 60,
    "legacyModernization": 50,
    "legacyWeb": 40
  },
  "reasons": ["Strong Azure experience", "Excellent .NET skills" "Good cloud architecture"],
  "mustHaves": ["Azure", .NET Core, C#],
  "blockers": [],
  "missingKeywords": [SQL Server, Docker, Kubernetes]
}`;
    
    const cleaned = simulateJsonCleaning(llmResponse);
    const parsed = JSON.parse(cleaned);
    
    assert.strictEqual(parsed.categoryScores.coreAzure, 85);
    assert.strictEqual(parsed.reasons.length, 3);
    assert.deepStrictEqual(parsed.mustHaves, ['Azure', '.NET Core', 'C#']);
    assert.deepStrictEqual(parsed.missingKeywords, ['SQL Server', 'Docker', 'Kubernetes']);
  });

  it('should handle response with markdown code fence', async () => {
    const llmResponse = `Here's the JSON:

\`\`\`json
{
  "categoryScores": {
    "coreAzure": 80
  },
  "reasons": [Strong match, Good fit],
  "mustHaves": [Azure],
  "blockers": [],
  "missingKeywords": []
}
\`\`\`

Hope this helps!`;
    
    const cleaned = simulateJsonCleaning(llmResponse);
    const parsed = JSON.parse(cleaned);
    
    assert.strictEqual(parsed.categoryScores.coreAzure, 80);
    assert.deepStrictEqual(parsed.reasons, ['Strong match', 'Good fit']);
  });

  it('should handle response with multiple issues at once', async () => {
    // Combines unquoted elements, missing commas, and mixed formatting
    const llmResponse = `{
  "categoryScores": {
    coreAzure: 70,
    seniority: 80
  },
  "reasons": ["Good match" "Strong fit"],
  "mustHaves": [Azure .NET],
  "blockers": [],
  "missingKeywords": []
}`;
    
    const cleaned = simulateJsonCleaning(llmResponse);
    const parsed = JSON.parse(cleaned);
    
    assert.strictEqual(parsed.categoryScores.coreAzure, 70);
    assert.deepStrictEqual(parsed.reasons, ['Good match', 'Strong fit']);
    assert.deepStrictEqual(parsed.mustHaves, ['Azure .NET']);
  });
});

