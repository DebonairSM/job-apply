/**
 * Unified profile registry - single source of truth for all profile definitions.
 * 
 * This consolidates profile information that was previously scattered across
 * multiple locations (BOOLEAN_SEARCHES, PROFILE_WEIGHT_DISTRIBUTIONS, PROFILE_NAME_MAP, CLI choices).
 * 
 * When adding a new profile:
 * 1. Add entry to this registry with all required fields
 * 2. That's it! CLI choices, ranker mapping, and search queries are automatically handled
 */

import { BOOLEAN_SEARCHES, PROFILE_WEIGHT_DISTRIBUTIONS } from './profiles.js';

/**
 * Complete profile definition combining search, scoring, and metadata.
 */
export interface ProfileDefinition {
  /** CLI argument name (kebab-case) - what users type */
  cliName: string;
  /** Technical profile key for scoring (camelCase) - used in PROFILES */
  technicalKey: string;
  /** Boolean search query for LinkedIn */
  searchQuery: string;
  /** Weight distribution across categories for this profile */
  weights: Record<string, number>;
  /** Human-readable description */
  description: string;
}

/**
 * Registry of all available profiles.
 * Maps CLI name to complete profile definition.
 */
export const PROFILE_REGISTRY: Record<string, ProfileDefinition> = {
  core: {
    cliName: 'core',
    technicalKey: 'coreAzure',
    searchQuery: BOOLEAN_SEARCHES.core,
    weights: PROFILE_WEIGHT_DISTRIBUTIONS.core,
    description: 'Azure API Engineer - Cloud-native full-time roles',
  },
  
  backend: {
    cliName: 'backend',
    technicalKey: 'coreNet',
    searchQuery: BOOLEAN_SEARCHES.backend,
    weights: PROFILE_WEIGHT_DISTRIBUTIONS.backend,
    description: 'Backend Developer - API and server-side focus',
  },
  
  'core-net': {
    cliName: 'core-net',
    technicalKey: 'coreNet',
    searchQuery: BOOLEAN_SEARCHES['core-net'],
    weights: PROFILE_WEIGHT_DISTRIBUTIONS['core-net'],
    description: 'Pure .NET Developer - Traditional .NET development',
  },
  
  'legacy-modernization': {
    cliName: 'legacy-modernization',
    technicalKey: 'legacyModernization',
    searchQuery: BOOLEAN_SEARCHES['legacy-modernization'],
    weights: PROFILE_WEIGHT_DISTRIBUTIONS['legacy-modernization'],
    description: 'Modernization Specialist - Legacy system upgrades',
  },
  
  contract: {
    cliName: 'contract',
    technicalKey: 'coreNet',
    searchQuery: BOOLEAN_SEARCHES.contract,
    weights: PROFILE_WEIGHT_DISTRIBUTIONS.contract,
    description: 'Contract Developer - Freelance/contract positions',
  },
  
  'aspnet-simple': {
    cliName: 'aspnet-simple',
    technicalKey: 'coreNet',
    searchQuery: BOOLEAN_SEARCHES['aspnet-simple'],
    weights: PROFILE_WEIGHT_DISTRIBUTIONS['aspnet-simple'],
    description: 'ASP.NET (Simple) - Basic ASP.NET keyword search',
  },
  
  'csharp-azure-no-frontend': {
    cliName: 'csharp-azure-no-frontend',
    technicalKey: 'coreNet',
    searchQuery: BOOLEAN_SEARCHES['csharp-azure-no-frontend'],
    weights: PROFILE_WEIGHT_DISTRIBUTIONS['csharp-azure-no-frontend'],
    description: 'C# + Azure - Backend roles without Angular/React',
  },
  
  'az204-csharp': {
    cliName: 'az204-csharp',
    technicalKey: 'coreAzure',
    searchQuery: BOOLEAN_SEARCHES['az204-csharp'],
    weights: PROFILE_WEIGHT_DISTRIBUTIONS['az204-csharp'],
    description: 'AZ-204 + C# - Azure Developer Associate certification roles',
  },
  
  'ai-enhanced-net': {
    cliName: 'ai-enhanced-net',
    technicalKey: 'coreNet',
    searchQuery: BOOLEAN_SEARCHES['ai-enhanced-net'],
    weights: PROFILE_WEIGHT_DISTRIBUTIONS['ai-enhanced-net'],
    description: 'AI-Enhanced .NET - AI-assisted development with Cursor, Copilot, LangChain',
  },
  
  'legacy-web': {
    cliName: 'legacy-web',
    technicalKey: 'legacyWeb',
    searchQuery: BOOLEAN_SEARCHES['legacy-web'],
    weights: PROFILE_WEIGHT_DISTRIBUTIONS['legacy-web'],
    description: 'Legacy Web Development - WebForms, classic MVC, jQuery, .NET Framework 4.x',
  },
};

/**
 * Get technical profile key from CLI name.
 * Used by ranker to map user input to scoring profile.
 * 
 * @param cliName - Profile name from CLI (e.g., 'core', 'contract')
 * @returns Technical profile key (e.g., 'coreAzure', 'coreNet')
 * @throws Error if profile not found
 */
export function getTechnicalKey(cliName: string): string {
  const profile = PROFILE_REGISTRY[cliName];
  if (!profile) {
    throw new Error(`Unknown profile: ${cliName}`);
  }
  return profile.technicalKey;
}

/**
 * Get all available CLI profile choices.
 * Used by yargs to populate CLI option choices.
 * 
 * @returns Array of valid profile names for CLI
 */
export function getProfileChoices(): string[] {
  return Object.keys(PROFILE_REGISTRY);
}

/**
 * Get complete profile definition by CLI name.
 * 
 * @param cliName - Profile name from CLI
 * @returns Complete profile definition
 * @throws Error if profile not found
 */
export function getProfile(cliName: string): ProfileDefinition {
  const profile = PROFILE_REGISTRY[cliName];
  if (!profile) {
    throw new Error(`Unknown profile: ${cliName}`);
  }
  return profile;
}

