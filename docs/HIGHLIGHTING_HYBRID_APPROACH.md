# Hybrid Keyword Highlighting Approach

## Problem

The initial implementation relied solely on AI-generated `must_haves` and `blockers` fields, which resulted in:
- Very few keywords being highlighted
- Missing obvious technology mentions (Python, AWS, etc.)
- Inconsistent coverage across job descriptions
- Dependence on AI quality/completeness

## Solution: Hybrid Approach

Combines three strategies for comprehensive coverage:

### 1. Static Keyword Lists (Primary)
65+ Microsoft ecosystem keywords and 40+ non-Microsoft technologies are highlighted by default.

**Green (Microsoft Ecosystem):**
- .NET: C#, VB.NET, ASP.NET, MVC, Entity Framework, LINQ
- Azure: Functions, APIM, Service Bus, Event Grid, Key Vault
- Security: OAuth, JWT, Azure AD, Entra ID
- DevOps: Azure DevOps, GitHub Actions, CI/CD
- Data: SQL Server, Redis, KQL
- Patterns: Microservices, Event-Driven, CQRS
- Role: Senior, Lead, Principal, Remote

**Red (Non-Microsoft):**
- Languages: Python, Java, Ruby, Go, PHP, Scala, Kotlin
- Cloud: AWS, GCP, Lambda, EC2, S3
- Frameworks: Django, Flask, Spring, Rails, Laravel
- Databases: MongoDB, PostgreSQL, MySQL, Cassandra
- Tools: Jenkins, Terraform, Ansible

### 2. Pattern Detection (Context-Aware)
Regex patterns detect prohibitive requirements in context:

```
"5+ years of Python experience"  → RED
"Python required"                → RED  
"Expert in AWS"                  → RED
"Primarily Java"                 → RED
"Heavy AWS usage"                → RED
```

### 3. AI-Generated Keywords (Supplementary)
AI-identified `must_haves` and `blockers` add context-specific keywords that static lists might miss.

## Priority Rules

1. Green keywords (Microsoft ecosystem) take precedence
2. If a keyword appears in both lists, it stays green
3. Pattern matches are always red (they indicate strong requirements)

## Benefits

- **Immediate highlighting**: No waiting for AI analysis
- **Consistent results**: Same keywords highlighted across all jobs
- **Comprehensive coverage**: Static lists catch what AI might miss
- **Context-aware**: Pattern detection identifies intensive usage
- **Maintainable**: Easy to add/remove keywords as needed

## Performance

- Client-side processing (no API calls)
- Memoized (only recalculates when description changes)
- Handles large job descriptions efficiently

## Maintenance

To add new keywords, edit `src/dashboard/client/lib/highlightKeywords.ts`:

```typescript
// Add to MICROSOFT_KEYWORDS for green highlighting
const MICROSOFT_KEYWORDS = [
  'New Technology',
  // ...
];

// Add to PROHIBITIVE_KEYWORDS for red highlighting
const PROHIBITIVE_KEYWORDS = [
  'Unwanted Technology',
  // ...
];

// Add patterns for context detection
const PROHIBITIVE_PATTERNS = [
  /pattern to match/gi,
  // ...
];
```

## Example Output

**Job Description:**
```
Senior Software Engineer

We're looking for a C# developer with Azure experience.
Must have 5+ years Python experience and strong AWS skills.
Knowledge of .NET Core and Docker preferred.
```

**Highlighted:**
- `Senior` → GREEN (seniority match)
- `C#` → GREEN (Microsoft tech)
- `Azure` → GREEN (Microsoft cloud)
- `5+ years Python experience` → RED (pattern match)
- `AWS` → RED (non-Microsoft cloud)
- `.NET Core` → GREEN (Microsoft tech)
- `Docker` → GREEN (DevOps tool)

