import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  analyzeRejectionKeywords, 
  convertPatternsToAdjustments,
  analyzeRejectionWithLLM 
} from '../src/ai/rejection-analyzer.js';

describe('Rejection Logic Fix Tests', () => {
  describe('Keyword Analysis with Correct Logic', () => {
    it('should increase seniority weight when rejected for being too junior', () => {
      const patterns = analyzeRejectionKeywords('You are too junior for this senior role');
      
      assert.ok(patterns.length > 0, 'Should find seniority patterns');
      assert.strictEqual(patterns[0].type, 'seniority');
      assert.ok(patterns[0].value.includes('junior'));
    });

    it('should decrease seniority weight when rejected for being too senior', () => {
      const patterns = analyzeRejectionKeywords('You are overqualified for this position');
      
      assert.ok(patterns.length > 0, 'Should find seniority patterns');
      assert.strictEqual(patterns[0].type, 'seniority');
      assert.ok(patterns[0].value.includes('senior') || patterns[0].value.includes('overqualified'));
    });

    it('should identify tech stack issues', () => {
      const patterns = analyzeRejectionKeywords('We need someone with Python experience, not C#');
      
      assert.ok(patterns.length > 0, 'Should find tech stack patterns');
      assert.strictEqual(patterns[0].type, 'techStack');
    });
  });

  describe('Pattern to Adjustment Conversion', () => {
    it('should convert "too junior" to positive seniority adjustment', () => {
      const patterns = analyzeRejectionKeywords('Too junior for this role');
      const adjustments = convertPatternsToAdjustments(patterns);
      
      assert.ok(adjustments.length > 0, 'Should generate adjustments');
      
      const seniorityAdjustment = adjustments.find(adj => adj.category === 'seniority');
      assert.ok(seniorityAdjustment, 'Should have seniority adjustment');
      // With 0.8 confidence: 0.8 * 3 = 2.4 → ceil = 3
      assert.strictEqual(seniorityAdjustment.adjustment, +3, 'Should increase seniority weight');
      assert.ok(seniorityAdjustment.reason.includes('Too junior'), 'Should explain the reason');
    });

    it('should convert "too senior" to negative seniority adjustment', () => {
      const patterns = analyzeRejectionKeywords('Overqualified for this position');
      const adjustments = convertPatternsToAdjustments(patterns);
      
      assert.ok(adjustments.length > 0, 'Should generate adjustments');
      
      const seniorityAdjustment = adjustments.find(adj => adj.category === 'seniority');
      assert.ok(seniorityAdjustment, 'Should have seniority adjustment');
      // With 0.8 confidence: 0.8 * 3 = 2.4 → ceil = 3
      assert.strictEqual(seniorityAdjustment.adjustment, -3, 'Should decrease seniority weight');
      assert.ok(seniorityAdjustment.reason.includes('Too senior'), 'Should explain the reason');
    });

    it('should convert tech stack issues to negative tech adjustments', () => {
      const patterns = analyzeRejectionKeywords('Wrong tech stack - no Python experience');
      const adjustments = convertPatternsToAdjustments(patterns);
      
      assert.ok(adjustments.length > 0, 'Should generate adjustments');
      
      const techAdjustment = adjustments.find(adj => adj.category === 'coreAzure');
      assert.ok(techAdjustment, 'Should have tech adjustment');
      // With 0.8 confidence: 0.8 * 3 = 2.4 → ceil = 3
      assert.strictEqual(techAdjustment.adjustment, -3, 'Should decrease tech weight');
      assert.ok(techAdjustment.reason.includes('Wrong tech stack'), 'Should explain the reason');
    });

    it('should convert location issues to positive adjustments', () => {
      const patterns = analyzeRejectionKeywords('This role requires office work, not remote');
      const adjustments = convertPatternsToAdjustments(patterns);
      
      assert.ok(adjustments.length > 0, 'Should generate adjustments');
      
      const locationAdjustment = adjustments.find(adj => adj.category === 'performance');
      assert.ok(locationAdjustment, 'Should have location adjustment');
      // With 0.8 confidence: 0.8 * 2 = 1.6 → ceil = 2
      assert.strictEqual(locationAdjustment.adjustment, +2, 'Should increase remote job priority');
      assert.ok(locationAdjustment.reason.includes('Location issue'), 'Should explain the reason');
    });

    it('should convert compensation issues to negative adjustments', () => {
      const patterns = analyzeRejectionKeywords('Your salary expectations are over our budget');
      const adjustments = convertPatternsToAdjustments(patterns);
      
      assert.ok(adjustments.length > 0, 'Should generate adjustments');
      
      const compAdjustment = adjustments.find(adj => adj.category === 'seniority');
      assert.ok(compAdjustment, 'Should have compensation adjustment');
      // With 0.8 confidence: 0.7 * 2 = 1.4 → ceil = 2
      assert.strictEqual(compAdjustment.adjustment, -2, 'Should decrease seniority weight');
      assert.ok(compAdjustment.reason.includes('Compensation issue'), 'Should explain the reason');
    });
  });

  describe('Multiple Pattern Handling', () => {
    it('should handle multiple rejection reasons correctly', () => {
      const patterns = analyzeRejectionKeywords('Too junior and wrong tech stack - need Python not C#');
      const adjustments = convertPatternsToAdjustments(patterns);
      
      assert.ok(adjustments.length >= 2, 'Should generate multiple adjustments');
      
      const seniorityAdjustment = adjustments.find(adj => adj.category === 'seniority');
      const techAdjustment = adjustments.find(adj => adj.category === 'coreAzure');
      
      assert.ok(seniorityAdjustment, 'Should have seniority adjustment');
      assert.ok(techAdjustment, 'Should have tech adjustment');
      
      // With 0.8 confidence: 0.8 * 3 = 2.4 → ceil = 3
      assert.strictEqual(seniorityAdjustment.adjustment, +3, 'Should increase seniority');
      assert.strictEqual(techAdjustment.adjustment, -3, 'Should decrease tech weight');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty rejection reasons', () => {
      const patterns = analyzeRejectionKeywords('');
      const adjustments = convertPatternsToAdjustments(patterns);
      
      assert.strictEqual(patterns.length, 0, 'Should find no patterns');
      assert.strictEqual(adjustments.length, 0, 'Should generate no adjustments');
    });

    it('should handle rejection reasons with no recognizable patterns', () => {
      const patterns = analyzeRejectionKeywords('We decided to go with another candidate');
      const adjustments = convertPatternsToAdjustments(patterns);
      
      assert.strictEqual(patterns.length, 0, 'Should find no patterns');
      assert.strictEqual(adjustments.length, 0, 'Should generate no adjustments');
    });

    it('should handle case-insensitive matching', () => {
      const patterns1 = analyzeRejectionKeywords('TOO JUNIOR');
      const patterns2 = analyzeRejectionKeywords('too junior');
      const patterns3 = analyzeRejectionKeywords('Too Junior');
      
      assert.strictEqual(patterns1.length, patterns2.length, 'Should match regardless of case');
      assert.strictEqual(patterns2.length, patterns3.length, 'Should match regardless of case');
    });
  });

  describe('Logic Validation', () => {
    it('should validate the core logic: more rejection = more weight adjustment', () => {
      const testCases = [
        {
          reason: 'Too junior',
          expectedCategory: 'seniority',
          expectedAdjustment: +3,  // 0.8 confidence * 3 = 2.4 → ceil = 3
          explanation: 'Need MORE senior jobs'
        },
        {
          reason: 'Overqualified',
          expectedCategory: 'seniority', 
          expectedAdjustment: -3,  // 0.8 confidence * 3 = 2.4 → ceil = 3
          explanation: 'Need LESS senior jobs'
        },
        {
          reason: 'Wrong tech stack',
          expectedCategory: 'coreAzure',
          expectedAdjustment: -3,  // 0.8 confidence * 3 = 2.4 → ceil = 3
          explanation: 'Need LESS of that tech'
        },
        {
          reason: 'Not remote',
          expectedCategory: 'performance',
          expectedAdjustment: +2,  // 0.8 confidence * 2 = 1.6 → ceil = 2
          explanation: 'Need MORE remote jobs'
        }
      ];

      for (const testCase of testCases) {
        const patterns = analyzeRejectionKeywords(testCase.reason);
        const adjustments = convertPatternsToAdjustments(patterns);
        
        const adjustment = adjustments.find(adj => adj.category === testCase.expectedCategory);
        assert.ok(adjustment, `Should find ${testCase.expectedCategory} adjustment for "${testCase.reason}"`);
        assert.strictEqual(adjustment.adjustment, testCase.expectedAdjustment, 
          `${testCase.explanation}: ${testCase.reason} should adjust by ${testCase.expectedAdjustment}`);
      }
    });
  });
});
