# Skip to Page Feature - LinkedIn Leads Scraper

## Problem Solved

When running long scraping sessions that get interrupted or fail partway through, you had to start from page 1 every time. This wasted time re-processing profiles you'd already seen.

## Solution

Added `--start-page` option to skip ahead to any page number.

## Usage

### Basic Command
```bash
npm run leads:search -- --profile chiefs --start-page 5
```

This will:
1. Navigate to the search page
2. Click "Next" button 4 times (to get to page 5)
3. Start scraping from page 5

### Combined with Other Options
```bash
# Start from page 3, limit to 50 profiles total
npm run leads:search -- --profile chiefs --start-page 3 --max 50

# Start from page 10 with custom title filters
npm run leads:search -- --titles "CTO,VP Engineering" --start-page 10 --max 20
```

### Short Form
```bash
# -s is the short alias for --start-page
npm run leads:search -- --profile founders -s 5 -m 30
```

## How It Works

When you specify `--start-page N`:

1. Scraper loads the first page of search results
2. Automatically clicks "Next" button (N-1) times
3. Waits 2 seconds between each click for LinkedIn to load
4. Starts processing from page N
5. Console shows: `⏭️  Fast-forwarding to page 5...`

## Error Handling

If the scraper can't navigate to the requested page (e.g., you ask for page 100 but there are only 10 pages):

```
⚠️  Could not find next button at page 7, starting from current page
✅ Starting from page 7
```

It will start from the highest page it could reach.

## Real-World Example

Your last run showed:
```
Pages Processed: 5
Profiles Processed: 45
New Leads Added: 1
Success Rate: 2%
```

If you want to continue from page 6:
```bash
npm run leads:search -- --profile chiefs --start-page 6
```

## Important Notes

1. **Page numbers start at 1** (not 0)
2. **LinkedIn pagination** - If LinkedIn's pagination changes between runs, the page number may not correspond to the same profiles
3. **Use with --max** - Consider using `--max` to limit total profiles when starting from a high page number
4. **Recovery feature** - If scraper gets stuck (like after adding Udo Waibel), it will now stop and move to the next page automatically

## Recovery Improvements (Also Fixed)

When the scraper successfully adds a lead but gets stuck navigating back:

**Before:**
- Got stuck on profile page
- Tried to process 5 more profiles (all failed)
- You had to manually click back

**Now:**
- Detects stuck state: `⚠️  Warning: Could not verify search results loaded properly`
- Automatically stops: `🛑 STOPPING: Cannot continue on this page, moving to next page`
- Moves to next page
- Saves ~80 seconds of wasted time per stuck page

## Combined Workflow

When a scraping session gets stuck:

1. Note the last successful page number in the console output
2. Stop the scraper (Ctrl+C)
3. Restart from the next page:
   ```bash
   npm run leads:search -- --profile chiefs --start-page 6
   ```

## See Also

- `docs/LEAD_PROFILES_GUIDE.md` - List of available profiles
- `docs/LEADS_CLI_REFERENCE.md` - Complete CLI reference
- `docs/LINKEDIN_SCRAPER_LAZY_LOADING_FIX.md` - Recovery system details

