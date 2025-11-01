# Recent Changes

## Ranking Preferences Update (October 2025)

### Changes Overview
1. Added frontend framework preferences (Blazor/React over Angular)
2. Increased emphasis on fully remote positions over hybrid

## Frontend Framework Preferences

### Summary
Updated ranking system to prioritize Blazor and React jobs over Angular jobs.

### Changes Made

#### 1. New Profile Category Added
**File:** `src/ai/profiles.ts`

Added `frontendFrameworks` category (10% weight):
- Prioritizes: Blazor, Blazor Server, Blazor WebAssembly, React, React.js
- Jobs mentioning these frameworks score higher
- Jobs with Angular score lower (not in preferred list)

#### 2. Weight Adjustments
Redistributed weights to accommodate new category and emphasize remote work:
- `coreNet`: 25% → 20% (-5%)
- `legacyModernization`: 10% → 5% (-5%)
- `frontendFrameworks`: 0% → 10% (+10% new category)
- `seniority`: 5% → 10% (+5% for remote work emphasis)
- `devops`: 5% → 0% (-5% overlaps with other categories)

Total remains 100%.

**Remote Work Emphasis:**
- Doubled weight from 5% to 10%
- Updated description to explicitly prioritize fully remote over hybrid
- Added more remote-specific keywords: '100% Remote', 'Completely Remote', 'Permanent Remote', 'Work from Anywhere'

#### 3. Documentation Created
**File:** `docs/RANKING_CUSTOMIZATION_GUIDE.md`

Created comprehensive guide covering:
- How the ranking system works
- How to customize technology preferences
- How to adjust category weights
- How to add/remove categories
- Example scenarios and use cases
- Integration with learning system

This guide makes it easy to make similar customization requests in the future.

#### 4. README Updates
**File:** `README.md`

- Updated Job Scoring section with new weights
- Added reference to Ranking Customization Guide
- Added Frontend Framework Preferences note

### How It Works

When ranking a job:

**Job with Blazor:**
- `frontendFrameworks` category: ~90/100
- Contributes: 90 × 0.10 = 9 points to final score

**Job with Angular:**
- `frontendFrameworks` category: ~30/100
- Contributes: 30 × 0.10 = 3 points to final score

**Result:** 6-point advantage for Blazor/React jobs over Angular jobs.

## Remote Work Emphasis

### Changes Made

**File:** `src/ai/profiles.ts`

1. **Increased seniority category weight:**
```typescript
seniority: {
  name: 'Seniority & Remote Work',
  weight: 10,  // Was 5%, now 10% (doubled)
  // ... configuration
  description: 'Required seniority level with strong emphasis on fully remote positions. Fully remote jobs score highest, hybrid positions score lower, on-site positions score lowest.'
}
```

2. **Enhanced remote keywords:**
- Added: '100% Remote', 'Completely Remote', 'Permanent Remote', 'Work from Anywhere', 'Remote Work'
- Retained: 'Remote-first', 'Fully Remote', 'Work from Home', 'WFH', 'Distributed'

3. **Disabled DevOps category:**
- Set weight to 0% (was 5%)
- Reason: DevOps practices overlap with Azure, performance, and other categories
- Weight redistributed to seniority for remote work emphasis

### How It Works

**Job explicitly mentions "Fully Remote":**
- `seniority` category: ~95/100 (strong match)
- Contributes: 95 × 0.10 = 9.5 points to final score

**Job mentions "Hybrid" or "Remote with office days":**
- `seniority` category: ~60/100 (moderate match)
- Contributes: 60 × 0.10 = 6 points to final score

**Job is on-site only:**
- `seniority` category: ~20/100 (weak match)
- Contributes: 20 × 0.10 = 2 points to final score

**Result:** ~7-point advantage for fully remote jobs over hybrid jobs, ~8-point advantage over on-site jobs.

### Testing

Weights validated:
```
coreAzure: 20%
security: 15%
eventDriven: 10%
performance: 10%
devops: 0% (disabled - overlaps with other categories)
seniority: 10% (increased for remote work)
coreNet: 20%
frontendFrameworks: 10% (new)
legacyModernization: 5%

Total: 100% ✓ Valid
```

### Files Modified

1. `src/ai/profiles.ts` - Added frontendFrameworks category, adjusted weights
2. `README.md` - Updated scoring description and documentation links
3. `docs/RANKING_CUSTOMIZATION_GUIDE.md` - New comprehensive guide
4. `docs/RECENT_CHANGES.md` - This file

### No Breaking Changes

- All existing functionality preserved
- Learning system automatically adapts to new category
- Dashboard will show new category in scores
- No database migrations needed

### Future Similar Requests

For similar customization requests, refer to:
- `docs/RANKING_CUSTOMIZATION_GUIDE.md` - Complete customization instructions
- This file section "How It Works" - Impact calculation methodology
- `src/ai/profiles.ts` - Profile definitions with inline examples

The documentation now provides clear patterns for:
1. Adding new preference categories
2. Adjusting technology priorities
3. Redistributing weights
4. Validating changes

