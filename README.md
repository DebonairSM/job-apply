# LinkedIn Job Application Automation

Automatically search, rank, and apply to LinkedIn jobs while you sleep. The system uses AI to find jobs that match your profile and fills out applications for you.

## What This Does

1. **Finds Jobs**: Searches LinkedIn based on your criteria
2. **Ranks Them**: AI scores each job against your profile (0-100)
3. **Applies Automatically**: Fills out application forms for high-scoring jobs
4. **Runs Locally**: Everything stays on your computer - no data sent to cloud services

## Quick Start

### Step 1: Install Required Software

Download and install these three programs:

1. **Node.js 20+**: https://nodejs.org/ (choose LTS version)
2. **Docker Desktop**: https://www.docker.com/products/docker-desktop/
3. **Git**: https://git-scm.com/downloads (if not already installed)

### Step 2: Download This Project

Open a terminal and run:

```bash
git clone <repository-url>
cd job-apply
npm install
npx playwright install
```

### Step 3: Start the AI Brain

Open a terminal and run:

```bash
docker compose -f docker-compose.llm.yml up -d
```

Wait for it to download (about 5GB, first time only).

### Step 4: Add Your Information

1. Copy the file `.env.example` and rename it to `.env`
2. Open `.env` in a text editor
3. Fill in your details:
   - Name, email, phone number
   - Your skills and job preferences
   - Location preferences
4. Save the file

### Step 5: Add Your Resume

Place your resume file in the `resumes/` folder. Supported formats: PDF or DOCX.

### Step 6: Log Into LinkedIn (One Time Only)

```bash
npm run login
```

A browser window opens. Log into LinkedIn normally (including two-factor authentication if you have it). When done, go back to the terminal and press ENTER.

### Step 7: Start Using It

**Search for jobs:**
```bash
npm run search "Software Engineer"
```

The AI will score each job. High-scoring jobs get added to your queue automatically.

**See what's in your queue:**
```bash
npm run status
```

**Test an application (doesn't actually submit):**
```bash
npm run apply -- --easy --dry-run
```

**Apply to jobs for real:**
```bash
npm run apply -- --easy
```

That's it! The system will start applying to jobs in your queue.

## Common Tasks

### Search with Filters

```bash
# Remote jobs only
npm run search "Data Analyst" -- --remote

# Specific location
npm run search "Product Manager" -- --location "San Francisco"

# Recent postings only
npm run search "UX Designer" -- --date week

# Only queue jobs scoring 80 or higher
npm run search "DevOps Engineer" -- --min-score 80
```

### Profile-Based Boolean Searches

Use predefined technical profiles with advanced Boolean search logic:

```bash
# Core Azure API Engineer roles
npx tsx src/cli.ts search --profile core

# Security & Governance focused
npx tsx src/cli.ts search --profile security

# Event-Driven Architecture
npx tsx src/cli.ts search --profile event-driven

# Performance & Reliability
npx tsx src/cli.ts search --profile performance

# DevOps/CI-CD heavy teams
npx tsx src/cli.ts search --profile devops

# Broader Senior Backend .NET
npx tsx src/cli.ts search --profile backend

# Combine with date filter
npx tsx src/cli.ts search --profile core --date week
```

Each profile uses sophisticated Boolean search strings targeting specific technical requirements (Azure, APIM, .NET, Service Bus, etc.) and automatically includes Remote filter.

### Check Your Progress

```bash
# View overall statistics
npm run status

# See queued jobs
npm run list queued

# See applied jobs
npm run list applied
```

### Apply to Specific Types

```bash
# Only LinkedIn Easy Apply jobs
npm run apply -- --easy

# Only external company websites (Greenhouse, Lever, etc.)
npm run apply -- --ext

# Apply to everything queued
npm run apply
```

## What You Need to Know

### About Scoring

The AI evaluates jobs across 6 technical categories with weighted scoring:

**Evaluation Categories:**
1. **Core Azure API Skills (30%)** - Azure, APIM, Functions, Service Bus, C#/.NET
2. **Security & Governance (20%)** - OAuth, JWT, Entra ID, API Security
3. **Event-Driven Architecture (15%)** - Service Bus, Event Grid, Integration
4. **Performance & Reliability (15%)** - Load Testing, Redis, Observability
5. **DevOps/CI-CD (10%)** - Azure DevOps, GitHub Actions, Docker, IaC
6. **Seniority & Role Type (10%)** - Senior/Lead level, Remote work

Each category is scored 0-100, then weighted to produce the final fit score.

**Score Ranges:**
- **90-100**: Exceptional match - hits most technical requirements
- **75-89**: Strong match - good fit across multiple categories
- **60-74**: Moderate match - some key skills present
- **40-59**: Weak match - missing critical requirements
- **Below 40**: Poor match - wrong tech stack or seniority level

When viewing results, you'll see category breakdowns to understand exactly which technical areas match or don't match.

### About Privacy

Everything runs on your computer. No job data, resume info, or personal details are sent to any cloud service. The AI model runs locally in Docker.

### About Speed

- Searching and ranking 25 jobs: 2-5 minutes
- Applying to one Easy Apply job: 30-90 seconds
- Applying to one external job: 20-60 seconds

## Troubleshooting

### The AI Isn't Responding

Check if Docker is running:
```bash
docker ps
```

You should see a container named "ollama". If not, restart it:
```bash
docker compose -f docker-compose.llm.yml up -d
```

### Session Expired / Can't Access LinkedIn

Run the login command again:
```bash
npm run login
```

### Forms Aren't Filling Correctly

1. Try a dry run first to see what would be filled:
   ```bash
   npm run apply -- --easy --dry-run
   ```

2. Check the `artifacts/` folder for screenshots showing what happened

3. Your `.env` file might be missing required fields

### Jobs Not Being Found

- Make sure you're logged into LinkedIn (`npm run login`)
- Try a broader search term
- LinkedIn may have changed their website (selectors may need updating)

---

## Advanced Usage

### Alternative Command Format

You can run commands using `npx tsx` directly instead of npm scripts:

```bash
# Instead of: npm run search "Engineer"
npx tsx src/cli.ts search "Engineer"

# Instead of: npm run login
npx tsx src/commands/login.ts

# Instead of: npm run apply -- --easy
npx tsx src/cli.ts apply --easy
```

### Configuration Options

Edit your `.env` file to customize behavior:

- `MIN_FIT_SCORE`: Minimum score to queue jobs (default: 70)
- `LLM_MODEL`: AI model to use (default: llama3.1:8b-instruct)
- `HEADLESS`: Run browser in background (true/false)
- `ENABLE_TRACING`: Save detailed logs for debugging (true/false)

### Answer Policies

Edit `answers-policy.yml` to control how application questions are answered:

```yaml
fields:
  why_fit:
    max_length: 400
    strip_emoji: true
  requires_sponsorship:
    allowed_values: ["Yes", "No"]
```

### Running Tests

Verify the system is working correctly:

```bash
npm test
```

---

## Technical Documentation

## Architecture

### Three-Phase Pipeline

1. **Search & Rank**: LLM scores jobs against your profile, only queues high-fit matches
2. **Prepare Answers**: LLM synthesizes tailored responses, validates with Zod schemas
3. **Fill Forms**: Heuristics map common fields instantly, LLM handles edge cases

### Key Components

- **Database**: Single SQLite file (`data/app.db`) tracks jobs, answers, mappings, and execution logs
- **AI Layer**: Ollama-based LLM with retry logic, JSON validation, and response caching
- **Adapters**: Pluggable ATS adapters for Greenhouse, Lever, Workday with smoke tests
- **Resilience**: Playwright tracing, screenshots per step, graceful error handling

### Data Flow

```
LinkedIn Search → Extract Jobs → LLM Rank → Queue (if score >= threshold)
↓
Load Job → LLM Synthesize Answers → Cache
↓
Navigate → Extract Labels → Heuristics/LLM Map → Fill Form → Submit
↓
Update Status → Log Run → Save Artifacts
```

### Tech Stack

- **TypeScript 5.6** with ES2022 modules
- **Playwright** for browser automation
- **SQLite** (better-sqlite3) for local data storage
- **Ollama** + **Llama 3.1 8B** for AI inference
- **Zod** for schema validation
- **Yargs** for CLI parsing

### Test Suite

Run tests to verify functionality:

```bash
# All tests
npm test

# Specific test suite
npx tsx --test tests/login.test.ts      # Login module tests
npx tsx --test tests/search.test.ts     # Search command tests
npx tsx --test tests/integration.test.ts # End-to-end integration tests
npx tsx --test tests/mapper.test.ts     # AI mapper tests
```

All tests run in under 30 seconds without requiring LinkedIn login.

### Performance Benchmarks

- Job ranking: 2-5 seconds per job
- Field mapping (cached): < 50ms
- Field mapping (LLM): 1-3 seconds
- Easy Apply form: 30-90 seconds per job
- External ATS form: 20-60 seconds per job

## For Developers

### Extending the System

**Add New ATS Adapter:**

1. Create `src/adapters/newats.ts` implementing `ATSAdapter` interface
2. Add detect(), smoke(), and fill() methods
3. Register in `src/commands/apply.ts` ADAPTERS array

**Add New Canonical Field:**

1. Add to `CANONICAL_KEYS` in `src/ai/mapper.ts`
2. Add heuristic pattern if applicable
3. Update `AnswersSchema` in `src/lib/validation.ts`
4. Update `answers-policy.yml` with constraints

### Planned Features

**Multi-Page Search Support:**
Currently processes only the first page of results (25 jobs). Future versions will support pagination to search hundreds of jobs across multiple pages.

**Other Enhancements:**
- Resume variant auto-selection based on job requirements
- Application templates for common answer patterns
- Scheduled searches (e.g., daily)
- Analytics dashboard for tracking success rates
- Smart retry logic for failed applications

## License & Disclaimer

**License:** MIT

**Disclaimer:** This tool is for personal use to streamline your job search. Always review applications before final submission and respect LinkedIn's terms of service. Use reasonable rate limits to avoid account restrictions.


