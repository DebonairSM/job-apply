import { askOllama } from './client.js';
import { RankOutput, RankOutputSchema } from '../lib/validation.js';

export interface JobInput {
  title: string;
  company: string;
  description: string;
}

// Rank a job against user profile
export async function rankJob(job: JobInput, profile: string): Promise<RankOutput> {
  const prompt = `You are a job fit analyzer for a software engineer.

CANDIDATE PROFILE:
${profile}

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Description:
${job.description}

Analyze how well this job matches the candidate's profile. Provide:
1. fitScore: A number from 0-100 indicating match quality
2. reasons: Array of brief reasons why this is or isn't a good fit (keep each reason under 15 words)
3. mustHaves: Array of key requirements mentioned in the job posting
4. blockers: Array of potential dealbreakers or concerns

Keep all text terse and factual. Focus on technical skills, experience level, and role type.

Schema RankOutput = {
  "fitScore": number,
  "reasons": string[],
  "mustHaves": string[],
  "blockers": string[]
}`;

  const result = await askOllama<RankOutput>(prompt, 'RankOutput', {
    temperature: 0.1 // Lower temperature for more consistent scoring
  });

  // Validate with Zod
  const validated = RankOutputSchema.parse(result);
  return validated;
}


