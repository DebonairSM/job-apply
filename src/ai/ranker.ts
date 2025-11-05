import { askOllama } from './client.js';
import { RankOutput, RankOutputSchema } from '../lib/validation.js';
import { PROFILES } from './profiles.js';
import { getTechnicalKey } from './profile-registry.js';

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

/**
 * Ranks a job against the specified profile using weighted category scoring.
 * 
 * Uses Ollama LLM to evaluate job descriptions across multiple categories (Azure, .NET, 
 * Security, etc.) then applies profile-specific weights. Adjusts weights based on 
 * rejection learning system. The description is truncated to 1000 characters for faster
 * processing while preserving complete sections.
 * 
 * The function performs several post-processing steps:
 * - Validates all required fields are present
 * - Recalculates fit score from category scores (LLMs are bad at arithmetic)
 * - Derives blockers for low-scoring high-weight categories (>=15% weight, <40 score)
 * - Filters missing keywords to only those relevant to high-weight categories
 * 
 * @param job - Job details including title, company, and full description
 * @param profileKey - Profile identifier (e.g., 'core', 'security', 'legacy-web')
 * @returns Category scores, recalculated fit score (0-100), reasons, blockers, and missing keywords
 * @throws Error if profile not found in PROFILES or if LLM call fails after retries
 * 
 * @example
 * const result = await rankJob({
 *   title: 'Senior .NET Developer',
 *   company: 'Acme Corp',
 *   description: 'We need 5+ years Azure, C#, and API experience...'
 * }, 'core');
 * console.log(result.fitScore); // 0-100 weighted score
 * console.log(result.categoryScores.coreNet); // Individual category score
 */
export async function rankJob(job: JobInput, profileKey: string): Promise<RankOutput> {
  // Convert CLI profile name to actual profile key
  const actualProfileKey = getTechnicalKey(profileKey);
  
  // Truncate description to 1000 chars for faster processing (preserve sections)
  const desc = smartTruncate(job.description, 1000);
  
  // Get profile-specific scoring criteria
  const scoring = await generateProfileScoringCriteria(actualProfileKey);
  
  const prompt = `Evaluate job match for ${scoring.profileName} role.

JOB: ${job.title} at ${job.company}
DESCRIPTION: ${desc}

Rate fit 0-100 for each area (parenthesis shows weight for final score):
${scoring.criteria}

IMPORTANT: Score each category independently based on how well the job matches that specific area. Consider the actual job requirements, not generic assumptions. Focus your analysis on categories with higher weights - they matter more for this profile.

Return ONLY valid JSON in this exact format with ALL categories. Use double quotes for all property names and string values:
{
  "categoryScores": {
    "coreAzure": 0,
    "seniority": 0,
    "coreNet": 0,
    "frontendFrameworks": 0,
    "legacyModernization": 0,
    "legacyWeb": 0
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
  const requiredCategories = ['coreAzure', 'seniority', 'coreNet', 'frontendFrameworks', 'legacyModernization', 'legacyWeb'];
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

  // Derive basic blockers when LLM returns none
  if (!result.blockers || result.blockers.length === 0) {
    const derived: string[] = [];
    
    // Only show low matches for significantly weighted categories (>= 15%)
    // This prevents low-weight categories (like 5% Azure in legacy-web) from appearing as blockers
    Object.entries(adjustedWeights).forEach(([key, weight]) => {
      const categoryWeight = Number(weight);
      const categoryScore = result.categoryScores[key as keyof typeof result.categoryScores] || 0;
      if (categoryWeight >= 15 && categoryScore < 40) {
        derived.push(`Low match: ${key}`);
      }
    });
    
    // Only show missing keywords if they relate to high-weight categories
    // Get keywords from categories with weight >= 15%
    const relevantKeywords = new Set<string>();
    Object.entries(adjustedWeights).forEach(([key, weight]) => {
      const categoryWeight = Number(weight);
      if (categoryWeight >= 15) {
        const prof = PROFILES[key];
        if (prof) {
          prof.mustHave.forEach(kw => relevantKeywords.add(kw.toLowerCase()));
          prof.preferred.forEach(kw => relevantKeywords.add(kw.toLowerCase()));
        }
      }
    });
    
    // Filter missing keywords to only those relevant to high-weight categories
    if (Array.isArray(result.missingKeywords)) {
      const filtered = result.missingKeywords.filter(kw => {
        const kwLower = kw.toLowerCase();
        // Check if keyword matches any relevant category keyword
        for (const relevant of relevantKeywords) {
          if (kwLower.includes(relevant.toLowerCase()) || relevant.toLowerCase().includes(kwLower)) {
            return true;
          }
        }
        return false;
      });
      
      filtered.slice(0, 3).forEach(kw => {
        derived.push(`Missing: ${kw}`);
      });
    }
    
    result.blockers = derived.slice(0, 5);
  }

  // Validate with Zod
  const validated = RankOutputSchema.parse(result);
  return validated;
}


