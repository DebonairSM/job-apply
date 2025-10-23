import { askOllama } from './client.js';
import { RankOutput, RankOutputSchema } from '../lib/validation.js';
import { PROFILES } from './profiles.js';

export interface JobInput {
  title: string;
  company: string;
  description: string;
}

// Rank a job against user profile using multi-category evaluation
export async function rankJob(job: JobInput, profile: string): Promise<RankOutput> {
  // Truncate description to 1000 chars for faster processing
  const desc = job.description.substring(0, 1000);
  
  const prompt = `Evaluate job match for Azure API Engineer role.

JOB: ${job.title} at ${job.company}
DESCRIPTION: ${desc}

Rate fit 0-100 for each area (parenthesis shows weight for final score):
- coreAzure (weight 30%): How well does job match Azure, APIM, .NET Core, Functions?
- security (weight 20%): OAuth, JWT, Azure AD, API security?
- eventDriven (weight 15%): Service Bus, Event Grid, messaging?
- performance (weight 15%): Redis, caching, monitoring?
- devops (weight 10%): CI/CD, Docker, IaC?
- seniority (weight 10%): Senior/Lead level + Remote work?

Calculate fitScore = (coreAzure*0.30 + security*0.20 + eventDriven*0.15 + performance*0.15 + devops*0.10 + seniority*0.10)

Return JSON with YOUR SCORES (not the weights):
{"fitScore":75,"categoryScores":{"coreAzure":85,"security":70,"eventDriven":60,"performance":80,"devops":70,"seniority":90},"reasons":["Strong Azure match","Senior level"],"mustHaves":["Azure","C#"],"blockers":[],"missingKeywords":["APIM"]}`;

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


