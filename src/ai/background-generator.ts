import { loadTechnicalConfig } from '../lib/session.js';

/**
 * Generate a professional email-friendly background description from a lead's title and about section
 * Uses a smarter model (qwen2.5:14b) for better writing quality
 */
export async function generateLeadBackground(title: string, about?: string): Promise<string> {
  const config = loadTechnicalConfig();
  
  // Build the prompt based on available information
  let prompt = '';
  
  if (title && about) {
    prompt = `You are an expert at writing professional, personalized email introductions.

Given a person's LinkedIn title and about section, create a natural 1-2 sentence introduction that would work well in a professional outreach email.

Title: ${title}

About: ${about}

Requirements:
- Start with "Given your background as" or similar natural phrasing
- Be specific and reference their actual expertise
- Keep it conversational and genuine, not generic
- Maximum 2 sentences
- End with something that invites engagement like "I'd really value your perspective" or "I'd love to hear your thoughts"
- Do NOT use phrases like "I hope this message finds you well" or other filler

Generate the email introduction:`;
  } else if (title) {
    prompt = `You are an expert at writing professional, personalized email introductions.

Given a person's LinkedIn title, create a natural 1-2 sentence introduction that would work well in a professional outreach email.

Title: ${title}

Requirements:
- Start with "Given your background as" or "Given your experience in" or similar natural phrasing
- Be specific and reference their actual role/expertise from the title
- Keep it conversational and genuine, not generic
- Maximum 2 sentences
- End with something that invites engagement like "I'd really value your perspective" or "I'd love to hear your thoughts"
- Do NOT use phrases like "I hope this message finds you well" or other filler

Generate the email introduction:`;
  } else {
    // No title or about - return a generic fallback
    return "Given your background, I'd really value your perspective on this opportunity.";
  }

  try {
    // Call Ollama API with the background generation model
    const response = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.backgroundGenModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7, // Higher temperature for more natural writing
          top_p: 0.9,
          top_k: 50,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const generated = data.response?.trim() || '';

    if (!generated) {
      throw new Error('Empty response from LLM');
    }

    // Clean up the response - remove any markdown formatting or extra quotes
    let cleaned = generated
      .replace(/^["']|["']$/g, '') // Remove leading/trailing quotes
      .replace(/^\*\*|\*\*$/g, '') // Remove leading/trailing bold
      .trim();

    // If the response is too long (more than 3 sentences), take just the first 2
    const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
    if (sentences.length > 2) {
      cleaned = sentences.slice(0, 2).join(' ').trim();
    }

    return cleaned;
  } catch (error) {
    console.error('Error generating background:', error);
    
    // Fallback to a simple template based on title
    if (title) {
      // Extract key words from title (simple heuristic)
      const titleWords = title.split(/[|,]/).map(s => s.trim());
      const mainRole = titleWords[0] || title;
      return `Given your background as ${mainRole}, I'd really value your perspective.`;
    }
    
    return "Given your background, I'd really value your perspective on this opportunity.";
  }
}

