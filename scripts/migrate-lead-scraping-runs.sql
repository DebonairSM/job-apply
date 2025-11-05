-- Manual migration script for lead_scraping_runs table
-- Run this if automatic migrations fail
-- 
-- Usage:
--   sqlite3 data/app.db < scripts/migrate-lead-scraping-runs.sql
-- 
-- Or in PowerShell:
--   sqlite3 data/app.db ".read scripts/migrate-lead-scraping-runs.sql"

-- Add missing columns to lead_scraping_runs table
ALTER TABLE lead_scraping_runs ADD COLUMN error_message TEXT;
ALTER TABLE lead_scraping_runs ADD COLUMN process_id INTEGER;
ALTER TABLE lead_scraping_runs ADD COLUMN last_activity_at TEXT DEFAULT CURRENT_TIMESTAMP;

-- Verify the columns were added
.schema lead_scraping_runs

