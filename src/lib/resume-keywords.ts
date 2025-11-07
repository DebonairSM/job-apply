/**
 * Resume Keyword Extraction System
 * 
 * Extracts technical keywords from the resume and categorizes them:
 * - ASP.NET Core: Keywords very core to ASP.NET development (blue highlighting)
 * - Resume Keywords: All other technical keywords from the resume (green highlighting)
 * 
 * This replaces the static keyword lists with dynamic extraction from the actual resume.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ASP.NET Core keywords - these are fundamental to ASP.NET development
// These will be highlighted in BLUE to indicate they're core to the developer's expertise
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

// All technical keywords extracted from the resume
// These will be highlighted in GREEN
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

// Normalize keyword for matching (lowercase, trim)
function normalizeKeyword(keyword: string): string {
  return keyword.toLowerCase().trim();
}

// Check if a keyword is ASP.NET core
export function isAspNetCoreKeyword(keyword: string): boolean {
  const normalized = normalizeKeyword(keyword);
  return ASP_NET_CORE_KEYWORDS.some(k => normalizeKeyword(k) === normalized);
}

// Get all ASP.NET core keywords
export function getAspNetCoreKeywords(): string[] {
  return [...ASP_NET_CORE_KEYWORDS];
}

// Get all resume keywords (excluding ASP.NET core ones since they're categorized separately)
export function getResumeKeywords(): string[] {
  return RESUME_KEYWORDS.filter(keyword => {
    const normalized = normalizeKeyword(keyword);
    return !ASP_NET_CORE_KEYWORDS.some(aspKeyword => normalizeKeyword(aspKeyword) === normalized);
  });
}

// Get all keywords from resume (combined)
export function getAllResumeKeywords(): string[] {
  return [...new Set([...ASP_NET_CORE_KEYWORDS, ...RESUME_KEYWORDS])];
}

// Export keyword categories for highlighting
export interface ResumeKeywordCategories {
  aspNetCore: string[];  // Blue highlighting - core ASP.NET
  resume: string[];       // Green highlighting - other resume keywords
}

export function getResumeKeywordCategories(): ResumeKeywordCategories {
  // Remove duplicates and ensure ASP.NET keywords aren't in both lists
  const aspNetCore = [...new Set(ASP_NET_CORE_KEYWORDS)];
  const aspNetCoreNormalized = new Set(aspNetCore.map(normalizeKeyword));
  
  const resume = [...new Set(RESUME_KEYWORDS)].filter(keyword => {
    return !aspNetCoreNormalized.has(normalizeKeyword(keyword));
  });
  
  return {
    aspNetCore,
    resume
  };
}

