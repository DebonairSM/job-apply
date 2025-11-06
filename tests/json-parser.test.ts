/**
 * Tests for JSON parsing and fixing logic in ollama client
 * These tests verify that the array fixing logic handles edge cases correctly
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// We need to test the internal fixArrayElements function
// Since it's not exported, we'll test the full askOllama flow with mocked responses
// For now, let's create unit tests for the array fixing patterns

/**
 * Simulate the fixArrayElements function for testing
 * This is a copy of the logic from src/ai/client.ts for testing purposes
 */
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
      // If we're starting a new string and we already have a complete value, insert comma
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

describe('JSON Array Fixing', () => {
  it('should handle arrays with unquoted elements', async () => {
    const input = '{"items": [Item1, Item2, Item3]}';
    const output = fixArrayElements(input);
    const parsed = JSON.parse(output);
    
    assert.deepStrictEqual(parsed.items, ['Item1', 'Item2', 'Item3']);
  });

  it('should handle arrays with missing commas', async () => {
    const input = '{"items": ["Valid" "Missing comma"]}';
    const output = fixArrayElements(input);
    const parsed = JSON.parse(output);
    
    assert.deepStrictEqual(parsed.items, ['Valid', 'Missing comma']);
  });

  it('should handle mixed quoted and unquoted elements', async () => {
    const input = '{"items": ["Quoted", Unquoted, "Another quoted"]}';
    const output = fixArrayElements(input);
    const parsed = JSON.parse(output);
    
    assert.deepStrictEqual(parsed.items, ['Quoted', 'Unquoted', 'Another quoted']);
  });

  it('should handle arrays with spaces in unquoted values', async () => {
    const input = '{"items": [SQL Server, .NET Core, Azure Functions]}';
    const output = fixArrayElements(input);
    const parsed = JSON.parse(output);
    
    assert.deepStrictEqual(parsed.items, ['SQL Server', '.NET Core', 'Azure Functions']);
  });

  it('should handle nested arrays', async () => {
    const input = '{"nested": [["A", "B"], [C, D]]}';
    const output = fixArrayElements(input);
    const parsed = JSON.parse(output);
    
    assert.deepStrictEqual(parsed.nested, [['A', 'B'], ['C', 'D']]);
  });

  it('should preserve properly formatted arrays', async () => {
    const input = '{"items": ["Valid", "Array", "Values"]}';
    const output = fixArrayElements(input);
    const parsed = JSON.parse(output);
    
    assert.deepStrictEqual(parsed.items, ['Valid', 'Array', 'Values']);
  });

  it('should handle arrays with boolean and number primitives', async () => {
    const input = '{"mixed": [true, false, 123, 45.67, null, "string"]}';
    const output = fixArrayElements(input);
    const parsed = JSON.parse(output);
    
    assert.deepStrictEqual(parsed.mixed, [true, false, 123, 45.67, null, 'string']);
  });

  it('should handle empty arrays', async () => {
    const input = '{"empty": []}';
    const output = fixArrayElements(input);
    const parsed = JSON.parse(output);
    
    assert.deepStrictEqual(parsed.empty, []);
  });

  it('should handle arrays in job ranking response format', async () => {
    // This is the actual format from rankJob that was failing
    const input = `{
  "categoryScores": {
    "coreAzure": 75,
    "seniority": 80
  },
  "reasons": ["Strong Azure experience", "Senior level position"],
  "mustHaves": ["Azure", .NET],
  "blockers": [],
  "missingKeywords": [SQL Server, Docker]
}`;
    const output = fixArrayElements(input);
    const parsed = JSON.parse(output);
    
    assert.deepStrictEqual(parsed.mustHaves, ['Azure', '.NET']);
    assert.deepStrictEqual(parsed.missingKeywords, ['SQL Server', 'Docker']);
  });
});

