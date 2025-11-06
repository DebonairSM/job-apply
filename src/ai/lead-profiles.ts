// Lead profiles for targeted LinkedIn connection scraping
//
// Profiles group related job titles together for easier filtering
// when scraping 1st degree LinkedIn connections.

export interface LeadProfile {
  name: string;
  description: string;
  titles: string[];
}

export const LEAD_PROFILES: Record<string, LeadProfile> = {
  chiefs: {
    name: 'C-Suite & Leadership',
    description: 'Chief-level executives and senior leadership roles',
    titles: [
      'CTO',
      'Chief Technology Officer',
      'CIO',
      'Chief Information Officer',
      'CEO',
      'Chief Executive Officer',
      'COO',
      'Chief Operating Officer',
      'CFO',
      'Chief Financial Officer',
      'CPO',
      'Chief Product Officer',
      'Chief Product & Technology Officer',
      'CRO',
      'Chief Revenue Officer',
      'CISO',
      'Chief Information Security Officer',
      'General Manager',
      'Managing Partner',
      'VP',
      'Vice President',
      'SVP',
      'Senior Vice President',
      'EVP',
      'Executive Vice President'
    ]
  },

  founders: {
    name: 'Founders & Entrepreneurs',
    description: 'Company founders, co-founders, and entrepreneurs',
    titles: [
      'Founder',
      'Co-Founder',
      'Cofounder',
      'Owner',
      'Entrepreneur',
      'President',
      'Managing Partner',
      'Partner'
    ]
  },

  directors: {
    name: 'Directors & Senior Management',
    description: 'Director-level and senior management positions',
    titles: [
      'Director',
      'Senior Director',
      'Managing Director',
      'Head of Engineering',
      'Head of Technology',
      'Head of Product',
      'Head of Development',
      'Engineering Manager',
      'Technical Director',
      'Principal Engineer',
      'Distinguished Engineer',
      'Staff Engineer'
    ]
  },

  techLeads: {
    name: 'Technical Leadership',
    description: 'Technical leads and senior engineers',
    titles: [
      'Tech Lead',
      'Technical Lead',
      'Lead Engineer',
      'Lead Developer',
      'Senior Engineer',
      'Senior Developer',
      'Architect',
      'Solution Architect',
      'Enterprise Architect',
      'Cloud Architect',
      'Principal Architect'
    ]
  },

  productLeads: {
    name: 'Product Leadership',
    description: 'Product management and strategy roles',
    titles: [
      'Product Manager',
      'Senior Product Manager',
      'Principal Product Manager',
      'VP Product',
      'Director of Product',
      'Head of Product',
      'Chief Product Officer',
      'CPO',
      'Product Owner',
      'Product Director'
    ]
  },

  recruiters: {
    name: 'Recruiters & Talent Acquisition',
    description: 'Recruitment and talent acquisition professionals',
    titles: [
      'Recruiter',
      'Technical Recruiter',
      'Senior Recruiter',
      'Talent Acquisition',
      'Head of Recruiting',
      'Director of Recruiting',
      'Recruitment Manager',
      'Hiring Manager',
      'Sourcer',
      'Talent Partner'
    ]
  },

  sales: {
    name: 'Sales & Business Development',
    description: 'Sales and business development roles',
    titles: [
      'Sales',
      'Account Executive',
      'Sales Engineer',
      'Business Development',
      'VP Sales',
      'Director of Sales',
      'Head of Sales',
      'Chief Revenue Officer',
      'CRO',
      'Sales Director',
      'Sales Manager'
    ]
  },

  consultants: {
    name: 'Consultants & Advisors',
    description: 'Consulting and advisory roles',
    titles: [
      'Consultant',
      'Senior Consultant',
      'Principal Consultant',
      'Advisory',
      'Advisor',
      'Technical Consultant',
      'Solutions Consultant',
      'Strategy Consultant',
      'Independent Consultant',
      'Fractional CTO'
    ]
  }
};

// Helper function to get profile by key
export function getLeadProfile(profileKey: string): LeadProfile | undefined {
  return LEAD_PROFILES[profileKey];
}

// Helper function to get all profile keys
export function getLeadProfileKeys(): string[] {
  return Object.keys(LEAD_PROFILES);
}

// Helper function to get titles for a profile
export function getLeadProfileTitles(profileKey: string): string[] {
  const profile = LEAD_PROFILES[profileKey];
  return profile ? profile.titles : [];
}

