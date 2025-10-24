<!-- b4d63fc5-6da5-49d8-962a-5f716cac93ff ee2a9346-6d33-48b8-a06e-8cb47bcfb686 -->
# Rejection Reason Learning System

## Overview

Build a learning system that analyzes rejection reasons to improve job selection. The system will use both keyword extraction and LLM analysis to adjust scoring weights and build filter patterns immediately after each rejection.

## Architecture

### 1. Database Schema Updates (`src/lib/db.ts`)

Add new tables to track rejection learning:

```sql
-- Rejection patterns table
CREATE TABLE rejection_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_type TEXT NOT NULL,  -- 'keyword', 'company', 'tech_stack', 'seniority'
  pattern_value TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
  weight_adjustment REAL DEFAULT 0,
  profile_category TEXT,  -- Which category to adjust
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Weight adjustments history
CREATE TABLE weight_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_category TEXT NOT NULL,
  old_weight REAL NOT NULL,
  new_weight REAL NOT NULL,
  reason TEXT NOT NULL,
  rejection_id TEXT,  -- Reference to job that triggered adjustment
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

Add database functions:

- `saveRejectionPattern()` - Store identified patterns
- `getWeightAdjustments()` - Retrieve current adjustments
- `updateProfileWeight()` - Persist weight changes
- `getRejectionPatternsByType()` - Query patterns by category

### 2. Rejection Analyzer Module (`src/ai/rejection-analyzer.ts`)

Create new module with keyword and LLM analysis:

```typescript
export interface RejectionAnalysis {
  patterns: {
    type: 'keyword' | 'company' | 'tech_stack' | 'seniority' | 'location' | 'compensation';
    value: string;
    confidence: number;
  }[];
  suggestedAdjustments: {
    category: string;  // Profile category (coreAzure, security, etc.)
    currentWeight: number;
    adjustment: number;  // Positive or negative percentage change
    reason: string;
  }[];
  filters: {
    type: 'block_company' | 'avoid_keyword' | 'min_seniority';
    value: string;
  }[];
}

// Keyword pattern matching for common rejection reasons
const REJECTION_KEYWORDS = {
  seniority: ['too junior', 'not senior enough', 'need more experience', 'junior level'],
  techStack: ['wrong stack', 'different tech', 'not familiar with', 'no experience with'],
  location: ['location', 'not remote', 'office required', 'must be in'],
  compensation: ['salary', 'compensation', 'pay', 'budget'],
  company: ['company culture', 'not a fit', 'team fit']
};

async function analyzeRejectionKeywords(reason: string): Promise<Pattern[]>
async function analyzeRejectionWithLLM(reason: string, job: Job): Promise<RejectionAnalysis>
```

LLM prompt structure:

```
Analyze this job rejection reason and identify patterns to avoid similar jobs.

REJECTION REASON: "${rejectionReason}"
JOB: ${job.title} at ${job.company}
CATEGORY SCORES: ${job.category_scores}
FIT REASONS: ${job.fit_reasons}

Identify:
1. Pattern type (seniority, tech_stack, location, company, compensation)
2. Specific values to avoid or filter
3. Which scoring category to adjust (coreAzure, security, eventDriven, performance, devops, seniority, coreNet, legacyModernization)
4. Weight adjustment recommendation (-5 to +5 percentage points)

Return JSON: {"patterns": [...], "suggestedAdjustments": [...], "filters": [...]}
```

### 3. Dynamic Weight Management (`src/ai/weight-manager.ts`)

Create module to manage profile weight adjustments:

```typescript
export interface WeightAdjustments {
  [category: string]: number;  // Adjustment delta from base weight
}

export function getActiveWeights(): Record<string, number>
export function applyWeightAdjustment(category: string, adjustment: number): void
export function normalizeWeights(): void  // Ensure sum = 100%
export function exportAdjustedProfiles(): Record<string, TechnicalProfile>
```

Key logic:

- Load base weights from `PROFILES`
- Apply cumulative adjustments from database
- Normalize to ensure 100% total
- Provide adjusted weights to ranker

### 4. Enhanced Ranker Integration (`src/ai/ranker.ts`)

Modify `generateProfileScoringCriteria()` to use adjusted weights:

```typescript
function generateProfileScoringCriteria(profileKey: string): {...} {
  const profile = PROFILES[profileKey];
  
  // Get weight adjustments from learning system
  const adjustedWeights = getActiveWeights();
  
  Object.entries(PROFILES).forEach(([key, prof]) => {
    const baseWeight = prof.weight;
    const adjustment = adjustedWeights[key] || 0;
    const finalWeight = baseWeight + adjustment;
    // ... use finalWeight in criteria
  });
}
```

### 5. Filter System (`src/ai/rejection-filters.ts`)

Create filter module to block jobs before ranking:

```typescript
export interface JobFilter {
  shouldFilter(job: JobInput): boolean;
  reason: string;
}

export function buildFiltersFromPatterns(): JobFilter[]
export function applyFilters(job: JobInput): { blocked: boolean; reason?: string }
```

Filter types:

- Company blocklist (exact match)
- Keyword avoidance (description contains)
- Seniority minimum (title analysis)

### 6. Integration Point - Job Status Update

Modify `updateJobStatus()` in `src/lib/db.ts` to trigger learning:

```typescript
export function updateJobStatus(jobId: string, status: Job['status'], appliedMethod?: string, rejectionReason?: string): void {
  // ... existing code ...
  
  // Trigger learning on rejection
  if (status === 'rejected' && rejectionReason) {
    analyzeAndLearnFromRejection(jobId, rejectionReason);
  }
}

async function analyzeAndLearnFromRejection(jobId: string, rejectionReason: string): Promise<void> {
  const job = getJobById(jobId);
  if (!job) return;
  
  // Analyze rejection
  const analysis = await analyzeRejectionWithLLM(rejectionReason, job);
  
  // Save patterns
  for (const pattern of analysis.patterns) {
    saveRejectionPattern(pattern);
  }
  
  // Apply weight adjustments immediately
  for (const adjustment of analysis.suggestedAdjustments) {
    applyWeightAdjustment(adjustment.category, adjustment.adjustment);
  }
  
  // Log adjustment
  console.log(`📊 Learning: Adjusted ${adjustment.category} by ${adjustment.adjustment}% based on rejection`);
}
```

### 7. Search Integration (`src/commands/search.ts`)

Apply filters before ranking in `processPage()`:

```typescript
async function processPage(page: Page, minScore: number, config: any, opts: SearchOptions): Promise<...> {
  // ... extract jobs ...
  
  for (const job of jobs) {
    // Check rejection filters
    const filterResult = applyFilters(job);
    if (filterResult.blocked) {
      console.log(`   ⚠️  Filtered: ${job.title} - ${filterResult.reason}`);
      continue;
    }
    
    // Proceed with ranking using adjusted weights
    const ranking = await rankJob(job, profile);
    // ...
  }
}
```

### 8. Dashboard Visualization

Add rejection learning metrics to dashboard (`src/dashboard/routes/analytics.ts`):

```typescript
// New endpoint: GET /api/learning/stats
{
  totalRejections: number;
  activeAdjustments: { category: string; delta: number }[];
  topPatterns: { type: string; value: string; count: number }[];
  recentLearnings: { timestamp: string; category: string; adjustment: number; reason: string }[];
}
```

Add to frontend (`src/dashboard/client/components/LearningPanel.tsx`):

- Show active weight adjustments vs base weights
- Display learned rejection patterns
- Show adjustment history timeline
- Export learning data functionality

### 9. README Documentation

Add to "Advanced Features" section:

```markdown
### Rejection Reason Learning System

The system learns from job rejections to improve future job selection:

**Immediate Weight Adjustment**
- Each rejection triggers analysis of the reason using keyword patterns and LLM
- Profile category weights automatically adjust based on rejection patterns
- Example: Multiple "too junior" rejections decrease seniority weight

**Pattern-Based Filtering**
- Builds blocklists for companies with repeated rejections
- Avoids jobs with problematic keywords identified in rejection reasons
- Filters jobs before ranking to save processing time

**Analysis Methods**
- Keyword extraction for common patterns (seniority, tech stack, location)
- LLM-powered analysis for nuanced rejection reasons
- Confidence scoring for pattern identification

**Dashboard Monitoring**
- View active weight adjustments in real-time
- Track rejection pattern frequency
- Review learning history and adjustment rationale
```

## Implementation Order

1. Create database schema and functions (`db.ts`)
2. Build rejection analyzer with keyword + LLM analysis (`rejection-analyzer.ts`)
3. Implement weight manager with normalization (`weight-manager.ts`)
4. Create filter system (`rejection-filters.ts`)
5. Integrate learning trigger in job status update
6. Update ranker to use adjusted weights
7. Apply filters in search command
8. Add dashboard learning panel
9. Update README with feature documentation
10. Test with sample rejections and verify adjustments

## Testing Strategy

Test cases:

- Rejection "too junior" → reduce seniority weight
- Rejection "wrong tech stack - no Python" → filter Python jobs
- Multiple rejections from same company → block company
- Verify weights always sum to 100%
- Confirm filters applied before ranking
- Check dashboard displays adjustments correctly

### To-dos

- [x] Add rejection_patterns and weight_adjustments tables with database functions
- [x] Create rejection-analyzer.ts with keyword patterns and LLM analysis
- [x] Build weight-manager.ts for dynamic weight adjustments with normalization
- [x] Implement rejection-filters.ts for job filtering before ranking
- [x] Integrate learning trigger in updateJobStatus() function
- [x] Update ranker.ts to use adjusted weights from weight-manager
- [x] Apply rejection filters in search.ts before job ranking
- [x] Create LearningPanel component and analytics endpoint
- [x] Document rejection learning system in README Advanced Features section
- [x] Fix remaining test failures in rejection learning system