import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import { uploadDocument } from '../../middleware/upload.js';
import {
  uploadResume,
  listResumes,
  getResume,
  deleteResume,
  setDefaultResume,
} from './resume.controller.js';

const router = Router();

router.use(authenticate);

router.get('/',            listResumes);
router.post('/',           uploadDocument, uploadResume);
router.get('/:id',         getResume);
router.delete('/:id',      deleteResume);
router.patch('/:id/default', setDefaultResume);

export default router;
