/**
 * Email template generation for lead outreach
 * 
 * This system provides:
 * - Type-safe email generation with LeadProfile and EmailContext
 * - Natural, conversational copy with smooth transitions
 * - Backward compatibility with existing Lead interface
 * - Profile-specific templates (chiefs, generic)
 */

// =============================================================================
// NEW TYPE-SAFE API
// =============================================================================

export interface LeadProfile {
  firstName: string;
  lastName?: string;
  roleTitle: string;
  companyName: string;
  industry?: string;
  keyInitiatives?: string[];
  primaryPainPoint?: string;
  city?: string;
  stateOrRegion?: string;
}

export interface EmailContext {
  lead: LeadProfile;
  productName: string;
  productUrl: string;
  calendlyUrl: string;
  referralUrl?: string;
}

export interface EmailOutput {
  subject: string;
  bodyText: string;
  bodyHtml?: string;
}

// Alias to match original specification naming
export type OutreachEmail = EmailOutput;

// =============================================================================
// LEGACY COMPATIBILITY TYPES
// =============================================================================

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

// =============================================================================
// CONSTANTS
// =============================================================================

const SIGNATURE = `Rommel Bandeira
Service Manager | Agent Master
VSol Software
(352) 397-8650
info@vsol.software
www.vsol.software`;

const REFERRAL_SALT = 'VSOL';
const REFERRAL_BASE_URL = 'https://vsol.software/referral';
const WORK_AUTOMATION_URL = 'https://vsol.software/agentic#featured-product';
const BOOKING_URL = 'https://calendly.com/vsol-software/discovery';

// =============================================================================
// NEW EMAIL BUILDER API
// =============================================================================

/**
 * Build outreach email with improved copy and natural transitions
 * 
 * @param ctx Email context with lead profile and product info
 * @param template Which template to use ('chiefs' or 'generic')
 * @returns Email with subject and body text
 */
export function buildOutreachEmail(
  ctx: EmailContext,
  template: 'chiefs' | 'generic' = 'generic'
): EmailOutput {
  if (template === 'chiefs') {
    return buildChiefsEmail(ctx);
  }
  return buildGenericEmail(ctx);
}

/**
 * Build chiefs template (C-level executives, work automation focus)
 */
function buildChiefsEmail(ctx: EmailContext): EmailOutput {
  const { lead } = ctx;
  
  // Subject line
  const subject = `Quick question about ${lead.companyName}'s workflow automation`;
  
  // Opening - problem framing
  const opening = buildProblemFraming(lead, 'chiefs');
  
  // Personal credibility statement
  const credibility = `It's incredibly satisfying to see your entire business run on automation. I just finished automating mine in a week — and even added a few "nice-to-haves" along the way.

Allow me to show you how we can do the same for yours.`;
  
  // Product pitch with natural bridge
  const pitch = `That's precisely where our Work Automation Platform brings value.

We specialize in transforming manual workflows — like those currently handled through spreadsheets, todo lists, manual calendars, and planners — into fully automated systems. During a brief discovery session, we analyze your current processes and present AI-generated interactive mockups in real time, followed by a same-day working demonstration of how the system would operate in your environment.

Every engagement includes workflow documentation, ROI analysis, and deployment-ready prototypes.

Our approach uses AI-assisted development to create tailored solutions. They're secure, open-source, and local-first, giving your organization full control of its data. The platform can reduce infrastructure costs significantly while improving reliability.

Over time, we train an internal technical leader to build and test new features in a gated CI/CD pipeline.

Learn more about the Work Automation Platform:
${ctx.productUrl}`;
  
  // Call to action (softened, dual options)
  const cta = `Is a brief conversation this week worth exploring?

You can reply to this email or book a meeting directly:
${ctx.calendlyUrl}`;
  
  // Assemble body
  const bodyText = `Hello ${lead.firstName},

${opening}

${credibility}

${pitch}

${cta}

Best regards,

${SIGNATURE}`;

  return { subject, bodyText };
}

/**
 * Build generic template (default for all profiles)
 */
function buildGenericEmail(ctx: EmailContext): EmailOutput {
  const { lead } = ctx;
  
  // Subject line
  const subject = `Quick question about ${lead.companyName}'s workflow automation`;
  
  // Opening - problem framing
  const opening = buildProblemFraming(lead, 'generic');
  
  // Product pitch with natural bridge
  const pitch = `I've been developing a new business model that addresses this challenge.

It automates everyday workflows, especially those built around spreadsheets, using AI-assisted development. We deliver high-fidelity mockups and an MVP in one week at no cost. Then we evolve the system with local-first AI insights that continuously improve performance.

The platform is tailored, secure, open-source, and local-first. It can reduce infrastructure costs significantly while giving organizations full control of their data.

Over time, we also train an internal technical leader to build and test proof-of-concept features in a gated CI/CD pipeline.`;
  
  // Call to action (softened)
  const cta = `Is a brief conversation this week worth exploring?`;
  
  // Assemble body
  const bodyText = `Hello ${lead.firstName},

${opening}

${pitch}

${cta}

Best regards,

${SIGNATURE}`;

  return { subject, bodyText };
}

/**
 * Build problem framing paragraph based on available lead data
 * Uses pain point if available, falls back to role-appropriate generic statement with professional opener
 */
function buildProblemFraming(lead: LeadProfile, template: 'chiefs' | 'generic'): string {
  // If we have a specific pain point, use it directly
  if (lead.primaryPainPoint) {
    return lead.primaryPainPoint;
  }
  
  // Otherwise, generate role-appropriate pain point with professional opener
  const roleType = categorizeRole(lead.roleTitle);
  const opener = generateProfessionalOpener(lead.roleTitle, lead.companyName);
  
  if (template === 'chiefs') {
    // Workflow automation focus for C-level (not just spreadsheets)
    if (roleType === 'executive') {
      return `${opener}, you understand how manual workflows — spreadsheets, todo lists, calendars, and planners — can slow critical decision-making. When teams spend time on manual coordination instead of strategic work, initiatives lose momentum.`;
    } else if (roleType === 'operations') {
      return `${opener}, you've likely seen how manual workflows create bottlenecks. Spreadsheet updates, task tracking, and calendar coordination consume valuable time, while errors multiply and stakeholders lose confidence in the data.`;
    } else {
      return `${opener}, you know how manual workflows — from spreadsheets to task lists — can impact operational efficiency. Updates take time, errors accumulate, and getting reliable insights becomes increasingly difficult.`;
    }
  } else {
    // Generic workflow automation
    if (roleType === 'executive') {
      return `${opener}, you're likely aware of workflows that evolved organically but now resist automation. Custom development feels expensive or slow, yet teams continue spending hours on manual tasks.`;
    } else if (roleType === 'technical') {
      return `${opener}, you've probably identified inefficiencies in manual workflows but lack bandwidth to build automation. Traditional development is too slow, and low-code platforms lack the flexibility for complex processes.`;
    } else {
      return `${opener}, you understand how manual workflows create friction. Automation seems expensive or complicated, so teams continue with time-consuming manual steps.`;
    }
  }
}

/**
 * Generate professional opener with natural variation
 * Varies the construction to avoid repetition across emails while maintaining professionalism
 */
function generateProfessionalOpener(roleTitle: string, companyName: string): string {
  // Use hash of company name to consistently vary opener style per company (not random each time)
  const hash = companyName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variation = hash % 4;
  
  switch (variation) {
    case 0:
      return `Given your role as ${roleTitle} at ${companyName}`;
    case 1:
      return `In your capacity as ${roleTitle} at ${companyName}`;
    case 2:
      return `As ${roleTitle} at ${companyName}`;
    case 3:
      return `From your experience as ${roleTitle} at ${companyName}`;
    default:
      return `Given your role as ${roleTitle} at ${companyName}`;
  }
}

/**
 * Categorize role type for appropriate pain point framing
 */
function categorizeRole(roleTitle: string): 'executive' | 'technical' | 'operations' | 'general' {
  const roleLower = roleTitle.toLowerCase();
  
  if (roleLower.includes('cto') || 
      roleLower.includes('cio') || 
      roleLower.includes('chief') || 
      roleLower.includes('vp') ||
      roleLower.includes('vice president') ||
      roleLower.includes('president') ||
      roleLower.includes('director')) {
    return 'executive';
  }
  
  if (roleLower.includes('engineer') || 
      roleLower.includes('architect') || 
      roleLower.includes('developer') ||
      roleLower.includes('technical') ||
      roleLower.includes('tech lead')) {
    return 'technical';
  }
  
  if (roleLower.includes('operations') || 
      roleLower.includes('manager') || 
      roleLower.includes('coordinator')) {
    return 'operations';
  }
  
  return 'general';
}

// =============================================================================
// BACKWARD COMPATIBILITY LAYER
// =============================================================================

/**
 * Generate personalized outreach email for a lead (legacy API)
 * Routes to profile-specific template or falls back to generic template
 * 
 * @deprecated Use buildOutreachEmail with EmailContext for new code
 */
export function generateOutreachEmail(lead: Lead, includeReferral?: boolean, profileKey?: string): EmailContent {
  if (!lead.email) {
    throw new Error(`Lead ${lead.name} does not have an email address`);
  }

  // Use profileKey parameter if provided, otherwise use lead's profile
  const profile = profileKey || lead.profile;
  const firstName = extractFirstName(lead.name);
  
  let subject: string;
  let body: string;

  // Check if we have AI-generated background to use
  if (lead.background) {
    // Use AI-generated background with new email builder
    const leadProfile = convertLeadToProfile(lead);
    leadProfile.primaryPainPoint = lead.background; // Use background as pain point
    
    const ctx: EmailContext = {
      lead: leadProfile,
      productName: 'Work Automation Platform',
      productUrl: WORK_AUTOMATION_URL,
      calendlyUrl: BOOKING_URL
    };
    
    const template = profile === 'chiefs' ? 'chiefs' : 'generic';
    const emailOutput = buildOutreachEmail(ctx, template);
    
    subject = emailOutput.subject;
    body = emailOutput.bodyText;
  } else {
    // Fall back to old template generation for backward compatibility
    if (profile === 'chiefs') {
      subject = generateChiefsSubject(lead);
      body = generateChiefsBody(lead, firstName);
    } else {
      subject = generateGenericSubject(lead);
      body = generateGenericBody(lead, firstName);
    }
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
 * Convert legacy Lead to new LeadProfile
 */
function convertLeadToProfile(lead: Lead): LeadProfile {
  const parts = lead.name.trim().split(/\s+/);
  const firstName = parts[0] || lead.name;
  const lastName = parts.slice(1).join(' ') || undefined;
  
  return {
    firstName,
    lastName,
    roleTitle: lead.title || 'Professional',
    companyName: lead.company || 'your organization',
    industry: undefined, // Not available in legacy Lead
    keyInitiatives: undefined,
    primaryPainPoint: undefined,
    city: undefined,
    stateOrRegion: undefined
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

Referrals mean a lot to me — I offer a commission for every introduction that turns into a project.`;
  
  // Insert referral section before signature
  const signatureIndex = body.indexOf(SIGNATURE);
  if (signatureIndex !== -1) {
    return body.substring(0, signatureIndex) + referralSection + '\n\n' + body.substring(signatureIndex);
  }
  
  // Fallback: append to end
  return body + '\n\n' + referralSection;
}

// =============================================================================
// LEGACY TEMPLATE FUNCTIONS (for backward compatibility when no AI background)
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

/**
 * Generate email subject line for chiefs profile
 */
function generateChiefsSubject(lead: Lead): string {
  if (lead.company) {
    return `Quick question about ${lead.company}'s workflow automation`;
  }
  return `Quick question about workflow automation`;
}

/**
 * Generate personalized email body for chiefs profile
 */
function generateChiefsBody(lead: Lead, firstName: string): string {
  const intro = `Hello ${firstName},`;
  
  const personalizedContext = generatePersonalizedContext(lead);
  
  const credibility = `It's incredibly satisfying to see your entire business run on automation. I just finished automating mine in a week — and even added a few "nice-to-haves" along the way.

Allow me to show you how we can do the same for yours.`;
  
  const mainPitch = `I'd like to share our **Work Automation Platform** with you.

We transform manual workflows — like those currently handled through spreadsheets, todo lists, manual calendars, and planners — into fully automated systems with **AI-generated interactive mockups** delivered during discovery calls. We analyze your current processes, design streamlined solutions, and provide **working demonstrations same-day**. Complete with **workflow documentation, ROI analysis, and deployment-ready prototypes**.

Our approach uses AI-assisted development to create tailored, secure, open-source, **local-first** solutions that can **cut costs by up to 100x** while giving organizations full control of their data. Over time, we also train an internal technical leader to build and test proof-of-concept features in a gated CI/CD pipeline.

Learn more about the Work Automation Platform:
${WORK_AUTOMATION_URL}`;
  
  const closing = `Would you have time this week to discuss how this could benefit ${lead.company || 'your organization'}?

Or book a meeting directly:
${BOOKING_URL}

Best regards,

${SIGNATURE}`;

  return `${intro}

${personalizedContext}

${credibility}

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
  
  // Fallback: use professional opener with role/company
  if (lead.title && lead.company) {
    const leadProfile: LeadProfile = {
      firstName: extractFirstName(lead.name),
      roleTitle: lead.title,
      companyName: lead.company
    };
    const opener = generateProfessionalOpener(lead.title, lead.company);
    
    // Add relevant experience context if available
    const relevantExperience = extractRelevantExperience(lead.about);
    if (relevantExperience) {
      return `${opener}, ${relevantExperience}, I thought you might be interested in this opportunity.`;
    }
    
    // Add worked together context if available
    if (lead.worked_together) {
      return `${opener}, and having worked together at ${lead.worked_together}, I thought you might be interested in this opportunity.`;
    }
    
    return `${opener}, I thought you might be interested in this opportunity.`;
  }
  
  // Final fallback for incomplete data
  return "I came across your profile and thought you might be interested in this opportunity.";
}

/**
 * Extract relevant experience keywords from about section
 * Returns phrase fragment that works with professional opener
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
    return 'given your focus on innovation and scalability';
  } else if (found.includes('entrepreneur') || found.includes('founder')) {
    return 'given your entrepreneurial background';
  } else if (found.includes('leadership')) {
    return 'given your leadership experience';
  } else if (found.includes('technical')) {
    return 'given your technical expertise';
  } else if (found.includes('automation') || found.includes('workflow')) {
    return 'given your experience with process optimization';
  }
  
  return null;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate HTML-formatted email for rich clipboard copy
 * Converts markdown-style formatting to HTML: **bold**, URLs to links
 * Optimized for email clients like Outlook, Gmail, etc.
 */
export function generateHtmlEmail(lead: Lead, includeReferral?: boolean): string {
  const email = generateOutreachEmail(lead, includeReferral);
  
  // Split body into paragraphs (double newlines)
  const paragraphs = email.body.split(/\n\n+/);
  
  // Convert each paragraph to HTML
  const htmlParagraphs = paragraphs.map(para => {
    // Convert **bold** to <strong>bold</strong>
    let htmlPara = para.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Convert URLs to clickable links (but avoid double-linking)
    // First, protect already-linked URLs
    const protectedLinks: string[] = [];
    htmlPara = htmlPara.replace(/<a [^>]+>[^<]+<\/a>/g, (match) => {
      protectedLinks.push(match);
      return `___PROTECTED_LINK_${protectedLinks.length - 1}___`;
    });
    
    // Now convert plain URLs to links (including www. URLs)
    htmlPara = htmlPara.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color: #0066cc; text-decoration: underline;">$1</a>');
    // Also convert www. URLs (add https:// to the href but keep display text as-is)
    htmlPara = htmlPara.replace(/\b(www\.[^\s<]+)/g, '<a href="https://$1" style="color: #0066cc; text-decoration: underline;">$1</a>');
    
    // Convert email addresses to mailto links
    htmlPara = htmlPara.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="mailto:$1" style="color: #0066cc; text-decoration: underline;">$1</a>');
    
    // Restore protected links
    protectedLinks.forEach((link, index) => {
      htmlPara = htmlPara.replace(`___PROTECTED_LINK_${index}___`, link);
    });
    
    // Convert single newlines within paragraphs to <br>
    htmlPara = htmlPara.replace(/\n/g, '<br>');
    
    // Wrap in paragraph tag with proper spacing
    return `<p style="margin: 0 0 1em 0;">${htmlPara}</p>`;
  }).join('');
  
  // Create full HTML email body (without To/Subject - those go in email client fields)
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 12pt; line-height: 1.6; color: #000000; margin: 0; padding: 0;">
${htmlParagraphs}
</body>
</html>`;
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
