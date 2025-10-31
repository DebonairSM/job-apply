import express from 'express';
import { getDb, getJobsByStatus, getJobById, updateJobStatus, toggleJobCurated, getAnswers, getRunHistory, getAllMappings, getUnprocessedRejections, markRejectionsAsProcessed } from '../../lib/db.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { status, easyApply, limit = '50', offset = '0', search, curated } = req.query;
    
    // Get jobs with optional filtering
    const statusFilter = status ? String(status) : undefined;
    const easyApplyFilter = easyApply === 'true' ? true : easyApply === 'false' ? false : undefined;
    const searchQuery = search ? String(search) : undefined;
    const curatedFilter = curated === 'true' ? true : curated === 'false' ? false : undefined;
    
    const allJobs = getJobsByStatus(statusFilter, easyApplyFilter, searchQuery, curatedFilter);
    
    // Apply pagination
    const limitNum = parseInt(String(limit), 10);
    const offsetNum = parseInt(String(offset), 10);
    const jobs = allJobs.slice(offsetNum, offsetNum + limitNum);
    
    res.json({
      jobs,
      total: allJobs.length,
      limit: limitNum,
      offset: offsetNum
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Export route must come before /:id to avoid treating "export" as a job ID
router.get('/export', (req, res) => {
  try {
    const { status, format = 'csv' } = req.query;
    
    if (format !== 'csv') {
      return res.status(400).json({ error: 'Only CSV format is supported' });
    }
    
    // Get jobs with optional status filter
    const statusFilter = status ? String(status) : undefined;
    const jobs = getJobsByStatus(statusFilter);
    
    // Generate CSV
    const headers = [
      'ID',
      'Title',
      'Company',
      'URL',
      'Easy Apply',
      'Rank',
      'Status',
      'Applied Method',
      'Rejection Reason',
      'Posted Date',
      'Created At'
    ];
    
    const rows = jobs.map(job => [
      job.id,
      `"${job.title.replace(/"/g, '""')}"`, // Escape quotes
      `"${job.company.replace(/"/g, '""')}"`,
      job.url,
      job.easy_apply ? 'Yes' : 'No',
      job.rank || '',
      job.status,
      job.applied_method || '',
      job.rejection_reason ? `"${job.rejection_reason.replace(/"/g, '""')}"` : '',
      job.posted_date || '',
      job.created_at || ''
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="jobs-export-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting jobs:', error);
    res.status(500).json({ error: 'Failed to export jobs' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const job = getJobById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

router.put('/:id/status', (req, res) => {
  try {
    const { status, applied_method, rejection_reason } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const validStatuses = ['queued', 'applied', 'interview', 'rejected', 'skipped', 'reported'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    if (applied_method && !['automatic', 'manual'].includes(applied_method)) {
      return res.status(400).json({ error: 'Invalid applied_method' });
    }
    
    updateJobStatus(req.params.id, status, applied_method, rejection_reason);
    
    const updatedJob = getJobById(req.params.id);
    res.json(updatedJob);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

router.put('/:id/curated', (req, res) => {
  try {
    toggleJobCurated(req.params.id);
    const updatedJob = getJobById(req.params.id);
    res.json(updatedJob);
  } catch (error) {
    console.error('Error toggling job curated:', error);
    res.status(500).json({ error: 'Failed to toggle job curated' });
  }
});

router.get('/:id/complete-data', (req, res) => {
  try {
    const jobId = req.params.id;
    
    // Get the main job record
    const job = getJobById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Get application answers
    const answers = getAnswers(jobId);
    
    // Get run logs for this job
    const runLogs = getRunHistory(jobId, 100); // Get last 100 runs
    
    // Get all label mappings (they're global, not job-specific)
    const labelMappings = getAllMappings();
    
    // Calculate metadata
    const metadata = {
      totalRunLogs: runLogs.length,
      hasScreenshots: runLogs.some(run => run.screenshot_path),
      hasAnswers: !!answers,
      lastExecution: runLogs.length > 0 ? runLogs[0].started_at : null,
      successfulRuns: runLogs.filter(run => run.ok).length,
      failedRuns: runLogs.filter(run => !run.ok).length
    };
    
    // Compile complete data
    const completeData = {
      job,
      answers: answers ? {
        json: JSON.parse(answers.json),
        resumeVariant: answers.resume_variant,
        createdAt: answers.created_at
      } : null,
      runLogs,
      labelMappings,
      metadata
    };
    
    res.json(completeData);
  } catch (error) {
    console.error('Error fetching complete job data:', error);
    res.status(500).json({ error: 'Failed to fetch complete job data' });
  }
});

// Rejection routes - must come before /:id to avoid conflicts
router.get('/rejections/prompt', (req, res) => {
  try {
    const rejections = getUnprocessedRejections();
    
    if (rejections.length === 0) {
      return res.json({
        prompt: 'No unprocessed rejections found.',
        jobIds: [],
        count: 0
      });
    }
    
    // Group rejections by profile
    const rejectionsByProfile = new Map<string, typeof rejections>();
    const allProfiles = new Set<string>();
    const rejectionReasons = new Map<string, number>();
    
    for (const job of rejections) {
      const profile = job.profile || 'unknown';
      if (!rejectionsByProfile.has(profile)) {
        rejectionsByProfile.set(profile, []);
      }
      rejectionsByProfile.get(profile)!.push(job);
      allProfiles.add(profile);
      
      if (job.rejection_reason) {
        const reason = job.rejection_reason.trim();
        rejectionReasons.set(reason, (rejectionReasons.get(reason) || 0) + 1);
      }
    }
    
    // Get most common rejection reasons
    const commonReasons = Array.from(rejectionReasons.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, count]) => `"${reason}" (${count}x)`)
      .join(', ');
    
    // Build the prompt
    const promptSections: string[] = [];
    
    // Section 1: Rejection Summary
    promptSections.push(`# Rejection Analysis & System Refinement Prompt\n`);
    promptSections.push(`## Section 1: Rejection Summary\n`);
    promptSections.push(`Total unprocessed rejections: ${rejections.length}`);
    promptSections.push(`Profiles affected: ${Array.from(allProfiles).join(', ')}`);
    promptSections.push(`Most common rejection reasons: ${commonReasons || 'N/A'}\n`);
    
    // Section 2: Profile Analysis
    promptSections.push(`## Section 2: Profile Analysis\n`);
    promptSections.push(`The following profiles appear in rejected jobs and may need refinement:`);
    for (const profile of Array.from(allProfiles).sort()) {
      const profileRejections = rejectionsByProfile.get(profile)!;
      promptSections.push(`- **${profile}**: ${profileRejections.length} rejection(s)`);
    }
    promptSections.push(``);
    
    // Section 3: Rejection Details
    promptSections.push(`## Section 3: Rejection Details\n`);
    promptSections.push(`For each rejected job, analyze why it was rejected and what the scoring system may have missed:\n`);
    
    for (const job of rejections.slice(0, 50)) { // Limit to 50 most recent for readability
      promptSections.push(`### ${job.title} at ${job.company}`);
      promptSections.push(`- **Profile Used**: ${job.profile || 'unknown'}`);
      promptSections.push(`- **Rank**: ${job.rank || 'N/A'}`);
      
      if (job.category_scores) {
        try {
          const scores = JSON.parse(job.category_scores);
          const scoreEntries = Object.entries(scores)
            .map(([cat, score]) => `${cat}: ${score}`)
            .join(', ');
          promptSections.push(`- **Category Scores**: ${scoreEntries}`);
        } catch (e) {
          promptSections.push(`- **Category Scores**: ${job.category_scores}`);
        }
      }
      
      if (job.fit_reasons) {
        try {
          const fitReasons = JSON.parse(job.fit_reasons);
          if (Array.isArray(fitReasons) && fitReasons.length > 0) {
            promptSections.push(`- **Fit Reasons**: ${fitReasons.join('; ')}`);
          }
        } catch (e) {
          promptSections.push(`- **Fit Reasons**: ${job.fit_reasons}`);
        }
      }
      
      if (job.must_haves) {
        try {
          const mustHaves = JSON.parse(job.must_haves);
          if (Array.isArray(mustHaves) && mustHaves.length > 0) {
            promptSections.push(`- **Must Haves**: ${mustHaves.join(', ')}`);
          }
        } catch (e) {
          promptSections.push(`- **Must Haves**: ${job.must_haves}`);
        }
      }
      
      if (job.blockers) {
        try {
          const blockers = JSON.parse(job.blockers);
          if (Array.isArray(blockers) && blockers.length > 0) {
            promptSections.push(`- **Blockers**: ${blockers.join(', ')}`);
          }
        } catch (e) {
          promptSections.push(`- **Blockers**: ${job.blockers}`);
        }
      }
      
      promptSections.push(`- **Rejection Reason**: "${job.rejection_reason || 'No reason provided'}"`);
      promptSections.push(``);
    }
    
    if (rejections.length > 50) {
      promptSections.push(`\n_Note: ${rejections.length - 50} additional rejections not shown above for brevity._\n`);
    }
    
    // Section 4: Logic Categories
    promptSections.push(`## Section 4: Logic Categories to Review\n`);
    promptSections.push(`Based on the rejections above, review and potentially improve:`);
    promptSections.push(`- **Weight Distributions**: Are the profile weight distributions (`);
    promptSections.push(`  coreAzure, seniority, coreNet, frontendFrameworks, legacyModernization)`);
    promptSections.push(`  appropriate? Do rejected jobs show patterns where certain weights are too high/low?`);
    promptSections.push(`- **Keyword Matching**: Are must-have vs preferred keywords correctly defined?`);
    promptSections.push(`  Do rejected jobs indicate missing keywords that should be added to must-have lists?`);
    promptSections.push(`- **Filter Logic**: Should tech stack filters, seniority filters, or other automatic`);
    promptSections.push(`  filters be adjusted to prevent similar jobs from being queued in the future?`);
    promptSections.push(``);
    
    // Section 5: Instructions
    promptSections.push(`## Section 5: Instructions\n`);
    promptSections.push(`Analyze the rejection data above and:`);
    promptSections.push(`1. **Identify Patterns**: Look for common themes in why jobs were rejected`);
    promptSections.push(`   - Technical stack mismatches`);
    promptSections.push(`   - Seniority level issues`);
    promptSections.push(`   - Missing required skills`);
    promptSections.push(`   - Other recurring issues`);
    promptSections.push(`2. **Identify Profiles to Refine**: Which profiles (`);
    promptSections.push(`   core, backend, core-net, etc.) need adjustments?`);
    promptSections.push(`3. **Propose Specific Improvements**:`);
    promptSections.push(`   - Adjust weight distributions for affected profiles`);
    promptSections.push(`   - Update keyword lists (must-have vs preferred)`);
    promptSections.push(`   - Suggest filter adjustments`);
    promptSections.push(`   - Recommend Boolean search query changes`);
    promptSections.push(`4. **Create Actionable Plan**: Provide a step-by-step plan to implement the improvements.`);
    promptSections.push(``);
    promptSections.push(`Focus on changes that will help the system avoid similar rejections in the future.`);
    
    const prompt = promptSections.join('\n');
    const jobIds = rejections.map(j => j.id);
    
    res.json({
      prompt,
      jobIds,
      count: rejections.length
    });
  } catch (error) {
    console.error('Error generating rejection prompt:', error);
    res.status(500).json({ error: 'Failed to generate rejection prompt' });
  }
});

router.get('/rejections/suggestions', (req, res) => {
  try {
    const database = getDb();
    
    // Get ALL rejected jobs with reasons (not just unprocessed)
    // Also get the most recent usage date for each reason
    const query = `
      SELECT rejection_reason, status_updated_at
      FROM jobs 
      WHERE status = 'rejected' 
        AND rejection_reason IS NOT NULL 
        AND rejection_reason != ''
      ORDER BY status_updated_at DESC
    `;
    
    const rows = database.prepare(query).all() as Array<{ rejection_reason: string; status_updated_at: string }>;
    
    // Group by rejection_reason, count frequency, and track most recent usage
    const reasonData = new Map<string, { count: number; mostRecent: string }>();
    for (const row of rows) {
      if (row.rejection_reason) {
        const reason = row.rejection_reason.trim();
        if (!reason) continue;
        
        const existing = reasonData.get(reason);
        if (existing) {
          existing.count++;
          // Keep the most recent date
          if (row.status_updated_at > existing.mostRecent) {
            existing.mostRecent = row.status_updated_at;
          }
        } else {
          reasonData.set(reason, {
            count: 1,
            mostRecent: row.status_updated_at
          });
        }
      }
    }
    
    // Convert to array and sort:
    // 1. First by count (descending) - most frequent first
    // 2. Then by most recent usage (descending) - recently used first when counts are equal
    // This ensures recently added reasons show up even if they only have count=1
    const suggestions = Array.from(reasonData.entries())
      .map(([reason, data]) => ({ reason, count: data.count, mostRecent: data.mostRecent }))
      .sort((a, b) => {
        // First sort by count (descending)
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        // If counts are equal, sort by most recent usage (descending)
        return b.mostRecent.localeCompare(a.mostRecent);
      })
      .slice(0, 20) // Increase to 20 to show more options, including recently used ones
      .map(({ reason, count }) => ({ reason, count })); // Remove mostRecent from response
    
    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching rejection suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch rejection suggestions' });
  }
});

router.post('/rejections/mark-processed', (req, res) => {
  try {
    const { jobIds } = req.body;
    
    if (!Array.isArray(jobIds)) {
      return res.status(400).json({ error: 'jobIds must be an array' });
    }
    
    markRejectionsAsProcessed(jobIds);
    res.json({ success: true, count: jobIds.length });
  } catch (error) {
    console.error('Error marking rejections as processed:', error);
    res.status(500).json({ error: 'Failed to mark rejections as processed' });
  }
});

export default router;

