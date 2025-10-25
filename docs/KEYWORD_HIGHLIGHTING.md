# Job Description Keyword Highlighting

## Overview

The job description panel highlights keywords using a three-tier color system:
- **Green highlighting**: Microsoft ecosystem + Terraform (C#, .NET, Azure, etc.)
- **Yellow highlighting**: Acceptable cloud providers (AWS, AWS services)
- **Red highlighting**: Prohibitive/non-Microsoft requirements (Python, Java, GCP, etc.)

## Implementation Approach

Uses a **hybrid strategy** for comprehensive coverage:

1. **Static keyword lists**: Three categories of keywords
   - Microsoft ecosystem + Terraform (green)
   - AWS and acceptable cloud providers (yellow)
   - Prohibitive non-Microsoft technologies (red)
2. **AI-identified keywords**: Must-haves and blockers from job ranking
3. **Pattern detection**: Identifies prohibitive requirements like "5+ years Java" or "Python required"

This approach provides immediate, consistent highlighting without requiring AI calls.

## Files Modified

1. **src/dashboard/client/lib/highlightKeywords.ts** (new)
   - Core highlighting utility function
   - Contains comprehensive static keyword lists:
     - 45+ Microsoft ecosystem keywords + Terraform (green)
     - 10+ AWS and acceptable cloud keywords (yellow)
     - 30+ prohibitive non-Microsoft technologies (red)
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

**Green highlights** (Microsoft Ecosystem + Terraform):
- .NET technologies: C#, VB.NET, ASP.NET, MVC, Entity Framework, etc.
- Azure services: Azure Functions, APIM, Service Bus, Event Grid, AKS, etc.
- Security: OAuth, JWT, Azure AD, Entra ID
- Microsoft data stack: SQL Server, Serilog
- Microsoft DevOps: GitHub Actions, Azure Pipelines, Azure DevOps
- Infrastructure as Code: Terraform (exception per requirements)

**Yellow highlights** (Acceptable Cloud):
- AWS: AWS, Amazon Web Services, EC2, S3, Lambda, CloudFormation
- AWS services: ECS, EKS, RDS, DynamoDB, CloudWatch, SNS, SQS

**Red highlights** (Prohibitive/Non-Microsoft):
- Languages: Python, Java, Ruby, Go, PHP, Scala, Kotlin
- Cloud: GCP, Google Cloud Platform
- Frameworks: Django, Flask, Spring, Rails, Laravel
- Databases: MongoDB, PostgreSQL, MySQL, Cassandra
- DevOps tools: Jenkins, CircleCI, Ansible
- Generic Kubernetes (not AKS)

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
   - Yellow: Acceptable Cloud (AWS)
   - Red: Non-Microsoft / Prohibitive

2. **Inline Highlighting**: Keywords are marked directly in the job description text
   - Green background with dark green text for Microsoft ecosystem
   - Yellow background with dark yellow text for acceptable cloud
   - Red background with dark red text for prohibitive technologies

3. **Smart Matching**:
   - Case-insensitive
   - Word boundary aware
   - Handles special characters (.NET, C#, etc.)
   - Priority order: Green > Yellow > Red (higher priority cannot be overridden)

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

