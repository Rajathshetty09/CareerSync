import { Router } from 'express';
import { authLimiter } from '../../middleware/rateLimiter.js';
import validate from '../../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  resendVerificationSchema,
} from './auth.validation.js';
import {
  register,
  login,
  refreshToken,
  logout,
  verifyEmail,
  resendVerification,
} from './auth.controller.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login',    authLimiter, validate(loginSchema),    login);
router.post('/refresh-token', refreshToken);
router.post('/logout',        logout);
router.get('/verify-email',   verifyEmail);
router.post(
  '/resend-verification',
  authLimiter,
  validate(resendVerificationSchema),
  resendVerification,
);

export default router;
