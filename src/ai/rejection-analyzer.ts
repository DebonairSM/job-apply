import { askOllama } from './client.js';
import { Job } from '../lib/db.js';

export interface RejectionPattern {
  type: 'keyword' | 'company' | 'tech_stack' | 'seniority' | 'location' | 'compensation';
  value: string;
  confidence: number;
}

export interface SuggestedAdjustment {
  category: string;  // Profile category (coreAzure, security, etc.)
  currentWeight: number;
  adjustment: number;  // Positive or negative percentage change
  reason: string;
}

export interface RejectionFilter {
  type: 'block_company' | 'avoid_keyword' | 'min_seniority';
  value: string;
}

export interface RejectionAnalysis {
  patterns: RejectionPattern[];
  suggestedAdjustments: SuggestedAdjustment[];
  filters: RejectionFilter[];
}

// Keyword pattern matching for common rejection reasons
const REJECTION_KEYWORDS = {
  seniority: [
    'too junior', 'not senior enough', 'need more experience', 'junior level',
    'not enough experience', 'lack experience', 'entry level', 'mid level',
    'need senior', 'require senior', 'senior required', 'overqualified',
    'too senior', 'overqualified for', 'overqualified for this'
  ],
  techStack: [
    'wrong stack', 'different tech', 'not familiar with', 'no experience with',
    'different technology', 'tech stack', 'technology stack', 'not our stack',
    'unfamiliar with', 'no knowledge of', 'different framework', 'python',
    'no python', 'python experience', 'c#', 'java', 'javascript'
  ],
  location: [
    'location', 'not remote', 'office required', 'must be in', 'relocation',
    'on-site', 'onsite', 'in office', 'office work', 'not available',
    'geographic', 'time zone', 'timezone', 'requires office work'
  ],
  compensation: [
    'salary', 'compensation', 'pay', 'budget', 'rate', 'cost',
    'too expensive', 'over budget', 'salary range', 'compensation range',
    'salary expectations', 'budget constraints', 'over our budget'
  ],
  company: [
    'company culture', 'not a fit', 'team fit', 'cultural fit',
    'company values', 'team dynamics', 'work environment'
  ]
};

// Analyze rejection reason using keyword patterns
export function analyzeRejectionKeywords(reason: string): RejectionPattern[] {
  const patterns: RejectionPattern[] = [];
  const lowerReason = reason.toLowerCase();
  
  for (const [type, keywords] of Object.entries(REJECTION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerReason.includes(keyword.toLowerCase())) {
        patterns.push({
          type: type as RejectionPattern['type'],
          value: keyword,
          confidence: 0.8  // High confidence for exact keyword matches
        });
      }
    }
  }
  
  return patterns;
}

// Convert rejection patterns to weight adjustments with correct logic
export function convertPatternsToAdjustments(patterns: RejectionPattern[]): SuggestedAdjustment[] {
  const adjustments: SuggestedAdjustment[] = [];
  
  for (const pattern of patterns) {
    let adjustment: SuggestedAdjustment | null = null;
    
    switch (pattern.type) {
      case 'seniority':
        if (pattern.value.includes('junior') || pattern.value.includes('not senior') || pattern.value.includes('not enough experience')) {
          // Too junior = need MORE seniority
          adjustment = {
            category: 'seniority',
            currentWeight: 5, // Will be updated with actual current weight
            adjustment: +2,
            reason: `Too junior - prioritizing more senior jobs`
          };
        } else if (pattern.value.includes('senior') || pattern.value.includes('overqualified')) {
          // Too senior = need LESS seniority
          adjustment = {
            category: 'seniority',
            currentWeight: 5,
            adjustment: -2,
            reason: `Too senior - considering mid-level jobs`
          };
        }
        break;
        
      case 'techStack':
        // Wrong tech stack = need LESS of that tech
        adjustment = {
          category: 'coreAzure', // Default to coreAzure, could be more specific
          currentWeight: 20,
          adjustment: -2,
          reason: `Wrong tech stack - avoiding ${pattern.value}`
        };
        break;
        
      case 'location':
        if (pattern.value.includes('not remote') || pattern.value.includes('office required')) {
          // Not remote = need MORE remote jobs
          adjustment = {
            category: 'performance', // Could be a separate remote category
            currentWeight: 10,
            adjustment: +1,
            reason: `Location issue - prioritizing remote jobs`
          };
        }
        break;
        
      case 'compensation':
        if (pattern.value.includes('too expensive') || pattern.value.includes('over budget')) {
          // Too expensive = need LESS expensive jobs
          adjustment = {
            category: 'seniority', // Senior jobs tend to be more expensive
            currentWeight: 5,
            adjustment: -1,
            reason: `Compensation issue - considering mid-level roles`
          };
        }
        break;
    }
    
    if (adjustment) {
      adjustments.push(adjustment);
    }
  }
  
  return adjustments;
}

// Analyze rejection reason using LLM for nuanced understanding
export async function analyzeRejectionWithLLM(reason: string, job: Job): Promise<RejectionAnalysis> {
  const prompt = `Analyze this job rejection reason and identify patterns to avoid similar jobs.

REJECTION REASON: "${reason}"
JOB: ${job.title} at ${job.company}
CATEGORY SCORES: ${job.category_scores || 'N/A'}
FIT REASONS: ${job.fit_reasons || 'N/A'}

Identify patterns and suggest adjustments:

1. PATTERNS: Extract specific patterns from the rejection reason
   - seniority: Issues with experience level (too junior, not senior enough, etc.)
   - tech_stack: Technology/framework mismatches
   - location: Geographic or remote work issues
   - compensation: Salary/budget concerns
   - company: Cultural fit or company-specific issues

2. ADJUSTMENTS: Suggest weight adjustments for profile categories
   Available categories: coreAzure, security, eventDriven, performance, devops, seniority, coreNet, legacyModernization
   Adjustment range: -5 to +5 percentage points
   
   CORRECT LOGIC:
   - "Too junior" → INCREASE seniority weight (need more senior jobs)
   - "Too senior" → DECREASE seniority weight (consider mid-level jobs)
   - "Wrong tech stack" → DECREASE that tech weight (avoid that technology)
   - "Missing skill" → INCREASE that skill weight (need more of that skill)
   - "Not enough experience" → INCREASE seniority weight (need more experience)
   - "Overqualified" → DECREASE seniority weight (consider lower level)
   
   Think: What does the rejection tell us we need MORE or LESS of?

3. FILTERS: Suggest filters to avoid similar jobs
   - block_company: Block specific companies
   - avoid_keyword: Avoid jobs with specific keywords
   - min_seniority: Require minimum seniority level

Return JSON format:
{
  "patterns": [
    {
      "type": "seniority",
      "value": "too junior",
      "confidence": 0.9
    }
  ],
  "suggestedAdjustments": [
    {
      "category": "seniority",
      "currentWeight": 5,
      "adjustment": +2,
      "reason": "Too junior - need to prioritize more senior jobs"
    }
  ],
  "filters": [
    {
      "type": "avoid_keyword",
      "value": "junior"
    }
  ]
}`;

  try {
    const result = await askOllama<RejectionAnalysis>(prompt, 'RejectionAnalysis', {
      temperature: 0.1,
      retries: 3
    });
    
    // Validate and enhance the result
    const enhancedAnalysis: RejectionAnalysis = {
      patterns: result.patterns || [],
      suggestedAdjustments: result.suggestedAdjustments || [],
      filters: result.filters || []
    };
    
    // Add keyword-based patterns if LLM didn't find them
    const keywordPatterns = analyzeRejectionKeywords(reason);
    for (const keywordPattern of keywordPatterns) {
      const exists = enhancedAnalysis.patterns.some(p => 
        p.type === keywordPattern.type && p.value === keywordPattern.value
      );
      if (!exists) {
        enhancedAnalysis.patterns.push(keywordPattern);
      }
    }
    
    // Add keyword-based adjustments with correct logic
    const keywordAdjustments = convertPatternsToAdjustments(keywordPatterns);
    for (const keywordAdjustment of keywordAdjustments) {
      // Check if LLM already suggested this category adjustment
      const exists = enhancedAnalysis.suggestedAdjustments.some(adj => 
        adj.category === keywordAdjustment.category
      );
      if (!exists) {
        enhancedAnalysis.suggestedAdjustments.push(keywordAdjustment);
      }
    }
    
    return enhancedAnalysis;
  } catch (error) {
    console.error('Error analyzing rejection with LLM:', error);
    
    // Log error to database if we have job context
    if (process.env.JOB_ID) {
      try {
        const { logRun } = await import('../lib/db.js');
        logRun({
          job_id: process.env.JOB_ID,
          step: 'rejection_analysis',
          ok: false,
          log: `Failed to analyze rejection with LLM: ${(error as Error).message}`
        });
      } catch (dbError) {
        console.error('Failed to log rejection analysis error to database:', dbError);
      }
    }
    
    // Fallback to keyword analysis only with correct logic
    const keywordPatterns = analyzeRejectionKeywords(reason);
    const keywordAdjustments = convertPatternsToAdjustments(keywordPatterns);
    
    return {
      patterns: keywordPatterns,
      suggestedAdjustments: keywordAdjustments,
      filters: []
    };
  }
}

// Extract company name from rejection reason for blocking
export function extractCompanyFromRejection(reason: string, job: Job): string | null {
  const lowerReason = reason.toLowerCase();
  const companyLower = job.company.toLowerCase();
  
  // If the rejection mentions the company name, return it
  if (lowerReason.includes(companyLower)) {
    return job.company;
  }
  
  // Look for patterns like "at [Company]", "from [Company]", etc.
  const companyPatterns = [
    new RegExp(`at\\s+([a-zA-Z0-9\\s&.,-]+)`, 'i'),
    new RegExp(`from\\s+([a-zA-Z0-9\\s&.,-]+)`, 'i'),
    new RegExp(`with\\s+([a-zA-Z0-9\\s&.,-]+)`, 'i')
  ];
  
  for (const pattern of companyPatterns) {
    const match = reason.match(pattern);
    if (match && match[1]) {
      const extractedCompany = match[1].trim();
      // Only return if it looks like a company name (not too short, not common words)
      if (extractedCompany.length > 3 && !['the', 'this', 'that', 'our', 'their'].includes(extractedCompany.toLowerCase())) {
        return extractedCompany;
      }
    }
  }
  
  return null;
}

// Extract technology keywords from rejection reason
export function extractTechKeywordsFromRejection(reason: string): string[] {
  const techKeywords: string[] = [];
  const lowerReason = reason.toLowerCase();
  
  // Common technology keywords to look for
  const techTerms = [
    'python', 'java', 'javascript', 'typescript', 'react', 'angular', 'vue',
    'node.js', 'spring', 'django', 'flask', 'ruby', 'php', 'go', 'rust',
    'kubernetes', 'docker', 'aws', 'azure', 'gcp', 'mongodb', 'postgresql',
    'mysql', 'redis', 'elasticsearch', 'kafka', 'rabbitmq', 'graphql',
    'microservices', 'api', 'rest', 'soap', 'grpc'
  ];
  
  for (const tech of techTerms) {
    if (lowerReason.includes(tech.toLowerCase())) {
      techKeywords.push(tech);
    }
  }
  
  return techKeywords;
}

// Determine seniority level from rejection reason
export function extractSeniorityFromRejection(reason: string): string | null {
  const lowerReason = reason.toLowerCase();
  
  if (lowerReason.includes('too junior') || lowerReason.includes('not senior enough')) {
    return 'senior';
  }
  if (lowerReason.includes('too senior') || lowerReason.includes('overqualified')) {
    return 'mid';
  }
  if (lowerReason.includes('entry level') || lowerReason.includes('junior')) {
    return 'entry';
  }
  
  return null;
}
