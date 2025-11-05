# CLI Reference Update - November 2025

## Overview
Updated the lead scraping CLI reference documentation to accurately reflect the current command implementation, parameters, and usage patterns.

## Changes Made

### File Renamed
- **From:** `LEADS_CLI_REFERENCE_UI.md`
- **To:** `LEADS_CLI_REFERENCE.md`
- **Reason:** Document is now a comprehensive CLI reference rather than a UI implementation document

### Content Transformation
Completely rewrote the document from a UI-focused implementation guide to a practical CLI command reference.

### Sections Added

**Command Syntax**
- Basic command format
- npm run command structure

**Available Options**
- `--profile, -p`: Select predefined lead profile
- `--titles, -t`: Custom title filtering
- `--max, -m`: Limit number of profiles to scrape
- `--resume, -r`: Resume interrupted runs
- `--start-page, -s`: Skip earlier pages and start from specific page

**Lead Profiles**
Documented all 8 available profiles with full descriptions:
1. chiefs - C-Suite & Leadership
2. founders - Founders & Entrepreneurs
3. directors - Directors & Senior Management
4. techLeads - Technical Leadership
5. productLeads - Product Leadership
6. recruiters - Recruiters & Talent Acquisition
7. sales - Sales & Business Development
8. consultants - Consultants & Advisors

Each profile includes:
- Full description
- Complete list of title filters
- Usage examples

**Common Usage Patterns**
- Quick start with defaults
- Large batch scraping
- Custom title searches
- Resuming after interruption
- Starting from middle of results
- Combining multiple options

**Command Validation Rules**
- Mutual exclusivity of --profile and --titles
- Resume run validation requirements
- Page number validation

**Output and Results**
- Console output during scraping
- Final summary format
- Dashboard integration details

**Graceful Shutdown**
- How to stop a running command
- Progress preservation
- Resume command generation

**Troubleshooting**
- No session found error
- Unknown profile error
- Rate limiting handling
- Browser launch issues

**Advanced Usage**
- Environment variables (HEADLESS, SLOW_MO)
- Database queries
- Debugging failed runs

**Best Practices**
- Start with small batches
- Use specific profiles
- Resume rather than restart
- Monitor progress in dashboard
- Respect rate limits

**Files and Locations**
- Implementation files
- Documentation references
- Data storage locations

### Updated References
Fixed references to the renamed file in:
- `docs/LEADS_START_PAGE_FEATURE.md`
- `docs/INDEX.md`

## Impact

### User Benefits
- Clear, actionable CLI reference
- All options documented with examples
- Validation rules explained upfront
- Troubleshooting guidance included
- Best practices for effective usage

### Documentation Quality
- Focused on CLI usage rather than UI implementation
- Comprehensive coverage of all parameters
- Practical examples for common scenarios
- Error messages and solutions documented
- Integration with dashboard explained

## Technical Details

### Profiles Verified
All 8 profiles confirmed in `src/ai/lead-profiles.ts`:
- chiefs, founders, directors, techLeads
- productLeads, recruiters, sales, consultants

### Command Options Verified
All options confirmed in `src/cli.ts` line 140-177:
- profile (with choices validation)
- titles (string, comma-separated)
- max (number, default 50)
- resume (number, run ID)
- start-page (number)

### Implementation Checked
Command implementation verified in `src/cli/lead-search.ts`:
- Profile loading and validation
- Title filtering logic
- Run creation and resumption
- Graceful shutdown handling
- Progress tracking

## Files Modified

**Renamed:**
- `docs/LEADS_CLI_REFERENCE_UI.md` → `docs/LEADS_CLI_REFERENCE.md`

**Updated:**
- `docs/LEADS_START_PAGE_FEATURE.md` - Fixed reference to renamed file
- `docs/INDEX.md` - Updated link and description
- `src/dashboard/client/components/LeadsList.tsx` - Updated UI cheat sheet with latest parameters

**Created:**
- `docs/CLI_REFERENCE_UPDATE_NOV_2025.md` - This summary document

## UI Cheat Sheet Update

Updated the collapsible CLI reference panel on the Leads page to include:

**Added Parameter:**
- `--start-page` - Skip earlier pages and start from specific page number

**Improved Descriptions:**
- Clarified default limit (50 profiles) for `--max` parameter
- Added note about mutual exclusivity of `--profile` and `--titles`
- Improved description for `--resume` parameter

The UI cheat sheet now displays all 5 available command-line parameters with clear examples and explanations.

## Verification Steps

1. Verified all 8 profiles exist in lead-profiles.ts
2. Checked all command options in cli.ts
3. Confirmed option validation logic
4. Verified default values (max: 50)
5. Checked mutual exclusivity enforcement
6. Confirmed graceful shutdown behavior
7. Validated resume functionality exists

## Next Steps

### Potential Improvements
1. Add quick reference table at top of document
2. Create separate profile reference card
3. Add flowchart for choosing profile vs custom titles
4. Include performance benchmarks for different max values
5. Add examples of common SQL queries for lead data

### Maintenance Notes
- Keep profiles section in sync with lead-profiles.ts
- Update command options when cli.ts changes
- Add new troubleshooting sections based on user feedback
- Update examples as best practices evolve

## Related Documentation

- `docs/LEAD_PROFILES_GUIDE.md` - Detailed profile information
- `docs/LEADS_START_PAGE_FEATURE.md` - Start page parameter usage
- `README.md` - Quick start guide with lead scraping examples
- `src/ai/lead-profiles.ts` - Profile definitions source code
- `src/cli/lead-search.ts` - Command implementation

