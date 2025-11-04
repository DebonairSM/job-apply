# LinkedIn Scraper Lazy Loading and Navigation Recovery Fix

## Problem

The LinkedIn lead scraper was experiencing a high failure rate (97% in the reported case) with multiple consecutive profiles showing "profile URL not found" errors. This occurred after successfully scraping a profile, particularly when email extraction was involved.

## Root Causes Identified

### 1. LinkedIn Lazy Loading
LinkedIn does not immediately load profile links when search results are rendered. Links are loaded dynamically as cards enter the viewport. The scraper was:
- Waiting only 500ms after scrolling
- Making single attempts to find links
- Not verifying links were actually visible before extraction

### 2. Stale DOM After Navigation
After clicking a profile, extracting data (including from the contact info modal), and navigating back to search results:
- The DOM was in an inconsistent state
- Profile cards existed but links hadn't re-loaded
- The search results container wasn't given time to stabilize

### 3. Modal Close Issues
The contact info modal wasn't consistently closing:
- No verification that the modal actually closed
- Single escape press wasn't always effective
- Navigation back could leave page stuck on overlay

## Solutions Implemented

### Profile Link Extraction Improvements (Latest Update)

**File:** `src/services/lead-scraper.ts` (lines 125-180)

Latest improvements for initial link extraction:
- **Increased attempts**: Now 5 attempts instead of 3
- **Better timing**: Initial wait increased from 1000ms to 1500ms
- **Bidirectional scrolling**: Scrolls down 200px then back up 50px to trigger lazy loading
- **Visual feedback**: Shows retry message after 2nd attempt
- **Aggressive recovery**: Scrolls 300px down, 100px back up on retries with 2s waits
- **Longer retry delays**: 2000ms between attempts (up from 1500ms)

Previous changes:
- Fresh DOM queries on each attempt (avoids stale element issues)
- Waits for link visibility, not just attachment
- Variable scoping fix to allow link reuse for clicking

### Post-Navigation DOM Verification (Latest Update v2)

**File:** `src/services/lead-scraper.ts` (lines 638-710)

Latest improvements - now with three-tier recovery:
- **Tier 1 - Smart retry** (5 attempts):
  - Scrolls back to the next card position after navigation
  - Scrolls down 300px then back up 100px to trigger intersection observers
  - Visual feedback showing retry attempts
  - 2-second waits between attempts
  
- **Tier 2 - Page refresh** (if Tier 1 fails):
  - Reloads the current page
  - Scrolls 400px to trigger lazy loading
  - Verifies links are available after refresh
  
- **Tier 3 - Full navigation** (if Tier 2 fails):
  - Navigates to the search URL again (fresh page load)
  - Waits for search results container
  - Scrolls and verifies links
  - **Breaks out of profile loop if this fails** (prevents cascading failures)

Previous changes:
- Increased navigation wait time from 1500ms to 2000ms
- Waits for search results container to be visible
- Verifies at least one profile card with link exists before continuing

### Modal Close Reliability

**File:** `src/services/lead-scraper.ts` (lines 404-465)

Changes:
- Reordered methods: Escape key first (most reliable), then click button
- Added verification after each close attempt using `.isVisible()`
- Increased wait times from 500ms to 800ms
- Checks multiple button selectors with visibility verification
- Forces navigation back if still on overlay URL
- Final verification that modal is hidden before proceeding

## Results Expected

The changes address all three failure modes plus navigation recovery:
1. **Lazy loading handled** - Multiple attempts with proper timing and viewport triggers
2. **DOM stability ensured** - Verification that search results and links have loaded
3. **Modal cleanup reliable** - Multiple methods with verification at each step
4. **Navigation recovery** - Automatic page refresh and repositioning when links fail to load

Success rate should improve from ~2-3% to 70-90%, with remaining failures limited to:
- Actual missing data (profiles without public URLs)
- Network issues or timeouts
- LinkedIn rate limiting or blocking
- Title filter mismatches

The latest update specifically prevents the cascading failure pattern where:
- Profile 4 succeeds ✅
- Navigation back fails to load links ⚠️
- Profiles 5-10 all fail consecutively ❌

Now when navigation back fails, the scraper will:
1. Try 5 times with progressive scrolling (Tier 1)
2. Refresh the page if that fails (Tier 2)
3. Navigate to the URL again for a fresh load (Tier 3)
4. Skip remaining profiles on the page if all recovery fails (prevents cascading failures)

Initial link extraction also improved:
- 5 attempts instead of 3
- Better scrolling patterns (bidirectional)
- Visual feedback on retries
- Longer wait times (2s between attempts)

## Testing

To test the fixes:

```bash
npm run leads -- scrape --max 10
```

Watch for:
- Reduced "profile URL not found" errors
- Successful extraction after profiles with email
- Proper navigation back to search results
- Clean modal close operations

If issues persist, the diagnostic tool can help identify current selectors:

```bash
npx tsx scripts/diagnose-linkedin-selectors.ts
```

This will test multiple selectors and take a screenshot to `artifacts/linkedin-people-search.png`.

## Configuration

No configuration changes required. The scraper automatically:
- Detects working selectors from a known list
- Adapts to lazy loading with retry logic
- Handles modal close through multiple fallback methods

## Future Improvements

If LinkedIn changes their structure again:
1. Run the diagnostic script to identify new selectors
2. Add new selectors to the lists in `lead-scraper.ts`
3. Consider increasing retry attempts or wait times if network is slow
4. Monitor artifacts/ directory for screenshots of failed states

