# Database Safety System

## Overview

The Database Safety System protects your job application data from accidental loss through automatic backups, test isolation, and safety confirmations. This system was implemented after a data loss incident to ensure it never happens again.

## Key Features

### 1. Automatic Backups

**Every script that modifies the database automatically creates a backup before making ANY changes.**

```javascript
// Example: Opening database with auto-backup
import { openDatabase } from './lib/db-safety.js';

const db = openDatabase({ backup: true }); // Auto-backup created here
```

**Backup Location**: `data/backups/app.db.auto-backup-YYYY-MM-DDTHH-MM-SS`

**Backup Retention**: Last 10 automatic backups are kept

### 2. Test Isolation

**All automated tests use in-memory databases and NEVER touch production data.**

```javascript
// Tests automatically use in-memory database
process.env.TEST_MODE = 'true'; // or NODE_ENV = 'test'
const db = getDb(); // Returns :memory: database
```

When running tests:
```bash
npm run test:all
# Output: 🧪 Using in-memory test database (production data is safe)
```

### 3. Safety Confirmations

**Destructive operations require a 5-second confirmation period.**

```bash
$ npm run reset:jobs

💾 Auto-backup created: data/backups/app.db.auto-backup-2025-10-26T14-30-15

⚠️  DESTRUCTIVE OPERATION
============================================================
Operation: Delete all jobs
Jobs affected: 249
⚠️  THIS WILL DELETE DATA PERMANENTLY
============================================================

A backup has been created automatically.
Press Ctrl+C to cancel, or wait 5 seconds to continue...
```

Press **Ctrl+C** within 5 seconds to cancel the operation.

### 4. Read-Only Mode

**Open databases in read-only mode for safe queries.**

```javascript
const db = openDatabase({ readonly: true, backup: false });
// Database cannot be modified
```

## Protected Scripts

All these scripts now include automatic backups:

### Database Modifying Scripts
- `scripts/reset-database.js` - All reset operations ✅
- `scripts/setup-profile.js` - Profile creation/updates ✅
- `scripts/recalculate-ranks.js` - Rank recalculation ✅
- `scripts/backfill-rejection-learning.js` - Learning data updates
- `scripts/migrate-to-database.js` - Data migration
- `scripts/add-tech-filters.js` - Filter management
- `scripts/remove-tech-filters.js` - Filter removal

### Test Scripts (Use In-Memory DB)
- All files in `tests/` directory
- Automatically use `:memory:` database
- Never touch production data

## How to Use

### Creating Manual Backups

```bash
# Create a timestamped backup before important operations
npm run backup

# Creates: data/backups/app.db.backup-YYYY-MM-DDTHH-MM-SS
```

### Restoring from Backup

```bash
# Method 1: Inspect and restore from databackup/
npm run backup:inspect
npm run backup:restore

# Method 2: Manual restore from backups/
ls data/backups/
cp data/backups/app.db.auto-backup-2025-10-26... data/app.db
```

### Running Safe Operations

```bash
# SAFE: Only changes status (no data deletion)
npm run reset:queue      # queued → skipped
npm run reset:restore    # skipped → queued
npm run reset:applied    # applied → queued

# DESTRUCTIVE: Auto-backup + confirmation
npm run reset:jobs       # Deletes all jobs
npm run reset:full       # Deletes jobs + caches
npm run reset:nuclear    # Deletes EVERYTHING
```

### Verifying Safety System

```bash
# Run verification tests
npm run verify:safety

# Expected output:
# ✅ ALL TESTS PASSED - Safety system working correctly
```

## Technical Implementation

### Database Safety Module

Location: `scripts/lib/db-safety.js`

**Key Functions:**

```javascript
// Create automatic backup
createAutoBackup() → string (backup path)

// Get correct database path (production vs test)
getDatabasePath() → string

// Open database with options
openDatabase(options) → Database
  options.backup - Create backup before opening
  options.readonly - Open in read-only mode
  options.confirmDestructive - Require confirmation

// Require confirmation for destructive ops
confirmDestructiveOperation(operation, impact) → Promise<boolean>

// Setup test database with schema
setupTestDatabase(db, options)

// Copy production DB for testing
copyProductionForTest() → string (test DB path)

// Clean up old backups
cleanupOldBackups(keepCount = 10)
```

### Integration with Existing Code

**Before (Unsafe):**
```javascript
import Database from 'better-sqlite3';
const db = new Database('data/app.db');
// No backup, no safety checks
```

**After (Safe):**
```javascript
import { openDatabase } from './lib/db-safety.js';
const db = openDatabase({ backup: true });
// Auto-backup created, safety checks in place
```

### Test Integration

**Before (Could Touch Production):**
```javascript
import Database from 'better-sqlite3';
const db = new Database('data/app.db'); // Dangerous!
```

**After (Isolated):**
```javascript
import { getDb, setTestMode } from './lib/db.js';
setTestMode(true); // or set process.env.TEST_MODE = 'true'
const db = getDb(); // Returns in-memory database
```

## Backup Types

### Automatic Backups
- **When**: Created automatically before any state-changing script
- **Location**: `data/backups/app.db.auto-backup-*`
- **Retention**: Last 10 kept automatically
- **Usage**: Failsafe for script operations

### Manual Backups
- **When**: Created with `npm run backup`
- **Location**: `data/backups/app.db.backup-*`
- **Retention**: You manage manually
- **Usage**: Before major operations or experiments

### Restoration Backups
- **When**: Created by `restore-from-databackup.js` before restoring
- **Location**: `data/backups/app.db.before-restore-*`
- **Retention**: Manual
- **Usage**: Safety net when restoring from old backups

## Best Practices

### 1. Before Experimenting
```bash
# Always create manual backup first
npm run backup

# Then experiment
npm run reset:queue
npm run search -- --profile test-profile
```

### 2. Regular Testing
```bash
# Verify safety system periodically
npm run verify:safety
```

### 3. Backup Management
```bash
# Check backups regularly
ls -lh data/backups/

# Remove old backups manually if needed
# (Automatic cleanup keeps last 10)
```

### 4. Test Development
```javascript
// Always set test mode in tests
describe('My Test', () => {
  beforeAll(() => {
    process.env.TEST_MODE = 'true';
    initDb(); // Will use in-memory database
  });
  
  afterAll(() => {
    delete process.env.TEST_MODE;
  });
});
```

## Recovery Procedures

### Scenario 1: Accidental Data Loss

```bash
# 1. Check what backups you have
ls -lt data/backups/ | head -20

# 2. Find the most recent good backup
# Automatic backups: app.db.auto-backup-*
# Manual backups: app.db.backup-*

# 3. Restore it
cp data/backups/app.db.auto-backup-2025-10-26T14-30-15 data/app.db

# 4. Verify restoration
npm run status
```

### Scenario 2: Script Failure

If a script fails mid-operation:

```bash
# 1. The database may be in inconsistent state
# 2. Find the backup created before the script ran
ls -lt data/backups/ | grep auto-backup

# 3. Restore from that backup
cp data/backups/app.db.auto-backup-LATEST data/app.db

# 4. Try again with fixes or different approach
```

### Scenario 3: Test Data Corruption

```bash
# Tests use in-memory database, so no corruption possible
# Just re-run the tests
npm run test:all
```

## Monitoring

### Check Backup Health

```bash
# Verify safety system
npm run verify:safety

# Check backup count
ls data/backups/ | wc -l

# Check total backup size
du -sh data/backups/
```

### Audit Backup Age

```bash
# Find oldest backup
ls -lt data/backups/ | tail -5

# Find newest backup
ls -lt data/backups/ | head -5
```

## Configuration

Environment variables:

```bash
# Enable test mode (uses in-memory database)
export TEST_MODE=true
# or
export NODE_ENV=test

# Disable confirmations (for automation)
# Not recommended - confirmations are for safety
```

## Troubleshooting

### Issue: "Database is locked"

**Cause**: Another process has the database open

**Solution**:
```bash
# Close the dashboard if running
# Kill any hanging Node processes
Get-Process -Name "node" | Stop-Process

# Wait a moment, then try again
```

### Issue: "No backup created"

**Cause**: Database file doesn't exist yet

**Solution**: This is normal for first-time setup. The script will create a new database.

### Issue: "Backup directory full"

**Cause**: Too many backups accumulated

**Solution**:
```bash
# Manually clean old backups
cd data/backups
rm app.db.auto-backup-2025-10-01*  # Remove old ones

# Or let automatic cleanup handle it
# (Keeps last 10 automatically)
```

## Security Considerations

1. **Backups contain your data**: Store backups securely
2. **In-memory test DBs**: No data persists (good for tests)
3. **Read-only mode**: Use for reporting/queries that don't modify data
4. **Confirmation timeouts**: 5 seconds is enough to cancel, not too long to be annoying

## Future Enhancements

Potential improvements:

- [ ] Compressed backups (gzip) to save space
- [ ] Automatic backup to cloud storage (Azure Blob, S3)
- [ ] Backup verification (integrity checks)
- [ ] Configurable retention policies
- [ ] Backup encryption for sensitive data
- [ ] Scheduled automatic backups (cron)

## Related Documentation

- [README Admin Section](../README.md#admin--testing-commands)
- [Database Implementation Summary](DATABASE_IMPLEMENTATION_SUMMARY.md)
- [Database Migration Guide](DATABASE_MIGRATION_GUIDE.md)
- [Testing Guide](TESTING_GUIDE.md)

## Support

If you encounter issues with the safety system:

1. Run `npm run verify:safety` to check system health
2. Check `data/backups/` for available backups
3. Review this documentation
4. Check git history for recent changes to safety system

## Changelog

**2025-10-26**: Initial implementation
- Added automatic backup system
- Added test isolation
- Added safety confirmations
- Added comprehensive documentation

