import { askOllama } from './client.js';
import { RankOutput, RankOutputSchema } from '../lib/validation.js';
import { PROFILES } from './profiles.js';

// Map CLI profile names (kebab-case) to profile keys (camelCase)
// CRITICAL: Every profile in BOOLEAN_SEARCHES must have an entry here
// Maps search profiles to technical profiles used for scoring
// Missing entry = "Unknown profile: <name>" error
const PROFILE_NAME_MAP: Record<string, string> = {
  'core': 'coreAzure',
  'security': 'security',
  'event-driven': 'eventDriven',
  'performance': 'performance',
  'devops': 'devops',
  'backend': 'coreNet', // Map backend to coreNet for now
  'core-net': 'coreNet',
  'legacy-modernization': 'legacyModernization',
  'contract': 'coreNet',  // Contract roles use same technical criteria as core .NET
  'florida-central': 'coreAzure'  // Uses balanced scoring but map to coreAzure technical profile
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

  // Get adjusted weights from learning system (profile-specific)
  const { getActiveWeights } = await import('./weight-manager.js');
  const adjustedWeights = getActiveWeights(profileKey);

  const criteria: string[] = [];
  const weights: string[] = [];
  const categoryNames: string[] = [];

  // Build scoring criteria based on adjusted weights
  Object.entries(adjustedWeights).forEach(([key, finalWeight]) => {
    const prof = PROFILES[key];
    if (!prof) return;  // Skip if profile doesn't exist
    
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

// Smart truncation that preserves complete sections
function smartTruncate(description: string, maxChars: number = 1000): string {
  if (description.length <= maxChars) return description;
  
  // Try to preserve complete sections (paragraphs/bullet points)
  const sections = description.split(/\n\n+/);
  let result = '';
  
  for (const section of sections) {
    if ((result + section).length > maxChars) break;
    result += section + '\n\n';
  }
  
  // If we got less than 80% of target, just do hard truncate
  if (result.length < maxChars * 0.8) {
    result = description.substring(0, maxChars);
  }
  
  return result.trim();
}

// Rank a job against user profile using profile-specific evaluation
export async function rankJob(job: JobInput, profileKey: string): Promise<RankOutput> {
  // Convert CLI profile name to actual profile key
  const actualProfileKey = getProfileKey(profileKey);
  
  // Truncate description to 1000 chars for faster processing (preserve sections)
  const desc = smartTruncate(job.description, 1000);
  
  // Get profile-specific scoring criteria
  const scoring = await generateProfileScoringCriteria(actualProfileKey);
  
  const prompt = `Evaluate job match for ${scoring.profileName} role.

JOB: ${job.title} at ${job.company}
DESCRIPTION: ${desc}

Rate fit 0-100 for each area (parenthesis shows weight for final score):
${scoring.criteria}

IMPORTANT: Score each category independently based on how well the job matches that specific area. Consider the actual job requirements, not generic assumptions.

Return ONLY valid JSON in this exact format with ALL categories. Use double quotes for all property names and string values:
{
  "categoryScores": {
    "coreAzure": 0,
    "security": 0,
    "eventDriven": 0,
    "performance": 0,
    "devops": 0,
    "seniority": 0,
    "coreNet": 0,
    "frontendFrameworks": 0,
    "legacyModernization": 0
  },
  "reasons": ["Strong match", "Good fit"],
  "mustHaves": ["Required skill"],
  "blockers": [],
  "missingKeywords": ["Missing skill"]
}`;

  const startTime = Date.now();
  const result = await askOllama<RankOutput>(prompt, 'RankOutput', {
    temperature: 0.5, // Higher temperature for more varied scoring
    retries: 3  // Increase retries for complex prompts
  });
  const duration = Date.now() - startTime;
  
  // Log performance for monitoring
  if (process.env.DEBUG) {
    console.log(`   ⏱️  LLM response time: ${(duration / 1000).toFixed(1)}s`);
  }

  // Ensure all required fields exist (LLM sometimes returns incomplete responses)
  if (!result.categoryScores) {
    result.categoryScores = {} as any;
  }
  if (!result.reasons) {
    result.reasons = [];
  }
  if (!result.mustHaves) {
    result.mustHaves = [];
  }
  if (!result.blockers) {
    result.blockers = [];
  }
  if (!result.missingKeywords) {
    result.missingKeywords = [];
  }

  // Ensure all required category scores exist
  const requiredCategories = ['coreAzure', 'security', 'eventDriven', 'performance', 'devops', 'seniority', 'coreNet', 'frontendFrameworks', 'legacyModernization'];
  for (const category of requiredCategories) {
    if (!(category in result.categoryScores)) {
      result.categoryScores[category as keyof typeof result.categoryScores] = 0;
    }
  }

  // Recalculate fitScore from category scores using current weights (profile-specific)
  // LLMs are bad at arithmetic, so we calculate the weighted sum ourselves
  const { getActiveWeights } = await import('./weight-manager.js');
  const adjustedWeights = getActiveWeights(actualProfileKey);

  let calculatedFitScore = 0;
  Object.entries(adjustedWeights).forEach(([key, weight]) => {
    const finalWeight = weight / 100;  // adjustedWeights already contains final weights
    const categoryScore = result.categoryScores[key as keyof typeof result.categoryScores] || 0;
    calculatedFitScore += categoryScore * finalWeight;
  });

  // Ensure fitScore is within 0-100 range (clamp it)
  calculatedFitScore = Math.max(0, Math.min(100, calculatedFitScore));

  // Override LLM's fitScore with our accurate calculation
  result.fitScore = calculatedFitScore;

  // Validate with Zod
  const validated = RankOutputSchema.parse(result);
  return validated;
}


