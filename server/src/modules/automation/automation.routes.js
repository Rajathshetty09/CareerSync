import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { saveCredentialsSchema, triggerAutoApplySchema } from './automation.validation.js';
import {
  saveCredentials,
  getCredentials,
  deleteCredentials,
  testLogin,
  triggerAutoApply,
  getRunHistory,
  getRunProgress,
  getRunById,
  cancelRun,
} from './automation.controller.js';

const router = Router();
router.use(authenticate);

// Credentials
router.post('/credentials',              validate(saveCredentialsSchema),     saveCredentials);
router.get('/credentials/:portal',                                            getCredentials);
router.delete('/credentials/:portal',                                         deleteCredentials);
router.post('/test-login',                                                    testLogin);

// Auto-apply
router.post('/trigger',                  validate(triggerAutoApplySchema),    triggerAutoApply);

// Run history
router.get('/runs',                                                           getRunHistory);
router.get('/runs/:id/progress',                                              getRunProgress);
router.get('/runs/:id',                                                       getRunById);
router.patch('/runs/:id/cancel',                                              cancelRun);

export default router;
