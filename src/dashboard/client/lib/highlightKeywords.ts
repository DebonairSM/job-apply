/**
 * Utility function to highlight keywords in job descriptions based on resume
 * - Red: Blocking keywords (deal breakers, poor fit indicators)
 * - Yellow: Warning keywords (worth noting but not necessarily blockers)
 * - Blue: ASP.NET Core keywords (very core to ASP.NET developer expertise)
 * - Green: Resume keywords (all technical keywords from resume)
 * 
 * Resume-based highlighting approach:
 * 1. Prioritize blocking keywords (red) to identify deal breakers
 * 2. Flag warning keywords (yellow) that need attention
 * 3. Categorize ASP.NET core keywords separately (blue)
 * 4. All other resume keywords get green highlighting
 * 5. This provides a comprehensive view of job fit across multiple dimensions
 */

export interface HighlightOptions {
  mustHaves?: string[]; // AI-identified must-haves (optional, for backward compatibility)
  blockers?: string[]; // AI-identified blockers (optional, for backward compatibility)
  useResumeKeywords?: boolean; // Use resume-based keywords instead of static lists (default: true)
}

export interface HighlightResult {
  html: string;
  counts: {
    blue: number;   // ASP.NET Core keywords
    green: number;  // Resume keywords
    red: number;    // Blocking/bad keywords
    yellow: number; // Neutral/warning keywords
  };
}

// Blocking keywords - indicate poor fit or deal breakers (RED highlighting)
const BLOCKING_KEYWORDS = [
  // Location & Work Environment
  'on-site only',
  'no remote',
  'must relocate',
  'relocation required',
  'in-office only',
  '5 days in office',
  'office-based',
  
  // Security & Clearance
  'security clearance required',
  'clearance required',
  'top secret clearance',
  'secret clearance',
  'active clearance',
  'TS/SCI',
  
  // Employment Terms
  'unpaid',
  'no compensation',
  'volunteer',
  'equity only',
  'commission only',
  'temp position',
  'temporary',
  
  // Technology Constraints
  'VB6',
  'Visual Basic 6',
  'VBA',
  'Classic ASP',
  'legacy ASP',
  'mainframe',
  'COBOL',
  'Fortran',
  'FoxPro',
  'ColdFusion',
  
  // Experience Requirements (red flags)
  'junior level',
  'entry level',
  '0-2 years',
  'no experience required',
  'must have MBA',
  'PhD required',
  
  // Management Requirements
  'people management required',
  'manage team of 20+',
  'director level',
  'executive level',
  'VP level'
];

// Warning keywords - worth noting but not necessarily blockers (YELLOW highlighting)
const WARNING_KEYWORDS = [
  // Work Environment
  'fast-paced',
  'startup environment',
  'wear many hats',
  'scrappy',
  'ambiguous',
  'rapidly changing',
  'high pressure',
  'tight deadlines',
  'overtime',
  'long hours',
  
  // Travel & Hybrid
  'travel required',
  '25% travel',
  '50% travel',
  'frequent travel',
  'occasional travel',
  'hybrid',
  'some in-office',
  'flexible hybrid',
  
  // Team & Structure
  'small team',
  'solo developer',
  'only developer',
  'contractor position',
  '6 month contract',
  '12 month contract',
  'contract',
  'contract-to-hire',
  'freelance',
  'consultant',
  
  // Technology Stack
  'legacy code',
  'legacy system',
  'brownfield',
  'maintenance',
  'support role',
  'bug fixes',
  
  // Skill Requirements
  'nice to have',
  'preferred',
  'bonus',
  'plus',
  'ideal candidate',
  'strongly preferred',
  
  // Company Stage
  'early stage',
  'pre-revenue',
  'seed stage',
  'series A',
  'growing startup',
  
  // Management Aspects
  'light management',
  'tech lead',
  'team lead',
  'mentor junior',
  'mentor team'
];

// ASP.NET Core keywords - fundamental to ASP.NET development (BLUE highlighting)
const ASP_NET_CORE_KEYWORDS = [
  // Core .NET
  'C#',
  '.NET',
  '.NET Core',
  '.NET 6',
  '.NET 8',
  '.NET Framework',
  'ASP.NET',
  'ASP.NET Core',
  'ASP.NET Core Web API',
  'Web API',
  'MVC',
  'Minimal APIs',
  
  // Entity Framework
  'Entity Framework',
  'EF Core',
  'LINQ',
  
  // Core patterns
  'REST',
  'RESTful',
  'OpenAPI',
  'API',
  'APIs',
  
  // Architecture
  'DDD',
  'CQRS',
  'Clean Architecture',
  'Dependency Injection',
  'DI',
  
  // Testing & Development
  'MSTest',
  'Unit Tests',
  'Integration Tests',
  'Functional Tests'
];

// All resume keywords (GREEN highlighting)
const RESUME_KEYWORDS = [
  // Languages & Frameworks
  'TypeScript',
  'JavaScript',
  'Python',
  'C#',
  'VB.NET',
  
  // .NET Stack (comprehensive)
  '.NET',
  '.NET Core',
  '.NET 6',
  '.NET 8',
  '.NET Framework',
  'ASP.NET',
  'ASP.NET Core',
  'ASP.NET Core Web API',
  'Web API',
  'MVC',
  'Web Forms',
  'WebForms',
  'Entity Framework',
  'EF Core',
  'EF Core 8',
  'LINQ',
  'Minimal APIs',
  
  // Azure Services (comprehensive)
  'Azure',
  'Microsoft Azure',
  'APIM',
  'Azure API Management',
  'API Management',
  'Azure Functions',
  'App Services',
  'Azure App Services',
  'Service Bus',
  'Azure Service Bus',
  'Logic Apps',
  'Azure Logic Apps',
  'Key Vault',
  'Azure Key Vault',
  'Application Insights',
  'App Insights',
  'Azure Storage',
  'Storage',
  'Cosmos DB',
  'Azure Load Testing',
  'Azure DevOps',
  'Azure Active Directory',
  'Azure AD',
  'Entra ID',
  'Azure CLI',
  
  // API & Integration
  'REST',
  'RESTful',
  'OpenAPI',
  'API',
  'APIs',
  'GraphQL',
  'Swagger',
  'API Gateway',
  'API Governance',
  'Schema Validation',
  'Transformations',
  'Throttling',
  'Rate Limiting',
  'Caching',
  'Versioning',
  'API Security',
  
  // Authentication & Security
  'OAuth',
  'OAuth 2.0',
  'JWT',
  'Entra ID',
  'Azure AD',
  'MSAL',
  'MSAL.js',
  'Authentication',
  'Authorization',
  'Security',
  
  // Architecture & Patterns
  'Microservices',
  'DDD',
  'CQRS',
  'Clean Architecture',
  'Dependency Injection',
  'DI',
  'Event-Driven',
  'Message Queue',
  'Pub/Sub',
  'Fan-Out',
  'Orchestration',
  'Choreography',
  'Idempotent',
  'Idempotency',
  'Retry',
  'Circuit Breaker',
  'Dead Letter Queue',
  'DLQ',
  
  // Data & Databases
  'SQL Server',
  'SQL Server 2019',
  'T-SQL',
  'Redis',
  'Cosmos DB',
  'Elasticsearch',
  'EF Core',
  'Entity Framework',
  'Query Optimization',
  'Stored Procedures',
  'Database',
  'Relational Database',
  
  // DevOps & CI/CD
  'Azure DevOps',
  'GitHub Actions',
  'CI/CD',
  'Continuous Integration',
  'Continuous Deployment',
  'Pipeline',
  'Multi-Environment',
  'Bicep',
  'ARM',
  'ARM Templates',
  'Infrastructure as Code',
  'IaC',
  'Docker',
  'Containers',
  'Azure CLI',
  
  // Frontend (complementary)
  'Angular',
  'Angular 18',
  'TypeScript',
  'JavaScript',
  'RxJS',
  'Angular Material',
  'NgRx',
  'State Management',
  'Reactive Forms',
  'Lazy Loading',
  'SPA',
  'Single Page Application',
  'Kendo UI',
  
  // Monitoring & Observability
  'Application Insights',
  'App Insights',
  'KQL',
  'Kusto',
  'Serilog',
  'Structured Logging',
  'Splunk',
  'Dashboards',
  'Telemetry',
  'Observability',
  'Tracing',
  'Metrics',
  
  // Performance & Testing
  'Performance Optimization',
  'Query Optimization',
  'Caching',
  'Redis Caching',
  'Azure Load Testing',
  'Locust',
  'Load Testing',
  'Performance Testing',
  'Unit Testing',
  'Integration Testing',
  'MSTest',
  'Postman',
  'Contract Testing',
  
  // Messaging & Events
  'Service Bus',
  'Azure Service Bus',
  'Message Queue',
  'Queue',
  'Topic',
  'Subscription',
  'Event Grid',
  'Event-Driven Architecture',
  'Pub/Sub',
  'Publisher/Subscriber',
  
  // Integration Platforms
  'Mulesoft',
  'Boomi',
  'Integration Runtime',
  'Data Factory',
  'Azure Data Factory',
  'Logic Apps',
  
  // Third-party Services
  'SendGrid',
  'Twilio',
  'Salesforce',
  'Bynder',
  'QuickForms',
  'Tridion CMS',
  'Microsoft Dynamics CRM',
  
  // Methodologies
  'Agile',
  'Scrum',
  'Kanban',
  'Lean',
  'PSM',
  'Professional Scrum Master',
  
  // General Tech
  'Git',
  'GitHub',
  'Code Review',
  'Pair Programming',
  'Mentoring',
  'Technical Leadership',
  'API-First',
  'Contract-Driven',
  'Documentation'
];

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize keyword for matching (lowercase, trim)
 */
function normalizeKeyword(keyword: string): string {
  return keyword.toLowerCase().trim();
}

/**
 * Check if a keyword is ASP.NET core
 */
function isAspNetCoreKeyword(keyword: string): boolean {
  const normalized = normalizeKeyword(keyword);
  return ASP_NET_CORE_KEYWORDS.some(k => normalizeKeyword(k) === normalized);
}

/**
 * Highlights keywords in text by wrapping matches in mark tags
 * Returns HTML string with highlighted keywords and match counts
 * 
 * Resume-based highlighting:
 * - RED: Blocking keywords (deal breakers, poor fit indicators)
 * - YELLOW: Warning keywords (worth noting but not necessarily blockers)
 * - BLUE: ASP.NET Core keywords (fundamental to ASP.NET development)
 * - GREEN: Resume keywords (all other technical keywords from resume)
 */
export function highlightKeywords(text: string, options: HighlightOptions = {}): HighlightResult {
  if (!text) return { html: '', counts: { blue: 0, green: 0, red: 0, yellow: 0 } };
  
  const { useResumeKeywords = true } = options;
  
  if (!useResumeKeywords) {
    // Fallback to no highlighting if requested
    return { html: escapeHtml(text), counts: { blue: 0, green: 0, red: 0, yellow: 0 } };
  }
  
  // Create a map to track which keywords have been found and their type
  const keywordMap = new Map<string, 'blue' | 'green' | 'red' | 'yellow'>();
  
  // 1. Add blocking keywords (RED) - highest priority as these are deal breakers
  BLOCKING_KEYWORDS.forEach(keyword => {
    if (keyword && keyword.trim()) {
      keywordMap.set(normalizeKeyword(keyword), 'red');
    }
  });
  
  // 2. Add warning keywords (YELLOW) - medium priority
  WARNING_KEYWORDS.forEach(keyword => {
    if (keyword && keyword.trim()) {
      const key = normalizeKeyword(keyword);
      if (!keywordMap.has(key)) {
        keywordMap.set(key, 'yellow');
      }
    }
  });
  
  // 3. Add ASP.NET Core keywords (BLUE) - high priority for positive matches
  ASP_NET_CORE_KEYWORDS.forEach(keyword => {
    if (keyword && keyword.trim()) {
      const key = normalizeKeyword(keyword);
      if (!keywordMap.has(key)) {
        keywordMap.set(key, 'blue');
      }
    }
  });
  
  // 4. Add all resume keywords (GREEN) - but don't override any previous categories
  // Remove ASP.NET Core keywords from resume list to avoid duplicates
  const aspNetCoreNormalized = new Set(ASP_NET_CORE_KEYWORDS.map(normalizeKeyword));
  const resumeKeywordsFiltered = RESUME_KEYWORDS.filter(keyword => {
    return !aspNetCoreNormalized.has(normalizeKeyword(keyword));
  });
  
  resumeKeywordsFiltered.forEach(keyword => {
    if (keyword && keyword.trim()) {
      const key = normalizeKeyword(keyword);
      if (!keywordMap.has(key)) {
        keywordMap.set(key, 'green');
      }
    }
  });
  
  if (keywordMap.size === 0) {
    return { html: escapeHtml(text), counts: { blue: 0, green: 0, red: 0, yellow: 0 } };
  }
  
  // Track match counts
  const counts = { blue: 0, green: 0, red: 0, yellow: 0 };
  
  // Sort keywords by length (longest first) to handle overlapping matches
  const sortedKeywords = Array.from(keywordMap.entries())
    .sort((a, b) => b[0].length - a[0].length);
  
  // Build regex pattern for all keywords (case-insensitive, word boundary aware)
  const patterns = sortedKeywords.map(([keyword]) => {
    // Escape special regex characters
    const escaped = escapeRegex(keyword);
    
    // For keywords with special characters (like C#, .NET), use lookahead/lookbehind
    // to match word boundaries or string start/end, but don't require word boundaries
    // around the special characters themselves
    const hasSpecialChars = /[^a-zA-Z0-9\s]/.test(keyword);
    
    if (hasSpecialChars) {
      // Use negative lookahead/lookbehind to ensure we're not in the middle of a word
      // But allow the special characters to be at boundaries
      return `(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`;
    } else {
      // Regular keywords use word boundaries
      return `\\b${escaped}\\b`;
    }
  });
  
  const regex = new RegExp(`(${patterns.join('|')})`, 'gi');
  
  // Split text into parts and track what's been highlighted
  const parts: Array<{ text: string; type: 'plain' | 'blue' | 'green' | 'red' | 'yellow' }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  while ((match = regex.exec(text)) !== null) {
    // Add plain text before match
    if (match.index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, match.index),
        type: 'plain'
      });
    }
    
    // Determine color for this match
    const matchedText = match[0];
    const matchedKey = normalizeKeyword(matchedText);
    
    // Find the best matching keyword (prioritize exact matches, then containment)
    let color: 'blue' | 'green' | 'red' | 'yellow' = 'green';
    
    // First try exact match
    if (keywordMap.has(matchedKey)) {
      color = keywordMap.get(matchedKey)!;
    } else {
      // Try to find a match with contains logic
      for (const [keyword, keywordColor] of keywordMap.entries()) {
        if (matchedKey === keyword || matchedKey.includes(keyword) || keyword.includes(matchedKey)) {
          color = keywordColor;
          break;
        }
      }
    }
    
    parts.push({
      text: matchedText,
      type: color
    });
    
    // Increment count for this color
    counts[color]++;
    
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining plain text
  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      type: 'plain'
    });
  }
  
  // Build HTML
  const html = parts.map(part => {
    if (part.type === 'plain') {
      return escapeHtml(part.text);
    } else if (part.type === 'blue') {
      return `<mark class="bg-blue-200 text-blue-900 px-1 rounded font-medium">${escapeHtml(part.text)}</mark>`;
    } else if (part.type === 'green') {
      return `<mark class="bg-green-200 text-green-900 px-1 rounded">${escapeHtml(part.text)}</mark>`;
    } else if (part.type === 'red') {
      return `<mark class="bg-red-200 text-red-900 px-1 rounded font-medium">${escapeHtml(part.text)}</mark>`;
    } else {
      return `<mark class="bg-yellow-200 text-yellow-900 px-1 rounded">${escapeHtml(part.text)}</mark>`;
    }
  }).join('');
  
  return { html, counts };
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

