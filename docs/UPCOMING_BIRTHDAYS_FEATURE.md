# Upcoming Birthdays Feature

## Overview

Added a new dashboard widget that displays leads with upcoming birthdays, making it easy to identify networking opportunities and maintain professional relationships.

## Implementation Details

### Backend Changes

1. **Database Function** (`src/lib/db.ts`)
   - Added `LeadWithBirthday` interface extending `Lead` with `daysUntilBirthday` field
   - Created `getLeadsWithUpcomingBirthdays(daysAhead)` function
   - Supports multiple birthday formats:
     - Full month names: "January 1"
     - Abbreviated months: "Jan 1"
     - Numeric format: "01-01" or "1-1"
     - Handles ordinal suffixes: "January 1st"
   - Returns up to 10 leads sorted by days until birthday
   - Configurable lookback period (default: 30 days)

2. **API Endpoint** (`src/dashboard/routes/leads.ts`)
   - Added `GET /api/leads/birthdays` endpoint
   - Query parameter: `days` (default: 30)
   - Returns array of leads with upcoming birthdays

### Frontend Changes

1. **Custom Hook** (`src/dashboard/client/hooks/useUpcomingBirthdays.ts`)
   - React Query hook for fetching upcoming birthdays
   - Auto-refreshes every 60 seconds
   - Exports `LeadWithBirthday` interface for type safety

2. **Component** (`src/dashboard/client/components/UpcomingBirthdays.tsx`)
   - Displays leads with upcoming birthdays in a card layout
   - Color-coded by urgency:
     - Pink: Birthday today
     - Purple: Birthday within 7 days
     - Blue: Birthday within 8-30 days
   - Shows:
     - Lead name, title, company
     - Days until birthday ("Today!", "Tomorrow", "in X days")
     - Email indicator if available
     - Quick actions: View LinkedIn profile, Send birthday email
   - Responsive design with proper loading and empty states

3. **Dashboard Integration** (`src/dashboard/client/components/Dashboard.tsx`)
   - Added UpcomingBirthdays component below key metrics
   - Appears at the top of the dashboard for high visibility

## Usage

### For Users

1. Navigate to the Dashboard (home page)
2. The "Upcoming Birthdays" section appears below the main metrics
3. Click "View Profile" to open the lead's LinkedIn page
4. Click "Send Email" to compose a birthday message (requires email on file)
5. Widget automatically refreshes every minute

### For Developers

Query the API directly:

```bash
GET https://localhost:3001/api/leads/birthdays?days=30
```

Response:
```json
[
  {
    "id": "abc123",
    "name": "John Doe",
    "title": "CTO",
    "company": "Acme Corp",
    "email": "john@acme.com",
    "profile_url": "https://linkedin.com/in/johndoe",
    "birthday": "January 15",
    "daysUntilBirthday": 5
  }
]
```

## Birthday Data Format

The system accepts and parses multiple birthday formats stored in the database:

- `"January 1"` - Full month name with day
- `"Jan 1"` - Abbreviated month name with day
- `"01-01"` - Numeric MM-DD format
- `"1-1"` - Numeric M-D format (no leading zeros)

Ordinal suffixes (1st, 2nd, 3rd) are automatically stripped during parsing.

## Database Requirements

The `leads` table must have a `birthday` column (nullable string). No migration is required as the column already exists.

## Future Enhancements

Possible improvements:
- Bulk email generation for multiple birthdays
- Reminder notifications for birthdays
- Birthday message templates
- Integration with email automation
- Historical birthday outreach tracking
- Age calculation if birth year is available
- Customizable lookback period in UI
- Filter by email availability or relationship status

## Testing

To test with sample data, add birthdays to existing leads:

```sql
UPDATE leads 
SET birthday = 'January 15' 
WHERE id = 'your-lead-id';
```

The widget will automatically pick up leads with birthdays in the next 30 days.

