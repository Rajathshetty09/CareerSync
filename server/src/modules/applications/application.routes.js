import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createApplicationSchema, updateApplicationSchema } from './application.validation.js';
import {
  listApplications,
  getApplication,
  createApplication,
  updateApplication,
  deleteApplication,
  getStats,
} from './application.controller.js';

const router = Router();

router.use(authenticate);

router.get('/stats', getStats);
router.get('/',      listApplications);
router.post('/',     validate(createApplicationSchema), createApplication);
router.get('/:id',   getApplication);
router.patch('/:id', validate(updateApplicationSchema), updateApplication);
router.delete('/:id', deleteApplication);

export default router;
