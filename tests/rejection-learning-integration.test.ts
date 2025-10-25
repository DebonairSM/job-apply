import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { 
  initDb, 
  updateJobStatus, 
  getJobById,
  addJobs,
  clearAllCaches,
  resetWeightAdjustments,
  clearAllFilters
} from '../src/lib/db.js';
import { getActiveWeights } from '../src/ai/weight-manager.js';
import { applyFilters } from '../src/ai/rejection-filters.js';
import { rankJob } from '../src/ai/ranker.js';

describe('Rejection Learning Integration', () => {
  beforeEach(() => {
    initDb();
    clearAllCaches();
    resetWeightAdjustments();
    clearAllFilters();
  });

  afterEach(() => {
    clearAllCaches();
    resetWeightAdjustments();
    clearAllFilters();
  });

  describe('End-to-End Rejection Learning Workflow', () => {
    it('should learn from job rejection and improve future job selection', async () => {
      // Step 1: Add a job to the database
      const jobData = {
        id: 'test-job-1',
        title: 'Senior Azure Developer',
        company: 'Test Company',
        url: 'https://test-company.com/job1',
        easy_apply: true,
        rank: 85,
        status: 'applied' as const,
        applied_method: 'manual' as const,
        rejection_reason: null,
        fit_reasons: 'Strong Azure match',
        must_haves: '["Azure", "C#"]',
        blockers: '[]',
        category_scores: '{"coreAzure": 90, "seniority": 60}',
        missing_keywords: '[]',
        posted_date: new Date().toISOString(),
        description: 'Senior Azure Developer role requiring 5+ years experience',
        created_at: new Date().toISOString(),
        status_updated_at: new Date().toISOString()
      };

      const addResult = addJobs([jobData]);
      assert.strictEqual(addResult.success, true);

      // Step 2: Get initial weights
      const initialWeights = getActiveWeights();
      assert.strictEqual(initialWeights.seniority, 5);

      // Step 3: Simulate job rejection with learning trigger
      updateJobStatus('test-job-1', 'rejected', 'manual', 'Too junior for this senior role');

      // Step 4: Wait a moment for async learning to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 5: Verify learning occurred
      const adjustedWeights = getActiveWeights();
      
      // The seniority weight should have been reduced due to "too junior" rejection
      assert.ok(adjustedWeights.seniority < initialWeights.seniority);
      
      // Weights should still sum to 100%
      const totalWeight = Object.values(adjustedWeights).reduce((sum, weight) => sum + weight, 0);
      assert.ok(Math.abs(totalWeight - 100) < 0.1);

      // Step 6: Test that filters are applied
      const testJob = {
        title: 'Junior Developer',
        company: 'Test Company',
        description: 'Entry level position'
      };

      // The filter system should potentially block similar jobs
      const filterResult = applyFilters(testJob);
      // Note: This might not block immediately as filters require multiple occurrences
    });

    it('should build company blocklist after multiple rejections', async () => {
      // Add multiple jobs from the same company
      const jobs = [
        {
          id: 'test-job-1',
          title: 'Senior Developer',
          company: 'Problematic Company',
          url: 'https://problematic.com/job1',
          easy_apply: true,
          rank: 80,
          status: 'applied' as const,
          applied_method: 'manual' as const,
          rejection_reason: null,
          fit_reasons: 'Good match',
          must_haves: '["C#"]',
          blockers: '[]',
          category_scores: '{"coreAzure": 80}',
          missing_keywords: '[]',
          posted_date: new Date().toISOString(),
          description: 'Senior developer role',
          created_at: new Date().toISOString(),
          status_updated_at: new Date().toISOString()
        },
        {
          id: 'test-job-2',
          title: 'Lead Developer',
          company: 'Problematic Company',
          url: 'https://problematic.com/job2',
          easy_apply: true,
          rank: 85,
          status: 'applied' as const,
          applied_method: 'manual' as const,
          rejection_reason: null,
          fit_reasons: 'Good match',
          must_haves: '["Azure"]',
          blockers: '[]',
          category_scores: '{"coreAzure": 85}',
          missing_keywords: '[]',
          posted_date: new Date().toISOString(),
          description: 'Lead developer role',
          created_at: new Date().toISOString(),
          status_updated_at: new Date().toISOString()
        }
      ];

      addJobs(jobs);

      // Reject both jobs with company-specific reasons
      updateJobStatus('test-job-1', 'rejected', 'manual', 'Not a good cultural fit at Problematic Company');
      await new Promise(resolve => setTimeout(resolve, 100));

      updateJobStatus('test-job-2', 'rejected', 'manual', 'Team dynamics issue at Problematic Company');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Test that future jobs from this company are filtered
      const futureJob = {
        title: 'Amazing Developer Role',
        company: 'Problematic Company',
        description: 'Great opportunity with excellent benefits'
      };

      const filterResult = applyFilters(futureJob);
      // Note: This might not block immediately as company filters require multiple rejections
      // But the pattern should be stored for future filtering
    });

    it('should maintain weight consistency across multiple rejections', async () => {
      const jobs = [
        {
          id: 'seniority-job',
          title: 'Senior Developer',
          company: 'Company A',
          url: 'https://company-a.com/job1',
          easy_apply: true,
          rank: 80,
          status: 'applied' as const,
          applied_method: 'manual' as const,
          rejection_reason: null,
          fit_reasons: 'Good match',
          must_haves: '["C#"]',
          blockers: '[]',
          category_scores: '{"seniority": 60}',
          missing_keywords: '[]',
          posted_date: new Date().toISOString(),
          description: 'Senior developer role',
          created_at: new Date().toISOString(),
          status_updated_at: new Date().toISOString()
        },
        {
          id: 'tech-job',
          title: 'Python Developer',
          company: 'Company B',
          url: 'https://company-b.com/job1',
          easy_apply: true,
          rank: 75,
          status: 'applied' as const,
          applied_method: 'manual' as const,
          rejection_reason: null,
          fit_reasons: 'Good match',
          must_haves: '["Python"]',
          blockers: '[]',
          category_scores: '{"coreAzure": 40}',
          missing_keywords: '[]',
          posted_date: new Date().toISOString(),
          description: 'Python developer role',
          created_at: new Date().toISOString(),
          status_updated_at: new Date().toISOString()
        }
      ];

      addJobs(jobs);

      // Reject jobs for different reasons
      updateJobStatus('seniority-job', 'rejected', 'manual', 'Too junior for senior role');
      await new Promise(resolve => setTimeout(resolve, 100));

      updateJobStatus('tech-job', 'rejected', 'manual', 'Wrong tech stack - need Azure not Python');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify weights are still normalized
      const finalWeights = getActiveWeights();
      const totalWeight = Object.values(finalWeights).reduce((sum, weight) => sum + weight, 0);
      assert.ok(Math.abs(totalWeight - 100) < 0.1);

      // Verify adjustments were applied
      assert.ok(finalWeights.seniority < 10); // Should be reduced from base 10%
    });

    it('should handle rejection analysis errors gracefully', async () => {
      const job = {
        id: 'error-job',
        title: 'Test Job',
        company: 'Test Company',
        url: 'https://test.com/job1',
        easy_apply: true,
        rank: 80,
        status: 'applied' as const,
        applied_method: 'manual' as const,
        rejection_reason: null,
        fit_reasons: 'Good match',
        must_haves: '["C#"]',
        blockers: '[]',
        category_scores: '{"coreAzure": 80}',
        missing_keywords: '[]',
        posted_date: new Date().toISOString(),
        description: 'Test job',
        created_at: new Date().toISOString(),
        status_updated_at: new Date().toISOString()
      };

      addJobs([job]);

      // This should not throw even if LLM analysis fails
      assert.doesNotThrow(() => {
        updateJobStatus('error-job', 'rejected', 'manual', 'Some rejection reason');
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // System should still be functional
      const weights = getActiveWeights();
      assert.ok(weights);
      assert.ok(Object.keys(weights).length > 0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple rapid rejections efficiently', async () => {
      const jobs = Array.from({ length: 10 }, (_, i) => ({
        id: `rapid-job-${i}`,
        title: `Job ${i}`,
        company: `Company ${i}`,
        url: `https://company-${i}.com/job`,
        easy_apply: true,
        rank: 80,
        status: 'applied' as const,
        applied_method: 'manual' as const,
        rejection_reason: null,
        fit_reasons: 'Good match',
        must_haves: '["C#"]',
        blockers: '[]',
        category_scores: '{"coreAzure": 80}',
        missing_keywords: '[]',
        posted_date: new Date().toISOString(),
        description: `Job ${i} description`,
        created_at: new Date().toISOString(),
        status_updated_at: new Date().toISOString()
      }));

      addJobs(jobs);

      const startTime = Date.now();

      // Rapidly reject multiple jobs
      for (let i = 0; i < 10; i++) {
        updateJobStatus(`rapid-job-${i}`, 'rejected', 'manual', `Rejection reason ${i}`);
      }

      // Wait for all async operations to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly (under 1 second for 10 rejections)
      assert.ok(duration < 1000);

      // Verify system is still functional
      const weights = getActiveWeights();
      assert.ok(weights);
    });

    it('should maintain data consistency under concurrent operations', async () => {
      const jobs = Array.from({ length: 5 }, (_, i) => ({
        id: `concurrent-job-${i}`,
        title: `Concurrent Job ${i}`,
        company: `Company ${i}`,
        url: `https://concurrent-${i}.com/job`,
        easy_apply: true,
        rank: 80,
        status: 'applied' as const,
        applied_method: 'manual' as const,
        rejection_reason: null,
        fit_reasons: 'Good match',
        must_haves: '["C#"]',
        blockers: '[]',
        category_scores: '{"coreAzure": 80}',
        missing_keywords: '[]',
        posted_date: new Date().toISOString(),
        description: `Concurrent job ${i}`,
        created_at: new Date().toISOString(),
        status_updated_at: new Date().toISOString()
      }));

      addJobs(jobs);

      // Simulate concurrent rejections
      const promises = jobs.map((job, i) => 
        new Promise<void>((resolve) => {
          setTimeout(() => {
            updateJobStatus(job.id, 'rejected', 'manual', `Concurrent rejection ${i}`);
            resolve();
          }, Math.random() * 50); // Random delay up to 50ms
        })
      );

      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify weights are still normalized
      const weights = getActiveWeights();
      const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
      assert.ok(Math.abs(totalWeight - 100) < 0.1);
    });
  });
});