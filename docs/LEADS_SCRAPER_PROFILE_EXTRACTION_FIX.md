# Leads Scraper Profile Extraction Fix

## Problem
The leads scraper was not extracting title, company, and location information for LinkedIn profiles. All leads showed `-` for these fields in the dashboard.

## Root Cause
The scraper was attempting to extract title, company, and location from the LinkedIn **search result cards** using CSS selectors like:
- `div.t-14.t-black` for title
- `div.t-14.t-normal` for location

These selectors are outdated and no longer match LinkedIn's current HTML structure. LinkedIn frequently changes their DOM structure, making search result card selectors unreliable.

## Solution
Updated `src/services/lead-scraper.ts` to extract title, company, and location from the **profile page itself** (after clicking through) instead of from search result cards.

### Changes Made

**Before:**
1. Extract name from search card
2. Try to extract title/company/location from search card (failing)
3. Click into profile page
4. Extract about section and email from profile page
5. Save lead

**After:**
1. Extract name from search card
2. Click into profile page
3. Extract title/company/location from profile page
4. Extract about section and email from profile page
5. Save lead

### New Selectors for Profile Page

**Title:**
- `div.text-body-medium.break-words` (current LinkedIn structure)
- `.pv-top-card--list-bullet li:first-child`
- `h2.mt1.t-18.t-black.t-normal`
- `.pv-top-card-section__headline`

**Company:**
- Extracted from title if it contains " at " separator
- Fallback to experience section: `section[data-section="currentPositionsDetails"] li a`
- `.pv-entity__secondary-title`
- `ul.pv-top-card--list-bullet li span.text-body-small`

**Location:**
- `span.text-body-small.inline.t-black--light.break-words` (current LinkedIn structure)
- `.pv-top-card--list-bullet li:last-child span`
- `span.t-16.t-black.t-normal`
- `.pv-top-card-section__location`

## Benefits
1. More reliable data extraction from profile pages
2. Better quality information (profile pages have more complete data)
3. Consistent with how about section and email are already extracted
4. Easier to debug and update selectors when LinkedIn changes their structure

## Testing
To test the fix:
1. Run the leads scraper: `npm run scrape-leads`
2. Check the dashboard at `https://localhost:3000` > Leads tab
3. Verify that title, company, and location fields are populated for new leads

## Notes
- This change makes the scraper slightly slower (already clicking into profiles, so no additional overhead)
- Title filtering still works and now filters based on profile page data
- The scraper navigates back to search results after filtering out a profile by title
- LinkedIn's HTML structure may change in the future; selectors include multiple fallbacks

## Related
- Database schema includes title, company, location fields (lines 375-377 in `src/lib/db.ts`)
- Lead interface in `src/lib/db.ts` (lines 1879-1891)
- Dashboard display in `src/dashboard/client/components/LeadDetail.tsx`

