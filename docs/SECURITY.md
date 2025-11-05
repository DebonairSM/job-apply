# Security & Data Safety

## Overview

This application prioritizes data safety and privacy through automatic backups, test isolation, and local AI processing.

## Privacy

### Local AI Processing
- All AI operations run locally via Ollama (Llama 3.1 8B)
- No data sent to external APIs
- No API keys or cloud services required for core functionality
- Complete control over your data

### LinkedIn Session
- Session stored locally in `storage/storageState.json`
- Automatically excluded from git via .gitignore
- Refresh with `npm run login` when expired

### Personal Data Storage
- All data stored in local SQLite database (`data/app.db`)
- Resumes stored locally in `resumes/` folder
- Lead contact information (emails, phone numbers) stored locally
- No external synchronization or cloud backup by default

## Database Safety System

### Automatic Backups

Every script that modifies the database creates a backup first:

```bash
npm run search     # Auto-backup created before search
npm run reset:jobs # Auto-backup + confirmation required
```

**Backup Location**: `data/backups/app.db.auto-backup-YYYY-MM-DDTHH-MM-SS`

**Retention**: Last 10 automatic backups kept

### Manual Backups

Create backups before important operations:

```bash
npm run backup
# Creates: data/backups/app.db.backup-YYYY-MM-DDTHH-MM-SS
```

### Test Isolation

All tests use in-memory databases and never touch production data:

```bash
npm run test:all
# Output: 🧪 Using in-memory test database (production data is safe)
```

### Safety Confirmations

Destructive operations require 5-second confirmation:

```bash
npm run reset:jobs

💾 Auto-backup created: data/backups/app.db.auto-backup-2025-11-05T14-30-15

⚠️  DESTRUCTIVE OPERATION
============================================================
Operation: Delete all jobs
Jobs affected: 249
⚠️  THIS WILL DELETE DATA PERMANENTLY
============================================================

Press Ctrl+C to cancel, or wait 5 seconds to continue...
```

Press **Ctrl+C** within 5 seconds to cancel.

## Recovery Procedures

### Restore from Backup

```bash
# 1. List available backups
ls -lt data/backups/ | head -20

# 2. Restore from specific backup
cp data/backups/app.db.auto-backup-2025-11-05T14-30-15 data/app.db

# 3. Verify restoration
npm run status
```

### Script Failure Recovery

If a script fails mid-operation:

```bash
# Find most recent backup
ls -lt data/backups/ | grep auto-backup | head -1

# Restore from that backup
cp data/backups/app.db.auto-backup-LATEST data/app.db
```

## Safe Operations

### Non-Destructive (No Confirmation)
```bash
npm run reset:queue      # queued → skipped
npm run reset:restore    # skipped → queued
npm run reset:applied    # applied → queued
```

### Destructive (Auto-Backup + Confirmation)
```bash
npm run reset:jobs       # Deletes all jobs
npm run reset:full       # Deletes jobs + caches
npm run reset:nuclear    # Deletes EVERYTHING
```

## Sensitive Data Handling

### What Gets Stored
- LinkedIn job postings (title, company, description, location)
- Your application history (status, timestamps)
- Contact information from leads (name, email, phone, website)
- LinkedIn profile URLs and company names
- Resume content (for AI context)

### What Doesn't Get Stored
- LinkedIn passwords (session-based authentication)
- Other people's personal conversations
- Full LinkedIn profiles (only extracted contact info)

### Data Cleanup

Remove old data:

```bash
# Clear cached form answers
npm run clear-cache

# Reset to start fresh (with backup)
npm run reset:full
```

## Verification

Check safety system health:

```bash
npm run verify:safety

# Expected output:
# ✅ ALL TESTS PASSED - Safety system working correctly
```

## Configuration

Environment variables for security:

```bash
# Disable headless mode (see browser actions)
HEADLESS=false

# Enable Playwright traces (debugging, larger files)
ENABLE_TRACING=true
```

## Best Practices

1. **Before Experimenting**: Always create manual backup
   ```bash
   npm run backup
   ```

2. **Regular Backups**: Old auto-backups are cleaned up automatically (keeps 10), but create manual backups before major changes

3. **Test Safety**: Verify safety system periodically
   ```bash
   npm run verify:safety
   ```

4. **Session Management**: Refresh LinkedIn session if automation starts failing
   ```bash
   npm run login
   ```

5. **Data Review**: Regularly review stored data in dashboard to ensure nothing unexpected is captured

## Security Considerations

1. **Backups Contain Your Data**: Store backups securely, they include all personal information
2. **In-Memory Test DBs**: Test data never persists after tests complete
3. **Read-Only Mode**: Some operations open database in read-only mode for safety
4. **Confirmation Timeouts**: 5 seconds provides enough time to cancel without being annoying
5. **No Cloud Storage**: No automatic cloud sync means you control all data

