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
    const { status, applied_method } = req.body;
    
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
    
    updateJobStatus(req.params.id, status, applied_method);
    
    const updatedJob = getJobById(req.params.id);
    res.json(updatedJob);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

export default router;

