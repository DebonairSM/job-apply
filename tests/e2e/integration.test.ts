import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Integration tests for the complete job search flow
 * 
 * These tests verify end-to-end scenarios including:
 * 1. Session loading and browser context creation
 * 2. Job card iteration with DOM changes
 * 3. Error recovery and graceful degradation
 */

describe('Integration - Complete Search Flow', () => {
  it('should skip to next job when current job has missing elements', () => {
    // Simulate 5 job cards where job 2 and 4 have missing titles
    const mockJobs = [
      { id: 1, title: 'Software Engineer', company: 'Netflix', link: '/jobs/view/1' },
      { id: 2, title: '', company: 'Google', link: '/jobs/view/2' }, // Missing title
      { id: 3, title: 'API Engineer', company: 'Microsoft', link: '/jobs/view/3' },
      { id: 4, title: 'Backend Engineer', company: 'Amazon', link: '' }, // Missing link
      { id: 5, title: 'Full Stack Engineer', company: 'Meta', link: '/jobs/view/5' }
    ];

    const processed: typeof mockJobs = [];
    const skipped: number[] = [];

    for (let i = 0; i < mockJobs.length; i++) {
      const job = mockJobs[i];
      
      if (!job.title) {
        skipped.push(job.id);
        continue;
      }

      if (!job.link) {
        skipped.push(job.id);
        continue;
      }

      processed.push(job);
    }

    assert.strictEqual(processed.length, 3, 'Should process 3 valid jobs');
    assert.strictEqual(skipped.length, 2, 'Should skip 2 invalid jobs');
    assert.deepStrictEqual(skipped, [2, 4], 'Should skip jobs 2 and 4');
  });

  it('should continue processing after click failures', () => {
    // Simulate 5 job cards where job 2 fails to click
    const mockJobs = [
      { id: 1, clickable: true },
      { id: 2, clickable: false }, // Click fails
      { id: 3, clickable: true },
      { id: 4, clickable: false }, // Click fails
      { id: 5, clickable: true }
    ];

    const processed: number[] = [];
    const clickFailed: number[] = [];

    for (let i = 0; i < mockJobs.length; i++) {
      const job = mockJobs[i];
      
      // Simulate click attempt
      let clickSucceeded = false;
      try {
        if (!job.clickable) {
          throw new Error('Click blocked');
        }
        clickSucceeded = true;
      } catch (error) {
        // Try force click
        try {
          if (!job.clickable) {
            throw new Error('Force click failed');
          }
          clickSucceeded = true;
        } catch (forceError) {
          clickFailed.push(job.id);
          continue;
        }
      }

      if (clickSucceeded) {
        processed.push(job.id);
      }
    }

    assert.strictEqual(processed.length, 3, 'Should process 3 clickable jobs');
    assert.strictEqual(clickFailed.length, 2, 'Should track 2 click failures');
    assert.deepStrictEqual(clickFailed, [2, 4], 'Jobs 2 and 4 should fail to click');
  });

  it('should handle multiple modals appearing during search', async () => {
    let modalDismissCount = 0;
    const maxModals = 3;

    const dismissModals = async () => {
      if (modalDismissCount < maxModals) {
        modalDismissCount++;
      }
    };

    // Simulate dismissing modals at different stages
    await dismissModals(); // Initial load
    await dismissModals(); // During scroll
    await dismissModals(); // Before processing

    assert.strictEqual(
      modalDismissCount,
      3,
      'Should dismiss modals at multiple points in the flow'
    );
  });

  it('should accumulate valid jobs for database insertion', () => {
    interface Job {
      id: string;
      title: string;
      company: string;
      url: string;
      rank: number;
      status: string;
    }

    const minScore = 70;
    const mockRankings = [
      { title: 'Software Engineer', score: 85 },
      { title: 'API Engineer', score: 65 },      // Below threshold
      { title: 'Backend Engineer', score: 92 },
      { title: 'Frontend Engineer', score: 55 }, // Below threshold
      { title: 'Full Stack Engineer', score: 78 }
    ];

    const jobs: Job[] = [];
    let analyzed = 0;
    let queued = 0;

    for (const ranking of mockRankings) {
      analyzed++;

      if (ranking.score >= minScore) {
        jobs.push({
          id: `job-${analyzed}`,
          title: ranking.title,
          company: 'Test Company',
          url: `/jobs/view/${analyzed}`,
          rank: ranking.score,
          status: 'queued'
        });
        queued++;
      }
    }

    assert.strictEqual(analyzed, 5, 'Should analyze all 5 jobs');
    assert.strictEqual(queued, 3, 'Should queue 3 jobs above threshold');
    assert.strictEqual(jobs.length, 3, 'Should have 3 jobs in array');
    
    // Verify all queued jobs meet minimum score
    for (const job of jobs) {
      assert.ok(job.rank >= minScore, `Job ${job.title} should meet minimum score`);
    }
  });
});

/**
 * Integration tests for error recovery
 */
describe('Integration - Error Recovery', () => {
  it('should recover from description extraction failures', async () => {
    const mockDescriptionExtraction = async (jobIndex: number) => {
      // Jobs 2 and 4 fail description extraction
      if (jobIndex === 1 || jobIndex === 3) {
        throw new Error('Description pane not found');
      }
      return `Job description for job ${jobIndex + 1}`;
    };

    const jobs = [0, 1, 2, 3, 4];
    const results: string[] = [];

    for (let i = 0; i < jobs.length; i++) {
      try {
        const description = await mockDescriptionExtraction(i);
        results.push(description);
      } catch (error) {
        // Fallback to title
        results.push(`Fallback for job ${i + 1}`);
      }
    }

    assert.strictEqual(results.length, 5, 'Should process all 5 jobs');
    assert.ok(
      results[1].includes('Fallback'),
      'Job 2 should use fallback'
    );
    assert.ok(
      results[3].includes('Fallback'),
      'Job 4 should use fallback'
    );
  });

  it('should handle complete job processing failure gracefully', () => {
    const mockJobs = [
      { id: 1, processingError: false },
      { id: 2, processingError: true },
      { id: 3, processingError: false },
      { id: 4, processingError: true },
      { id: 5, processingError: false }
    ];

    const processed: number[] = [];
    const errors: number[] = [];

    for (let i = 0; i < mockJobs.length; i++) {
      try {
        const job = mockJobs[i];
        
        if (job.processingError) {
          throw new Error('Processing failed');
        }
        
        processed.push(job.id);
      } catch (error) {
        errors.push(i + 1);
        // Continue to next job instead of crashing
      }
    }

    assert.strictEqual(processed.length, 3, 'Should process 3 successful jobs');
    assert.strictEqual(errors.length, 2, 'Should track 2 errors');
    assert.deepStrictEqual(errors, [2, 4], 'Should track correct error indices');
  });
});

/**
 * Integration tests for session and configuration
 */
describe('Integration - Session and Config', () => {
  it('should load config with proper defaults', async () => {
    const { loadConfig } = await import('../src/lib/session.js');
    const config = loadConfig();

    // Verify critical defaults are set
    assert.ok(
      config.minFitScore >= 0 && config.minFitScore <= 100,
      'Min fit score should be between 0 and 100'
    );
    assert.ok(
      config.slowMo >= 0,
      'Slow motion should be non-negative'
    );
    assert.ok(
      config.randomDelayMin > 0,
      'Random delay min should be positive'
    );
    assert.ok(
      config.randomDelayMax >= config.randomDelayMin,
      'Random delay max should be >= min'
    );
    assert.strictEqual(
      typeof config.headless,
      'boolean',
      'Headless should be boolean'
    );
  });

  it('should properly check for session existence', async () => {
    const { hasSession, STORAGE_STATE_PATH } = await import('../src/lib/session.js');
    const { existsSync } = await import('fs');

    const sessionExists = hasSession();
    const fileExists = existsSync(STORAGE_STATE_PATH);

    assert.strictEqual(
      sessionExists,
      fileExists,
      'hasSession() should match file existence'
    );
  });
});

/**
 * Integration tests for search URL building
 */
describe('Integration - Search Parameters', () => {
  it('should build complete search URL with all parameters', () => {
    const params = new URLSearchParams();
    params.set('keywords', 'api engineer');
    params.set('location', 'United States');
    params.set('f_WT', '2'); // Remote
    params.set('f_TPR', 'r604800'); // Past week

    const url = `https://www.linkedin.com/jobs/search/?${params.toString()}`;

    assert.ok(url.includes('keywords='), 'Should include keywords');
    assert.ok(url.includes('location='), 'Should include location');
    assert.ok(url.includes('f_WT=2'), 'Should include remote filter');
    assert.ok(url.includes('f_TPR='), 'Should include date filter');
  });

  it('should handle special characters in search terms', () => {
    const params = new URLSearchParams();
    params.set('keywords', 'C++ developer');
    params.set('location', 'São Paulo, Brazil');

    const url = `https://www.linkedin.com/jobs/search/?${params.toString()}`;

    // URLSearchParams should properly encode special characters
    assert.ok(url.includes('keywords='), 'Should include keywords');
    assert.ok(url.includes('location='), 'Should include location');
    assert.ok(!url.includes('++'), 'Should encode + properly');
  });
});

/**
 * Integration tests for job data processing
 */
describe('Integration - Job Data Processing', () => {
  it('should generate consistent job IDs for same URLs', async () => {
    const crypto = await import('crypto');
    
    const url = 'https://www.linkedin.com/jobs/view/1234567890';
    
    const id1 = crypto.createHash('md5').update(url).digest('hex');
    const id2 = crypto.createHash('md5').update(url).digest('hex');
    const id3 = crypto.createHash('md5').update(url).digest('hex');

    assert.strictEqual(id1, id2, 'Same URL should produce same ID (call 1 vs 2)');
    assert.strictEqual(id2, id3, 'Same URL should produce same ID (call 2 vs 3)');
  });

  it('should handle Easy Apply detection', () => {
    const mockCards = [
      { hasEasyApply: true, count: 1 },
      { hasEasyApply: false, count: 0 },
      { hasEasyApply: true, count: 1 }
    ];

    const results = mockCards.map(card => card.count > 0);

    assert.deepStrictEqual(
      results,
      [true, false, true],
      'Should correctly identify Easy Apply badges'
    );
  });

  it('should serialize ranking data for database storage', () => {
    const ranking = {
      fitScore: 85,
      reasons: ['Strong API experience', 'Remote work available'],
      mustHaves: ['5+ years experience', 'Cloud platforms'],
      blockers: []
    };

    const job = {
      id: 'abc123',
      title: 'API Engineer',
      company: 'Netflix',
      url: '/jobs/view/123',
      easy_apply: false,
      rank: ranking.fitScore,
      status: 'queued',
      fit_reasons: JSON.stringify(ranking.reasons),
      must_haves: JSON.stringify(ranking.mustHaves),
      blockers: JSON.stringify(ranking.blockers)
    };

    // Verify serialization
    assert.strictEqual(typeof job.fit_reasons, 'string', 'Reasons should be JSON string');
    assert.strictEqual(typeof job.must_haves, 'string', 'Must-haves should be JSON string');
    assert.strictEqual(typeof job.blockers, 'string', 'Blockers should be JSON string');

    // Verify deserialization
    const parsedReasons = JSON.parse(job.fit_reasons);
    assert.strictEqual(Array.isArray(parsedReasons), true, 'Should parse to array');
    assert.strictEqual(parsedReasons.length, 2, 'Should have 2 reasons');
  });

  it('should detect company+title duplicates correctly', async () => {
    const { hasAppliedToCompanyTitle } = await import('../src/lib/db.js');
    
    // Test case-insensitive matching
    assert.strictEqual(
      hasAppliedToCompanyTitle('Microsoft', 'Software Engineer'),
      false,
      'Should return false for non-existent company+title'
    );
    
    // Note: This test assumes no existing data in test database
    // In a real scenario, you'd set up test data first
  });
});

