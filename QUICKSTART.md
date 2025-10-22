# Quick Start Guide

Get up and running with the LinkedIn Job Application Automation in 5 minutes.

## Step 1: Install Dependencies (2 minutes)

```bash
npm install
npx playwright install
```

## Step 2: Start the Local LLM (1 minute)

```bash
# Start Ollama in Docker
docker compose -f docker-compose.llm.yml up -d

# Pull the model (only needed once, ~4.7GB download)
curl http://localhost:11434/api/pull -d '{"name":"llama3.1:8b-instruct"}'
```

Wait for the model to download. You can check status:
```bash
curl http://localhost:11434/api/tags
```

## Step 3: Configure Your Profile (1 minute)

```bash
# Copy the template
cp .env.example .env
```

Edit `.env` and fill in:
- Your personal information (name, email, phone, city)
- Work authorization status
- Years of experience with key technologies
- **Most Important**: `PROFILE_SUMMARY` - describe your skills, experience, and what you're looking for

Example profile summary:
```
Senior .NET engineer with 10+ years experience in microservices and cloud architecture. 
Expert in Azure API Management, Service Bus, and distributed systems. 
Looking for remote senior or lead roles focused on backend API development and platform engineering.
```

## Step 4: Add Your Resume (30 seconds)

1. Place your resume PDF in the `resumes/` folder
2. Update the `RESUME_VARIANTS` line in `.env` to match your filename:
   ```
   RESUME_VARIANTS=My-Resume.pdf
   ```

## Step 5: Log In to LinkedIn (30 seconds)

```bash
npx tsx src/commands/login.ts
```

A browser will open. Log in to LinkedIn (including 2FA if you have it), then press ENTER in the terminal.

> **Tip**: You can also use `npm run login` if you prefer npm scripts.

## Step 6: Search for Jobs (30 seconds)

```bash
# Example: Search for remote Azure jobs
npx tsx src/cli.ts search "Azure API Engineer" --location "United States" --remote --min-score 75
```

The system will:
1. Find jobs matching your keywords
2. Extract full job descriptions
3. Use AI to score each job against your profile
4. Queue jobs scoring 75+ for application

## Step 7: Review Queued Jobs (30 seconds)

```bash
# See statistics
npx tsx src/cli.ts status

# List queued jobs with details
npx tsx src/cli.ts list queued
```

## Step 8: Apply (Test First!)

```bash
# Dry run to see what would happen (recommended first time)
npx tsx src/cli.ts apply --easy --dry-run

# Actually apply
npx tsx src/cli.ts apply --easy
```

For external applications:
```bash
npx tsx src/cli.ts apply --ext --dry-run
npx tsx src/cli.ts apply --ext
```

## What Happens During Application

### Easy Apply:
1. Opens job on LinkedIn
2. Clicks "Easy Apply"
3. Extracts field labels from each step
4. Maps labels to your info (heuristics + AI)
5. Fills fields automatically
6. Uploads resume
7. Progresses through steps
8. Submits application

### External ATS:
1. Opens job on LinkedIn
2. Clicks external "Apply" link
3. Detects ATS type (Greenhouse, Lever, Workday, etc.)
4. Fills form using ATS-specific adapter
5. Pauses for human review before final submit

## Troubleshooting

### "No saved session found"
```bash
npx tsx src/commands/login.ts
```

### "Ollama not responding"
```bash
docker compose -f docker-compose.llm.yml restart
curl http://localhost:11434/api/tags
```

### Form not filling correctly
1. Check screenshots: `artifacts/{job-id}/step-*.png`
2. View trace: `npx playwright show-trace artifacts/{job-id}/trace.zip`
3. Run dry-run to see mappings: `npx tsx src/cli.ts apply --dry-run`

### No jobs queued
- Lower `MIN_FIT_SCORE` in `.env` (try 60 or 50)
- Expand your `PROFILE_SUMMARY` to include more keywords
- Try broader search terms

## Tips for Best Results

1. **Profile Summary**: The more detailed, the better AI can rank jobs
2. **Multiple Resume Variants**: Create specialized resumes (e.g., "Azure-Lead.pdf", "Backend-Sr.pdf")
3. **Start with Dry Run**: Always test with `--dry-run` first
4. **Review Manually**: Check a few applications manually to verify accuracy
5. **Rate Limiting**: Built-in delays keep you safe, don't disable them
6. **Cache Works**: Field mappings get faster over time as the cache builds

## Daily Workflow

```bash
# Morning: Search new jobs
npx tsx src/cli.ts search "Your Keywords" --remote --date day --min-score 75

# Review what was found
npx tsx src/cli.ts list queued

# Apply (dry run first)
npx tsx src/cli.ts apply --easy --dry-run
npx tsx src/cli.ts apply --easy

# Check results
npx tsx src/cli.ts status
```

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- See [COMMANDS.md](COMMANDS.md) for complete command reference
- Customize `answers-policy.yml` for field constraints
- Add more resume variants for different job types
- Run `npx tsx --test tests/mapper.test.ts` to verify field mapping accuracy

## Support

If something goes wrong:
1. Check `artifacts/` folder for screenshots and traces
2. Review console output for error messages
3. Verify Ollama is running: `curl http://localhost:11434/api/tags`
4. Re-run login if session expired: `npx tsx src/commands/login.ts`

Happy job hunting! 🚀


