// Technical evaluation profiles for Azure API Engineer roles
//
// IMPORTANT: When adding a new profile, you must also update:
// 1. BOOLEAN_SEARCHES (below) - defines how to search for jobs
// 2. PROFILE_WEIGHT_DISTRIBUTIONS (below) - defines scoring weights
// 3. src/ai/ranker.ts PROFILE_NAME_MAP - maps search profile to technical profile
// 4. src/cli.ts - adds profile to CLI choices and type assertions
//
// See docs/PROFILE_CREATION_GUIDE.md for complete instructions.

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
    weight: 25,
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
  
  seniority: {
    name: 'Seniority & Remote Work',
    weight: 12,
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
    weight: 25,
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
    weight: 13,
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
  },
  
  legacyWeb: {
    name: 'Legacy Web Development',
    weight: 15,
    mustHave: [
      '.NET Framework 4.5',
      '.NET Framework 4.8',
      '.NET Framework 4.7',
      'WebForms',
      'Web Forms',
      'ASP.NET MVC',
      'C#',
      'VB.NET'
    ],
    preferred: [
      'jQuery',
      'Kendo UI',
      '.NET Framework 4.x',
      '.NET Framework',
      'Classic ASP',
      'Visual Studio',
      '.NET 4.5',
      '.NET 4.8',
      '.NET 4.7',
      'ASP.NET Web Forms',
      'MVC 5',
      'ASP.NET MVC 4',
      'ASP.NET MVC 5'
    ],
    description: 'Legacy Microsoft web development technologies including WebForms, classic ASP.NET MVC, jQuery, and .NET Framework 4.x'
  }
};

// Boolean search strings for LinkedIn (without Remote - added dynamically)
export const BOOLEAN_SEARCHES: Record<string, string> = {
  core: '("Senior API Engineer" OR "Senior Backend Developer" OR "Azure API Engineer") AND (C# OR VB.NET OR ".NET") AND (Azure OR "Microsoft Azure") AND ("API Management" OR APIM) AND ("Azure Functions" OR "App Services") AND ("Service Bus" OR "Event Grid")',
  
  backend: '("Senior Backend Engineer" OR "Senior API Engineer" OR "Azure Developer" OR ".NET Core Developer") AND (C# OR VB.NET OR ".NET") AND (Azure OR "Microsoft Azure") AND (REST OR API OR APIM OR "API Management") AND ("Azure Functions" OR "App Services") AND (Redis OR SQL OR "EF Core")',
  
  'core-net': '("Senior .NET Developer" OR "Senior Software Engineer" OR ".NET Developer" OR "C# Developer") AND (C# OR VB.NET OR ".NET Core" OR ".NET 6" OR ".NET 8") AND (ASP.NET OR MVC OR "Web API" OR "REST API") AND (Entity Framework OR "EF Core" OR SQL OR Database) AND (Senior OR Lead OR Principal)',
  
  'legacy-modernization': '("Senior .NET Developer" OR "Legacy Developer" OR "Modernization Engineer" OR "Migration Specialist") AND ((VB.NET OR WebForms OR "ASP.NET MVC" OR Legacy) OR (Modernization OR Migration OR "Cloud Migration")) AND (C# OR ".NET Core" OR ".NET 6" OR ".NET 8") AND (Azure OR Cloud OR "System Migration") AND (Senior OR Lead OR Principal)',
  
  contract: '("Senior .NET Developer" OR "Contract .NET Developer" OR "C# Contractor" OR "Contract Software Engineer") AND (C# OR ".NET Core" OR ".NET 6" OR ".NET 8") AND (Contract OR Contractor OR "Contract to Hire" OR C2H OR "Contract Position") AND (ASP.NET OR "Web API" OR REST)',

  // Simplified boolean profiles requested
  'aspnet-simple': 'asp.net',
  'csharp-azure-no-frontend': '(C# AND Azure) NOT (Angular OR React)',
  
  // AZ-204 certification focused profile
  'az204-csharp': 'AZ-204 AND C#',
  
  // AI-enhanced .NET development with AI-assisted coding tools
  'ai-enhanced-net': '("AI Developer" OR "AI Automation" OR "AI Integration" OR "Multi-Agent" OR "Intelligent Systems") AND (".NET" OR "C#" OR "ASP.NET" OR "Azure") AND ("Semantic Kernel" OR "LangChain" OR "multi-agent" OR "autonomous agent" OR "workflow automation" OR "LLM integration" OR "AI orchestration") AND ("Cursor IDE" OR "GitHub Copilot" OR "AI-assisted development" OR "ChatGPT" OR "local LLM" OR "Ollama" OR "Mistral" OR "AI code tools")',
  
  // Legacy web development - WebForms, MVC, jQuery, Kendo UI, .NET Framework 4.x (Blazor allowed, but not React/Angular/Vue)
  'legacy-web': '("WebForms" OR "Web Forms" OR "ASP.NET MVC" OR ".NET Framework" OR "VB.NET" OR "jQuery" OR "Kendo UI" OR ".NET 4.5" OR ".NET 4.8") AND (C# OR VB.NET OR ".NET") NOT (React OR Angular OR Vue)'
};

// Profile-specific weight distributions
// Each search profile emphasizes different categories based on its focus area
export const PROFILE_WEIGHT_DISTRIBUTIONS: Record<string, Record<string, number>> = {
  // Core Azure API profile - balanced emphasis on Azure platform and .NET
  core: {
    coreAzure: 35,           // Strong Azure platform focus
    seniority: 15,
    coreNet: 30,             // Core .NET skills
    frontendFrameworks: 10,
    legacyModernization: 10,
    legacyWeb: 0
  },
  
  // Backend/API-focused roles (maps to core)
  backend: {
    coreAzure: 40,
    seniority: 15,
    coreNet: 35,             // Strong .NET backend focus
    frontendFrameworks: 0,   // Backend only
    legacyModernization: 10,
    legacyWeb: 0
  },
  
  // Pure .NET development roles
  'core-net': {
    coreAzure: 10,           // Some Azure helpful but not primary
    seniority: 15,
    coreNet: 60,             // Primary focus on .NET skills
    frontendFrameworks: 10,
    legacyModernization: 5,
    legacyWeb: 0
  },
  
  // Legacy modernization specialists
  'legacy-modernization': {
    coreAzure: 25,           // Cloud migration target
    seniority: 20,           // Senior experience important
    coreNet: 30,             // Both old and new .NET
    frontendFrameworks: 5,
    legacyModernization: 20, // Primary focus on modernization
    legacyWeb: 0
  },
  
  // Contract roles - pure .NET development
  contract: {
    coreAzure: 10,           // Some Azure helpful but not primary
    seniority: 15,
    coreNet: 60,             // Primary focus on .NET skills
    frontendFrameworks: 10,
    legacyModernization: 5,
    legacyWeb: 0
  },
  
  // Simplified ASP.NET search - basic keyword matching
  'aspnet-simple': {
    coreAzure: 10,
    seniority: 20,
    coreNet: 60,             // Heavy focus on .NET skills
    frontendFrameworks: 5,
    legacyModernization: 5,
    legacyWeb: 0
  },
  
  // C# + Azure without frontend frameworks
  'csharp-azure-no-frontend': {
    coreAzure: 50,           // Strong Azure focus
    seniority: 20,
    coreNet: 30,
    frontendFrameworks: 0,   // Explicitly avoid frontend
    legacyModernization: 0,
    legacyWeb: 0
  },
  
  // AZ-204 certification focused on Azure Developer Associate skills
  'az204-csharp': {
    coreAzure: 60,           // AZ-204 is primarily about Azure services
    seniority: 15,
    coreNet: 20,             // C# required but secondary to Azure skills
    frontendFrameworks: 0,   // Backend-focused certification
    legacyModernization: 5,
    legacyWeb: 0
  },
  
  // AI-enhanced .NET development with modern AI tools and agentic systems
  'ai-enhanced-net': {
    coreAzure: 35,           // Azure AI services are important
    seniority: 15,
    coreNet: 40,             // Strong .NET foundation required
    frontendFrameworks: 10,   // Some frontend work common in AI apps
    legacyModernization: 0,
    legacyWeb: 0
  },
  
  // Legacy web development - WebForms, classic MVC, jQuery, Kendo UI, .NET Framework 4.x
  'legacy-web': {
    coreAzure: 5,            // Minimal Azure (legacy is often on-prem)
    seniority: 15,
    coreNet: 20,             // Some modern .NET helpful
    frontendFrameworks: 5,   // Blazor acceptable
    legacyModernization: 10, // Some modernization context
    legacyWeb: 45            // Primary focus on legacy web tech
  }
};

// Validate that all profile weight distributions sum to 100%
Object.entries(PROFILE_WEIGHT_DISTRIBUTIONS).forEach(([profileName, weights]) => {
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    console.warn(`Warning: Profile "${profileName}" weights sum to ${totalWeight}%, expected 100%`);
  }
});

// Validate profile weights sum to 100 (base default weights)
const totalWeight = Object.values(PROFILES).reduce((sum, p) => sum + p.weight, 0);
if (totalWeight !== 100) {
  console.warn(`Warning: Base profile weights sum to ${totalWeight}%, expected 100%`);
}

