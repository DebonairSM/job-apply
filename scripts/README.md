# Utility Scripts

## reset-jobs.js

Resets skipped jobs back to queued status in the database.

```bash
node scripts/reset-jobs.js
```

Use this when you want to reconsider jobs that were previously skipped during search.

**Note:** Most cache clearing operations are available via the CLI:
```bash
npm run clear-cache        # Clear all caches
npm run clear-cache answers    # Clear answer cache only
npm run clear-cache mapping    # Clear field mapping cache only
```

