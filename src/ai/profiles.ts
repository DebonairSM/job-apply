// Technical evaluation profiles for Azure API Engineer roles

export interface TechnicalProfile {
  name: string;
  weight: number; // Percentage weight in overall score (should sum to 100)
  mustHave: string[]; // Required keywords
  preferred: string[]; // Nice-to-have keywords
  description: string;
}

export const PROFILES: Record<string, TechnicalProfile> = {
  coreAzure: {
    name: 'Core Azure API Skills',
    weight: 25,
    mustHave: [
      'Azure', 
      'Microsoft Azure', 
      'API Management', 
      'APIM', 
      'Azure Functions', 
      'App Services',
      'C#',
      '.NET Core',
      '.NET 6',
      '.NET 8'
    ],
    preferred: [
      'Service Bus',
      'Event Grid',
      'OpenAPI',
      'Swagger',
      'REST',
      'REST API',
      'Web API'
    ],
    description: 'Core Azure platform and API development skills'
  },
  
  security: {
    name: 'Security & Governance',
    weight: 15,
    mustHave: [
      'OAuth 2.0',
      'OAuth',
      'JWT',
      'Entra ID',
      'Azure AD',
      'Azure Active Directory'
    ],
    preferred: [
      'APIM Policies',
      'API Governance',
      'API Security',
      'Authentication',
      'Authorization',
      'Identity Management'
    ],
    description: 'API security, authentication, and governance capabilities'
  },
  
  eventDriven: {
    name: 'Event-Driven Architecture',
    weight: 10,
    mustHave: [
      'Service Bus',
      'Event Grid',
      'Event-Driven',
      'Event Driven',
      'Message Queue',
      'Messaging'
    ],
    preferred: [
      'Integration',
      'Integration Platform',
      'Microservices',
      'Event Sourcing',
      'CQRS',
      'Pub/Sub'
    ],
    description: 'Event-driven patterns and integration architecture'
  },
  
  performance: {
    name: 'Performance & Reliability',
    weight: 10,
    mustHave: [],
    preferred: [
      'Load Testing',
      'Performance Testing',
      'Azure Load Testing',
      'Locust',
      'Redis',
      'EF Core',
      'Entity Framework',
      'SQL Server',
      'App Insights',
      'Application Insights',
      'Serilog',
      'Splunk',
      'KQL',
      'Observability',
      'Monitoring'
    ],
    description: 'Performance optimization, caching, and observability'
  },
  
  devops: {
    name: 'DevOps & CI/CD',
    weight: 5,
    mustHave: [],
    preferred: [
      'Azure DevOps',
      'GitHub Actions',
      'Docker',
      'Kubernetes',
      'Bicep',
      'ARM',
      'ARM Templates',
      'Infrastructure as Code',
      'IaC',
      'CI/CD',
      'CI CD',
      'DevOps'
    ],
    description: 'DevOps practices and infrastructure automation'
  },
  
  seniority: {
    name: 'Seniority & Role Type',
    weight: 5,
    mustHave: [
      'Senior',
      'Lead',
      'Principal',
      'Staff',
      'Remote'
    ],
    preferred: [
      'Remote-first',
      'Remote First',
      'Fully Remote',
      'Work from Home',
      'WFH',
      'Distributed'
    ],
    description: 'Required seniority level and remote work options'
  },
  
  coreNet: {
    name: 'Core .NET Development',
    weight: 20,
    mustHave: [
      'C#',
      '.NET Core',
      '.NET 6',
      '.NET 8',
      'ASP.NET',
      'MVC'
    ],
    preferred: [
      '.NET Framework',
      'Entity Framework',
      'EF Core',
      'SQL Server',
      'REST API',
      'Web API',
      'Blazor',
      'Razor Pages',
      'Dependency Injection',
      'LINQ'
    ],
    description: 'Core .NET development skills and frameworks'
  },
  
  legacyModernization: {
    name: 'Legacy Modernization',
    weight: 10,
    mustHave: [
      'VB.NET',
      'WebForms',
      'ASP.NET MVC',
      'Legacy'
    ],
    preferred: [
      'Modernization',
      'Migration',
      'Cloud Migration',
      'Azure',
      'Microservices',
      'API',
      '.NET Core',
      '.NET 6',
      '.NET 8',
      'Modernization Project',
      'Legacy System',
      'System Migration'
    ],
    description: 'Legacy system modernization and migration capabilities'
  }
};

// Boolean search strings for LinkedIn
export const BOOLEAN_SEARCHES: Record<string, string> = {
  core: '("Senior API Engineer" OR "Senior Backend Developer" OR "Azure API Engineer") AND (Azure OR "Microsoft Azure") AND ("API Management" OR APIM) AND ("Azure Functions" OR "App Services") AND (C# OR ".NET Core" OR ".NET 6" OR ".NET 8") AND (REST OR OpenAPI OR Swagger) AND ("Service Bus" OR "Event Grid") AND Remote',
  
  security: '("Senior API Engineer" OR "Azure Backend Engineer") AND (Azure OR "Microsoft Azure") AND ("API Management" OR APIM) AND ("OAuth 2.0" OR JWT OR "Entra ID" OR "Azure AD") AND ("APIM Policies" OR "API Governance") AND ("Service Bus" OR "Functions" OR "App Services") AND (C# OR ".NET Core" OR ".NET 8") AND Remote',
  
  'event-driven': '("Senior API Engineer" OR "Integration Engineer" OR "Azure Integration Developer") AND (Azure OR "Microsoft Azure") AND ("Service Bus" OR "Event Grid" OR "Event Driven") AND ("Azure Functions" OR "App Services") AND (APIM OR "API Management") AND (C# OR ".NET 6" OR ".NET 8") AND (REST OR OpenAPI OR Swagger) AND Remote',
  
  performance: '("Senior API Engineer" OR "Senior Backend Developer") AND (Azure OR "Microsoft Azure") AND (APIM OR "API Management") AND ("Azure Load Testing" OR Locust OR "performance testing" OR "load testing") AND (Redis OR "EF Core" OR "SQL Server") AND (C# OR ".NET Core") AND ("App Insights" OR Serilog OR Splunk OR KQL) AND Remote',
  
  devops: '("Senior API Engineer" OR "Senior Backend Engineer" OR "Azure DevOps Engineer") AND (Azure OR "Microsoft Azure") AND (APIM OR "API Management") AND ("Azure DevOps" OR "GitHub Actions" OR Docker OR Bicep OR ARM) AND ("Azure Functions" OR "App Services") AND (C# OR ".NET Core" OR ".NET 8") AND (REST OR OpenAPI OR Swagger) AND Remote',
  
  backend: '("Senior Backend Engineer" OR "Senior API Engineer" OR "Azure Developer" OR ".NET Core Developer") AND (Azure OR "Microsoft Azure") AND (C# OR ".NET Core" OR ".NET 6" OR ".NET 8") AND (REST OR API OR APIM OR "API Management") AND ("Azure Functions" OR "App Services") AND (Redis OR SQL OR "EF Core") AND Remote',
  
  'core-net': '("Senior .NET Developer" OR "Senior Software Engineer" OR ".NET Developer" OR "C# Developer") AND (C# OR ".NET Core" OR ".NET 6" OR ".NET 8") AND (ASP.NET OR MVC OR "Web API" OR "REST API") AND (Entity Framework OR "EF Core" OR SQL OR Database) AND (Senior OR Lead OR Principal) AND Remote',
  
  'legacy-modernization': '("Senior .NET Developer" OR "Legacy Developer" OR "Modernization Engineer" OR "Migration Specialist") AND ((VB.NET OR WebForms OR "ASP.NET MVC" OR Legacy) OR (Modernization OR Migration OR "Cloud Migration")) AND (C# OR ".NET Core" OR ".NET 6" OR ".NET 8") AND (Azure OR Cloud OR "System Migration") AND (Senior OR Lead OR Principal) AND Remote'
};

// Validate profile weights sum to 100
const totalWeight = Object.values(PROFILES).reduce((sum, p) => sum + p.weight, 0);
if (totalWeight !== 100) {
  console.warn(`Warning: Profile weights sum to ${totalWeight}%, expected 100%`);
}

