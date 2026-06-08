import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import { jobSearchSchema } from './job.validation.js';
import {
  searchJobs,
  getJob,
  getSavedJobs,
  getSavedJobIds,
  saveJob,
  unsaveJob,
} from './job.controller.js';

const router = Router();

// Public search — no auth required (rate-limited globally)
router.get('/', validate(jobSearchSchema), searchJobs);
router.get('/:id', getJob);

// Saved jobs — require auth
router.get('/saved',     authenticate, getSavedJobs);
router.get('/saved/ids', authenticate, getSavedJobIds);
router.post('/save',     authenticate, saveJob);
router.delete('/save/:jobId', authenticate, unsaveJob);

export default router;
