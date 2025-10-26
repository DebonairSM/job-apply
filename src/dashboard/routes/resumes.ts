import { Router } from 'express';
import { 
  getResumeFiles, 
  getResumeFileByName,
  saveResumeFile,
  deleteResumeFile,
  ResumeFile,
  clearUserSkills,
  clearUserExperience,
  clearUserEducation,
  getResumeDataSummary
} from '../../lib/db.js';
import { extractResumeToDatabase, getAvailableResumes } from '../../ai/rag.js';
import { createBackup } from '../../lib/backup.js';
import { join } from 'path';

const router = Router();

// GET /api/resumes/summary - Get resume data summary
router.get('/summary', (req, res) => {
  try {
    const summary = getResumeDataSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error fetching resume summary:', error);
    res.status(500).json({ error: 'Failed to fetch resume summary' });
  }
});

// GET /api/resumes - Get all resume files
router.get('/', (req, res) => {
  try {
    const activeOnly = req.query.activeOnly === 'true';
    const resumes = getResumeFiles(activeOnly);
    res.json(resumes);
  } catch (error) {
    console.error('Error fetching resumes:', error);
    res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});

// GET /api/resumes/:fileName - Get a specific resume
router.get('/:fileName', (req, res) => {
  try {
    const resume = getResumeFileByName(req.params.fileName);
    
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    res.json(resume);
  } catch (error) {
    console.error('Error fetching resume:', error);
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

// POST /api/resumes/parse/:fileName - Parse and extract a resume to database
router.post('/parse/:fileName', async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const resumePath = join(process.cwd(), 'resumes', fileName);
    
    const resumeFileId = await extractResumeToDatabase(resumePath);
    
    const resume = getResumeFileByName(fileName);
    res.json({ 
      message: 'Resume parsed successfully', 
      resumeFileId,
      resume 
    });
  } catch (error) {
    console.error('Error parsing resume:', error);
    res.status(500).json({ error: 'Failed to parse resume' });
  }
});

// PUT /api/resumes/:fileName - Update resume metadata
router.put('/:fileName', (req, res) => {
  try {
    const fileName = req.params.fileName;
    const existing = getResumeFileByName(fileName);
    
    if (!existing) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    const resumeData: Omit<ResumeFile, 'id' | 'created_at' | 'updated_at'> = {
      file_name: fileName,
      variant_type: req.body.variant_type !== undefined ? req.body.variant_type : existing.variant_type,
      parsed_at: existing.parsed_at,
      sections_extracted: existing.sections_extracted,
      is_active: req.body.is_active !== undefined ? req.body.is_active : existing.is_active,
      full_text: existing.full_text
    };
    
    saveResumeFile(resumeData);
    
    const updatedResume = getResumeFileByName(fileName);
    res.json(updatedResume);
  } catch (error) {
    console.error('Error updating resume:', error);
    res.status(500).json({ error: 'Failed to update resume' });
  }
});

// DELETE /api/resumes/:id - Delete a resume
router.delete('/:id', (req, res) => {
  try {
    const resumeId = parseInt(req.params.id, 10);
    
    if (isNaN(resumeId)) {
      return res.status(400).json({ error: 'Invalid resume ID' });
    }
    
    deleteResumeFile(resumeId);
    
    // Return updated resumes list
    const resumes = getResumeFiles();
    res.json(resumes);
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

// POST /api/resumes/sync-all - Sync all resumes to database
router.post('/sync-all', async (req, res) => {
  try {
    const clearExisting = req.query.clearExisting === 'true';
    
    // FIRST: Create database backup before any writes
    console.log('Creating database backup before resume sync...');
    const backupResult = createBackup();
    
    if (!backupResult.success) {
      return res.status(500).json({ 
        error: 'Failed to create database backup',
        details: backupResult.error 
      });
    }
    
    console.log(`Backup created: ${backupResult.backupPath}`);
    
    // Clear existing resume data if requested
    if (clearExisting) {
      console.log('Clearing existing resume data...');
      clearUserSkills();
      clearUserExperience();
      clearUserEducation();
    }
    
    // Get all resume files from resumes/ directory
    const resumeFiles = getAvailableResumes();
    
    if (resumeFiles.length === 0) {
      return res.json({
        message: 'No resume files found',
        backupPath: backupResult.backupPath,
        syncedCount: 0,
        errors: []
      });
    }
    
    // Extract each resume to database
    const results = [];
    const errors = [];
    
    for (const resumePath of resumeFiles) {
      try {
        console.log(`Extracting: ${resumePath}`);
        const resumeFileId = await extractResumeToDatabase(resumePath);
        results.push({ path: resumePath, id: resumeFileId });
      } catch (error) {
        console.error(`Failed to extract ${resumePath}:`, error);
        errors.push({
          path: resumePath,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    res.json({
      message: `Successfully synced ${results.length} resume(s)`,
      backupPath: backupResult.backupPath,
      syncedCount: results.length,
      totalFiles: resumeFiles.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error syncing resumes:', error);
    res.status(500).json({ 
      error: 'Failed to sync resumes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

