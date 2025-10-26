# Ollama JSON Extraction Fix

## Problem

The job application process was failing with JSON parsing errors when Ollama returned responses in unexpected formats:

### Issue 3: Unquoted or Single-Quoted Property Names (October 2025)
```
Failed to get valid JSON from Ollama after 4 attempts: 
  Expected double-quoted property name in JSON at position 145 (line 8 column 22)
```

Root cause: Ollama returns JSON with unquoted or single-quoted property names:
```json
{
  name: "value",           // Invalid - unquoted property name
  'another': 'test',       // Invalid - single quotes
  "valid": "property"      // Valid JSON
}
```

### Issue 1: Text Mixed with JSON
```
Failed to parse resume sections with AI: Error: Failed to get valid JSON from Ollama after 3 attempts: 
  Unexpected non-whitespace character after JSON at position 368

Failed to find relevant bullets with AI: Error: Failed to get valid JSON from Ollama after 3 attempts: 
  Unexpected token 'H', "Here is th"... is not valid JSON
```

### Issue 2: Array Instead of Object
```
Error: [
  {
    "code": "invalid_type",
    "expected": "object",
    "received": "array",
    "path": [],
    "message": "Expected object, received array"
  }
]
```

### Root Causes

1. **Text before JSON**: Ollama would respond with "Here is the JSON you requested: [...]" instead of pure JSON
2. **Text after JSON**: Ollama would append "Hope this helps!" after the JSON
3. **Greedy regex**: The original extraction used `\{[\s\S]*\}` which matched from the first `{` to the LAST `}`, potentially including unwanted text
4. **Array responses**: The extraction logic didn't handle array responses properly (only looked for objects)
5. **Wrong prompt format**: The `enhanceWhyFit` function asked for plain text instead of JSON
6. **Schema mismatch**: Field mapper expected `{"mappings": [...]}` but Ollama sometimes returned just `[...]`

## Solution

### 0. JSON Repair for Malformed Syntax (`src/ai/client.ts` - October 2025)

Added repair logic to fix common JSON syntax errors before parsing:

**Property Name Fixes:**
```typescript
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
```

**String Value Fixes:**
```typescript
// Fix single-quoted string values (convert to double quotes)
cleanedText = cleanedText.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, (match, content) => {
  const unescaped = content.replace(/\\'/g, "'");
  const escaped = unescaped.replace(/"/g, '\\"');
  return `"${escaped}"`;
});
```

Example transformations:
```
Input:  {name: "John", 'age': '25'}
Output: {"name": "John", "age": "25"}

Input:  {location: 'New York', status: 'active'}
Output: {"location": "New York", "status": "active"}

Input:  {title: "Senior Engineer", company: 'Acme Inc'}
Output: {"title": "Senior Engineer", "company": "Acme Inc"}
```

### 1. Improved JSON Extraction Logic (`src/ai/client.ts`)

Implemented a depth-tracking parser that:

- **Searches for arrays first**: Detects `[` and tracks bracket depth to find the matching `]`
- **Falls back to objects**: If no array found, searches for `{` and tracks brace depth
- **Respects string boundaries**: Properly handles brackets/braces inside strings
- **Handles escape sequences**: Correctly processes `\"` without breaking string detection
- **Extracts exact JSON**: Stops at the first complete JSON structure, ignoring trailing text

Example transformations:
```
Input:  "Here is your data: [{"type":"experience"}] Done!"
Output: [{"type":"experience"}]

Input:  "Sure! {"answer":"text"} Let me know if..."
Output: {"answer":"text"}

Input:  "Here are the mappings: [{"label":"Email","key":"email"}]"
Output: [{"label":"Email","key":"email"}]
```

### 2. Fixed Prompt Format (`src/ai/rag.ts`)

Changed `enhanceWhyFit` to request JSON instead of plain text:

**Before:**
```typescript
Return only the enhanced answer text.
const enhanced = await askOllama<string>(prompt, 'string', {...});
return enhanced || baseAnswer;
```

**After:**
```typescript
Return ONLY a JSON object with this format:
{"answer": "your enhanced answer here"}
const result = await askOllama<{ answer: string }>(prompt, 'EnhancedAnswer', {...});
return result?.answer || baseAnswer;
```

### 3. Flexible Schema Validation (`src/ai/mapper.ts`)

Added fallback handling for array vs object responses:

**Before:**
```typescript
const result = await askOllama<MappingOutput>(prompt, 'MappingOutput', {...});
const validated = MappingOutputSchema.parse(result);  // Fails if array
return validated.mappings;
```

**After:**
```typescript
const result = await askOllama<MappingOutput>(prompt, 'MappingOutput', {...});

// Handle both formats: {"mappings": [...]} or just [...]
let validated: MappingOutput;

if (Array.isArray(result)) {
  // Ollama returned just the array, wrap it
  validated = { mappings: result as Array<{ label: string; key: string }> };
} else {
  // Ollama returned the full object
  validated = MappingOutputSchema.parse(result);
}

return validated.mappings;
```

Also improved the prompt with explicit examples:

```typescript
IMPORTANT: Return ONLY valid JSON in this exact format (object with "mappings" array):
{
  "mappings": [
    {"label": "exact label text", "key": "canonical_key"}
  ]
}

Example response:
{
  "mappings": [
    {"label": "Email Address", "key": "email"},
    {"label": "Phone Number", "key": "phone"}
  ]
}
```

## Testing

All JSON extraction scenarios tested and passing:

1. ✅ Array with leading text
2. ✅ Array with trailing text
3. ✅ Object with surrounding text
4. ✅ Nested structures (arrays within objects)
5. ✅ Braces/brackets in string values
6. ✅ Mapper handling array vs object responses
7. ✅ Unquoted property names (October 2025)
8. ✅ Single-quoted property names (October 2025)
9. ✅ Single-quoted string values (October 2025)
10. ✅ Mixed quote styles in same object (October 2025)

## Impact

### Resume Parsing

- **parseResumeSections**: Now correctly extracts arrays even when Ollama adds explanatory text
- **Fallback behavior**: On failure, uses regex-based fallback parser (unchanged)

### Content Generation

- **findRelevantBullets**: Handles array responses with surrounding text
- **enhanceWhyFit**: Now returns valid JSON that can be properly parsed

### Field Mapping

- **mapLabelsWithLLM**: Handles both object format `{"mappings": [...]}` and direct array format `[...]`
- Improved prompt with explicit examples to encourage correct format
- Automatic wrapping if Ollama returns array instead of object

## Additional Fix: Character Limit Enforcement

After fixing JSON parsing, discovered that `why_fit` responses were exceeding the 400 character limit. Added three layers of protection:

### 1. Pre-validation Truncation (`src/ai/answers.ts`)
Truncates `why_fit` before Zod validation if it exceeds 400 chars:
- Tries to truncate at sentence boundary (last period > 300 chars)
- Falls back to word boundary (last space > 350 chars)  
- Hard truncates at 400 chars as last resort

### 2. Post-enhancement Truncation (`src/ai/answers.ts`)
After `enhanceWhyFit` is called, ensures result doesn't exceed 400 chars using same smart truncation logic.

### 3. Stricter Prompts (`src/ai/rag.ts`)
Updated `enhanceWhyFit` prompt to emphasize character limit:
- Target 380 chars "to be safe"
- Explicit instruction to count characters
- Prioritize quality over quantity

## Files Modified

- `src/ai/client.ts`: Improved JSON extraction with depth tracking
- `src/ai/rag.ts`: Fixed `enhanceWhyFit` to use JSON response format + stricter character limit prompts
- `src/ai/mapper.ts`: Added fallback handling for array vs object responses
- `src/ai/answers.ts`: Added smart truncation for `why_fit` before and after enhancement
- `docs/OLLAMA_JSON_EXTRACTION_FIX.md`: This documentation

## Next Steps

If you encounter JSON parsing errors in the future:

1. Enable DEBUG mode: `set DEBUG=true` (Windows) or `export DEBUG=true` (Linux/Mac)
2. Check console for raw Ollama responses
3. Verify the prompt asks for valid JSON (not plain text)
4. Ensure the expected type matches what Ollama returns (array vs object)
5. Consider adding schema flexibility if Ollama returns valid but differently structured JSON

## Try It Now

The fix has been tested and validated. You can retry your job application:

```bash
npm run apply -- --profile core --easy
```

The resume parsing, field mapping, and content generation should now work without JSON errors.

## Related Issues

This fix addresses JSON parsing errors that occurred during:
- Resume sections parsing (array responses with text)
- Relevant bullets extraction (array responses with text)  
- Cover letter enhancement (plain text instead of JSON)
- Field label mapping (array instead of object)
- Job ranking (unquoted/single-quoted property names - October 2025)

All these features now have improved resilience against LLM response variations.

### Common Error Messages

**Before Fix (October 2025):**
```
Failed to get valid JSON from Ollama after 4 attempts: 
  Expected double-quoted property name in JSON at position 128 (line 7 column 18)
```

**After Fix (October 2025):**
- Improved regex patterns that properly handle unquoted and single-quoted property names
- Separated handling into two distinct cases for reliability
- Added better error logging to show both raw and cleaned responses
- Improved ranker prompt to provide a clearer JSON example with proper formatting

The automatic repair now correctly converts all malformed JSON syntax to valid JSON before parsing.
