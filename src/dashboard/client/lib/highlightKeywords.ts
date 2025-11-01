/**
 * Utility function to highlight keywords in job descriptions
 * - Green: Microsoft ecosystem (C#, .NET, Azure, etc.)
 * - Yellow: Acceptable/Neutral technologies (AWS, Docker, React, PostgreSQL, etc.)
 * - Red: Prohibitive requirements (Python/Java/Go as primary language, GCP, etc.)
 * 
 * Uses a hybrid approach:
 * 1. Static keyword lists (80+ keywords across all categories)
 * 2. AI-identified must_haves and blockers (context-aware additions)
 * 3. Pattern detection for prohibitive requirements (e.g., "5+ years Python")
 */

export interface HighlightOptions {
  mustHaves?: string[]; // AI-identified must-haves
  blockers?: string[]; // AI-identified blockers
}

export interface HighlightResult {
  html: string;
  counts: {
    green: number;
    yellow: number;
    red: number;
  };
}

// Microsoft ecosystem keywords (GREEN) + Terraform
const MICROSOFT_KEYWORDS = [
  // Core .NET
  'C#', 'VB.NET', '.NET', '.NET Core', '.NET 6', '.NET 8', '.NET Framework',
  'ASP.NET', 'ASP.NET Core', 'MVC', 'Web Forms', 'WebForms',
  'Entity Framework', 'EF Core', 'LINQ',
  'Blazor', 'Razor Pages', 'SignalR', 'WebSockets',
  'Minimal APIs', 'gRPC', 'Web API', 'REST API',
  
  // Legacy .NET Framework versions
  '.NET 4.5', '.NET 4.7', '.NET 4.8', '.NET Framework 4.5', '.NET Framework 4.7', '.NET Framework 4.8',
  'ASP.NET MVC 4', 'ASP.NET MVC 5', 'MVC 5', 'Classic ASP',
  
  // Legacy UI frameworks
  'jQuery', 'Kendo UI', 'Telerik',
  
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

// Acceptable/Neutral technologies (YELLOW) - commonly used with Microsoft stack
const ACCEPTABLE_KEYWORDS = [
  // AWS Cloud
  'AWS', 'Amazon Web Services', 'EC2', 'S3', 'Lambda', 'CloudFormation',
  'ECS', 'EKS', 'RDS', 'DynamoDB', 'CloudWatch', 'SNS', 'SQS',
  
  // Containers & Orchestration
  'Docker', 'Kubernetes', 'K8s', 'Helm', 'Container',
  
  // Databases (commonly used with .NET)
  'PostgreSQL', 'Postgres', 'MySQL', 'Redis', 'MongoDB',
  
  // Message Queues & Streaming
  'Kafka', 'Apache Kafka', 'RabbitMQ', 'MQTT',
  
  // CI/CD Tools
  'Jenkins', 'GitLab CI', 'GitLab', 'CircleCI', 'Travis CI',
  
  // Frontend Technologies
  'React', 'Angular', 'Vue', 'Vue.js', 'TypeScript', 'JavaScript', 'Node.js', 'npm',
  
  // API Technologies
  'REST', 'RESTful', 'GraphQL', 'OpenAPI', 'Swagger',
  
  // Monitoring & Observability
  'Prometheus', 'Grafana', 'ELK', 'Elasticsearch', 'Kibana', 'Logstash',
  'Datadog', 'New Relic', 'Splunk',
  
  // Infrastructure & Config Management
  'Ansible', 'Chef', 'Puppet',
  
  // Version Control
  'Git', 'GitHub', 'Bitbucket'
];

// Prohibitive technologies (RED) - strong indicators of non-Microsoft focus
const PROHIBITIVE_KEYWORDS = [
  // Non-Microsoft languages (when primary requirement)
  'Python', 'Java', 'Ruby', 'Go', 'Golang', 'PHP', 'Scala', 'Kotlin',
  'Rust', 'Swift', 'Objective-C', 'Perl', 'Elixir', 'Clojure',
  
  // Non-Microsoft cloud platforms (when primary)
  'GCP', 'Google Cloud', 'Google Cloud Platform', 'Google Cloud Functions',
  
  // Non-Microsoft frameworks (when primary)
  'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot',
  'Rails', 'Ruby on Rails', 'Laravel',
  'React Native', 'Flutter', 'Electron',
  
  // Specialized databases indicating non-Microsoft stack
  'Cassandra', 'Neo4j', 'CouchDB', 'ClickHouse'
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
 * Returns HTML string with highlighted keywords and match counts
 */
export function highlightKeywords(text: string, options: HighlightOptions): HighlightResult {
  if (!text) return { html: '', counts: { green: 0, yellow: 0, red: 0 } };
  
  const { mustHaves = [], blockers = [] } = options;
  
  // Create a map to track which keywords have been found and their type
  const keywordMap = new Map<string, 'green' | 'yellow' | 'red'>();
  
  // 1. Add static Microsoft ecosystem keywords (GREEN) - highest priority
  MICROSOFT_KEYWORDS.forEach(keyword => {
    if (keyword && keyword.trim()) {
      keywordMap.set(keyword.toLowerCase().trim(), 'green');
    }
  });
  
  // 2. Add acceptable/neutral keywords (YELLOW) - but don't override green
  ACCEPTABLE_KEYWORDS.forEach(keyword => {
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
    return { html: escapeHtml(text), counts: { green: 0, yellow: 0, red: 0 } };
  }
  
  // Track match counts
  const counts = { green: 0, yellow: 0, red: 0 };
  
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
    } else if (part.type === 'green') {
      return `<mark class="bg-green-200 text-green-900 px-1 rounded">${escapeHtml(part.text)}</mark>`;
    } else if (part.type === 'yellow') {
      return `<mark class="bg-yellow-200 text-yellow-900 px-1 rounded">${escapeHtml(part.text)}</mark>`;
    } else {
      return `<mark class="bg-red-200 text-red-900 px-1 rounded">${escapeHtml(part.text)}</mark>`;
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

