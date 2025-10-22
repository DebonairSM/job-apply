# Command Reference

Quick reference for all available commands. You can run these using either npm scripts or direct execution.

## Command Execution Methods

**Method 1: NPM Scripts** (requires package.json setup)
```bash
npm run <command>
```

**Method 2: Direct Execution** (works immediately)
```bash
npx tsx src/cli.ts <command>
```

## Quick Command List

### View Help
```bash
npx tsx src/cli.ts --help
```

### Login (One-Time Setup)
```bash
npx tsx src/commands/login.ts
```

### Search for Jobs
```bash
# Basic search
npx tsx src/cli.ts search "Job Title"

# With filters
npx tsx src/cli.ts search "Azure Engineer" --location "United States" --remote --date week --min-score 75

# Options:
#   --location, -l   Job location (e.g., "United States", "Remote")
#   --remote, -r     Remote jobs only
#   --date, -d       Date filter: day, week, month
#   --min-score, -m  Minimum fit score (0-100)
```

### View Status & Jobs
```bash
# Show statistics
npx tsx src/cli.ts status

# List all queued jobs
npx tsx src/cli.ts list queued

# List by status: queued, applied, interview, rejected, skipped
npx tsx src/cli.ts list applied
```

### Apply to Jobs
```bash
# DRY RUN (recommended first!)
npx tsx src/cli.ts apply --easy --dry-run

# Apply to Easy Apply jobs
npx tsx src/cli.ts apply --easy

# Apply to external ATS jobs
npx tsx src/cli.ts apply --ext

# Apply to all queued jobs
npx tsx src/cli.ts apply

# Apply to specific job
npx tsx src/cli.ts apply --job <job-id>

# Options:
#   --easy, -e       Only Easy Apply jobs
#   --ext, -x        Only external ATS jobs
#   --job, -j <id>   Specific job ID
#   --dry-run, -n    Don't actually submit (preview only)
```

### Maintenance
```bash
# Clear cached answers
npx tsx src/cli.ts clear-cache answers

# Clear label mappings
npx tsx src/cli.ts clear-cache mapping

# Clear all caches
npx tsx src/cli.ts clear-cache all

# Run tests
npx tsx --test tests/mapper.test.ts
```

### Re-rank a Job
```bash
npx tsx src/cli.ts rank --job <job-id>
```

## Complete Workflow Example

```bash
# 1. One-time login
npx tsx src/commands/login.ts

# 2. Search for jobs
npx tsx src/cli.ts search "Senior .NET Developer" --remote --min-score 70

# 3. Review what was found
npx tsx src/cli.ts list queued

# 4. Test with dry run
npx tsx src/cli.ts apply --easy --dry-run

# 5. Apply for real
npx tsx src/cli.ts apply --easy

# 6. Check status
npx tsx src/cli.ts status
```

## Troubleshooting Commands

### Check if Ollama is running
```bash
curl http://localhost:11434/api/tags
```

### Start Ollama (if stopped)
```bash
docker compose -f docker-compose.llm.yml up -d
```

### View job artifacts (screenshots & traces)
```bash
# Screenshots are in: artifacts/{job-id}/step-*.png
# Traces are in: artifacts/{job-id}/trace.zip

# View a trace
npx playwright show-trace artifacts/{job-id}/trace.zip
```

### Re-run login if session expired
```bash
npx tsx src/commands/login.ts
```

## Tips

1. **Always use `--dry-run` first** to see what the system will do
2. **Start with high min-score** (75+) to only get best matches
3. **Review queued jobs** before applying to verify quality
4. **Check artifacts/** folder if something goes wrong (screenshots show exactly what happened)
5. **Session persists** - you only need to login once unless it expires

## Environment Setup

Before first run, make sure you have:
1. ✅ Copied `.env.example` to `.env` and filled in your info
2. ✅ Added resume PDFs to `resumes/` folder
3. ✅ Started Ollama: `docker compose -f docker-compose.llm.yml up -d`
4. ✅ Pulled the model: `curl http://localhost:11434/api/pull -d '{"name":"llama3.1:8b-instruct"}'`

## Quick Test (No LinkedIn Required)

```bash
# Install dependencies
npm install

# Test the mapper (doesn't need LinkedIn login)
npx tsx --test tests/mapper.test.ts

# View CLI help
npx tsx src/cli.ts --help

# Check database status (will be empty initially)
npx tsx src/cli.ts status
```

