import { askOllama } from './client.js';
import { AnswersOutput, sanitizeAnswers } from '../lib/validation.js';
import { loadConfig } from '../lib/session.js';
import { getAnswers, cacheAnswers } from '../lib/db.js';

// Synthesize answers for a job application
export async function synthesizeAnswers(
  jobId: string,
  jobTitle: string,
  jobDescription: string,
  profile: string
): Promise<AnswersOutput> {
  // Check cache first
  const cached = getAnswers(jobId);
  if (cached) {
    return {
      answers: JSON.parse(cached.json),
      resumeVariant: cached.resume_variant
    };
  }

  // Generate new answers
  const config = loadConfig();
  
  const prompt = `You are an application form filler. Generate concise, factual answers for a job application.

CANDIDATE PROFILE:
${profile}

CANDIDATE INFO:
Name: ${config.fullName}
Email: ${config.email}
Phone: ${config.phone}
City: ${config.city}
LinkedIn: ${config.linkedinProfile}
Work Authorization: ${config.workAuthorization}
Requires Sponsorship: ${config.requiresSponsorship}
Years .NET: ${config.yearsDotnet}
Years Azure: ${config.yearsAzure}

JOB POSTING:
Title: ${jobTitle}
Description:
${jobDescription}

AVAILABLE RESUME VARIANTS:
${config.resumeVariants.join(', ')}

INSTRUCTIONS:
1. Generate short, factual answers (no marketing language)
2. For "why_fit": write 2-3 sentences explaining fit based on job requirements (max 400 chars)
3. Select the best resume variant for this role
4. Keep all answers professional and concise

Return JSON matching this schema:
{
  "answers": {
    "full_name": string,
    "email": string,
    "phone": string,
    "city": string,
    "work_authorization": string,
    "requires_sponsorship": "Yes" or "No",
    "years_dotnet": string,
    "years_azure": string,
    "linkedin_url": string,
    "why_fit": string (max 400 chars),
    "salary_expectation": string (optional, use "Open" if not specified)
  },
  "resumeVariant": string (choose from available variants)
}`;

  const result = await askOllama<AnswersOutput>(prompt, 'AnswersOutput', {
    temperature: 0.2
  });

  // Validate and sanitize
  const sanitized = sanitizeAnswers(result);

  // Cache the results
  cacheAnswers(jobId, sanitized.answers, sanitized.resumeVariant);

  return sanitized;
}


