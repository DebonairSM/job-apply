# URL Normalization Fix for Lead Scraper

## Issue

During a LinkedIn profile scraping run (Run #28), all 10 profiles were marked as "already exists" even though they appeared to be skipped incorrectly. Investigation revealed a URL format inconsistency issue.

## Root Cause

LinkedIn profile URLs can have inconsistent trailing slashes:
- Database stored: `https://www.linkedin.com/in/username`
- Scraper extracted: `https://www.linkedin.com/in/username/`

The duplicate detection had fallback mechanisms that worked:
1. Primary: Exact URL match (failed due to trailing slash difference)
2. Fallback: LinkedIn ID match (succeeded)
3. Fallback: Name + email match

While the fallback mechanisms prevented actual duplicates, the primary URL check was inefficient due to lack of normalization.

## Solution

Implemented URL normalization in three locations to ensure consistent trailing slash handling:

### 1. Lead Scraper (`src/services/lead-scraper.ts`)

Added trailing slash removal when extracting profile URLs:

```typescript
// Clean up profile URL (remove query parameters and trailing slash)
let profileUrl = href.includes('?') ? href.split('?')[0] : href;
if (!profileUrl.startsWith('http')) {
  profileUrl = `https://www.linkedin.com${profileUrl}`;
}
// Remove trailing slash for consistent URL format
profileUrl = profileUrl.replace(/\/$/, '');
```

### 2. Database Helper Functions (`src/lib/db.ts`)

Updated three functions to normalize URLs before database operations:

**`leadExistsByUrl()`**:
```typescript
export function leadExistsByUrl(profileUrl: string): boolean {
  const database = getDb();
  // Normalize URL by removing trailing slash
  const normalizedUrl = profileUrl.replace(/\/$/, '');
  const stmt = database.prepare('SELECT 1 FROM leads WHERE profile_url = ? AND deleted_at IS NULL LIMIT 1');
  const result = stmt.get(normalizedUrl);
  return !!result;
}
```

**`leadExistsIncludingDeleted()`**:
```typescript
export function leadExistsIncludingDeleted(profileUrl: string, linkedinId?: string, name?: string, email?: string): boolean {
  const database = getDb();
  
  // Normalize URL by removing trailing slash
  const normalizedUrl = profileUrl.replace(/\/$/, '');
  
  // Check by profile URL first (most reliable)
  let stmt = database.prepare('SELECT 1 FROM leads WHERE profile_url = ? LIMIT 1');
  let result = stmt.get(normalizedUrl);
  if (result) return true;
  // ... fallback checks
}
```

**`getLeadByUrl()`**:
```typescript
export function getLeadByUrl(profileUrl: string): Lead | null {
  const database = getDb();
  // Normalize URL by removing trailing slash
  const normalizedUrl = profileUrl.replace(/\/$/, '');
  const stmt = database.prepare('SELECT * FROM leads WHERE profile_url = ?');
  return stmt.get(normalizedUrl) as Lead | null;
}
```

### 3. Check Lead Script (`scripts/check-lead.ts`)

Updated to use the normalized database functions instead of raw SQL queries:

```typescript
// Try to find by URL first (this will normalize the URL automatically)
let lead = profileUrl.startsWith('http') ? getLeadByUrl(profileUrl) : null;
```

## Benefits

1. **Consistent duplicate detection**: URLs are normalized before comparison
2. **Improved efficiency**: Primary URL check succeeds without falling back to ID/name matching
3. **Reduced database queries**: Single query instead of multiple fallback attempts
4. **Future-proof**: Handles any trailing slash variations from LinkedIn

## Testing

Verified the fix works with both URL formats:

```bash
# With trailing slash
npx tsx scripts/check-lead.ts "https://www.linkedin.com/in/lisabrownebanicprexpert/"
# ✅ Lead found in database

# Without trailing slash  
npx tsx scripts/check-lead.ts "https://www.linkedin.com/in/lisabrownebanicprexpert"
# ✅ Lead found in database
```

## Example Case

Profile: LISA "BB" BROWNE-BANIC, U.S. Army (Veteran), PhD candidate
- LinkedIn URL: https://www.linkedin.com/in/lisabrownebanicprexpert/
- Database URL: https://www.linkedin.com/in/lisabrownebanicprexpert
- Before fix: Matched via LinkedIn ID fallback
- After fix: Matches directly via normalized URL

## Related Files

- `src/services/lead-scraper.ts`: Profile URL extraction and normalization
- `src/lib/db.ts`: Database helper functions with URL normalization
- `scripts/check-lead.ts`: Lead lookup script using normalized functions

