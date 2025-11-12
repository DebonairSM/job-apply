# Code Analysis Report - SonarQube Quality Standards

## Executive Summary
Analysis of 8 files (5 modified, 3 new) before commit. Total issues found: 47 (18 Critical, 15 Major, 14 Minor)

## Critical Issues (Must Fix)

### 1. Component Complexity - LeadDetail.tsx (1080 lines)
**Severity**: Critical  
**Type**: Maintainability  
**Line**: 1-1080  
- Single component with 74 state variables
- Multiple responsibilities (display, email generation, campaign rendering, background generation)
- Complex nested conditionals and effects
- **Impact**: Difficult to test, maintain, and debug
- **Fix**: Split into 6 smaller components:
  - LeadDetailModal (container)
  - LeadOverviewTab
  - LeadOutreachTab
  - LeadDetailsTab
  - CampaignEmailSection
  - EmailGenerationSection

### 2. Database Module Size - db.ts (2804 lines)
**Severity**: Critical  
**Type**: Maintainability  
**Line**: 1-2804  
- Mixed concerns: schema, migrations, CRUD operations
- 50+ exported functions
- Migration code scattered throughout
- **Impact**: Hard to navigate, test, and maintain
- **Fix**: Split into modules:
  - `db/schema.ts` - table definitions
  - `db/migrations.ts` - migration logic
  - `db/jobs.ts` - job operations
  - `db/leads.ts` - lead operations
  - `db/campaigns.ts` - campaign operations
  - `db/index.ts` - exports

### 3. Silent Error Swallowing - db.ts
**Severity**: Critical  
**Type**: Reliability  
**Lines**: 76-128 (migrations)  
```typescript
try {
  database.exec(`ALTER TABLE jobs ADD COLUMN applied_method TEXT`);
} catch (e) {
  // Column already exists, ignore
}
```
- 20+ migration blocks silently catch all errors
- Cannot distinguish between "already exists" and actual errors
- **Impact**: Failed migrations go unnoticed, data corruption risk
- **Fix**: Check error message explicitly:
```typescript
try {
  database.exec(`ALTER TABLE jobs ADD COLUMN applied_method TEXT`);
} catch (e) {
  if (e instanceof Error && !e.message.includes('duplicate column')) {
    console.error('Migration failed:', e);
    throw e;
  }
}
```

### 4. Missing Error Handler Position - server.ts
**Severity**: Critical  
**Type**: Reliability  
**Line**: 119  
- Error handler defined before static file middleware
- Won't catch errors from static file serving
- **Impact**: Unhandled errors crash server
- **Fix**: Move error handler to last middleware position

### 5. Type Safety - Multiple `any` Usage
**Severity**: Critical  
**Type**: Type Safety  
**Files**: LeadDetail.tsx, LeadsList.tsx, db.ts  
- 15+ instances of `any` type
- Unsafe type assertions without runtime checks
- **Impact**: Runtime errors, no compile-time safety
- **Fix**: Define proper interfaces and use type guards

## Major Issues (Should Fix)

### 6. Duplicate Code - Email Copying Logic
**Severity**: Major  
**Type**: Duplication  
**Files**: LeadDetail.tsx (lines 218-274, 362-404)  
- Same clipboard logic repeated 3 times
- 80+ lines of duplicated code
- **Fix**: Extract to `useClipboard` hook

### 7. Magic Numbers - Timeouts and Intervals
**Severity**: Major  
**Type**: Maintainability  
**Files**: LeadDetail.tsx, LeadsList.tsx  
```typescript
setTimeout(() => setCopiedBackground(false), 2000); // Line 156
refetchInterval: 5000 // Line 116
refetchInterval: 10000 // Line 126
```
- **Fix**: Extract to constants:
```typescript
const TOAST_DURATION_MS = 2000;
const FAST_REFRESH_INTERVAL_MS = 5000;
const SLOW_REFRESH_INTERVAL_MS = 10000;
```

### 8. Complex State Management - LeadsList.tsx
**Severity**: Major  
**Type**: Complexity  
**Line**: 66-82  
- 17 separate useState calls
- Ref used as synchronization lock
- Complex interdependencies
- **Fix**: Use useReducer with discriminated union actions

### 9. Validation Duplication - campaigns.ts
**Severity**: Major  
**Type**: Duplication  
**Lines**: 69-93, 128-152  
- Same validation logic in POST and PUT
- String trimming repeated
- **Fix**: Extract validation to Zod schema

### 10. Missing Input Validation - campaign-renderer.ts
**Severity**: Major  
**Type**: Security  
**Line**: 118-140  
- No sanitization of user input in templates
- XSS risk if templates rendered to HTML
- **Fix**: Add HTML escaping for web context

## Minor Issues (Good to Fix)

### 11. Unused Imports/Types
**Files**: App.tsx  
- `View` type defined but unused (line 18)

### 12. Hardcoded URLs
**File**: LeadsList.tsx (line 807)  
```typescript
href="http://192.168.1.65:3000/leads"
```
- Should use environment variable or relative path

### 13. Console Logging in Production Code
**Files**: Multiple  
- `console.log`, `console.error`, `console.warn` used throughout
- **Fix**: Use proper logger (winston, pino)

### 14. Missing Return Type Annotations
**Files**: Multiple  
- Several functions missing explicit return types
- **Fix**: Add `: ReturnType` to all exported functions

### 15. Inconsistent Error Handling Pattern
**Files**: campaigns.ts, leads routes  
- Some routes return `{ error, details }`, others just `{ error }`
- **Fix**: Standardize error response interface

## Performance Issues

### 16. Inefficient Queries - db.ts
**Line**: 2473-2567 (getLeadsWithUpcomingBirthdays)  
- Loads all leads into memory for date parsing
- O(n) complexity for every call
- **Fix**: Add computed column or index

### 17. Missing Query Optimization
**File**: db.ts  
- No indexes defined on frequently queried columns
- Full table scans on `status`, `email_status` filters
- **Fix**: Add indexes in schema

## Code Style Issues

### 18. Inconsistent Naming
**Files**: Multiple  
- Mix of camelCase and snake_case in database columns
- Inconsistent component file naming
- **Fix**: Adopt single convention

## Recommended Immediate Fixes (Before Commit)

1. **Fix silent error swallowing in db.ts** (30 min) - Critical
2. **Move error handler in server.ts** (5 min) - Critical  
3. **Replace `any` with proper types** (1 hour) - Critical
4. **Extract constants for magic numbers** (15 min) - Major
5. **Add Zod validation to campaigns.ts** (30 min) - Major

## Long-term Refactoring Plan

1. Split LeadDetail.tsx into modules (4 hours)
2. Split db.ts into modules (6 hours)
3. Implement proper logging system (2 hours)
4. Add database indexes (1 hour)
5. Extract shared hooks (useClipboard, useToast) (2 hours)

## Test Coverage Gaps

- No tests for campaign rendering
- No tests for database migrations
- No tests for React components
- **Recommendation**: Add tests before refactoring

## Security Considerations

- Input validation present but inconsistent
- No rate limiting on API endpoints
- No CSRF protection
- SQL injection prevented (parameterized queries ✓)

## Conclusion

Code is functional but needs refactoring for maintainability. Critical issues should be fixed before commit. Major refactoring should be scheduled for next sprint.

