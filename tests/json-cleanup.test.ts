import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Test JSON cleanup regex patterns
 * These tests validate the JSON cleanup logic in src/ai/client.ts
 * without requiring a full Ollama mock or integration test
 */

function cleanUnquotedArrayElements(text: string): string {
  let cleanedText = text;
  let prevText = '';
  let maxIterations = 10;
  
  while (cleanedText !== prevText && maxIterations-- > 0) {
    prevText = cleanedText;
    cleanedText = cleanedText.replace(
      /([\[,]\s*)([^",\[\]]+)(\s*[\],])/g,
      (match, prefix, content, suffix) => {
        // If the match contains a quote, it's likely part of a properly quoted string - skip it
        if (match.includes('"')) {
          return match;
        }
        
        const trimmedContent = content.trim();
        
        // Don't quote JSON primitives
        if (trimmedContent === 'true' || trimmedContent === 'false' || trimmedContent === 'null') {
          return match;
        }
        
        // Don't quote pure numbers (including scientific notation)
        if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmedContent)) {
          return match;
        }
        
        // Don't quote if it's empty or only whitespace
        if (!trimmedContent) {
          return match;
        }
        
        // Quote the content
        return `${prefix}"${trimmedContent}"${suffix}`;
      }
    );
  }
  
  return cleanedText;
}

describe('JSON Cleanup - Unquoted Array Elements', () => {
  it('should fix unquoted technical terms like SQL Server', () => {
    const input = '["Azure", ".NET", SQL Server]';
    const expected = '["Azure", ".NET", "SQL Server"]';
    const result = cleanUnquotedArrayElements(input);
    assert.strictEqual(result, expected);
  });

  it('should fix unquoted C# in arrays', () => {
    const input = '["ASP.NET Core", C#, "Azure"]';
    const expected = '["ASP.NET Core", "C#", "Azure"]';
    const result = cleanUnquotedArrayElements(input);
    assert.strictEqual(result, expected);
  });

  it('should fix multiple unquoted elements', () => {
    const input = '[.NET, SQL Server, C#]';
    const expected = '[".NET", "SQL Server", "C#"]';
    const result = cleanUnquotedArrayElements(input);
    assert.strictEqual(result, expected);
  });

  it('should not modify properly quoted strings', () => {
    const input = '["Azure", "SQL Server", "C#"]';
    const expected = '["Azure", "SQL Server", "C#"]';
    const result = cleanUnquotedArrayElements(input);
    assert.strictEqual(result, expected);
  });

  it('should not modify JSON primitives', () => {
    const input = '[true, false, null, 42, 3.14]';
    const expected = '[true, false, null, 42, 3.14]';
    const result = cleanUnquotedArrayElements(input);
    assert.strictEqual(result, expected);
  });

  it('should handle mixed quoted and unquoted', () => {
    const input = '["Azure", SQL Server, "C#", .NET Core]';
    const expected = '["Azure", "SQL Server", "C#", ".NET Core"]';
    const result = cleanUnquotedArrayElements(input);
    assert.strictEqual(result, expected);
  });

  it('should handle terms with special characters', () => {
    const input = '[C++, .NET 8, SQL Server 2022]';
    const expected = '["C++", ".NET 8", "SQL Server 2022"]';
    const result = cleanUnquotedArrayElements(input);
    assert.strictEqual(result, expected);
  });

  it('should handle real-world error case from activity log', () => {
    // Based on: Unexpected token 'S', ...", ".NET", SQL Server"... is not valid JSON
    const input = '{"mustHaves": [".NET", SQL Server], "blockers": []}';
    const expected = '{"mustHaves": [".NET", "SQL Server"], "blockers": []}';
    const result = cleanUnquotedArrayElements(input);
    assert.strictEqual(result, expected);
  });

  it('should handle another real-world case', () => {
    // Based on: Unexpected token 'C', ..."ET Core", C#], "bl"...
    const input = '{"missingKeywords": ["ASP.NET Core", C#], "blockers": []}';
    const expected = '{"missingKeywords": ["ASP.NET Core", "C#"], "blockers": []}';
    const result = cleanUnquotedArrayElements(input);
    assert.strictEqual(result, expected);
  });

  it('should not break on empty arrays', () => {
    const input = '[]';
    const expected = '[]';
    const result = cleanUnquotedArrayElements(input);
    assert.strictEqual(result, expected);
  });

  it('should handle arrays with only unquoted elements', () => {
    const input = '[Azure, AWS, GCP]';
    const expected = '["Azure", "AWS", "GCP"]';
    const result = cleanUnquotedArrayElements(input);
    assert.strictEqual(result, expected);
  });
});

