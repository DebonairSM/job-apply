/**
 * Email template generation for lead outreach
 */

export interface Lead {
  id: string;
  name: string;
  title?: string;
  company?: string;
  about?: string;
  email?: string;
  worked_together?: string;
}

export interface EmailContent {
  to: string;
  subject: string;
  body: string;
  referralLink?: string;
}

const SIGNATURE = `Rommel Bandeira
Service Manager | Agent Master
VSol Software
(352) 397-8650
info@vsol.software
www.vsol.software`;

const REFERRAL_SALT = 'VSOL';
const REFERRAL_BASE_URL = 'https://vsol.software/referral';

/**
 * Encode referrer information using Base64 with salt
 */
function encodeReferrerInfo(firstName: string, lastName: string): string {
  const data = `${REFERRAL_SALT}:${firstName}:${lastName}`;
  return btoa(data);
}

/**
 * Generate referral link for a lead
 */
function generateReferralLink(lead: Lead): string {
  const parts = lead.name.trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  
  const encoded = encodeReferrerInfo(firstName, lastName);
  return `${REFERRAL_BASE_URL}?ref=${encoded}`;
}

/**
 * Add referral program section to email body
 */
function addReferralSection(body: string, referralLink: string): string {
  const referralSection = `P.S. If you're not the right person for this conversation, I'd appreciate a referral! Use this link to refer someone who might benefit:
${referralLink}

Anyone you refer who becomes a client will receive my thanks and recognition.`;
  
  // Insert referral section before signature
  const signatureIndex = body.indexOf(SIGNATURE);
  if (signatureIndex !== -1) {
    return body.substring(0, signatureIndex) + referralSection + '\n\n' + body.substring(signatureIndex);
  }
  
  // Fallback: append to end
  return body + '\n\n' + referralSection;
}

/**
 * Generate personalized outreach email for a lead
 */
export function generateOutreachEmail(lead: Lead, includeReferral?: boolean): EmailContent {
  if (!lead.email) {
    throw new Error(`Lead ${lead.name} does not have an email address`);
  }

  const firstName = extractFirstName(lead.name);
  const subject = generateSubject(lead);
  let body = generateBody(lead, firstName);
  let referralLink: string | undefined;

  // Add referral section if requested
  if (includeReferral) {
    referralLink = generateReferralLink(lead);
    body = addReferralSection(body, referralLink);
  }

  return {
    to: lead.email,
    subject,
    body,
    referralLink
  };
}

/**
 * Extract first name from full name
 */
function extractFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || fullName;
}

/**
 * Generate email subject line
 */
function generateSubject(lead: Lead): string {
  if (lead.company) {
    return `Quick question about ${lead.company}'s workflow automation`;
  }
  return `Quick question about workflow automation`;
}

/**
 * Generate personalized email body
 */
function generateBody(lead: Lead, firstName: string): string {
  const intro = `Hello ${firstName},`;
  
  const mainPitch = `I hope you are well. I'd love to share a new business model I've been developing and get your feedback.

It automates everyday workflows, especially those built around spreadsheets, using AI-assisted development. We deliver high-fidelity mockups and an MVP in one week at no cost, then evolve the system with local-first AI insights that continuously improve performance.

It's a tailored, secure, open-source, local-first platform that can cut costs by up to 100x while giving organizations full control of their data. Over time, I also train an internal technical leader to build and test proof-of-concept features in a gated CI/CD pipeline.`;

  const personalizedContext = generatePersonalizedContext(lead);
  
  const closing = `Would you have a few minutes this week to talk?

Best regards,

${SIGNATURE}`;

  return `${intro}

${mainPitch}

${personalizedContext}

${closing}`;
}

/**
 * Generate personalized context based on lead information
 */
function generatePersonalizedContext(lead: Lead): string {
  const parts: string[] = [];
  
  // Build the context sentence
  let contextSentence = 'Given your background';
  
  // Add role and company
  if (lead.title && lead.company) {
    contextSentence += ` as ${lead.title} at ${lead.company}`;
  } else if (lead.title) {
    contextSentence += ` as ${lead.title}`;
  } else if (lead.company) {
    contextSentence += ` at ${lead.company}`;
  }
  
  // Add worked together context if available
  if (lead.worked_together) {
    contextSentence += `, and our time working together at ${lead.worked_together}`;
  }
  
  // Add relevant experience from about section if available
  const relevantExperience = extractRelevantExperience(lead.about);
  if (relevantExperience) {
    contextSentence += `, ${relevantExperience}`;
  }
  
  contextSentence += ", I'd really value your perspective.";
  
  return contextSentence;
}

/**
 * Extract relevant experience keywords from about section
 */
function extractRelevantExperience(about?: string): string | null {
  if (!about) return null;
  
  const aboutLower = about.toLowerCase();
  const relevantKeywords = [
    'scalable',
    'platform',
    'automation',
    'workflow',
    'entrepreneur',
    'founder',
    'leadership',
    'technical',
    'software',
    'innovation',
    'transformation',
    'digital'
  ];
  
  // Check for relevant keywords
  const found = relevantKeywords.filter(keyword => aboutLower.includes(keyword));
  
  if (found.length >= 2) {
    return 'and your passion for innovation and scalability';
  } else if (found.includes('entrepreneur') || found.includes('founder')) {
    return 'and your entrepreneurial experience';
  } else if (found.includes('leadership')) {
    return 'and your leadership experience';
  } else if (found.includes('technical')) {
    return 'and your technical expertise';
  }
  
  return null;
}

/**
 * Create mailto link with proper URL encoding
 */
export function createMailtoLink(email: EmailContent): string {
  const subject = encodeURIComponent(email.subject);
  const body = encodeURIComponent(email.body);
  
  // Check if the mailto link might be too long (common limit is ~2000 chars)
  const mailtoUrl = `mailto:${email.to}?subject=${subject}&body=${body}`;
  
  if (mailtoUrl.length > 2000) {
    console.warn('mailto link may be too long for some email clients:', mailtoUrl.length, 'chars');
  }
  
  return mailtoUrl;
}

/**
 * Generate emails for multiple leads
 */
export function generateBulkEmails(leads: Lead[], referralEnabled?: Map<string, boolean>): EmailContent[] {
  return leads
    .filter(lead => lead.email) // Only include leads with emails
    .map(lead => {
      try {
        const includeReferral = referralEnabled?.get(lead.id) ?? false;
        return generateOutreachEmail(lead, includeReferral);
      } catch (error) {
        console.error(`Error generating email for ${lead.name}:`, error);
        return null;
      }
    })
    .filter((email): email is EmailContent => email !== null);
}

