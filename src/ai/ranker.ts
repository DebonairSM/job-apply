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
  const prompt = `You are a specialized Azure API Engineer job evaluator.

CANDIDATE PROFILE:
${profile}

EVALUATION CRITERIA (rate each category 0-100):

1. Core Azure API Skills (${PROFILES.coreAzure.weight}% weight)
   Must have: ${PROFILES.coreAzure.mustHave.join(', ')}
   Preferred: ${PROFILES.coreAzure.preferred.join(', ')}
   Score 100 if job requires most must-haves and many preferred.
   Score 0 if none of these technologies are mentioned.

2. Security & Governance (${PROFILES.security.weight}% weight)
   Must have: ${PROFILES.security.mustHave.join(', ')}
   Preferred: ${PROFILES.security.preferred.join(', ')}
   Score 100 if authentication/security is core requirement.
   Score 50 if mentioned but not emphasized.
   Score 0 if not mentioned at all.

3. Event-Driven Architecture (${PROFILES.eventDriven.weight}% weight)
   Must have: ${PROFILES.eventDriven.mustHave.join(', ')}
   Preferred: ${PROFILES.eventDriven.preferred.join(', ')}
   Score 100 if messaging/events are primary focus.
   Score 50 if mentioned as secondary skill.
   Score 0 if not mentioned.

4. Performance & Reliability (${PROFILES.performance.weight}% weight)
   Preferred: ${PROFILES.performance.preferred.join(', ')}
   Score 100 if performance/observability emphasized.
   Score 50 if testing/monitoring mentioned.
   Score 0 if not mentioned.

5. DevOps & CI/CD (${PROFILES.devops.weight}% weight)
   Preferred: ${PROFILES.devops.preferred.join(', ')}
   Score 100 if DevOps is core responsibility.
   Score 50 if CI/CD mentioned as requirement.
   Score 0 if not mentioned.

6. Seniority & Role Type (${PROFILES.seniority.weight}% weight)
   Must have: ${PROFILES.seniority.mustHave.join(', ')}
   Preferred: ${PROFILES.seniority.preferred.join(', ')}
   Score 100 if Senior/Lead AND Remote.
   Score 50 if Senior but hybrid/unclear remote.
   Score 0 if Junior/Mid-level or On-site only.

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Description:
${job.description}

Rate each category honestly. A perfect match should score 90-100. Most jobs will score 40-80.

Provide:
1. categoryScores: Object with score for each category (coreAzure, security, eventDriven, performance, devops, seniority)
2. fitScore: Weighted average of category scores using the weights shown above
3. reasons: 3-5 specific reasons why this matches or doesn't (mention specific technologies found/missing)
4. mustHaves: Key requirements explicitly mentioned in job posting
5. blockers: Critical dealbreakers (wrong level, wrong tech stack, not remote, etc.)
6. missingKeywords: Important keywords from evaluation criteria NOT found in job description

Be strict. A job missing Azure should score <30 in coreAzure. A job requiring Python/Java instead of .NET should be flagged as blocker.

Return ONLY this JSON structure (no markdown, no explanation):
{
  "fitScore": 75,
  "categoryScores": {
    "coreAzure": 80,
    "security": 70,
    "eventDriven": 65,
    "performance": 75,
    "devops": 80,
    "seniority": 90
  },
  "reasons": ["reason1", "reason2", "reason3"],
  "mustHaves": ["skill1", "skill2"],
  "blockers": [],
  "missingKeywords": ["keyword1", "keyword2"]
}`;

  const result = await askOllama<RankOutput>(prompt, 'RankOutput', {
    temperature: 0.1 // Lower temperature for more consistent scoring
  });

  // Validate with Zod
  const validated = RankOutputSchema.parse(result);
  return validated;
}


