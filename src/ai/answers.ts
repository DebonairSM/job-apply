import { askOllama } from './client.js';
import { AnswersOutput, sanitizeAnswers } from '../lib/validation.js';
import { loadConfig } from '../lib/session.js';
import { 
  getAnswers, 
  cacheAnswers, 
  getCommonAnswer,
  getUserSkills,
  getUserExperience,
  getUserEducation,
  getResumeDataSummary
} from '../lib/db.js';
import { enhanceWhyFit, parseResume } from './rag.js';

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

  // Load config (now from database)
  const config = loadConfig();
  
  // Load common answers from database
  const commonAnswers = {
    salary_expectation: getCommonAnswer('salary_expectation')?.answer_text || 'Open',
    remote_preference: getCommonAnswer('remote_preference')?.answer_text,
    start_date: getCommonAnswer('start_date')?.answer_text
  };
  
  // Get resume content for enhanced answers
  // HYBRID APPROACH: Check database first, fall back to parsing if needed
  let resumeContent = '';
  let selectedResumeVariant = config.resumeVariants[0];
  
  try {
    // Check if we have resume data in database
    const summary = getResumeDataSummary();
    
    if (summary.skillCount > 0 || summary.experienceCount > 0) {
      // Use database data (fast, no AI calls)
      console.log('Using resume data from database');
      
      const skills = getUserSkills();
      const experience = getUserExperience();
      const education = getUserEducation();
      
      // Build resume content from database
      const resumeParts: string[] = [];
      
      if (skills.length > 0) {
        const skillsByCategory = skills.reduce((acc, skill) => {
          const cat = skill.category || 'Other';
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(skill.skill_name);
          return acc;
        }, {} as Record<string, string[]>);
        
        resumeParts.push('[SKILLS]');
        Object.entries(skillsByCategory).forEach(([category, skillList]) => {
          resumeParts.push(`${category}: ${skillList.join(', ')}`);
        });
      }
      
      if (experience.length > 0) {
        resumeParts.push('\n[EXPERIENCE]');
        experience.forEach(exp => {
          resumeParts.push(`${exp.title} at ${exp.company}${exp.duration ? ` (${exp.duration})` : ''}`);
          if (exp.description) {
            resumeParts.push(exp.description);
          }
          if (exp.technologies) {
            resumeParts.push(`Technologies: ${exp.technologies}`);
          }
        });
      }
      
      if (education.length > 0) {
        resumeParts.push('\n[EDUCATION]');
        education.forEach(edu => {
          resumeParts.push(`${edu.degree || ''} ${edu.field || ''} - ${edu.institution}`);
        });
      }
      
      if (resumeParts.length > 0) {
        resumeContent = `\n\nRESUME CONTENT:\n${resumeParts.join('\n')}`;
      }
    } else {
      // Fall back to parsing resume files (with caching)
      const { getResumeCache, saveResumeCache } = await import('../lib/db.js');
      
      // Try cache first (key by first resume variant)
      const cacheKey = config.resumeVariants[0];
      const cached = getResumeCache(cacheKey);
      
      if (cached && cached.sections) {
        console.log(`[DEBUG] Using cached resume parse for ${cacheKey}`);
        resumeContent = `\n\nRESUME CONTENT:\n${cached.sections.map((s: any) => 
          `[${s.type.toUpperCase()}] ${s.title}: ${s.content}`
        ).join('\n')}`;
      } else {
        console.log('Database cache miss, parsing resume files');
        
        const resumePath = config.resumeVariants.length > 0 
          ? `${process.cwd()}/resumes/${config.resumeVariants[0]}`
          : null;
          
        if (resumePath) {
          const resume = await parseResume(resumePath);
          if (resume.sections && resume.sections.length > 0) {
            // Save to cache for next time
            saveResumeCache(cacheKey, resume.sections);
            resumeContent = `\n\nRESUME CONTENT:\n${resume.sections.map(s => 
              `[${s.type.toUpperCase()}] ${s.title}: ${s.content}`
            ).join('\n')}`;
          }
        }
      }
      
      // Select best resume variant based on job requirements
      if (config.resumeVariants.length > 1) {
        selectedResumeVariant = await selectBestResumeVariant(jobTitle, jobDescription, config.resumeVariants);
      }
    }
  } catch (error) {
    console.warn('Failed to get resume content:', error);
    // Continue without resume content - system will still work with basic info
  }
  
  // Most answers come directly from database - only generate why_fit with AI
  const prompt = `Generate a "why_fit" answer for this job application based on the candidate's profile and the job requirements.

CANDIDATE PROFILE:
${profile}

CANDIDATE INFO:
Name: ${config.fullName}
Email: ${config.email}
Phone: ${config.phone}
LinkedIn: ${config.linkedinProfile}
Years .NET: ${config.yearsDotnet}
Years Azure: ${config.yearsAzure}${resumeContent}

JOB POSTING:
Title: ${jobTitle}
Description:
${jobDescription}

INSTRUCTIONS:
1. Write 2-3 sentences explaining why the candidate is a good fit
2. Reference specific skills and experience from the resume that match job requirements
3. Keep it factual and professional (no marketing language)
4. Maximum 400 characters
5. Focus on technical alignment and relevant experience

Return ONLY a JSON object with this format:
{
  "why_fit": "your answer here (max 400 chars)"
}`;

  // Generate only why_fit with AI
  const result = await askOllama<{ why_fit: string }>(prompt, 'WhyFitAnswer', {
    temperature: 0.2
  });

  let whyFit = result?.why_fit || '';
  
  // Truncate if too long
  if (whyFit.length > 400) {
    const truncated = whyFit.substring(0, 400);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastPeriod > 300) {
      whyFit = truncated.substring(0, lastPeriod + 1);
    } else if (lastSpace > 350) {
      whyFit = truncated.substring(0, lastSpace);
    } else {
      whyFit = truncated;
    }
  }
  
  // Enhance "why_fit" with resume content if available
  if (whyFit && config.resumeVariants.length > 0) {
    try {
      const resumePath = `${process.cwd()}/resumes/${selectedResumeVariant}`;
      const enhancedWhyFit = await enhanceWhyFit(
        whyFit,
        jobDescription,
        resumePath
      );
      
      // Ensure enhanced version doesn't exceed 400 chars
      if (enhancedWhyFit.length > 400) {
        const truncated = enhancedWhyFit.substring(0, 400);
        const lastPeriod = truncated.lastIndexOf('.');
        const lastSpace = truncated.lastIndexOf(' ');
        
        if (lastPeriod > 300) {
          whyFit = truncated.substring(0, lastPeriod + 1);
        } else if (lastSpace > 350) {
          whyFit = truncated.substring(0, lastSpace);
        } else {
          whyFit = truncated;
        }
      } else {
        whyFit = enhancedWhyFit;
      }
    } catch (error) {
      console.warn('Failed to enhance why_fit with resume content:', error);
    }
  }

  // Construct complete answers from database + AI-generated why_fit
  const answers = {
    full_name: config.fullName,
    first_name: config.firstName,
    last_name: config.lastName,
    email: config.email,
    phone: config.phone,
    city: config.city,
    work_authorization: config.workAuthorization,
    requires_sponsorship: config.requiresSponsorship,
    years_dotnet: config.yearsDotnet,
    years_azure: config.yearsAzure,
    linkedin_url: config.linkedinProfile,
    why_fit: whyFit,
    salary_expectation: commonAnswers.salary_expectation
  };
  
  console.log('[DEBUG] Profile data being used:');
  console.log(`  Name: ${config.fullName}`);
  console.log(`  Email: ${config.email}`);
  console.log(`  Phone: ${config.phone}`);
  console.log(`  City: ${config.city}`);

  const output: AnswersOutput = {
    answers,
    resumeVariant: selectedResumeVariant
  };

  // Validate and sanitize
  const sanitized = sanitizeAnswers(output);

  // Cache the results
  cacheAnswers(jobId, sanitized.answers, sanitized.resumeVariant);

  return sanitized;
}

// Select the best resume variant based on job requirements
async function selectBestResumeVariant(
  jobTitle: string,
  jobDescription: string,
  resumeVariants: string[]
): Promise<string> {
  if (resumeVariants.length <= 1) {
    return resumeVariants[0] || '';
  }

  const prompt = `Select the best resume variant for this job application. Return ONLY the filename.

JOB TITLE: ${jobTitle}
JOB DESCRIPTION: ${jobDescription}

AVAILABLE RESUME VARIANTS:
${resumeVariants.map((variant, i) => `${i + 1}. ${variant}`).join('\n')}

Consider:
- Job requirements and technologies mentioned
- Role seniority level
- Industry focus
- Specific skills needed

IMPORTANT: Return ONLY the filename of the best resume variant. No explanations, no quotes, no extra text.

Example: Senior-Developer.docx`;

  try {
    const result = await askOllama<string>(prompt, 'string', {
      temperature: 0.1
    });
    
    // Handle LLM returning object instead of string
    let resultString: string;
    if (typeof result === 'object' && result !== null) {
      // Extract filename from object (LLM may return {filename: "..."})
      resultString = (result as any).filename || 
                     (result as any).name || 
                     (result as any).resume ||
                     JSON.stringify(result);
    } else {
      resultString = typeof result === 'string' ? result : String(result || '');
    }
    
    // Clean up common LLM artifacts
    resultString = resultString.trim()
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/^File(name)?:\s*/i, '') // Remove "Filename:" prefix
      .replace(/^Resume:\s*/i, ''); // Remove "Resume:" prefix
    
    console.log(`[DEBUG] AI selected resume: "${resultString}"`);
    console.log(`[DEBUG] Available resumes: ${JSON.stringify(resumeVariants)}`);
    
    // Validate the result is one of the available variants
    const selectedVariant = resumeVariants.find(variant => 
      variant.toLowerCase().includes(resultString.toLowerCase()) ||
      resultString.toLowerCase().includes(variant.toLowerCase())
    );
    
    if (!selectedVariant) {
      console.warn(`[DEBUG] AI returned invalid resume "${resultString}", using default: ${resumeVariants[0]}`);
    } else {
      console.log(`[DEBUG] Matched to: "${selectedVariant}"`);
    }
    
    return selectedVariant || resumeVariants[0];
  } catch (error) {
    console.warn('Failed to select best resume variant:', error);
    return resumeVariants[0];
  }
}


