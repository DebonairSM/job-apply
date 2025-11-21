/**
 * Message Template Renderer Service
 * 
 * Handles rendering message templates with network contact data and placeholders.
 * Supports case-insensitive placeholder matching with fallback for missing data.
 * 
 * Features:
 * - Case-insensitive placeholder matching ({{Name}} === {{name}})
 * - Automatic name splitting (first_name, last_name from name)
 * - Empty string substitution for missing values
 */

import { NetworkContact } from '../lib/db.js';

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
 * Build placeholder map from network contact data
 */
function buildPlaceholderMap(contact: NetworkContact): Record<string, string> {
  const firstName = extractFirstName(contact.name);
  const lastName = extractLastName(contact.name);
  
  return {
    name: contact.name || '',
    firstName: firstName,
    first_name: firstName, // Support snake_case variant
    lastName: lastName,
    last_name: lastName, // Support snake_case variant
    company: contact.company || '',
    title: contact.title || '',
    worked_together: contact.worked_together || '',
    'worked together': contact.worked_together || '', // Support space variant
    location: contact.location || ''
  };
}

/**
 * Replace placeholders in template with case-insensitive matching
 */
function replacePlaceholders(template: string, placeholderMap: Record<string, string>): string {
  // Case-insensitive placeholder replacement
  // Matches {{placeholder}} or {{Placeholder}} or {{PLACEHOLDER}}
  return template.replace(/\{\{(\w+(?:\s+\w+)*)\}\}/gi, (match, placeholderKey) => {
    // Normalize key: convert to lowercase and replace spaces with underscores
    const normalizedKey = placeholderKey.toLowerCase().replace(/\s+/g, '_');
    
    // Try exact match first (case-insensitive)
    for (const [key, value] of Object.entries(placeholderMap)) {
      if (key.toLowerCase() === normalizedKey || key.toLowerCase() === placeholderKey.toLowerCase()) {
        return value;
      }
    }
    
    // Fallback: return empty string if placeholder not found
    return '';
  });
}

/**
 * Render a message template for a network contact
 * Replaces all placeholders with actual data from contact profile
 * 
 * @param template - Message template with placeholders like {{name}}, {{firstName}}, etc.
 * @param contact - Network contact to use for personalization
 * @returns Rendered message with all placeholders replaced
 */
export function renderMessageTemplate(template: string, contact: NetworkContact): string {
  const placeholderMap = buildPlaceholderMap(contact);
  return replacePlaceholders(template, placeholderMap);
}

