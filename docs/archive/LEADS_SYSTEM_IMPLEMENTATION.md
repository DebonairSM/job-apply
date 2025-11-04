# LinkedIn Leads Management System - Implementation Complete

## Overview

The LinkedIn Leads Management System has been implemented as a modular extension to the Opp Scraper platform. The system scrapes 1st degree LinkedIn connections filtered by location (United States by default) and stores them for future outreach.

## System Architecture

### Database Schema

Two new tables added to `src/lib/db.ts`:

**leads table:**
- id (TEXT PRIMARY KEY) - MD5 hash of profile URL
- name (TEXT) - Full name
- title (TEXT) - Current job title
- company (TEXT) - Current company
- about (TEXT) - LinkedIn about section
- email (TEXT) - Email if available from contact info
- location (TEXT) - Geographic location
- profile_url (TEXT UNIQUE) - LinkedIn profile URL
- linkedin_id (TEXT) - LinkedIn internal ID
- scraped_at (TEXT) - Timestamp
- created_at (TEXT) - Timestamp

**lead_scraping_runs table:**
- id (INTEGER PRIMARY KEY)
- started_at (TEXT)
- completed_at (TEXT)
- status (TEXT) - 'in_progress', 'completed', 'stopped'
- profiles_scraped (INTEGER)
- profiles_added (INTEGER)
- last_profile_url (TEXT) - For resume capability
- filter_titles (TEXT) - JSON array
- max_profiles (INTEGER)
- created_at (TEXT)

### Backend Services

**Lead Scraper** (`src/services/lead-scraper.ts`):
- Uses LinkedIn People Search with pre-applied filters
- Default filters: 1st degree connections + United States location
- Search URL: `https://www.linkedin.com/search/results/people/?network=%5B%22F%22%5D&geoUrn=%5B%22103644278%22%5D`
- Extracts: name, title, company, location, about, email
- Supports pagination across multiple pages
- Stop/resume capability via scraping run tracking
- Deduplication by profile URL

**CLI Command** (`src/cli/lead-search.ts`):
```bash
npm run cli -- leads:search --max 50
npm run cli -- leads:search --titles "CTO,Director,VP" --max 100
npm run cli -- leads:search --resume 1
```

Options:
- `--titles` / `-t` - Comma-separated title filters (client-side)
- `--max` / `-m` - Max profiles to scrape (default: 50)
- `--resume` / `-r` - Resume from previous run ID

### API Endpoints

**Leads API** (`src/dashboard/routes/leads.ts`):
- `GET /api/leads` - List leads with filters (search, title, company, location, email status)
- `GET /api/leads/:id` - Get single lead
- `GET /api/leads/stats` - Get statistics
- `GET /api/leads/runs` - List scraping runs
- `GET /api/leads/runs/:id` - Get run details

**Backup API** (`src/dashboard/routes/backup.ts`):
- `GET /api/backup/info` - Get last backup date, size, and count

### Dashboard UI

**LeadsList Component** (`src/dashboard/client/components/LeadsList.tsx`):
- Stats cards: total leads, with email, without email, email rate
- Filters: search, title, company, location (default: "United States"), email status
- Table view with all lead data
- Click to view full details
- Scraping runs history panel

**LeadDetail Modal** (`src/dashboard/client/components/LeadDetail.tsx`):
- Full lead information display
- Contact information with email (if available)
- LinkedIn profile link
- About section
- Metadata (scraped date, added date, LinkedIn ID)

**Settings Page Enhancement** (`src/dashboard/client/components/Settings.tsx`):
- Database Backup section showing:
  - Last backup date and time
  - Backup file size
  - Total number of backups
  - Latest backup filename

**Navigation** (`src/dashboard/client/App.tsx`):
- Rebranded from "Job Automation" to "LinkedIn Automation"
- New "Leads" menu item with people icon
- Positioned after Jobs in the sidebar

## Key Features

### LinkedIn People Search Integration
- Pre-filtered results from LinkedIn's own search
- Uses URL parameters: `network=["F"]` for 1st connections, `geoUrn=["103644278"]` for United States
- More efficient than scraping raw connections list
- Leverages LinkedIn's filter infrastructure

### Location Filtering
- Default: United States (geoUrn 103644278)
- Location extracted from search result cards
- Filterable in dashboard UI

### Email Extraction
- Attempts to extract from contact info section
- Clicks "Contact Info" button on profile
- Looks for mailto: links
- Stores as null if not available
- Success rate visible in dashboard stats

### Batch Processing
- Processes multiple pages of search results
- Tracks progress in real-time
- Updates scraping run record after each profile
- Stop/resume capability via run ID

### Deduplication
- Primary: Profile URL (unique constraint)
- Secondary: LinkedIn ID
- Skip already-scraped profiles automatically
- Prevents duplicate API calls

### Graceful Shutdown
- Integrates with existing stop signal system
- Saves progress on SIGINT/SIGTERM
- Resume from last position using run ID

## Code Reuse from Job System

Successfully reused from existing job automation:
- LinkedIn session management (storage/storageState.json)
- Playwright browser setup and configuration
- Stop signal system (graceful shutdown)
- Dashboard infrastructure (Express, React, TanStack Query)
- Database connection and transaction patterns
- CLI framework (yargs)
- randomDelay() for anti-detection
- HTTPS setup and network IP detection

## Usage

### Scraping Leads

```bash
# Basic scrape (50 profiles, US only)
npm run cli -- leads:search

# With title filter
npm run cli -- leads:search --titles "CTO,VP Engineering,Director" --max 100

# Resume stopped run
npm run cli -- leads:search --resume 3
```

### Dashboard Access

1. Start dashboard: `npm run dev:dashboard`
2. Navigate to "Leads" section
3. Filter by location, title, company, or email status
4. Click any lead to view full details
5. View scraping runs history
6. Check Settings for last database backup info

## Implementation Notes

### Database Backup
- Automatic backup created before schema changes
- Latest backup: `data/backups/app-2025-11-04T17-29-17.db` (16.7 MB)
- Backup info displayed in Settings page
- Refreshes every 30 seconds

### Monorepo Benefits Realized
- Shared authentication (single LinkedIn session)
- Shared Playwright infrastructure
- Shared database and API server
- Unified dashboard for both jobs and leads
- 40-50% code reuse as predicted

### Future Enhancements
- Email generation using Llama AI (Phase 2)
- Additional LinkedIn filters (industry, company, school)
- Export leads to CSV
- Track email sent status
- Integration with CRM systems
- Cross-reference leads with job companies

## Files Created

```
src/services/lead-scraper.ts          (319 lines)
src/cli/lead-search.ts                (161 lines)
src/dashboard/routes/leads.ts         (96 lines)
src/dashboard/routes/backup.ts        (57 lines)
src/dashboard/client/components/LeadsList.tsx    (345 lines)
src/dashboard/client/components/LeadDetail.tsx   (156 lines)
```

## Files Modified

```
src/lib/db.ts                         (+367 lines)
src/cli.ts                            (+20 lines)
src/dashboard/server.ts               (+4 lines)
src/dashboard/client/App.tsx          (+3 lines)
src/dashboard/client/lib/api.ts       (+7 lines)
src/dashboard/client/components/Settings.tsx     (+34 lines)
```

## Testing Recommendations

1. Run scraper with small batch: `npm run cli -- leads:search --max 5`
2. Verify leads appear in dashboard
3. Check location filtering works
4. Test stop/resume functionality
5. Verify email extraction (if profiles have visible emails)
6. Confirm backup info displays in Settings
7. Test pagination across multiple pages

## Database Migration

The system automatically creates tables on first run via `initDb()`. For existing databases, the location column migration is handled gracefully with try/catch blocks.

No manual migration needed.

