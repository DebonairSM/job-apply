# Leads Stats Display Fix

## Issue
The stats section at the top of the Leads dashboard was showing all zeros despite having 6 leads in the database.

## Root Cause
SQLite syntax error in SQL queries. The queries were using double quotes (`""`) for empty string comparisons, but SQLite requires single quotes (`''`) for string literals. In SQLite:
- Double quotes (`""`) are for column/table identifiers
- Single quotes (`''`) are for string literals

This caused all stats queries to fail with error: `no such column: "" - should this be a string literal in single-quotes?`

## Files Fixed
Fixed SQL queries in `src/lib/db.ts`:

### 1. getLeadStats() function
Changed:
```sql
WHERE email IS NOT NULL AND email != ""
WHERE company IS NOT NULL AND company != ""
WHERE title IS NOT NULL AND title != ""
```

To:
```sql
WHERE email IS NOT NULL AND email != ''
WHERE company IS NOT NULL AND company != ''
WHERE title IS NOT NULL AND title != ''
```

### 2. getLeads() function
Changed:
```sql
AND email IS NOT NULL AND email != ""
AND (email IS NULL OR email = "")
```

To:
```sql
AND email IS NOT NULL AND email != ''
AND (email IS NULL OR email = '')
```

### 3. getLeadsCount() function
Changed:
```sql
AND email IS NOT NULL AND email != ""
AND (email IS NULL OR email = "")
```

To:
```sql
AND email IS NOT NULL AND email != ''
AND (email IS NULL OR email = '')
```

## Verification
Created diagnostic script to verify the fix:
- Total leads: 6
- With email: 5
- Without email: 1

Stats now display correctly in the dashboard.

## Prevention
When writing SQLite queries, always use single quotes for string literals. Consider adding ESLint rules or tests to catch this pattern in the future.

