import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import mammoth from 'mammoth';
import { askOllama } from './client.js';

export interface ResumeSection {
  type: 'experience' | 'skill' | 'project' | 'education' | 'summary';
  title: string;
  content: string;
  company?: string;
  duration?: string;
  technologies?: string[];
}

export interface ParsedResume {
  sections: ResumeSection[];
  fullText: string;
  fileName: string;
}

// Cache for parsed resumes to avoid re-parsing
const resumeCache = new Map<string, ParsedResume>();

// Parse DOCX resume files
export async function parseResume(resumePath: string): Promise<ParsedResume> {
  // Check cache first
  if (resumeCache.has(resumePath)) {
    return resumeCache.get(resumePath)!;
  }

  if (!existsSync(resumePath)) {
    throw new Error(`Resume file not found: ${resumePath}`);
  }

  try {
    // Extract text from DOCX
    const result = await mammoth.extractRawText({ path: resumePath });
    const fullText = result.value;
    
    // Parse sections using AI
    const sections = await parseResumeSections(fullText);
    
    const parsedResume: ParsedResume = {
      sections,
      fullText,
      fileName: resumePath.split('/').pop() || resumePath
    };

    // Cache the result
    resumeCache.set(resumePath, parsedResume);
    
    return parsedResume;
  } catch (error) {
    throw new Error(`Failed to parse resume ${resumePath}: ${error}`);
  }
}

// Use AI to parse resume sections
async function parseResumeSections(fullText: string): Promise<ResumeSection[]> {
  const prompt = `Parse this resume text and extract structured information. Return ONLY a valid JSON array.

RESUME TEXT:
${fullText}

Extract sections with these types:
- "summary": Professional summary or objective
- "experience": Work experience entries
- "education": Education entries  
- "skill": Skills and technologies
- "project": Projects or achievements

For each section, provide:
- type: section type (required)
- title: section title or job title (required)
- content: main content/description (required)
- company: company name (optional, for experience)
- duration: time period (optional, for experience/education)
- technologies: array of technologies mentioned (optional)

IMPORTANT: Return ONLY valid JSON. No explanations, no markdown, no extra text.

Example format:
[
  {
    "type": "experience",
    "title": "Senior Software Engineer",
    "content": "Led development of microservices architecture",
    "company": "Tech Corp",
    "duration": "2020-2023",
    "technologies": ["C#", "Azure", "Docker"]
  }
]`;

  try {
    const result = await askOllama<ResumeSection[]>(prompt, 'ResumeSection[]', {
      temperature: 0.1
    });
    
    // Validate the result is an array of valid sections
    if (Array.isArray(result)) {
      return result.filter(section => 
        section && 
        typeof section === 'object' && 
        typeof section.type === 'string' && 
        typeof section.title === 'string' && 
        typeof section.content === 'string'
      );
    }
    
    return [];
  } catch (error) {
    console.warn('Failed to parse resume sections with AI, using fallback:', error);
    return createFallbackSections(fullText);
  }
}

// Fallback parsing when AI fails
function createFallbackSections(fullText: string): ResumeSection[] {
  const sections: ResumeSection[] = [];
  const lines = fullText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let currentSection: ResumeSection | null = null;
  
  for (const line of lines) {
    // Detect section headers
    if (line.match(/^(experience|work history|employment)/i)) {
      currentSection = { type: 'experience', title: line, content: '', company: '', duration: '' };
      sections.push(currentSection);
    } else if (line.match(/^(education|academic)/i)) {
      currentSection = { type: 'education', title: line, content: '', duration: '' };
      sections.push(currentSection);
    } else if (line.match(/^(skills|technologies|technical skills)/i)) {
      currentSection = { type: 'skill', title: line, content: '', technologies: [] };
      sections.push(currentSection);
    } else if (line.match(/^(projects|portfolio)/i)) {
      currentSection = { type: 'project', title: line, content: '' };
      sections.push(currentSection);
    } else if (line.match(/^(summary|objective|profile)/i)) {
      currentSection = { type: 'summary', title: line, content: '' };
      sections.push(currentSection);
    } else if (currentSection) {
      // Add content to current section
      currentSection.content += (currentSection.content ? ' ' : '') + line;
    }
  }
  
  return sections;
}

// Find relevant resume bullets for a job using AI similarity
export async function findRelevantBullets(
  jobDescription: string,
  resumeSections: ResumeSection[],
  topK: number = 3
): Promise<string[]> {
  if (resumeSections.length === 0) return [];

  const prompt = `Find the most relevant resume content for this job description. Return the top ${topK} most relevant bullets.

JOB DESCRIPTION:
${jobDescription}

RESUME SECTIONS:
${resumeSections.map(s => `[${s.type.toUpperCase()}] ${s.title}: ${s.content}`).join('\n')}

Return JSON array of the most relevant content strings:
["Relevant bullet point 1", "Relevant bullet point 2", "Relevant bullet point 3"]`;

  try {
    const result = await askOllama<string[]>(prompt, 'string[]', {
      temperature: 0.1
    });
    
    return Array.isArray(result) ? result.slice(0, topK) : [];
  } catch (error) {
    console.warn('Failed to find relevant bullets with AI:', error);
    return [];
  }
}

// Enhance "why_fit" with resume content
export async function enhanceWhyFit(
  baseAnswer: string,
  jobDescription: string,
  resumePath?: string
): Promise<string> {
  if (!resumePath) return baseAnswer;

  try {
    const resume = await parseResume(resumePath);
    const relevantBullets = await findRelevantBullets(jobDescription, resume.sections, 2);
    
    if (relevantBullets.length === 0) return baseAnswer;

    const prompt = `Enhance this "why fit" answer by incorporating relevant resume content.

ORIGINAL ANSWER:
${baseAnswer}

RELEVANT RESUME CONTENT:
${relevantBullets.join('\n')}

JOB DESCRIPTION:
${jobDescription.substring(0, 500)}

CRITICAL: Create an enhanced answer that:
1. MUST be under 400 characters (strictly enforced)
2. Incorporates 1-2 specific resume achievements
3. Uses factual, professional language
4. Focuses on the strongest fit points

IMPORTANT: Count characters carefully. If your answer approaches 400 chars, prioritize quality over quantity. Better to have 300 impactful characters than 400 mediocre ones.

Return ONLY a JSON object with this format:
{"answer": "your enhanced answer here (max 380 chars to be safe)"}`;

    const result = await askOllama<{ answer: string }>(prompt, 'EnhancedAnswer', {
      temperature: 0.2
    });
    
    return result?.answer || baseAnswer;
  } catch (error) {
    console.warn('Failed to enhance why_fit with resume content:', error);
    return baseAnswer;
  }
}

// Get all available resume files
export function getAvailableResumes(): string[] {
  const resumesDir = join(process.cwd(), 'resumes');
  if (!existsSync(resumesDir)) return [];
  
  const files = readdirSync(resumesDir)
    .filter(file => file.endsWith('.docx') || file.endsWith('.pdf'))
    .map(file => join(resumesDir, file));
    
  return files;
}

// Extract resume content and save to database
export async function extractResumeToDatabase(resumePath: string): Promise<number> {
  const db = require('../lib/db.js');
  const fileName = resumePath.split('/').pop() || resumePath.split('\\').pop() || resumePath;
  
  // Parse resume
  const resume = await parseResume(resumePath);
  
  // Save or update resume file metadata
  const resumeFileId = db.saveResumeFile({
    file_name: fileName,
    variant_type: detectVariantType(fileName),
    parsed_at: new Date().toISOString(),
    sections_extracted: resume.sections.length,
    is_active: true,
    full_text: resume.fullText
  });
  
  // Extract and save skills
  await syncResumeSkills(resume, resumeFileId);
  
  // Extract and save experience
  await syncResumeExperience(resume, resumeFileId);
  
  // Extract and save education
  await syncResumeEducation(resume, resumeFileId);
  
  return resumeFileId;
}

// Detect resume variant type from filename
function detectVariantType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes('senior')) return 'senior';
  if (lower.includes('lead')) return 'lead';
  if (lower.includes('architect')) return 'architect';
  if (lower.includes('api')) return 'api';
  if (lower.includes('backend')) return 'backend';
  if (lower.includes('fullstack') || lower.includes('full-stack')) return 'fullstack';
  return 'general';
}

// Sync skills from resume to database
export async function syncResumeSkills(resume: ParsedResume, resumeFileId: number): Promise<void> {
  const db = require('../lib/db.js');
  
  // Extract skills from skill sections
  const skillSections = resume.sections.filter(s => s.type === 'skill');
  
  for (const section of skillSections) {
    // Parse technologies from section
    const technologies = section.technologies || [];
    
    // Also parse from content
    const contentSkills = extractSkillsFromContent(section.content);
    const allSkills = [...new Set([...technologies, ...contentSkills])];
    
    for (const skillName of allSkills) {
      if (!skillName || skillName.length < 2) continue;
      
      db.saveUserSkill({
        skill_name: skillName,
        category: categorizeSkill(skillName),
        proficiency_level: null,
        years_experience: null,
        source: 'resume',
        resume_file_id: resumeFileId
      });
    }
  }
  
  // Also extract skills mentioned in experience sections
  const experienceSections = resume.sections.filter(s => s.type === 'experience');
  for (const exp of experienceSections) {
    if (exp.technologies) {
      for (const tech of exp.technologies) {
        db.saveUserSkill({
          skill_name: tech,
          category: categorizeSkill(tech),
          proficiency_level: null,
          years_experience: null,
          source: 'resume',
          resume_file_id: resumeFileId
        });
      }
    }
  }
}

// Extract skills from text content
function extractSkillsFromContent(content: string): string[] {
  const skills: string[] = [];
  
  // Common patterns
  const patterns = [
    /C#/g, /\.NET/g, /ASP\.NET/g, /Azure/g, /SQL\s*Server/g,
    /JavaScript/gi, /TypeScript/gi, /React/gi, /Node\.js/gi,
    /Docker/gi, /Kubernetes/gi, /Microservices/gi, /REST\s*API/gi,
    /Event-Driven/gi, /Message\s*Queue/gi, /Redis/gi, /MongoDB/gi,
    /AWS/gi, /GCP/gi, /DevOps/gi, /CI\/CD/gi, /Git/gi,
    /Python/gi, /Java\b/gi, /Go\b/gi, /Ruby/gi, /PHP/gi,
    /PostgreSQL/gi, /MySQL/gi, /GraphQL/gi, /OAuth/gi
  ];
  
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      skills.push(...matches);
    }
  }
  
  return [...new Set(skills)];
}

// Categorize skill into profile categories
function categorizeSkill(skillName: string): string {
  const lower = skillName.toLowerCase();
  
  if (lower.match(/azure|aws|gcp|cloud/)) return 'Azure/Cloud';
  if (lower.match(/c#|\.net|asp\.net/)) return '.NET';
  if (lower.match(/security|oauth|auth|ssl|tls/)) return 'Security';
  if (lower.match(/event|message|queue|kafka|rabbitmq|service bus/)) return 'Event-Driven';
  if (lower.match(/performance|cache|redis|optimization/)) return 'Performance';
  if (lower.match(/react|angular|vue|javascript|typescript|frontend/)) return 'Frontend';
  if (lower.match(/docker|kubernetes|devops|ci\/cd|jenkins|github actions/)) return 'DevOps';
  if (lower.match(/sql|database|postgresql|mysql|mongodb/)) return 'Database';
  if (lower.match(/api|rest|graphql|microservice/)) return 'API';
  
  return 'Other';
}

// Sync experience from resume to database
export async function syncResumeExperience(resume: ParsedResume, resumeFileId: number): Promise<void> {
  const db = require('../lib/db.js');
  
  const experienceSections = resume.sections.filter(s => s.type === 'experience');
  
  for (const exp of experienceSections) {
    db.saveUserExperience({
      company: exp.company || 'Unknown',
      title: exp.title,
      start_date: null,
      end_date: null,
      duration: exp.duration || null,
      description: exp.content,
      technologies: exp.technologies ? exp.technologies.join(', ') : null,
      achievements: null,
      resume_file_id: resumeFileId
    });
  }
}

// Sync education from resume to database
export async function syncResumeEducation(resume: ParsedResume, resumeFileId: number): Promise<void> {
  const db = require('../lib/db.js');
  
  const educationSections = resume.sections.filter(s => s.type === 'education');
  
  for (const edu of educationSections) {
    db.saveUserEducation({
      institution: edu.title,
      degree: null,
      field: null,
      graduation_year: edu.duration || null,
      description: edu.content,
      resume_file_id: resumeFileId
    });
  }
}


