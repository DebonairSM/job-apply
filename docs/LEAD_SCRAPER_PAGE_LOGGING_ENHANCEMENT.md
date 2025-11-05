# Lead Scraper Page Logging Enhancement

## Issue

During LinkedIn profile scraping runs, users saw low profile counts (e.g., "10 profiles across 20 pages") without understanding why. The scraper would show:
- Pages Processed: 20
- Profiles Processed: 10
- Success Rate: 0%

This made it unclear whether:
1. The scraper was failing to extract profiles
2. LinkedIn was showing mostly ads/non-profile cards
3. All found profiles were duplicates

## Root Cause

LinkedIn search result pages contain a mix of:
- **Profile cards** with valid LinkedIn URLs
- **Promoted/sponsored content**
- **Group suggestions**
- **"People you may know" cards** (without direct profile links)
- **Loading placeholders**
- **Other non-profile content**

The scraper was correctly processing all cards but only counting those with valid, extractable profile URLs as "Profiles Processed". Cards without profile links were silently skipped with minimal logging.

## Solution

Added per-page summary logging to show the breakdown of:
- Total cards found on the page
- Valid profiles extracted (with profile URLs)
- Duplicates skipped (already in database)
- New profiles added
- Invalid/non-profile cards

### Changes Made

**Enhanced logging in `src/services/lead-scraper.ts`:**

1. **Track page-level metrics**:
```typescript
// Track profiles on this page
let profilesFoundOnPage = 0;
let profilesSkippedOnPage = 0;
let profilesAddedOnPage = 0;
```

2. **Increment counters appropriately**:
- `profilesFoundOnPage++`: When a valid profile URL is extracted
- `profilesSkippedOnPage++`: When profile exists in database
- `profilesAddedOnPage++`: When new profile is added to database

3. **Display page summary after processing each page**:
```typescript
// Page summary
const invalidCards = cardCount - profilesFoundOnPage;
console.log(`\n   📊 Page ${currentPage} Summary:`);
console.log(`      Total cards: ${cardCount}`);
console.log(`      Valid profiles found: ${profilesFoundOnPage}`);
console.log(`      Duplicates skipped: ${profilesSkippedOnPage}`);
console.log(`      New profiles added: ${profilesAddedOnPage}`);
if (invalidCards > 0) {
  console.log(`      Invalid/non-profile cards: ${invalidCards}`);
}
```

4. **Updated card processing messages** for clarity:
- Changed "Processing profile X/Y" to "Processing card X/Y"
- Changed "Skipping profile" to "Skipping card" when no URL found

## Example Output

### Before Enhancement
```
📄 Processing page 5...
📊 Found 10 profile cards on page 5

   Processing profile 1/10...
   ⚠️  Skipping profile 1: profile URL not found after 3 attempts
   Processing profile 2/10...
   ⏭️  Skipping profile 2: already in database
   ...

➡️  Navigating to page 6...
```

### After Enhancement
```
📄 Processing page 5...
📊 Found 10 profile cards on page 5

   Processing card 1/10...
   ⚠️  Skipping card 1: profile URL not found after 3 attempts
   Processing card 2/10...
   ⏭️  Skipping card 2: already in database
   Processing card 3/10...
   ✅ Added: John Doe
   ...

   📊 Page 5 Summary:
      Total cards: 10
      Valid profiles found: 3
      Duplicates skipped: 2
      New profiles added: 1
      Invalid/non-profile cards: 7

➡️  Navigating to page 6...
```

## Benefits

1. **Clear visibility** into extraction success rates per page
2. **Understand LinkedIn's content mix** (how many ads vs profiles)
3. **Identify issues quickly**:
   - If "Valid profiles found" is consistently low → LinkedIn showing more ads/sponsored content
   - If "Duplicates skipped" is high → Need to adjust search criteria or filter
   - If "Invalid/non-profile cards" is high → Selector may need updating
4. **Better debugging** when profile counts seem low
5. **Realistic expectations** about LinkedIn search result composition

## Expected Behavior

On a typical LinkedIn search results page:
- **10 cards total** (LinkedIn standard)
- **2-3 valid profiles** extracted
- **4-5 invalid cards** (ads, suggestions, groups)
- **2-3 duplicates** (if you've already scraped this search)

This is normal and expected. LinkedIn increasingly shows non-profile content in search results.

## Navigation Warnings Are Normal

The warnings about navigation:
```
⚠️  Not on search page after goBack, trying again...
⚠️  Still stuck, forcing navigation to search page...
```

These indicate the **recovery mechanism working correctly**:
1. After visiting a profile, `goBack()` is called
2. If still on profile page (due to overlay/popup), retry `goBack()`
3. If still stuck, force navigation to search URL
4. Continue scraping

This is expected behavior when LinkedIn adds modal dialogs or navigation delays.

## Related Files

- `src/services/lead-scraper.ts`: Enhanced per-page logging
- `docs/URL_NORMALIZATION_FIX.md`: Related duplicate detection improvements

