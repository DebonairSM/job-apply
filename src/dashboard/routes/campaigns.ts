import express, { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { 
  getAllCampaigns, 
  getActiveCampaigns, 
  getCampaignById, 
  createCampaign as dbCreateCampaign, 
  updateCampaign as dbUpdateCampaign, 
  deleteCampaign as dbDeleteCampaign,
  type Campaign 
} from '../../lib/db.js';
import { renderCampaign } from '../../services/campaign-renderer.js';

const router = express.Router();

// GET /campaigns - List all campaigns
router.get('/', (req: Request, res: Response) => {
  try {
    const campaigns = getAllCampaigns();
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ 
      error: 'Failed to fetch campaigns',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /campaigns/active - List active campaigns only
router.get('/active', (req: Request, res: Response) => {
  try {
    const campaigns = getActiveCampaigns();
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching active campaigns:', error);
    res.status(500).json({ 
      error: 'Failed to fetch active campaigns',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /campaigns/:id - Get single campaign
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = getCampaignById(id);
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json(campaign);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ 
      error: 'Failed to fetch campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /campaigns - Create new campaign
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, description, subject_template, body_template, static_placeholders, status } = req.body;
    
    // Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Campaign name is required' });
    }
    
    if (!subject_template || typeof subject_template !== 'string' || subject_template.trim() === '') {
      return res.status(400).json({ error: 'Subject template is required' });
    }
    
    if (!body_template || typeof body_template !== 'string' || body_template.trim() === '') {
      return res.status(400).json({ error: 'Body template is required' });
    }
    
    if (status && status !== 'active' && status !== 'inactive') {
      return res.status(400).json({ error: 'Status must be either "active" or "inactive"' });
    }
    
    // Validate static_placeholders is valid JSON if provided
    if (static_placeholders) {
      try {
        JSON.parse(static_placeholders);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON for static_placeholders' });
      }
    }
    
    const campaignData: Omit<Campaign, 'created_at' | 'updated_at'> = {
      id: randomUUID(),
      name: name.trim(),
      description: description?.trim() || undefined,
      subject_template: subject_template.trim(),
      body_template: body_template.trim(),
      static_placeholders: static_placeholders || undefined,
      status: status || 'active'
    };
    
    const campaign = dbCreateCampaign(campaignData);
    res.status(201).json(campaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ 
      error: 'Failed to create campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /campaigns/:id - Update campaign
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, subject_template, body_template, static_placeholders, status } = req.body;
    
    // Check if campaign exists
    const existingCampaign = getCampaignById(id);
    if (!existingCampaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Validation
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return res.status(400).json({ error: 'Campaign name cannot be empty' });
    }
    
    if (subject_template !== undefined && (typeof subject_template !== 'string' || subject_template.trim() === '')) {
      return res.status(400).json({ error: 'Subject template cannot be empty' });
    }
    
    if (body_template !== undefined && (typeof body_template !== 'string' || body_template.trim() === '')) {
      return res.status(400).json({ error: 'Body template cannot be empty' });
    }
    
    if (status !== undefined && status !== 'active' && status !== 'inactive') {
      return res.status(400).json({ error: 'Status must be either "active" or "inactive"' });
    }
    
    // Validate static_placeholders is valid JSON if provided
    if (static_placeholders !== undefined) {
      try {
        JSON.parse(static_placeholders);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON for static_placeholders' });
      }
    }
    
    const updates: Partial<Omit<Campaign, 'id' | 'created_at' | 'updated_at'>> = {};
    
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || undefined;
    if (subject_template !== undefined) updates.subject_template = subject_template.trim();
    if (body_template !== undefined) updates.body_template = body_template.trim();
    if (static_placeholders !== undefined) updates.static_placeholders = static_placeholders;
    if (status !== undefined) updates.status = status;
    
    const success = dbUpdateCampaign(id, updates);
    
    if (!success) {
      return res.status(404).json({ error: 'Campaign not found or no changes made' });
    }
    
    // Return updated campaign
    const updatedCampaign = getCampaignById(id);
    res.json(updatedCampaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ 
      error: 'Failed to update campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /campaigns/:id - Delete campaign
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const success = dbDeleteCampaign(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ 
      error: 'Failed to delete campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /campaigns/:id/render/:leadId - Render campaign for specific lead
router.post('/:id/render/:leadId', async (req: Request, res: Response) => {
  try {
    const { id, leadId } = req.params;
    
    const renderedEmail = await renderCampaign(id, leadId);
    res.json(renderedEmail);
  } catch (error) {
    console.error('Error rendering campaign:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ 
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to render campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

