# Phone and Website Contact Extraction

## Overview

Extended the LinkedIn lead scraper to extract phone numbers and website URLs from LinkedIn profiles. This information provides additional contact methods beyond email, enabling direct phone outreach and website research.

## Changes Made

### Database Schema

Added two new columns to the `leads` table:
- `phone` (TEXT): Phone numbers with type labels (e.g., "414-276-1122 (Work)")
- `website` (TEXT): Personal or professional website URLs (e.g., "x.com/wmwillwilliam")

Changes were implemented as migrations in `src/lib/db.ts` to ensure backward compatibility with existing databases.

### Data Model

Updated the `Lead` interface in:
- `src/lib/db.ts` - Main database interface with comments
- `src/dashboard/client/components/LeadDetail.tsx` - Detail view component
- `src/dashboard/client/components/LeadsList.tsx` - List view component

### Scraper Logic

Modified `src/services/lead-scraper.ts` to extract additional fields from the LinkedIn contact info modal:

1. **Email** - Already extracted, unchanged
2. **Phone** - Extracted from section with `phone-handset-medium` icon
3. **Website** - Extracted from section with `link-medium` icon
4. **Birthday** - Already extracted, unchanged
5. **Connected Date** - Already extracted, unchanged
6. **Address** - Already extracted, unchanged

The extraction happens when the scraper clicks the "Contact Info" button on each profile. All new fields are optional and extraction failures are handled gracefully.

### Dashboard Updates

Updated `LeadDetail.tsx` to display the new contact information in the "Contact Information" section:
- Phone displayed with phone icon and clickable tel: link
- Website displayed with language/globe icon and opens in new tab
- Both fields only shown when data is available

## Technical Details

### Selector Strategy

The scraper uses LinkedIn's data attributes to identify sections in the contact modal:
- `svg[data-test-icon="phone-handset-medium"]` - Phone number section
- `svg[data-test-icon="link-medium"]` - Website section

Within each section, text is extracted from `.t-14.t-black.t-normal` or `div.t-14` elements. For websites, the scraper first attempts to extract the `href` attribute from anchor tags, falling back to text content if no link is found.

### Error Handling

Each field extraction is wrapped in try-catch blocks. If extraction fails:
- The field is left as `undefined`
- The scraper continues with other fields
- No error is logged (optional fields)

### Console Output

When a lead is successfully added, the console displays new fields if available:
```
✅ Added: William Caraher
   📞 Phone: 414-276-1122 (Work)
   🌐 Website: x.com/wmwillwilliam
```

### Link Formatting

**Phone Numbers:**
- Displayed as-is from LinkedIn (preserves formatting like "(Work)", "(Mobile)")
- Clickable tel: links strip non-numeric characters for proper dialing
- Example: `414-276-1122 (Work)` becomes `tel:4142761122`

**Websites:**
- Automatically adds `https://` prefix if URL doesn't start with `http`
- Opens in new tab with security attributes
- Displays raw URL as link text

## Database Migration

The changes are backward compatible. When the application starts:
1. New columns are added using `ALTER TABLE` statements
2. Existing leads retain all their data
3. New columns default to `NULL` for existing records
4. New scrapes populate the fields when available

## Usage

No configuration changes needed. The feature works automatically during lead scraping:

```bash
npm run cli leads scrape
```

The contact information modal is opened for each profile during the scraping process. Phone and website extraction adds minimal time to the existing modal interaction (already required for email, birthday, etc.).

## Notes

- Phone extraction may return different formats depending on how users enter their numbers
- LinkedIn allows multiple phone numbers; the scraper captures the first one found
- Website field may contain various URL formats (personal sites, social media, company websites)
- Both fields respect LinkedIn's privacy settings - if a user hasn't shared this information, it won't be extracted
- All fields are optional; missing phone or website data doesn't prevent lead creation

## Privacy Considerations

Phone numbers and websites are sensitive contact information. The system:
- Only extracts publicly visible information from LinkedIn profiles
- Stores data securely in local SQLite database
- Does not share or transmit contact information externally
- Respects LinkedIn's privacy settings and user preferences

## Example Data

From LinkedIn profile for William Caraher:
- **Phone**: `414-276-1122 (Work)`
- **Website**: `x.com/wmwillwilliam` (labeled as "Other" in LinkedIn)
- **Email**: `bcaraher@gmail.com`
- **Connected**: `Aug 12, 2011`

All fields are now captured and displayed in the dashboard detail view.

