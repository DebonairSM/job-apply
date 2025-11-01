# Profile-Specific Job Scoring

## Overview

Implemented profile-specific weight distributions so that different search profiles (security, event-driven, performance, etc.) score jobs with different emphasis on skill categories. This allows more accurate job matching based on the specific role type being searched for.

## What Changed

### 1. Profile Weight Distributions

Added `PROFILE_WEIGHT_DISTRIBUTIONS` in `src/ai/profiles.ts` that defines custom weight distributions for each of the 8 search profiles:

- **core**: Balanced Azure (25%) and .NET (20%) with event-driven (15%)
- **security**: Heavy security focus (35%), reduced other categories
- **event-driven**: Primary focus on messaging/events (30%), performance (15%)
- **performance**: Optimization focus (30%), strong .NET (20%)
- **devops**: Development skills (25% .NET), Azure platform (20%)
- **backend**: Strong .NET backend (25%), balanced Azure/security/event-driven
- **core-net**: Pure .NET development (40%), less Azure dependency
- **legacy-modernization**: Modernization emphasis (20%), senior experience (15%)

All weight distributions validate to 100% at startup.

### 2. Profile-Aware Weight Management

Updated `src/ai/weight-manager.ts`:
- `getActiveWeights()` now accepts optional `profileKey` parameter
- Uses profile-specific base weights from `PROFILE_WEIGHT_DISTRIBUTIONS`
- Falls back to default weights if no profile specified
- Profile-aware caching using Map<profileKey, weights>
- Global learning adjustments still apply across all profiles

### 3. Ranker Integration

Updated `src/ai/ranker.ts`:
- `generateProfileScoringCriteria()` passes profile to `getActiveWeights()`
- Final score calculation uses profile-specific weights
- Each job scored according to its search profile's emphasis

### 4. Re-Scoring Script

Updated `scripts/recalculate-ranks.js`:
- Includes all 8 profile weight distributions
- Uses default weights for existing jobs (profile column doesn't exist in database yet)
- Successfully re-scored 253 jobs with learning adjustments applied

## How It Works

### Search Flow

1. User runs search with profile: `search --profile security`
2. Boolean search finds security-focused jobs
3. Each job is ranked using security profile weights (Security 35%, Seniority 15%, Azure 15%, .NET 15%, etc.)
4. Jobs with strong security skills score higher
5. Same job would score differently if searched with performance profile

### Weight Calculation

```
fitScore = (coreAzure * weight_coreAzure) + (security * weight_security) + ... 
```

Where weights come from:
1. Base weights from `PROFILE_WEIGHT_DISTRIBUTIONS[profileKey]`
2. Plus global learning adjustments from rejection analysis
3. Normalized to ensure total = 100%

### Learning System

Learning adjustments remain global and affect all profiles:
- If rejections indicate "too junior" → increase seniority weight globally
- If rejections indicate "lacking security" → increase security weight globally
- Adjustments apply on top of profile-specific base weights

## Example Score Differences

Same job for "Senior Azure Security Engineer" would score:

- **security profile**: High score (35% weight on security category)
- **performance profile**: Lower score (only 5% weight on security category)
- **core-net profile**: Medium score (10% weight on security category)

This ensures jobs are ranked appropriately for the type of role being searched.

## Database Schema

The `jobs` table now includes a `profile` column that stores which search profile was used to find each job. This enables:
- Accurate re-scoring using the original profile's weights
- Filtering jobs by profile in the dashboard
- Analytics on which profiles find the best matches

Existing jobs (before this update) show `profile = null` and use default weights when re-scored.

## Current Limitations

1. **Global Learning**: Learning adjustments affect all profiles equally. Could be enhanced to track profile-specific learning (e.g., security profile learns separately from performance profile).

2. **Legacy Jobs**: Jobs added before this implementation don't have profile data and use default weights for re-scoring. New searches automatically store the profile.

## Testing

To verify profile-specific scoring works:

1. Search with different profiles for same keywords
2. Check that jobs rank differently based on profile
3. Verify weight distributions sum to 100% (validated at startup)
4. Run re-scoring script to ensure calculation logic correct

## Files Modified

- `src/ai/profiles.ts` - Added PROFILE_WEIGHT_DISTRIBUTIONS with 8 profile-specific weight sets
- `src/ai/weight-manager.ts` - Profile-aware weight loading and caching with Map-based cache
- `src/ai/ranker.ts` - Pass profile parameter to getActiveWeights() in both places
- `src/lib/db.ts` - Added profile column to Job interface, migration, INSERT and UPDATE statements
- `src/commands/search.ts` - Store profile when adding jobs to database
- `scripts/recalculate-ranks.js` - Use job's stored profile for accurate re-scoring with profile stats reporting

## Future Enhancements

1. Implement profile-specific learning (separate adjustment history per profile)
2. Add dashboard visualization of profile-specific weight distributions showing how each profile emphasizes different categories
3. Allow custom weight overrides per profile via configuration file
4. Add profile filter to dashboard to see jobs by search profile
5. Analytics on which profiles find the highest-scoring matches

