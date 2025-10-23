# Job Automation Dashboard

Real-time monitoring dashboard for the LinkedIn job automation system.

## Architecture

The dashboard consists of two independent services:

1. **Backend API Server** (Port 3001) - Express server providing REST endpoints
2. **Frontend Web App** (Port 3000) - React application with live data updates

Both services share the same SQLite database (`data/app.db`) used by the automation CLI.

## Getting Started

### Development Mode

Run both frontend and backend together:

```bash
npm run dashboard:dev
```

This will start:
- Backend API on http://localhost:3001
- Frontend dev server on http://localhost:3000

Open http://localhost:3000 in your browser to access the dashboard.

### Production Mode

Build the frontend and run the server:

```bash
npm run dashboard:build
npm run dashboard:serve
```

The server will serve the built frontend at http://localhost:3001

## Features

### Phase A: Essential Metrics (Current)

#### Dashboard Overview
- Job statistics by status (queued, applied, interview, rejected, skipped)
- Success rate calculation
- Recent activity feed (last 10 runs)
- Real-time updates every 5 seconds

#### Jobs List
- Sortable table with all jobs
- Filter by status and Easy Apply flag
- Direct links to LinkedIn job postings
- Shows rank, company, and date information

#### Activity Log
- Complete run history with success/failure indicators
- Filter by job ID
- Screenshot availability indicators
- Detailed timestamps and logs

### Phase B: Comprehensive Monitoring (Planned)

- Performance analytics with charts
- Company success rate breakdown
- Screenshot viewer
- Advanced filtering and search
- Data export functionality

### Phase C: UI Polish (Planned)

- Dark mode support
- Smooth animations
- Keyboard shortcuts
- Responsive mobile layout
- Loading skeletons

## API Endpoints

### Statistics
- `GET /api/stats` - Job statistics with success rate

### Jobs
- `GET /api/jobs` - List jobs with filtering
  - Query params: `status`, `easyApply`, `limit`, `offset`
- `GET /api/jobs/:id` - Get single job details

### Activity
- `GET /api/runs` - List execution logs
  - Query params: `jobId`, `limit`

### Health
- `GET /api/health` - Server health check

## Configuration

The dashboard uses the following ports:
- Backend: `3001` (configurable via `PORT` env variable)
- Frontend dev: `3000`

The Vite dev server proxies `/api` requests to the backend automatically.

## Database

The dashboard reads from the shared SQLite database at `data/app.db`. It uses the following tables:
- `jobs` - Job listings and their status
- `runs` - Execution logs with timestamps and screenshots
- `answers` - Cached AI-generated answers
- `label_map` - Form field mappings

## Tech Stack

- **Backend**: Express, TypeScript
- **Frontend**: React, TypeScript, Vite
- **Data Fetching**: TanStack Query (React Query)
- **Styling**: Tailwind CSS
- **Database**: SQLite (shared with CLI)

## Development

The dashboard runs independently from the automation CLI. You can:

1. Run the dashboard to monitor progress
2. Run CLI commands (`npm run search`, `npm run apply`) in another terminal
3. See live updates in the dashboard as jobs are processed

The dashboard polls the API every 5 seconds for real-time updates.

