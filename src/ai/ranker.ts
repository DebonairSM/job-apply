import { askOllama } from './client.js';
import { RankOutput, RankOutputSchema } from '../lib/validation.js';
import { PROFILES } from './profiles.js';

// Map CLI profile names (kebab-case) to profile keys (camelCase)
const PROFILE_NAME_MAP: Record<string, string> = {
  'core': 'coreAzure',
  'security': 'security',
  'event-driven': 'eventDriven',
  'performance': 'performance',
  'devops': 'devops',
  'backend': 'coreNet', // Map backend to coreNet for now
  'core-net': 'coreNet',
  'legacy-modernization': 'legacyModernization'
};

function getProfileKey(cliProfileName: string): string {
  return PROFILE_NAME_MAP[cliProfileName] || cliProfileName;
}

export interface JobInput {
  title: string;
  company: string;
  description: string;
}

// Generate profile-specific scoring criteria
async function generateProfileScoringCriteria(profileKey: string): Promise<{
  criteria: string;
  formula: string;
  categories: string[];
  profileName: string;
  profileDescription: string;
}> {
  const profile = PROFILES[profileKey];
  if (!profile) {
    throw new Error(`Unknown profile: ${profileKey}`);
  }

  // Get adjusted weights from learning system
  const { getActiveWeights } = await import('./weight-manager.js');
  const adjustedWeights = getActiveWeights();

  const criteria: string[] = [];
  const weights: string[] = [];
  const categoryNames: string[] = [];

  // Build scoring criteria based on adjusted weights
  Object.entries(PROFILES).forEach(([key, prof]) => {
    const baseWeight = prof.weight;
    const adjustment = adjustedWeights[key] || 0;
    const finalWeight = baseWeight + adjustment;
    const weightDecimal = finalWeight / 100;
    
    criteria.push(`- ${key} (weight ${finalWeight.toFixed(1)}%): How well does job match ${prof.description.toLowerCase()}?`);
    weights.push(`${key}*${weightDecimal}`);
    categoryNames.push(key);
  });

  const weightFormula = weights.join(' + ');
  
  return {
    criteria: criteria.join('\n'),
    formula: weightFormula,
    categories: categoryNames,
    profileName: profile.name,
    profileDescription: profile.description
  };
}

// Rank a job against user profile using profile-specific evaluation
export async function rankJob(job: JobInput, profileKey: string): Promise<RankOutput> {
  // Convert CLI profile name to actual profile key
  const actualProfileKey = getProfileKey(profileKey);
  
  // Truncate description to 1000 chars for faster processing
  const desc = job.description.substring(0, 1000);
  
  // Get profile-specific scoring criteria
  const scoring = await generateProfileScoringCriteria(actualProfileKey);
  
  const prompt = `Evaluate job match for ${scoring.profileName} role.

JOB: ${job.title} at ${job.company}
DESCRIPTION: ${desc}

Rate fit 0-100 for each area (parenthesis shows weight for final score):
${scoring.criteria}

Calculate fitScore = (${scoring.formula})

Return JSON with YOUR SCORES (not the weights):
{"fitScore":75,"categoryScores":{"${scoring.categories.join('":85,"')}":85},"reasons":["Strong match","Good fit"],"mustHaves":["Required skill"],"blockers":[],"missingKeywords":["Missing skill"]}`;

  const startTime = Date.now();
  const result = await askOllama<RankOutput>(prompt, 'RankOutput', {
    temperature: 0.1, // Lower temperature for more consistent JSON output
    retries: 3  // Increase retries for complex prompts
  });
  const duration = Date.now() - startTime;
  
  // Log performance for monitoring
  if (process.env.DEBUG) {
    console.log(`   ⏱️  LLM response time: ${(duration / 1000).toFixed(1)}s`);
  }

  // Validate with Zod
  const validated = RankOutputSchema.parse(result);
  return validated;
}


