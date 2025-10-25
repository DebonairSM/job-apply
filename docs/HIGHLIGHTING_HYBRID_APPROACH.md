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
Three tiers of keyword highlighting for precise categorization:

**Green (Microsoft Ecosystem + Terraform):**
- .NET: C#, VB.NET, ASP.NET, MVC, Entity Framework, LINQ
- Azure: Functions, APIM, Service Bus, Event Grid, Key Vault, AKS
- Security: OAuth, JWT, Azure AD, Entra ID
- Microsoft DevOps: Azure DevOps, Azure Pipelines, GitHub Actions
- Microsoft Data: SQL Server, Serilog
- Infrastructure as Code: Terraform (exception per requirements)

**Yellow (Acceptable Cloud):**
- AWS: AWS, Amazon Web Services, EC2, S3, Lambda, CloudFormation
- AWS Services: ECS, EKS, RDS, DynamoDB, CloudWatch, SNS, SQS

**Red (Prohibitive/Non-Microsoft):**
- Languages: Python, Java, Ruby, Go, PHP, Scala, Kotlin
- Cloud: GCP, Google Cloud Platform
- Frameworks: Django, Flask, Spring, Rails, Laravel
- Databases: MongoDB, PostgreSQL, MySQL, Cassandra
- DevOps Tools: Jenkins, CircleCI, Ansible
- Generic Kubernetes (not AKS)

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

1. Green keywords (Microsoft ecosystem + Terraform) have highest priority
2. Yellow keywords (AWS) have medium priority
3. Red keywords (prohibitive) have lowest priority
4. Higher priority colors cannot be overridden by lower priority ones
5. Pattern matches are always red (they indicate strong requirements)

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
  'New Microsoft Technology',
  // ...
];

// Add to ACCEPTABLE_CLOUD_KEYWORDS for yellow highlighting
const ACCEPTABLE_CLOUD_KEYWORDS = [
  'AWS Service',
  // ...
];

// Add to PROHIBITIVE_KEYWORDS for red highlighting
const PROHIBITIVE_KEYWORDS = [
  'Prohibitive Technology',
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
Knowledge of .NET Core and Terraform preferred.
```

**Highlighted:**
- `C#` → GREEN (Microsoft tech)
- `Azure` → GREEN (Microsoft cloud)
- `5+ years Python experience` → RED (pattern match)
- `AWS` → YELLOW (acceptable cloud)
- `.NET Core` → GREEN (Microsoft tech)
- `Terraform` → GREEN (infrastructure as code exception)

