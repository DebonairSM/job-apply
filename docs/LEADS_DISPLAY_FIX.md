# Leads Display and Extraction Fix

## Issue

The Leads dashboard displayed "Total Leads: 0" despite scraping runs reporting profiles as "added". The database contained 6 leads, but they weren't visible in the dashboard. Additionally, the leads in the database only had name and email populated, with title, company, and location fields empty.

## Root Causes

### 1. Dashboard Filter Mismatch

The dashboard had a default location filter set to `"United States"`:

```typescript
const [locationFilter, setLocationFilter] = useState('United States');
```

This filter was applied to all lead queries. However, LinkedIn profiles scraped from US searches show locations as "City, State" (e.g., "Lakeville, MN") without the country name. The database query looked for the string "united states" in the location field, which matched nothing.

**Result:** All leads were filtered out, showing 0 results despite 6 leads existing in the database.

### 2. Outdated Data Extraction Selectors

The scraper was finding profile cards successfully (after the previous selector fix), but the selectors for extracting name, title, company, and location from within each card were outdated.

LinkedIn changed their DOM structure from semantic class names to utility classes:

**Old (non-working):**
- Title: `.entity-result__primary-subtitle`
- Location: `.entity-result__secondary-subtitle`

**New (current as of November 2024):**
- Title: `div.t-14.t-black`
- Location: `div.t-14.t-normal`

Both title and location now use the same base class (`t-14`) with different modifiers.

## Solutions Implemented

### Fix 1: Remove Default Location Filter

Changed the dashboard's location filter to start empty:

```typescript
// Before
const [locationFilter, setLocationFilter] = useState('United States');

// After
const [locationFilter, setLocationFilter] = useState('');
```

**Impact:** Leads are now visible immediately without requiring users to manually clear the filter.

### Fix 2: Update Extraction Selectors

Updated the scraper's data extraction selectors to match LinkedIn's current DOM structure:

**Title Selectors (priority order):**
```typescript
const occupationSelectors = [
  'div.t-14.t-black',           // Current LinkedIn structure (Nov 2024)
  'div.t-14',                   // Fallback - get first t-14 element
  '.entity-result__primary-subtitle',  // Legacy
  '.artdeco-entity-lockup__subtitle',
  '.mn-connection-card__occupation'
];
```

**Location Selectors (priority order):**
```typescript
const locationSelectors = [
  'div.t-14.t-normal',          // Current LinkedIn structure (Nov 2024)
  '.entity-result__secondary-subtitle',  // Legacy
  '.artdeco-entity-lockup__caption',
  '.mn-connection-card__location'
];
```

**Impact:** Future scraping runs will now correctly extract:
- Name ✓
- Title ✓
- Company ✓ (if present in format "Title at Company")
- Location ✓
- Email ✓ (when available from contact info)

### Fix 3: Diagnostic Tools

Created diagnostic scripts to quickly identify correct selectors when LinkedIn updates their UI:

**`scripts/diagnose-card-fields.ts`**
- Tests multiple potential selectors for name, title, and location
- Shows which selectors match and what data they extract
- Takes screenshots for manual inspection

**`scripts/find-location-selector.ts`**
- Analyzes card structure to identify field containers
- Tests specific selector patterns
- Shows all text elements with their selectors

**Usage:**
```bash
npx tsx scripts/diagnose-card-fields.ts
npx tsx scripts/find-location-selector.ts
```

## Current LinkedIn Structure (November 2024)

LinkedIn People Search cards use this structure:

**Container:**
- `div.search-results-container ul > li` - profile card wrapper

**Fields within each card:**
- Name: `span[dir="ltr"] span[aria-hidden="true"]` or `a[href*="/in/"] span[aria-hidden="true"]`
- Title: `div.t-14.t-black` (first match)
- Location: `div.t-14.t-normal` (second match) 
- Profile Link: `a[href*="/in/"]`

**Important notes:**
- Multiple `div.t-14` elements exist per card
- Title is `div.t-14.t-black` (darker text)
- Location is `div.t-14.t-normal` (lighter text)
- Some cards are ads/separators without profile links (expected, should skip)

## Testing Results

### Before Fix
```
Database: 6 leads (name + email only)
Dashboard: "Total Leads: 0"
```

Sample database content:
```
John Roemer        | | | | jroemer008@gmail.com
Aditya Ingle       | | | | adityaingle2@gmail.com
John Flynn, MBA    | | | | babyfishmouth@att.net
Chad Rust          | | | | chadrust@gmail.com
Sabir Foux         | | | |
Gaurang Shah       | | | | gaurang.shah@gmail.com
```

### After Fix (Expected)
```
Dashboard: "Total Leads: 6" (immediately visible)
Future scraping: Full data extraction (name, title, company, location, email)
```

## Files Modified

### Production Code
- `src/services/lead-scraper.ts` - Updated title and location extraction selectors
- `src/dashboard/client/components/LeadsList.tsx` - Removed default location filter
- `dist/` - Rebuilt dashboard assets

### Diagnostic Tools (New)
- `scripts/diagnose-card-fields.ts` - Field selector diagnostic
- `scripts/find-location-selector.ts` - Location-specific diagnostic

## Future Maintenance

When LinkedIn changes their UI again:

1. **Check if cards are found:** If scraping finds 0 profiles, the card selector is broken
   - Run: `npx tsx scripts/diagnose-linkedin-selectors.ts`
   - Update `selectorsToTry` in `scrapeConnections()`

2. **Check if data is extracted:** If profiles are found but fields are empty, the field selectors are broken
   - Run: `npx tsx scripts/diagnose-card-fields.ts`
   - Run: `npx tsx scripts/find-location-selector.ts`
   - Update `nameSelectors`, `occupationSelectors`, `locationSelectors`

3. **Add new selectors to the top** of each selector array for priority
4. **Keep legacy selectors** as fallbacks for graceful degradation
5. **Update this document** with new structure details

## Related Documentation

- `docs/LEADS_SCRAPER_SELECTOR_FIX.md` - Previous fix for card detection
- `docs/LEADS_SYSTEM_IMPLEMENTATION.md` - Overall leads system architecture

