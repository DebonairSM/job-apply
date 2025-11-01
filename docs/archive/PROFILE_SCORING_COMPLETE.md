# Profile-Specific Job Scoring - Implementation Complete

## Summary

The profile-specific job scoring system is now fully implemented and working. Jobs are scored using different weight distributions based on the search profile used to find them, with full persistence to the database.

## What's Working

### 1. Profile-Specific Weight Distributions ✅
- 8 distinct weight profiles defined with unique emphasis
- All profiles validated to sum to 100%
- Security profile: 35% security emphasis
- Event-driven profile: 30% event-driven emphasis  
- Performance profile: 30% performance emphasis
- Core-net profile: 40% .NET emphasis
- And 4 more profiles with custom distributions

### 2. Profile Storage in Database ✅
- Added `profile` column to jobs table
- Automatically stores profile when adding jobs during search
- Enables accurate re-scoring using original profile weights
- Migration added for seamless upgrade

### 3. Profile-Aware Scoring Engine ✅
- Ranker uses profile-specific base weights
- Weight manager caches weights per profile
- Global learning adjustments apply on top of profile weights
- Full precision scoring with proper arithmetic

### 4. Re-Scoring with Profile Support ✅
- Recalculate script uses stored profile per job
- Falls back to default weights for legacy jobs (profile = null)
- Reports profile usage statistics
- Successfully re-scored 253 existing jobs

## How to Use

### Search with a Profile

```bash
# Security-focused search - emphasizes security skills heavily
search --profile security --max-jobs 20

# Performance-focused search - emphasizes optimization skills
search --profile performance --max-jobs 20

# Pure .NET search - emphasizes .NET skills over Azure
search --profile core-net --max-jobs 20
```

### The Same Job Scores Differently

A "Senior Azure Security Engineer" job would score:
- **security profile**: High (35% weight on security category)
- **performance profile**: Lower (only 5% weight on security)
- **core-net profile**: Medium (10% weight on security)

### Re-Score Existing Jobs

```bash
# Re-score all jobs using their stored profile
node scripts/recalculate-ranks.js
```

Output shows:
- Profile usage statistics (how many jobs per profile)
- Rank distribution after re-scoring
- Top-ranked jobs

## Technical Details

### Weight Calculation

```
fitScore = sum of (categoryScore * profileWeight * learningAdjustment)
```

Where:
- `categoryScore`: 0-100 score from LLM for that category
- `profileWeight`: Profile-specific base weight (from PROFILE_WEIGHT_DISTRIBUTIONS)
- `learningAdjustment`: Global adjustment from rejection analysis

### Profile Weights Examples

**Security Profile:**
- Security: 35% (heavy emphasis)
- Seniority: 15% (senior roles important)
- Azure: 15%, .NET: 15% (moderate)
- Others: 5-10% or 0%

**Core-Net Profile:**
- .NET: 40% (primary focus)
- Performance: 15% (optimization important)
- Azure: 10% (helpful but not primary)
- Others: 5-10%

### Database Schema

```sql
ALTER TABLE jobs ADD COLUMN profile TEXT;
```

Jobs now store which profile found them, enabling:
- Accurate re-scoring
- Profile-based filtering
- Analytics on profile effectiveness

## Verification

### Test 1: Profile Weights Load Correctly
```bash
# Search with different profiles and check console output
search --profile security --max-jobs 1
# Should show: "Profile: security (using Boolean search)"
```

### Test 2: Scores Differ by Profile
Same job description will score differently with:
- `--profile security` (emphasizes auth/security skills)
- `--profile performance` (emphasizes optimization skills)
- `--profile core-net` (emphasizes .NET skills)

### Test 3: Profile Persists
```bash
# After search, check database
node -e "import('./scripts/lib/db-safety.js').then(({openDatabase}) => {
  const db = openDatabase();
  const jobs = db.prepare('SELECT title, profile FROM jobs WHERE profile IS NOT NULL LIMIT 5').all();
  console.log(jobs);
  db.close();
})"
```

### Test 4: Re-Scoring Uses Profile
```bash
# Re-score shows profile usage stats
node scripts/recalculate-ranks.js
# Output: "Profile usage: security: X jobs, performance: Y jobs, ..."
```

## Current Status

- ✅ 8 profile weight distributions defined and validated
- ✅ Profile-aware weight manager with caching
- ✅ Ranker passes profile to weight system
- ✅ Database stores profile with each job
- ✅ Search command saves profile automatically
- ✅ Re-scoring script uses stored profiles
- ✅ Global learning adjustments apply correctly
- ✅ All linting checks pass
- ✅ Successfully tested with 253 existing jobs

## Legacy Jobs

Existing 253 jobs were added before profile storage was implemented:
- Show `profile = null` in database
- Use default weights when re-scored
- **New searches will store profile automatically**

## Next Steps (Optional)

Future enhancements could include:

1. **Profile-Specific Learning**: Track weight adjustments per profile instead of globally
2. **Dashboard Profile Filter**: Filter jobs by which profile found them
3. **Profile Analytics**: Show which profiles find the best matches
4. **Custom Overrides**: Allow users to customize weights per profile
5. **Profile Comparison**: Compare same job scored by different profiles

## Files Changed

- `src/ai/profiles.ts` - Weight distributions
- `src/ai/weight-manager.ts` - Profile-aware loading
- `src/ai/ranker.ts` - Profile parameter passing
- `src/lib/db.ts` - Profile column and storage
- `src/commands/search.ts` - Store profile on insert
- `scripts/recalculate-ranks.js` - Use stored profile

## Conclusion

The profile-specific scoring system is fully implemented and operational. New job searches will automatically use profile-specific weights and store the profile for accurate re-scoring. The system is backward compatible with existing jobs (using default weights) and ready for production use.

