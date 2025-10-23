import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
export const STORAGE_STATE_PATH = join(__dirname, '../../storage/storageState.json');
export const RESUMES_DIR = join(__dirname, '../../resumes');
export const ARTIFACTS_DIR = join(__dirname, '../../artifacts');
export const DATA_DIR = join(__dirname, '../../data');

// Check if session exists
export function hasSession(): boolean {
  return existsSync(STORAGE_STATE_PATH);
}

// Environment configuration
export interface AppConfig {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  linkedinProfile: string;
  workAuthorization: string;
  requiresSponsorship: string;
  yearsDotnet: string;
  yearsAzure: string;
  profileSummary: string;
  resumeVariants: string[];
  ollamaBaseUrl: string;
  llmModel: string;
  llmTemperature: number;
  minFitScore: number;
  headless: boolean;
  slowMo: number;
  randomDelayMin: number;
  randomDelayMax: number;
  enableTracing: boolean;
}

export function loadConfig(): AppConfig {
  // Load environment variables
  const dotenv: Record<string, string> = {};
  
  try {
    // Use absolute path to .env file (2 levels up from src/lib/)
    const envPath = join(__dirname, '../../.env');
    const envContent = existsSync(envPath) 
      ? readFileSync(envPath, 'utf-8')
      : '';
    
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        dotenv[key.trim()] = valueParts.join('=').trim();
      }
    }
  } catch (error) {
    // Env file doesn't exist or error reading, will use defaults
  }

  const env = { ...process.env, ...dotenv };

  return {
    fullName: env.FULL_NAME || '',
    email: env.EMAIL || '',
    phone: env.PHONE || '',
    city: env.CITY || '',
    linkedinProfile: env.LINKEDIN_PROFILE || '',
    workAuthorization: env.WORK_AUTHORIZATION || 'Citizen',
    requiresSponsorship: env.REQUIRES_SPONSORSHIP || 'No',
    yearsDotnet: env.YEARS_DOTNET || '',
    yearsAzure: env.YEARS_AZURE || '',
    profileSummary: env.PROFILE_SUMMARY || '',
    resumeVariants: env.RESUME_VARIANTS 
      ? env.RESUME_VARIANTS.split(',').map(v => v.trim())
      : ['Rommel Bandeira - API Engineer.docx'],
    ollamaBaseUrl: env.OLLAMA_BASE_URL || 'http://localhost:11434',
    llmModel: env.LLM_MODEL || 'llama3.1:8b',
    llmTemperature: parseFloat(env.LLM_TEMPERATURE || '0.1'),
    minFitScore: parseInt(env.MIN_FIT_SCORE || '70', 10),
    headless: env.HEADLESS === 'true',
    slowMo: parseInt(env.SLOW_MO || '80', 10),
    randomDelayMin: parseInt(env.RANDOM_DELAY_MIN || '600', 10),
    randomDelayMax: parseInt(env.RANDOM_DELAY_MAX || '1200', 10),
    enableTracing: env.ENABLE_TRACING !== 'false'
  };
}

export function getResumePath(variant: string): string {
  return join(RESUMES_DIR, variant);
}


