# CLI Reference - Lead Scraping Commands

## Overview
Complete reference for the `leads:search` command used to scrape LinkedIn 1st degree connections. This command filters and extracts profile data from your network based on job titles or predefined profiles.

## Command Syntax

```bash
npm run leads:search -- [options]
```

## Available Options

### Profile Selection
**`--profile`, `-p`**  
Use a predefined lead profile with curated title filters.

**Choices:** `chiefs`, `founders`, `directors`, `techLeads`, `productLeads`, `recruiters`, `sales`, `consultants`

**Example:**
```bash
npm run leads:search -- --profile chiefs
```

**Note:** Cannot be used with `--titles`. Choose one or the other.

### Custom Title Filtering
**`--titles`, `-t`**  
Filter by specific job titles (comma-separated).

**Example:**
```bash
npm run leads:search -- --titles "CTO,VP Engineering,Director of Technology"
```

**Note:** Cannot be used with `--profile`. Choose one or the other.

### Limit Results
**`--max`, `-m`**  
Maximum number of profiles to scrape.

**Default:** 50  
**Example:**
```bash
npm run leads:search -- --profile directors --max 100
```

### Resume Interrupted Run
**`--resume`, `-r`**  
Resume a previously stopped or interrupted scraping run using its run ID.

**Example:**
```bash
npm run leads:search -- --resume 42
```

**Finding Run IDs:** Check the dashboard Leads page or the console output when a run is created/stopped.

### Start from Specific Page
**`--start-page`, `-s`**  
Skip earlier pages and start scraping from a specific page number.

**Example:**
```bash
npm run leads:search -- --profile techLeads --start-page 5
```

**Use Case:** Useful when you want to continue scraping from a specific point without using --resume.

## Lead Profiles

### Chiefs (C-Suite & Leadership)
Chief-level executives and senior leadership roles.

**Titles:** CTO, Chief Technology Officer, CIO, Chief Information Officer, CEO, COO, CFO, General Manager, VP, Vice President, SVP, Senior Vice President, EVP, Executive Vice President

**Example:**
```bash
npm run leads:search -- --profile chiefs --max 75
```

### Founders (Founders & Entrepreneurs)
Company founders, co-founders, and entrepreneurs.

**Titles:** Founder, Co-Founder, Cofounder, Owner, Entrepreneur, President, Managing Partner, Partner

**Example:**
```bash
npm run leads:search -- --profile founders
```

### Directors (Directors & Senior Management)
Director-level and senior management positions.

**Titles:** Director, Senior Director, Managing Director, Head of Engineering, Head of Technology, Head of Product, Head of Development, Engineering Manager, Technical Director, Principal Engineer, Distinguished Engineer, Staff Engineer

**Example:**
```bash
npm run leads:search -- --profile directors --max 200
```

### TechLeads (Technical Leadership)
Technical leads and senior engineers.

**Titles:** Tech Lead, Technical Lead, Lead Engineer, Lead Developer, Senior Engineer, Senior Developer, Architect, Solution Architect, Enterprise Architect, Cloud Architect, Principal Architect

**Example:**
```bash
npm run leads:search -- --profile techLeads
```

### ProductLeads (Product Leadership)
Product management and strategy roles.

**Titles:** Product Manager, Senior Product Manager, Principal Product Manager, VP Product, Director of Product, Head of Product, Chief Product Officer, CPO, Product Owner, Product Director

**Example:**
```bash
npm run leads:search -- --profile productLeads --max 100
```

### Recruiters (Recruiters & Talent Acquisition)
Recruitment and talent acquisition professionals.

**Titles:** Recruiter, Technical Recruiter, Senior Recruiter, Talent Acquisition, Head of Recruiting, Director of Recruiting, Recruitment Manager, Hiring Manager, Sourcer, Talent Partner

**Example:**
```bash
npm run leads:search -- --profile recruiters
```

### Sales (Sales & Business Development)
Sales and business development roles.

**Titles:** Sales, Account Executive, Sales Engineer, Business Development, VP Sales, Director of Sales, Head of Sales, Chief Revenue Officer, CRO, Sales Director, Sales Manager

**Example:**
```bash
npm run leads:search -- --profile sales --max 150
```

### Consultants (Consultants & Advisors)
Consulting and advisory roles.

**Titles:** Consultant, Senior Consultant, Principal Consultant, Advisory, Advisor, Technical Consultant, Solutions Consultant, Strategy Consultant, Independent Consultant, Fractional CTO

**Example:**
```bash
npm run leads:search -- --profile consultants
```

## Common Usage Patterns

### Quick Start with Default Settings
Scrape up to 50 profiles (default) using a predefined profile:
```bash
npm run leads:search -- --profile chiefs
```

### Large Batch Scraping
Scrape more profiles by increasing the limit:
```bash
npm run leads:search -- --profile directors --max 250
```

### Custom Title Search
Target specific titles not covered by profiles:
```bash
npm run leads:search -- --titles "DevOps Manager,Site Reliability Engineer,Platform Engineer"
```

### Resume After Interruption
If a scraping run is interrupted (Ctrl+C, error, or timeout):
```bash
# Run stops, shows: "Resume with: npm run leads:search -- --resume 42"
npm run leads:search -- --resume 42
```

### Start from Middle of Results
Skip the first few pages of results:
```bash
npm run leads:search -- --profile techLeads --start-page 10
```

### Combine Options
Most options can be combined:
```bash
npm run leads:search -- --profile recruiters --max 75 --start-page 3
```

## Command Validation Rules

### Mutual Exclusivity
- Cannot use `--profile` and `--titles` together
- Choose one approach: predefined profile OR custom titles

**Invalid:**
```bash
npm run leads:search -- --profile chiefs --titles "CTO,VP"
```

**Error:** "Cannot use both --profile and --titles. Choose one."

### Resume Run Validation
- Run ID must exist in the database
- Run must not be already completed
- Cannot specify new filters when resuming (uses original run's filters)

**Invalid:**
```bash
npm run leads:search -- --resume 99999
```

**Error:** "Run ID 99999 not found"

### Page Number Validation
- `--start-page` must be a positive integer
- Page 1 is the first page of results

## Output and Results

### Console Output
During scraping, the command displays:
- Current profile being processed
- Progress counter (X/Y profiles)
- Newly added leads
- Duplicates skipped
- Estimated time remaining

### Final Summary
Upon completion:
```
📊 Final Summary:
   Run ID: #42
   Status: completed
   Total Profiles Processed: 50
   New Leads Added: 38
   Processing Time: 245s
```

### Dashboard Integration
Results appear immediately in the dashboard:
- Navigate to Leads page to view all scraped profiles
- Filter, sort, and export leads
- View individual lead details
- Track which leads have been contacted

## Graceful Shutdown

### Stopping a Running Command
Press `Ctrl+C` during scraping to trigger graceful shutdown:
1. Command finishes processing current profile
2. Saves progress to database
3. Updates run status to "stopped"
4. Displays resume command

**Console Output:**
```
⚠️  Stop requested, finishing current profile...

📊 Final Summary:
   Run ID: #42
   Status: stopped
   Total Profiles Processed: 23
   New Leads Added: 19
   Processing Time: 98s

✅ Scraping stopped gracefully.
   Resume with: npm run leads:search -- --resume 42
```

## Troubleshooting

### No Session Found
**Error:** "No saved session found. Please run 'npm run login' first."

**Solution:** Run the login command to authenticate with LinkedIn:
```bash
npm run login
```

### Unknown Profile
**Error:** "Unknown profile: myProfile"

**Solution:** Use one of the valid profile names (case-sensitive):
- chiefs, founders, directors, techLeads
- productLeads, recruiters, sales, consultants

### Rate Limiting
If LinkedIn rate limits your requests, the scraper will:
- Automatically slow down
- Add delays between requests
- Continue when possible
- You may need to wait and resume later

### Browser Issues
If the browser fails to launch:
- Ensure Playwright is installed: `npm install`
- Check system dependencies
- Run with `HEADLESS=false` in .env to see browser

## Advanced Usage

### Environment Variables
Control scraping behavior via `.env` file:

**HEADLESS**
- `true`: Browser runs invisibly (default)
- `false`: See browser window during scraping

**SLOW_MO**
- Delay in milliseconds between actions
- Useful for debugging: `SLOW_MO=100`

### Database Queries
All scraped leads are stored in SQLite database (`data/app.db`).

Access via dashboard or direct SQL queries:
```sql
SELECT * FROM leads WHERE title LIKE '%CTO%';
SELECT * FROM scraping_runs ORDER BY created_at DESC LIMIT 10;
```

### Debugging Failed Runs
Check scraping run details:
```bash
npm run cli -- status
```

View recent runs in dashboard Leads page:
- Run ID, status, timestamp
- Profiles scraped vs. added
- Filter settings used
- Resume capability

## Related Commands

### View Help
```bash
npm run leads:search -- --help
```

### Check Application Status
```bash
npm run cli -- status
```

### List All Commands
```bash
npm run cli -- --help
```

## Best Practices

### Start Small
Test with default 50 profiles before running large batches:
```bash
npm run leads:search -- --profile chiefs
```

### Use Specific Profiles
Target specific lead types rather than scraping all connections:
```bash
npm run leads:search -- --profile recruiters --max 100
```

### Resume Rather Than Restart
If interrupted, always resume instead of starting fresh:
```bash
npm run leads:search -- --resume 42
```

### Monitor Progress
Keep dashboard open while scraping to see results in real-time.

### Respect Rate Limits
Avoid running multiple scraping commands simultaneously.

## Files and Locations

**Implementation:**
- `src/cli/lead-search.ts` - Command handler
- `src/services/lead-scraper.ts` - Scraping logic
- `src/ai/lead-profiles.ts` - Profile definitions

**Documentation:**
- `docs/LEAD_PROFILES_GUIDE.md` - Detailed profile guide
- `README.md` - Quick start and examples

**Data Storage:**
- `data/app.db` - SQLite database with leads table
- `storage/storageState.json` - LinkedIn session (gitignored)

## Support and Additional Help

For more information:
- Run: `npm run leads:search -- --help`
- Check: `docs/LEAD_PROFILES_GUIDE.md`
- View: Dashboard Leads page for UI-based exploration

