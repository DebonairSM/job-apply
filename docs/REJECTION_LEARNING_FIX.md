# Rejection Learning System Fix

## Issue
The rejection learning system was crashing with a SQLite constraint error:
```
Error in rejection learning analysis: SqliteError: NOT NULL constraint failed: weight_adjustments.old_weight
    at saveWeightAdjustment (C:\git\job-apply\src\lib\db.ts:1145:6)
    at applyWeightAdjustment (C:\git\job-apply\src\ai\weight-manager.ts:96:3)
```

## Root Cause
The `applyWeightAdjustment` function in `src/ai/weight-manager.ts` was attempting to adjust weights for categories without checking if the category existed in the current weight distribution. When a category was not found in the `currentWeights` object, `oldWeight` would be `undefined`, causing the database insert to fail due to the NOT NULL constraint on the `old_weight` column.

## Potential Causes
1. **LLM returning invalid categories**: The LLM might suggest adjustments for categories that don't exist in the profile system
2. **Profile-specific category absence**: Some profiles might not include all categories (though investigation showed all profiles have all 9 categories)
3. **Missing category in LLM prompt**: The `frontendFrameworks` category was missing from the list of available categories in the LLM prompt

## Changes Made

### 1. Added Guard Check in Weight Manager
**File**: `src/ai/weight-manager.ts`

Added a guard check to validate that the category exists before attempting to save the weight adjustment:

```typescript
// Guard: Skip if category doesn't exist in current weights
if (oldWeight === undefined) {
  console.error(`⚠️  Cannot adjust unknown category: ${category} - skipping adjustment`);
  console.error(`   Available categories: ${Object.keys(currentWeights).join(', ')}`);
  console.error(`   This may indicate a mismatch between rejection analyzer categories and profile categories`);
  return;
}
```

This prevents the crash and provides detailed logging to help diagnose if the issue occurs again.

### 2. Fixed LLM Prompt
**File**: `src/ai/rejection-analyzer.ts`

Added the missing `frontendFrameworks` category to the LLM prompt:

**Before**:
```
Available categories: coreAzure, security, eventDriven, performance, devops, seniority, coreNet, legacyModernization
```

**After**:
```
Available categories: coreAzure, security, eventDriven, performance, devops, seniority, coreNet, frontendFrameworks, legacyModernization
```

## Valid Category Names
All weight adjustments must use one of these 9 categories defined in `src/ai/profiles.ts`:

1. `coreAzure` - Azure platform services (API Management, Functions, Service Bus, etc.)
2. `security` - Authentication, authorization, governance
3. `eventDriven` - Event-driven architecture and messaging
4. `performance` - Performance optimization and observability
5. `devops` - DevOps practices and CI/CD
6. `seniority` - Seniority level and remote work preferences
7. `coreNet` - .NET development skills
8. `frontendFrameworks` - Frontend framework preferences (Blazor, React)
9. `legacyModernization` - Legacy system modernization

## Profile Weight Distributions
Each profile in `PROFILE_WEIGHT_DISTRIBUTIONS` includes all 9 categories with weights that sum to 100%. The weight adjustments from the rejection learning system are applied as deltas to these base weights.

## Database Schema
The `weight_adjustments` table stores historical weight changes:

```sql
CREATE TABLE IF NOT EXISTS weight_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_category TEXT NOT NULL,
  old_weight REAL NOT NULL,  -- Must not be NULL
  new_weight REAL NOT NULL,
  reason TEXT NOT NULL,
  rejection_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

## Testing
To verify the fix works correctly:

1. Trigger a rejection with a reason that would cause weight adjustments
2. Check that no SQLite constraint errors occur
3. If an unknown category is attempted, verify that:
   - The error is logged with details
   - The adjustment is skipped
   - The system continues processing other rejections

## Future Improvements
1. Add validation to ensure LLM responses only include valid categories
2. Consider creating a shared constant for valid category names to prevent drift
3. Add unit tests for weight adjustment edge cases
4. Consider making category validation more strict by checking against PROFILES keys

