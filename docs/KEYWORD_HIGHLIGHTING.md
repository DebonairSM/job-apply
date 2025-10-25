# Job Description Keyword Highlighting

## Overview

The job description panel now highlights keywords to help quickly identify matches and potential issues:
- **Green highlighting**: Microsoft ecosystem technologies (C#, .NET, Azure, etc.)
- **Red highlighting**: Non-Microsoft technologies and prohibitive requirements (AWS, Python, Java, etc.)

## Implementation Approach

Uses a **hybrid strategy** for comprehensive coverage:

1. **Static keyword lists**: All Microsoft ecosystem keywords from PROFILES
2. **AI-identified keywords**: Must-haves and blockers from job ranking
3. **Pattern detection**: Identifies prohibitive requirements like "5+ years AWS" or "Python required"

This approach provides immediate, consistent highlighting without requiring AI calls.

## Files Modified

1. **src/dashboard/client/lib/highlightKeywords.ts** (new)
   - Core highlighting utility function
   - Contains comprehensive static keyword lists:
     - 65+ Microsoft ecosystem keywords (green)
     - 40+ non-Microsoft technologies (red)
   - Pattern detection for prohibitive requirements
   - Handles special characters, case-insensitive matching
   - Escapes HTML for security

2. **src/dashboard/client/components/JobDescriptionPanel.tsx**
   - Updated to accept full job object (optional)
   - Parses `must_haves` and `blockers` from job data
   - Always applies highlighting (static + AI keywords)
   - Renders highlighted description with legend

3. **src/dashboard/client/components/JobDetailsPanel.tsx**
   - Updated to pass full job object to JobDescriptionPanel
   - Enables keyword highlighting in description view

## Data Sources

### Static Keywords (Primary Source)

**Green highlights** (Microsoft Ecosystem):
- .NET technologies: C#, VB.NET, ASP.NET, MVC, Entity Framework, etc.
- Azure services: Azure Functions, APIM, Service Bus, Event Grid, etc.
- Security: OAuth, JWT, Azure AD, Entra ID
- DevOps: Azure DevOps, GitHub Actions, CI/CD
- Seniority: Senior, Lead, Principal, Remote

**Red highlights** (Non-Microsoft):
- Languages: Python, Java, Ruby, Go, PHP
- Cloud: AWS, GCP, Lambda, EC2
- Frameworks: Django, Flask, Spring, Rails
- Databases: MongoDB, PostgreSQL, MySQL

### Pattern Detection

Detects prohibitive usage patterns:
- "5+ years of Python experience"
- "AWS required"
- "Expert in Java"
- "Primarily Python"
- "Heavy AWS usage"

### AI-Generated Data (Supplementary)

Adds context-aware keywords from job ranking:
- `must_haves` (JSON string): AI-identified matching skills
- `blockers` (JSON string): AI-identified prohibitive requirements

### UI Features

1. **Color Legend**: Always visible at the top of the description
   - Green: Microsoft Ecosystem Match
   - Red: Non-Microsoft / Prohibitive

2. **Inline Highlighting**: Keywords are marked directly in the job description text
   - Green background with dark green text for must-haves
   - Red background with dark red text for blockers

3. **Smart Matching**:
   - Case-insensitive
   - Word boundary aware
   - Handles special characters (.NET, C#, etc.)
   - Must-haves take precedence over blockers for same keyword

## Usage

The highlighting is automatic when viewing job descriptions:
1. Click "View Full Description" in the job details panel
2. If the job has must-haves or blockers, they will be highlighted
3. Use the legend to understand what each color means

## Technical Details

- Uses `dangerouslySetInnerHTML` with HTML escaping for security
- Memoized for performance (only recalculates on data change)
- Gracefully handles missing or malformed data
- Backward compatible (works without job object)

## Testing

Unit tests are available in:
- `src/dashboard/client/lib/__tests__/highlightKeywords.test.ts`

Tests cover:
- Empty text and keywords
- Case-insensitive matching
- Special character handling
- HTML escaping
- Priority of must-haves over blockers
- Multiple occurrences of same keyword

