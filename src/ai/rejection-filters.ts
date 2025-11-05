import { JobInput } from './ranker.js';
import { 
  getRejectionPatternsByType, 
  RejectionPattern,
  getAllRejectionPatterns,
  getDb,
  saveRejectionPattern,
  getProhibitedKeywords,
  ProhibitedKeyword
} from '../lib/db.js';

export interface JobFilter {
  shouldFilter(job: JobInput): boolean;
  reason: string;
}

export interface FilterResult {
  blocked: boolean;
  reason?: string;
}

// Company blocklist filter
class CompanyBlocklistFilter implements JobFilter {
  private blockedCompanies: Set<string>;
  
  constructor(blockedCompanies: string[]) {
    this.blockedCompanies = new Set(blockedCompanies.map(c => c.toLowerCase()));
  }
  
  shouldFilter(job: JobInput): boolean {
    return this.blockedCompanies.has(job.company.toLowerCase());
  }
  
  get reason(): string {
    return 'Company is on blocklist due to previous rejections';
  }
}

// Keyword avoidance filter
class KeywordAvoidanceFilter implements JobFilter {
  private avoidedKeywords: Set<string>;
  
  constructor(keywords: string[]) {
    this.avoidedKeywords = new Set(keywords.map(k => k.toLowerCase()));
  }
  
  shouldFilter(job: JobInput): boolean {
    const text = `${job.title} ${job.description}`.toLowerCase();
    return Array.from(this.avoidedKeywords).some(keyword => text.includes(keyword));
  }
  
  get reason(): string {
    return 'Job contains keywords associated with previous rejections';
  }
}

// Seniority minimum filter
class SeniorityMinimumFilter implements JobFilter {
  private minSeniority: string;
  
  constructor(minSeniority: string) {
    this.minSeniority = minSeniority.toLowerCase();
  }
  
  shouldFilter(job: JobInput): boolean {
    const title = job.title.toLowerCase();
    
    // If minimum is senior, filter out junior/mid level jobs
    if (this.minSeniority === 'senior') {
      return title.includes('junior') || title.includes('entry') || title.includes('associate');
    }
    
    // If minimum is mid, filter out entry level jobs
    if (this.minSeniority === 'mid') {
      return title.includes('entry') || title.includes('associate');
    }
    
    return false;
  }
  
  get reason(): string {
    return `Job does not meet minimum seniority requirement (${this.minSeniority})`;
  }
}

// Technology stack filter
class TechStackFilter implements JobFilter {
  private avoidedTech: Set<string>;
  
  constructor(techStack: string[]) {
    this.avoidedTech = new Set(techStack.map(t => t.toLowerCase()));
  }
  
  shouldFilter(job: JobInput): boolean {
    const text = `${job.title} ${job.description}`.toLowerCase();
    return Array.from(this.avoidedTech).some(tech => text.includes(tech));
  }
  
  get reason(): string {
    return 'Job requires technology stack associated with previous rejections';
  }
}

// Contract-only filter (for contract profile)
class ContractOnlyFilter implements JobFilter {
  private contractKeywords: Set<string>;
  
  constructor() {
    this.contractKeywords = new Set([
      'contract',
      'contractor',
      'c2h',
      'contract to hire',
      'contract position',
      'hourly',
      '1099',
      'corp to corp',
      'c2c'
    ]);
  }
  
  shouldFilter(job: JobInput): boolean {
    const text = `${job.title} ${job.description}`.toLowerCase();
    // Filter out (block) jobs that DON'T contain contract keywords
    return !Array.from(this.contractKeywords).some(keyword => text.includes(keyword));
  }
  
  get reason(): string {
    return 'Job does not appear to be a contract position';
  }
}

// Prohibited keywords filter (manual blockers - always active)
class ProhibitedKeywordsFilter implements JobFilter {
  private patterns: Array<{
    keywords: string[];
    matchMode: string;
  }>;
  
  constructor(keywords: ProhibitedKeyword[]) {
    this.patterns = keywords.map(k => {
      const keyword = k.keyword.toLowerCase().trim();
      const matchMode = k.match_mode || 'sentence';
      
      // Parse comma-separated keywords
      const keywordList = keyword.includes(',') 
        ? keyword.split(',').map(k => k.trim()).filter(k => k)
        : [keyword];
      
      return {
        keywords: keywordList,
        matchMode
      };
    });
  }
  
  private splitIntoSentences(text: string): string[] {
    // Split on sentence endings (. ! ?) followed by space or newline
    // Uses positive lookbehind to include the punctuation in the split
    return text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  }
  
  shouldFilter(job: JobInput): boolean {
    if (this.patterns.length === 0) return false;
    
    const text = `${job.title} ${job.description}`;
    
    for (const { keywords, matchMode } of this.patterns) {
      // Single keyword - use word boundary matching
      if (keywords.length === 1) {
        const keyword = keywords[0];
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = matchMode === 'word' 
          ? new RegExp(`\\b${escaped}\\b`, 'i')
          : new RegExp(escaped, 'i');
        if (regex.test(text)) {
          return true;
        }
        continue;
      }
      
      // Multiple keywords - check within same sentence
      const sentences = this.splitIntoSentences(text);
      
      for (const sentence of sentences) {
        // Check if ALL keywords are present in this sentence
        const foundKeywords = keywords.filter(keyword => {
          const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escaped}\\b`, 'i');
          return regex.test(sentence);
        });
        
        // If ALL keywords found in same sentence, it's a match
        if (foundKeywords.length === keywords.length) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  get reason(): string {
    return 'Job contains prohibited keywords';
  }
}

// Role type filter - blocks non-software development roles
class RoleTypeFilter implements JobFilter {
  private rolePatterns: Array<{ type: string; patterns: RegExp[] }>;
  private detectedRole: string = '';
  
  constructor() {
    // Define title patterns for each non-development role type
    // Using word boundaries to avoid false positives
    this.rolePatterns = [
      {
        type: 'DevOps/Infrastructure',
        patterns: [
          /\bdevops\b/i,
          /\bdev\s*ops\b/i,
          /\bsite\s+reliability\s+engineer\b/i,
          /\bsre\b/i,
          /\binfrastructure\s+engineer\b/i,
          /\bplatform\s+engineer\b/i,
          /\bcloud\s+engineer\b/i,
          /\bsystems\s+engineer\b/i,
          /\bnetwork\s+engineer\b/i
        ]
      },
      {
        type: 'QA/Test',
        patterns: [
          /\bqa\s+engineer\b/i,
          /\bquality\s+assurance\b/i,
          /\btest\s+engineer\b/i,
          /\bsdet\b/i,
          /\bautomation\s+engineer\b/i,
          /\btest\s+automation\b/i,
          /\btesting\s+engineer\b/i
        ]
      },
      {
        type: 'Project/Program Management',
        patterns: [
          /\bproject\s+manager\b/i,
          /\bprogram\s+manager\b/i,
          /\bproduct\s+manager\b/i,
          /\bpm\b/i,
          /\btechnical\s+program\s+manager\b/i,
          /\btpm\b/i,
          /\bdelivery\s+manager\b/i,
          /\bscrum\s+master\b/i
        ]
      },
      {
        type: 'Data/Analytics',
        patterns: [
          /\bdata\s+engineer\b/i,
          /\bdata\s+analyst\b/i,
          /\bdata\s+scientist\b/i,
          /\bbusiness\s+analyst\b/i,
          /\banalytics\s+engineer\b/i,
          /\bbi\s+developer\b/i,
          /\bbusiness\s+intelligence\b/i,
          /\bmachine\s+learning\s+engineer\b/i,
          /\bml\s+engineer\b/i
        ]
      },
      {
        type: 'Security',
        patterns: [
          /\bsecurity\s+engineer\b/i,
          /\bcybersecurity\b/i,
          /\binfosec\b/i,
          /\bapplication\s+security\b/i,
          /\bappsec\b/i,
          /\bsecurity\s+analyst\b/i
        ]
      }
    ];
  }
  
  shouldFilter(job: JobInput): boolean {
    const title = job.title.toLowerCase();
    
    // Check each role type pattern
    for (const { type, patterns } of this.rolePatterns) {
      for (const pattern of patterns) {
        if (pattern.test(title)) {
          this.detectedRole = type;
          return true;
        }
      }
    }
    
    return false;
  }
  
  get reason(): string {
    return `Job is not a software development role (detected: ${this.detectedRole})`;
  }
}

// Build filters from rejection patterns
export function buildFiltersFromPatterns(profile?: string): JobFilter[] {
  const filters: JobFilter[] = [];
  
  // Add manual prohibited keywords filter (always active, checks before other filters)
  const prohibitedKeywords = getProhibitedKeywords();
  if (prohibitedKeywords.length > 0) {
    filters.push(new ProhibitedKeywordsFilter(prohibitedKeywords));
  }
  
  // Add role type filter (always active, blocks non-software development roles)
  filters.push(new RoleTypeFilter());
  
  // Add contract-only filter if using contract profile
  if (profile === 'contract') {
    filters.push(new ContractOnlyFilter());
  }
  
  // Get company patterns
  const companyPatterns = getRejectionPatternsByType('company');
  if (companyPatterns.length > 0) {
    const blockedCompanies = companyPatterns
      .filter(p => p.count >= 2) // Only block companies with 2+ rejections
      .map(p => p.pattern_value);
    
    if (blockedCompanies.length > 0) {
      filters.push(new CompanyBlocklistFilter(blockedCompanies));
    }
  }
  
  // Get keyword patterns
  const keywordPatterns = getRejectionPatternsByType('keyword');
  if (keywordPatterns.length > 0) {
    const avoidedKeywords = keywordPatterns
      .filter(p => p.count >= 2) // Only avoid keywords with 2+ occurrences
      .map(p => p.pattern_value);
    
    if (avoidedKeywords.length > 0) {
      filters.push(new KeywordAvoidanceFilter(avoidedKeywords));
    }
  }
  
  // Get seniority patterns
  const seniorityPatterns = getRejectionPatternsByType('seniority');
  if (seniorityPatterns.length > 0) {
    const seniorityIssues = seniorityPatterns
      .filter(p => p.pattern_value.includes('junior') || p.pattern_value.includes('not senior'))
      .length;
    
    if (seniorityIssues >= 2) {
      filters.push(new SeniorityMinimumFilter('senior'));
    }
  }
  
  // Get tech stack patterns
  const techStackPatterns = getRejectionPatternsByType('tech_stack');
  if (techStackPatterns.length > 0) {
    const avoidedTech = techStackPatterns
      .filter(p => p.count >= 2)
      .map(p => p.pattern_value);
    
    if (avoidedTech.length > 0) {
      filters.push(new TechStackFilter(avoidedTech));
    }
  }
  
  return filters;
}

// Apply all filters to a job
export function applyFilters(job: JobInput, profile?: string): FilterResult {
  const filters = buildFiltersFromPatterns(profile);
  
  // buildFiltersFromPatterns() already includes all patterns with count >= 2
  // No need to add manual filters again (they're already included)
  
  for (const filter of filters) {
    if (filter.shouldFilter(job)) {
      return {
        blocked: true,
        reason: filter.reason
      };
    }
  }
  
  return { blocked: false };
}

// Get filter statistics for dashboard
export function getFilterStats(): {
  totalFilters: number;
  filterTypes: Array<{ type: string; count: number }>;
  blockedJobs: number;
} {
  const filters = buildFiltersFromPatterns();
  
  // buildFiltersFromPatterns() already includes all patterns with count >= 2
  
  const filterTypes = filters.reduce((acc, filter) => {
    const type = filter.constructor.name.replace('Filter', '');
    const existing = acc.find(f => f.type === type);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ type, count: 1 });
    }
    return acc;
  }, [] as Array<{ type: string; count: number }>);
  
  return {
    totalFilters: filters.length,
    filterTypes,
    blockedJobs: 0 // This would need to be tracked separately
  };
}

// Test filters with sample jobs
export function testFilters(sampleJobs: JobInput[]): Array<{
  job: JobInput;
  blocked: boolean;
  reason?: string;
}> {
  return sampleJobs.map(job => {
    const result = applyFilters(job);
    return {
      job,
      blocked: result.blocked,
      reason: result.reason
    };
  });
}

// Clear all filters (reset patterns)
export function clearAllFilters(): void {
  const database = getDb();
  database.prepare('DELETE FROM rejection_patterns').run();
  console.log('🔄 Cleared all rejection patterns and filters');
}

// Add manual filter
export function addManualFilter(
  type: 'company' | 'keyword' | 'tech_stack' | 'seniority',
  value: string,
  reason: string = 'Manual filter'
): void {
  saveRejectionPattern({
    type,
    value,
    confidence: 1.0,
    profileCategory: undefined,
    weightAdjustment: 0
  });
  
  console.log(`📝 Added manual filter: ${type} = "${value}" - ${reason}`);
}
