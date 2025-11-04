# LinkedIn Contact Information Extraction

## Overview

Extended the lead scraper to extract additional contact information from LinkedIn profiles, including birthday, connection date, and address fields. This information provides context about relationships and helps with networking timing.

## Changes Made

### Database Schema

Added three new columns to the `leads` table:
- `birthday` (TEXT): Birthday information (e.g., "January 1")
- `connected_date` (TEXT): Date when connection was established (e.g., "Oct 18, 2017")
- `address` (TEXT): Social media handles or custom addresses from LinkedIn

Changes were implemented as migrations in `src/lib/db.ts` to ensure backward compatibility with existing databases.

### Data Model

Updated the `Lead` interface in:
- `src/lib/db.ts` - Main database interface
- `src/dashboard/client/components/LeadDetail.tsx` - Detail view component
- `src/dashboard/client/components/LeadsList.tsx` - List view component

### Scraper Logic

Modified `src/services/lead-scraper.ts` to extract additional fields from the LinkedIn contact info modal:

1. **Email** - Already extracted, unchanged
2. **Birthday** - Extracted from section with `calendar-medium` icon
3. **Connected Date** - Extracted from section with `people-medium` icon  
4. **Address** - Extracted from section with `location-marker-medium` icon

The extraction happens when the scraper clicks the "Contact Info" button on each profile. All new fields are optional and extraction failures are handled gracefully.

### Dashboard Updates

Updated `LeadDetail.tsx` to display the new contact information in the "Contact Information" section:
- Birthday displayed with cake icon
- Connected date displayed with people icon
- Address displayed with location icon

All fields are only shown when data is available.

## Technical Details

### Selector Strategy

The scraper uses LinkedIn's data attributes to identify sections in the contact modal:
- `svg[data-test-icon="calendar-medium"]` - Birthday section
- `svg[data-test-icon="people-medium"]` - Connected date section
- `svg[data-test-icon="location-marker-medium"]` - Address section

Within each section, the text is extracted from `.t-14.t-black.t-normal` or `div.t-14` elements.

### Error Handling

Each field extraction is wrapped in try-catch blocks. If extraction fails:
- The field is left as `undefined`
- The scraper continues with other fields
- No error is logged (optional fields)

### Console Output

When a lead is successfully added, the console displays new fields if available:
```
✅ Added: John Doe
   🎂 Birthday: January 1
   🤝 Connected: Oct 18, 2017
   📍 Address: @johndoe
```

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

The contact information modal is opened for each profile during the scraping process, adding minimal time per profile (approximately 1-2 seconds for modal interaction).

## Notes

- Birthday extraction may return partial dates (e.g., "January 1" without year) depending on LinkedIn privacy settings
- Connected date shows when the user was added to your network
- Address field may contain social media handles (e.g., "@username") or other custom location information
- All fields respect LinkedIn's privacy settings - if a user hasn't shared this information, it won't be extracted

