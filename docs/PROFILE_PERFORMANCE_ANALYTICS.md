# Profile Performance Analytics

## Overview

The Profile Performance Analytics feature helps identify which search profiles are finding the best job opportunities by tracking success metrics that account for both positive outcomes (applications, interviews) and negative outcomes (rejections).

## Key Metric: Net Success Rate

The core metric is **Net Success Rate**, calculated as:

```
Net Success Rate = ((Applied - Rejected + (Interviews × 2)) / Total Jobs) × 100
```

This formula:
- Adds points for successful applications
- Subtracts points for rejections (addressing the problem of high-scoring profiles with many rejections)
- Double-counts interviews (strongest positive signal)
- Shows true profile quality, not just volume

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
      "total_jobs": 113,
      "queued": 0,
      "applied": 7,
      "rejected": 4,
      "interviews": 0,
      "avg_fit_score": 48,
      "net_success_rate": 2.7,
      "application_rate": 6.2
    }
  ]
}
```

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
  3. **Total Jobs Found** - Gray bar showing search volume
  4. **Application Rate** - Blue bar showing percentage of jobs applied to
- Detailed statistics showing applied, rejected, and interview counts
- Legend explaining the metrics

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

Based on actual data:

1. **ASP.NET Simple** (2.7% net success) - Best performer with 7 applications and 4 rejections from 113 jobs
2. **Legacy Web** (2.4% net success) - Second best with 4 applications and 2 rejections from 83 jobs
3. **C# Azure (No Frontend)** (-4.7% net success) - Poor performer with 2 applications but 8 rejections from 127 jobs
4. **Core Azure API** (-5% net success) - High volume (200 jobs) but 68 applications vs 78 rejections

This demonstrates how the net success rate correctly penalizes profiles that generate many rejections, even if they have high fit scores.

## Technical Notes

- Data is queried from the `jobs` table, grouped by the `profile` column
- Only jobs with a non-null profile value are included
- Results are sorted by net success rate in descending order
- All metrics are rounded to one decimal place for display
- The component uses Tailwind CSS for styling with no external chart libraries
- Auto-refresh is handled by TanStack Query's `refetchInterval` option

