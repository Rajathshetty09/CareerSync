import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { getAnalytics } from './analytics.controller.js';

const router = Router();
router.use(authenticate);
router.get('/', getAnalytics);

export default router;
