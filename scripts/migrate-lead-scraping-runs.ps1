#!/usr/bin/env pwsh
# Manual migration script for lead_scraping_runs table
# Run this if automatic migrations fail

Write-Host "🔧 Running manual database migration..." -ForegroundColor Yellow
Write-Host ""

$dbPath = "data/app.db"
$sqlScript = "scripts/migrate-lead-scraping-runs.sql"

if (-not (Test-Path $dbPath)) {
    Write-Host "❌ Database not found: $dbPath" -ForegroundColor Red
    Write-Host "   Make sure you're running this from the project root." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $sqlScript)) {
    Write-Host "❌ SQL script not found: $sqlScript" -ForegroundColor Red
    exit 1
}

# Check if sqlite3 is available
$sqlite3 = Get-Command sqlite3 -ErrorAction SilentlyContinue
if (-not $sqlite3) {
    Write-Host "❌ sqlite3 not found in PATH" -ForegroundColor Red
    Write-Host "   You need to install SQLite command-line tools" -ForegroundColor Red
    Write-Host "   Download from: https://www.sqlite.org/download.html" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Alternative: Run the migration manually from Node.js" -ForegroundColor Yellow
    exit 1
}

Write-Host "Adding columns to lead_scraping_runs table..." -ForegroundColor Cyan

# Run each ALTER TABLE command separately to handle errors gracefully
$commands = @(
    "ALTER TABLE lead_scraping_runs ADD COLUMN error_message TEXT;",
    "ALTER TABLE lead_scraping_runs ADD COLUMN process_id INTEGER;",
    "ALTER TABLE lead_scraping_runs ADD COLUMN last_activity_at TEXT DEFAULT CURRENT_TIMESTAMP;"
)

$success = 0
$failed = 0

foreach ($cmd in $commands) {
    $result = sqlite3 $dbPath $cmd 2>&1
    if ($LASTEXITCODE -eq 0) {
        $success++
        Write-Host "   ✓ Migration executed" -ForegroundColor Green
    } else {
        if ($result -like "*duplicate column name*") {
            Write-Host "   ⚠ Column already exists (skipped)" -ForegroundColor Yellow
        } else {
            $failed++
            Write-Host "   ❌ Error: $result" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "📊 Checking table schema..." -ForegroundColor Cyan
sqlite3 $dbPath ".schema lead_scraping_runs"

Write-Host ""
if ($failed -eq 0) {
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Migration completed with $failed error(s)" -ForegroundColor Yellow
}
Write-Host ""

