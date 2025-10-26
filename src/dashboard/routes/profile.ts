import { Router } from 'express';
import { getUserProfile, saveUserProfile, UserProfile } from '../../lib/db.js';

const router = Router();

// GET /api/profile - Get user profile
router.get('/', (req, res) => {
  try {
    const profile = getUserProfile();
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// POST /api/profile - Create or update user profile
router.post('/', (req, res) => {
  try {
    const profileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'> = {
      full_name: req.body.full_name || '',
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      email: req.body.email || '',
      phone: req.body.phone,
      city: req.body.city,
      linkedin_profile: req.body.linkedin_profile,
      work_authorization: req.body.work_authorization,
      requires_sponsorship: req.body.requires_sponsorship,
      profile_summary: req.body.profile_summary
    };
    
    // Validate required fields
    if (!profileData.full_name || !profileData.email) {
      return res.status(400).json({ error: 'Full name and email are required' });
    }
    
    saveUserProfile(profileData);
    
    const updatedProfile = getUserProfile();
    res.json(updatedProfile);
  } catch (error) {
    console.error('Error saving profile:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

export default router;

