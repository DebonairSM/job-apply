import express from 'express';
import { isOllamaHealthy } from '../../ai/ollama-client.js';

const router = express.Router();

/**
 * GET /api/llm-health
 * Check if the LLM (Ollama) service is healthy and responsive
 * Returns: { healthy: boolean, timestamp: string }
 */
router.get('/', async (_req: express.Request, res: express.Response): Promise<void> => {
  try {
    const healthy = await isOllamaHealthy();
    res.json({
      healthy,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking LLM health:', error);
    res.json({
      healthy: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;



