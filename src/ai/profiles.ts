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
    name: 'Azure Platform Development',
    weight: 20,
    mustHave: [
      'C#',
      'VB.NET',
      'Azure', 
      'Microsoft Azure', 
      'API Management', 
      'APIM', 
      'Azure Functions', 
      'App Services'
    ],
    preferred: [
      'Service Bus',
      'Event Grid',
      'Azure Storage',
      'Azure Key Vault',
      'Azure Monitor',
      'Application Insights',
      'Azure Logic Apps',
      'Azure Service Fabric',
      'Azure Container Instances',
      'Azure Kubernetes Service',
      'AKS'
    ],
    description: 'Azure platform services and cloud-native development skills'
  },
  
  security: {
    name: 'Security & Governance',
    weight: 15,
    mustHave: [
      'C#',
      'VB.NET',
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
      'C#',
      'VB.NET',
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
    mustHave: [
      'C#',
      'VB.NET'
    ],
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
    name: 'Development with DevOps Practices',
    weight: 0,
    mustHave: [
      'C#',
      'VB.NET'
    ],
    preferred: [
      'Azure DevOps',
      'GitHub Actions',
      'CI/CD',
      'CI CD',
      'Docker',
      'Containerization',
      'Deployment',
      'Automated Testing',
      'Build Pipeline',
      'Release Pipeline',
      'DevOps Practices',
      'Agile Development'
    ],
    description: 'Software development with DevOps practices and CI/CD (overlaps with other categories, weight redistributed)'
  },
  
  seniority: {
    name: 'Seniority & Remote Work',
    weight: 10,
    mustHave: [
      'C#',
      'VB.NET',
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
      '100% Remote',
      'Completely Remote',
      'Permanent Remote',
      'Work from Home',
      'Work from Anywhere',
      'WFH',
      'Distributed',
      'Remote Work'
    ],
    description: 'Required seniority level with strong emphasis on fully remote positions. Fully remote jobs score highest, hybrid positions score lower, on-site positions score lowest.'
  },
  
  coreNet: {
    name: '.NET Development',
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
      'ASP.NET Core',
      'Web Forms',
      'Entity Framework',
      'EF Core',
      'SQL Server',
      'REST API',
      'Web API',
      'Razor Pages',
      'Dependency Injection',
      'LINQ',
      'SignalR',
      'WebSockets',
      'Minimal APIs',
      'gRPC',
      'OpenAPI',
      'Swagger'
    ],
    description: 'Traditional .NET development skills including ASP.NET, MVC, Web Forms, and modern .NET Core technologies'
  },
  
  frontendFrameworks: {
    name: 'Frontend Framework Preferences',
    weight: 10,
    mustHave: [],
    preferred: [
      'Blazor',
      'Blazor Server',
      'Blazor WebAssembly',
      'Blazor WASM',
      'React',
      'React.js',
      'ReactJS',
      'TypeScript React',
      'React TypeScript'
    ],
    description: 'Preferred frontend frameworks with strong emphasis on Blazor and React over Angular'
  },
  
  legacyModernization: {
    name: 'Legacy Modernization',
    weight: 5,
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
  core: '("Senior API Engineer" OR "Senior Backend Developer" OR "Azure API Engineer") AND (C# OR VB.NET OR ".NET") AND (Azure OR "Microsoft Azure") AND ("API Management" OR APIM) AND ("Azure Functions" OR "App Services") AND ("Service Bus" OR "Event Grid") AND Remote',
  
  security: '("Senior API Engineer" OR "Azure Backend Engineer") AND (C# OR VB.NET OR ".NET") AND (Azure OR "Microsoft Azure") AND ("API Management" OR APIM) AND ("OAuth 2.0" OR JWT OR "Entra ID" OR "Azure AD") AND ("APIM Policies" OR "API Governance") AND ("Service Bus" OR "Functions" OR "App Services") AND Remote',
  
  'event-driven': '("Senior API Engineer" OR "Integration Engineer" OR "Azure Integration Developer") AND (C# OR VB.NET OR ".NET") AND (Azure OR "Microsoft Azure") AND ("Service Bus" OR "Event Grid" OR "Event Driven") AND ("Azure Functions" OR "App Services") AND (APIM OR "API Management") AND Remote',
  
  performance: '("Senior API Engineer" OR "Senior Backend Developer") AND (C# OR VB.NET OR ".NET") AND (Azure OR "Microsoft Azure") AND (APIM OR "API Management") AND ("Azure Load Testing" OR Locust OR "performance testing" OR "load testing") AND (Redis OR "EF Core" OR "SQL Server") AND ("App Insights" OR Serilog OR Splunk OR KQL) AND Remote',
  
  devops: '("Senior Software Developer" OR "Senior Software Engineer" OR "Azure Developer" OR "Full-Stack Developer" OR "Backend Developer") AND (C# OR VB.NET OR ".NET") AND (Azure OR "Microsoft Azure") AND ("Azure DevOps" OR "GitHub Actions" OR "CI/CD" OR Docker OR "DevOps Practices") AND ("Azure Functions" OR "App Services" OR "Web API") AND Remote',
  
  backend: '("Senior Backend Engineer" OR "Senior API Engineer" OR "Azure Developer" OR ".NET Core Developer") AND (C# OR VB.NET OR ".NET") AND (Azure OR "Microsoft Azure") AND (REST OR API OR APIM OR "API Management") AND ("Azure Functions" OR "App Services") AND (Redis OR SQL OR "EF Core") AND Remote',
  
  'core-net': '("Senior .NET Developer" OR "Senior Software Engineer" OR ".NET Developer" OR "C# Developer") AND (C# OR VB.NET OR ".NET Core" OR ".NET 6" OR ".NET 8") AND (ASP.NET OR MVC OR "Web API" OR "REST API") AND (Entity Framework OR "EF Core" OR SQL OR Database) AND (Senior OR Lead OR Principal) AND Remote',
  
  'legacy-modernization': '("Senior .NET Developer" OR "Legacy Developer" OR "Modernization Engineer" OR "Migration Specialist") AND ((VB.NET OR WebForms OR "ASP.NET MVC" OR Legacy) OR (Modernization OR Migration OR "Cloud Migration")) AND (C# OR ".NET Core" OR ".NET 6" OR ".NET 8") AND (Azure OR Cloud OR "System Migration") AND (Senior OR Lead OR Principal) AND Remote'
};

// Validate profile weights sum to 100
const totalWeight = Object.values(PROFILES).reduce((sum, p) => sum + p.weight, 0);
if (totalWeight !== 100) {
  console.warn(`Warning: Profile weights sum to ${totalWeight}%, expected 100%`);
}

