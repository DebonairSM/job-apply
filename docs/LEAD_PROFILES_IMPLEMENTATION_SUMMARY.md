# Lead Profiles Implementation Summary

## Overview
Implemented a profile-based system for LinkedIn lead scraping, similar to the job search profiles. This allows users to target specific types of professionals using predefined groups of job titles instead of manually specifying titles each time.

## What Was Created

### 1. Lead Profiles System
**File:** `src/ai/lead-profiles.ts`

Created 8 predefined profiles:
- **chiefs** - C-Suite & Leadership (16 titles including CTO, CEO, VP, General Manager)
- **founders** - Founders & Entrepreneurs (8 titles including Founder, Owner, President)
- **directors** - Directors & Senior Management (12 titles including Director, Head of Engineering)
- **techLeads** - Technical Leadership (11 titles including Tech Lead, Architect)
- **productLeads** - Product Leadership (10 titles including Product Manager, CPO)
- **recruiters** - Recruiters & Talent Acquisition (10 titles including Recruiter, Talent Partner)
- **sales** - Sales & Business Development (11 titles including Sales, CRO)
- **consultants** - Consultants & Advisors (9 titles including Consultant, Fractional CTO)

### 2. CLI Integration
**File:** `src/cli.ts`

Added `--profile` option to `leads:search` command:
- Profile choices enforced at CLI level
- Mutual exclusion: Cannot use both `--profile` and `--titles`
- Short alias: `-p`

### 3. Command Handler Updates
**File:** `src/cli/lead-search.ts`

Enhanced lead search command:
- Loads profile by key using helper functions
- Falls back to manual titles if no profile specified
- Displays profile name and description
- Shows first 5 titles with "..." if more exist
- Error handling for unknown profiles

### 4. Documentation
**File:** `docs/LEAD_PROFILES_GUIDE.md`

Complete guide covering:
- All 8 profiles with descriptions and use cases
- Usage examples for each profile
- Best practices for scraping
- Troubleshooting common issues
- Instructions for creating custom profiles

**File:** `docs/LEAD_PROFILES_IMPLEMENTATION_SUMMARY.md` (this file)

### 5. README Updates
**File:** `README.md`

Updated three sections:
- Quick Start: Shows profile examples instead of manual titles
- Common Commands: Lists all profiles with descriptions
- Setup: Uses profile example in run commands

## Usage Examples

### Basic Profile Usage
```bash
npm run leads:search -- --profile chiefs
```

### With Limits
```bash
npm run leads:search -- --profile chiefs --max 100
```

### Multiple Profiles (Separate Runs)
```bash
npm run leads:search -- --profile chiefs --max 50
npm run leads:search -- --profile founders --max 50
npm run leads:search -- --profile directors --max 50
```

### Still Supports Manual Titles
```bash
npm run leads:search -- --titles "CTO,VP Engineering"
```

### View Available Profiles
```bash
npm run leads:search -- --help
```

## Technical Implementation

### Profile Structure
```typescript
interface LeadProfile {
  name: string;          // Display name (e.g., "C-Suite & Leadership")
  description: string;   // Purpose and use case
  titles: string[];      // Array of title keywords to match
}
```

### Helper Functions
- `getLeadProfile(key)` - Retrieve profile by key
- `getLeadProfileKeys()` - Get all available profile keys
- `getLeadProfileTitles(key)` - Get titles array for a profile

### Matching Logic
- Case-insensitive substring matching
- Example: "VP" matches "VP Engineering", "SVP Product", "EVP Technology"
- Matches against LinkedIn profile headline on profile page

## Benefits

1. **Simplified Commands**: No need to remember and type out multiple titles
2. **Consistency**: Same title groups can be reused across sessions
3. **Maintainability**: Update titles in one place (lead-profiles.ts)
4. **Discoverability**: CLI shows available profiles in help text
5. **Flexibility**: Can still use custom titles when needed
6. **Documentation**: Clear use cases and examples for each profile

## Impact on Existing Functionality

### No Breaking Changes
- `--titles` option still works exactly as before
- Existing scripts and workflows continue to function
- Profile system is additive, not replacing

### Enhanced Capabilities
- More efficient for common use cases
- Better user experience with fewer keystrokes
- Easier to share and document workflows

## Files Modified

1. `src/ai/lead-profiles.ts` - NEW (profile definitions)
2. `src/cli/lead-search.ts` - MODIFIED (profile support)
3. `src/cli.ts` - MODIFIED (CLI option)
4. `docs/LEAD_PROFILES_GUIDE.md` - NEW (user guide)
5. `docs/LEAD_PROFILES_IMPLEMENTATION_SUMMARY.md` - NEW (this file)
6. `docs/INDEX.md` - MODIFIED (added guide reference)
7. `README.md` - MODIFIED (updated examples)

## Testing

### Verify Profile System
```bash
# Test profile help
npm run leads:search -- --help

# Test unknown profile
npm run leads:search -- --profile invalid

# Test chiefs profile
npm run leads:search -- --profile chiefs --max 5

# Test manual titles still work
npm run leads:search -- --titles "CTO" --max 5

# Test mutual exclusion
npm run leads:search -- --profile chiefs --titles "CTO"  # Should error
```

### Expected Output
Profile usage shows:
- Profile name
- Description
- First 5 titles (+ "..." if more)
- Total title count

Manual titles show:
- Comma-separated list of titles

## Future Enhancements

### Potential Additions
1. **Combined Profiles**: Allow `--profile chiefs,directors` to merge multiple profiles
2. **Profile Exclusions**: `--profile chiefs --exclude CEO,CFO`
3. **Industry-Specific Profiles**: Finance, Healthcare, Retail, etc.
4. **Seniority Levels**: Entry, Mid, Senior profiles
5. **Dashboard Profile Management**: Create/edit profiles via UI
6. **Profile Analytics**: Track which profiles yield the best connections

### Custom Profile Workflow
1. User creates custom profile in `src/ai/lead-profiles.ts`
2. Adds profile key to CLI choices in `src/cli.ts`
3. Tests with small batch
4. Uses regularly via `--profile customName`

## Related Documentation

- [LEADS_SYSTEM_IMPLEMENTATION.md](LEADS_SYSTEM_IMPLEMENTATION.md) - Original leads system
- [LEAD_PROFILES_GUIDE.md](LEAD_PROFILES_GUIDE.md) - User guide for profiles
- [LEADS_SCRAPER_PROFILE_EXTRACTION_FIX.md](LEADS_SCRAPER_PROFILE_EXTRACTION_FIX.md) - Profile data extraction fix
- [README.md](../README.md) - Main project documentation

## User Request Context

User wanted to create a profile called "Chiefs" containing titles:
- CTO
- Chief Technology Officer
- General Manager
- Director
- Founder

This implementation expanded on that request to create a comprehensive system with 8 profiles covering various networking scenarios, with "chiefs" as the flagship profile containing C-level executives and leadership roles.

