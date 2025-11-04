import { Router } from 'express';
import { generateHeadline } from './headline.js';

const router = Router();

router.post('/generate', generateHeadline);

export default router;

