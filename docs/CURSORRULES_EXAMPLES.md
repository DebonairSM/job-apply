# Additional `.cursorrules` Examples

These are optional rules you can add to your `.cursorrules` file based on specific needs.

## AI Scoring and Ranking Rules

```markdown
## Job Ranking System

### Profile System
- Profiles are stored in `src/ai/profiles.ts`
- Each profile has category weights and keyword lists
- Valid categories: technical_fit, experience_level, industry_match, company_culture, growth_potential, compensation, work_life_balance
- Category weights must be between 0 and 1
- Keywords are stored as arrays per category

### Scoring Logic
- Base score: 0-100 calculated by LLM
- Category multipliers apply to base scores
- Final score = sum(category_score * weight) / sum(weights)
- Rejection filters run before scoring (if excluded, score = -1)

### When Modifying Ranking
- Update schema in database if changing score structure
- Re-score existing jobs if algorithm changes significantly
- Test with diverse job postings (entry-level, senior, different industries)
- Document scoring methodology in code comments
```

## Adapter Development Rules

```markdown
## Job Board Adapters

### Creating New Adapters
1. Extend BaseAdapter class
2. Implement required methods: detectJobBoard(), fillApplication()
3. Add adapter to src/adapters/index.ts
4. Create tests in tests/adapters/[board-name].test.ts
5. Document any board-specific quirks

### Common Adapter Patterns
- Use resilient selectors (data-testid > aria-label > text content > CSS)
- Implement field detection before filling
- Take screenshot before and after each section
- Save trace on failure for debugging
- Handle optional fields gracefully (skip if not present)

### Error Handling in Adapters
- Throw specific errors for different failure modes
- Include job URL in error messages
- Log current step before each action
- Don't retry on validation errors (missing required data)
- Do retry on transient errors (network, timeout)

### Known Board Behaviors
- **Greenhouse**: Uses data-qa attributes, multi-step forms
- **Lever**: Single-page form, autosaves, may have custom fields
- **Workday**: iframes, slow to load, complex navigation
- **LinkedIn**: Requires login persistence, frequent UI changes
```

## Database Schema Rules

```markdown
## Database Operations

### Schema
- jobs: Main job listings table
- job_applications: Application attempts and results
- rejection_reasons: Learning from rejections
- profiles: Scoring profiles and preferences
- runs: Search and apply session tracking

### Migrations
- No formal migration system - handle schema changes carefully
- Add columns with ALTER TABLE (SQLite limitation: can't drop columns easily)
- Check for column existence before adding
- Default values for new columns to handle existing data
- Test migrations with copy of production database

### Common Queries
- Use indexes on: job_url, company_name, posted_date, final_score
- Join jobs with applications for status
- Filter by date ranges for recent activity
- Use transactions for multi-table updates

### Data Lifecycle
- Jobs older than 90 days can be archived
- Keep application history indefinitely (learning data)
- Clean up artifacts/ folder periodically (large files)
- Back up database before major operations
```

## Dashboard Development Rules

```markdown
## Dashboard Architecture

### State Management
- React Context for global state (jobs, filters, settings)
- Local state for UI-only concerns (modals, selections)
- Server is source of truth - refetch after mutations
- Optimistic updates for better UX

### API Communication
- All API calls in hooks (useJobs, useStats, etc.)
- Base URL from environment or default to localhost:3000
- Handle loading, error, and empty states
- Show error toasts for failed operations
- Debounce search inputs

### Component Organization
- Presentational components in components/
- Smart components can use hooks directly
- Share common types via lib/types.ts
- Extract utilities to lib/utils.ts
- Keep components under 300 lines (split if larger)

### Styling Guidelines
- Use Tailwind utility classes
- Custom CSS only when Tailwind insufficient
- Consistent spacing scale (4px increments)
- Use CSS variables for theme colors
- Responsive breakpoints: sm:640px, md:768px, lg:1024px

### Performance Considerations
- Virtualize long lists (jobs, applications)
- Lazy load heavy components
- Memoize expensive calculations
- Debounce rapid updates (search, filters)
- Use React.memo for pure components
```

## Testing Rules

```markdown
## Test Organization

### Test Structure
- Unit tests: Individual functions and classes
- Integration tests: Feature workflows (search → rank → apply)
- E2E tests: Full user journeys via dashboard

### Test Data
- Use factories for consistent test data
- Mock external dependencies (Playwright, LLM APIs)
- Use in-memory SQLite for database tests
- Clean up test data after each test

### Coverage Expectations
- Critical paths: 100% (application flow, scoring)
- AI modules: 80% (hard to test LLM responses)
- UI components: 60% (focus on logic over rendering)
- Adapters: 90% (safety critical)

### Testing Anti-Patterns
- Don't test implementation details
- Don't mock what you don't own (third-party APIs)
- Don't skip flaky tests - fix them
- Don't use random data - use deterministic fixtures
```

## Error Messages and Logging

```markdown
## Logging Standards

### Log Levels
- **error**: Something failed that needs attention
- **warn**: Something unexpected but handled
- **info**: Important state changes (job applied, score calculated)
- **debug**: Detailed information for troubleshooting

### Log Format
- Include timestamp (ISO 8601)
- Include context (job_id, url, company)
- Include action/step name
- Include error stack traces
- Don't log sensitive data (passwords, tokens, PII)

### User-Facing Messages
- Be specific about what went wrong
- Suggest remediation when possible
- Don't expose internal errors to UI
- Use friendly language in dashboard
- Include "try again" option when appropriate

### Error Tracking
- Store application errors in database
- Include full context for debugging
- Group similar errors
- Track error rates over time
- Alert on error spikes
```

## Security Rules

```markdown
## Security Considerations

### Authentication
- LinkedIn credentials stored encrypted
- Session state persisted to file (gitignored)
- Refresh session before expiry
- Clear session on logout

### Input Validation
- Validate all user inputs (profile weights, keywords)
- Sanitize HTML from job descriptions
- Validate URLs before navigation
- Escape SQL inputs (use parameterized queries)
- Validate file uploads (resume, cover letter)

### Secrets Management
- LLM API keys in environment variables
- Never commit .env files
- Rotate API keys periodically
- Use separate keys for dev/prod
- Limit API key permissions

### Data Privacy
- Handle applicant data carefully (name, email, phone)
- Don't log full resumes or cover letters
- Secure database file permissions
- Consider GDPR compliance if expanding
```

## Performance Optimization

```markdown
## Performance Guidelines

### Database Optimization
- Create indexes for common queries
- Use EXPLAIN QUERY PLAN to verify index usage
- Batch inserts for multiple jobs
- Use transactions for consistency and speed
- VACUUM database periodically

### LLM API Optimization
- Cache job analyses (same job = same result)
- Batch similar requests when possible
- Use streaming for long responses
- Implement exponential backoff for rate limits
- Monitor token usage and costs

### Playwright Performance
- Reuse browser contexts when possible
- Run headless in production
- Parallel job processing (with rate limiting)
- Abort navigation on slow pages (timeout)
- Clear browser cache periodically

### Dashboard Performance
- Paginate job lists
- Lazy load job details
- Cache API responses
- Use React.memo for expensive renders
- Optimize images and assets
```

## Refactoring Guidelines

```markdown
## When to Refactor

### Code Smells
- Functions longer than 50 lines
- Files longer than 500 lines
- Duplicate logic in multiple places
- Deep nesting (> 4 levels)
- Magic numbers or strings
- Complex conditionals

### Refactoring Safely
1. Ensure tests exist and pass
2. Make small, incremental changes
3. Run tests after each change
4. Keep commits small and focused
5. Don't refactor and add features simultaneously

### Extract Patterns
- Repeated logic → utility function
- Similar components → shared component
- Complex conditions → named functions
- Magic values → constants
- Duplicate types → shared types file
```

## AI Interaction Preferences

```markdown
## Working with Cursor AI

### When Suggesting Changes
- Show full diff context (10+ lines around changes)
- Explain reasoning behind decisions
- Point out potential side effects
- Suggest testing approach

### When Fixing Bugs
- First, understand the root cause
- Check if bug exists elsewhere
- Fix at the source, not symptoms
- Add test to prevent regression
- Update related documentation

### When Adding Features
- Discuss approach before implementing
- Consider backward compatibility
- Update types and interfaces first
- Implement with tests
- Update documentation

### When Reviewing Code
- Check for security issues
- Verify error handling
- Look for performance problems
- Ensure testability
- Validate documentation
```

