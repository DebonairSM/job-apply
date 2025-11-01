# Rejection Learning Data Missing - Diagnosis and Fix

## Issue

The rejection learning system shows:
- 71 total rejections analyzed
- Only 1 weight adjustment (Seniority +2.0%)
- Only 4 rejection patterns (all count=1)
- Only 1 learning history entry

This is unexpectedly low given 71 rejections.

## Root Cause

The rejection learning tables (`rejection_patterns` and `weight_adjustments`) were cleared or reset at some point, likely during testing or development. The system only contains learning data from the 3-4 most recent rejections (Oct 25, 2025 16:23-16:25).

### Evidence

Analysis of the database revealed:
- **67 out of 71 rejections** have rejection reasons (should trigger learning)
- **63 rejections occurred before Oct 25 16:20** - all with reasons
- **Learning data only exists from Oct 25 16:25:31** (after most rejections)
- The rejection learning system is event-driven (only analyzes NEW rejections)

This means 63+ rejections with detailed reasons were never analyzed by the learning system.

## How the Learning System Works

The rejection learning system is triggered automatically when:
1. A job status is updated to 'rejected'
2. A rejection reason is provided
3. The `updateJobStatus()` function calls `analyzeAndLearnFromRejection()`

This means:
- **New rejections**: Automatically analyzed when marked as rejected
- **Existing rejections**: Never re-analyzed (event already passed)

## Solution: Backfill Learning Data

Run the backfill script to re-analyze all existing rejections:

```bash
node scripts/backfill-rejection-learning.js
```

### What the Backfill Script Does

1. Finds all jobs with status='rejected' and a rejection_reason
2. Re-analyzes each rejection using the LLM
3. Saves patterns to `rejection_patterns` table
4. Applies weight adjustments to `weight_adjustments` table
5. Provides progress updates and final statistics

### Expected Results After Backfill

With 67 rejections containing reasons, you should see:
- **Multiple weight adjustments**: Various categories adjusted based on rejection patterns
- **Many rejection patterns**: Keyword patterns extracted from rejection reasons (seniority, tech stack, location, etc.)
- **Learning history**: Full history of adjustments over time
- **Active adjustments**: Summary of cumulative weight changes per category

### Notes

- The script processes rejections chronologically (oldest first) to preserve the learning timeline
- A 500ms delay between analyses prevents overwhelming the LLM
- Errors for individual rejections won't stop the entire process
- The script is idempotent - patterns are deduplicated by type+value, adjustments are cumulative

## Prevention

To prevent this in the future:

1. **Don't manually clear learning tables** unless intentionally resetting
2. **Use reset scripts carefully**:
   - `scripts/reset-jobs.js` - Only resets job statuses (safe)
   - Don't clear `rejection_patterns` or `weight_adjustments` unless intended
3. **Test with separate database** during development
4. **Backup learning data** before major changes

## Testing the Backfill

After running the backfill script:

1. Open the dashboard
2. Navigate to the Learning Panel
3. Verify the counts make sense:
   - Weight Adjustments: Should be > 10 with 67 rejections
   - Rejection Patterns: Should be > 20 with various patterns
   - Learning History: Should show chronological learning events
   - Active Weight Adjustments: Should show multiple categories adjusted

## Related Files

- `scripts/backfill-rejection-learning.js` - Backfill script
- `src/lib/db.ts` - `updateJobStatus()` and `analyzeAndLearnFromRejection()`
- `src/ai/rejection-analyzer.ts` - Rejection analysis logic
- `src/ai/weight-manager.ts` - Weight adjustment logic
- `src/dashboard/routes/analytics.ts` - Learning statistics API

