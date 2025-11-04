# Article Extraction Feature

## Overview
Added functionality to extract and display LinkedIn article links from lead profiles during the scraping process.

## Implementation Details

### Database Schema Changes
- Added `articles` column to the `leads` table (TEXT field storing JSON array of article URLs)
- Migration automatically applies when database initializes
- Updated Lead interface to include optional `articles?: string` field

### Backend Changes

#### Lead Scraper (`src/services/lead-scraper.ts`)
Article extraction logic added after email extraction:
1. Locates the "Articles" pill button in the activity section
2. Clicks it if not already selected (checks `aria-pressed` attribute)
3. Extracts article URLs using multiple selector strategies:
   - `a[href*="/pulse/"]` - Standard LinkedIn article URLs
   - `article a[data-test-app-aware-link]` - Alternative article links
   - `.profile-creator-shared-feed-update__container a[href*="/pulse/"]` - Feed update links
4. Collects up to 20 unique article URLs per profile
5. Stores URLs as JSON array in database
6. Logs article count when lead is added

#### Database Operations (`src/lib/db.ts`)
- Updated `Lead` interface with `articles` field
- Added migration to create `articles` column
- Modified `addLead()` INSERT statement to include articles
- Extended `LeadStats` interface with `withArticles` count
- Added query to count leads with articles in `getLeadStats()`

### Frontend Changes

#### Lead Detail Modal (`src/dashboard/client/components/LeadDetail.tsx`)
Added "Published Articles" section displaying:
- Article count in section header
- Each article as clickable link with icon
- Links open in new tab
- Clean URL display (shows last segment of URL path)
- Hover effects for better UX
- Safe JSON parsing with error handling

#### Leads List (`src/dashboard/client/components/LeadsList.tsx`)
- Added `articles` field to Lead interface
- Updated `LeadStats` interface with `withArticles`
- Changed stats grid from 4 to 5 columns (responsive: 1 col mobile, 3 tablet, 5 desktop)
- Added "With Articles" stat card with purple color scheme and article icon
- Updated default stats object to include `withArticles: 0`

## Usage

### Scraping
Articles are automatically extracted during normal lead scraping:
```bash
npm run leads:search -- --profile chiefs --max 50
```

The scraper will:
- Look for the Articles button on each profile
- Extract article links if available
- Log the count when a lead is added
- Store URLs as JSON for easy parsing

### Viewing
1. Open the dashboard and navigate to Leads
2. Stats card shows total leads with articles
3. Click any lead row to open detail modal
4. Articles section appears if the lead has published articles
5. Click any article link to open in new tab

## Technical Notes

### Selector Robustness
Multiple selectors ensure extraction works across LinkedIn UI variations:
- Primary selector targets `/pulse/` URLs (standard article format)
- Fallback selectors handle alternative DOM structures
- Extraction is optional and non-blocking (errors are caught and logged)

### Data Format
Articles stored as JSON string array for flexibility:
```json
["https://www.linkedin.com/pulse/article-1", "https://www.linkedin.com/pulse/article-2"]
```

Benefits:
- Easy to parse in frontend
- Supports variable article counts
- Preserves full URL for direct linking
- No additional table needed

### Performance
- Article extraction adds ~2-3 seconds per profile (wait times for content loading)
- Limited to 20 articles per profile to prevent excessive extraction time
- Extraction happens only on profiles with visible Articles button
- Failed extractions don't block lead creation

## Error Handling
- Invalid JSON gracefully ignored in frontend display
- Missing Articles button handled silently
- Extraction timeouts don't prevent lead from being saved
- Stale element errors caught and logged

## Future Enhancements
Potential improvements:
- Article title extraction (requires additional API calls or scraping)
- Article date filtering (show only recent articles)
- Filter leads by article count in dashboard
- Export articles to separate table for analysis
- Track article engagement metrics if available

