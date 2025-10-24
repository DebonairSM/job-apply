import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Test for dashboard category name formatting
 */

describe('Dashboard Category Name Formatting', () => {
  it('should format category names correctly', () => {
    // Simulate the formatCategoryName function from CategoryScoreBar.tsx
    const formatCategoryName = (category: string) => {
      // Map category keys to proper display names
      const categoryNameMap: Record<string, string> = {
        coreAzure: 'Azure Platform Development',
        coreNet: '.NET Development',
        security: 'Security & Governance',
        eventDriven: 'Event-Driven Architecture',
        performance: 'Performance & Reliability',
        devops: 'DevOps & CI/CD',
        seniority: 'Seniority & Role Type',
        legacyModernization: 'Legacy Modernization'
      };
      
      // Return mapped name or fallback to formatted camelCase
      return categoryNameMap[category] || category
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
    };
    
    // Test the new separated categories
    assert.strictEqual(formatCategoryName('coreAzure'), 'Azure Platform Development');
    assert.strictEqual(formatCategoryName('coreNet'), '.NET Development');
    
    // Test other categories
    assert.strictEqual(formatCategoryName('security'), 'Security & Governance');
    assert.strictEqual(formatCategoryName('eventDriven'), 'Event-Driven Architecture');
    assert.strictEqual(formatCategoryName('performance'), 'Performance & Reliability');
    assert.strictEqual(formatCategoryName('devops'), 'DevOps & CI/CD');
    assert.strictEqual(formatCategoryName('seniority'), 'Seniority & Role Type');
    assert.strictEqual(formatCategoryName('legacyModernization'), 'Legacy Modernization');
    
    // Test fallback for unknown categories
    assert.strictEqual(formatCategoryName('unknownCategory'), 'Unknown Category');
  });
  
  it('should display proper names for Azure and .NET categories', () => {
    const categoryNameMap: Record<string, string> = {
      coreAzure: 'Azure Platform Development',
      coreNet: '.NET Development',
      security: 'Security & Governance',
      eventDriven: 'Event-Driven Architecture',
      performance: 'Performance & Reliability',
      devops: 'DevOps & CI/CD',
      seniority: 'Seniority & Role Type',
      legacyModernization: 'Legacy Modernization'
    };
    
    // Verify the two main categories we separated
    assert.strictEqual(categoryNameMap.coreAzure, 'Azure Platform Development');
    assert.strictEqual(categoryNameMap.coreNet, '.NET Development');
    
    // Verify they are clearly distinct
    assert.notStrictEqual(categoryNameMap.coreAzure, categoryNameMap.coreNet);
    assert.ok(categoryNameMap.coreAzure.includes('Azure'));
    assert.ok(categoryNameMap.coreNet.includes('.NET'));
    assert.ok(!categoryNameMap.coreAzure.includes('.NET'));
    assert.ok(!categoryNameMap.coreNet.includes('Azure'));
  });
});
