# README Update Summary

## Changes Made

Updated the main README.md to include leads scraping functionality and simplified command documentation.

### Quick Start Section
**Added "Build Your Network" step** with leads scraping commands:
- Basic scraping: `npm run leads:search`
- Title filtering: `npm run leads:search -- --titles "CTO,Director,Founder"`
- Limited scraping: `npm run leads:search -- --max 50`

**Reorganized workflow** from 3 steps to 4 steps:
1. Find Jobs
2. Build Your Network (new)
3. Monitor & Apply
4. Manage Filters

### Common Commands Section
**Added dedicated "Lead Scraping" subsection** with examples:
- All 1st degree connections (US): `npm run leads:search`
- Filter by title: `npm run leads:search -- --titles "CTO,Director"`
- Limit profiles: `npm run leads:search -- --max 100`
- Combined filters: `npm run leads:search -- --titles "Founder,VP" --max 50`
- Resume previous run: `npm run leads:search -- --resume 123`

**Reorganized commands** into clear categories:
1. Job Search
2. Lead Scraping (new)
3. Job Applications
4. Management
5. Filters & Blocks (new)

**Simplified Job Search commands** by removing verbose location examples and keeping only essential ones.

**Added Filters & Blocks section** with all filter management commands in one place.

### Dashboard Features Section
**Added Leads Database** feature:
- Browse connections
- Filter by title/company/location
- Export contacts

### Setup Section
**Updated Run commands** to include leads scraping example:
```bash
npm run search -- --profile contract            # Find contract jobs
npm run leads:search -- --titles "CTO,Director" # Build network leads
npm run dashboard:dev                           # Open dashboard
npm run apply -- --easy                         # Apply to jobs
```

## Documentation Index Updates

Updated `docs/INDEX.md` to include:

**New System Features section entry:**
- LEADS_SYSTEM_IMPLEMENTATION.md - LinkedIn leads scraping system

**New Bug Fixes and Improvements section** with all leads-related fixes:
- LEADS_SCRAPER_PROFILE_EXTRACTION_FIX.md - Title, company, location extraction fix
- LEADS_STATS_SQL_FIX.md - SQL query fix
- LEADS_SCRAPER_SELECTOR_FIX.md - Selector improvements
- LEADS_SCRAPER_FIX_SUMMARY.md - Summary of improvements
- LEADS_DISPLAY_FIX.md - Dashboard display improvements
- PROFILE_PERFORMANCE_FIX.md - Performance tracking fixes

## Key Improvements

1. **Clarity**: Correct command syntax using `--titles` instead of incorrect `--filter-titles`
2. **Visibility**: Leads functionality now prominent in Quick Start guide
3. **Organization**: Commands grouped by function for easier reference
4. **Examples**: Real-world examples with common use cases (CTO, Director, Founder filtering)
5. **Completeness**: All leads-related documentation now indexed and accessible

## Impact

Users can now:
- Quickly find the correct leads scraping commands
- Understand available filtering options
- See leads functionality as a core feature
- Access all related documentation easily
- Follow proper command syntax without errors

