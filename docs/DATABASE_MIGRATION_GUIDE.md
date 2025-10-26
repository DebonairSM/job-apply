# Database Migration Guide

## Overview

Version 2.0 moves user configuration from environment variables to a structured SQLite database. This provides:

- **Fast queries** - Skills lookups are <1ms instead of 2-3s AI calls
- **Better organization** - Structured data with proper relationships
- **Easy management** - Edit profile/skills via dashboard instead of text files
- **AI efficiency** - 70-80% reduction in AI API calls for common data

## What Changed

### Before (v1.x)
- User data in `.env` file (name, email, phone, etc.)
- Resume parsing on every application
- All answers generated with AI
- No structured skills database

### After (v2.0)
- User data in database (`user_profile` table)
- Resume data extracted once to database
- Common answers pre-defined in database
- Skills inventory for instant lookups
- Only "why_fit" generated with AI

## Migration Steps

### Option 1: Automatic Migration (Recommended)

If you have an existing `.env` file and resumes, run the automatic migration:

```bash
npm run cli -- migrate
```

This will:
1. Extract user profile from `.env`
2. Parse all resume files in `resumes/` folder
3. Extract skills, experience, and education
4. Save everything to database
5. Create `.env.new` with simplified config
6. Backup original `.env` to `.env.backup`

After migration:
```bash
# Review the new simplified .env
cat .env.new

# If satisfied, replace the old one
mv .env .env.backup
mv .env.new .env

# Start the dashboard to review/edit data
npm run dev:dashboard
```

### Option 2: Interactive Setup (New Users)

For new installations:

```bash
npm run cli -- setup
```

This wizard will:
1. Prompt for your information
2. Save profile to database
3. Set application preferences
4. Guide you through next steps

## Database Tables

### user_profile
Core information (single row):
- Full name, email, phone, city
- LinkedIn profile
- Work authorization
- Profile summary

### user_skills
Skills inventory:
- Skill name and category
- Years of experience
- Source (manual or resume)
- Proficiency level

### user_experience
Work history:
- Company, title, duration
- Description and achievements
- Technologies used
- Linked to source resume

### user_education
Education history:
- Institution, degree, field
- Graduation year
- Linked to source resume

### resume_files
Resume metadata:
- Filename and variant type
- Parse timestamp
- Sections extracted count
- Active status

### common_answers
Pre-defined answers:
- Salary expectation
- Remote preference
- Start date availability
- Custom questions

### application_preferences
Key-value settings:
- MIN_FIT_SCORE
- YEARS_DOTNET
- YEARS_AZURE
- Custom preferences

## Simplified .env

After migration, your `.env` only contains technical settings:

```env
# AI/LLM Configuration
OLLAMA_BASE_URL=http://localhost:11434
LLM_MODEL=llama3.1:8b
LLM_TEMPERATURE=0.1

# Browser Automation
HEADLESS=false
SLOW_MO=80
RANDOM_DELAY_MIN=600
RANDOM_DELAY_MAX=1200

# Debugging
ENABLE_TRACING=false
```

All personal data is now in the database.

## Dashboard Management

### Profile Settings
Navigate to dashboard Settings page to:
- Edit personal information
- Update contact details
- Modify work authorization
- Change profile summary

### Skills Management
Add, edit, or remove skills:
- Manually add skills with years of experience
- Categorize skills (Azure/Cloud, .NET, Security, etc.)
- Skills from resumes marked as "resume" source
- Skills for fast job matching queries

### Common Answers
Pre-define answers for common questions:
- Salary expectations
- Remote/hybrid preferences
- Start date availability
- Custom question templates

### Preferences
Adjust application settings:
- MIN_FIT_SCORE threshold
- Years of experience fields
- Job search preferences

### Resume Management
- View parsed resume files
- Re-parse resumes to update database
- Toggle active/inactive resumes
- See extraction statistics

## API Endpoints

New dashboard API routes:

```
GET    /api/profile          - Get user profile
POST   /api/profile          - Update user profile

GET    /api/skills           - List all skills
POST   /api/skills           - Add/update skill
DELETE /api/skills/:id       - Delete skill

GET    /api/common-answers   - List common answers
POST   /api/common-answers   - Add/update answer
DELETE /api/common-answers/:key - Delete answer

GET    /api/preferences      - List preferences
POST   /api/preferences      - Add/update preference
DELETE /api/preferences/:key - Delete preference

GET    /api/resumes          - List resume files
POST   /api/resumes/parse/:fileName - Parse resume
PUT    /api/resumes/:fileName - Update resume metadata
DELETE /api/resumes/:id       - Delete resume
```

## Performance Improvements

### Before (v1.x)
- Every application: Parse resume (~2s), generate all answers (~5s)
- Total: ~7s per application
- Heavy AI usage for basic data

### After (v2.0)
- Database queries: <1ms for profile, skills, common answers
- AI only for "why_fit": ~2s
- Total: ~2s per application
- **71% reduction in processing time**
- **80% reduction in AI calls**

## Troubleshooting

### Migration fails to parse resumes
- Ensure resume files are in `resumes/` folder
- Only `.docx` files supported for auto-extraction
- `.pdf` files saved but not auto-parsed
- Manual entry via dashboard is alternative

### Profile not loading
- Check database file exists: `data/app.db`
- Run migration: `npm run cli -- migrate`
- Or setup wizard: `npm run cli -- setup`
- Fallback to `.env` if database empty

### Dashboard shows empty data
- Run migration script first
- Or use setup wizard
- Or manually add data via API/dashboard
- Check browser console for errors

### Common answers not working
- Add default answers via dashboard
- Or run migration (adds defaults)
- Check `/api/common-answers` endpoint
- Verify database table exists

## Backward Compatibility

The system maintains backward compatibility:

1. **Config loading** - Falls back to `.env` if database empty
2. **Resume handling** - Still reads from `resumes/` folder
3. **Existing jobs** - No changes to jobs table
4. **Cache system** - Still caches generated answers

You can gradually migrate without breaking existing functionality.

## Rollback

If needed, rollback to v1.x:

1. Restore original `.env`:
   ```bash
   mv .env.backup .env
   ```

2. Checkout previous version:
   ```bash
   git checkout <previous-commit>
   ```

3. Database changes are additive - old code ignores new tables

## Next Steps

After migration:

1. **Review data** - Check dashboard Settings page
2. **Add/edit skills** - Improve auto-extracted skills
3. **Customize answers** - Set your common answer preferences
4. **Test application** - Run a job search to verify
5. **Monitor performance** - Watch for faster processing times

## Support

Issues or questions:
- Check `/api/health` endpoint
- Review browser console logs
- Check database: `sqlite3 data/app.db ".tables"`
- Open GitHub issue with details

