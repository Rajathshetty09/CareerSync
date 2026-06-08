import { Router } from 'express';
import Joi from 'joi';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { USER_ROLES } from '../../constants/index.js';
import {
  getAdminStats,
  listUsers, updateUserRole, deleteUser,
  listJobs, toggleJobActive, deleteJob,
  triggerScraper,
} from './admin.controller.js';

const roleSchema = Joi.object({ role: Joi.string().valid(...Object.values(USER_ROLES)).required() });
const scraperSchema = Joi.object({
  query:   Joi.string().min(1).max(100).required(),
  portals: Joi.array().items(Joi.string()).optional(),
});

const router = Router();
router.use(authenticate, authorize('admin'));

router.get('/stats', getAdminStats);

router.get('/users',           listUsers);
router.patch('/users/:id/role', validate(roleSchema), updateUserRole);
router.delete('/users/:id',     deleteUser);

router.get('/jobs',                listJobs);
router.patch('/jobs/:id/toggle',   toggleJobActive);
router.delete('/jobs/:id',         deleteJob);

router.post('/scraper/trigger',    validate(scraperSchema), triggerScraper);

export default router;
