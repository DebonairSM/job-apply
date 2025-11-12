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
 * Registry of computed placeholders
 * These are dynamically calculated based on lead data and static placeholders
 */
const COMPUTED_PLACEHOLDERS: Record<string, ComputedPlaceholder> = {
  referral_link: computeReferralLink,
  encoded_referral_code: computeEncodedReferralCode
};

/**
 * Build complete placeholder map from lead data and static placeholders
 */
function buildPlaceholderMap(lead: Lead, staticPlaceholders: CampaignStaticPlaceholders): Record<string, string> {
  const map: Record<string, string> = {};

  // Lead data placeholders (all fields from Lead interface)
  map.first_name = extractFirstName(lead.name);
  map.last_name = extractLastName(lead.name);
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
  map.demo_name = staticPlaceholders.demo_name || '';
  map.demo_link = staticPlaceholders.demo_link || '';
  map.call_to_action = staticPlaceholders.call_to_action || '';
  map.calendly_link = staticPlaceholders.calendly_link || '';

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

