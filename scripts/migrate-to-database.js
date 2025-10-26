#!/usr/bin/env node

/**
 * Migration script to populate database from .env file and resume files
 * This extracts user profile, skills, experience, and education from existing sources
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import mammoth from 'mammoth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Parse .env file
function parseEnvFile(envPath) {
  const env = {};
  
  if (!existsSync(envPath)) {
    console.log('No .env file found. Skipping .env migration.');
    return env;
  }
  
  const envContent = readFileSync(envPath, 'utf-8');
  
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  }
  
  return env;
}

// Extract text from DOCX file
async function extractDocxText(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error(`Failed to extract text from ${filePath}:`, error.message);
    return '';
  }
}

// Simple skill extraction from resume text
function extractSkillsFromText(text) {
  const skills = [];
  
  // Common technology patterns
  const techPatterns = [
    /C#/gi, /\.NET/gi, /ASP\.NET/gi, /Azure/gi, /SQL Server/gi, 
    /JavaScript/gi, /TypeScript/gi, /React/gi, /Node\.js/gi,
    /Docker/gi, /Kubernetes/gi, /Microservices/gi, /REST API/gi,
    /Event-Driven/gi, /Message Queue/gi, /Redis/gi, /MongoDB/gi,
    /AWS/gi, /GCP/gi, /DevOps/gi, /CI\/CD/gi, /Git/gi,
    /Python/gi, /Java/gi, /Go/gi, /Ruby/gi, /PHP/gi,
    /PostgreSQL/gi, /MySQL/gi, /GraphQL/gi, /OAuth/gi,
    /Terraform/gi, /Ansible/gi, /Jenkins/gi, /GitHub Actions/gi
  ];
  
  const foundSkills = new Set();
  
  for (const pattern of techPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      // Normalize the skill name
      const skillName = matches[0];
      foundSkills.add(skillName);
    }
  }
  
  return Array.from(foundSkills);
}

// Extract experience sections from resume text
function extractExperienceFromText(text) {
  const experiences = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  let currentExp = null;
  let inExperienceSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect experience section start
    if (line.match(/^(experience|work history|employment|professional experience)/i)) {
      inExperienceSection = true;
      continue;
    }
    
    // Detect section end
    if (inExperienceSection && line.match(/^(education|skills|projects|certifications)/i)) {
      if (currentExp) {
        experiences.push(currentExp);
      }
      break;
    }
    
    if (inExperienceSection) {
      // Try to detect job title and company
      // Common formats: "Senior Engineer at Company" or "Company - Senior Engineer"
      const titleCompanyMatch = line.match(/^(.+?)\s+(?:at|@|-)\s+(.+?)(?:\s+\||$)/i);
      
      if (titleCompanyMatch && line.length < 100) {
        // Save previous experience
        if (currentExp) {
          experiences.push(currentExp);
        }
        
        // Start new experience
        currentExp = {
          title: titleCompanyMatch[1].trim(),
          company: titleCompanyMatch[2].trim(),
          description: '',
          technologies: '',
          achievements: ''
        };
      } else if (currentExp && line.startsWith('•') || line.startsWith('-')) {
        // Bullet point - add to description
        currentExp.description += (currentExp.description ? '\n' : '') + line;
      }
    }
  }
  
  // Add last experience
  if (currentExp) {
    experiences.push(currentExp);
  }
  
  return experiences;
}

// Extract education from resume text
function extractEducationFromText(text) {
  const education = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  let inEducationSection = false;
  
  for (const line of lines) {
    // Detect education section
    if (line.match(/^(education|academic)/i)) {
      inEducationSection = true;
      continue;
    }
    
    // Detect section end
    if (inEducationSection && line.match(/^(experience|skills|projects|certifications)/i)) {
      break;
    }
    
    if (inEducationSection && line.length > 10 && line.length < 200) {
      // Look for degree patterns
      const degreeMatch = line.match(/(bachelor|master|phd|bs|ms|ba|ma|mba|b\.s\.|m\.s\.|b\.a\.|m\.a\.)/i);
      
      if (degreeMatch) {
        education.push({
          institution: line,
          degree: degreeMatch[0],
          field: '',
          graduation_year: ''
        });
      }
    }
  }
  
  return education;
}

// Main migration function
async function migrate() {
  console.log('🔄 Starting database migration...\n');
  
  // 1. Read .env file
  const envPath = join(rootDir, '.env');
  const env = parseEnvFile(envPath);
  
  // 2. Open database
  const dbPath = join(rootDir, 'data', 'app.db');
  const db = new Database(dbPath);
  
  try {
    // 3. Migrate user profile from .env
    if (env.FULL_NAME && env.EMAIL) {
      console.log('📋 Migrating user profile from .env...');
      
      const nameParts = (env.FULL_NAME || '').split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      db.prepare(`
        INSERT OR REPLACE INTO user_profile 
        (id, full_name, first_name, last_name, email, phone, city, 
         linkedin_profile, work_authorization, requires_sponsorship, profile_summary)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        env.FULL_NAME || '',
        firstName,
        lastName,
        env.EMAIL || '',
        env.PHONE || null,
        env.CITY || null,
        env.LINKEDIN_PROFILE || null,
        env.WORK_AUTHORIZATION || 'Citizen',
        env.REQUIRES_SPONSORSHIP || 'No',
        env.PROFILE_SUMMARY || null
      );
      
      console.log(`✅ User profile migrated: ${env.FULL_NAME}`);
    } else {
      console.log('⚠️  No user profile data found in .env');
    }
    
    // 4. Migrate application preferences
    console.log('\n⚙️  Migrating application preferences...');
    
    const preferences = [
      { key: 'MIN_FIT_SCORE', value: env.MIN_FIT_SCORE || '70', description: 'Minimum job fit score threshold' },
      { key: 'YEARS_DOTNET', value: env.YEARS_DOTNET || '', description: 'Years of .NET experience' },
      { key: 'YEARS_AZURE', value: env.YEARS_AZURE || '', description: 'Years of Azure experience' }
    ];
    
    for (const pref of preferences) {
      if (pref.value) {
        db.prepare(`
          INSERT OR REPLACE INTO application_preferences (key, value, description)
          VALUES (?, ?, ?)
        `).run(pref.key, pref.value, pref.description);
        console.log(`✅ Preference: ${pref.key} = ${pref.value}`);
      }
    }
    
    // 5. Process resume files
    console.log('\n📄 Processing resume files...');
    
    const resumesDir = join(rootDir, 'resumes');
    if (existsSync(resumesDir)) {
      const resumeFiles = readdirSync(resumesDir).filter(f => 
        f.endsWith('.docx') || f.endsWith('.pdf')
      );
      
      for (const fileName of resumeFiles) {
        console.log(`\n  Processing: ${fileName}`);
        const filePath = join(resumesDir, fileName);
        
        // Extract text (only DOCX for now)
        let fullText = '';
        if (fileName.endsWith('.docx')) {
          fullText = await extractDocxText(filePath);
        }
        
        if (!fullText) {
          console.log(`  ⚠️  Could not extract text from ${fileName}`);
          continue;
        }
        
        // Save resume file metadata
        const resumeResult = db.prepare(`
          INSERT INTO resume_files (file_name, variant_type, parsed_at, sections_extracted, is_active, full_text)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(file_name) DO UPDATE SET
            parsed_at = excluded.parsed_at,
            full_text = excluded.full_text,
            sections_extracted = excluded.sections_extracted
        `).run(
          fileName,
          fileName.toLowerCase().includes('senior') ? 'senior' : 
          fileName.toLowerCase().includes('lead') ? 'lead' : 'general',
          new Date().toISOString(),
          0,
          1,
          fullText
        );
        
        const resumeFileId = resumeResult.lastInsertRowid;
        
        // Extract and save skills
        const skills = extractSkillsFromText(fullText);
        console.log(`  📚 Found ${skills.length} skills`);
        
        for (const skillName of skills) {
          db.prepare(`
            INSERT INTO user_skills (skill_name, category, source, resume_file_id)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(skill_name, category) DO UPDATE SET
              source = 'resume',
              resume_file_id = excluded.resume_file_id
          `).run(skillName, null, 'resume', resumeFileId);
        }
        
        // Extract and save experience
        const experiences = extractExperienceFromText(fullText);
        console.log(`  💼 Found ${experiences.length} work experiences`);
        
        for (const exp of experiences) {
          db.prepare(`
            INSERT INTO user_experience 
            (company, title, description, technologies, achievements, resume_file_id)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            exp.company,
            exp.title,
            exp.description || null,
            exp.technologies || null,
            exp.achievements || null,
            resumeFileId
          );
        }
        
        // Extract and save education
        const educations = extractEducationFromText(fullText);
        console.log(`  🎓 Found ${educations.length} education entries`);
        
        for (const edu of educations) {
          db.prepare(`
            INSERT INTO user_education 
            (institution, degree, field, graduation_year, resume_file_id)
            VALUES (?, ?, ?, ?, ?)
          `).run(
            edu.institution,
            edu.degree || null,
            edu.field || null,
            edu.graduation_year || null,
            resumeFileId
          );
        }
        
        // Update sections count
        const totalSections = skills.length + experiences.length + educations.length;
        db.prepare(`
          UPDATE resume_files SET sections_extracted = ? WHERE id = ?
        `).run(totalSections, resumeFileId);
        
        console.log(`  ✅ Extracted ${totalSections} sections total`);
      }
    } else {
      console.log('  ⚠️  No resumes directory found');
    }
    
    // 6. Add default common answers
    console.log('\n💬 Adding default common answers...');
    
    const commonAnswers = [
      { 
        key: 'salary_expectation', 
        text: 'Open to discussion based on role and responsibilities',
        description: 'Default salary expectation response'
      },
      { 
        key: 'remote_preference', 
        text: 'Open to remote, hybrid, or on-site',
        description: 'Work location preference'
      },
      { 
        key: 'start_date', 
        text: '2-4 weeks notice',
        description: 'Available start date'
      }
    ];
    
    for (const answer of commonAnswers) {
      db.prepare(`
        INSERT OR IGNORE INTO common_answers (question_key, answer_text, description)
        VALUES (?, ?, ?)
      `).run(answer.key, answer.text, answer.description);
      console.log(`  ✅ ${answer.key}: ${answer.text}`);
    }
    
    // 7. Create backup of .env and generate new simplified version
    if (existsSync(envPath)) {
      console.log('\n💾 Creating .env backup...');
      const backupPath = join(rootDir, '.env.backup');
      copyFileSync(envPath, backupPath);
      console.log(`  ✅ Backup saved to .env.backup`);
      
      console.log('\n📝 Generating new simplified .env...');
      const newEnv = `# Job Application Automation Environment Configuration
# Technical settings only - user data is now in the database

# AI/LLM Configuration
OLLAMA_BASE_URL=${env.OLLAMA_BASE_URL || 'http://localhost:11434'}
LLM_MODEL=${env.LLM_MODEL || 'llama3.1:8b'}
LLM_TEMPERATURE=${env.LLM_TEMPERATURE || '0.1'}

# Browser Automation
HEADLESS=${env.HEADLESS || 'false'}
SLOW_MO=${env.SLOW_MO || '80'}
RANDOM_DELAY_MIN=${env.RANDOM_DELAY_MIN || '600'}
RANDOM_DELAY_MAX=${env.RANDOM_DELAY_MAX || '1200'}

# Debugging
ENABLE_TRACING=${env.ENABLE_TRACING || 'false'}
`;
      
      writeFileSync(join(rootDir, '.env.new'), newEnv);
      console.log('  ✅ New .env saved to .env.new');
      console.log('  ℹ️  Review .env.new and replace .env when ready');
    }
    
    // 8. Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed successfully!\n');
    
    const userProfile = db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
    const skillCount = db.prepare('SELECT COUNT(*) as count FROM user_skills').get();
    const expCount = db.prepare('SELECT COUNT(*) as count FROM user_experience').get();
    const eduCount = db.prepare('SELECT COUNT(*) as count FROM user_education').get();
    const resumeCount = db.prepare('SELECT COUNT(*) as count FROM resume_files').get();
    
    console.log('📊 Migration Summary:');
    console.log(`   User Profile: ${userProfile ? '✅ Migrated' : '❌ Not found'}`);
    console.log(`   Skills: ${skillCount.count} entries`);
    console.log(`   Experience: ${expCount.count} entries`);
    console.log(`   Education: ${eduCount.count} entries`);
    console.log(`   Resume Files: ${resumeCount.count} processed`);
    
    console.log('\n📋 Next Steps:');
    console.log('   1. Review migrated data in the dashboard');
    console.log('   2. Add/edit skills manually for better accuracy');
    console.log('   3. Review .env.new and replace .env when ready');
    console.log('   4. Test application with: npm run cli -- search');
    console.log('   5. Original .env backed up to .env.backup');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run migration
migrate().catch(error => {
  console.error('Migration error:', error);
  process.exit(1);
});

