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
  background?: string; // AI-generated professional background for email use
  profile?: string; // Lead profile (chiefs, founders, directors, etc.)
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
const SPREADSHEET_AUTOMATION_URL = 'https://vsol.software/agentic#featured-product';
const BOOKING_URL = 'https://calendly.com/vsol-software/discovery'; // Update with actual booking URL

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
 * Routes to profile-specific template or falls back to generic template
 */
export function generateOutreachEmail(lead: Lead, includeReferral?: boolean, profileKey?: string): EmailContent {
  if (!lead.email) {
    throw new Error(`Lead ${lead.name} does not have an email address`);
  }

  // Use profileKey parameter if provided, otherwise use lead's profile, or default to generic
  const profile = profileKey || lead.profile;

  const firstName = extractFirstName(lead.name);
  let subject: string;
  let body: string;

  // Route to profile-specific template
  if (profile === 'chiefs') {
    subject = generateChiefsSubject(lead);
    body = generateChiefsBody(lead, firstName);
  } else {
    // Default to generic template for all other profiles
    subject = generateGenericSubject(lead);
    body = generateGenericBody(lead, firstName);
  }

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

// =============================================================================
// GENERIC TEMPLATE (default for all profiles except chiefs)
// =============================================================================

/**
 * Generate email subject line for generic template
 */
function generateGenericSubject(lead: Lead): string {
  if (lead.company) {
    return `Quick question about ${lead.company}'s workflow automation`;
  }
  return `Quick question about workflow automation`;
}

/**
 * Generate personalized email body for generic template
 */
function generateGenericBody(lead: Lead, firstName: string): string {
  const intro = `Hello ${firstName},`;
  
  const personalizedContext = generatePersonalizedContext(lead);
  
  const mainPitch = `I'd love to share a new business model I've been developing and get your feedback.

It automates everyday workflows, especially those built around spreadsheets, using AI-assisted development. We deliver high-fidelity mockups and an MVP in one week at no cost, then evolve the system with local-first AI insights that continuously improve performance.

It's a tailored, secure, open-source, local-first platform that can cut costs by up to 100x while giving organizations full control of their data. Over time, I also train an internal technical leader to build and test proof-of-concept features in a gated CI/CD pipeline.`;
  
  const closing = `Would you have a few minutes this week to talk?

Best regards,

${SIGNATURE}`;

  return `${intro}

${personalizedContext}

${mainPitch}

${closing}`;
}

// =============================================================================
// CHIEFS TEMPLATE (C-level executives - Spreadsheet Automation focus)
// =============================================================================

/**
 * Generate email subject line for chiefs profile
 */
function generateChiefsSubject(lead: Lead): string {
  if (lead.company) {
    return `Quick question about ${lead.company}'s spreadsheet workflows`;
  }
  return `Quick question about spreadsheet workflow automation`;
}

/**
 * Generate personalized email body for chiefs profile
 */
function generateChiefsBody(lead: Lead, firstName: string): string {
  const intro = `Hello ${firstName},`;
  
  const personalizedContext = generatePersonalizedContext(lead);
  
  const mainPitch = `I'd like to share our Spreadsheet Automation Platform with you.

We transform manual spreadsheet workflows into automated systems with AI-generated interactive mockups delivered during discovery calls. We analyze your current processes, design streamlined solutions, and provide working demonstrations same-day. Complete with workflow documentation, ROI analysis, and deployment-ready prototypes.

Our approach uses AI-assisted development to create tailored, secure, open-source, local-first solutions that can cut costs by up to 100x while giving organizations full control of their data. Over time, we also train an internal technical leader to build and test proof-of-concept features in a gated CI/CD pipeline.

Learn more about the Spreadsheet Automation Platform:
${SPREADSHEET_AUTOMATION_URL}`;
  
  const closing = `Would you have time this week to discuss how this could benefit ${lead.company || 'your organization'}?

Or book a meeting directly:
${BOOKING_URL}

Best regards,

${SIGNATURE}`;

  return `${intro}

${personalizedContext}

${mainPitch}

${closing}`;
}

/**
 * Generate personalized context based on lead information
 */
function generatePersonalizedContext(lead: Lead): string {
  // Use AI-generated background if available (preferred)
  if (lead.background) {
    return lead.background;
  }
  
  // Fallback to old logic if background hasn't been generated yet
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
  
  contextSentence += ", I thought you might be interested in this opportunity.";
  
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

