# Bonus-Only Category Fix

## Problem
Jobs were being penalized for missing frontend framework keywords even though frontend is optional. The `frontendFrameworks` category has an empty `mustHave` array (indicating it's optional), but when a job scored 0 in this category, it still lowered the overall fit score.

For example, with the "core" profile:
- **Old Behavior**: Job without frontend scored **71.20** (penalized by 0 × 10% = 0 contribution)
- **New Behavior**: Job without frontend scores **79.11** (frontend weight redistributed to other categories)
- **New Behavior**: Job with frontend (80/100) scores **79.20** (slight boost from frontend)

## Solution
Categories with empty `mustHave` arrays are now treated as "bonus-only" categories:

1. **When score is 0**: The category's weight is redistributed proportionally to other categories, so the job is NOT penalized
2. **When score > 0**: The category boosts the overall score normally

This allows optional features (like frontend frameworks) to enhance scores without penalizing their absence.

## Implementation Details

### Files Modified

1. **src/ai/ranker.ts** (lines 178-222)
   - Added logic to identify bonus-only categories (empty `mustHave` + zero score)
   - Calculates weight redistribution proportionally to other categories
   - Applies redistributed weights when calculating final fit score

2. **scripts/recalculate-ranks.js** (lines 43-45, 107-153)
   - Added `BONUS_ONLY_CATEGORIES` constant listing bonus categories
   - Added same weight redistribution logic for recalculating existing job scores
   - Synced profile weight distributions with current values from profiles.ts
   - Added missing `legacy-web` profile

3. **src/ai/profiles.ts** (lines 11-25)
   - Added documentation explaining bonus-only behavior in `TechnicalProfile` interface

### How It Works

```typescript
// Example: core profile weights
const profileWeights = {
  coreAzure: 33,
  seniority: 17,
  coreNet: 30,
  frontendFrameworks: 10,  // Bonus-only (empty mustHave)
  legacyModernization: 10,
  legacyWeb: 0
};

// Job WITHOUT frontend
const scores = {
  coreAzure: 80,
  seniority: 90,
  coreNet: 95,
  frontendFrameworks: 0,  // Missing frontend
  legacyModernization: 10,
  legacyWeb: 20
};

// Redistribution logic:
// 1. Identify bonus categories with zero scores: frontendFrameworks (10%)
// 2. Redistributed weight: 10%
// 3. Required categories total: 90% (100% - 10%)
// 4. Redistribute proportionally:
//    - coreAzure: 33 + (33/90 * 10) = 36.67%
//    - seniority: 17 + (17/90 * 10) = 18.89%
//    - coreNet: 30 + (30/90 * 10) = 33.33%
//    - legacyModernization: 10 + (10/90 * 10) = 11.11%
//    - frontendFrameworks: 0% (redistributed away)
//    - legacyWeb: 0% (unchanged)

// Result: 79.11 (NOT penalized for missing frontend)
```

## Impact

### Job Ranking
- Jobs without frontend frameworks will score higher (more accurate representation)
- Jobs with frontend frameworks will receive a bonus (as intended)
- Existing jobs can be re-scored with: `npm run recalculate-ranks`

### Extensibility
- Any category with empty `mustHave` array automatically becomes bonus-only
- No code changes needed when adding new bonus categories
- Just list the category key in `BONUS_ONLY_CATEGORIES` in recalculate-ranks.js

## Testing
Run the bonus category test to verify behavior:
```bash
npx tsx --test tests/unit/bonus-category.test.ts
```

Expected output shows:
- Job WITHOUT frontend: ~79.11 (no penalty)
- Job WITH frontend: ~79.20 (slight boost)
- Old behavior: ~71.20 (penalized - for comparison)

## Future Considerations
- Could make other categories bonus-only by emptying their `mustHave` arrays
- Consider using this pattern for other optional skills (e.g., specific Azure services)
- Dashboard could show which categories are bonus-only vs required

