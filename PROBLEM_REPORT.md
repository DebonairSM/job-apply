# Problem Report: Missing Job in Dashboard UI

## Summary
The job "Sr API (.NET) Developer at FPT Americas" (LinkedIn ID: 4319600209) is correctly saved in the database but is not visible in the dashboard UI when no filters are applied.

## Database Verification
✅ **Job exists in database:**
- Job ID: `4a99a850e760303de380d947ad895269` (MD5 hash of URL)
- Title: Sr API (.NET) Developer
- Company: FPT Americas
- Status: `queued`
- Rank: 77.18612113837214
- Easy Apply: Yes
- Profile: `core-net`
- Created: 2025-10-30T18:30:14.306Z
- URL: https://www.linkedin.com/jobs/view/4319600209

## Root Cause

The job is **beyond the pagination limit** when querying without status filters.

### Problem Details:

1. **API Query Behavior:**
   - Dashboard API endpoint: `GET /jobs?limit=100&offset=0`
   - Query uses: `ORDER BY rank DESC, created_at DESC`
   - Default limit: **100 jobs**

2. **Job Position in Results:**
   - **Without status filter:** Position **153 of 786** total jobs
   - **With status='queued' filter:** Position **21 of 122** queued jobs

3. **Why It's Missing:**
   - When the dashboard loads with no filters, it queries all jobs sorted by rank
   - The job at position 153 is beyond the first 100 results
   - API pagination limits results to first 100 entries (positions 0-99)
   - Therefore, the job is not returned to the UI

4. **Why It Works with Status Filter:**
   - When filtering by `status='queued'`, only 122 queued jobs exist
   - The job is at position 21, which is within the first 100
   - Therefore, it appears when filtering by status

## Affected Code Locations

1. **API Route:** `src/dashboard/routes/jobs.ts`
   - Line 8: Default limit is 50, but dashboard uses 100
   - Line 17-19: Pagination logic slices results

2. **Frontend Hook:** `src/dashboard/client/components/JobsList.tsx`
   - Line 43: Hardcoded `limit: 100`

3. **Backend Query:** `src/lib/db.ts`
   - Line 519: `ORDER BY rank DESC, created_at DESC` - correct sorting

## Verification Steps Performed

1. ✅ Verified job exists in database by ID
2. ✅ Verified job exists in database by URL  
3. ✅ Confirmed job has correct status (`queued`) and rank (77.18)
4. ✅ Simulated API query and confirmed position 153 in unfiltered results
5. ✅ Confirmed position 21 in queued-only results
6. ✅ Verified API pagination limit is 100

## Impact

- **Low Priority Issue:** Job is correctly saved and accessible
- **User Impact:** Job not visible in default dashboard view
- **Workaround:** User can filter by status='queued' to see the job
- **Data Integrity:** No data loss - job is safely stored

## Recommendations

The issue is a **pagination limitation**, not a data integrity problem. Options to address:

1. **Increase default limit** (quick fix, but may impact performance)
2. **Implement proper pagination UI** (next/previous buttons, page numbers)
3. **Change default view** to show only `queued` jobs by default
4. **Add infinite scroll** to load more jobs as user scrolls
5. **Add search/filter by URL** for direct job lookup

## Additional Notes

- The job ranking and save logic is working correctly
- The search command successfully processed and queued the job
- Database schema and constraints are correct
- No duplicate entries found
- Job is properly indexed and queryable

