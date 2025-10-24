import express from 'express';
import { getJobsByStatus, getJobById, updateJobStatus } from '../../lib/db.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { status, easyApply, limit = '50', offset = '0' } = req.query;
    
    // Get jobs with optional filtering
    const statusFilter = status ? String(status) : undefined;
    const easyApplyFilter = easyApply === 'true' ? true : easyApply === 'false' ? false : undefined;
    
    const allJobs = getJobsByStatus(statusFilter, easyApplyFilter);
    
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

export default router;

