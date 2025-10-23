# LinkedIn Job Application Automation

Automatically search, rank, and apply to LinkedIn jobs using local AI. The system finds jobs matching your profile and fills out applications.

## Requirements

- **Node.js 20+**: https://nodejs.org/
- **Docker Desktop**: https://www.docker.com/products/docker-desktop/
- **Git**: https://git-scm.com/downloads

## Setup

```bash
git clone <repository-url>
cd job-apply
npm install
npx playwright install
```

## Configuration

### 1. Start Local LLM

```bash
docker compose -f docker-compose.llm.yml up -d
```

First run downloads ~5GB.

### 2. Add Your Information

Create `.env` file with your details:
- Name, email, phone
- Skills and preferences
- Location requirements

### 3. Add Resume

Place resume (PDF or DOCX) in `resumes/` folder.

### 4. Login to LinkedIn

```bash
npm run login
```

Browser opens for LinkedIn login. Complete authentication, then press ENTER in terminal.

## Usage

### Search for Jobs

```bash
# Basic search
npm run search "Software Engineer"

# With filters
npm run search "Data Analyst" -- --remote --date week --min-score 80

# Profile-based search (see Profiles section)
npm run search -- --profile core
```

### Check Status

```bash
npm run status         # Overall statistics
npm run list queued    # View queued jobs
npm run list applied   # View applied jobs
```

### Generate Report

```bash
npm run report
```

Creates HTML report in `reports/` folder with job details, scores, and analysis.

### Apply to Jobs

```bash
# Test run (doesn't submit)
npm run apply -- --easy --dry-run

# Apply to Easy Apply jobs
npm run apply -- --easy

# Apply to external sites (Greenhouse, Lever, etc.)
npm run apply -- --ext
```

## Job Profiles

Profile-based searches use Boolean logic targeting specific technical requirements. All profiles include Remote filter and default to jobs posted in last 24 hours.

### Available Profiles

**`--profile core`** - Core Azure API Engineer roles  
Focus: Azure, APIM, Functions, Service Bus, C#/.NET

**`--profile security`** - Security & Governance  
Focus: OAuth, JWT, Entra ID, APIM Policies

**`--profile event-driven`** - Event-Driven Architecture  
Focus: Service Bus, Event Grid, Integration

**`--profile performance`** - Performance & Reliability  
Focus: Load Testing, Redis, Observability

**`--profile devops`** - DevOps/CI-CD  
Focus: Azure DevOps, GitHub Actions, Docker, IaC

**`--profile backend`** - Senior Backend .NET (broadest)  
Focus: Senior .NET/Azure roles across all areas

### Examples

```bash
# Core Azure API roles from this week
npm run search -- --profile core --date week

# Security-focused roles, minimum score 80
npm run search -- --profile security --min-score 80

# Process only first 3 pages
npm run search -- --profile devops --max-pages 3
```

## Job Scoring

AI evaluates jobs across 6 weighted categories:

1. **Core Azure API Skills (30%)** - Azure, APIM, Functions, Service Bus, C#/.NET
2. **Security & Governance (20%)** - OAuth, JWT, Entra ID, API Security
3. **Event-Driven Architecture (15%)** - Service Bus, Event Grid, Integration
4. **Performance & Reliability (15%)** - Load Testing, Redis, Observability
5. **DevOps/CI-CD (10%)** - Azure DevOps, GitHub Actions, Docker, IaC
6. **Seniority & Role Type (10%)** - Senior/Lead level, Remote work

### Score Ranges

- **90-100**: Exceptional match
- **75-89**: Strong match
- **60-74**: Moderate match
- **40-59**: Weak match
- **Below 40**: Poor match

System automatically identifies blockers like wrong tech stack (AWS/Python), wrong seniority level, or on-site only positions.

## Configuration Options

Edit `.env` to customize:

- `MIN_FIT_SCORE`: Minimum score to queue jobs (default: 70)
- `LLM_MODEL`: AI model (default: llama3.1:8b-instruct)
- `HEADLESS`: Run browser in background (true/false)
- `ENABLE_TRACING`: Save debug logs (true/false)

Edit `answers-policy.yml` to control application responses:

```yaml
fields:
  why_fit:
    max_length: 400
    strip_emoji: true
  requires_sponsorship:
    allowed_values: ["Yes", "No"]
```

## Troubleshooting

### AI Not Responding

```bash
docker ps  # Check if ollama container running
docker compose -f docker-compose.llm.yml up -d  # Restart if needed
```

### Session Expired

```bash
npm run login
```

### Forms Not Filling

1. Try dry run: `npm run apply -- --easy --dry-run`
2. Check `artifacts/` folder for screenshots
3. Verify `.env` has required fields

### No Jobs Found

- Verify LinkedIn login: `npm run login`
- Try broader search terms
- Use `--profile backend` for widest search

## Architecture

### Pipeline

1. **Search & Rank**: LLM scores jobs, queues high-fit matches
2. **Prepare Answers**: LLM generates responses with validation
3. **Fill Forms**: Map fields and submit applications

### Components

- **Database**: SQLite (`data/app.db`) tracks jobs, answers, logs
- **AI**: Ollama-based LLM with caching and retry logic
- **Adapters**: Support for Greenhouse, Lever, Workday
- **Browser**: Playwright with tracing and screenshots

### Tech Stack

- TypeScript 5.6
- Playwright (browser automation)
- SQLite (better-sqlite3)
- Ollama + Llama 3.1 8B
- Zod (validation)
- Yargs (CLI)

### Tests

```bash
npm test  # All tests
npx tsx --test tests/login.test.ts
npx tsx --test tests/search.test.ts
npx tsx --test tests/integration.test.ts
npx tsx --test tests/mapper.test.ts
```

## Privacy

Everything runs locally. No job data, resume information, or personal details are sent to cloud services.

## Performance

- Ranking 25 jobs (1 page): 2-5 minutes
- Ranking 75 jobs (3 pages): 6-15 minutes
- Generating report: 1-2 seconds
- Easy Apply job: 30-90 seconds
- External ATS job: 20-60 seconds

## Development

### Add ATS Adapter

1. Create `src/adapters/newats.ts` implementing `ATSAdapter` interface
2. Add `detect()`, `smoke()`, `fill()` methods
3. Register in `src/commands/apply.ts`

### Add Canonical Field

1. Add to `CANONICAL_KEYS` in `src/ai/mapper.ts`
2. Add heuristic pattern if applicable
3. Update `AnswersSchema` in `src/lib/validation.ts`
4. Update `answers-policy.yml`

## License

MIT

## Disclaimer

This tool is for personal use. Review applications before submission and respect LinkedIn's terms of service. Use reasonable rate limits.
