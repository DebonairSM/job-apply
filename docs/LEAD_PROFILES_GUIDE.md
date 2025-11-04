# Lead Profiles Guide

## Overview

Lead profiles simplify LinkedIn connection scraping by grouping related job titles together. Instead of manually specifying titles each time, you can use predefined profiles that target specific types of professionals in your network.

## Available Profiles

### chiefs - C-Suite & Leadership
Target top-level executives and senior leadership.

**Titles included:**
- CTO, Chief Technology Officer
- CIO, Chief Information Officer
- CEO, Chief Executive Officer
- COO, Chief Operating Officer
- CFO, Chief Financial Officer
- General Manager
- VP, Vice President
- SVP, Senior Vice President
- EVP, Executive Vice President

**Use case:** Building relationships with decision-makers and executive-level contacts for strategic partnerships, consulting opportunities, or high-level job opportunities.

**Example:**
```bash
npm run leads:search -- --profile chiefs --max 100
```

### founders - Founders & Entrepreneurs
Target company founders and entrepreneurs.

**Titles included:**
- Founder
- Co-Founder, Cofounder
- Owner
- Entrepreneur
- President
- Managing Partner
- Partner

**Use case:** Connecting with startup founders, business owners, and entrepreneurial professionals for potential partnerships, consulting work, or early-stage opportunities.

**Example:**
```bash
npm run leads:search -- --profile founders --max 50
```

### directors - Directors & Senior Management
Target director-level and senior management positions.

**Titles included:**
- Director, Senior Director, Managing Director
- Head of Engineering, Technology, Product, Development
- Engineering Manager
- Technical Director
- Principal Engineer
- Distinguished Engineer
- Staff Engineer

**Use case:** Building your professional network with senior managers and directors who make hiring decisions or can provide referrals.

**Example:**
```bash
npm run leads:search -- --profile directors --max 75
```

### techLeads - Technical Leadership
Target technical leads and senior engineers.

**Titles included:**
- Tech Lead, Technical Lead
- Lead Engineer, Lead Developer
- Senior Engineer, Senior Developer
- Architect (Solution, Enterprise, Cloud)
- Principal Architect

**Use case:** Connecting with technical leaders for knowledge sharing, collaboration, or learning about opportunities on their teams.

**Example:**
```bash
npm run leads:search -- --profile techLeads --max 100
```

### productLeads - Product Leadership
Target product management and strategy roles.

**Titles included:**
- Product Manager (all levels)
- VP Product, Director of Product
- Head of Product
- Chief Product Officer (CPO)
- Product Owner, Product Director

**Use case:** Building relationships with product leaders for product-focused roles or cross-functional collaboration opportunities.

**Example:**
```bash
npm run leads:search -- --profile productLeads --max 50
```

### recruiters - Recruiters & Talent Acquisition
Target recruitment and talent acquisition professionals.

**Titles included:**
- Recruiter, Technical Recruiter, Senior Recruiter
- Talent Acquisition
- Head of Recruiting, Director of Recruiting
- Recruitment Manager
- Hiring Manager
- Sourcer, Talent Partner

**Use case:** Connecting with recruiters who can help with job opportunities or provide insights into hiring trends.

**Example:**
```bash
npm run leads:search -- --profile recruiters --max 100
```

### sales - Sales & Business Development
Target sales and business development roles.

**Titles included:**
- Sales, Account Executive
- Sales Engineer
- Business Development
- VP Sales, Director of Sales
- Head of Sales
- Chief Revenue Officer (CRO)
- Sales Director, Sales Manager

**Use case:** Building relationships with sales professionals for business development or understanding market trends.

**Example:**
```bash
npm run leads:search -- --profile sales --max 50
```

### consultants - Consultants & Advisors
Target consulting and advisory roles.

**Titles included:**
- Consultant (all levels)
- Advisory, Advisor
- Technical Consultant
- Solutions Consultant
- Strategy Consultant
- Independent Consultant
- Fractional CTO

**Use case:** Connecting with consultants and advisors for potential collaboration, knowledge sharing, or consulting opportunities.

**Example:**
```bash
npm run leads:search -- --profile consultants --max 50
```

## Usage

### Using Profiles
```bash
npm run leads:search -- --profile <profile-name>
```

Profile names: `chiefs`, `founders`, `directors`, `techLeads`, `productLeads`, `recruiters`, `sales`, `consultants`

### Limiting Results
```bash
npm run leads:search -- --profile chiefs --max 100
```

Default limit is 50 profiles. Adjust based on your needs.

### Custom Titles (Without Profiles)
If you need specific titles not covered by profiles:
```bash
npm run leads:search -- --titles "CTO,VP Engineering,Director of Technology"
```

Note: You cannot use both `--profile` and `--titles` together. Choose one approach.

### Resuming Previous Runs
If a scraping run is interrupted, resume from where it left off:
```bash
npm run leads:search -- --resume 123
```

Get the run ID from the dashboard or console output when starting a scrape.

## How It Works

1. **Profile Selection**: Choose a profile that matches your networking goals
2. **Title Matching**: The scraper searches for connections whose LinkedIn titles contain any of the profile's keywords
3. **Data Extraction**: For matching profiles, extracts:
   - Name
   - Job title
   - Company
   - Location
   - About section
   - Email (if available in contact info)
4. **Database Storage**: Saves leads to database for browsing in the dashboard

## Best Practices

### Start Small
Test with a small limit first to ensure the profile matches your expectations:
```bash
npm run leads:search -- --profile chiefs --max 10
```

### Review Results
Check the dashboard Leads tab to verify the quality of scraped data before running larger batches.

### Combine Profiles
Run multiple profiles in separate sessions to build a comprehensive network:
```bash
npm run leads:search -- --profile chiefs --max 50
npm run leads:search -- --profile founders --max 50
npm run leads:search -- --profile directors --max 50
```

### Respect Rate Limits
LinkedIn may rate-limit aggressive scraping. Use reasonable delays between runs and keep batch sizes modest (50-100 per session).

### Filter in Dashboard
After scraping, use dashboard filters to narrow down leads by:
- Title keywords
- Company
- Location
- Email availability

## Creating Custom Profiles

To add your own lead profile:

1. Edit `src/ai/lead-profiles.ts`
2. Add new profile to `LEAD_PROFILES` object
3. Update `src/cli.ts` choices array for the `--profile` option
4. Follow the existing profile structure:

```typescript
myProfile: {
  name: 'Profile Display Name',
  description: 'What this profile targets',
  titles: [
    'Title 1',
    'Title 2',
    'Title 3'
  ]
}
```

5. Restart the CLI and test:
```bash
npm run leads:search -- --profile myProfile --max 10
```

## Technical Details

### Profile Structure
Located in `src/ai/lead-profiles.ts`:
- `name`: Display name shown in console
- `description`: Explains the profile's purpose
- `titles`: Array of title keywords to match

### Matching Logic
- Case-insensitive substring matching
- Matches any title in the profile's list
- Example: "VP" matches "VP Engineering", "SVP Product", "EVP Technology"

### Data Sources
- Profile page headline for title and company
- Profile header for location
- About section for professional summary
- Contact info modal for email (if available)

## Troubleshooting

### Profile not found error
```
❌ Unknown profile: cheifs
   Available profiles: chiefs, founders, directors, ...
```
Check spelling. Available profiles: `chiefs`, `founders`, `directors`, `techLeads`, `productLeads`, `recruiters`, `sales`, `consultants`

### No leads found
- Verify your connections have titles that match the profile
- Try a different profile or use custom titles
- Check dashboard to see if leads were actually found but filtered out

### Title/Company/Location empty
This was fixed in the profile extraction update. If still seeing this:
- Make sure you're running the latest code
- Check `docs/LEADS_SCRAPER_PROFILE_EXTRACTION_FIX.md` for details

### Scraping stopped unexpectedly
Use `--resume` to continue from where it stopped:
```bash
npm run leads:search -- --resume <run-id>
```
Find the run ID in the console output or dashboard.

## Related Documentation

- [LEADS_SYSTEM_IMPLEMENTATION.md](LEADS_SYSTEM_IMPLEMENTATION.md) - Complete leads system overview
- [LEADS_SCRAPER_PROFILE_EXTRACTION_FIX.md](LEADS_SCRAPER_PROFILE_EXTRACTION_FIX.md) - Title/company/location extraction fix
- [README.md](../README.md) - Main project documentation

