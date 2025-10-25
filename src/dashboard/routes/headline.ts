import { Request, Response } from 'express';
import { loadConfig } from '../../lib/session.js';

export async function generateHeadline(req: Request, res: Response) {
  try {
    const { 
      jobTitle, 
      company, 
      description, 
      fitReasons, 
      mustHaves, 
      categoryScores 
    } = req.body;

    if (!jobTitle || !company) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const config = loadConfig();

    // Generate headline summary using AI
    const headline = await generateAIHeadline({
      jobTitle,
      company,
      description,
      fitReasons: fitReasons || [],
      mustHaves: mustHaves || [],
      categoryScores: categoryScores || {},
      profileSummary: config.profileSummary
    });

    res.json({ headline });
  } catch (error) {
    console.error('Error generating headline:', error);
    res.status(500).json({ error: 'Failed to generate headline' });
  }
}

async function generateAIHeadline({
  jobTitle,
  company,
  description,
  fitReasons,
  mustHaves,
  categoryScores,
  profileSummary
}: {
  jobTitle: string;
  company: string;
  description?: string;
  fitReasons: string[];
  mustHaves: string[];
  categoryScores: Record<string, number>;
  profileSummary: string;
}) {
  const prompt = `Generate a professional headline summary for a job application. This is a one-sentence summary that goes in job application forms to introduce the candidate.

CANDIDATE PROFILE:
${profileSummary}

JOB:
Title: ${jobTitle}
Company: ${company}
${description ? `Description: ${description.substring(0, 500)}` : ''}

FIT ANALYSIS:
${fitReasons.length > 0 ? `Fit Reasons: ${fitReasons.join(', ')}` : ''}
${mustHaves.length > 0 ? `Key Requirements: ${mustHaves.slice(0, 3).join(', ')}` : ''}

INSTRUCTIONS:
1. Write ONE professional sentence (max 150 characters)
2. Use natural, conversational language - NOT technical jargon or AI-generated phrases
3. Focus on value and impact, not buzzwords
4. Mention your key expertise and what you bring to the role
5. Make it sound like a human wrote it, not an AI

Output ONLY the headline text. No quotes, no markdown, no explanation - just the headline sentence.`;

  // Call Ollama API directly for plain text output
  const config = loadConfig();
  const response = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.llmModel,
      prompt: prompt,
      options: {
        temperature: 0.7
      },
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { response: string };
  return data.response.trim();
}
