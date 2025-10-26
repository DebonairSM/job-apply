import { Router } from 'express';
import { 
  getResumeFiles, 
  getResumeFileByName,
  saveResumeFile,
  deleteResumeFile,
  ResumeFile 
} from '../../lib/db.js';
import { extractResumeToDatabase } from '../../ai/rag.js';
import { join } from 'path';

const router = Router();

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

export default router;

