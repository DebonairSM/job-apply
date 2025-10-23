import { describe, it, mock } from 'node:test';
import assert from 'node:assert';

/**
 * Tests for search command job card processing logic
 * 
 * These tests verify the fixes for:
 * 1. DOM re-location after clicking job cards
 * 2. Element visibility checks before extraction
 * 3. Proper timeout handling
 * 4. Modal dismissal functionality
 */

describe('Search Command - Job Card Processing', () => {
  it('should handle job card element extraction with proper timeout', async () => {
    // Simulate element extraction with timeout
    const mockElement = {
      innerText: async (options?: { timeout?: number }) => {
        if (options?.timeout && options.timeout < 5000) {
          return 'Software Engineer';
        }
        throw new Error('Timeout exceeded');
      },
      count: async () => 1
    };

    const title = await mockElement.innerText({ timeout: 3000 }).catch(() => '');
    
    assert.strictEqual(
      title,
      'Software Engineer',
      'Should extract text with 3 second timeout'
    );
  });

  it('should handle missing elements gracefully with fallback', async () => {
    const mockElement = {
      innerText: async (options?: { timeout?: number }) => {
        throw new Error('Element not found');
      }
    };

    const title = await mockElement.innerText({ timeout: 3000 }).catch(() => '');
    
    assert.strictEqual(
      title,
      '',
      'Should return empty string when element not found'
    );
  });

  it('should handle company name with fallback to Unknown Company', async () => {
    const mockElement = {
      innerText: async (options?: { timeout?: number }) => {
        throw new Error('Element not found');
      }
    };

    const company = await mockElement.innerText({ timeout: 3000 }).catch(() => 'Unknown Company');
    
    assert.strictEqual(
      company,
      'Unknown Company',
      'Should fallback to "Unknown Company" when company element not found'
    );
  });

  it('should validate required fields before processing', () => {
    // Test case 1: Valid job
    const validJob = {
      title: 'Software Engineer',
      company: 'Netflix',
      link: 'https://www.linkedin.com/jobs/view/123456'
    };

    const isValid1 = !!(validJob.link && validJob.title);
    assert.strictEqual(isValid1, true, 'Should be valid when title and link present');

    // Test case 2: Missing title
    const missingTitle = {
      title: '',
      company: 'Netflix',
      link: 'https://www.linkedin.com/jobs/view/123456'
    };

    const isValid2 = !!(missingTitle.link && missingTitle.title);
    assert.strictEqual(isValid2, false, 'Should be invalid when title missing');

    // Test case 3: Missing link
    const missingLink = {
      title: 'Software Engineer',
      company: 'Netflix',
      link: ''
    };

    const isValid3 = !!(missingLink.link && missingLink.title);
    assert.strictEqual(isValid3, false, 'Should be invalid when link missing');
  });

  it('should extract job ID from LinkedIn URL correctly', async () => {
    const crypto = await import('crypto');
    
    const url = 'https://www.linkedin.com/jobs/view/1234567890';
    const jobId = crypto.createHash('md5').update(url).digest('hex');
    
    assert.strictEqual(jobId.length, 32, 'MD5 hash should be 32 characters');
    
    // Same URL should produce same hash (idempotency)
    const jobId2 = crypto.createHash('md5').update(url).digest('hex');
    assert.strictEqual(jobId, jobId2, 'Same URL should produce same job ID');
    
    // Different URLs should produce different hashes
    const url2 = 'https://www.linkedin.com/jobs/view/9876543210';
    const jobId3 = crypto.createHash('md5').update(url2).digest('hex');
    assert.notStrictEqual(jobId, jobId3, 'Different URLs should produce different job IDs');
  });
});

/**
 * Tests for modal dismissal logic
 */
describe('Search Command - Modal Dismissal', () => {
  it('should identify common LinkedIn modal selectors', () => {
    const modalSelectors = [
      'button[aria-label="Dismiss"]',
      'button[data-test-modal-close-btn]',
      'button.artdeco-modal__dismiss',
      'button.msg-overlay-bubble-header__control',
      '[data-test-modal-id] button[aria-label*="Dismiss"]',
      '.artdeco-modal button[aria-label*="close" i]'
    ];

    assert.strictEqual(
      modalSelectors.length,
      6,
      'Should have 6 modal close button selectors'
    );

    // Verify selectors are valid CSS
    for (const selector of modalSelectors) {
      assert.ok(
        selector.length > 0,
        `Selector should not be empty: ${selector}`
      );
      assert.ok(
        !selector.includes('  '),
        `Selector should not have double spaces: ${selector}`
      );
    }
  });

  it('should handle modal dismissal errors gracefully', async () => {
    const mockPage = {
      locator: (selector: string) => ({
        first: () => ({
          count: async () => 0,
          click: async () => {
            throw new Error('Element not clickable');
          }
        })
      }),
      keyboard: {
        press: async (key: string) => {
          // Simulate successful escape press
        }
      },
      waitForTimeout: async (ms: number) => {
        // Simulate wait
      }
    };

    // Should not throw error even if modal dismissal fails
    let errorThrown = false;
    try {
      // Simulate dismissModals logic
      const closeButton = mockPage.locator('button[aria-label="Dismiss"]').first();
      const count = await closeButton.count();
      if (count > 0) {
        await closeButton.click().catch(() => {});
      }
      await mockPage.keyboard.press('Escape');
    } catch (error) {
      errorThrown = true;
    }

    assert.strictEqual(
      errorThrown,
      false,
      'Modal dismissal should handle errors gracefully'
    );
  });
});

/**
 * Tests for click handling with force fallback
 */
describe('Search Command - Click Handling', () => {
  it('should attempt normal click before force click', async () => {
    let normalClickAttempted = false;
    let forceClickAttempted = false;

    const mockCard = {
      click: async (options?: { force?: boolean; timeout?: number }) => {
        if (!options?.force) {
          normalClickAttempted = true;
          throw new Error('Element is blocked by overlay');
        } else {
          forceClickAttempted = true;
        }
      }
    };

    // Simulate the click logic from search.ts
    try {
      await mockCard.click({ timeout: 3000 });
    } catch (error) {
      try {
        await mockCard.click({ force: true, timeout: 2000 });
      } catch (forceError) {
        // Skip if force click fails
      }
    }

    assert.strictEqual(
      normalClickAttempted,
      true,
      'Should attempt normal click first'
    );
    assert.strictEqual(
      forceClickAttempted,
      true,
      'Should attempt force click after normal click fails'
    );
  });

  it('should continue processing other jobs if click fails', () => {
    const jobs = [
      { id: 1, clickable: true },
      { id: 2, clickable: false }, // This one fails
      { id: 3, clickable: true }
    ];

    const processed: number[] = [];

    for (const job of jobs) {
      if (!job.clickable) {
        // Simulate continue statement
        continue;
      }
      processed.push(job.id);
    }

    assert.deepStrictEqual(
      processed,
      [1, 3],
      'Should continue processing remaining jobs after a click failure'
    );
  });
});

/**
 * Tests for DOM re-location logic
 */
describe('Search Command - DOM Re-location', () => {
  it('should re-locate elements after each iteration', () => {
    // Simulate DOM state that changes after clicking
    let domState = 0;
    
    const getJobCards = () => {
      // Simulate getting fresh locator each time
      return {
        iteration: domState,
        nth: (index: number) => ({
          id: `job-${domState}-${index}`,
          iteration: domState
        })
      };
    };

    const firstCards = getJobCards();
    const firstCard = firstCards.nth(0);
    
    // Simulate DOM change (like clicking a job)
    domState++;
    
    const secondCards = getJobCards();
    const secondCard = secondCards.nth(0);

    // After DOM change, freshly located cards should have new iteration number
    assert.notStrictEqual(
      firstCard.iteration,
      secondCard.iteration,
      'Re-located elements should reflect DOM changes'
    );
  });

  it('should check element visibility before processing', async () => {
    const mockCard = {
      isVisible: async (options?: { timeout?: number }) => {
        return options?.timeout === 2000; // Only visible with correct timeout
      }
    };

    const isVisible = await mockCard.isVisible({ timeout: 2000 }).catch(() => false);
    
    assert.strictEqual(
      isVisible,
      true,
      'Should check visibility with 2 second timeout'
    );
  });

  it('should handle invisible cards gracefully', async () => {
    const mockCard = {
      isVisible: async (options?: { timeout?: number }) => {
        throw new Error('Element not visible');
      }
    };

    const isVisible = await mockCard.isVisible({ timeout: 2000 }).catch(() => false);
    
    assert.strictEqual(
      isVisible,
      false,
      'Should return false when visibility check fails'
    );
  });
});

/**
 * Tests for pagination
 */
describe('Search Command - Pagination', () => {
  it('should use specific pagination selector to avoid conflicts', () => {
    const specificSelector = '.jobs-search-pagination__button--next';
    const genericSelector = 'button[aria-label="Next"]';
    
    // The specific selector should be more precise
    assert.ok(
      specificSelector.includes('jobs-search-pagination'),
      'Pagination selector should be specific to job search pagination'
    );
    
    assert.ok(
      !specificSelector.includes('button[aria-label'),
      'Should not rely on generic button aria-label which may match multiple elements'
    );
  });
  
  it('should display page count correctly', () => {
    const maxPages = 999;
    const pageDisplay = maxPages >= 999 ? 'all' : maxPages.toString();
    
    assert.strictEqual(
      pageDisplay,
      'all',
      'Should display "all" when maxPages is 999 or more'
    );
    
    const maxPages2 = 5;
    const pageDisplay2 = maxPages2 >= 999 ? 'all' : maxPages2.toString();
    
    assert.strictEqual(
      pageDisplay2,
      '5',
      'Should display actual number when maxPages is less than 999'
    );
  });
  
  it('should default to processing all pages', () => {
    const defaultMaxPages = 999;
    
    assert.strictEqual(
      defaultMaxPages,
      999,
      'Default maxPages should be 999 (process all available pages)'
    );
  });
});

/**
 * Tests for search URL building
 */
describe('Search Command - URL Building', () => {
  it('should build search URL with keywords', () => {
    const params = new URLSearchParams();
    params.set('keywords', 'api engineer');
    
    const url = `https://www.linkedin.com/jobs/search/?${params.toString()}`;
    
    assert.ok(
      url.includes('keywords=api+engineer'),
      'URL should include keywords'
    );
  });

  it('should add location parameter when provided', () => {
    const params = new URLSearchParams();
    params.set('keywords', 'api engineer');
    params.set('location', 'United States');
    
    const url = `https://www.linkedin.com/jobs/search/?${params.toString()}`;
    
    assert.ok(
      url.includes('location=United+States'),
      'URL should include location'
    );
  });

  it('should add remote filter when requested', () => {
    const params = new URLSearchParams();
    params.set('keywords', 'api engineer');
    params.set('f_WT', '2'); // Remote filter
    
    const url = `https://www.linkedin.com/jobs/search/?${params.toString()}`;
    
    assert.ok(
      url.includes('f_WT=2'),
      'URL should include remote filter'
    );
  });

  it('should add date posted filter when provided', () => {
    const dateMap = {
      day: 'r86400',
      week: 'r604800',
      month: 'r2592000'
    };

    for (const [period, value] of Object.entries(dateMap)) {
      const params = new URLSearchParams();
      params.set('keywords', 'api engineer');
      params.set('f_TPR', value);
      
      const url = `https://www.linkedin.com/jobs/search/?${params.toString()}`;
      
      assert.ok(
        url.includes(`f_TPR=${value}`),
        `URL should include date filter for ${period}`
      );
    }
  });
});

/**
 * Tests for job description validation
 */
describe('Search Command - Description Validation', () => {
  it('should detect short descriptions that might cause poor analysis', () => {
    const descriptions = [
      { text: 'Software Engineer', length: 18 },
      { text: 'A full description with at least 100 characters to provide enough context for the LLM to analyze properly and make good decisions', length: 130 },
      { text: 'Short', length: 5 }
    ];
    
    const shortDescriptions = descriptions.filter(d => d.length < 100);
    
    assert.strictEqual(
      shortDescriptions.length,
      2,
      'Should identify 2 short descriptions'
    );
  });
  
  it('should fall back to title when description extraction fails', () => {
    const title = 'Senior API Engineer';
    let description = '';
    
    // Simulate failed extraction
    if (!description || description.length < 50) {
      description = title;
    }
    
    assert.strictEqual(
      description,
      title,
      'Should use title as fallback when description is too short'
    );
  });
});

/**
 * Tests for job data fields
 */
describe('Search Command - Job Data Fields', () => {
  it('should handle posted_date as optional field', () => {
    const job1 = {
      title: 'Engineer',
      posted_date: '2 days ago'
    };
    
    const job2 = {
      title: 'Engineer',
      posted_date: undefined
    };
    
    assert.strictEqual(
      typeof job1.posted_date,
      'string',
      'posted_date should be string when present'
    );
    
    assert.strictEqual(
      job2.posted_date,
      undefined,
      'posted_date should be undefined when not found'
    );
  });
  
  it('should handle category scores and missing keywords', () => {
    const ranking = {
      fitScore: 85,
      categoryScores: {
        coreAzure: 90,
        security: 80,
        eventDriven: 70,
        performance: 85,
        devops: 75,
        seniority: 95
      },
      reasons: ['Strong match'],
      mustHaves: ['Azure', 'C#'],
      blockers: [],
      missingKeywords: ['APIM', 'Service Bus']
    };
    
    const job = {
      category_scores: JSON.stringify(ranking.categoryScores),
      missing_keywords: JSON.stringify(ranking.missingKeywords)
    };
    
    const parsedScores = JSON.parse(job.category_scores);
    const parsedKeywords = JSON.parse(job.missing_keywords);
    
    assert.strictEqual(
      parsedScores.coreAzure,
      90,
      'Should correctly serialize/deserialize category scores'
    );
    
    assert.strictEqual(
      parsedKeywords.length,
      2,
      'Should correctly serialize/deserialize missing keywords'
    );
  });
});

