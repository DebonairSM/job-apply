import { getUserConfig } from '../src/lib/session.js';

console.log('Testing user profile loading...\n');

try {
  const config = getUserConfig();
  
  console.log('✅ User profile loaded successfully:');
  console.log('  Full Name:', config.fullName);
  console.log('  Email:', config.email);
  console.log('  Phone:', config.phone);
  console.log('  City:', config.city);
  console.log('  Work Authorization:', config.workAuthorization);
  console.log('  Requires Sponsorship:', config.requiresSponsorship);
  
  if (config.fullName && config.email) {
    console.log('\n✅ Profile loaded from database (no warning expected)');
  } else {
    console.log('\n⚠️  Profile loaded from .env fallback');
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}

