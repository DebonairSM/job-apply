import { Router } from 'express';
import { 
  getAllApplicationPreferences, 
  getApplicationPreference,
  saveApplicationPreference, 
  deleteApplicationPreference,
  ApplicationPreference 
} from '../../lib/db.js';

const router = Router();

// GET /api/preferences - Get all application preferences
router.get('/', (req, res) => {
  try {
    const preferences = getAllApplicationPreferences();
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// GET /api/preferences/:key - Get a specific preference
router.get('/:key', (req, res) => {
  try {
    const value = getApplicationPreference(req.params.key);
    
    if (value === null) {
      return res.status(404).json({ error: 'Preference not found' });
    }
    
    res.json({ key: req.params.key, value });
  } catch (error) {
    console.error('Error fetching preference:', error);
    res.status(500).json({ error: 'Failed to fetch preference' });
  }
});

// POST /api/preferences - Create or update a preference
router.post('/', (req, res) => {
  try {
    const prefData: Omit<ApplicationPreference, 'updated_at'> = {
      key: req.body.key || '',
      value: req.body.value || '',
      description: req.body.description
    };
    
    // Validate required fields
    if (!prefData.key || !prefData.value) {
      return res.status(400).json({ error: 'Key and value are required' });
    }
    
    saveApplicationPreference(prefData);
    
    // Return updated preferences list
    const preferences = getAllApplicationPreferences();
    res.json(preferences);
  } catch (error) {
    console.error('Error saving preference:', error);
    res.status(500).json({ error: 'Failed to save preference' });
  }
});

// DELETE /api/preferences/:key - Delete a preference
router.delete('/:key', (req, res) => {
  try {
    deleteApplicationPreference(req.params.key);
    
    // Return updated preferences list
    const preferences = getAllApplicationPreferences();
    res.json(preferences);
  } catch (error) {
    console.error('Error deleting preference:', error);
    res.status(500).json({ error: 'Failed to delete preference' });
  }
});

export default router;

