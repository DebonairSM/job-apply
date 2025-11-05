import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getUserProfile } from './db.js';

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

// Campaign configuration
export interface CampaignConfig {
  name: string;
  painPoints: string[];
  solution: string;
  targetPersonas: string[];
}

// Technical configuration from .env (non-personal data)
export interface TechnicalConfig {
  ollamaBaseUrl: string;
  llmModel: string;
  backgroundGenModel: string;
  llmTemperature: number;
  headless: boolean;
  slowMo: number;
  randomDelayMin: number;
  randomDelayMax: number;
  enableTracing: boolean;
  campaign: CampaignConfig;
}

// User configuration from database
export interface UserConfig {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  linkedinProfile: string;
  workAuthorization: string;
  requiresSponsorship: string;
  profileSummary: string;
}

// Combined configuration (backward compatibility)
export interface AppConfig extends TechnicalConfig, UserConfig {
  resumeVariants: string[];
  minFitScore: number;
  yearsDotnet: string;
  yearsAzure: string;
}

// Load technical settings from .env only
export function loadTechnicalConfig(): TechnicalConfig {
  const dotenv: Record<string, string> = {};
  
  try {
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

  // Default campaign configuration
  const campaign: CampaignConfig = {
    name: 'Workflow Automation',
    painPoints: [
      'spreadsheet-based workflows',
      'manual processes',
      'lack of automation',
      'data silos',
      'inefficient operations'
    ],
    solution: 'AI-assisted workflow automation with local-first architecture that cuts costs while giving full data control',
    targetPersonas: [
      'technical leaders',
      'CTOs',
      'innovation directors',
      'digital transformation leaders',
      'operations managers'
    ]
  };

  return {
    ollamaBaseUrl: env.OLLAMA_BASE_URL || 'http://localhost:11434',
    llmModel: env.LLM_MODEL || 'llama3.1:8b',
    backgroundGenModel: env.BACKGROUND_GEN_MODEL || env.LLM_MODEL || 'qwen2.5:14b',
    llmTemperature: parseFloat(env.LLM_TEMPERATURE || '0.1'),
    headless: env.HEADLESS === 'true',
    slowMo: parseInt(env.SLOW_MO || '80', 10),
    randomDelayMin: parseInt(env.RANDOM_DELAY_MIN || '600', 10),
    randomDelayMax: parseInt(env.RANDOM_DELAY_MAX || '1200', 10),
    enableTracing: env.ENABLE_TRACING !== 'false',
    campaign
  };
}

// Load user configuration from database with .env fallback
export function getUserConfig(): UserConfig {
  // Try to load from database first
  try {
    const profile = getUserProfile();
    
    if (profile) {
      return {
        fullName: profile.full_name || '',
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        city: profile.city || '',
        linkedinProfile: profile.linkedin_profile || '',
        workAuthorization: profile.work_authorization || 'Citizen',
        requiresSponsorship: profile.requires_sponsorship || 'No',
        profileSummary: profile.profile_summary || ''
      };
    }
  } catch (error) {
    console.warn('Could not load user profile from database, falling back to .env');
  }
  
  // Fallback to .env for backward compatibility
  const dotenv: Record<string, string> = {};
  
  try {
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
    // Ignore
  }

  const env = { ...process.env, ...dotenv };
  const nameParts = (env.FULL_NAME || '').split(/\s+/);

  return {
    fullName: env.FULL_NAME || '',
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    email: env.EMAIL || '',
    phone: env.PHONE || '',
    city: env.CITY || '',
    linkedinProfile: env.LINKEDIN_PROFILE || '',
    workAuthorization: env.WORK_AUTHORIZATION || 'Citizen',
    requiresSponsorship: env.REQUIRES_SPONSORSHIP || 'No',
    profileSummary: env.PROFILE_SUMMARY || ''
  };
}

// Get application preference from database with fallback
export function getAppPreference(key: string, defaultValue?: string): string {
  try {
    const db = require('./db.js');
    return db.getApplicationPreference(key, defaultValue) || defaultValue || '';
  } catch (error) {
    return defaultValue || '';
  }
}

// Load complete configuration (backward compatibility)
export function loadConfig(): AppConfig {
  const technical = loadTechnicalConfig();
  const user = getUserConfig();
  
  // Get resume variants from database
  let resumeVariants: string[] = ['Rommel Bandeira - API Engineer.docx'];
  try {
    const db = require('./db.js');
    const resumes = db.getResumeFiles(true); // Active only
    if (resumes.length > 0) {
      resumeVariants = resumes.map((r: any) => r.file_name);
    }
  } catch (error) {
    // Fallback to .env
    const dotenv: Record<string, string> = {};
    try {
      const envPath = join(__dirname, '../../.env');
      const envContent = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : '';
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          dotenv[key.trim()] = valueParts.join('=').trim();
        }
      }
    } catch (e) {
      // Ignore
    }
    const env = { ...process.env, ...dotenv };
    if (env.RESUME_VARIANTS) {
      resumeVariants = env.RESUME_VARIANTS.split(',').map(v => v.trim());
    }
  }
  
  // Get preferences from database or .env
  const minFitScore = parseInt(getAppPreference('MIN_FIT_SCORE', '70'), 10);
  const yearsDotnet = getAppPreference('YEARS_DOTNET', '');
  const yearsAzure = getAppPreference('YEARS_AZURE', '');
  
  return {
    ...technical,
    ...user,
    resumeVariants,
    minFitScore,
    yearsDotnet,
    yearsAzure
  };
}

export function getResumePath(variant: string): string {
  return join(RESUMES_DIR, variant);
}


