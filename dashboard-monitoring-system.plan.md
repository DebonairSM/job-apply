# LinkedIn Job Automation Dashboard

## Architecture

Standalone Express server with React frontend that monitors the automation system via shared SQLite database. The dashboard runs independently on a separate port (default: 3000) while the automation runs via CLI commands.

## Phase A: Essential Metrics (Completed)

### Backend Server (`src/dashboard/server.ts`)

Express server providing REST API endpoints:

- `GET /api/stats` - Job statistics (queued, applied, interview, rejected, skipped)
- `GET /api/jobs` - Recent jobs with pagination and filtering
- `GET /api/runs` - Recent execution logs
- `GET /api/health` - System health check

Reuses existing database layer at `src/lib/db.ts` for data access.

### Frontend Application (`src/dashboard/client/`)

Single-page React app with essential views:

**Dashboard Overview**

- Job statistics cards showing counts by status
- Success rate indicator (applied / total)
- Recent activity feed (last 10 runs)
- Queue status (jobs pending application)

**Jobs List**

- Sortable table showing: title, company, rank, status, date
- Filter by status (queued/applied/rejected/skipped)
- Click to view job details and run history

**Activity Log**

- Real-time run history with success/failure indicators
- Shows screenshots when available
- Filter by job or status

### Implementation Details

- Use Vite for React build tooling
- TanStack Query for data fetching and caching
- Polling every 5 seconds for real-time updates
- Recharts for basic visualizations
- Tailwind CSS for styling

## Phase B: Comprehensive Monitoring (Completed)

### Enhanced Metrics

**Performance Analytics**

- Application success rate over time (line chart)
- Average application time per job
- Success rate by company or job type
- Ranking accuracy (applied jobs vs skipped)

**System Monitoring**

- Database size and growth
- Cache hit rates (answers, label mappings)
- Error frequency and types
- Screenshot storage usage

**Advanced Filtering**

- Date range selection
- Multi-status filtering
- Search by company or title
- Rank threshold filtering

### Additional API Endpoints

- `GET /api/analytics/timeline` - Time-series data for charts
- `GET /api/analytics/companies` - Per-company statistics
- `GET /api/screenshots/:jobId/:step` - Screenshot retrieval
- `GET /api/mappings` - Label mapping cache status
- `GET /api/answers/stats` - Answer cache statistics

### Enhanced Frontend

- Analytics dashboard with trend charts
- Company performance breakdown
- Screenshot viewer with step-by-step replay
- Export data to CSV functionality

## Phase C: UI/UX Polish (Broken Down)

### Phase C1: Visual Foundation (1-2 hours)

**Core Design System**
- Professional color palette with semantic status colors
- Consistent spacing and typography scale
- Improved button and form styling
- Better visual hierarchy with proper headings

**Component Polish**
- Enhanced StatCard with subtle shadows and better spacing
- Improved table styling with alternating row colors
- Better form controls (filters, search inputs)
- Consistent icon usage throughout

**Status Indicators**
- Color-coded status badges for jobs and runs
- Clear success/failure visual indicators
- Progress indicators for loading states

### Phase C2: Responsive Design (1 hour)

**Mobile Layout**
- Responsive grid system for dashboard cards
- Mobile-friendly navigation (hamburger menu or bottom tabs)
- Touch-friendly button sizes
- Horizontal scrolling for tables on small screens

**Tablet Optimization**
- Adjusted grid layouts for medium screens
- Optimized table column widths
- Better spacing for touch interfaces

### Phase C3: Loading States & Feedback (1 hour)

**Loading Skeletons**
- Skeleton placeholders for dashboard cards
- Table row skeletons during data loading
- Chart loading states

**User Feedback**
- Toast notifications for errors and success messages
- Loading spinners for actions
- Empty state illustrations
- Error boundary components

### Phase C4: Navigation & Interaction (1-2 hours)

**Enhanced Navigation**
- Breadcrumb navigation
- Active state indicators
- Quick action buttons in header
- Auto-refresh toggle with visual indicator

**Keyboard Shortcuts**
- Tab navigation between views
- Arrow keys for table navigation
- Escape key to close modals
- Enter key for form submissions

**Quick Actions**
- Quick filter buttons in header
- Bulk selection for jobs table
- Export buttons with progress indicators

### Phase C5: Advanced UX Features (1-2 hours)

**Data Interaction**
- Job detail modal with full information
- Screenshot viewer with step navigation
- Collapsible sections for dashboard widgets
- Sticky headers in long tables

**Search & Filtering**
- Global search across all jobs
- Advanced filter panel with multiple criteria
- Saved filter presets
- Clear all filters functionality

**Pagination & Performance**
- Pagination with jump-to-page
- Virtual scrolling for large datasets
- Optimized polling intervals
- Data caching improvements

### Phase C6: Dark Mode & Theming (1 hour)

**Dark Mode Implementation**
- Dark color scheme with proper contrast
- Theme toggle in header
- Persistent theme preference
- Smooth theme transitions

**Accessibility**
- High contrast mode option
- Screen reader support
- Focus indicators
- ARIA labels for interactive elements

## File Structure

```
src/dashboard/
  server.ts              # Express server
  routes/
    stats.ts             # Statistics endpoints
    jobs.ts              # Job CRUD endpoints
    analytics.ts         # Analytics endpoints (Phase B)
  client/
    index.html           # Entry HTML
    main.tsx             # React entry point
    App.tsx              # Root component
    components/
      Dashboard.tsx      # Main dashboard view
      JobsList.tsx       # Jobs table
      ActivityLog.tsx    # Run history
      StatCard.tsx       # Reusable metric card
      Charts/            # Chart components (Phase B)
    hooks/
      useStats.ts        # Data fetching hooks
      useJobs.ts
      useRuns.ts
    lib/
      api.ts             # API client
      types.ts           # TypeScript interfaces
    styles/
      tailwind.css       # Tailwind imports
```

## Configuration

Add to `package.json`:

```json
"scripts": {
  "dashboard:dev": "concurrently \"tsx src/dashboard/server.ts\" \"vite\"",
  "dashboard:build": "vite build",
  "dashboard:serve": "tsx src/dashboard/server.ts"
}
```

New dependencies:

- express, cors
- react, react-dom
- @tanstack/react-query
- recharts (Phase B)
- vite, @vitejs/plugin-react
- concurrently (for dev mode)

## Development Sequence

Phase A (1-2 hours):

1. Set up Express server with basic endpoints
2. Create React app with Vite
3. Implement dashboard overview with stat cards
4. Add jobs list with filtering
5. Add activity log view
6. Configure polling for real-time updates

Phase B (2-3 hours):

1. Add analytics endpoints to backend
2. Implement chart components
3. Add screenshot viewer
4. Enhance filtering and search
5. Add data export functionality

Phase C (6-8 hours total, broken into 6 sub-phases):

1. **C1: Visual Foundation** - Design system and component polish
2. **C2: Responsive Design** - Mobile and tablet layouts
3. **C3: Loading States** - Skeletons and user feedback
4. **C4: Navigation** - Enhanced navigation and keyboard shortcuts
5. **C5: Advanced UX** - Modals, search, and performance
6. **C6: Dark Mode** - Theming and accessibility

### Implementation Priority

**High Priority (C1-C3):**
- Visual foundation and responsive design are essential for usability
- Loading states significantly improve perceived performance

**Medium Priority (C4-C5):**
- Enhanced navigation improves workflow efficiency
- Advanced UX features add professional polish

**Low Priority (C6):**
- Dark mode and accessibility are nice-to-have features
- Can be implemented last or as separate iterations

### To-dos

- [x] Create Express server with REST API endpoints for stats, jobs, and runs
- [x] Set up React + Vite frontend with routing and data fetching
- [x] Build dashboard overview, jobs list, and activity log views
- [x] Add analytics endpoints and chart components for comprehensive monitoring
- [x] Implement screenshot viewer, advanced filtering, and data export
- [ ] **Phase C1**: Apply design system, improve components, add status indicators
- [ ] **Phase C2**: Implement responsive mobile and tablet layouts
- [ ] **Phase C3**: Add loading skeletons, toast notifications, and error handling
- [ ] **Phase C4**: Enhance navigation, add keyboard shortcuts, and quick actions
- [ ] **Phase C5**: Implement modals, advanced search, and performance optimizations
- [ ] **Phase C6**: Add dark mode, accessibility features, and theme persistence