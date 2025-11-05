# Documentation Index

This directory contains documentation for the Job Application Automation system.

## Getting Started

- **[DASHBOARD_QUICKSTART.md](DASHBOARD_QUICKSTART.md)** - Quick start guide for the dashboard
- **[README.md](README.md)** - Main project documentation

## Setup and Configuration

- **[HTTPS_SETUP_COMPLETE.md](HTTPS_SETUP_COMPLETE.md)** - HTTPS setup for secure local development
- **[DATABASE_MIGRATION_GUIDE.md](DATABASE_MIGRATION_GUIDE.md)** - Database migration instructions
- **[DATABASE_SAFETY_SYSTEM.md](DATABASE_SAFETY_SYSTEM.md)** - Database backup and safety features
- **[SONARQUBE_SETUP_AND_USAGE.md](SONARQUBE_SETUP_AND_USAGE.md)** - Code quality analysis setup

## Customization Guides

- **[PROFILE_CREATION_GUIDE.md](PROFILE_CREATION_GUIDE.md)** - Creating custom job search profiles
- **[LEAD_PROFILES_GUIDE.md](LEAD_PROFILES_GUIDE.md)** - Using and creating lead scraping profiles
- **[RANKING_CUSTOMIZATION_GUIDE.md](RANKING_CUSTOMIZATION_GUIDE.md)** - Customizing job ranking algorithms
- **[TECH_FILTER_GUIDE.md](TECH_FILTER_GUIDE.md)** - Filtering jobs by technology stack
- **[CURSOR_CUSTOMIZATION_GUIDE.md](CURSOR_CUSTOMIZATION_GUIDE.md)** - Customizing the development environment
- **[CURSORRULES_EXAMPLES.md](CURSORRULES_EXAMPLES.md)** - Examples for Cursor IDE rules

## System Features

- **[KEYWORD_HIGHLIGHTING.md](KEYWORD_HIGHLIGHTING.md)** - Keyword highlighting in the dashboard
- **[RESUME_PROCESSING_SYSTEM.md](RESUME_PROCESSING_SYSTEM.md)** - Resume parsing and processing
- **[PROFILE_PERFORMANCE_ANALYTICS.md](PROFILE_PERFORMANCE_ANALYTICS.md)** - Profile performance tracking and analytics
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Testing framework and best practices
- **[LEADS_SYSTEM_IMPLEMENTATION.md](LEADS_SYSTEM_IMPLEMENTATION.md)** - LinkedIn leads scraping system
- **[ARTICLE_EXTRACTION_FEATURE.md](ARTICLE_EXTRACTION_FEATURE.md)** - Extracting and displaying LinkedIn articles from lead profiles
- **[WORKED_TOGETHER_FEATURE.md](WORKED_TOGETHER_FEATURE.md)** - Tracking shared work history with leads

## Recent Implementations

- **[LEAD_PROFILES_IMPLEMENTATION_SUMMARY.md](LEAD_PROFILES_IMPLEMENTATION_SUMMARY.md)** - Profile-based lead scraping system
- **[LEADS_CLI_REFERENCE.md](LEADS_CLI_REFERENCE.md)** - Complete CLI reference for lead scraping commands

## Bug Fixes and Improvements

- **[LEADS_SCRAPER_PROFILE_EXTRACTION_FIX.md](LEADS_SCRAPER_PROFILE_EXTRACTION_FIX.md)** - Fix for title, company, and location extraction
- **[LEADS_STATS_SQL_FIX.md](LEADS_STATS_SQL_FIX.md)** - SQL query fix for leads statistics
- **[LEADS_SCRAPER_SELECTOR_FIX.md](LEADS_SCRAPER_SELECTOR_FIX.md)** - Selector improvements for leads scraping
- **[LEADS_SCRAPER_FIX_SUMMARY.md](LEADS_SCRAPER_FIX_SUMMARY.md)** - Summary of leads scraper improvements
- **[LEADS_DISPLAY_FIX.md](LEADS_DISPLAY_FIX.md)** - Dashboard display improvements for leads
- **[PROFILE_PERFORMANCE_FIX.md](PROFILE_PERFORMANCE_FIX.md)** - Profile performance tracking fixes

## Dashboard and UI

- **[DASHBOARD_VISUAL_GUIDE.md](DASHBOARD_VISUAL_GUIDE.md)** - Visual reference for icons and components

## Archived Documentation

Historical documentation and implementation notes have been moved to the `archive/` subdirectory. These include:

- Implementation summaries for completed features
- Debug and fix reports from development
- Historical status documents
- Deprecated guides

To view archived documentation, browse the `docs/archive/` directory.

## Documentation Standards

When adding new documentation:

1. Use clear, factual language without marketing phrases
2. Include practical examples and code snippets
3. Keep guides focused on a single topic
4. Update this index when adding new documents
5. Move completed implementation docs to archive/

## Quick Reference

- [Main README](../README.md) - Project overview and usage
- [Dashboard Source Code](../src/dashboard/) - Dashboard implementation
- [Package Configuration](../package.json) - Dependencies and scripts
- [CLI Commands](../src/cli.ts) - Command-line interface
- [AI Profiles](../src/ai/profiles.ts) - Search profiles and scoring weights
