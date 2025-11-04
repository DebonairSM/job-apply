# Profile Performance Calculation Fix

## Problem Identified

The Profile Performance Analytics Net Success Rate was artificially low because the calculation included **skipped jobs** in the denominator. This meant profiles were being penalized for correctly filtering out poor-fit jobs.

### Before Fix
```
Net Success Rate = ((Applied - Rejected + (Interviews × 2)) / Total Jobs Found) × 100
```

**Example**: Legacy Modernization profile
- Total jobs found: 145
- Applied: 16
- Rejected: 15
- Skipped: 114 (not shown but included in total)
- **Net Success Rate: 0.7%** ← Artificially low

The 0.7% success rate was misleading because it included 114 jobs that were correctly filtered out as poor matches.

## Solution Implemented

Changed the denominator to only count **considered jobs** (jobs worth applying to):
- `queued`: Passed fit score threshold, ready to apply
- `applied`: Application submitted
- `rejected`: Application rejected
- `interview`: Moved to interview stage

**Excluded from denominator**:
- `skipped`: Low fit score, correctly filtered
- `reported`: Flagged for manual review

### After Fix
```
Net Success Rate = ((Applied - Rejected + (Interviews × 2)) / Considered Jobs) × 100
```

**Example**: Legacy Modernization profile
- Considered jobs: 31 (queued + applied + rejected + interviews)
- Applied: 16
- Rejected: 15
- **Net Success Rate: 3.2%** ← Accurate representation

The 3.2% success rate accurately reflects performance among jobs that were viable candidates.

## Files Modified

### Backend
- **src/dashboard/routes/analytics.ts**
  - Changed SQL query to count `considered_jobs` separately from `total_jobs_found`
  - Updated calculation to use `considered_jobs` as denominator
  - Added `total_jobs_found` to response for transparency

### Frontend
- **src/dashboard/client/lib/types.ts**
  - Added `total_jobs_found` field to `ProfileAnalytic` interface
  - Added comments clarifying field meanings

- **src/dashboard/client/components/ProfilePerformanceChart.tsx**
  - Updated display to show: "X considered (Y found, Z skipped)"
  - Changed "Total Jobs Found" label to "Jobs Considered (excl. skipped)"
  - Updated legend to include formula with "Considered Jobs" denominator

### Documentation
- **docs/PROFILE_PERFORMANCE_ANALYTICS.md**
  - Updated formula documentation
  - Added field descriptions
  - Updated example results showing before/after comparison
  - Clarified UI features

## Impact

This fix provides more accurate and actionable metrics:

1. **True Success Rate**: Shows actual conversion rate among viable opportunities
2. **No Penalty for Good Filtering**: Profiles aren't penalized for skipping poor matches
3. **Better Decision Making**: Users can identify which profiles find the best jobs
4. **Transparency**: UI shows both considered and total jobs, making the calculation clear

## Expected Results

Success rates will be higher and more realistic:
- Before: 0.7% (discouraging, misleading)
- After: 3.2% (realistic, actionable)

Profiles with good filtering (high skip rate of poor matches) will now show their true effectiveness among jobs that actually met the criteria.

