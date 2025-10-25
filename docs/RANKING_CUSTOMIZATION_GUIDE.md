# Ranking Customization Guide

This guide explains how to customize job ranking to match your preferences and priorities.

## System Overview

The job ranking system uses weighted categories to score jobs. Each job receives scores (0-100) for multiple categories, which are then combined using category weights to produce a final fit score.

### Key Components

1. **Profile Definitions** (`src/ai/profiles.ts`)
   - Defines scoring categories with weights, keywords, and descriptions
   - Weights must sum to 100%
   - Contains both `mustHave` and `preferred` keywords

2. **Ranker** (`src/ai/ranker.ts`)
   - Uses profile definitions to generate scoring criteria for the LLM
   - Sends job descriptions to the AI with category weights
   - Returns validated scores for each category

3. **Weight Manager** (`src/ai/weight-manager.ts`)
   - Handles dynamic weight adjustments from the learning system
   - Normalizes weights to ensure they sum to 100%
   - Persists adjustments to database for learning from rejections

## How to Customize Rankings

### 1. Adjust Technology Preferences

**Location:** `src/ai/profiles.ts` → `PROFILES` object

To prioritize specific technologies (like Blazor/React over Angular):

```typescript
frontendFrameworks: {
  name: 'Frontend Framework Preferences',
  weight: 10,  // Percentage of total score
  mustHave: [],  // Empty = not required, but will score if present
  preferred: [
    'Blazor',           // Add preferred technologies
    'React',
    'React.js'
  ],
  description: 'Preferred frontend frameworks with emphasis on Blazor and React'
}
```

**What happens:**
- Jobs mentioning Blazor or React get higher scores in this category
- Jobs mentioning Angular get lower scores (not in preferred list)
- This category contributes 10% to the final score
- LLM evaluates how well the job matches this preference

### 2. Adjust Category Weights

**Location:** `src/ai/profiles.ts` → `PROFILES` object → `weight` property

Change the importance of any category:

```typescript
coreNet: {
  name: '.NET Development',
  weight: 20,  // Was 25%, now 20% to make room for frontendFrameworks
  // ... rest of config
}
```

**Rules:**
- All weights must sum to 100%
- Typical range: 5-25% per category
- Higher weight = more influence on final score

### 3. Add New Categories

**Steps:**

1. Add to `PROFILES` in `src/ai/profiles.ts`:
```typescript
export const PROFILES: Record<string, TechnicalProfile> = {
  // ... existing categories ...
  
  newCategory: {
    name: 'Category Display Name',
    weight: 5,
    mustHave: ['Required Keyword 1', 'Required Keyword 2'],
    preferred: ['Nice-to-have 1', 'Nice-to-have 2'],
    description: 'What this category evaluates'
  }
};
```

2. Adjust other category weights so total = 100%

3. Optionally add to Boolean searches (`BOOLEAN_SEARCHES`) if you want LinkedIn to filter by these keywords

### 4. Remove or Disable Categories

To temporarily disable a category without deleting it:

```typescript
someCategory: {
  name: 'Category Name',
  weight: 0,  // Set to 0 to disable
  // ... rest of config
}
```

Then redistribute the weight to other categories.

### 5. Modify Keyword Lists

**mustHave keywords:**
- Job must mention at least one of these to score well
- Acts as a soft filter (jobs without these get low scores)

**preferred keywords:**
- Nice-to-have terms that boost scores
- More mentions = higher score

Example:
```typescript
mustHave: [
  'C#',
  '.NET'
],
preferred: [
  'Blazor',          // Add new preferred technology
  'React',
  'Azure Functions',
  'Docker'
]
```

## Testing Changes

After making changes:

1. **Check weight validation:**
```bash
npm run search -- --profile core --dry-run
```

Look for weight sum warnings in console.

2. **Test ranking:**
```bash
npm run search "Software Engineer" -- --max-pages 1
```

Review the scores in `data/app.db` or dashboard to verify categories are scoring as expected.

3. **Run tests:**
```bash
npm run test:all
```

## Example: Prioritizing Blazor and React

This example shows the changes made to prioritize Blazor and React over Angular.

### Changes Made

**File:** `src/ai/profiles.ts`

1. **Added new category:**
```typescript
frontendFrameworks: {
  name: 'Frontend Framework Preferences',
  weight: 10,
  mustHave: [],
  preferred: [
    'Blazor',
    'Blazor Server',
    'Blazor WebAssembly',
    'React',
    'React.js',
    'ReactJS'
  ],
  description: 'Preferred frontend frameworks with strong emphasis on Blazor and React over Angular'
}
```

2. **Adjusted weights:**
- `coreNet`: 25% → 20%
- `legacyModernization`: 10% → 5%
- `frontendFrameworks`: 0% → 10% (new)

**Result:**
- Jobs with Blazor/React get +10% boost (scored 80-100 in this category)
- Jobs with Angular get lower scores (scored 20-40 in this category)
- Jobs without frontend frameworks score neutral (50 in this category)
- Total weight distribution remains 100%

### How It Works

When the AI ranks a job:

1. **Job mentions Blazor:**
   - `frontendFrameworks` category: 90/100 (strong match)
   - Contributes: 90 × 0.10 = 9 points to final score

2. **Job mentions Angular:**
   - `frontendFrameworks` category: 30/100 (weak match, not preferred)
   - Contributes: 30 × 0.10 = 3 points to final score

3. **Job mentions React:**
   - `frontendFrameworks` category: 85/100 (strong match)
   - Contributes: 85 × 0.10 = 8.5 points to final score

This creates a 5-6 point swing in final scores between preferred and non-preferred frameworks.

## Understanding the LLM Scoring

The LLM receives this prompt structure:

```
Rate fit 0-100 for each area (parenthesis shows weight for final score):
- frontendFrameworks (weight 10.0%): How well does job match preferred frontend frameworks with strong emphasis on Blazor and React over Angular?
- coreNet (weight 20.0%): How well does job match traditional .NET development skills?
...

Calculate fitScore = (frontendFrameworks*0.10 + coreNet*0.20 + ...)
```

The AI:
1. Reads the job description
2. Scores how well it matches each category (0-100)
3. Uses the weights to calculate the final score
4. Returns category scores, overall score, reasons, and concerns

## Common Customization Scenarios

### Scenario 1: Prefer Remote Jobs

Increase `seniority` weight and add more remote keywords:

```typescript
seniority: {
  name: 'Seniority & Remote Work',
  weight: 10,  // Increased from 5%
  mustHave: ['Senior', 'Lead', 'Remote'],
  preferred: [
    'Remote-first',
    'Fully Remote',
    '100% Remote',
    'Work from Anywhere'
  ]
}
```

### Scenario 2: Focus on Specific Azure Services

Add keywords to `coreAzure`:

```typescript
coreAzure: {
  weight: 25,  // Increased emphasis
  mustHave: [
    'Azure',
    'Azure Functions',    // Make specific services required
    'API Management'
  ],
  preferred: ['Service Bus', 'Event Grid', ...]
}
```

### Scenario 3: Avoid Certain Technologies

Create a "blocklist" category with negative scoring:

```typescript
technologiesToAvoid: {
  name: 'Technology Blocklist',
  weight: 5,
  mustHave: [],
  preferred: [],  // Empty = jobs mentioning these score LOW
  description: 'Penalize jobs mentioning PHP, WordPress, or legacy technologies'
}
```

Note: The LLM will score this category low when these are mentioned, reducing the final score.

## Files to Check After Changes

1. **`src/ai/profiles.ts`** - Your category definitions
2. **`src/ai/ranker.ts`** - Automatic (uses profiles dynamically)
3. **`src/ai/weight-manager.ts`** - Automatic (handles adjustments)
4. **`data/app.db`** - Database stores actual scores
5. **Dashboard** - View scoring results in real-time

## Validation

The system validates:
- Weights sum to 100% (warning if not)
- All category names are unique
- Weight adjustments stay within bounds (-10 to +10)

Check console output for warnings:
```
Warning: Profile weights sum to 105%, expected 100%
```

## Learning System Integration

The system can automatically adjust weights based on rejections:

- Rejection mentions "too junior" → increases `seniority` weight
- Rejection mentions "wrong tech stack" → adjusts category weights
- Multiple rejections from same company → adds to blocklist

These adjustments are stored in the database and combined with base weights.

## Quick Reference

| Task | File | Property | Impact |
|------|------|----------|--------|
| Change category importance | `profiles.ts` | `weight` | How much category affects final score |
| Add preferred technology | `profiles.ts` | `preferred` | Jobs with this technology score higher |
| Require specific skill | `profiles.ts` | `mustHave` | Jobs without this score very low |
| Add new evaluation area | `profiles.ts` | Add category | New scoring dimension |
| View current weights | Dashboard | Weight Adjustments | See base + learned weights |
| Reset learning | Terminal | `resetWeightAdjustments()` | Clear all learned adjustments |

## Need Help?

1. Check the weight sum validation in console
2. Run `npm run test:all` to verify system integrity
3. Use the dashboard to monitor how jobs are scoring
4. Review `docs/TESTING_GUIDE.md` for testing approaches


