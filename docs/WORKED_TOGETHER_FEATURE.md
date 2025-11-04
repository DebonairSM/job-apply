# Worked Together Feature

## Overview

Added a "Worked Together" column to the LinkedIn lead scraper that captures when you've previously worked with a connection at the same company. This information is valuable for prioritizing outreach and identifying stronger professional relationships.

## Implementation Details

### Database Changes

Added `worked_together` column to the `leads` table:
- Type: `TEXT` (nullable)
- Stores the full text from LinkedIn (e.g., "You both worked at Company Name from October 2005 to February 2008")
- Migration is handled automatically on application start via `ALTER TABLE` with try/catch for existing columns

### Scraper Updates (`src/services/lead-scraper.ts`)

The scraper now extracts "worked together" information when viewing each profile:

1. **Extraction Logic**: Uses multiple selectors to find the text:
   - `span.t-14.t-normal span[aria-hidden="true"]` - Detailed version with dates
   - `div.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]` - Basic version
   - Generic fallbacks using `:has-text()` pseudo-selectors

2. **Priority**: Attempts to capture the detailed version with date ranges first, then falls back to basic "You both worked at Company" text

3. **Logging**: Console output includes 🤝 emoji when worked together info is found

### Database Functions (`src/lib/db.ts`)

Updated the following functions:

1. **`addLead()`**: Inserts `worked_together` field when saving new leads
2. **`getLeads()`**: Supports optional `workedTogether` filter (boolean)
3. **`getLeadsCount()`**: Supports same filter for count queries
4. **`getLeadStats()`**: Returns count of leads with "worked together" information
5. **Lead Interface**: Added `worked_together?: string` property

### API Route Updates (`src/dashboard/routes/leads.ts`)

Added `workedTogether` query parameter support:
- `GET /api/leads?workedTogether=true` - Returns only leads you worked with
- `GET /api/leads?workedTogether=false` - Returns only leads you didn't work with
- Omit parameter to show all leads

### Dashboard UI Changes

#### LeadsList Component (`src/dashboard/client/components/LeadsList.tsx`)

1. **Stats Card**: Displays count of connections with "worked together" information
   - Shows total number in header statistics
   - Uses blue "users" icon

2. **Filter Dropdown**: Added "Worked Together" filter with options:
   - All (default)
   - Worked Together (shows only those with data)
   - Did Not Work Together (shows those without data)

3. **Table Column**: New column between "Location" and "Email"
   - Shows blue "users" icon with the full text when available
   - Shows "-" placeholder when no data

#### LeadDetail Component (`src/dashboard/client/components/LeadDetail.tsx`)

Added display section in the detail modal:
- Shows after Location and before Contact Information
- Uses blue "users" icon
- Only displayed when data is available

## HTML Structure Detected

Based on the provided LinkedIn HTML, the structure is:

```html
<li class="artdeco-list__item...">
  <div class="display-flex align-items-center mr1 hoverable-link-text t-bold">
    <span aria-hidden="true">You both worked at Company Name</span>
  </div>
  <span class="t-14 t-normal">
    <span aria-hidden="true">You both worked at Company Name from October 2005 to February 2008</span>
  </span>
</li>
```

The scraper targets both the basic and detailed versions to maximize data capture.

## Usage

### Running the Scraper

When running the lead scraper, the "worked together" information is automatically extracted for each profile:

```bash
npm run cli scrape-leads
```

Console output will show:
```
✅ Added: John Doe
   Title: Senior Engineer
   Company: Tech Corp
   Location: San Francisco, CA
   🤝 You both worked at Previous Company from 2018 to 2020
   Email: john@example.com
```

### Filtering in Dashboard

1. Navigate to the Leads section
2. Use the "Worked Together" dropdown filter:
   - Select "Worked Together" to see only connections from shared workplaces
   - Select "Did Not Work Together" to see other connections
3. The filter is applied instantly and persists during the session

### API Query Examples

```bash
# Get all leads you worked with
curl https://localhost:3001/api/leads?workedTogether=true

# Get all leads you didn't work with
curl https://localhost:3001/api/leads?workedTogether=false

# Combine filters - worked together AND has email
curl https://localhost:3001/api/leads?workedTogether=true&hasEmail=true

# Get statistics including worked together count
curl https://localhost:3001/api/leads/stats
```

## Database Migration

The migration runs automatically on application start. For existing databases:

1. The `worked_together` column is added if it doesn't exist
2. Existing leads will have `NULL` for this field
3. New scrapes will populate the field when applicable
4. No data loss occurs - this is a non-breaking change

To manually verify the migration:

```bash
# Check the schema
sqlite3 data/app.db ".schema leads"

# Count leads with worked together info
sqlite3 data/app.db "SELECT COUNT(*) FROM leads WHERE worked_together IS NOT NULL"
```

## Testing Recommendations

1. **Manual Test**: Scrape a few connections you know you worked with
   - Verify the text is captured correctly
   - Check that dates are included when available

2. **Filter Test**: Use the dashboard filter to verify:
   - "Worked Together" shows only matching leads
   - "Did Not Work Together" excludes them
   - Table displays the full text properly

3. **Detail View Test**: Click on a lead with worked together data
   - Verify it displays in the modal
   - Check the icon and formatting

## Technical Notes

### LinkedIn DOM Changes

LinkedIn frequently updates their DOM structure. If extraction stops working:

1. Inspect a profile with "worked together" information
2. Look for text containing "You both worked" or "worked at"
3. Update selectors in `src/services/lead-scraper.ts` lines 268-273
4. The current implementation uses multiple fallback selectors for resilience

### Performance Considerations

- The scraper already waits for profile pages to load
- No additional delay introduced for this extraction
- Extraction wrapped in try/catch to prevent failures from blocking other data
- Uses efficient CSS and Playwright text selectors

### Future Enhancements

Potential improvements for this feature:

1. **Parse Date Ranges**: Extract start/end dates as separate fields for filtering
2. **Company Matching**: Link to company records in the database
3. **Priority Scoring**: Boost leads with shared work history in ranking
4. **Export**: Include in CSV/Excel exports for external CRM tools
5. **Timeline View**: Visualize career overlaps with connections

## Files Modified

- `src/lib/db.ts` - Database schema, interfaces, and query functions
- `src/services/lead-scraper.ts` - LinkedIn profile extraction logic
- `src/dashboard/routes/leads.ts` - API route parameter handling
- `src/dashboard/client/components/LeadsList.tsx` - Table display and filtering
- `src/dashboard/client/components/LeadDetail.tsx` - Detail modal display
- `docs/WORKED_TOGETHER_FEATURE.md` - This documentation

## Verification

After deployment, verify the feature is working:

```bash
# Check database has the column
npm run cli -- sql "PRAGMA table_info(leads)"

# Check if any data was captured
npm run cli -- sql "SELECT COUNT(*) as worked_together_count FROM leads WHERE worked_together IS NOT NULL"

# View sample data
npm run cli -- sql "SELECT name, worked_together FROM leads WHERE worked_together IS NOT NULL LIMIT 5"
```

