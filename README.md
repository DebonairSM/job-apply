# AI Job Application Assistant

**Intelligent job search automation that learns, adapts, and applies for you.**

Transform your job search from hours of manual work into minutes of intelligent automation. This system finds the right opportunities, blocks companies you don't want, and applies with personalized responses - all powered by local AI that protects your privacy.

---

## What It Does

**🎯 Smart Job Discovery**  
Searches LinkedIn with profile-specific queries, finds jobs that match your expertise, and queues high-scoring opportunities automatically.

**🧠 Intelligent Ranking**  
AI evaluates each job across 9 categories (Azure, Security, .NET, Performance, etc.) using weighted scoring that adapts to your preferences and learns from rejections.

**🚫 Company & Tech Filtering**  
Block unwanted companies and filter out jobs with technologies outside your stack before they're even ranked.

**🤖 Automated Applications**  
Fills application forms intelligently across different job boards (LinkedIn, Greenhouse, Lever, Workday) with AI-generated, personalized responses.

**📊 Live Dashboard**  
Monitor everything in real-time with statistics, job lists, activity logs, and learning insights that update automatically.

**🔄 Continuous Learning**  
System learns from every rejection, automatically adjusting weights and building filters to avoid similar jobs in the future.

---

## Quick Start

**Daily Workflow**
```bash
npm run search -- --profile core    # Find jobs matching your core skills
npm run apply -- --easy             # Apply to Easy Apply positions  
npm run dashboard:dev                # Monitor progress at https://localhost:3000
```

**Block Unwanted Companies**
```bash
npm run block:company "CompanyName" # Never see jobs from this company again
npm run filters:list                # View all active blocks and filters
```

**Technology Filtering**
```bash
npm run filters:add                 # Block Go, Java, Python-focused roles
npm run filters:remove              # Clear technology filters
```

---

## How It Works

**Search Profiles**  
Choose from 8 pre-configured search profiles, each with tailored Boolean queries and scoring weights:
- `core` - Azure API Engineer roles
- `security` - Security-focused positions  
- `performance` - Performance optimization roles
- `devops` - DevOps and infrastructure
- `core-net` - Pure .NET development
- `legacy-modernization` - Legacy system upgrades
- `backend` - General backend development
- `event-driven` - Event-driven architecture

**Intelligent Scoring**  
Jobs are evaluated across 9 weighted categories. The same job scores differently depending on which profile found it - a security job ranks security skills higher, while a performance job emphasizes optimization expertise.

**Adaptive Learning**  
Every rejection teaches the system:
- "Too junior" → increases seniority requirements
- "Wrong tech stack" → blocks similar technologies  
- Multiple company rejections → adds company to blocklist
- Location issues → filters non-remote positions

**Smart Applications**  
AI generates personalized responses using your profile and resume context. Forms are filled intelligently with automatic ATS detection and field mapping that improves over time.

---

## Dashboard Features

Access your command center at **https://localhost:3000**

**📈 Real-time Statistics**  
Live metrics, success rates, and trend tracking that updates every 5 seconds.

**📝 Job Management**  
Complete job listings with filtering, status updates, and detailed scoring breakdowns.

**🎯 AI Content Generation**  
Generate professional headlines and cover letters tailored to each position.

**📊 Analytics & Insights**  
Application timelines, company performance, rank distributions, and rejection learning patterns.

**🤖 Automation Control**  
Run search and apply commands directly from the dashboard with live log streaming.

**🧠 Learning Monitor**  
Watch the system learn in real-time as it adjusts weights and builds filters from rejection patterns.

---

## Privacy & Performance

**Completely Local**  
All AI processing runs on your machine using Ollama. No data leaves your system, no API costs, complete privacy.

**Blazingly Fast**  
Intelligent caching and three-tier mapping (heuristics → cache → AI) ensures optimal performance. Most operations complete in seconds.

**Enterprise Resilient**  
Automatic error recovery, session persistence, and comprehensive logging with screenshot capture for debugging.

---

## Status Tracking

Jobs flow through a six-state lifecycle:

**queued** → **applied** → **interview** / **rejected**  
↳ **skipped** (low score or failed application)  
↳ **reported** (moved for manual review)

Update statuses as you hear back to help the learning system improve.

---

## Sample Commands

**Search & Discovery**
```bash
npm run search "Software Engineer"              # Keyword search
npm run search -- --profile security --remote  # Profile search with filters
npm run search -- --min-score 85 --max-pages 3 # Custom scoring threshold
```

**Application Management**
```bash
npm run apply -- --dry-run                     # Test without submitting
npm run apply -- --job <job-id>                # Apply to specific job
npm run status                                  # View statistics summary
npm run list queued                             # List jobs by status
```

**System Management**
```bash
npm run clear-cache                             # Clear AI response cache
npm run reset:queue                             # Reset queued jobs to try again
npm run backup                                  # Create manual database backup
```

---

## Quick Setup

**Requirements**  
Node.js 20+, Docker Desktop, Git

**Installation**
```bash
git clone <repository-url>
cd job-apply
npm install
npx playwright install
docker compose -f docker-compose.llm.yml up -d  # Start local AI (5GB download)
npm run login                                    # Authenticate with LinkedIn
```

**Configuration**  
- Add your resumes to `resumes/` folder (PDF/DOCX)
- Edit `.env` for scoring thresholds and preferences  
- Customize `answers-policy.yml` for form response policies

**Start Using**
```bash
npm run search -- --profile core                # Find jobs
npm run dashboard:dev                            # Open dashboard
npm run apply -- --easy                         # Start applying
```

---

*Built with TypeScript, Playwright, React, and Ollama for intelligent, privacy-first job automation.*