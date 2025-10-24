# Profile Creation Guide

This guide documents the process for creating new search profiles in the job application system.

## Overview

Search profiles consist of two main components:
1. **Technical Profiles** (`PROFILES`) - Used for AI scoring and evaluation
2. **Boolean Search Strings** (`BOOLEAN_SEARCHES`) - Used for LinkedIn job searches

## Files That Must Be Updated

When creating a new profile, you must update **4 files**:

### 1. `src/ai/profiles.ts`
- Add new profile to `PROFILES` object with:
  - `name`: Display name
  - `weight`: Percentage weight (must sum to 100% across all profiles)
  - `mustHave`: Required keywords array
  - `preferred`: Nice-to-have keywords array
  - `description`: Brief description
- Add corresponding Boolean search string to `BOOLEAN_SEARCHES` object

### 2. `src/commands/search.ts`
- Update `SearchOptions` interface (line ~11) to include new profile in union type

### 3. `src/cli.ts`
- Update `choices` array (line ~35) to include new profile
- Update type assertion (line ~89) to include new profile

### 4. `README.md`
- Update available profiles list (line ~55)
- Update profile descriptions section (lines ~57-66)
- Update job scoring weights (line ~158)

## Example: Adding a "frontend" Profile

### Step 1: Add to `src/ai/profiles.ts`
```typescript
// In PROFILES object
frontend: {
  name: 'Frontend Development',
  weight: 15,
  mustHave: [
    'React',
    'TypeScript',
    'JavaScript'
  ],
  preferred: [
    'Next.js',
    'Vue.js',
    'Angular',
    'CSS',
    'HTML'
  ],
  description: 'Frontend development with modern frameworks'
},

// In BOOLEAN_SEARCHES object
'frontend': '("Frontend Developer" OR "React Developer" OR "UI Developer") AND (React OR TypeScript OR JavaScript) AND (Frontend OR UI OR UX) AND (Senior OR Lead) AND Remote'
```

### Step 2: Update `src/commands/search.ts`
```typescript
profile?: 'core' | 'security' | 'event-driven' | 'performance' | 'devops' | 'backend' | 'core-net' | 'legacy-modernization' | 'frontend';
```

### Step 3: Update `src/cli.ts`
```typescript
// Line ~35
choices: ['core', 'security', 'event-driven', 'performance', 'devops', 'backend', 'core-net', 'legacy-modernization', 'frontend'] as const,

// Line ~89
profile: argv.profile as 'core' | 'security' | 'event-driven' | 'performance' | 'devops' | 'backend' | 'core-net' | 'legacy-modernization' | 'frontend' | undefined,
```

### Step 4: Update `README.md`
```markdown
Available profiles: `core`, `security`, `event-driven`, `performance`, `devops`, `backend`, `core-net`, `legacy-modernization`, `frontend`

- **`frontend`**: Frontend development roles with React, TypeScript, and modern frameworks

AI evaluates jobs across weighted categories (Core Azure/API Skills 20%, Security 15%, Event-Driven 10%, Performance 10%, DevOps 5%, Seniority 5%, Core .NET Development 20%, Legacy Modernization 10%, Frontend Development 15%). Scores above 70 are queued for application.
```

## Weight Management

**Critical**: Profile weights must sum to exactly 100%. When adding a new profile:
1. Choose appropriate weight for the new profile
2. Reduce weights of existing profiles proportionally
3. Verify total = 100% by checking the warning message

## Testing New Profiles

After creating a profile, test it:
```bash
npm run search -- --profile <new-profile-name>
```

Check for:
- No weight warnings
- Profile appears in CLI help
- Boolean search executes correctly
- Jobs are found and scored appropriately

## Common Mistakes

1. **Forgetting CLI updates** - Profile won't be available in command line
2. **Weight overflow** - System warns if weights don't sum to 100%
3. **TypeScript errors** - Missing union type updates cause compilation errors
4. **Boolean search syntax** - LinkedIn search strings must use proper Boolean operators

## Future Improvements

Consider implementing:
1. **Profile generator script** - Automate file updates
2. **Configuration validation** - Ensure weights sum to 100%
3. **Template system** - Standardize profile creation
4. **Single source of truth** - Generate other files from profiles.ts
