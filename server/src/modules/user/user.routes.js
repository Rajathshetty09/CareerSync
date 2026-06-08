import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import { uploadImage } from '../../middleware/upload.js';
import {
  updateProfileSchema,
  updateSkillsSchema,
  experienceSchema,
  updatePreferencesSchema,
} from './user.validation.js';
import {
  getProfile,
  updateProfile,
  updateSkills,
  addExperience,
  updateExperience,
  deleteExperience,
  updatePreferences,
  uploadAvatar,
  deleteAvatar,
} from './user.controller.js';

const router = Router();

// All user routes require a valid access token
router.use(authenticate);

router.get('/me',                                                     getProfile);
router.put('/me',         validate(updateProfileSchema),              updateProfile);
router.patch('/me/skills',validate(updateSkillsSchema),               updateSkills);
router.patch('/me/preferences', validate(updatePreferencesSchema),    updatePreferences);
router.patch('/me/avatar',      uploadImage,                          uploadAvatar);
router.delete('/me/avatar',                                           deleteAvatar);

// Experience sub-resource
router.post('/me/experience',          validate(experienceSchema),    addExperience);
router.put('/me/experience/:expId',    validate(experienceSchema),    updateExperience);
router.delete('/me/experience/:expId',                                deleteExperience);

export default router;
