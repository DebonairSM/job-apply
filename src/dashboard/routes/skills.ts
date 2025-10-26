import { Router } from 'express';
import { 
  getUserSkills, 
  saveUserSkill, 
  deleteUserSkill,
  clearUserSkills,
  UserSkill 
} from '../../lib/db.js';

const router = Router();

// GET /api/skills - Get all user skills
router.get('/', (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const skills = getUserSkills(category);
    res.json(skills);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// POST /api/skills - Create or update a skill
router.post('/', (req, res) => {
  try {
    const skillData: Omit<UserSkill, 'id' | 'created_at' | 'updated_at'> = {
      skill_name: req.body.skill_name || '',
      category: req.body.category,
      proficiency_level: req.body.proficiency_level,
      years_experience: req.body.years_experience ? parseFloat(req.body.years_experience) : undefined,
      source: req.body.source || 'manual',
      resume_file_id: req.body.resume_file_id
    };
    
    // Validate required fields
    if (!skillData.skill_name) {
      return res.status(400).json({ error: 'Skill name is required' });
    }
    
    saveUserSkill(skillData);
    
    // Return updated skills list
    const skills = getUserSkills();
    res.json(skills);
  } catch (error) {
    console.error('Error saving skill:', error);
    res.status(500).json({ error: 'Failed to save skill' });
  }
});

// DELETE /api/skills/:id - Delete a skill
router.delete('/:id', (req, res) => {
  try {
    const skillId = parseInt(req.params.id, 10);
    
    if (isNaN(skillId)) {
      return res.status(400).json({ error: 'Invalid skill ID' });
    }
    
    deleteUserSkill(skillId);
    
    // Return updated skills list
    const skills = getUserSkills();
    res.json(skills);
  } catch (error) {
    console.error('Error deleting skill:', error);
    res.status(500).json({ error: 'Failed to delete skill' });
  }
});

// DELETE /api/skills - Clear all skills
router.delete('/', (req, res) => {
  try {
    clearUserSkills();
    res.json({ message: 'All skills cleared' });
  } catch (error) {
    console.error('Error clearing skills:', error);
    res.status(500).json({ error: 'Failed to clear skills' });
  }
});

export default router;

