import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { 
  initDb, 
  saveRejectionPattern, 
  getRejectionPatternsByType, 
  getAllRejectionPatterns,
  saveWeightAdjustment,
  getCurrentWeightAdjustments,
  getWeightAdjustments,
  getRejectionStats,
  clearAllCaches
} from '../src/lib/db.js';
import { 
  analyzeRejectionKeywords, 
  analyzeRejectionWithLLM,
  extractCompanyFromRejection,
  extractTechKeywordsFromRejection,
  extractSeniorityFromRejection
} from '../src/ai/rejection-analyzer.js';
import { 
  getActiveWeights, 
  applyWeightAdjustment, 
  normalizeWeights,
  getWeightAdjustmentSummary,
  resetWeightAdjustments,
  validateWeights
} from '../src/ai/weight-manager.js';
import { 
  applyFilters, 
  buildFiltersFromPatterns, 
  getFilterStats,
  clearAllFilters,
  addManualFilter
} from '../src/ai/rejection-filters.js';

describe('Rejection Learning System', () => {
  beforeEach(() => {
    initDb();
    // Clear any existing data
    clearAllCaches();
    resetWeightAdjustments();
    clearAllFilters();
  });

  afterEach(() => {
    // Clean up after each test
    clearAllCaches();
    resetWeightAdjustments();
    clearAllFilters();
  });

  describe('Database Schema', () => {
    it('should initialize rejection learning tables', () => {
      // Test that tables exist by trying to insert and query data
      assert.doesNotThrow(() => {
        saveRejectionPattern({
          type: 'seniority',
          value: 'too junior',
          confidence: 0.8,
          profileCategory: 'seniority',
          weightAdjustment: -2
        });
      });

      assert.doesNotThrow(() => {
        saveWeightAdjustment({
          profile_category: 'seniority',
          old_weight: 5,
          new_weight: 3,
          reason: 'Test adjustment',
          rejection_id: 'test-job-1'
        });
      });
    });

    it('should store and retrieve rejection patterns', () => {
      const pattern = {
        type: 'seniority',
        value: 'too junior',
        confidence: 0.8,
        profileCategory: 'seniority',
        weightAdjustment: -2
      };

      saveRejectionPattern(pattern);
      
      const patterns = getRejectionPatternsByType('seniority');
      assert.strictEqual(patterns.length, 1);
      assert.strictEqual(patterns[0].pattern_type, 'seniority');
      assert.strictEqual(patterns[0].pattern_value, 'too junior');
      assert.strictEqual(patterns[0].count, 1);
    });

    it('should increment pattern count for duplicate patterns', () => {
      const pattern = {
        type: 'seniority',
        value: 'too junior',
        confidence: 0.8
      };

      saveRejectionPattern(pattern);
      saveRejectionPattern(pattern);
      
      const patterns = getRejectionPatternsByType('seniority');
      assert.strictEqual(patterns.length, 1);
      assert.strictEqual(patterns[0].count, 2);
    });

    it('should store and retrieve weight adjustments', () => {
      saveWeightAdjustment({
        profile_category: 'seniority',
        old_weight: 5,
        new_weight: 3,
        reason: 'Test adjustment',
        rejection_id: 'test-job-1'
      });

      const adjustments = getCurrentWeightAdjustments();
      assert.strictEqual(adjustments.seniority, -2); // 3 - 5 = -2

      const history = getWeightAdjustments();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].profile_category, 'seniority');
      assert.strictEqual(history[0].reason, 'Test adjustment');
    });
  });

  describe('Rejection Analyzer', () => {
    it('should extract keyword patterns from rejection reasons', () => {
      const reason = "The candidate was too junior for this senior role. We need someone with more experience.";
      
      const patterns = analyzeRejectionKeywords(reason);
      
      assert.strictEqual(patterns.length, 1);
      assert.strictEqual(patterns[0].type, 'seniority');
      assert.strictEqual(patterns[0].value, 'too junior');
      assert.strictEqual(patterns[0].confidence, 0.8);
    });

    it('should extract multiple keyword patterns', () => {
      const reason = "Wrong tech stack - no Python experience. Also not remote work.";
      
      const patterns = analyzeRejectionKeywords(reason);
      
      assert.ok(patterns.length > 1);
      assert.ok(patterns.some(p => p.type === 'techStack'));
      assert.ok(patterns.some(p => p.type === 'location'));
    });

    it('should extract company names from rejection reasons', () => {
      const job = {
        id: 'test-1',
        title: 'Senior Developer',
        company: 'Test Company',
        url: 'https://test.com',
        easy_apply: true,
        status: 'rejected' as const,
        rejection_reason: 'Not a good fit at Test Company',
        created_at: new Date().toISOString()
      };

      const company = extractCompanyFromRejection('Not a good fit at Test Company', job);
      assert.strictEqual(company, 'Test Company');
    });

    it('should extract technology keywords from rejection reasons', () => {
      const reason = "No experience with Python and React";
      
      const keywords = extractTechKeywordsFromRejection(reason);
      
      assert.ok(keywords.includes('python'));
      assert.ok(keywords.includes('react'));
    });

    it('should determine seniority level from rejection reasons', () => {
      assert.strictEqual(extractSeniorityFromRejection('too junior'), 'senior');
      assert.strictEqual(extractSeniorityFromRejection('not senior enough'), 'senior');
      assert.strictEqual(extractSeniorityFromRejection('too senior'), 'mid');
      assert.strictEqual(extractSeniorityFromRejection('overqualified'), 'mid');
      assert.strictEqual(extractSeniorityFromRejection('entry level'), 'entry');
      assert.strictEqual(extractSeniorityFromRejection('junior role'), 'entry');
    });

    it('should handle LLM analysis fallback gracefully', async () => {
      const job = {
        id: 'test-1',
        title: 'Senior Developer',
        company: 'Test Company',
        url: 'https://test.com',
        easy_apply: true,
        status: 'rejected' as const,
        rejection_reason: 'too junior',
        created_at: new Date().toISOString()
      };

      // This should not throw even if LLM is not available
      const analysis = await analyzeRejectionWithLLM('too junior', job);
      
      assert.ok(analysis);
      assert.ok(analysis.patterns);
      assert.ok(analysis.suggestedAdjustments);
      assert.ok(analysis.filters);
    });
  });

  describe('Weight Manager', () => {
    it('should return base weights initially', () => {
      const weights = getActiveWeights();
      
      assert.strictEqual(weights.coreAzure, 20);
      assert.strictEqual(weights.security, 15);
      assert.strictEqual(weights.seniority, 5);
      
      // Verify weights sum to 100%
      const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
      assert.ok(Math.abs(total - 100) < 0.1);
    });

    it('should apply weight adjustments correctly', () => {
      applyWeightAdjustment('seniority', -2, 'Test: too junior rejections', 'test-job-1');
      
      const weights = getActiveWeights();
      assert.ok(Math.abs(weights.seniority - 3) < 0.1); // 5 - 2 = 3
      
      // Verify weights still sum to 100%
      const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
      assert.ok(Math.abs(total - 100) < 0.1);
    });

    it('should normalize weights to sum to 100%', () => {
      const testWeights = {
        coreAzure: 30,
        security: 20,
        seniority: 10
      };
      
      const normalized = normalizeWeights(testWeights);
      const total = Object.values(normalized).reduce((sum, weight) => sum + weight, 0);
      assert.ok(Math.abs(total - 100) < 0.1);
    });

    it('should validate weights correctly', () => {
      const validWeights = {
        coreAzure: 20,
        security: 15,
        seniority: 5,
        eventDriven: 10,
        performance: 10,
        devops: 10,
        coreNet: 10,
        legacyModernization: 20
      };
      
      const validation = validateWeights(validWeights);
      assert.strictEqual(validation.isValid, true);
      assert.strictEqual(validation.issues.length, 0);
    });

    it('should detect invalid weights', () => {
      const invalidWeights = {
        coreAzure: 20,
        security: 15,
        seniority: -5 // Negative weight
      };
      
      const validation = validateWeights(invalidWeights);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.issues.length > 0);
    });

    it('should reset weight adjustments', () => {
      applyWeightAdjustment('seniority', -2, 'Test adjustment', 'test-job-1');
      
      let weights = getActiveWeights();
      assert.ok(Math.abs(weights.seniority - 3) < 0.1);
      
      resetWeightAdjustments();
      
      weights = getActiveWeights();
      assert.strictEqual(weights.seniority, 5); // Back to base weight
    });

    it('should provide weight adjustment summary', () => {
      applyWeightAdjustment('seniority', -2, 'Test adjustment', 'test-job-1');
      
      const summary = getWeightAdjustmentSummary();
      
      assert.strictEqual(summary.baseWeights.seniority, 5);
      assert.ok(Math.abs(summary.adjustedWeights.seniority - 3) < 0.1);
      assert.strictEqual(summary.adjustments.seniority, -2);
      assert.strictEqual(summary.totalAdjustment, -2);
    });
  });

  describe('Filter System', () => {
    it('should build filters from rejection patterns', () => {
      // Add some rejection patterns
      saveRejectionPattern({
        type: 'company',
        value: 'Bad Company',
        confidence: 0.9,
        profileCategory: undefined,
        weightAdjustment: 0
      });
      
      saveRejectionPattern({
        type: 'company',
        value: 'Bad Company',
        confidence: 0.9,
        profileCategory: undefined,
        weightAdjustment: 0
      }); // Second occurrence to trigger filter
      
      const filters = buildFiltersFromPatterns();
      assert.ok(filters.length > 0);
    });

    it('should apply company blocklist filter', () => {
      addManualFilter('company', 'Blocked Company', 'Manual block');
      
      const testJob = {
        title: 'Senior Developer',
        company: 'Blocked Company',
        description: 'Great job opportunity'
      };
      
      const result = applyFilters(testJob);
      assert.strictEqual(result.blocked, true);
      assert.ok(result.reason?.includes('blocklist'));
    });

    it('should apply keyword avoidance filter', () => {
      addManualFilter('keyword', 'junior', 'Avoid junior roles');
      
      const testJob = {
        title: 'Junior Developer',
        company: 'Good Company',
        description: 'Entry level position'
      };
      
      const result = applyFilters(testJob);
      assert.strictEqual(result.blocked, true);
      assert.ok(result.reason?.includes('keywords'));
    });

    it('should apply seniority minimum filter', () => {
      addManualFilter('seniority', 'senior', 'Require senior level');
      
      const testJob = {
        title: 'Junior Developer',
        company: 'Good Company',
        description: 'Entry level position'
      };
      
      const result = applyFilters(testJob);
      assert.strictEqual(result.blocked, true);
      assert.ok(result.reason?.includes('seniority'));
    });

    it('should allow jobs that pass all filters', () => {
      const testJob = {
        title: 'Senior Azure Developer',
        company: 'Good Company',
        description: 'Senior level Azure development role'
      };
      
      const result = applyFilters(testJob);
      assert.strictEqual(result.blocked, false);
    });

    it('should provide filter statistics', () => {
      addManualFilter('company', 'Test Company', 'Test filter');
      
      const stats = getFilterStats();
      assert.ok(stats.totalFilters > 0);
      assert.ok(stats.filterTypes.length > 0);
    });

    it('should clear all filters', () => {
      addManualFilter('company', 'Test Company', 'Test filter');
      
      let stats = getFilterStats();
      assert.ok(stats.totalFilters > 0);
      
      clearAllFilters();
      
      stats = getFilterStats();
      assert.strictEqual(stats.totalFilters, 0);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full rejection learning workflow', async () => {
      // Simulate a job rejection
      const job = {
        id: 'test-job-1',
        title: 'Senior Azure Developer',
        company: 'Test Company',
        url: 'https://test.com',
        easy_apply: true,
        status: 'rejected' as const,
        rejection_reason: 'Too junior for this senior role',
        created_at: new Date().toISOString()
      };

      // Step 1: Analyze rejection
      const patterns = analyzeRejectionKeywords(job.rejection_reason!);
      assert.ok(patterns.length > 0);

      // Step 2: Save patterns
      for (const pattern of patterns) {
        saveRejectionPattern({
          type: pattern.type,
          value: pattern.value,
          confidence: pattern.confidence,
          profileCategory: 'seniority',
          weightAdjustment: -2
        });
      }

      // Step 3: Apply weight adjustment
      applyWeightAdjustment('seniority', -2, 'Too junior rejections', job.id);

      // Step 4: Verify learning occurred
      const adjustedWeights = getActiveWeights();
      assert.ok(Math.abs(adjustedWeights.seniority - 3) < 0.1); // 5 - 2 = 3

      const savedPatterns = getAllRejectionPatterns();
      assert.ok(savedPatterns.length > 0);

      const adjustments = getCurrentWeightAdjustments();
      assert.strictEqual(adjustments.seniority, -2);
    });

    it('should build filters after multiple rejections', () => {
      // Simulate multiple rejections from same company
      for (let i = 0; i < 3; i++) {
        saveRejectionPattern({
          type: 'company',
          value: 'Problematic Company',
          confidence: 0.9,
          profileCategory: undefined,
          weightAdjustment: 0
        });
      }

      const filters = buildFiltersFromPatterns();
      assert.ok(filters.length > 0);

      // Test that the filter works
      const testJob = {
        title: 'Great Job',
        company: 'Problematic Company',
        description: 'Amazing opportunity'
      };

      const result = applyFilters(testJob);
      assert.strictEqual(result.blocked, true);
    });

    it('should maintain weight normalization across multiple adjustments', () => {
      // Apply multiple adjustments
      applyWeightAdjustment('seniority', -2, 'Too junior', 'job-1');
      applyWeightAdjustment('coreAzure', +1, 'Strong Azure match', 'job-2');
      applyWeightAdjustment('security', -1, 'Security mismatch', 'job-3');

      const weights = getActiveWeights();
      
      // Verify weights still sum to 100%
      const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
      assert.ok(Math.abs(total - 100) < 0.1);

      // Verify individual adjustments
      assert.ok(Math.abs(weights.seniority - 3) < 0.1); // 5 - 2 = 3
      assert.ok(Math.abs(weights.coreAzure - 21) < 0.1); // 20 + 1 = 21
      assert.ok(Math.abs(weights.security - 14) < 0.1); // 15 - 1 = 14
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid rejection patterns gracefully', () => {
      assert.doesNotThrow(() => {
        saveRejectionPattern({
          type: 'invalid' as any,
          value: '',
          confidence: 0,
          profileCategory: undefined,
          weightAdjustment: 0
        });
      });
    });

    it('should handle extreme weight adjustments', () => {
      // Test clamping of extreme adjustments
      applyWeightAdjustment('seniority', -50, 'Extreme adjustment', 'test-job');
      
      const weights = getActiveWeights();
      assert.ok(weights.seniority > 0); // Should be clamped, not negative
    });

    it('should handle empty rejection reasons', () => {
      const patterns = analyzeRejectionKeywords('');
      assert.strictEqual(patterns.length, 0);

      const company = extractCompanyFromRejection('', {
        id: 'test',
        title: 'Test',
        company: 'Test Company',
        url: 'https://test.com',
        easy_apply: true,
        status: 'rejected' as const,
        created_at: new Date().toISOString()
      });
      assert.strictEqual(company, null);
    });
  });
});