import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { analyseResumeSchema, coverLetterSchema, skillGapSchema } from './ai.validation.js';
import {
  analyseResumeController,
  generateCoverLetterController,
  analyseSkillGapController,
} from './ai.controller.js';

const router = Router();

router.use(authenticate);

router.post('/analyse-resume', validate(analyseResumeSchema), analyseResumeController);
router.post('/cover-letter',   validate(coverLetterSchema),   generateCoverLetterController);
router.post('/skill-gap',      validate(skillGapSchema),      analyseSkillGapController);

export default router;
