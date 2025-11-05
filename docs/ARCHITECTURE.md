# Architecture

## Overview

This application consists of three independent components that share a single SQLite database:

1. **CLI Tools** - Job search, application, and lead scraping
2. **Dashboard** - Real-time monitoring web interface  
3. **Local AI** - Ollama LLM for analysis and content generation

All components operate asynchronously and can run independently.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User Actions                         │
└────────┬──────────────────┬──────────────────┬──────────────┘
         │                  │                  │
         v                  v                  v
    ┌────────┐        ┌──────────┐      ┌──────────┐
    │  CLI   │        │Dashboard │      │ Scripts  │
    │ Tools  │        │(Browser) │      │          │
    └────┬───┘        └────┬─────┘      └────┬─────┘
         │                 │                  │
         │     ┌───────────┴──────────────────┘
         │     │
         v     v
    ┌────────────────┐         ┌──────────────┐
    │   SQLite DB    │◄───────►│   Ollama     │
    │  (data/app.db) │         │   (Docker)   │
    └────────────────┘         └──────────────┘
              │
              │
         ┌────┴────┐
         │         │
         v         v
    ┌────────┐ ┌────────┐
    │LinkedIn│ │Job ATS │
    │(Playwrt)│ │Platforms│
    └────────┘ └────────┘
```

## Core Components

### 1. CLI Tools (`src/cli.ts`, `src/commands/`)

Command-line interface for all automation tasks:

**Commands**:
- `search` - Find jobs on LinkedIn
- `apply` - Submit applications to queued jobs
- `leads:search` - Scrape LinkedIn connections
- `status` - View statistics
- `list` - List jobs by status
- `rank` - Manually rank specific job

**Flow**:
```
User runs command
  → Parse arguments (yargs)
  → Open database connection
  → Execute automation logic
  → Update database with results
  → Close connection
```

### 2. Database Layer (`src/lib/db.ts`)

Single SQLite database shared by all components:

**Key Tables**:
- `jobs` - Job postings and metadata
- `applications` - Application attempts
- `scraping_runs` - Execution history
- `leads` - LinkedIn connections
- `label_cache` - Learned form field mappings
- `field_answer_cache` - Cached responses
- `companies` - Blocked companies
- `tech_filters` - Technology filters
- `rejection_learning` - Rejection patterns

**Safety Features**:
- Automatic backups before modifications
- Test mode (in-memory database)
- Transaction support
- Connection pooling

### 3. Job Search (`src/services/linkedin.ts`)

Searches LinkedIn using Playwright:

**Process**:
1. Login with stored session (`storage/storageState.json`)
2. Navigate to jobs page with profile-specific query
3. Scroll through results pages
4. Extract job metadata (title, company, location, URL)
5. Store in database with "unranked" status
6. Rank each job using AI scoring
7. Queue high-scoring jobs (≥ MIN_FIT_SCORE)

**Profiles** (`src/ai/profiles.ts`):
- Pre-defined Boolean search queries
- Category-specific keywords
- Weighted scoring per profile
- 14 built-in profiles (core, contract, security, etc.)

### 4. Job Ranking (`src/ai/ranker.ts`)

AI-powered job evaluation:

**Process**:
1. Extract job description
2. Send to Ollama for analysis
3. Score across 9 categories:
   - Azure/Cloud/API (20%)
   - Security (15%)
   - .NET/C# (20%)
   - Event-Driven (10%)
   - Performance (10%)
   - Frontend (10%)
   - Legacy Modernization (5%)
   - DevOps (0% - deprecated)
   - Seniority multiplier
4. Calculate weighted total
5. Apply rejection learning adjustments
6. Store rank in database

**Rejection Learning** (`src/ai/rejection-analyzer.ts`):
- Analyzes rejection reasons
- Adjusts category weights
- Blocks companies with repeated rejections
- Filters jobs matching rejection patterns

### 5. Job Application (`src/commands/apply.ts`)

Automated form filling via Playwright:

**Process**:
1. Navigate to application URL
2. Detect ATS platform (Greenhouse, Lever, Workday, LinkedIn)
3. Load appropriate adapter
4. Map form fields using three-tier system:
   - Heuristics (pattern matching)
   - Cache (previous successful mappings)
   - AI (semantic understanding)
5. Fill form with policy-compliant responses
6. Submit application
7. Record result in database

**ATS Adapters** (`src/adapters/`):
- `greenhouse.ts` - Greenhouse ATS
- `lever.ts` - Lever ATS
- `workday.ts` - Workday ATS
- `linkedin.ts` - LinkedIn Easy Apply
- `generic.ts` - Fallback for unknown systems

### 6. Field Mapping (`src/ai/mapper.ts`)

Three-tier system for form field understanding:

**Tier 1: Heuristics** (Fast, Pattern-Based)
- Email: Matches "email", "e-mail"
- Phone: Matches "phone", "mobile", "tel"
- Name: Matches "name", "first", "last"
- ~50 common patterns

**Tier 2: Cache** (Medium, Experience-Based)
- Stores successful mappings
- Keys: field label + field type
- Reuses across similar forms
- 90%+ hit rate after initial runs

**Tier 3: AI** (Slow, Semantic)
- Sends to Ollama for analysis
- Semantic understanding of unusual fields
- Example: "What's your superpower?" → freeform
- Result cached for future use

### 7. Dashboard (`src/dashboard/`)

Real-time web interface:

**Backend** (`src/dashboard/server.ts`):
- Express server on port 3001
- REST API endpoints
- HTTPS with self-signed certificates
- Reads from shared database
- AI content generation endpoints

**Frontend** (`src/dashboard/client/`):
- React SPA on port 3000 (dev)
- TanStack Query for data fetching
- Auto-refresh every 5 seconds
- Client-side routing
- Tailwind CSS styling

**Routes**:
- `/` - Statistics overview
- `/jobs` - Job list with filters
- `/leads` - Leads database
- `/runs` - Execution history
- `/analytics` - Performance charts
- `/automation` - Run commands

### 8. Lead Scraping (`src/services/leads-scraper.ts`)

LinkedIn connection scraping:

**Process**:
1. Navigate to "My Network" connections
2. Filter by location (US default)
3. Optional: Filter by title keywords (profiles)
4. Scroll to load all connections
5. For each connection:
   - Extract name, title, company, location
   - Visit profile (if not blocked)
   - Extract contact info (email, phone, website)
   - Extract recent articles
   - Store in database
6. Skip existing leads (no duplicates)
7. Respect rate limits and timeouts

**Lead Profiles** (`src/ai/lead-profiles.ts`):
- Pre-defined title filters
- 6 built-in profiles (chiefs, founders, directors, etc.)
- Custom title filtering available

### 9. AI Content Generation

**Headlines** (`src/dashboard/routes/headline.ts`):
- One-sentence professional summary
- Tailored to specific job
- Uses resume context (RAG)
- Generated on-demand via dashboard

**Cover Letters** (`src/dashboard/routes/cover-letter.ts`):
- Full cover letter
- Analyzes job fit
- References resume experience
- Professional tone
- Generated on-demand via dashboard

## Data Flow

### Job Search Flow
```
User: npm run search --profile core
  ↓
CLI parses args → Profile selected
  ↓
Playwright opens LinkedIn → Boolean search executed
  ↓
Jobs scraped → Stored in DB (status: unranked)
  ↓
For each job:
  AI ranks job → Score calculated → Filters applied
  ↓
  Score ≥ MIN_FIT_SCORE → Status: queued
  Score < MIN_FIT_SCORE → Status: skipped
  ↓
Dashboard auto-refreshes → Shows new queued jobs
```

### Application Flow
```
User: npm run apply --easy
  ↓
CLI finds queued Easy Apply jobs
  ↓
For each job:
  Playwright navigates to URL
    ↓
  ATS platform detected
    ↓
  Adapter loaded → Form fields extracted
    ↓
  Field mapping (heuristics → cache → AI)
    ↓
  Form filled → Application submitted
    ↓
  Result recorded in DB (status: applied or skipped)
    ↓
Dashboard shows updated stats
```

### Lead Scraping Flow
```
User: npm run leads:search --profile chiefs
  ↓
CLI opens LinkedIn connections
  ↓
Filter by location and titles
  ↓
For each connection:
  Extract basic info → Visit profile → Extract contact info
  ↓
  Store in leads table (deduplicated)
  ↓
Dashboard shows lead count and details
```

## Key Design Decisions

### Why SQLite?
- Single file, easy to backup
- No separate database server
- Fast enough for local use
- Built-in transactions

### Why Local AI?
- Privacy (no data sent to cloud)
- No API costs or rate limits
- Consistent performance
- Works offline

### Why Separate CLI and Dashboard?
- CLI for automation (scheduled runs)
- Dashboard for monitoring (real-time view)
- Independent operation
- Shared database keeps them in sync

### Why Three-Tier Mapping?
- Fast path for common fields (heuristics)
- Learning from experience (cache)
- Fallback for edge cases (AI)
- Balances speed and accuracy

### Why Profile-Based Search?
- Targeted job discovery
- Different scoring for different roles
- Easy to add new profiles
- Reusable Boolean queries

## Extension Points

### Adding New ATS Adapter
1. Create adapter in `src/adapters/`
2. Implement `detectJobBoard()` and `fillApplication()`
3. Export from `src/adapters/index.ts`
4. Test with known job URL

### Adding New Profile
1. Edit `src/ai/profiles.ts`
2. Add profile with search query and keywords
3. Set category weights
4. Test with `npm run search --profile yourprofile`

### Adding New Dashboard Route
1. Backend: Add route in `src/dashboard/routes/`
2. Frontend: Add component in `src/dashboard/client/components/`
3. Add route in `src/dashboard/client/App.tsx`
4. Update navigation as needed

### Adding New Command
1. Create command in `src/commands/`
2. Register in `src/cli.ts`
3. Add npm script in `package.json`
4. Document in README

## Performance Optimization

### Database
- Indexed columns for fast queries
- Batch inserts for scraping
- Connection reuse
- Prepared statements

### AI
- Cache expensive LLM calls
- Parallel processing where possible
- Three-tier mapping reduces AI usage
- Resume context loaded once, reused

### Browser Automation
- Session persistence (no repeated login)
- Selector learning (faster form detection)
- Screenshot only on failures
- Network request monitoring for debugging

### Dashboard
- TanStack Query caching
- Auto-refresh with stale-while-revalidate
- Virtual scrolling for large lists
- Optimistic updates

## Monitoring & Debugging

### Artifacts
- `artifacts/` - Screenshots and Playwright traces
- Automatically captured on failures
- View traces: `npx playwright show-trace <file>`

### Logs
- Console output for all operations
- Detailed error messages with context
- Database tracks all runs

### Dashboard Analytics
- Success rate over time
- Company performance
- Score distribution
- Profile effectiveness

## Security Considerations

- LinkedIn session stored locally
- Database not encrypted (local only)
- No external API calls (except Ollama)
- Backups contain sensitive data
- Test mode prevents production data access

