# Keyword Highlighting Three-Tier System Update

## Overview

Updated the keyword highlighting system from a two-tier (green/red) to a three-tier (green/yellow/red) color coding system to better categorize technologies based on their compatibility with the Microsoft ecosystem.

## Changes Made

### 1. Core Highlighting Logic (`src/dashboard/client/lib/highlightKeywords.ts`)

**New Color Categories:**

- **Green (Microsoft Ecosystem + Terraform)**: 45+ keywords
  - Core .NET technologies (C#, ASP.NET, Entity Framework, etc.)
  - Azure services (Functions, APIM, Service Bus, AKS, etc.)
  - Microsoft security and identity (OAuth, JWT, Azure AD, Entra ID)
  - Microsoft data stack (SQL Server, Serilog)
  - Microsoft DevOps (GitHub Actions, Azure Pipelines)
  - **Terraform** (added as exception per requirements)

- **Yellow (Acceptable Cloud)**: 10+ keywords
  - AWS core (AWS, Amazon Web Services)
  - AWS compute (EC2, Lambda, ECS, EKS)
  - AWS data (S3, RDS, DynamoDB)
  - AWS monitoring (CloudWatch)
  - AWS messaging (SNS, SQS)

- **Red (Prohibitive/Non-Microsoft)**: 30+ keywords
  - Non-Microsoft languages (Python, Java, Ruby, Go, PHP, Scala, Kotlin)
  - Non-Microsoft cloud (GCP, Google Cloud Platform)
  - Non-Microsoft frameworks (Django, Flask, Spring, Rails, Laravel)
  - Non-Microsoft databases (MongoDB, PostgreSQL, MySQL, Cassandra)
  - Non-Microsoft DevOps tools (Jenkins, CircleCI, Ansible)
  - Generic Kubernetes (not AKS)

**Removed Generic Keywords from Green:**
- Docker (not Microsoft-specific unless in Azure context)
- Generic CI/CD terms (kept Azure-specific ones)
- Generic architecture patterns (kept in context but not highlighted)
- Seniority terms (Senior, Lead, Principal) - removed from highlighting
- Remote work terms - removed from highlighting

**Priority System:**
1. Green keywords have highest priority (cannot be overridden)
2. Yellow keywords have medium priority (not overridden by red)
3. Red keywords have lowest priority
4. AI-identified must-haves are treated as green
5. AI-identified blockers are treated as red (unless already green/yellow)

### 2. UI Updates (`src/dashboard/client/components/JobDescriptionPanel.tsx`)

**Updated Legend:**
```
Keyword Highlighting:
- Green: Microsoft Ecosystem Match
- Yellow: Acceptable Cloud (AWS)
- Red: Non-Microsoft / Prohibitive
```

**Visual Styling:**
- Green: `bg-green-200 text-green-900`
- Yellow: `bg-yellow-200 text-yellow-900` (new)
- Red: `bg-red-200 text-red-900`

### 3. Documentation Updates

Updated all highlighting documentation files:
- `docs/KEYWORD_HIGHLIGHTING.md`
- `docs/HIGHLIGHTING_HYBRID_APPROACH.md`
- `docs/HIGHLIGHTING_IMPLEMENTATION_SUMMARY.md`

## Rationale

### Why Terraform is Green
Infrastructure as code tool that works well with Azure and Microsoft ecosystem. Commonly used in Azure deployments alongside ARM templates and Bicep.

### Why AWS is Yellow
While not Microsoft-native, AWS is an acceptable alternative cloud platform. Jobs mentioning AWS may still be suitable if they don't exclusively require AWS or if hybrid cloud skills are needed.

### Why Generic Tools Were Removed
Tools like Docker, generic Kubernetes, and CI/CD terms are not Microsoft-specific. They should only be highlighted when in a Microsoft context (e.g., "Azure Kubernetes Service" or "Azure Pipelines").

## Impact

### Before
- Non-Microsoft technologies like AWS were marked red (prohibitive)
- Generic tools like Docker were marked green (misleading)
- Only two categories made it hard to distinguish acceptable alternatives from true blockers

### After
- Clear three-tier system: preferred (green), acceptable (yellow), prohibitive (red)
- More accurate categorization of job opportunities
- AWS jobs are flagged as potentially acceptable rather than automatically prohibited
- Only truly Microsoft-specific technologies are marked green

## Testing

No breaking changes to the API or data structures. The highlighting function signature remains the same:

```typescript
export function highlightKeywords(
  text: string, 
  options: HighlightOptions
): string
```

Existing unit tests remain valid. The function now returns three color categories instead of two.

## Usage

No changes required for existing code. The highlighting automatically uses the new three-tier system when rendering job descriptions in the dashboard.

To view highlighted descriptions:
1. Navigate to the Jobs page
2. Expand any job to see details
3. Click "View Full Description"
4. Keywords will be highlighted with the new three-tier color system

## Future Enhancements

Consider adding:
- User-configurable keyword lists per profile
- More cloud providers in yellow tier (e.g., Oracle Cloud, IBM Cloud)
- Context-aware highlighting (e.g., "primarily AWS" vs "experience with AWS")
- Hover tooltips showing why a keyword is categorized as it is

