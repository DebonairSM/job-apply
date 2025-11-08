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

📞 (352) 397-8650 | ✉️ info@vsol.software

🌐 vsol.software

LinkedIn: https://www.linkedin.com/in/rombandeira/

Company: https://www.linkedin.com/company/vsol/`;

const REFERRAL_SALT = 'VSOL';
const REFERRAL_BASE_URL = 'https://vsol.software/referral';
const WORK_AUTOMATION_URL = 'https://vsol.software/agentic#featured-product';
const BOOKING_URL = 'https://calendly.com/vsol/meeting-with-bandeira';

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
  const credibility = `I recently automated my own business end-to-end in under a week. The result? No more spreadsheets, to-do lists, or calendar juggling — just seamless, self-running workflows.`;
  
  // Product pitch with natural bridge
  const pitch = `That's what our **Work Automation Platform** delivers.

In a short discovery call, we map your current processes, then show AI-generated interactive mockups in real time. Within hours, you'll see a working prototype of your future system — complete with documentation, ROI analysis, and deployment-ready deliverables.

The platform is secure, open-source, and local-first, giving you full control of your data while cutting infrastructure costs and improving reliability. We even help your internal team learn to extend it safely through CI/CD pipelines.`;
  
  // Call to action (softened, direct)
  const cta = `Would you be open to a quick conversation this week to explore what automation could look like in your organization?

You can book directly here: ${ctx.calendlyUrl}`;
  
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
  
  // Personal credibility statement
  const credibility = `I recently automated my own business end-to-end in under a week. The result? No more spreadsheets, to-do lists, or calendar juggling — just seamless, self-running workflows.`;
  
  // Product pitch with natural bridge
  const pitch = `That's what our **Work Automation Platform** delivers.

In a short discovery call, we map your current processes, then show AI-generated interactive mockups in real time. Within hours, you'll see a working prototype of your future system — complete with documentation, ROI analysis, and deployment-ready deliverables.

The platform is secure, open-source, and local-first, giving you full control of your data while cutting infrastructure costs and improving reliability. We even help your internal team learn to extend it safely through CI/CD pipelines.`;
  
  // Call to action (softened)
  const cta = `Would you be open to a quick conversation this week to explore what automation could look like in your organization?

You can book directly here: ${ctx.calendlyUrl}`;
  
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
    // Workflow automation focus for C-level (concise, conversational)
    if (roleType === 'executive') {
      return `${opener}, you're familiar with the challenge of manual workflows slowing down decision-making. Many executive teams are turning to automation to remove those bottlenecks and improve operational reliability.`;
    } else if (roleType === 'operations') {
      return `${opener}, you've likely encountered how manual processes create friction in operations. Many teams in similar settings are turning to automation to remove manual steps and improve reliability.`;
    } else {
      return `${opener}, you understand how manual workflows can impact efficiency. Many organizations are turning to automation to streamline these processes and reduce operational overhead.`;
    }
  } else {
    // Generic workflow automation (concise, conversational)
    if (roleType === 'executive') {
      return `${opener}, you're likely aware of workflows that resist automation while consuming valuable time. Many leadership teams are exploring new approaches to automate these processes efficiently.`;
    } else if (roleType === 'technical') {
      return `${opener}, you've probably identified inefficiencies in manual workflows. Many technical teams are turning to automation platforms that balance speed with flexibility for complex processes.`;
    } else {
      return `${opener}, you understand how manual workflows create friction. Many teams in similar settings are turning to automation to remove manual steps and improve reliability.`;
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
      return `I noticed your work as ${roleTitle} at ${companyName}`;
    case 1:
      return `I saw your experience as ${roleTitle} at ${companyName}`;
    case 2:
      return `I came across your role as ${roleTitle} at ${companyName}`;
    case 3:
      return `I noticed your experience as ${roleTitle} at ${companyName}`;
    default:
      return `I noticed your work as ${roleTitle} at ${companyName}`;
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
  
  const credibility = `I recently automated my own business end-to-end in under a week. The result? No more spreadsheets, to-do lists, or calendar juggling — just seamless, self-running workflows.`;
  
  const mainPitch = `That's what our **Work Automation Platform** delivers.

In a short discovery call, we map your current processes, then show AI-generated interactive mockups in real time. Within hours, you'll see a working prototype of your future system — complete with documentation, ROI analysis, and deployment-ready deliverables.

The platform is secure, open-source, and local-first, giving you full control of your data while cutting infrastructure costs and improving reliability. We even help your internal team learn to extend it safely through CI/CD pipelines.`;
  
  const closing = `Would you be open to a quick conversation this week to explore what automation could look like in your organization?

You can book directly here: ${BOOKING_URL}

Best regards,

${SIGNATURE}`;

  return `${intro}

${personalizedContext}

${credibility}

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
  
  const credibility = `I recently automated my own business end-to-end in under a week. The result? No more spreadsheets, to-do lists, or calendar juggling — just seamless, self-running workflows.`;
  
  const mainPitch = `That's what our **Work Automation Platform** delivers.

In a short discovery call, we map your current processes, then show AI-generated interactive mockups in real time. Within hours, you'll see a working prototype of your future system — complete with documentation, ROI analysis, and deployment-ready deliverables.

The platform is secure, open-source, and local-first, giving you full control of your data while cutting infrastructure costs and improving reliability. We even help your internal team learn to extend it safely through CI/CD pipelines.`;
  
  const closing = `Would you be open to a quick conversation this week to explore what automation could look like in ${lead.company || 'your organization'}?

You can book directly here: ${BOOKING_URL}

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
 * Converts markdown-style formatting to HTML: **bold**, URLs to links, emojis, clickable phone/email
 * Optimized for email clients like Outlook, Gmail, etc.
 */
export function generateHtmlEmail(lead: Lead, includeReferral?: boolean): string {
  const email = generateOutreachEmail(lead, includeReferral);
  
  // Process the email body line by line to preserve signature formatting
  const lines = email.body.split('\n');
  let htmlContent = '';
  let currentParagraph: string[] = [];
  let consecutiveEmptyLines = 0;
  
  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      // Join lines with \n for processing
      let paraText = currentParagraph.join('\n');
      
      // Convert **bold** to <strong>bold</strong>
      paraText = paraText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      
      // Protect existing HTML tags/links
      const protectedLinks: string[] = [];
      const protectLinks = (text: string) => {
        return text.replace(/<a [^>]+>[^<]+<\/a>/g, (match) => {
          protectedLinks.push(match);
          return `___PROTECTED_LINK_${protectedLinks.length - 1}___`;
        });
      };
      
      paraText = protectLinks(paraText);
      
      // Convert URLs to clickable links
      paraText = paraText.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color: #0066cc; text-decoration: underline;">$1</a>');
      
      // Protect newly created links before further processing
      paraText = protectLinks(paraText);
      
      paraText = paraText.replace(/\b(www\.[^\s<]+)/g, '<a href="https://$1" style="color: #0066cc; text-decoration: underline;">$1</a>');
      
      // Protect again after www links
      paraText = protectLinks(paraText);
      
      // Convert email addresses to mailto links
      paraText = paraText.replace(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g, '<a href="mailto:$1" style="color: #0066cc; text-decoration: underline;">$1</a>');
      
      // Protect again after email links
      paraText = protectLinks(paraText);
      
      // Convert bare domain names to links (e.g., vsol.software)
      // Use negative lookbehind to avoid matching inside existing links or attributes
      paraText = paraText.replace(/(?<!href="|href='|>)(\b[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)\b(?!<)/g, (match, domain, offset, string) => {
        // Additional safety: check if we're inside an HTML tag or existing link
        const before = string.substring(Math.max(0, offset - 100), offset);
        if (before.includes('href=') && !before.includes('</a>')) {
          return match; // Skip if we're inside a href attribute
        }
        return `<a href="https://${domain}" style="color: #0066cc; text-decoration: underline;">${domain}</a>`;
      });
      
      // Convert phone number to tel: link with proper format: tel:+1XXXXXXXXXX
      paraText = paraText.replace(/\((\d{3})\)\s*(\d{3})-(\d{4})/g, (match, p1, p2, p3) => {
        return `<a href="tel:+1${p1}${p2}${p3}" style="color: #0066cc; text-decoration: underline;">(${p1}) ${p2}-${p3}</a>`;
      });
      
      // Restore protected links
      protectedLinks.forEach((link, index) => {
        paraText = paraText.replace(`___PROTECTED_LINK_${index}___`, link);
      });
      
      // Convert remaining newlines to <br>
      paraText = paraText.replace(/\n/g, '<br>');
      
      // Wrap in paragraph tag
      htmlContent += `<p style="margin: 0 0 1em 0;">${paraText}</p>`;
      currentParagraph = [];
    }
  };
  
  // Process each line
  for (const line of lines) {
    if (line.trim() === '') {
      consecutiveEmptyLines++;
      // Only flush on first empty line (paragraph break)
      if (consecutiveEmptyLines === 1) {
        flushParagraph();
      }
    } else {
      consecutiveEmptyLines = 0;
      currentParagraph.push(line);
    }
  }
  
  // Flush any remaining paragraph
  flushParagraph();
  
  // Create full HTML email body
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 12pt; line-height: 1.6; color: #000000; margin: 0; padding: 0;">
${htmlContent}
</body>
</html>`;
}

/**
 * Create mailto link with proper URL encoding
 * Strips markdown formatting since mailto links only support plain text
 */
export function createMailtoLink(email: EmailContent): string {
  const subject = encodeURIComponent(email.subject);
  
  // Strip markdown formatting from body (mailto links don't support formatting)
  let cleanBody = email.body;
  // Remove **bold** markdown
  cleanBody = cleanBody.replace(/\*\*([^*]+)\*\*/g, '$1');
  // Remove *italic* markdown (if present)
  cleanBody = cleanBody.replace(/\*([^*]+)\*/g, '$1');
  // Remove _italic_ markdown (if present)
  cleanBody = cleanBody.replace(/_([^_]+)_/g, '$1');
  
  const body = encodeURIComponent(cleanBody);
  
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
