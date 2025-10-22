# LinkedIn Job Application Automation

An intelligent, local-first job application automation system for LinkedIn using TypeScript, Playwright, and local LLM (Ollama).

## Features

- **Hybrid Intelligence**: Heuristics-first field mapping with LLM fallback for adaptive form filling
- **AI-Powered Job Ranking**: Local LLM scores jobs against your profile before applying
- **Dual Application Support**: Handles both LinkedIn Easy Apply and external ATS systems (Greenhouse, Lever, Workday)
- **Session Management**: One-time login with reusable session storage
- **Learned Mappings**: Caches field mappings to become faster over time
- **Resilient Execution**: Traces, screenshots, and structured logging for debugging
- **Privacy-First**: All data stays local - no cloud services required

## Prerequisites

- Node.js 20+
- Docker (for Ollama)
- Windows/Mac/Linux

## Installation

### 1. Clone and Install

```bash
cd li-assistant
npm install
npx playwright install
```

### 2. Start Local LLM

```bash
# Start Ollama container
docker compose -f docker-compose.llm.yml up -d

# Pull the model (first time only, ~4.7GB)
curl http://localhost:11434/api/pull -d '{"name":"llama3.1:8b-instruct"}'
```

### 3. Configure

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your information
# - Personal details (name, email, phone, etc.)
# - Profile summary for LLM ranking
# - Resume variants available
```

### 4. Add Resumes

Place your resume PDF files in the `resumes/` directory. Make sure the filenames match what you specified in `.env` under `RESUME_VARIANTS`.

## Usage

You can run commands in two ways:

**Method 1: Using npm scripts (recommended)**
```bash
npm run <command>
```

**Method 2: Direct execution with npx tsx**
```bash
npx tsx src/cli.ts <command>
```

### One-Time Login

```bash
npm run login
# OR
npx tsx src/commands/login.ts
```

This opens a browser where you manually log into LinkedIn (including 2FA). Press ENTER in the terminal when done to save the session.

### Search and Rank Jobs

```bash
# Basic search
npm run search "Azure API Engineer"
# OR
npx tsx src/cli.ts search "Azure API Engineer"

# With filters
npm run search "Senior .NET Developer" -- --location "United States" --remote --date week --min-score 75
# OR
npx tsx src/cli.ts search "Senior .NET Developer" --location "United States" --remote --date week --min-score 75
```

Options:
- `--location, -l`: Job location (e.g., "United States", "Remote")
- `--remote, -r`: Filter for remote jobs only
- `--date, -d`: Date posted filter (day, week, month)
- `--min-score, -m`: Minimum fit score to queue (0-100, default from .env)

### Check Status

```bash
# View statistics
npm run status
# OR
npx tsx src/cli.ts status

# List jobs by status
npm run list queued
# OR
npx tsx src/cli.ts list queued
```

### Apply to Jobs

```bash
# Dry run first (recommended) - shows what would be filled
npm run apply -- --easy --dry-run
# OR
npx tsx src/cli.ts apply --easy --dry-run

# Apply to Easy Apply jobs
npm run apply -- --easy
# OR
npx tsx src/cli.ts apply --easy

# Apply to external ATS jobs
npm run apply -- --ext
# OR
npx tsx src/cli.ts apply --ext

# Apply to all queued jobs
npm run apply
# OR
npx tsx src/cli.ts apply

# Apply to specific job
npm run apply -- --job <job-id>
# OR
npx tsx src/cli.ts apply --job <job-id>
```

### Maintenance

```bash
# Clear caches if you update prompts
npm run clear-cache answers
# OR
npx tsx src/cli.ts clear-cache answers

# Run mapper accuracy tests
npm test
# OR
npx tsx --test tests/mapper.test.ts
```

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

## Configuration

### Environment Variables

See `.env.example` for all options. Key settings:

- `PROFILE_SUMMARY`: Multi-line text describing your skills and preferences (used for ranking)
- `MIN_FIT_SCORE`: Threshold for queueing jobs (default: 70)
- `LLM_MODEL`: Ollama model to use (default: llama3.1:8b-instruct)
- `LLM_TEMPERATURE`: Controls randomness (0.1 = consistent, 1.0 = creative)
- `HEADLESS`: Run browser in background (false = visible for debugging)
- `ENABLE_TRACING`: Save Playwright traces for debugging

### Answer Policy

Edit `answers-policy.yml` to set field constraints:

```yaml
fields:
  why_fit:
    max_length: 400
    strip_emoji: true
  requires_sponsorship:
    allowed_values: ["Yes", "No"]
```

## Troubleshooting

### LLM Not Responding

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart container
docker compose -f docker-compose.llm.yml restart
```

### Session Expired

```bash
# Re-run login
npm run login
```

### Form Not Filling

1. Check artifacts/{job-id}/ for screenshots
2. Run with `--dry-run` to see field mappings
3. Open trace.zip with `npx playwright show-trace artifacts/{job-id}/trace.zip`

### Low Ranking Accuracy

- Enhance your `PROFILE_SUMMARY` in `.env` with more specific skills and preferences
- Lower `MIN_FIT_SCORE` to queue more jobs
- Check that the LLM model is loaded: `curl http://localhost:11434/api/tags`

## Security & Privacy

- Session tokens stored locally in `storage/storageState.json` (git-ignored)
- Database contains job data and cached responses (git-ignored)
- PII is redacted in logs
- No data sent to cloud services
- Ollama runs entirely on your machine

## Extending

### Add New ATS Adapter

1. Create `src/adapters/newats.ts` implementing `ATSAdapter` interface
2. Add detect(), smoke(), and fill() methods
3. Register in `src/commands/apply.ts` ADAPTERS array

### Add New Canonical Field

1. Add to `CANONICAL_KEYS` in `src/ai/mapper.ts`
2. Add heuristic pattern if applicable
3. Update `AnswersSchema` in `src/lib/validation.ts`
4. Update `answers-policy.yml` with constraints

## Performance

- Typical job ranking: 2-5 seconds per job
- Field mapping (cached): < 50ms
- Field mapping (LLM): 1-3 seconds
- Easy Apply form: 30-90 seconds per job (varies by steps)
- External ATS form: 20-60 seconds per job

## License

MIT

## Disclaimer

This tool is for personal use to streamline your job search. Always review applications before final submission and respect LinkedIn's terms of service. Use reasonable rate limits and delays to avoid detection or account restrictions.


