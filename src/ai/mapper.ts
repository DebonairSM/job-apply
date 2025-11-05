import { askOllama } from './client.js';
import { MappingOutput, MappingOutputSchema } from '../lib/validation.js';
import { getLabelMapping, saveLabelMapping, LabelMapping } from '../lib/db.js';

// Canonical field keys
export const CANONICAL_KEYS = [
  'full_name',
  'first_name',
  'last_name',
  'email',
  'phone',
  'city',
  'work_authorization',
  'requires_sponsorship',
  'years_dotnet',
  'years_azure',
  'linkedin_url',
  'salary_expectation',
  'us_timezone',
  'why_fit',
  'unknown'
] as const;

export type CanonicalKey = typeof CANONICAL_KEYS[number];

// Heuristics: [regex pattern, canonical key, confidence]
const HEURISTICS: Array<[RegExp, CanonicalKey, number]> = [
  [/^first\s*name/i, 'first_name', 0.99],
  [/^last\s*name/i, 'last_name', 0.99],
  [/full\s*name|legal\s*name|first\s*and\s*last/i, 'full_name', 0.99],
  [/e-?mail(\s*address)?/i, 'email', 0.99],
  [/phone|mobile|telephone/i, 'phone', 0.99],
  [/city|location|where.*located/i, 'city', 0.98],
  [/(work\s*authorization|authorized\s*to\s*work|legal.*work)/i, 'work_authorization', 0.99],
  [/(require.*sponsor|sponsorship|visa\s*sponsor)/i, 'requires_sponsorship', 0.99],
  [/(years?|experience).*\.?net/i, 'years_dotnet', 0.95],
  [/(years?|experience).*azure/i, 'years_azure', 0.95],
  [/linkedin(\s*profile|\s*url)?/i, 'linkedin_url', 0.99],
  [/(comp|salary|pay).*expect/i, 'salary_expectation', 0.95],
  [/time\s*zone|timezone/i, 'us_timezone', 0.98],
  [/(why.*fit|why.*interested|why.*apply|cover\s*letter)/i, 'why_fit', 0.95]
];

export interface Mapping {
  label: string;
  key: CanonicalKey;
  confidence: number;
}

/**
 * Maps form field labels to canonical keys using a three-tier strategy.
 * 
 * This intelligent mapping system balances speed and accuracy:
 * 1. **Heuristics (fastest)**: Pattern matching for common fields (~50 patterns)
 * 2. **Cache (medium)**: Reuses successful mappings from previous forms (>70% confidence)
 * 3. **LLM (slowest, most accurate)**: Semantic understanding for edge cases
 * 
 * The function automatically caches LLM results for future use, so subsequent
 * mappings of the same label are instant. Labels mapped to 'unknown' are not cached
 * as they represent ambiguous or unmappable fields.
 * 
 * @param labels - Array of form field labels to map (e.g., ["Email Address", "Phone", "First Name"])
 * @returns Array of mappings with canonical keys and confidence scores (0.0-0.99)
 * 
 * @example
 * const labels = ["Email Address", "Years of Experience", "Phone Number"];
 * const mappings = await mapLabelsSmart(labels);
 * // [
 * //   { label: "Email Address", key: "email", confidence: 0.99 },
 * //   { label: "Years of Experience", key: "unknown", confidence: 0.0 },
 * //   { label: "Phone Number", key: "phone", confidence: 0.99 }
 * // ]
 */
export async function mapLabelsSmart(labels: string[]): Promise<Mapping[]> {
  const results: Mapping[] = [];
  const unmapped: string[] = [];

  for (const label of labels) {
    // 1. Try heuristics first
    let found = false;
    for (const [pattern, key, confidence] of HEURISTICS) {
      if (pattern.test(label)) {
        results.push({ label, key, confidence });
        
        // Save to cache
        saveLabelMapping({ label, key, confidence });
        found = true;
        break;
      }
    }

    if (found) continue;

    // 2. Check cache
    const cached = getLabelMapping(label);
    if (cached && cached.confidence > 0.7) {
      results.push({
        label,
        key: cached.key as CanonicalKey,
        confidence: cached.confidence
      });
      continue;
    }

    // 3. Add to unmapped list for LLM
    unmapped.push(label);
  }

  // If we have unmapped labels, query LLM in batch
  if (unmapped.length > 0) {
    const llmMappings = await mapLabelsWithLLM(unmapped);
    
    for (const mapping of llmMappings) {
      const confidence = mapping.key === 'unknown' ? 0.0 : 0.8;
      results.push({
        label: mapping.label,
        key: mapping.key as CanonicalKey,
        confidence
      });

      // Save to cache if not unknown
      if (mapping.key !== 'unknown') {
        saveLabelMapping({
          label: mapping.label,
          key: mapping.key,
          confidence
        });
      }
    }
  }

  return results;
}

// LLM-based mapping for edge cases
async function mapLabelsWithLLM(labels: string[]): Promise<Array<{ label: string; key: string }>> {
  const prompt = `You are a form field label analyzer. Map each label to a canonical key.

CANONICAL KEYS:
${CANONICAL_KEYS.filter(k => k !== 'unknown').join(', ')}

RULES:
- Only use a canonical key if the label clearly matches that field
- If no good match exists, use "unknown"
- Be conservative - when in doubt, use "unknown"

LABELS TO MAP:
${labels.map((l, i) => `${i + 1}. ${l}`).join('\n')}

IMPORTANT: Return ONLY valid JSON in this exact format (object with "mappings" array):
{
  "mappings": [
    {"label": "exact label text", "key": "canonical_key"}
  ]
}

Example response:
{
  "mappings": [
    {"label": "Email Address", "key": "email"},
    {"label": "Phone Number", "key": "phone"}
  ]
}`;

  const result = await askOllama<MappingOutput>(prompt, 'MappingOutput', {
    temperature: 0.1
  });

  // Handle both formats: {"mappings": [...]} or just [...]
  let validated: MappingOutput;
  
  if (Array.isArray(result)) {
    // Ollama returned just the array, wrap it
    validated = { mappings: result as Array<{ label: string; key: string }> };
  } else {
    // Ollama returned the full object
    validated = MappingOutputSchema.parse(result);
  }
  
  return validated.mappings;
}

// Export for testing
export { HEURISTICS };


