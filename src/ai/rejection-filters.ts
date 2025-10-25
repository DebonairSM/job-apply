import { JobInput } from './ranker.js';
import { 
  getRejectionPatternsByType, 
  RejectionPattern,
  getAllRejectionPatterns,
  getDb,
  saveRejectionPattern
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

// Build filters from rejection patterns
export function buildFiltersFromPatterns(): JobFilter[] {
  const filters: JobFilter[] = [];
  
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
export function applyFilters(job: JobInput): FilterResult {
  const filters = buildFiltersFromPatterns();
  
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
