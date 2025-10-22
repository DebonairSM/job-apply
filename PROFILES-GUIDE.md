# Job Search Profiles - Quick Reference

## What Are Profiles?

Profiles are predefined Boolean search strings optimized for specific types of Azure API Engineer roles. Each uses sophisticated AND/OR logic to find jobs matching your technical requirements.

## Available Profiles

### 1. Core Azure API (`--profile core`)
**Best for:** High-volume remote roles in Azure API development

**Targets:**
- Senior API Engineer, Senior Backend Developer, Azure API Engineer
- Azure + API Management (APIM)
- Azure Functions or App Services
- C# / .NET Core / .NET 6 / .NET 8
- REST, OpenAPI, Swagger
- Service Bus, Event Grid
- Remote positions

**Use when:** You want the broadest search for Azure API roles

```bash
npx tsx src/cli.ts search --profile core
```

### 2. Security & Governance (`--profile security`)
**Best for:** Enterprise-level positions where security and compliance matter

**Targets:**
- Senior API Engineer, Azure Backend Engineer
- Azure + API Management
- OAuth 2.0, JWT, Entra ID, Azure AD
- APIM Policies, API Governance
- Service Bus, Functions, App Services
- C# / .NET Core / .NET 8
- Remote positions

**Use when:** Security, authentication, and governance are priorities

```bash
npx tsx src/cli.ts search --profile security
```

### 3. Event-Driven Architecture (`--profile event-driven`)
**Best for:** Integration platforms and event-driven architecture jobs

**Targets:**
- Senior API Engineer, Integration Engineer, Azure Integration Developer
- Azure + Service Bus or Event Grid
- Event-Driven architecture patterns
- Azure Functions or App Services
- APIM or API Management
- C# / .NET 6 / .NET 8
- REST, OpenAPI, Swagger
- Remote positions

**Use when:** You want messaging/integration-focused roles

```bash
npx tsx src/cli.ts search --profile event-driven
```

### 4. Performance & Reliability (`--profile performance`)
**Best for:** Companies focused on API performance, observability, and scaling

**Targets:**
- Senior API Engineer, Senior Backend Developer
- Azure + API Management (APIM)
- Performance/load testing (Azure Load Testing, Locust)
- Redis, EF Core, SQL Server
- Observability (App Insights, Serilog, Splunk, KQL)
- C# / .NET Core
- Remote positions

**Use when:** Performance engineering and observability matter

```bash
npx tsx src/cli.ts search --profile performance
```

### 5. DevOps/CI-CD (`--profile devops`)
**Best for:** Teams expecting senior engineers comfortable with DevOps and delivery pipelines

**Targets:**
- Senior API Engineer, Senior Backend Engineer, Azure DevOps Engineer
- Azure + API Management (APIM)
- Azure DevOps, GitHub Actions
- Docker, Bicep, ARM templates
- Azure Functions or App Services
- C# / .NET Core / .NET 8
- REST, OpenAPI, Swagger
- Remote positions

**Use when:** You want roles with significant DevOps responsibilities

```bash
npx tsx src/cli.ts search --profile devops
```

### 6. Senior Backend .NET (`--profile backend`)
**Best for:** Catching senior .NET/Azure roles that don't explicitly use "API Engineer" in title

**Targets:**
- Senior Backend Engineer, Senior API Engineer, Azure Developer, .NET Core Developer
- Azure or Microsoft Azure
- C# / .NET Core / .NET 6 / .NET 8
- REST, API, APIM, API Management
- Azure Functions or App Services
- Redis, SQL, EF Core
- Remote positions

**Use when:** You want a broader net to catch all senior .NET/Azure roles

```bash
npx tsx src/cli.ts search --profile backend
```

## Combining Profiles with Filters

You can combine profiles with other search options:

```bash
# Core profile, posted in last week only
npx tsx src/cli.ts search --profile core --date week

# Security profile, minimum score 80
npx tsx src/cli.ts search --profile security --min-score 80

# DevOps profile, posted today
npx tsx src/cli.ts search --profile devops --date day

# Backend profile, specific location
npx tsx src/cli.ts search --profile backend --location "United States"
```

## Understanding the Output

When using profiles, you'll see enhanced output with category scores:

```
   1/25 Senior Azure API Engineer at Microsoft
        Score: 92/100
        Azure: 95 | Security: 90 | Events: 85
        Perf: 80 | DevOps: 75 | Senior: 100
        ✅ Queued (Easy Apply)
```

**Category Scores Explained:**
- **Azure**: Core Azure API Skills (30% of total)
- **Security**: Security & Governance (20% of total)
- **Events**: Event-Driven Architecture (15% of total)
- **Perf**: Performance & Reliability (15% of total)
- **DevOps**: DevOps & CI/CD (10% of total)
- **Senior**: Seniority & Role Type (10% of total)

## Strategy Recommendations

### Daily Job Hunt Strategy
Use different profiles on different days to maximize coverage:

**Monday**: Core profile (broadest)
```bash
npx tsx src/cli.ts search --profile core --date day
```

**Tuesday**: Security profile
```bash
npx tsx src/cli.ts search --profile security --date day
```

**Wednesday**: Event-Driven profile
```bash
npx tsx src/cli.ts search --profile event-driven --date day
```

**Thursday**: Performance profile
```bash
npx tsx src/cli.ts search --profile performance --date day
```

**Friday**: DevOps profile
```bash
npx tsx src/cli.ts search --profile devops --date day
```

### Weekly Deep Dive
Run all profiles once a week:

```bash
# Get everything from the last week
npx tsx src/cli.ts search --profile core --date week
npx tsx src/cli.ts search --profile security --date week
npx tsx src/cli.ts search --profile event-driven --date week
npx tsx src/cli.ts search --profile performance --date week
npx tsx src/cli.ts search --profile devops --date week
npx tsx src/cli.ts search --profile backend --date week
```

### Quality Over Quantity
If you're getting too many results, increase the minimum score:

```bash
# Only queue exceptional matches
npx tsx src/cli.ts search --profile core --min-score 85
```

### Debugging Low Results
If a profile returns no results:

1. **Check LinkedIn directly** with the Boolean string from `src/ai/profiles.ts`
2. **Try the backend profile** (broadest search)
3. **Lower min-score threshold** temporarily
4. **Check your LinkedIn session** - may need to re-login

## Traditional Keyword Search

You can still use traditional keyword searches:

```bash
# Custom search (no profile)
npx tsx src/cli.ts search "Senior Azure Engineer" --remote --date week
```

This gives you flexibility for one-off searches that don't fit a profile.

## Viewing Results

After searching, view your queue:

```bash
# See all queued jobs with category breakdowns
npx tsx src/cli.ts list queued

# See applied jobs
npx tsx src/cli.ts list applied

# See overall statistics
npx tsx src/cli.ts status
```

## Tips

1. **Start with core profile** - it casts the widest net
2. **Use date filters** - avoid re-processing old jobs
3. **Adjust min-score** based on results (default is 70)
4. **Review category scores** to understand what each job emphasizes
5. **Look for blockers** - red flags the AI identified
6. **Check missing keywords** - technologies the job doesn't mention

## Troubleshooting

**Problem:** All jobs still scoring around 85
**Solution:** The LLM might need more specific examples. Check that Ollama is running and using the correct model.

**Problem:** No jobs found
**Solution:** Boolean search might be too restrictive. Try `--profile backend` for broader results.

**Problem:** Too many low-quality results
**Solution:** Increase `--min-score` to 80 or 85.

**Problem:** Session expired errors
**Solution:** Run `npx tsx src/commands/login.ts` to refresh your LinkedIn session.

