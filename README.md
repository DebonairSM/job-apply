# LinkedIn Job Application Automation

Automatically search, rank, and apply to LinkedIn jobs using local AI.

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

Start the local LLM (downloads ~5GB on first run):

```bash
docker compose -f docker-compose.llm.yml up -d
```

Login to LinkedIn:

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

# Profile-based search
npm run search -- --profile core
npm run search -- --profile security
npm run search -- --profile backend

# Start from specific page
npm run search -- --profile core --start-page 2
npm run search -- --profile security --start 3 --max-pages 2
```

Available profiles: `core`, `security`, `event-driven`, `performance`, `devops`, `backend`, `core-net`, `legacy-modernization`

#### Profile Descriptions

- **`core`**: Azure API Engineer roles with API Management, Functions, and Service Bus
- **`security`**: Security-focused roles with OAuth, JWT, Entra ID, and API Governance  
- **`event-driven`**: Event-driven architecture roles with Service Bus, Event Grid, and messaging
- **`performance`**: Performance optimization roles with load testing, Redis, and monitoring
- **`devops`**: DevOps roles with Azure DevOps, GitHub Actions, Docker, and infrastructure
- **`backend`**: General backend development roles with Azure, .NET, and APIs
- **`core-net`**: Core .NET development roles with C#, ASP.NET, MVC, and Entity Framework
- **`legacy-modernization`**: Legacy system modernization roles with VB.NET, WebForms, ASP.NET MVC, and cloud migration

### Check Status

```bash
npm run status
npm run list queued
npm run list reported
npm run list applied
```

### Generate Report

```bash
npm run report
```

Creates HTML report in `reports/` folder. All queued jobs are moved to "reported" status, which pauses automatic application until you review and manually change them back to "queued" if desired.

### Apply to Jobs

```bash
# Test run (doesn't submit)
npm run apply -- --easy --dry-run

# Apply to Easy Apply jobs
npm run apply -- --easy

# Apply to external sites (Greenhouse, Lever, Workday)
npm run apply -- --ext
```

### Clear Cache

```bash
npm run clear-cache
npm run clear-cache answers
npm run clear-cache mapping
```

### Test Commands

```bash
# Run mapper evaluation tests
npm run test

# Run all tests (recommended)
npm run test:all

# Run selector learning system tests only
npm run test:learning
```

### Reset Skipped Jobs

```bash
node scripts/reset-jobs.js
```

### Dashboard

Monitor your automation in real-time with the web dashboard.

**Initial Setup:**
```bash
# Install dependencies (if not already done)
npm install

# Start the dashboard
npm run dashboard:dev
```

This starts:
- Backend API server on **https://localhost:3001**
- Frontend React app on **https://localhost:3000**

**Access the Dashboard:**
Open https://localhost:3000 to access:
- Live job statistics and success rates
- Complete jobs list with filtering
- Activity log with run history
- Auto-refreshing every 5 seconds

**Dashboard Features (Phase A - Complete):**
- Real-time job statistics with success rate calculation
- Filterable jobs table with status and Easy Apply filtering
- Activity log with run history and success/failure indicators
- Screenshot availability indicators for debugging
- Responsive layout with tab-based navigation

**Stop the Dashboard:**
Press `Ctrl+C` in the terminal where the dashboard is running.

See [Dashboard Quick Start](docs/DASHBOARD_QUICKSTART.md) for detailed setup guide and troubleshooting.

## Configuration

Edit `.env` file:

- `MIN_FIT_SCORE`: Minimum score to queue jobs (default: 70)
- `LLM_MODEL`: AI model (default: llama3.1:8b)
- `HEADLESS`: Run browser in background (true/false)
- `ENABLE_TRACING`: Save debug logs (true/false)

Edit `answers-policy.yml` to control application form responses (field length, allowed values, etc.)

Place resumes (PDF or DOCX) in `resumes/` folder.

## Job Scoring

AI evaluates jobs across weighted categories (Core Azure/API Skills 20%, Security 15%, Event-Driven 10%, Performance 10%, DevOps 5%, Seniority 5%, Core .NET Development 20%, Legacy Modernization 10%). Scores above 70 are queued for application.

## Common Issues

```bash
# AI not responding
docker compose -f docker-compose.llm.yml restart

# Session expired
npm run login

# Check debug info
ls artifacts/  # Screenshots and traces from failed applications
```

## How It Works

```mermaid
flowchart TB
    Start([Start]) --> Search[Search LinkedIn]
    Search --> |Fetch job listings| Jobs[(Job Postings)]
    Jobs --> Rank[Rank with LLM]
    Rank --> |Score each job| Score{Score >= 70?}
    Score -->|Yes| Queue[(Database: Queued)]
    Score -->|No| Skip[(Database: Skipped)]
    
    Queue --> Report[Generate Report]
    Report --> |Move to reported| Reported[(Database: Reported)]
    Reported --> |Manual review| Queue
    
    Queue --> Apply[Apply Command]
    Apply --> Generate[Generate Answers with LLM]
    Generate --> Map[Map Fields with LLM]
    Map --> Detect{Detect ATS}
    
    Detect -->|Easy Apply| EasyFill[Fill LinkedIn Form]
    Detect -->|Greenhouse| GHFill[Fill Greenhouse Form]
    Detect -->|Lever| LeverFill[Fill Lever Form]
    Detect -->|Workday| WorkdayFill[Fill Workday Form]
    Detect -->|Unknown ATS| GenericFill[Generic Form Fill]
    
    EasyFill --> Submit[Submit Application]
    GHFill --> Submit
    LeverFill --> Submit
    WorkdayFill --> Submit
    GenericFill --> Submit
    
    Submit --> |Success| Applied[(Database: Applied)]
    Submit --> |Failure| Skipped[(Database: Skipped)]
    
    Applied --> |Manual update| Interview[(Database: Interview)]
    Applied --> |Manual update| Rejected[(Database: Rejected)]
    
    style Queue fill:#e1f5fe
    style Applied fill:#c8e6c9
    style Skipped fill:#ffcdd2
    style Reported fill:#fff3e0
    style Interview fill:#e8f5e8
    style Rejected fill:#ffebee
```

## Advanced Features

This application demonstrates sophisticated capabilities that can be applied to any AI-powered scraping and automation system:

### 🤖 **Intelligent Content Analysis & Ranking**
- **Multi-criteria AI Scoring**: Uses weighted scoring across multiple categories (technical skills, seniority, location, etc.) with configurable weights
- **Profile-based Boolean Search**: Pre-defined search profiles with complex Boolean queries for targeted discovery
- **Dynamic Content Extraction**: Robust selectors with fallback mechanisms for handling changing website structures
- **Semantic Job Matching**: AI-powered analysis of job descriptions against user profiles with detailed reasoning

### 🧠 **Advanced AI Integration**
- **Local LLM Processing**: Runs entirely offline using Ollama with configurable models and temperature settings
- **Structured AI Output**: Enforces JSON schema validation with retry logic for consistent AI responses
- **Context-Aware Generation**: Uses RAG (Retrieval-Augmented Generation) with resume context for personalized responses
- **Multi-step AI Workflows**: Chained AI operations (ranking → answer generation → field mapping) with error handling

### 🔄 **Smart Form Automation**
- **ATS Detection & Adaptation**: Automatically detects and adapts to different Applicant Tracking Systems (Greenhouse, Lever, Workday)
- **Intelligent Field Mapping**: Three-tier mapping system (heuristics → cache → AI) for optimal performance and accuracy
- **Selector Learning System**: Captures and learns CSS selectors from successful form fills, improving reliability over time
- **Generic Form Fallback**: Handles unknown form types with intelligent field detection and filling
- **Resume Upload Automation**: Automatic file upload with multiple format support

### 📊 **Real-time Monitoring Dashboard**
- **Live Statistics**: Real-time metrics with auto-refresh and success rate calculations
- **Comprehensive Activity Logging**: Detailed execution logs with timestamps, screenshots, and error tracking
- **Visual Analytics**: Interactive charts and graphs for performance trends and insights
- **Multi-view Interface**: Dashboard overview, detailed job lists, and activity monitoring in separate views

### 🛡️ **Enterprise-Grade Resilience**
- **Exponential Backoff Retry**: Intelligent retry mechanisms with configurable delays and maximum attempts
- **Screenshot & Trace Capture**: Automatic debugging artifacts for failed operations
- **Session Management**: Persistent browser sessions with automatic restoration
- **Error Recovery**: Graceful handling of network issues, timeouts, and unexpected page changes

### ⚡ **Performance Optimization**
- **Multi-level Caching**: Answers cache, label mapping cache, and database query optimization
- **Batch Processing**: Efficient handling of multiple items with progress tracking
- **Configurable Delays**: Human-like behavior simulation with random timing variations
- **Database Transactions**: Atomic operations with rollback capabilities for data integrity

### 🔧 **Advanced Configuration**
- **Environment-based Settings**: Comprehensive configuration via environment variables
- **Policy-driven Validation**: YAML-based policy files for controlling AI responses and behavior
- **Modular Architecture**: Pluggable adapters and components for easy extension
- **Dry Run Capabilities**: Safe testing mode for validating operations without side effects

### 📈 **Data Management & Analytics**
- **Comprehensive Status Tracking**: Six-state job lifecycle (queued, applied, interview, rejected, skipped, reported)
- **Historical Data Retention**: Complete audit trail with timestamps and status change tracking
- **Export Capabilities**: Data export functionality for external analysis and reporting
- **Duplicate Detection**: Intelligent duplicate prevention with URL-based deduplication

### 🔍 **Debugging & Troubleshooting**
- **Visual Debugging**: Screenshot capture at each step with Playwright tracing
- **Detailed Logging**: Comprehensive logging with different verbosity levels
- **Error Classification**: Categorized error types with specific handling strategies
- **Performance Monitoring**: Response time tracking and performance metrics

### 🏗️ **Scalable Architecture**
- **Type-safe Development**: Full TypeScript implementation with Zod schema validation
- **Modular Design**: Separated concerns with clear interfaces and dependency injection
- **Database Abstraction**: Clean database layer with prepared statements and migrations
- **API-first Design**: RESTful API endpoints for external integration and monitoring

### 🔐 **Security & Privacy**
- **Local Processing**: All AI operations run locally without external API calls
- **Session Persistence**: Secure session storage with automatic cleanup
- **Input Validation**: Comprehensive input sanitization and validation
- **Error Sanitization**: Safe error messages without sensitive information exposure

## Architecture

### Pipeline

1. **Search & Rank**: Fetch jobs from LinkedIn, LLM scores each job, queues high-fit matches to database
2. **Prepare Answers**: LLM generates application responses based on your profile, validates against policy
3. **Fill Forms**: Detect ATS type, map canonical fields to form fields, fill and submit
4. **Monitor & Analyze**: Real-time dashboard provides live statistics, activity logs, and performance metrics

### Components

**Commands** (`src/commands/`)
- `search.ts` - Search LinkedIn and rank jobs
- `apply.ts` - Apply to queued jobs
- `login.ts` - Authenticate with LinkedIn

**AI** (`src/ai/`)
- `ranker.ts` - Score jobs against your profile
- `answers.ts` - Generate application responses
- `mapper.ts` - Map canonical fields to ATS-specific fields
- `profiles.ts` - Boolean search queries for job profiles
- `client.ts` - Ollama LLM integration with retry logic
- `rag.ts` - Resume context retrieval

**Adapters** (`src/adapters/`)
- `base.ts` - ATS adapter interface
- `greenhouse.ts` - Greenhouse ATS support
- `lever.ts` - Lever ATS support
- `workday.ts` - Workday ATS support

**Dashboard** (`src/dashboard/`)
- `server.ts` - Express API server (port 3001)
- `routes/` - REST API endpoints (stats, jobs, runs, analytics)
- `client/` - React frontend application (port 3000)
  - `components/` - UI components (Dashboard, JobsList, ActivityLog)
  - `hooks/` - Custom React hooks for data fetching
  - `lib/` - Frontend utilities and API client

**Library** (`src/lib/`)
- `db.ts` - SQLite database operations
- `session.ts` - Browser session management
- `validation.ts` - Zod schemas for data validation
- `resilience.ts` - Retry and error handling

**Data Storage**
- `data/` - SQLite database (jobs, answers, logs, runs)
- `resumes/` - Resume files for RAG context
- `storage/` - LinkedIn session state
- `artifacts/` - Debug screenshots and traces
- `dist/` - Built dashboard frontend assets

### Tech Stack

**Core Automation**
- TypeScript 5.6
- Playwright (browser automation)
- SQLite (better-sqlite3)
- Ollama + Llama 3.1 8B
- Zod (validation)
- Yargs (CLI)

**Dashboard**
- React (frontend framework)
- Express (backend API server)
- TanStack Query (data fetching & caching)
- Tailwind CSS (styling)
- Vite (build tool & dev server)

### Tests

```bash
# Run all tests (recommended)
npm run test:all

# Run selector learning system tests only
npm run test:learning

# Run individual test suites
npm test
npx tsx --test tests/login.test.ts
npx tsx --test tests/search.test.ts
npx tsx --test tests/mapper.test.ts
npx tsx --test tests/ranker.test.ts
npx tsx --test tests/integration.test.ts
```

## Documentation

Additional documentation is available in the `docs/` folder:

- [Profile Creation Guide](docs/PROFILE_CREATION_GUIDE.md) - How to create new search profiles
- [Testing Guide](docs/TESTING_GUIDE.md) - Comprehensive testing system documentation
- [Dashboard Monitoring System](docs/dashboard-monitoring-system.plan.md) - Complete dashboard architecture and development plan
- [Dashboard Quick Start](docs/DASHBOARD_QUICKSTART.md) - Quick setup guide for the dashboard
- [Dashboard Status](docs/DASHBOARD_STATUS.md) - Current dashboard implementation status
- [HTTPS Setup](docs/HTTPS_SETUP_COMPLETE.md) - HTTPS configuration guide
- [Phase A Test Report](docs/PHASE_A_TEST_REPORT.md) - Testing results and validation
- [Documentation Index](docs/README.md) - Complete documentation overview

## Disclaimer

This tool is for personal use. Review applications before submission and respect LinkedIn's terms of service.
