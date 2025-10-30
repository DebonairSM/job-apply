# Profile Creation Guide

This guide documents the process for creating new search profiles in the job application system.

## Overview

Search profiles have two distinct purposes:
1. **Search Profiles** - Define how to find jobs (Boolean queries for LinkedIn)
2. **Technical Profiles** - Define how to score jobs (keyword categories and weights)

**Important**: A search profile can reuse an existing technical profile. For example, the "contract" search profile uses different search keywords to find contract jobs, but uses the "coreNet" technical profile to score them.

## Profile Types

### Type A: New Search Profile with Existing Technical Profile (Recommended)
Use this when you want to search for jobs differently but score them the same way as an existing profile.

**Example**: Contract positions are .NET jobs, just with different employment types. They use the contract Boolean search but coreNet technical scoring.

**Files to Update**: 8 files

### Type B: Completely New Profile (Technical + Search)
Use this when you need both new search criteria AND new technical scoring categories.

**Example**: Adding a "machine learning" profile would need new keywords for both searching and scoring.

**Files to Update**: 8 files (all from Type A plus PROFILES object)

## Files That Must Be Updated

### Type A: New Search Profile (Reusing Technical Profile)

#### 1. `src/ai/profiles.ts`
- Add Boolean search string to `BOOLEAN_SEARCHES` object (defines how to find jobs)
- Add weight distribution to `PROFILE_WEIGHT_DISTRIBUTIONS` object (reuses existing technical categories)

#### 2. `src/ai/ranker.ts`
- **CRITICAL**: Add mapping in `PROFILE_NAME_MAP` to existing technical profile
- **This is the bug we fixed**: Missing this causes "Unknown profile" errors

#### 3. `src/cli.ts`
- Add to `choices` array (line ~35, makes profile available in CLI)
- Add to type assertion for `profile` parameter (line ~91)

#### 4. `src/commands/search.ts`
- Add to `SearchOptions` interface `profile` type (line ~14)

#### 5. `src/dashboard/routes/automation.ts`
- Add to `SearchOptionsSchema` z.enum() validation (line ~12)

#### 6. `src/dashboard/client/hooks/useAutomation.ts`
- Add to `SearchOptions` interface `profile` type (line ~14)

#### 7. `src/dashboard/client/components/Automation.tsx`
- **CRITICAL UI UPDATE**: Add to `PROFILE_OPTIONS` array (line ~16)
- Format: `{ value: 'profile-name', label: 'Display Name' }`

#### 8. `README.md` (optional but recommended)
- Add to profiles table
- Update profile count in "Choose from X pre-configured profiles"
- Update examples

#### 1. `src/ai/profiles.ts`
- Add new technical profile to `PROFILES` object (defines scoring categories)
- Add Boolean search to `BOOLEAN_SEARCHES` object
- Add weight distribution to `PROFILE_WEIGHT_DISTRIBUTIONS` object
- **Ensure all PROFILES weights sum to 100%**

#### 2. `src/ai/ranker.ts`
- Add mapping in `PROFILE_NAME_MAP` (usually maps to itself for new technical profiles)

#### 3. `src/cli.ts`
- Add to `choices` array (line ~35)
- Add to type assertion for `profile` parameter (line ~91)

#### 4. `src/commands/search.ts`
- Add to `SearchOptions` interface `profile` type (line ~14)

#### 5. `src/dashboard/routes/automation.ts`
- Add to `SearchOptionsSchema` z.enum() validation (line ~12)

#### 6. `src/dashboard/client/hooks/useAutomation.ts`
- Add to `SearchOptions` interface `profile` type (line ~14)

#### 7. `src/dashboard/client/components/Automation.tsx`
- **CRITICAL UI UPDATE**: Add to `PROFILE_OPTIONS` array (line ~16)
- Format: `{ value: 'profile-name', label: 'Display Name' }`

#### 8. `README.md` (optional but recommended)
- Add to profiles table
- Update profile count in "Choose from X pre-configured profiles"
- Update examples

---

## Examples

### Example 1: Type A - "contract" Profile (Search Only)

This profile searches for contract jobs but scores them like .NET jobs.

#### Step 1: Add to `src/ai/profiles.ts`
```typescript
// Add to BOOLEAN_SEARCHES object (line ~264)
contract: '("Senior .NET Developer" OR "Contract .NET Developer" OR "C# Contractor") AND (C# OR ".NET Core") AND (Contract OR Contractor OR "Contract to Hire") AND (ASP.NET OR "Web API") AND (Remote OR "Remote Contract")'

// Add to PROFILE_WEIGHT_DISTRIBUTIONS object (line ~375)
contract: {
  coreAzure: 10,
  security: 10,
  eventDriven: 5,
  performance: 15,
  devops: 0,
  seniority: 10,
  coreNet: 40,           // Emphasis on .NET skills
  frontendFrameworks: 5,
  legacyModernization: 5
}
```

#### Step 2: Map to existing technical profile in `src/ai/ranker.ts`
```typescript
// Add to PROFILE_NAME_MAP (line ~15)
const PROFILE_NAME_MAP: Record<string, string> = {
  'core': 'coreAzure',
  'security': 'security',
  // ... other mappings ...
  'contract': 'coreNet'  // Reuses coreNet technical profile
};
```

#### Step 3: Add to CLI in `src/cli.ts`
```typescript
// Add to choices array (line ~35)
choices: ['core', 'security', 'event-driven', 'performance', 'devops', 'backend', 'core-net', 'legacy-modernization', 'contract', 'aspnet-simple', 'csharp-azure-no-frontend'] as const,

// Add to type assertion (line ~91)
profile: argv.profile as 'core' | 'security' | 'event-driven' | 'performance' | 'devops' | 'backend' | 'core-net' | 'legacy-modernization' | 'contract' | 'aspnet-simple' | 'csharp-azure-no-frontend' | undefined,
```

---

### Example 2: Simplified Search Profiles

Profiles like `aspnet-simple` and `csharp-azure-no-frontend` use simplified LinkedIn searches with NOT operators.

#### Step 1: Add to `src/ai/profiles.ts`
```typescript
// Add to BOOLEAN_SEARCHES object (line ~275)
'aspnet-simple': 'asp.net',
'csharp-azure-no-frontend': '(C# AND Azure) NOT (Angular OR React)'

// Add to PROFILE_WEIGHT_DISTRIBUTIONS object (line ~400)
'aspnet-simple': {
  coreAzure: 5,
  security: 10,
  eventDriven: 5,
  performance: 15,
  devops: 0,
  seniority: 15,
  coreNet: 45,             // Heavy focus on .NET skills
  frontendFrameworks: 3,
  legacyModernization: 2
},

'csharp-azure-no-frontend': {
  coreAzure: 35,           // Strong Azure focus
  security: 10,
  eventDriven: 10,
  performance: 15,
  devops: 0,
  seniority: 10,
  coreNet: 20,
  frontendFrameworks: 0,   // Explicitly avoid frontend
  legacyModernization: 0
}
```

#### Step 2: Map to existing technical profile in `src/ai/ranker.ts`
```typescript
// Add to PROFILE_NAME_MAP (line ~19)
'aspnet-simple': 'coreNet',
'csharp-azure-no-frontend': 'coreNet',
```

#### Step 3: Add to CLI in `src/cli.ts`
```typescript
choices: ['core', 'security', 'event-driven', 'performance', 'devops', 'backend', 'core-net', 'legacy-modernization', 'contract', 'aspnet-simple', 'csharp-azure-no-frontend'] as const,

profile: argv.profile as 'core' | 'security' | 'event-driven' | 'performance' | 'devops' | 'backend' | 'core-net' | 'legacy-modernization' | 'contract' | 'aspnet-simple' | 'csharp-azure-no-frontend' | undefined,
```

---

### Example 3: Type B - "frontend" Profile (New Technical Profile)

This requires new scoring categories for frontend technologies.

#### Step 1: Add to `src/ai/profiles.ts`
```typescript
// Add to PROFILES object (line ~244)
frontend: {
  name: 'Frontend Frameworks',
  weight: 15,
  mustHave: [
    'React',
    'TypeScript',
    'JavaScript'
  ],
  preferred: [
    'Next.js',
    'Vue.js',
    'HTML5',
    'CSS3',
    'Webpack'
  ],
  description: 'Frontend development with modern frameworks'
},

// Add to BOOLEAN_SEARCHES (line ~264)
'frontend': '("Frontend Developer" OR "React Developer") AND (React OR TypeScript) AND (Frontend OR UI) AND (Senior OR Lead) AND Remote',

// Add to PROFILE_WEIGHT_DISTRIBUTIONS (line ~386)
frontend: {
  coreAzure: 5,
  security: 5,
  eventDriven: 0,
  performance: 10,
  devops: 0,
  seniority: 10,
  coreNet: 20,
  frontendFrameworks: 45,  // Heavy emphasis on frontend
  legacyModernization: 5
}
```

#### Step 2: Map to itself in `src/ai/ranker.ts`
```typescript
// Add to PROFILE_NAME_MAP (line ~15)
'frontend': 'frontend'  // New technical profile
```

#### Step 3: Add to CLI in `src/cli.ts`
```typescript
choices: ['core', 'security', 'event-driven', 'performance', 'devops', 'backend', 'core-net', 'legacy-modernization', 'contract', 'aspnet-simple', 'csharp-azure-no-frontend', 'frontend'] as const,

profile: argv.profile as 'core' | 'security' | 'event-driven' | 'performance' | 'devops' | 'backend' | 'core-net' | 'legacy-modernization' | 'contract' | 'aspnet-simple' | 'csharp-azure-no-frontend' | 'frontend' | undefined,
```

---

## Critical Checklist

Use this checklist when creating any new profile to avoid bugs:

### Type A (Search Profile with Existing Technical Profile)
- [ ] Add Boolean search to `BOOLEAN_SEARCHES` in `src/ai/profiles.ts`
- [ ] Add weight distribution to `PROFILE_WEIGHT_DISTRIBUTIONS` in `src/ai/profiles.ts`
- [ ] **CRITICAL**: Add mapping to `PROFILE_NAME_MAP` in `src/ai/ranker.ts` (maps to existing profile)
- [ ] Add to `choices` array in `src/cli.ts`
- [ ] Add to type assertion in `src/cli.ts`
- [ ] Add to `SearchOptions` interface in `src/commands/search.ts`
- [ ] Add to `SearchOptionsSchema` z.enum() in `src/dashboard/routes/automation.ts`
- [ ] Add to `SearchOptions` interface in `src/dashboard/client/hooks/useAutomation.ts`
- [ ] **CRITICAL UI**: Add to `PROFILE_OPTIONS` array in `src/dashboard/client/components/Automation.tsx`
- [ ] Verify weights sum to 100%
- [ ] Test: `npm run search -- --profile <name>`
- [ ] Optional: Update README.md profiles table and count

### Type B (New Technical + Search Profile)
- [ ] Add technical profile to `PROFILES` in `src/ai/profiles.ts`
- [ ] Add Boolean search to `BOOLEAN_SEARCHES` in `src/ai/profiles.ts`
- [ ] Add weight distribution to `PROFILE_WEIGHT_DISTRIBUTIONS` in `src/ai/profiles.ts`
- [ ] Add mapping to `PROFILE_NAME_MAP` in `src/ai/ranker.ts` (maps to itself)
- [ ] Add to `choices` array in `src/cli.ts`
- [ ] Add to type assertion in `src/cli.ts`
- [ ] Add to `SearchOptions` interface in `src/commands/search.ts`
- [ ] Add to `SearchOptionsSchema` z.enum() in `src/dashboard/routes/automation.ts`
- [ ] Add to `SearchOptions` interface in `src/dashboard/client/hooks/useAutomation.ts`
- [ ] **CRITICAL UI**: Add to `PROFILE_OPTIONS` array in `src/dashboard/client/components/Automation.tsx`
- [ ] Verify PROFILES weights sum to 100%
- [ ] Test: `npm run search -- --profile <name>`
- [ ] Optional: Update README.md with new category weights

---

## Common Mistakes

### 1. Missing PROFILE_NAME_MAP Entry (CRITICAL BUG)
**Error**: "Unknown profile: <name>"  
**Cause**: Profile exists in BOOLEAN_SEARCHES but not mapped in ranker  
**Fix**: Add entry to `PROFILE_NAME_MAP` in `src/ai/ranker.ts`

This was the bug with the "contract" profile. The system couldn't find the technical profile to use for scoring.

### 2. Forgetting CLI Updates
**Error**: Profile doesn't appear in `--help` or autocomplete  
**Cause**: Missing from `choices` array or type assertions  
**Fix**: Update both locations in `src/cli.ts`

### 3. Missing UI Update (CRITICAL BUG)
**Error**: Profile doesn't appear in dashboard dropdown  
**Cause**: Missing from `PROFILE_OPTIONS` array in `src/dashboard/client/components/Automation.tsx`  
**Fix**: Add to `PROFILE_OPTIONS` array with proper format: `{ value: 'profile-name', label: 'Display Name' }`

This is the most common mistake - forgetting to add the profile to the dashboard UI!

### 4. Weight Distribution Doesn't Sum to 100%
**Error**: Warning message about weights not summing to 100%  
**Cause**: `PROFILE_WEIGHT_DISTRIBUTIONS` entries must total 100  
**Fix**: Adjust weights proportionally

### 5. TypeScript Compilation Errors
**Error**: Type errors when building  
**Cause**: Profile name not added to union types  
**Fix**: Add profile to all type assertions in `src/cli.ts`, `src/commands/search.ts`, `src/dashboard/routes/automation.ts`, `src/dashboard/client/hooks/useAutomation.ts`

### 6. Boolean Search Syntax Errors
**Error**: No jobs found or LinkedIn search fails  
**Cause**: Invalid Boolean operators or missing quotes  
**Fix**: Test search manually on LinkedIn first

---

## Testing New Profiles

After creating a profile, run these tests:

```bash
# Basic functionality test
npm run search -- --profile <new-profile-name> --max-pages 1

# Check CLI help
npm run search -- --help

# Verify no compilation errors
npm run build
```

**Expected Results**:
- Profile appears in `--help` output
- Boolean search executes on LinkedIn
- Jobs are found and scored (no "Unknown profile" errors)
- No TypeScript compilation errors
- Weight warnings (if any) are addressed

---

## Architecture Notes

### Why Two Types of Profiles?

**Search profiles** control what jobs you see (Boolean queries for LinkedIn).  
**Technical profiles** control how jobs are scored (keyword matching and weights).

Separating these allows flexibility. For example:
- "contract" and "core-net" both score .NET skills the same way
- But "contract" searches for "Contract OR Contractor" while "core-net" doesn't
- This avoids duplicating technical scoring logic

### Profile Name Mapping

The `PROFILE_NAME_MAP` in `src/ai/ranker.ts` is the bridge:
```typescript
'contract': 'coreNet'  // Search with "contract", score with "coreNet"
'frontend': 'frontend' // Search with "frontend", score with "frontend"
```

**Never skip this step** - it's the most common source of bugs.
