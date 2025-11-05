# Tech Stack

## Overview

This application uses modern TypeScript tooling with local AI processing to automate job applications while maintaining privacy and performance.

## Core Technologies

### TypeScript 5.6
- Strict type checking for reliability
- Modern ES modules
- Type-safe database queries
- Interfaces over types for object shapes

### Node.js 20+
- Native test runner (no external test frameworks)
- ES modules support
- TSX for TypeScript execution
- Async/await throughout

## Browser Automation

### Playwright 1.46
- Cross-browser automation (Chromium primary)
- Session persistence via storage state
- Screenshot capture for debugging
- Network request monitoring
- Handles LinkedIn authentication
- Fills application forms across multiple ATS platforms

**Why Playwright**:
- More reliable than Puppeteer for modern SPAs
- Better debugging tools (traces, screenshots)
- Built-in waiting mechanisms
- Session state management

## Database

### SQLite (better-sqlite3)
- Single-file database (`data/app.db`)
- Synchronous API (simpler code)
- Fast for local operations
- No separate database server needed
- Built-in transaction support

**Schema Includes**:
- `jobs` - Job postings and metadata
- `applications` - Application attempts and results
- `scraping_runs` - Search/scrape execution history
- `label_cache` - Learned field mappings for forms
- `field_answer_cache` - Cached form responses
- `leads` - LinkedIn connections with contact info
- `lead_articles` - Extracted LinkedIn articles
- `companies` - Company blocklist
- `tech_filters` - Technology filters
- `rejection_learning` - Learned patterns from rejections

## AI/ML

### Ollama + Llama 3.1 8B
- Local LLM running in Docker
- No API costs or rate limits
- Complete privacy (no data leaves your machine)
- 8B parameter model (good balance of speed and accuracy)

**Docker Compose**:
```yaml
# docker-compose.llm.yml
services:
  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
```

**AI Use Cases**:
- Job description analysis and scoring
- Form field semantic mapping
- Cover letter generation
- Professional headline creation
- Rejection reason analysis
- Resume content extraction (RAG context)

### Resume Processing
- **mammoth** - DOCX parsing
- **docx-parser** - Alternative DOCX handling
- Extracts text for AI context

## Dashboard

### Frontend
- **React 19** - Latest React with new features
- **Vite 7** - Fast dev server and build tool
- **TanStack Query 5** - Data fetching, caching, auto-refresh
- **TanStack Virtual 3** - Efficient list rendering for large datasets
- **React Router 7** - Client-side routing
- **Tailwind CSS 3** - Utility-first styling
- **@iconify/react** - Icon library

**Frontend Architecture**:
- Component-based UI
- Custom hooks for data fetching
- React contexts for navigation state
- Auto-refresh every 5 seconds
- Optimistic updates for better UX

### Backend
- **Express 5** - REST API server
- **CORS** - Cross-origin resource sharing
- **HTTPS** - Self-signed certificates for localhost
- Runs on port 3001
- Shares database with CLI

**API Endpoints**:
```
GET  /api/stats                 # Statistics summary
GET  /api/jobs                  # List jobs with filters
GET  /api/leads                 # List leads with filters
GET  /api/runs                  # Scraping run history
GET  /api/analytics             # Analytics data
POST /api/generate-headline     # AI headline generation
POST /api/generate-cover-letter # AI cover letter generation
POST /api/run-command           # Execute CLI commands
```

## CLI & Scripts

### yargs
- Command-line argument parsing
- Subcommands (search, apply, status, etc.)
- Type-safe command handlers

### tsx
- TypeScript execution without separate compile step
- Used for all scripts and CLI commands
- Fast iteration during development

### concurrently
- Runs multiple dev servers simultaneously
- Manages dashboard frontend + backend in dev mode

## Validation & Parsing

### Zod
- Runtime type validation
- Schema definitions for API responses
- Type inference for TypeScript
- Input sanitization

### YAML
- Configuration file parsing
- `answers-policy.yml` for form response policies

## Development Tools

### Vite
- Fast HMR (Hot Module Replacement)
- Optimized production builds
- TypeScript support out of the box
- PostCSS integration for Tailwind

### PostCSS + Autoprefixer
- CSS processing
- Automatic vendor prefixes
- Tailwind CSS compilation

### TypeScript Compiler
- Type checking
- Declaration file generation
- Strict mode enabled

## Testing

### Native Node.js Test Runner
- Built into Node.js 20+
- No external dependencies (Jest, Mocha, etc.)
- Fast execution
- Simple API

**Test Types**:
- Unit tests (`tests/unit/`)
- Integration tests (`tests/integration/`)
- E2E tests (`tests/e2e/`)
- Learning system tests (`tests/learning/`)

**Test Structure**:
```bash
npm run test:all         # All tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e        # End-to-end tests
npm run test:learning   # Selector learning tests
```

## Why These Choices

### Local AI vs Cloud APIs
- **Privacy**: No data sent to third parties
- **Cost**: No API usage fees
- **Speed**: No network latency for API calls
- **Reliability**: No rate limits or service outages

### SQLite vs PostgreSQL/MongoDB
- **Simplicity**: Single file, no server
- **Performance**: Fast enough for local use
- **Portability**: Easy to backup (copy one file)
- **Transactions**: Built-in ACID compliance

### TypeScript vs JavaScript
- **Safety**: Catch errors at compile time
- **Maintainability**: Better refactoring support
- **Documentation**: Types serve as documentation
- **Tooling**: Better IDE support

### Playwright vs Puppeteer/Selenium
- **Modern**: Better support for SPAs like LinkedIn
- **Debugging**: Built-in trace viewer and screenshots
- **Reliability**: Auto-waiting reduces flakiness
- **Features**: Session state, network monitoring, PDF generation

### React vs Vue/Svelte
- **Ecosystem**: Large library of components
- **Maturity**: Battle-tested in production
- **Tooling**: Excellent dev tools
- **TanStack Query**: Best-in-class data fetching

## Dependencies Summary

**Runtime Dependencies** (15):
- Browser automation: playwright
- Database: better-sqlite3
- AI/LLM: (external Ollama service)
- Backend: express, cors
- Frontend: react, react-dom, react-router-dom
- Data fetching: @tanstack/react-query, @tanstack/react-virtual
- Parsing: yaml, mammoth, docx-parser
- Validation: zod
- CLI: yargs

**Dev Dependencies** (11):
- TypeScript: typescript, tsx, @types/*
- Build: vite, @vitejs/plugin-react
- CSS: tailwindcss, postcss, autoprefixer
- Dev tools: concurrently
- Icons: @iconify/react

**Total Bundle Size**: Dashboard production build ~500KB gzipped

## Performance Characteristics

- **Job Search**: 30-60 seconds for 25 pages
- **Job Ranking**: 5-10 seconds per job (AI evaluation)
- **Form Fill**: 10-30 seconds depending on ATS complexity
- **Dashboard Load**: <1 second initial, <100ms updates
- **Database Queries**: <10ms for most operations
- **AI Generation**: 2-5 seconds for cover letters

## System Requirements

- **Node.js**: 20 or higher
- **Docker**: For Ollama LLM service (5GB disk space)
- **Disk Space**: ~10GB (5GB Ollama, rest for database/artifacts)
- **RAM**: 8GB minimum, 16GB recommended
- **OS**: Windows, macOS, Linux (tested on Windows 11)

