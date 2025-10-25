import { Router } from 'express';
import { generateCoverLetter } from './cover-letter.js';

const router = Router();

router.post('/generate', generateCoverLetter);

export default router;
