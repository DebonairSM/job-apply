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

**2. Apply to Jobs**
```bash
npm run apply -- --easy              # Apply to Easy Apply positions  
npm run dashboard:dev                # Monitor at https://localhost:3000
```

**3. Manage Filters** (optional)
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

**Search**
```bash
npm run search -- --profile contract           # Contract positions
npm run search -- --profile core               # Full-time Azure roles
npm run search -- --min-score 85 --max-pages 3 # Custom threshold
# New simplified profiles and location options
npm run search -- --profile aspnet-simple      # Simple ASP.NET keyword
npm run search -- --profile csharp-azure-no-frontend # C# + Azure, exclude Angular/React
npm run search -- --profile legacy-web         # Legacy WebForms, MVC, jQuery, .NET Framework
# Preset location (no UI slider shown). Radius applied only if LinkedIn exposes it
npm run search -- --profile aspnet-simple --location-preset wesley-chapel
# Explicit location + desired radius (best-effort if distance control exists)
npm run search -- --profile csharp-azure-no-frontend --location "Wesley Chapel, FL" --radius 25
```

**Apply**
```bash
npm run apply -- --dry-run                     # Test mode (no submit)
npm run apply -- --easy                        # Easy Apply only
npm run apply -- --job <job-id>                # Specific job
```

**Manage**
```bash
npm run status                                 # View statistics
npm run list queued                            # Show queued jobs
npm run backup                                 # Backup database
```

---

## Setup

**Requirements:** Node.js 20+, Docker Desktop, Git

**Install**
```bash
git clone <repository-url>
cd job-apply
npm install
npx playwright install
docker compose -f docker-compose.llm.yml up -d  # Starts Ollama (5GB)
npm run login                                    # LinkedIn auth
```

**Configure**
1. Add resumes to `resumes/` folder (PDF/DOCX)
2. Edit `.env` for min score threshold (default: 70)
3. Optional: Edit `answers-policy.yml` for form policies

**Run**
```bash
npm run search -- --profile contract            # Find contract jobs
npm run dashboard:dev                           # Open dashboard
npm run apply -- --easy                         # Apply to jobs
```

---

*Built with TypeScript, Playwright, React, and Ollama for intelligent, privacy-first job automation.*