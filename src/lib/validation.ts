import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Zod schema for answers
export const AnswersSchema = z.object({
  answers: z.object({
    full_name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(7),
    city: z.string().min(2),
    work_authorization: z.string(),
    requires_sponsorship: z.enum(['Yes', 'No']),
    years_dotnet: z.string(),
    years_azure: z.string(),
    linkedin_url: z.string().url(),
    why_fit: z.string().max(400),
    salary_expectation: z.string().max(50).optional()
  }),
  resumeVariant: z.string()
});

export type AnswersOutput = z.infer<typeof AnswersSchema>;

// Load policy file
interface FieldPolicy {
  max_length?: number;
  strip_emoji?: boolean;
  allowed_values?: string[];
}

interface AnswersPolicy {
  fields: Record<string, FieldPolicy>;
}

let cachedPolicy: AnswersPolicy | null = null;

function loadPolicy(): AnswersPolicy {
  if (cachedPolicy) return cachedPolicy;

  const policyPath = join(__dirname, '../../answers-policy.yml');
  
  if (!existsSync(policyPath)) {
    // Return default policy
    return {
      fields: {
        why_fit: { max_length: 400, strip_emoji: true },
        requires_sponsorship: { allowed_values: ['Yes', 'No'] },
        salary_expectation: { max_length: 50, strip_emoji: true }
      }
    };
  }

  const content = readFileSync(policyPath, 'utf-8');
  cachedPolicy = parseYaml(content) as AnswersPolicy;
  return cachedPolicy;
}

// Sanitize and validate answers
export function sanitizeAnswers(data: unknown): AnswersOutput {
  // First validate with Zod
  const parsed = AnswersSchema.safeParse(data);
  
  if (!parsed.success) {
    throw new Error(`Invalid answers schema: ${parsed.error.message}`);
  }

  const result = parsed.data;
  const policy = loadPolicy();

  // Apply policy rules
  for (const [fieldName, fieldValue] of Object.entries(result.answers)) {
    const fieldPolicy = policy.fields[fieldName];
    if (!fieldPolicy) continue;

    let value = fieldValue as string;

    // Strip emoji if required
    if (fieldPolicy.strip_emoji) {
      value = value.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    }

    // Enforce max length
    if (fieldPolicy.max_length && value.length > fieldPolicy.max_length) {
      value = value.slice(0, fieldPolicy.max_length);
    }

    // Check allowed values
    if (fieldPolicy.allowed_values && !fieldPolicy.allowed_values.includes(value)) {
      throw new Error(`Field ${fieldName} has invalid value. Allowed: ${fieldPolicy.allowed_values.join(', ')}`);
    }

    // Trim whitespace and normalize
    value = value.replace(/\s+/g, ' ').trim();

    (result.answers as any)[fieldName] = value;
  }

  return result;
}

// Apply policy to a single field
export function applyPolicy(fieldName: string, value: string): string {
  const policy = loadPolicy();
  const fieldPolicy = policy.fields[fieldName];
  
  if (!fieldPolicy) return value;

  let result = value;

  if (fieldPolicy.strip_emoji) {
    result = result.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  }

  if (fieldPolicy.max_length && result.length > fieldPolicy.max_length) {
    result = result.slice(0, fieldPolicy.max_length);
  }

  return result.replace(/\s+/g, ' ').trim();
}

// PII redaction for logging
const PII_PATTERNS = [
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Emails
  /\b\d{3}-\d{2}-\d{4}\b/g // SSN-like patterns
];

export function redactPII(text: string): string {
  let result = text;
  
  for (const pattern of PII_PATTERNS) {
    result = result.replace(pattern, '***');
  }
  
  return result;
}

// Rank output schema
export const RankOutputSchema = z.object({
  fitScore: z.number().min(0).max(100),
  reasons: z.array(z.string()),
  mustHaves: z.array(z.string()),
  blockers: z.array(z.string())
});

export type RankOutput = z.infer<typeof RankOutputSchema>;

// Mapping output schema
export const MappingOutputSchema = z.object({
  mappings: z.array(z.object({
    label: z.string(),
    key: z.string()
  }))
});

export type MappingOutput = z.infer<typeof MappingOutputSchema>;


