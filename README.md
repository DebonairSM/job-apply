# Opp Scraper

**Intelligent LinkedIn scraper for jobs and professional networking.**

Transform your job search and networking from hours of manual work into minutes of intelligent automation. This system scrapes job opportunities, identifies valuable connections in your network, and automates outreach - all powered by local AI that protects your privacy.

---

## What It Does

**🎯 Smart Job Discovery**  
Searches LinkedIn with profile-specific queries, finds jobs that match your expertise, and queues high-scoring opportunities automatically.

**👥 Network Lead Generation**  
Scrapes your 1st degree LinkedIn connections filtered by location (US), extracts contact info, and builds a database of leads for professional outreach.

**🧠 Intelligent Ranking**  
AI evaluates each job across 9 categories (Azure, Security, .NET, Performance, etc.) using weighted scoring that adapts to your preferences and learns from rejections.

**🚫 Company & Tech Filtering**  
Block unwanted companies and filter out jobs with technologies outside your stack before they're even ranked.

**🤖 Automated Applications**  
Fills application forms intelligently across different job boards (LinkedIn, Greenhouse, Lever, Workday) with AI-generated, personalized responses.

**📊 Live Dashboard**  
Monitor everything in real-time with statistics, job lists, leads database, activity logs, and learning insights that update automatically.

**🔄 Manual Learning & Refinement**  
Generate Cursor AI prompts from rejection reasons to manually refine profiles and scoring logic. Mark rejections as processed after review.

---

## Quick Start

**1. Find Jobs**
```bash
npm run search -- --profile core      # Full-time Azure/Cloud roles
npm run search -- --profile contract  # Contract/freelance positions
npm run search -- --profile security  # Security-focused roles
```

**2. Build Your Network** (optional)
```bash
npm run leads:search -- --profile chiefs       # Target C-suite executives
npm run leads:search -- --profile founders     # Find company founders
npm run leads:search -- --profile directors    # Connect with directors
npm run leads:search -- --max 100              # Limit to 100 profiles
```

**3. Monitor & Apply**
```bash
npm run dashboard:dev                # Monitor at https://localhost:3000
npm run apply -- --easy              # Apply to Easy Apply positions
```

**4. Manage Filters** (optional)
```bash
npm run block:company "CompanyName" # Block specific companies
npm run filters:list                # View active filters
```

---

## How It Works

**Search Profiles**  
Choose from 14 pre-configured profiles with tailored Boolean searches and smart scoring.

Want to create your own profile? See [`docs/PROFILE_CREATION_GUIDE.md`](docs/PROFILE_CREATION_GUIDE.md) for the complete process.

| Profile | Focus | Best For |
|---------|-------|----------|
| `core` | Azure API Engineer | Cloud-native full-time roles |
| `contract` | Contract .NET Developer | Freelance/contract positions |
| `core-net` | Pure .NET | Traditional .NET development |
| `security` | Security Engineer | Auth, governance, API security |
| `performance` | Performance Engineer | Optimization and reliability |
| `backend` | Backend Developer | General backend work |
| `event-driven` | Integration Engineer | Messaging and events |
| `devops` | DevOps Developer | CI/CD and automation |
| `legacy-modernization` | Modernization | Legacy system upgrades |
| `aspnet-simple` | ASP.NET (Simple) | Basic ASP.NET keyword search |
| `csharp-azure-no-frontend` | C# + Azure | Backend roles without Angular/React |
| `az204-csharp` | AZ-204 + C# | Azure Developer Associate certification roles |
| `ai-enhanced-net` | AI-Enhanced .NET | AI-assisted development with Cursor, Copilot, LangChain |
| `legacy-web` | Legacy Web Development | WebForms, classic MVC, jQuery, .NET Framework 4.x |

**Smart Scoring**  
Jobs score differently based on which profile finds them. Security profile emphasizes auth/governance, performance profile focuses on optimization, contract profile targets freelance keywords.

**Rejection Analysis**  
When you reject jobs and provide reasons:
- Generate Cursor AI prompts from unprocessed rejections
- Prompts identify which profiles need refinement
- Analyze scoring weights, keywords, and filters that could improve
- Mark rejections as processed after generating prompts
- Select frequent rejection reasons from dropdown when rejecting

**Auto-Apply**  
Generates personalized responses using your resume. Handles LinkedIn Easy Apply, Greenhouse, Lever, and Workday forms with intelligent field mapping.

---

## Dashboard Features

Access at **https://localhost:3000**

- **Live Stats** - Success rates, trends, updates every 5 seconds
- **Job Management** - Filter, update status, view detailed scores
- **Leads Database** - Browse connections, filter by title/company/location, export contacts
- **AI Content** - Generate headlines and cover letters per job
- **Analytics** - Timeline, company performance, score distributions
- **Automation** - Run search/apply commands with live logs
- **Rejection Prompts** - Generate Cursor AI prompts from rejections for manual system refinement

---

## Privacy & Performance

- **100% Local** - Ollama runs on your machine. Zero API costs, complete privacy.
- **Fast** - Smart caching and three-tier mapping. Operations complete in seconds.
- **Resilient** - Auto error recovery, session persistence, debug screenshots.

---

## Status Tracking

Jobs flow through a six-state lifecycle:

**queued** → **applied** → **interview** / **rejected**  
↳ **skipped** (low score or failed application)  
↳ **reported** (moved for manual review)

Update statuses as you hear back to help the learning system improve.

---

## Common Commands

**Job Search**
```bash
npm run search -- --profile contract           # Contract positions
npm run search -- --profile core               # Full-time Azure roles
npm run search -- --min-score 85 --max-pages 3 # Custom threshold
npm run search -- --profile aspnet-simple      # Simple ASP.NET keyword
npm run search -- --profile legacy-web         # Legacy WebForms/MVC/.NET Framework
npm run search -- --location "Wesley Chapel, FL" --radius 25  # Location + radius
```

**Lead Scraping**
```bash
npm run leads:search                                  # All 1st connections (US)
npm run leads:search -- --profile chiefs              # C-suite & leadership
npm run leads:search -- --profile founders            # Founders & entrepreneurs
npm run leads:search -- --profile directors           # Directors & senior mgmt
npm run leads:search -- --profile techLeads           # Tech leads & architects
npm run leads:search -- --profile recruiters          # Recruiters & talent acquisition
npm run leads:search -- --titles "CTO,VP" --max 50    # Custom titles (no profile)
npm run leads:search -- --resume 123                  # Resume previous run
```

**Job Applications**
```bash
npm run apply -- --dry-run                     # Test mode (no submit)
npm run apply -- --easy                        # Easy Apply only
npm run apply -- --job <job-id>                # Specific job
```

**Management**
```bash
npm run status                                 # View statistics
npm run list queued                            # Show queued jobs
npm run backup                                 # Backup database
npm run dashboard:dev                          # Open dashboard
```

**Filters & Blocks**
```bash
npm run block:company "CompanyName"            # Block company
npm run filters:add                            # Add tech filter
npm run filters:remove                         # Remove tech filter
npm run filters:list                           # View active filters
```

**Database Backup**
```bash
npm run backup                                 # Create manual backup
npm run backup -- --list                       # List all backups
npm run backup -- --stats                      # Show backup statistics
```

---

## Database Backup System

The system automatically backs up your database, session, and artifacts to My Documents to protect your data.

**Backup Location**  
The system automatically detects your Documents folder location:
- Windows with OneDrive: `%USERPROFILE%\OneDrive\Documents\OppScraperBackups\`
- Windows without OneDrive: `%USERPROFILE%\Documents\OppScraperBackups\`
- Mac/Linux: `~/Documents/OppScraperBackups/`

**What's Backed Up**
- Database files (`app.db` with all jobs, leads, learning data)
- LinkedIn session (`storageState.json`)
- Artifacts folder (screenshots, debug traces)

**When Backups Run**
- Automatically before each job search (`npm run search`)
- Automatically before each lead scraping run (`npm run leads:search`)
- Manually via CLI (`npm run backup`)
- Manually via dashboard Settings page (Create Backup Now button)

**Retention Policy**  
Backups older than 7 days are automatically deleted. This keeps 7 days of recovery points while managing disk space.

**OneDrive Integration**  
The system automatically detects if your Documents folder is in OneDrive (common Windows setup). When detected, backups are stored directly in the OneDrive-synced location, providing automatic cloud backup.

**Backup Stats**  
View backup information in the dashboard Settings page or via CLI:
```bash
npm run backup -- --stats    # Shows location, count, total size, newest/oldest
```

---

## Setup

### Requirements
- Node.js 20+
- Docker Desktop (for Ollama LLM)
- Git
- 8GB RAM minimum, 16GB recommended
- ~10GB disk space (5GB for Ollama model)

### Installation

**1. Clone and Install Dependencies**
```bash
git clone <repository-url>
cd job-apply
npm install
npx playwright install
```

**2. Start Local AI (Ollama)**
```bash
docker compose -f docker-compose.llm.yml up -d
```

This downloads and starts Llama 3.1 8B (5GB). First run takes several minutes.

**3. LinkedIn Authentication**
```bash
npm run login
```

Follow the prompts to log in to LinkedIn. Session persists in `storage/storageState.json`.

**Important**: If automation starts failing with login errors, your session expired. Just run `npm run login` again.

**4. Add Your Resume**

Place PDF or DOCX resumes in `resumes/` folder for AI-generated cover letters and headlines.

### Configuration

**Environment Variables** (`.env` file):
```bash
# Minimum score for auto-queue (default: 70)
MIN_FIT_SCORE=70

# LLM model (default: llama3.1:8b)
LLM_MODEL=llama3.1:8b

# Show browser during automation (default: true)
HEADLESS=false

# Enable Playwright traces for debugging (default: false)
ENABLE_TRACING=false
```

**Form Policies** (`answers-policy.yml`):

Controls how the system responds to application forms:
- Field length limits
- Allowed values
- Required vs optional handling

Edit if you need custom responses for specific field types.

## Running the Application

### First Time Workflow

**1. Find Jobs**
```bash
npm run search -- --profile core
```

This searches LinkedIn, ranks jobs with AI, and queues high-scoring ones.

**2. Monitor Dashboard**
```bash
npm run dashboard:dev
```

Opens at https://localhost:3000 (note: HTTPS with self-signed cert - accept the warning).

**3. Review Queued Jobs**

Check dashboard to see queued jobs. Update any false positives to "skipped" or "reported".

**4. Apply to Jobs**
```bash
npm run apply -- --easy --dry-run  # Test first (doesn't submit)
npm run apply -- --easy            # Actually submit
```

**5. Update Statuses**

As you hear back from companies, update job statuses in the dashboard:
- **interview** - Moved to interview stage
- **rejected** - Application rejected (triggers learning)

### Important Tips

**Session Management**
- LinkedIn sessions expire after ~2 weeks
- Symptoms: Automation fails to load jobs
- Fix: `npm run login` to refresh

**Rate Limiting**
- LinkedIn may rate limit if you scrape too aggressively
- Default profile search stops at 25 pages (~625 jobs)
- Use `--max-pages` to limit: `npm run search -- --profile core --max-pages 10`
- Space out searches (wait 30-60 min between large scrapes)

**Database Backups**
- Automatic backups created before any data modification
- Manual backup: `npm run backup`
- Restore: `cp data/backups/app.db.auto-backup-YYYY-MM-DD... data/app.db`
- Backups location: `data/backups/`

**Debugging Failed Applications**
- Screenshots saved to `artifacts/` on failures
- Check Playwright traces: `npx playwright show-trace artifacts/trace-<timestamp>.zip`
- Enable headless=false in .env to watch automation

**Ollama Troubleshooting**
- If AI ranking fails: Check Ollama running with `docker ps`
- Restart: `docker compose -f docker-compose.llm.yml restart`
- First run downloads model (5GB, takes time)
- Model location: Docker volume `ollama_data`

**Dashboard Not Loading**
- Check ports 3000 and 3001 not in use
- HTTPS cert warning is normal (self-signed) - click "Advanced" and proceed
- Backend API must be running (starts automatically with `npm run dashboard:dev`)

**Job Ranking Taking Forever**
- Normal: 5-10 seconds per job for AI analysis
- 25 pages = ~625 jobs = ~60 minutes total
- Runs in background, check dashboard for progress
- Cache makes subsequent re-ranks instant

**Application Forms Not Filling**
- Some ATS platforms have custom fields
- Check `artifacts/` for screenshot of failure point
- Generic adapter may need customization for that platform
- Can manually fill and submit if needed

**Lead Scraping Slow**
- LinkedIn profiles load slowly (rate limiting)
- Typical: 100 leads = ~30 minutes
- Use `--max` to limit: `npm run leads:search -- --max 50`
- Resume previous run: `npm run leads:search -- --resume <run-id>`

---

## Documentation

For deeper technical details, see:

- **[Security & Data Safety](docs/SECURITY.md)** - Database backups, privacy, recovery procedures
- **[Tech Stack](docs/TECH_STACK.md)** - Technologies used and why
- **[Architecture](docs/ARCHITECTURE.md)** - System design and component interactions

---

*Built with TypeScript, Playwright, React, and Ollama for intelligent, privacy-first job automation.*