import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildOutreachEmail,
  generateOutreachEmail,
  LeadProfile,
  EmailContext,
  Lead,
  EmailContent
} from '../../src/ai/email-templates';

/**
 * Tests for email template generation
 * 
 * These tests verify:
 * 1. New API (buildOutreachEmail) works with full and minimal profiles
 * 2. Legacy API (generateOutreachEmail) maintains backward compatibility
 * 3. Email structure is correct (subject, body, required elements)
 * 4. Natural copy with no broken template markers
 * 5. Profile-specific template routing
 */

describe('Email Templates - New API (buildOutreachEmail)', () => {
  
  it('should generate email with full lead profile', () => {
    const fullProfile: LeadProfile = {
      firstName: 'Sarah',
      lastName: 'Johnson',
      roleTitle: 'Chief Technology Officer',
      companyName: 'TechCorp Industries',
      industry: 'Financial Services',
      keyInitiatives: ['Digital Transformation', 'Cloud Migration'],
      primaryPainPoint: 'Our team spends 15 hours per week reconciling spreadsheets manually. This delays critical financial reports and creates accuracy issues.',
      city: 'New York',
      stateOrRegion: 'NY'
    };

    const context: EmailContext = {
      lead: fullProfile,
      productName: 'Spreadsheet Automation Platform',
      productUrl: 'https://vsol.software/agentic#featured-product',
      calendlyUrl: 'https://calendly.com/vsol-software/discovery'
    };

    const email = buildOutreachEmail(context, 'chiefs');

    // Assert subject is non-empty and mentions company
    assert.ok(email.subject.length > 0, 'Subject should not be empty');
    assert.ok(email.subject.includes('TechCorp Industries'), 'Subject should mention company name');

    // Assert body includes all required elements
    assert.ok(email.bodyText.includes('Sarah'), 'Body should include first name');
    assert.ok(email.bodyText.includes(fullProfile.primaryPainPoint!), 'Body should include pain point');
    assert.ok(email.bodyText.includes(context.productUrl), 'Body should include product URL');
    assert.ok(email.bodyText.includes(context.calendlyUrl), 'Body should include Calendly URL');
    assert.ok(email.bodyText.includes('Is a brief conversation this week worth exploring?'), 'Body should include softened CTA');

    // Assert no broken template markers
    assert.ok(!email.bodyText.includes('{{'), 'Body should not contain unresolved template markers');
    assert.ok(!email.bodyText.includes('}}'), 'Body should not contain unresolved template markers');
    assert.ok(!email.bodyText.includes('undefined'), 'Body should not contain undefined values');

    // Assert signature present
    assert.ok(email.bodyText.includes('Rommel Bandeira'), 'Body should include signature');
    assert.ok(email.bodyText.includes('VSol Software'), 'Body should include company name in signature');
  });

  it('should generate email with minimal lead profile', () => {
    const minimalProfile: LeadProfile = {
      firstName: 'John',
      roleTitle: 'Manager',
      companyName: 'Small Business Inc'
    };

    const context: EmailContext = {
      lead: minimalProfile,
      productName: 'Workflow Automation Platform',
      productUrl: 'https://vsol.software/agentic#featured-product',
      calendlyUrl: 'https://calendly.com/vsol-software/discovery'
    };

    const email = buildOutreachEmail(context, 'generic');

    // Assert subject is non-empty
    assert.ok(email.subject.length > 0, 'Subject should not be empty');
    assert.ok(email.subject.includes('Small Business Inc'), 'Subject should mention company');

    // Assert body has graceful fallback content
    assert.ok(email.bodyText.includes('John'), 'Body should include first name');
    
    // Generic template doesn't include URL (only chiefs does)
    // But should have automation messaging
    assert.ok(email.bodyText.includes('automate'), 'Body should mention automation');
    
    // With minimal data, should use fallback pain point
    assert.ok(email.bodyText.length > 200, 'Body should have substantial content even with minimal data');

    // Assert no broken template markers or undefined values
    assert.ok(!email.bodyText.includes('{{'), 'Body should not contain template markers');
    assert.ok(!email.bodyText.includes('}}'), 'Body should not contain template markers');
    assert.ok(!email.bodyText.includes('undefined'), 'Body should not contain undefined values');
    
    // Assert call to action present
    assert.ok(email.bodyText.includes('Is a brief conversation'), 'Body should include CTA');
  });

  it('should route to chiefs template correctly', () => {
    const profile: LeadProfile = {
      firstName: 'Maria',
      roleTitle: 'CIO',
      companyName: 'Enterprise Corp'
    };

    const context: EmailContext = {
      lead: profile,
      productName: 'Spreadsheet Automation Platform',
      productUrl: 'https://vsol.software/agentic#featured-product',
      calendlyUrl: 'https://calendly.com/vsol-software/discovery'
    };

    const email = buildOutreachEmail(context, 'chiefs');

    // Chiefs template should focus on spreadsheets
    assert.ok(email.subject.includes('spreadsheet'), 'Chiefs subject should mention spreadsheets');
    assert.ok(email.bodyText.includes('Spreadsheet Automation Platform'), 'Body should mention spreadsheet platform');
    assert.ok(email.bodyText.includes('spreadsheet workflows'), 'Body should discuss spreadsheet workflows');
  });

  it('should route to generic template correctly', () => {
    const profile: LeadProfile = {
      firstName: 'Alex',
      roleTitle: 'Operations Manager',
      companyName: 'MidSize Company'
    };

    const context: EmailContext = {
      lead: profile,
      productName: 'Workflow Automation Platform',
      productUrl: 'https://vsol.software/agentic#featured-product',
      calendlyUrl: 'https://calendly.com/vsol-software/discovery'
    };

    const email = buildOutreachEmail(context, 'generic');

    // Generic template should focus on general workflow automation
    assert.ok(email.subject.includes('workflow'), 'Generic subject should mention workflow');
    assert.ok(email.bodyText.includes('automate'), 'Body should discuss automation');
    assert.ok(email.bodyText.length > 300, 'Body should have full content');
  });

  it('should generate appropriate pain point for executive roles', () => {
    const executiveProfile: LeadProfile = {
      firstName: 'Robert',
      roleTitle: 'Chief Operating Officer',
      companyName: 'BigCorp'
    };

    const context: EmailContext = {
      lead: executiveProfile,
      productName: 'Spreadsheet Automation Platform',
      productUrl: 'https://vsol.software/agentic#featured-product',
      calendlyUrl: 'https://calendly.com/vsol-software/discovery'
    };

    const email = buildOutreachEmail(context, 'chiefs');

    // Should include executive-appropriate pain point about digital transformation or decision-making
    assert.ok(
      email.bodyText.includes('digital transformation') || 
      email.bodyText.includes('decisions') ||
      email.bodyText.includes('data'),
      'Body should include executive-appropriate pain point'
    );
  });
});

describe('Email Templates - Legacy API (generateOutreachEmail)', () => {
  
  it('should throw error when lead has no email', () => {
    const leadWithoutEmail: Lead = {
      id: '123',
      name: 'Test Person',
      title: 'Manager',
      company: 'Test Corp'
    };

    assert.throws(
      () => generateOutreachEmail(leadWithoutEmail),
      /does not have an email address/,
      'Should throw error for lead without email'
    );
  });

  it('should generate email for lead with full data', () => {
    const fullLead: Lead = {
      id: '456',
      name: 'Jennifer Martinez',
      title: 'VP of Operations',
      company: 'Acme Corporation',
      email: 'jennifer.martinez@acme.com',
      about: 'Experienced leader in digital transformation and workflow automation',
      background: 'Operations teams often struggle to maintain data consistency across multiple spreadsheets. Manual updates create bottlenecks that slow decision-making.',
      profile: 'chiefs'
    };

    const email = generateOutreachEmail(fullLead);

    // Assert structure
    assert.ok(email.to === fullLead.email, 'Email should be addressed correctly');
    assert.ok(email.subject.length > 0, 'Subject should not be empty');
    assert.ok(email.subject.includes('Acme Corporation'), 'Subject should mention company');
    assert.ok(email.body.length > 0, 'Body should not be empty');

    // Assert uses AI-generated background
    assert.ok(email.body.includes(fullLead.background!), 'Body should include AI-generated background');
    
    // Assert includes first name
    assert.ok(email.body.includes('Jennifer'), 'Body should include first name');

    // Assert no referral link by default
    assert.ok(!email.referralLink, 'Should not include referral link by default');
  });

  it('should generate email for lead with minimal data', () => {
    const minimalLead: Lead = {
      id: '789',
      name: 'Bob Smith',
      email: 'bob.smith@example.com'
    };

    const email = generateOutreachEmail(minimalLead);

    // Should still generate valid email
    assert.ok(email.to === minimalLead.email, 'Email should be addressed correctly');
    assert.ok(email.subject.length > 0, 'Subject should not be empty');
    assert.ok(email.body.length > 0, 'Body should not be empty');
    assert.ok(email.body.includes('Bob'), 'Body should include first name');

    // Should not have undefined or broken markers
    assert.ok(!email.body.includes('undefined'), 'Body should not contain undefined');
    assert.ok(!email.body.includes('{{'), 'Body should not contain template markers');
  });

  it('should include referral section when requested', () => {
    const lead: Lead = {
      id: '101',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      title: 'Director',
      company: 'Example Inc',
      profile: 'directors'
    };

    const emailWithReferral = generateOutreachEmail(lead, true);

    // Assert referral section is included
    assert.ok(emailWithReferral.referralLink, 'Should include referral link');
    assert.ok(emailWithReferral.body.includes('P.S.'), 'Body should include P.S. section');
    assert.ok(emailWithReferral.body.includes('referral'), 'Body should mention referral');
    assert.ok(emailWithReferral.body.includes(emailWithReferral.referralLink), 'Body should include the referral link');
  });

  it('should not include referral section by default', () => {
    const lead: Lead = {
      id: '102',
      name: 'Charlie Brown',
      email: 'charlie@example.com',
      title: 'Manager',
      company: 'Sample Corp'
    };

    const emailWithoutReferral = generateOutreachEmail(lead);

    // Assert no referral section
    assert.ok(!emailWithoutReferral.referralLink, 'Should not include referral link');
    assert.ok(!emailWithoutReferral.body.includes('P.S.'), 'Body should not include P.S. section');
  });

  it('should route to chiefs template when profile is chiefs', () => {
    const chiefsLead: Lead = {
      id: '103',
      name: 'Diana Prince',
      email: 'diana@wayneenterprises.com',
      title: 'Chief Information Officer',
      company: 'Wayne Enterprises',
      profile: 'chiefs'
    };

    const email = generateOutreachEmail(chiefsLead);

    // Chiefs template should focus on spreadsheets
    assert.ok(email.subject.includes('spreadsheet'), 'Chiefs subject should mention spreadsheets');
    assert.ok(
      email.body.includes('Spreadsheet Automation') || 
      email.body.includes('spreadsheet workflows'),
      'Body should focus on spreadsheet automation'
    );
  });

  it('should use generic template for non-chiefs profiles', () => {
    const genericLead: Lead = {
      id: '104',
      name: 'Edward Norton',
      email: 'edward@generic.com',
      title: 'Technical Lead',
      company: 'Generic Corp',
      profile: 'techLeads'
    };

    const email = generateOutreachEmail(genericLead);

    // Generic template should focus on general workflow automation
    assert.ok(email.subject.includes('workflow'), 'Generic subject should mention workflow');
    assert.ok(email.body.includes('automate'), 'Body should discuss automation');
  });

  it('should override profile with profileKey parameter', () => {
    const lead: Lead = {
      id: '105',
      name: 'Frank Castle',
      email: 'frank@example.com',
      title: 'Director',
      company: 'Example Corp',
      profile: 'generic' // Default profile
    };

    // Override with chiefs template
    const email = generateOutreachEmail(lead, false, 'chiefs');

    // Should use chiefs template despite lead.profile being generic
    assert.ok(email.subject.includes('spreadsheet'), 'Should use chiefs template when overridden');
  });

  it('should handle lead with worked_together field', () => {
    const lead: Lead = {
      id: '106',
      name: 'Grace Hopper',
      email: 'grace@example.com',
      title: 'Software Architect',
      company: 'Tech Innovations',
      worked_together: 'Navy Research Lab'
    };

    const email = generateOutreachEmail(lead);

    // Should mention past collaboration if no AI background
    // If AI background exists, it will use that instead
    assert.ok(email.body.length > 0, 'Should generate valid email');
    assert.ok(email.body.includes('Grace'), 'Should include first name');
  });
});

describe('Email Templates - Copy Quality', () => {
  
  it('chiefs template should not use em-dashes', () => {
    const profile: LeadProfile = {
      firstName: 'Test',
      roleTitle: 'CTO',
      companyName: 'TestCorp'
    };

    const context: EmailContext = {
      lead: profile,
      productName: 'Spreadsheet Automation Platform',
      productUrl: 'https://vsol.software/test',
      calendlyUrl: 'https://calendly.com/test'
    };

    const email = buildOutreachEmail(context, 'chiefs');

    // Should not contain em-dashes (—)
    assert.ok(!email.bodyText.includes('—'), 'Body should not contain em-dashes');
  });

  it('generic template should not use em-dashes', () => {
    const profile: LeadProfile = {
      firstName: 'Test',
      roleTitle: 'Manager',
      companyName: 'TestCorp'
    };

    const context: EmailContext = {
      lead: profile,
      productName: 'Workflow Automation',
      productUrl: 'https://vsol.software/test',
      calendlyUrl: 'https://calendly.com/test'
    };

    const email = buildOutreachEmail(context, 'generic');

    // Should not contain em-dashes
    assert.ok(!email.bodyText.includes('—'), 'Body should not contain em-dashes');
  });

  it('should use professional conversational tone', () => {
    const profile: LeadProfile = {
      firstName: 'Professional',
      roleTitle: 'VP',
      companyName: 'Business Inc'
    };

    const context: EmailContext = {
      lead: profile,
      productName: 'Platform',
      productUrl: 'https://test.com',
      calendlyUrl: 'https://calendly.com/test'
    };

    const email = buildOutreachEmail(context, 'generic');

    // Should avoid overly salesy language
    assert.ok(!email.bodyText.includes('amazing'), 'Should avoid hype words like "amazing"');
    assert.ok(!email.bodyText.includes('incredible'), 'Should avoid hype words like "incredible"');
    assert.ok(!email.bodyText.includes('revolutionary'), 'Should avoid hype words like "revolutionary"');
    
    // Should be conversational
    assert.ok(email.bodyText.length > 0, 'Should have content');
  });

  it('should have clear call to action', () => {
    const profile: LeadProfile = {
      firstName: 'Action',
      roleTitle: 'Decision Maker',
      companyName: 'CTA Corp'
    };

    const context: EmailContext = {
      lead: profile,
      productName: 'Product',
      productUrl: 'https://test.com',
      calendlyUrl: 'https://calendly.com/test'
    };

    const emailChiefs = buildOutreachEmail(context, 'chiefs');
    const emailGeneric = buildOutreachEmail(context, 'generic');

    // Both should have clear, softened CTAs
    assert.ok(
      emailChiefs.bodyText.includes('conversation') || 
      emailChiefs.bodyText.includes('discuss'),
      'Chiefs template should have clear CTA'
    );
    
    assert.ok(
      emailGeneric.bodyText.includes('conversation') || 
      emailGeneric.bodyText.includes('talk'),
      'Generic template should have clear CTA'
    );
  });
});

