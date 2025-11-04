# LinkedIn Leads Scraper Selector Fix

## Issue

The leads scraper was finding 0 profiles when running `npm run cli -- leads:search`. The scraper would successfully navigate to the LinkedIn People Search page but fail to locate any profile cards.

## Root Cause

LinkedIn changed their DOM structure, and the hardcoded selector `li.reusable-search__result-container` no longer matched any elements on the page. This is a common issue with web scraping as platforms frequently update their UI.

## Solution

Implemented a multi-pronged fix to make the scraper more resilient:

### 1. Dynamic Selector Detection

Updated the scraper to try multiple selectors in priority order:

```typescript
const selectorsToTry = [
  'div.search-results-container ul > li',  // Current working selector
  '.search-results-container li',          // Fallback
  'li.reusable-search__result-container'   // Legacy
];
```

The scraper now:
- Tests each selector to find elements
- Validates that elements have profile links (`a[href*="/in/"]`)
- Uses the first selector that finds valid profile cards
- Logs which selector is being used for debugging

### 2. Fresh Element Queries

Changed from storing a locator to storing the selector string and re-querying elements fresh on each iteration. This prevents "stale element" errors that occur when the DOM changes during scraping:

```typescript
// Before: const card = resultCards.nth(i);
// After: const card = page.locator(bestSelector).nth(i);
```

### 3. Improved Content Loading Wait

Added explicit wait for profile links to be attached to the DOM, handling LinkedIn's lazy-loading behavior:

```typescript
await profileLink.waitFor({ state: 'attached', timeout: 3000 });
```

### 4. Removed Brittle Visibility Check

Removed the pre-scroll visibility check that was incorrectly failing for cards that weren't yet scrolled into view. The check now happens after scrolling if needed.

## Diagnostic Tools Created

Created two diagnostic scripts to help identify correct selectors when LinkedIn changes their UI:

### `scripts/diagnose-linkedin-selectors.ts`
- Tests multiple potential selectors
- Reports which ones find elements
- Validates that elements have required data (profile links, names)
- Takes screenshot for manual inspection
- Reports page structure details

### `scripts/quick-selector-test.ts`
- Analyzes the container structure
- Inspects child element characteristics
- Recommends optimal selectors
- Shows which elements have profile links

Run with:
```bash
npx tsx scripts/diagnose-linkedin-selectors.ts
npx tsx scripts/quick-selector-test.ts
```

## Current LinkedIn Structure

As of November 2025, LinkedIn People Search uses:

- Container: `div.search-results-container ul` 
  - Class: `zOcczHNRriPSKKGkmllQcjCtULqykAE list-style-none`
- Profile cards: `<li>` direct children
  - Class: `jGvLFDTpXxxmBTUnfPqaOgFuZxaXNuRhkg`
  - Some `<li>` elements are ads/separators without profile links (expected)
- Profile links: `a[href*="/in/"]` within each card

## Testing Results

After the fix:
- Successfully detects 10-12 profile cards per page
- Correctly extracts profiles with links
- Properly skips ad/separator elements without links
- No more "0 profiles found" errors
- Processes multiple profiles successfully:
  - Run #5: Added 1 new lead, skipped 3 existing, skipped 6 non-profile elements

## Future Maintenance

When LinkedIn changes their UI again:

1. Run the diagnostic scripts to identify new selectors
2. Add the new working selector to the `selectorsToTry` array (at the top)
3. Keep old selectors as fallbacks
4. Update this document with new structure details

The multi-selector approach ensures the scraper continues working even when some selectors become outdated, providing graceful degradation rather than complete failure.

## Files Modified

- `src/services/lead-scraper.ts` - Main scraper logic with dynamic selector detection
- `scripts/diagnose-linkedin-selectors.ts` - Diagnostic tool (new)
- `scripts/quick-selector-test.ts` - Structure analysis tool (new)

