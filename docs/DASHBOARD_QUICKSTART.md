# Dashboard Quick Start

## Start Dashboard

**Development Mode:**
```bash
npm run dashboard:dev
```

**Production Mode:**
```bash
npm run dashboard:prod
```

Open **http://localhost:3000** in your browser.

## What You'll See

**Dashboard Tab**: Live job statistics, success rates, recent activity  
**Jobs Tab**: All jobs with filters (status, Easy Apply vs External)  
**Activity Tab**: Run history with success/failure indicators

## Use It

Run your automation in another terminal:
```bash
npm run search "Software Engineer"
npm run apply -- --easy
```

Dashboard updates automatically every 5 seconds.

## Stop

Press `Ctrl+C` in the dashboard terminal.

---

## Technical Details

### Features
- Real-time monitoring with auto-refresh
- Job filtering and status tracking  
- Activity logs with screenshots
- Success rate calculations
- API endpoints for programmatic access

### Architecture
- Backend: Express API server (port 3001)
- Frontend: React app (port 3000)
- Database: SQLite integration
- Auto-refresh: 5-second intervals

### API Endpoints
- `GET /api/stats` - Statistics
- `GET /api/jobs` - Job listings with filters
- `GET /api/runs` - Activity logs
- `GET /api/health` - Health check

### Troubleshooting
If ports are busy, kill processes and restart:
```bash
netstat -ano | findstr ":3000"
netstat -ano | findstr ":3001"
```

