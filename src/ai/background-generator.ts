import { loadTechnicalConfig } from '../lib/session.js';
import { generateWithOllama, isOllamaHealthy } from './ollama-client.js';

/**
 * Generate a professional email-friendly background description from a lead's title and about section
 * Uses a smarter model (qwen2.5:14b) for better writing quality
 * Includes timeout and retry logic for reliability
 */
export async function generateLeadBackground(title: string, about?: string): Promise<string> {
  const config = loadTechnicalConfig();
  
  // Build the prompt based on available information
  let prompt = '';
  
  const campaignContext = `
Campaign Context:
- We offer: ${config.campaign.solution}
- Common pain points we address: ${config.campaign.painPoints.join(', ')}
- This campaign targets: ${config.campaign.targetPersonas.join(', ')}
`;

  if (title && about) {
    prompt = `You are an expert at writing professional, personalized email introductions.

Given a person's LinkedIn title and about section, create a natural 1 sentence acknowledgment that connects their expertise to our campaign offering. This will be the opening line of an outreach email, right after "Hello [Name],"

Title: ${title}

About: ${about}

${campaignContext}

Requirements:
- Use natural, conversational openers such as: "I noticed your work in...", "With your background in...", "Given your role leading...", "Your experience as...", "From your background as..."
- Reference their actual role and expertise from the title/about
- Subtly connect their background to why our campaign would be relevant to them (without being too salesy)
- For example: "I noticed your work driving digital transformation and thought our approach to workflow automation might interest you." or "With your background in operations, you've likely encountered challenges with manual processes."
- Keep it brief and genuine - MAXIMUM 1 sentence
- End the sentence naturally (period, not a question)
- Do NOT use phrases like "I hope this message finds you well" or other filler
- Do NOT ask questions or make explicit asks - this is just acknowledging their expertise and making a subtle connection
- Do NOT use placeholder brackets like [industry/field] - make reasonable assumptions or use general terms
- Do NOT include meta-commentary like "Here's a possible email introduction:" or "Email introduction:" - output ONLY the sentence itself
- Output ONLY the acknowledgment sentence - nothing else

Your response must be ONLY the sentence, with NO preamble or labels:`;
  } else if (title) {
    prompt = `You are an expert at writing professional, personalized email introductions.

Given a person's LinkedIn title, create a natural 1 sentence acknowledgment that connects their expertise to our campaign offering. This will be the opening line of an outreach email, right after "Hello [Name],"

Title: ${title}

${campaignContext}

Requirements:
- Use natural, conversational openers such as: "I noticed your work as...", "With your background in...", "Given your role as...", "Your experience as...", "From your role as..."
- Reference their actual role/expertise from the title
- Subtly connect their background to why our campaign would be relevant to them (without being too salesy)
- For example: "I noticed your work as CTO and thought our AI-assisted automation approach might interest you." or "With your background in innovation leadership, you've likely dealt with the challenges of manual processes."
- Keep it brief and genuine - MAXIMUM 1 sentence
- End the sentence naturally (period, not a question)
- Do NOT use phrases like "I hope this message finds you well" or other filler
- Do NOT ask questions or make explicit asks - this is just acknowledging their expertise and making a subtle connection
- Do NOT use placeholder brackets like [industry/field] - make reasonable assumptions or use general terms
- Do NOT include meta-commentary like "Here's a possible email introduction:" or "Email introduction:" - output ONLY the sentence itself
- Output ONLY the acknowledgment sentence - nothing else

Your response must be ONLY the sentence, with NO preamble or labels:`;
  } else {
    // No title or about - return a generic fallback
    return "Given your background and expertise, I thought you might be interested in this opportunity.";
  }

  // Check if Ollama is healthy before attempting generation
  const isHealthy = await isOllamaHealthy();
  if (!isHealthy) {
    console.warn('Ollama is not available, using fallback template immediately');
    if (title) {
      const titleWords = title.split(/[|,]/).map(s => s.trim());
      const mainRole = titleWords[0] || title;
      return `I noticed your work as ${mainRole} and thought you might be interested in this.`;
    }
    return "I came across your background and thought you might be interested in this opportunity.";
  }

  try {
    // Generate using Ollama with automatic retry and timeout handling
    const generated = await generateWithOllama(prompt, {
      model: config.backgroundGenModel,
      temperature: 0.7,
      top_p: 0.9,
      top_k: 50,
    });

    // Clean up the response - remove any markdown formatting or extra quotes
    let cleaned = generated
      .replace(/^["']|["']$/g, '') // Remove leading/trailing quotes
      .replace(/^\*\*|\*\*$/g, '') // Remove leading/trailing bold
      .replace(/^Here'?s (a |the |an )?(potential|possible|sample|example)? ?(email )?(introduction|acknowledgment|sentence|opening):\s*/gi, '') // Remove meta preamble at start
      .replace(/\n+Here'?s (a |the |an )?(potential|possible|sample|example)? ?(email )?(introduction|acknowledgment|sentence|opening):[\s\S]*/gi, '') // Remove meta preamble after newlines
      .replace(/^(Email |Possible |Potential )?(introduction|acknowledgment|sentence):\s*/gi, '') // Remove label
      .replace(/\n\nThis (introduction|acknowledgment|sentence):[\s\S]*$/i, '') // Remove explanatory footer
      .replace(/\n\n\*[\s\S]*$/i, '') // Remove bullet point explanations
      .trim();

    // If the response is too long (more than 1 sentence), take just the first sentence
    const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
    if (sentences.length > 1) {
      cleaned = sentences[0].trim();
    }

    return cleaned;
  } catch (error) {
    // Ollama failed after all retries, use fallback template
    console.error('Failed to generate background with Ollama, using fallback template');
    console.error('Error:', error);

    if (title) {
      // Extract key words from title (simple heuristic)
      const titleWords = title.split(/[|,]/).map(s => s.trim());
      const mainRole = titleWords[0] || title;
      return `I noticed your work as ${mainRole} and thought you might be interested in this.`;
    }

    return "I came across your background and thought you might be interested in this opportunity.";
  }
}
