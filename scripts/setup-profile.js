#!/usr/bin/env node

/**
 * Quick setup script to populate user profile in database
 * Edit the values below to match your information
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const dbPath = join(rootDir, 'data', 'app.db');
const db = new Database(dbPath);

console.log('\n🔄 Setting up user profile in database...\n');

try {
  // EDIT THESE VALUES WITH YOUR INFORMATION
  const profile = {
    full_name: 'Your Name',
    first_name: 'Your',
    last_name: 'Name',
    email: 'your.email@example.com',
    phone: '+1-555-0123', // Optional
    city: 'Your City', // Optional
    linkedin_profile: 'https://linkedin.com/in/yourprofile', // Optional
    work_authorization: 'Citizen', // Or 'Green Card', 'H1B', etc.
    requires_sponsorship: 'No', // Or 'Yes'
    profile_summary: 'Your professional summary here' // Optional
  };

  // Check if profile already exists
  const existing = db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
  
  if (existing) {
    console.log('⚠️  User profile already exists:');
    console.log(`   Name: ${existing.full_name}`);
    console.log(`   Email: ${existing.email}\n`);
    
    // Update existing profile
    db.prepare(`
      UPDATE user_profile 
      SET full_name = ?, first_name = ?, last_name = ?, email = ?, phone = ?, 
          city = ?, linkedin_profile = ?, work_authorization = ?, 
          requires_sponsorship = ?, profile_summary = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(
      profile.full_name,
      profile.first_name,
      profile.last_name,
      profile.email,
      profile.phone,
      profile.city,
      profile.linkedin_profile,
      profile.work_authorization,
      profile.requires_sponsorship,
      profile.profile_summary
    );
    
    console.log('✅ Profile updated successfully!\n');
  } else {
    // Insert new profile
    db.prepare(`
      INSERT INTO user_profile (id, full_name, first_name, last_name, email, phone, 
                                city, linkedin_profile, work_authorization, 
                                requires_sponsorship, profile_summary)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      profile.full_name,
      profile.first_name,
      profile.last_name,
      profile.email,
      profile.phone,
      profile.city,
      profile.linkedin_profile,
      profile.work_authorization,
      profile.requires_sponsorship,
      profile.summary
    );
    
    console.log('✅ Profile created successfully!\n');
  }

  // Display current profile
  const saved = db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
  console.log('📋 Current Profile:');
  console.log(`   Name: ${saved.full_name}`);
  console.log(`   Email: ${saved.email}`);
  if (saved.phone) console.log(`   Phone: ${saved.phone}`);
  if (saved.city) console.log(`   City: ${saved.city}`);
  if (saved.linkedin_profile) console.log(`   LinkedIn: ${saved.linkedin_profile}`);
  console.log(`   Authorization: ${saved.work_authorization}`);
  console.log(`   Needs Sponsorship: ${saved.requires_sponsorship}`);
  
  console.log('\n📋 Next Steps:');
  console.log('   1. Edit this script (scripts/setup-profile.js) with your actual information');
  console.log('   2. Run it again: node scripts/setup-profile.js');
  console.log('   3. Or use the dashboard Settings page to edit your profile');
  console.log('   4. Add skills via dashboard or run migration if you have resumes\n');

} catch (error) {
  console.error('\n❌ Error:', error.message);
  throw error;
} finally {
  db.close();
}

