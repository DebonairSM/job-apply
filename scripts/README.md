# Scripts Directory

## Daily Use Scripts (via npm run)

**Company & Filter Management**
- `npm run block:company "CompanyName"` → `block-company.js`
- `npm run filters:add` → `add-tech-filters.js` 
- `npm run filters:remove` → `remove-tech-filters.js`
- `npm run filters:list` → `list-filters.js`

**Database Management** 
- `npm run backup` → `create-backup.js`
- `npm run backup:inspect` → `inspect-databackup.js`
- `npm run backup:restore` → `restore-from-databackup.js`
- `npm run reset:*` → `reset-database.js`

**Dashboard & Development**
- `npm run dashboard:dev` → `start-dev-server.js` + `wait-for-server.js`
- `npm run dashboard:serve` → `start-prod-server.js`

**System Verification**
- `npm run verify:safety` → `verify-safety-system.js`

---

## Admin Scripts (direct node execution)

**Data Management**
- `export-database.js` - Export database to JSON/SQL
- `setup-profile.js` - Initial user profile setup
- `recalculate-ranks.js` - Recalculate job rankings
- `verify-ranks.js` - Verify ranking calculations

**Learning & Analytics**
- `backfill-rejection-learning.js` - Apply learning to historical data
- `check-easy-apply.js` - Quick Easy Apply job statistics
- `check-backup.js` - Verify backup integrity

**Utilities**
- `lib/db-safety.js` - Shared database safety utilities

---

## Quick Reference

```bash
# Block a company forever
npm run block:company "BadCompany"

# Clean slate for testing
npm run reset:queue

# Manual backup before major changes  
npm run backup

# Check what's being filtered
npm run filters:list

# Export data for analysis
node scripts/export-database.js

# Quick stats check
node scripts/check-easy-apply.js
```
