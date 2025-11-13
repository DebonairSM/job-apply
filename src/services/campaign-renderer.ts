/**
 * Campaign Renderer Service
 * 
 * Handles rendering campaign templates with lead data and static placeholders.
 * Supports case-insensitive placeholder matching with fallback for missing data.
 * 
 * Features:
 * - Case-insensitive placeholder matching ({{First_Name}} === {{first_name}})
 * - Automatic name splitting (first_name, last_name from name)
 * - Computed placeholders (dynamic values like referral links)
 * - Safe JSON parsing with fallback
 * - Empty string substitution for missing values
 */

import { getCampaignById, getLeadById, type Campaign, type Lead, type CampaignStaticPlaceholders } from '../lib/db.js';

/**
 * Type for computed placeholder functions
 * Takes lead data and static placeholders, returns computed string value
 */
type ComputedPlaceholder = (lead: Lead, staticPlaceholders: CampaignStaticPlaceholders) => string;

export interface RenderedEmail {
  subject: string;
  body: string;
  placeholders_used: Record<string, string>; // Shows which placeholders were replaced and their values
}

/**
 * Render a campaign for a specific lead
 * Replaces all placeholders with actual data from lead profile and campaign static values
 * 
 * @param campaignId - UUID of the campaign to render
 * @param leadId - UUID of the lead to use for personalization
 * @returns Rendered email with subject, body, and list of placeholders used
 * @throws Error if campaign or lead not found
 */
export async function renderCampaign(campaignId: string, leadId: string): Promise<RenderedEmail> {
  const campaign = getCampaignById(campaignId);
  if (!campaign) {
    throw new Error(`Campaign with ID "${campaignId}" not found. Verify the campaign exists and has not been deleted.`);
  }

  const lead = getLeadById(leadId);
  if (!lead) {
    throw new Error(`Lead with ID "${leadId}" not found. Verify the lead exists and has not been deleted.`);
  }

  // Parse static placeholders
  const staticPlaceholders = parseStaticPlaceholders(campaign.static_placeholders);

  // Build placeholder map
  const placeholderMap = buildPlaceholderMap(lead, staticPlaceholders);

  // Render subject and body
  const subject = replacePlaceholders(campaign.subject_template, placeholderMap);
  const body = replacePlaceholders(campaign.body_template, placeholderMap);

  return {
    subject,
    body,
    placeholders_used: placeholderMap
  };
}

/**
 * Parse static placeholders JSON string safely
 */
export function parseStaticPlaceholders(jsonString?: string): CampaignStaticPlaceholders {
  if (!jsonString) {
    return {};
  }

  try {
    return JSON.parse(jsonString) as CampaignStaticPlaceholders;
  } catch (error) {
    console.error('Failed to parse static placeholders:', error);
    return {};
  }
}

/**
 * Extract first name from full name
 */
export function extractFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || fullName;
}

/**
 * Extract last name from full name
 */
export function extractLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.slice(1).join(' ') || '';
}

/**
 * Encode referral code in base64 format: "VSOL:FirstName:LastName"
 */
export function encodeReferralCode(firstName: string, lastName: string): string {
  const referralString = `VSOL:${firstName}:${lastName}`;
  return Buffer.from(referralString).toString('base64');
}

/**
 * Compute full referral link with encoded lead information
 */
function computeReferralLink(lead: Lead, staticPlaceholders: CampaignStaticPlaceholders): string {
  const baseUrl = staticPlaceholders.referral_base_url || '';
  if (!baseUrl) {
    return '';
  }
  
  const firstName = extractFirstName(lead.name);
  const lastName = extractLastName(lead.name);
  const encodedCode = encodeReferralCode(firstName, lastName);
  
  return `${baseUrl}${encodedCode}`;
}

/**
 * Compute just the encoded referral code without the base URL
 */
function computeEncodedReferralCode(lead: Lead, staticPlaceholders: CampaignStaticPlaceholders): string {
  const firstName = extractFirstName(lead.name);
  const lastName = extractLastName(lead.name);
  return encodeReferralCode(firstName, lastName);
}

/**
 * Company-to-context mapping for industry-aware follow-ups
 * Maps company names (case-insensitive) to contextual sentences
 */
const COMPANY_CONTEXT_MAP: Record<string, string> = {
  // ISP/Telecom/Infrastructure
  'uunet': 'Hard to believe how far technology has come since those early backbone days!',
  'mci': 'Hard to believe how far technology has come since those early backbone days!',
  'worldcom': 'Hard to believe how far technology has come since those early backbone days!',
  'att': 'The telecommunications landscape has transformed completely since then!',
  'at&t': 'The telecommunications landscape has transformed completely since then!',
  'verizon': 'The telecommunications landscape has transformed completely since then!',
  
  // Financial/Banking
  'jpmorgan': 'The industry has changed dramatically since then!',
  'goldman sachs': 'The industry has changed dramatically since then!',
  'morgan stanley': 'The industry has changed dramatically since then!',
  'bank of america': 'The industry has changed dramatically since then!',
  'wells fargo': 'The industry has changed dramatically since then!',
  'citigroup': 'The industry has changed dramatically since then!',
  
  // Startups (generic fallback for unknown startups)
  'startup': "It's been quite a journey since those startup days!"
};

/**
 * Get contextual follow-up sentence based on company name
 * Returns industry-specific context or generic fallback
 */
function getCompanyContext(companyName: string): string {
  const normalized = companyName.toLowerCase().trim();
  
  // Direct match
  if (COMPANY_CONTEXT_MAP[normalized]) {
    return COMPANY_CONTEXT_MAP[normalized];
  }
  
  // Partial match (e.g., "JPMorgan Chase" contains "jpmorgan")
  for (const [key, context] of Object.entries(COMPANY_CONTEXT_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return context;
    }
  }
  
  // No specific context found
  return '';
}

/**
 * Compute greeting based on whether we worked together
 * Returns appropriate greeting that reads correctly with or without company
 * Includes industry-aware context when company is recognized
 * 
 * Handles multiple input formats:
 * - Just company name: "UUNET"
 * - Full sentence: "You both worked at UUNET from November 1999 to December 2000"
 * - Sentence pattern: "worked together at UUNET"
 * 
 * Always returns a single greeting line (never empty)
 */
function computeGreeting(lead: Lead, staticPlaceholders: CampaignStaticPlaceholders): string {
  const workedTogether = lead.worked_together?.trim();
  if (workedTogether) {
    const companyName = parseCompanyFromWorkedTogether(workedTogether);
    // Validate company name is not just empty or whitespace
    if (companyName && companyName.trim().length > 0) {
      const context = getCompanyContext(companyName);
      const baseGreeting = `How are you? It's been a while since our days together at ${companyName} — I hope all is well with you.`;
      
      if (context) {
        return `${baseGreeting} ${context}`;
      }
      return baseGreeting;
    }
  }
  // Default greeting when no company or invalid worked_together data
  return `How are you? It's been a while — I hope all is well with you.`;
}

/**
 * Parse company name from worked_together field
 * Handles various formats:
 * - Direct company name: "UUNET" → "UUNET"
 * - Sentence pattern: "You both worked at UUNET from..." → "UUNET"
 * - Pattern: "worked together at UUNET" → "UUNET"
 * 
 * Returns empty string if no valid company name can be extracted
 */
function parseCompanyFromWorkedTogether(text: string): string {
  if (!text) return '';
  
  const trimmed = text.trim();
  if (!trimmed) return '';
  
  // Pattern 1: "You both worked at COMPANY from..."
  const pattern1 = /You both worked at ([^,\.]+?)(?:\s+from|$)/i;
  const match1 = trimmed.match(pattern1);
  if (match1) {
    const company = match1[1].trim();
    // Ensure we got an actual company name, not empty/whitespace
    if (company) return company;
  }
  
  // Pattern 2: "worked (together )?at COMPANY"
  const pattern2 = /worked\s+(?:together\s+)?at\s+([^,\.]+?)(?:\s+from|$)/i;
  const match2 = trimmed.match(pattern2);
  if (match2) {
    const company = match2[1].trim();
    // Ensure we got an actual company name, not empty/whitespace
    if (company) return company;
  }
  
  // Pattern 3: Check if it's already just a company name (no sentence structure)
  // If it doesn't contain "worked" or "from", assume it's already a company name
  if (!trimmed.toLowerCase().includes('worked') && !trimmed.toLowerCase().includes('from')) {
    // Only return if it's substantive (more than just whitespace)
    if (trimmed.length > 0) return trimmed;
  }
  
  // Fallback: return empty string if no valid company name found
  return '';
}

/**
 * Compute product introduction paragraph
 * Uses product_name and value_proposition from static placeholders
 * 
 * Example output:
 * "I wanted to share something I've been building that I think you'll appreciate. 
 * I created Sunny to replace any CRM, ERP, or management system — and tailor it 
 * completely to the way you work."
 */
function computeProductIntro(lead: Lead, staticPlaceholders: CampaignStaticPlaceholders): string {
  const productName = staticPlaceholders.product_name;
  const valueProp = staticPlaceholders.value_proposition;
  
  if (!productName || !valueProp) {
    return '';
  }
  
  return `I wanted to share something I've been building that I think you'll appreciate. I created ${productName} to ${valueProp}.`;
}

/**
 * Compute demo explanation section with call-to-action
 * Uses demo_name, demo_link, and calendly_link from static placeholders
 * 
 * Example output includes:
 * - Value proposition paragraph
 * - Demo explanation with link
 * - Email reply CTA
 * - Calendly booking link
 */
function computeDemoExplanation(lead: Lead, staticPlaceholders: CampaignStaticPlaceholders): string {
  const demoName = staticPlaceholders.demo_name;
  const demoLink = staticPlaceholders.demo_link;
  const calendlyLink = staticPlaceholders.calendly_link;
  const productName = staticPlaceholders.product_name;
  
  if (!demoLink && !calendlyLink) {
    return '';
  }
  
  const sections: string[] = [];
  
  // Demo section (if demo link available)
  if (demoLink && demoName) {
    sections.push(
      `This quick journey starts with a conversation with ${demoName}. No commitment, no pressure — just natural speech-to-text, instantly transformed into user stories and then into a working MVP. Go ahead, give it a try — even just for fun. Its capabilities tend to surprise people.`,
      ``,
      `👉 ${demoLink}`
    );
    
    sections.push(
      ``,
      `If it looks useful, reply to this email and I'll show how we turn those workflows into deployable systems in days.`
    );
  }
  
  // Calendly section (if calendly link available)
  if (calendlyLink) {
    sections.push(
      ``,
      `Or skip the email and book a quick chat: ${calendlyLink}`
    );
  }
  
  return sections.join('\n');
}

/**
 * Compute referral explanation with commission offer
 * Uses referral_link computed placeholder
 * Only generates if referral link is available
 * 
 * Example output:
 * "P.S. If you're not the right person for this conversation, I'd appreciate a referral!
 * You can share this link — referrals mean a lot to me, and I offer a commission 
 * for every introduction that turns into a project:
 * 
 * 👉 https://vsol.software/referral?ref=..."
 */
function computeReferralExplanation(lead: Lead, staticPlaceholders: CampaignStaticPlaceholders): string {
  const referralLink = computeReferralLink(lead, staticPlaceholders);
  
  if (!referralLink) {
    return '';
  }
  
  return `P.S. If you're not the right person for this conversation, I'd appreciate a referral!
You can share this link — referrals mean a lot to me, and I offer a commission for every introduction that turns into a project:

👉 ${referralLink}`;
}

/**
 * Registry of computed placeholders
 * These are dynamically calculated based on lead data and static placeholders
 */
const COMPUTED_PLACEHOLDERS: Record<string, ComputedPlaceholder> = {
  referral_link: computeReferralLink,
  encoded_referral_code: computeEncodedReferralCode,
  referralcode: computeEncodedReferralCode, // Alias for camelCase usage
  greeting: computeGreeting,
  product_intro: computeProductIntro,
  demo_explanation: computeDemoExplanation,
  referral_explanation: computeReferralExplanation
};

/**
 * Build complete placeholder map from lead data and static placeholders
 */
function buildPlaceholderMap(lead: Lead, staticPlaceholders: CampaignStaticPlaceholders): Record<string, string> {
  const map: Record<string, string> = {};

  // Lead data placeholders (all fields from Lead interface)
  const firstName = extractFirstName(lead.name);
  const lastName = extractLastName(lead.name);
  
  // Snake_case (original)
  map.first_name = firstName;
  map.last_name = lastName;
  
  // CamelCase aliases (for templates that use {{firstName}}, {{lastName}})
  map.firstname = firstName;
  map.lastname = lastName;
  
  // Other lead fields
  map.name = lead.name || '';
  map.title = lead.title || '';
  map.company = lead.company || '';
  map.location = lead.location || '';
  map.email = lead.email || '';
  map.phone = lead.phone || '';
  map.website = lead.website || '';
  map.background = lead.background || '';
  map.worked_together = lead.worked_together || '';
  map.about = lead.about || '';
  map.birthday = lead.birthday || '';
  map.profile = lead.profile || '';
  map.email_status = lead.email_status || '';

  // Static placeholders
  map.product_name = staticPlaceholders.product_name || '';
  map.value_proposition = staticPlaceholders.value_proposition || '';
  map.demo_name = staticPlaceholders.demo_name || '';
  map.demo_link = staticPlaceholders.demo_link || '';
  map.call_to_action = staticPlaceholders.call_to_action || '';
  map.calendly_link = staticPlaceholders.calendly_link || '';
  map.signature = staticPlaceholders.signature || '';

  // Computed placeholders (dynamic values calculated from lead data)
  for (const [key, computeFn] of Object.entries(COMPUTED_PLACEHOLDERS)) {
    map[key] = computeFn(lead, staticPlaceholders);
  }

  return map;
}

/**
 * Replace placeholders in template text
 * Supports {{placeholder_name}} syntax (case-insensitive)
 * Missing values are replaced with empty string
 * 
 * @param template - Template string with {{placeholder}} markers
 * @param placeholderMap - Map of placeholder names to their values
 * @returns Template string with all placeholders replaced
 */
function replacePlaceholders(template: string, placeholderMap: Record<string, string>): string {
  // Find all placeholders in the template
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const missingPlaceholders: string[] = [];
  
  const result = template.replace(placeholderRegex, (match, placeholderName) => {
    const normalizedName = placeholderName.trim().toLowerCase();
    
    // Look for matching placeholder (case-insensitive)
    const matchingKey = Object.keys(placeholderMap).find(
      key => key.toLowerCase() === normalizedName
    );
    
    if (matchingKey) {
      const value = placeholderMap[matchingKey];
      // Return empty string if value is empty, otherwise return the value
      return value || '';
    }
    
    // Placeholder not found, collect for logging
    missingPlaceholders.push(placeholderName);
    return '';
  });
  
  // Log all missing placeholders at once (better than one log per placeholder)
  if (missingPlaceholders.length > 0) {
    console.warn(
      `Campaign rendering: ${missingPlaceholders.length} placeholder(s) not found: ${missingPlaceholders.join(', ')}. ` +
      `Available placeholders: ${Object.keys(placeholderMap).join(', ')}`
    );
  }
  
  return result;
}

