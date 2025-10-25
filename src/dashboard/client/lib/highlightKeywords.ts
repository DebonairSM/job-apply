/**
 * Utility function to highlight keywords in job descriptions
 * - Green: Microsoft ecosystem + Terraform
 * - Yellow: AWS and other acceptable cloud providers
 * - Red: Prohibitive/non-Microsoft requirements
 * 
 * Uses a hybrid approach:
 * 1. Static keyword lists from PROFILES (comprehensive coverage)
 * 2. AI-identified must_haves and blockers (context-aware additions)
 * 3. Pattern detection for prohibitive requirements
 */

export interface HighlightOptions {
  mustHaves?: string[]; // AI-identified must-haves
  blockers?: string[]; // AI-identified blockers
}

// Microsoft ecosystem keywords (GREEN) + Terraform
const MICROSOFT_KEYWORDS = [
  // Core .NET
  'C#', 'VB.NET', '.NET', '.NET Core', '.NET 6', '.NET 8', '.NET Framework',
  'ASP.NET', 'ASP.NET Core', 'MVC', 'Web Forms', 'WebForms',
  'Entity Framework', 'EF Core', 'LINQ',
  'Blazor', 'Razor Pages', 'SignalR', 'WebSockets',
  'Minimal APIs', 'gRPC', 'Web API', 'REST API',
  
  // Azure (Microsoft-specific)
  'Azure', 'Microsoft Azure',
  'API Management', 'APIM', 'Azure Functions', 'App Services',
  'Service Bus', 'Event Grid', 'Azure Storage',
  'Azure Key Vault', 'Azure Monitor', 'Application Insights', 'App Insights',
  'Azure Logic Apps', 'Azure Service Fabric',
  'Azure Container Instances', 'Azure Kubernetes Service', 'AKS',
  'Azure Load Testing', 'Azure DevOps',
  
  // Microsoft Security & Identity
  'OAuth 2.0', 'OAuth', 'JWT', 'Entra ID', 'Azure AD', 'Azure Active Directory',
  'APIM Policies', 'API Governance', 'API Security',
  
  // Microsoft Data Stack
  'SQL Server', 'Serilog',
  
  // Microsoft DevOps
  'GitHub Actions', 'Azure Pipelines',
  
  // Infrastructure as Code (exception per user request)
  'Terraform'
];

// AWS and other acceptable cloud (YELLOW)
const ACCEPTABLE_CLOUD_KEYWORDS = [
  // AWS
  'AWS', 'Amazon Web Services', 'EC2', 'S3', 'Lambda', 'CloudFormation',
  'ECS', 'EKS', 'RDS', 'DynamoDB', 'CloudWatch', 'SNS', 'SQS'
];

// Prohibitive technologies (RED) - non-Microsoft ecosystem when required
const PROHIBITIVE_KEYWORDS = [
  // Non-Microsoft languages (when primary)
  'Python', 'Java', 'Ruby', 'Go', 'Golang', 'PHP', 'Scala', 'Kotlin',
  'Rust', 'Swift', 'Objective-C', 'Perl', 'Elixir', 'Clojure',
  
  // Non-Microsoft cloud platforms (heavy focus)
  'GCP', 'Google Cloud', 'Google Cloud Platform',
  
  // Non-Microsoft frameworks
  'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot',
  'Rails', 'Ruby on Rails', 'Laravel', 'Express.js', 'Nest.js',
  'React Native', 'Flutter', 'Electron',
  
  // Non-Microsoft databases (when exclusive)
  'MongoDB', 'PostgreSQL', 'MySQL', 'Cassandra',
  'Elasticsearch', 'Neo4j', 'CouchDB',
  
  // Non-Microsoft DevOps tools
  'Jenkins', 'CircleCI', 'Travis CI', 'Ansible',
  
  // Generic Kubernetes (not AKS)
  'Kubernetes' // standalone (not AKS)
];

// Patterns that indicate prohibitive requirements (RED)
const PROHIBITIVE_PATTERNS = [
  /\b(\d+)\+?\s*years?\s+(?:of\s+)?(?:experience\s+(?:in|with)\s+)?(AWS|Python|Java|Ruby|Go|PHP|Node\.?js)/gi,
  /\b(?:required|must have|mandatory):\s*(AWS|Python|Java|Ruby|Go|PHP|Node\.?js)/gi,
  /\b(?:expert|proficient|strong)\s+(?:in|with)\s+(AWS|Python|Java|Ruby|Go|PHP|Node\.?js)/gi,
  /\b(?:primarily|mainly|extensively)\s+(AWS|Python|Java|Ruby|Go|PHP|Node\.?js)/gi,
  /\bheavy\s+(AWS|Python|Java|Ruby|Go|PHP|Node\.?js)/gi,
];

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detects if text contains prohibitive patterns
 */
function detectProhibitivePatterns(text: string): string[] {
  const matches: string[] = [];
  
  for (const pattern of PROHIBITIVE_PATTERNS) {
    const found = text.match(pattern);
    if (found) {
      matches.push(...found);
    }
  }
  
  return matches;
}

/**
 * Highlights keywords in text by wrapping matches in mark tags
 * Returns HTML string with highlighted keywords
 */
export function highlightKeywords(text: string, options: HighlightOptions): string {
  if (!text) return '';
  
  const { mustHaves = [], blockers = [] } = options;
  
  // Create a map to track which keywords have been found and their type
  const keywordMap = new Map<string, 'green' | 'yellow' | 'red'>();
  
  // 1. Add static Microsoft ecosystem keywords (GREEN) - highest priority
  MICROSOFT_KEYWORDS.forEach(keyword => {
    if (keyword && keyword.trim()) {
      keywordMap.set(keyword.toLowerCase().trim(), 'green');
    }
  });
  
  // 2. Add acceptable cloud keywords (YELLOW) - but don't override green
  ACCEPTABLE_CLOUD_KEYWORDS.forEach(keyword => {
    if (keyword && keyword.trim()) {
      const key = keyword.toLowerCase().trim();
      if (!keywordMap.has(key)) {
        keywordMap.set(key, 'yellow');
      }
    }
  });
  
  // 3. Add static prohibitive keywords (RED) - but don't override green or yellow
  PROHIBITIVE_KEYWORDS.forEach(keyword => {
    if (keyword && keyword.trim()) {
      const key = keyword.toLowerCase().trim();
      if (!keywordMap.has(key)) {
        keywordMap.set(key, 'red');
      }
    }
  });
  
  // 4. Add AI-identified must-haves (GREEN) - reinforce Microsoft ecosystem
  mustHaves.forEach(keyword => {
    if (keyword && keyword.trim()) {
      keywordMap.set(keyword.toLowerCase().trim(), 'green');
    }
  });
  
  // 5. Add AI-identified blockers (RED) - but don't override green or yellow
  blockers.forEach(keyword => {
    if (keyword && keyword.trim()) {
      const key = keyword.toLowerCase().trim();
      if (!keywordMap.has(key)) {
        keywordMap.set(key, 'red');
      }
    }
  });
  
  // 6. Detect prohibitive patterns and add them
  const prohibitiveMatches = detectProhibitivePatterns(text);
  prohibitiveMatches.forEach(match => {
    const key = match.toLowerCase().trim();
    if (!keywordMap.has(key)) {
      keywordMap.set(key, 'red');
    }
  });
  
  if (keywordMap.size === 0) {
    return escapeHtml(text);
  }
  
  // Sort keywords by length (longest first) to handle overlapping matches
  const sortedKeywords = Array.from(keywordMap.entries())
    .sort((a, b) => b[0].length - a[0].length);
  
  // Build regex pattern for all keywords (case-insensitive, word boundary aware)
  const patterns = sortedKeywords.map(([keyword]) => {
    // Escape special regex characters
    const escaped = escapeRegex(keyword);
    // Use word boundaries for better matching, but be flexible with special chars
    return `\\b${escaped}\\b`;
  });
  
  const regex = new RegExp(`(${patterns.join('|')})`, 'gi');
  
  // Split text into parts and track what's been highlighted
  const parts: Array<{ text: string; type: 'plain' | 'green' | 'yellow' | 'red' }> = [];
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
    const matchedKey = matchedText.toLowerCase().trim();
    
    // Find the best matching keyword
    let color: 'green' | 'yellow' | 'red' = 'green';
    for (const [keyword, keywordColor] of keywordMap.entries()) {
      if (matchedKey === keyword || matchedKey.includes(keyword) || keyword.includes(matchedKey)) {
        color = keywordColor;
        break;
      }
    }
    
    parts.push({
      text: matchedText,
      type: color
    });
    
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
  return parts.map(part => {
    if (part.type === 'plain') {
      return escapeHtml(part.text);
    } else if (part.type === 'green') {
      return `<mark class="bg-green-200 text-green-900 px-1 rounded">${escapeHtml(part.text)}</mark>`;
    } else if (part.type === 'yellow') {
      return `<mark class="bg-yellow-200 text-yellow-900 px-1 rounded">${escapeHtml(part.text)}</mark>`;
    } else {
      return `<mark class="bg-red-200 text-red-900 px-1 rounded">${escapeHtml(part.text)}</mark>`;
    }
  }).join('');
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

