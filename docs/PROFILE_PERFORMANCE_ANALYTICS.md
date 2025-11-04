# Profile Performance Analytics

## Overview

The Profile Performance Analytics feature helps identify which search profiles are finding the best job opportunities by tracking success metrics that account for both positive outcomes (applications, interviews) and negative outcomes (rejections).

## Key Metric: Net Success Rate

The core metric is **Net Success Rate**, calculated as:

```
Net Success Rate = ((Applied - Rejected + (Interviews × 2)) / Considered Jobs) × 100
```

Where **Considered Jobs** includes only jobs with status: `queued`, `applied`, `rejected`, or `interview`.
Jobs with status `skipped` (low fit score) are excluded from the denominator.

This formula:
- Adds points for successful applications
- Subtracts points for rejections (addressing the problem of high-scoring profiles with many rejections)
- Double-counts interviews (strongest positive signal)
- Only counts jobs that were worth applying to (excludes skipped jobs)
- Shows true profile quality among viable opportunities

A negative net success rate indicates a profile is generating more rejections than successful applications.

## Implementation

### Backend API

**Endpoint**: `GET /api/analytics/profiles`

**Response Format**:
```json
{
  "profiles": [
    {
      "profile_key": "aspnet-simple",
      "profile_name": "ASP.NET Simple",
      "total_jobs": 31,
      "total_jobs_found": 113,
      "queued": 0,
      "applied": 7,
      "rejected": 4,
      "interviews": 0,
      "avg_fit_score": 48,
      "net_success_rate": 9.7,
      "application_rate": 6.2
    }
  ]
}
```

**Field Descriptions**:
- `total_jobs`: Considered jobs (queued/applied/rejected/interview) - denominator for net success rate
- `total_jobs_found`: All jobs found including skipped ones
- `application_rate`: Applied / Total Jobs Found (shows filtering effectiveness)

**Files Modified**:
- `src/dashboard/routes/analytics.ts` - Added `/profiles` endpoint with profile name mapping

### Frontend Components

**New Files**:
- `src/dashboard/client/hooks/useProfileAnalytics.ts` - React Query hook with 5-second auto-refresh
- `src/dashboard/client/components/ProfilePerformanceChart.tsx` - Visual chart component

**Modified Files**:
- `src/dashboard/client/lib/types.ts` - Added `ProfileAnalytic` and `ProfileAnalyticsResponse` types
- `src/dashboard/client/lib/api.ts` - Added `getProfileAnalytics()` method
- `src/dashboard/client/components/Dashboard.tsx` - Integrated profile performance section

### UI Features

The Profile Performance section displays:
- Profiles sorted by net success rate (best performers first)
- Four metrics per profile:
  1. **Net Success Rate** - Color-coded bar (green for positive, red for negative)
  2. **Average Fit Score** - Purple bar showing job match quality
  3. **Jobs Considered** - Gray bar showing viable opportunities (excludes skipped)
  4. **Application Rate** - Blue bar showing percentage of FOUND jobs applied to (filtering effectiveness)
- Detailed statistics showing:
  - Considered jobs vs total jobs found (with skipped count)
  - Applied, rejected, and interview counts
- Legend explaining the metrics and formula

## Usage

Navigate to the dashboard homepage at `http://localhost:3000` (or `https://localhost:3000` if HTTPS is configured).

The Profile Performance section appears after the Application Activity section and automatically refreshes every 5 seconds.

## Profile Name Mapping

The following profile keys are mapped to friendly display names:

- `core` → Core Azure API
- `backend` → Backend/API
- `core-net` → .NET Development
- `legacy-modernization` → Legacy Modernization
- `contract` → Contract Roles
- `aspnet-simple` → ASP.NET Simple
- `csharp-azure-no-frontend` → C# Azure (No Frontend)
- `az204-csharp` → AZ-204 C#
- `ai-enhanced-net` → AI-Enhanced .NET
- `legacy-web` → Legacy Web

## Example Results

Based on actual data (before/after the fix to exclude skipped jobs):

**Before Fix** (skipped jobs included in denominator):
- Legacy Modernization: 0.7% net success (16 applied - 15 rejected) / 145 total jobs
- This was artificially low because ~114 jobs were skipped

**After Fix** (skipped jobs excluded):
- Legacy Modernization: 3.2% net success (16 applied - 15 rejected) / 31 considered jobs
- More accurate representation of success rate among viable opportunities

The fix ensures profiles are evaluated based only on jobs that met the fit score threshold, not penalized for correctly filtering out poor matches.

## Technical Notes

- Data is queried from the `jobs` table, grouped by the `profile` column
- Only jobs with a non-null profile value are included
- Results are sorted by net success rate in descending order
- All metrics are rounded to one decimal place for display
- The component uses Tailwind CSS for styling with no external chart libraries
- Auto-refresh is handled by TanStack Query's `refetchInterval` option

