# LLM JSON Parsing Fix

## Problem
The system was experiencing frequent LLM JSON parsing errors when Ollama returned responses with unquoted array elements. The errors appeared as:

- `Unexpected token 'S', ...", ".NET", SQL Server"...` 
- `Unexpected token 'C', ..."ET Core", C#], "bl"...`
- `Expected ',' or ']' after array element in JSON at position 278`

These errors occurred when the LLM generated JSON arrays where technical terms like "SQL Server", "C#", ".NET", etc. were not properly quoted.

## Root Cause
Ollama was generating malformed JSON in ranking responses, specifically in arrays like:
- `["Azure", ".NET", SQL Server]` instead of `["Azure", ".NET", "SQL Server"]`
- `["ASP.NET Core", C#]` instead of `["ASP.NET Core", "C#"]`

The existing JSON cleanup code in `src/ai/client.ts` handled many edge cases but didn't account for unquoted array elements.

## Solution
Added a multi-pass regex replacement to fix unquoted array elements before JSON parsing.

### Implementation Details

**Pattern**: `/([\[,]\s*)([^",\[\]]+)(\s*[\],])/g`

**Strategy**:
1. Match content between array delimiters (brackets and commas) that isn't already quoted
2. Skip JSON primitives (true, false, null) and numbers
3. Add quotes around remaining unquoted content
4. Run multiple passes since replacements change string positions

**Multi-pass Approach**:
The fix runs up to 10 iterations, repeating until no more changes occur. This handles cases where:
- Multiple consecutive unquoted elements exist
- String length changes affect subsequent match positions

**Example transformations**:
- Pass 1: `[.NET, SQL Server, C#]` → `[".NET", SQL Server, "C#"]`
- Pass 2: `[".NET", SQL Server, "C#"]` → `[".NET", "SQL Server", "C#"]`
- Pass 3: No changes, complete

## Files Modified
- `src/ai/client.ts` - Added multi-pass unquoted array element fixing
- `tests/json-cleanup.test.ts` - Added comprehensive test coverage (11 test cases)

## Test Coverage
All test cases pass, including:
- Technical terms with spaces (SQL Server, .NET 8)
- Special characters (C#, C++, .NET)
- Mixed quoted and unquoted elements
- JSON primitives (numbers, booleans, null)
- Real-world error cases from activity logs

## Impact
This fix will prevent the majority of "LLM failed to return valid JSON" errors seen in the activity log, improving the reliability of job ranking and reducing skipped jobs due to JSON parsing failures.

