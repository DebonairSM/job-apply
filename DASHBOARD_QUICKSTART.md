# Dashboard Quick Start Guide

## ✅ Phase A Complete and Tested

The monitoring dashboard is fully operational and ready to use.

## Start the Dashboard

```bash
npm run dashboard:dev
```

This starts:
- Backend API server on **http://localhost:3001**
- Frontend React app on **http://localhost:3000**

## Access the Dashboard

Open your browser to: **http://localhost:3000**

## What You'll See

### Dashboard Tab (Home)
- Job statistics cards showing counts by status
- Success rate indicator  
- Recent activity feed with last 10 runs
- Real-time updates every 5 seconds

### Jobs Tab
- Complete job list with all 19 jobs from your database
- Filter by status (queued, applied, interview, rejected, skipped, reported)
- Filter by Easy Apply vs External
- Click job titles to open LinkedIn postings
- See rank, company, and date for each job

### Activity Tab
- Complete run history (5 runs currently in database)
- Success/failure indicators
- Filter by job ID
- Screenshot availability status
- Detailed timestamps

## Current Data

Your dashboard is connected to the live database showing:
- **19 total jobs** (all currently in "reported" status)
- **5 execution logs** from previous application attempts
- **0% success rate** (no applications completed yet)

## Run Automation

The dashboard monitors your automation in real-time. In another terminal, run:

```bash
# Search for jobs
npm run search "Software Engineer"

# Apply to queued jobs
npm run apply -- --easy

# Generate reports
npm run report
```

Watch the dashboard update automatically as jobs are added and processed.

## API Endpoints

If you want to access data programmatically:

```bash
# Get statistics
curl http://localhost:3001/api/stats

# Get jobs (with pagination)
curl http://localhost:3001/api/jobs?limit=10&status=queued

# Get activity logs
curl http://localhost:3001/api/runs?limit=20

# Health check
curl http://localhost:3001/api/health
```

## Stop the Dashboard

Press `Ctrl+C` in the terminal where the dashboard is running.

## Troubleshooting

If the dashboard doesn't start:

1. Check if ports are available:
   ```bash
   netstat -ano | findstr ":3000"
   netstat -ano | findstr ":3001"
   ```

2. Kill processes if needed and restart
   
3. Run servers separately for debugging:
   ```bash
   # Terminal 1: Backend only
   npx tsx src/dashboard/server.ts
   
   # Terminal 2: Frontend only
   npx vite
   ```

## Files Created

- `src/dashboard/` - Complete dashboard implementation
- `tailwind.config.cjs` - Tailwind CSS configuration
- `postcss.config.cjs` - PostCSS configuration  
- `vite.config.ts` - Vite build configuration
- `.gitignore` - Updated with dashboard entries

## Documentation

- `src/dashboard/README.md` - Dashboard technical documentation
- `DASHBOARD_STATUS.md` - Implementation status and features
- `PHASE_A_TEST_REPORT.md` - Detailed test results

## Next Phases

**Phase B** - Comprehensive monitoring with analytics and charts  
**Phase C** - UI polish with dark mode and animations

Phase A provides all essential monitoring features. Phases B and C add advanced analytics and visual refinements.

