# Technology Filter System

## Overview

The Technology Filter System (also called the Rejection Filter System) allows you to automatically filter out jobs that require technologies outside your preferred stack. This is separate from the keyword scoring system and acts as a pre-filter before jobs are ranked.

## System Components

### 1. Rejection Filter System (`src/ai/rejection-filters.ts`)

The system uses multiple filter types:
- **CompanyBlocklistFilter**: Blocks specific companies
- **KeywordAvoidanceFilter**: Filters jobs with certain keywords
- **SeniorityMinimumFilter**: Enforces minimum seniority levels
- **TechStackFilter**: Blocks jobs requiring specific technologies (this is what you need)

Filters are stored in the database (`rejection_patterns` table) and activated when their count >= 2.

### 2. How It Works

1. During job search, each job goes through `applyFilters()` before ranking
2. If any filter matches, the job is blocked with a reason
3. Blocked jobs are skipped and never ranked
4. Filter patterns are stored in database for persistence

### 3. Current Microsoft Stack Preference

Your profiles already favor Microsoft technologies through positive keyword scoring:
- **coreAzure**: Azure, APIM, Functions, App Services (20% weight)
- **coreNet**: C#, .NET Core, ASP.NET, MVC (20% weight)
- **security**: OAuth, JWT, Entra ID (15% weight)
- **eventDriven**: Service Bus, Event Grid (10% weight)
- **performance**: Redis, EF Core, SQL Server (10% weight)
- **frontendFrameworks**: Blazor, React (10% weight)

Acceptable non-Microsoft technologies already included:
- Node.js, TypeScript (frontend/tooling)
- React, Angular (frontend frameworks)
- Terraform (infrastructure)

## Usage

### Add Technology Filters

To block Go, Java, and other non-Microsoft stack jobs:

```bash
npm run filters:add
```

This adds filters for:
- Go/Golang
- Java (Spring Boot, Java-focused roles)
- Kotlin, Scala
- Python-focused roles
- Ruby on Rails
- PHP

### List Active Filters

To see what filters are currently active:

```bash
npm run filters:list
```

Example output:
```
TECH_STACK (8):
  ✓ ACTIVE - golang (count: 2, confidence: 1.00)
  ✓ ACTIVE - go lang (count: 2, confidence: 1.00)
  ✓ ACTIVE - java developer (count: 2, confidence: 1.00)
  ...
```

### Remove Filters

To remove all technology filters:

```bash
npm run filters:remove
```

## Customizing Filters

### Edit the Filter List

Modify `scripts/add-tech-filters.js` to customize which technologies to filter:

```javascript
const unwantedTech = [
  { value: 'golang', reason: 'Go language not in tech stack' },
  { value: 'java developer', reason: 'Java not in preferred tech stack' },
  // Add your own filters here
];
```

### Filter Matching Rules

Filters use simple string matching:
- Case-insensitive
- Matches anywhere in title or description
- Use spaces to avoid false matches (e.g., ' go ' instead of 'go')

### Adding One-Off Filters

You can manually add filters in code:

```javascript
import { addManualFilter } from './src/ai/rejection-filters.js';

addManualFilter('tech_stack', 'rust developer', 'Rust not in tech stack');
```

## How Filters Interact with Ranking

### Filter Priority (Execution Order)

1. **Tech Stack Filter** runs first (blocks unwanted technologies)
2. **Company Blocklist** runs second (blocks problematic companies)
3. **Keyword Avoidance** runs third (blocks rejection-prone keywords)
4. **Seniority Minimum** runs last (enforces seniority requirements)

If any filter matches, the job is blocked and never ranked.

### Keyword Scoring Still Works

For jobs that pass filters, the keyword scoring system still applies:
- Microsoft stack keywords increase scores
- Must-have keywords (C#, Azure, etc.) are required for high scores
- Preferred keywords (Service Bus, Redis) add bonus points

### Example Flow

```
Job: "Senior Go Developer with Azure experience"
  ↓
Tech Filter: Contains "Go" → BLOCKED
  ↓
Never ranked or shown in dashboard
```

```
Job: "Senior .NET Developer with Azure APIM experience"
  ↓
Tech Filter: No unwanted tech → PASS
  ↓
Keyword Scoring: High scores for C#, .NET, Azure, APIM
  ↓
Final Score: 85/100 → Queued for application
```

## Advanced: Learning from Rejections

The system also learns from actual rejections. If you're repeatedly rejected by companies using certain technologies, the system will automatically add filters.

### How It Works

1. When you mark a job as "rejected" in the dashboard
2. The system analyzes the rejection reason (if provided)
3. If it detects technology mismatch patterns
4. It adds those technologies to the filter list automatically

This happens through the Rejection Learning System (`src/ai/rejection-analyzer.ts`).

### Checking Learned Filters

Use `npm run filters:list` to see both manual and learned filters.

## Filter Impact

### Before Filters

```
Search Results: 50 jobs
  - 15 Go/Golang roles
  - 10 Java/Spring roles
  - 5 Python-focused roles
  - 20 Microsoft stack roles
```

### After Filters

```
Search Results: 20 jobs
  - 0 Go/Golang roles (filtered)
  - 0 Java/Spring roles (filtered)
  - 0 Python-focused roles (filtered)
  - 20 Microsoft stack roles (passed)
```

## Troubleshooting

### Filters Not Working

1. Check filter count: Must be >= 2 to activate
   ```bash
   npm run filters:list
   ```

2. Verify filters in database:
   ```sql
   SELECT * FROM rejection_patterns WHERE pattern_type = 'tech_stack';
   ```

3. Check filter logic in search command:
   ```typescript
   // In src/commands/search.ts
   const filterResult = applyFilters(job);
   if (filterResult.blocked) {
     console.log(`Filtered: ${filterResult.reason}`);
   }
   ```

### False Positives

If legitimate jobs are being filtered:

1. Review filter patterns: `npm run filters:list`
2. Remove overly broad filters
3. Use more specific patterns (e.g., "golang developer" instead of "go")

### Jobs Still Showing Up

1. Filters only apply to NEW searches
2. Existing queued jobs are not retroactively filtered
3. To clear old jobs: `npm run reset:queue`

## Best Practices

1. **Test filters first**: Run search and check results before committing
2. **Be specific**: Use "java developer" not "java" (avoids "javascript")
3. **Review periodically**: Use `npm run filters:list` monthly
4. **Don't over-filter**: Allow complementary technologies (Node.js, TypeScript)
5. **Monitor rejections**: Let the system learn from actual feedback

## Related Documentation

- [Ranking Customization Guide](./RANKING_CUSTOMIZATION_GUIDE.md) - Adjust keyword weights
- [Profile Creation Guide](./PROFILE_CREATION_GUIDE.md) - Create custom profiles
- [Rejection System Summary](./REJECTION_SYSTEM_SUMMARY.md) - How learning works

