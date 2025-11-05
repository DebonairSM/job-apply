# Incomplete Leads Cleanup Feature

## Overview

When the LinkedIn scraper encounters network issues or lazy-loading problems, it may save leads with only a name but missing other critical data (title, company, location, email). This feature provides a way to identify and remove these incomplete leads so you can re-run the scraper to get complete data.

## What Gets Cleaned Up

The cleanup process removes leads that meet ALL of the following criteria:
- Has a name (the scraper got at least this far)
- Missing title (NULL or empty string)
- Missing company (NULL or empty string)
- Missing location (NULL or empty string)
- Missing email (NULL or empty string)

Leads that have ANY of these fields populated will NOT be removed.

## How to Use

### Dashboard UI

1. Navigate to the Leads section in the dashboard
2. Look for the yellow "Data Quality" section near the top of the page
3. Click the "Cleanup Incomplete Leads" button
4. Confirm the action in the dialog
5. The system will show you which leads were removed
6. The leads list will automatically refresh

### API Endpoint

```bash
curl -X POST https://localhost:3001/api/leads/cleanup-incomplete
```

Response:
```json
{
  "message": "Removed 4 incomplete lead(s)",
  "deleted": 4,
  "leads": [
    { "id": "abc123", "name": "Jessica McKinnon" },
    { "id": "def456", "name": "Rohit Chhabra" },
    { "id": "ghi789", "name": "Fredrick Marc-Charles" },
    { "id": "jkl012", "name": "Lokesh Chouhan" }
  ]
}
```

### Database Function

```typescript
import { deleteIncompleteLeads } from './lib/db.js';

const result = deleteIncompleteLeads();
console.log(`Removed ${result.deleted} incomplete leads`);
console.log('Removed leads:', result.leads);
```

## Technical Details

### Database Query

The cleanup uses a soft delete approach - leads are marked as deleted with a timestamp rather than being permanently removed:

```sql
UPDATE leads 
SET deleted_at = CURRENT_TIMESTAMP 
WHERE id IN (...)
  AND deleted_at IS NULL
  AND (title IS NULL OR title = '')
  AND (company IS NULL OR company = '')
  AND (location IS NULL OR location = '')
  AND (email IS NULL OR email = '')
```

### Implementation Files

- **Database Function**: `src/lib/db.ts` - `deleteIncompleteLeads()`
- **API Endpoint**: `src/dashboard/routes/leads.ts` - `POST /api/leads/cleanup-incomplete`
- **UI Component**: `src/dashboard/client/components/LeadsList.tsx` - Cleanup button and handler

## Common Scenarios

### Network Issues During Scraping

When LinkedIn's network is slow or experiences intermittent issues, the scraper may successfully navigate to a profile but fail to load the data fields. This results in leads with only names.

**Solution**: Run the cleanup, then re-run the scraper with the same parameters.

### LinkedIn Lazy Loading Problems

LinkedIn uses lazy loading for profile data. Sometimes the scraper scrolls too quickly or LinkedIn fails to load content in time, resulting in incomplete data extraction.

**Solution**: Run the cleanup, then re-run the scraper. The scraper has built-in scrolling delays and retry logic to handle this better on subsequent runs.

### After Interrupted Scraping

If you stop a scraping run mid-process (Ctrl+C), some profiles may have been partially processed.

**Solution**: Run the cleanup, then use the resume feature to continue: `npm run leads:search -- --resume <run-id>`

## Safety

- Uses soft delete (adds `deleted_at` timestamp) rather than permanent deletion
- Requires explicit user confirmation in the UI
- Only removes leads with NO useful data (all key fields empty)
- Provides a list of removed leads for verification
- Does not affect leads with any populated fields

## Re-running the Scraper

After cleanup, you can re-run the scraper to get complete data for these profiles:

```bash
# Resume from the last incomplete run
npm run leads:search -- --resume <run-id>

# Or start a fresh search with the same profile
npm run leads:search -- --profile chiefs --max 50
```

The scraper will skip profiles that already exist in the database (based on profile URL), so it will only re-scrape the ones you just cleaned up if they appear again in the search results.

## Date

Created: November 5, 2025

