import pdfParse from 'pdf-parse';
import Resume from '../../models/Resume.js';
import ApiError from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';
import { uploadFile, deleteFromCloudinary } from '../../middleware/upload.js';
import { extractSkills } from '../../utils/skillExtractor.js';
import { MAX_RESUMES_PER_USER } from '../../constants/index.js';

// ─── Upload Resume ────────────────────────────────────────────────────────────
export const uploadResumeService = async (userId, file) => {
  // Enforce per-user limit
  const count = await Resume.countDocuments({ userId });
  if (count >= MAX_RESUMES_PER_USER) {
    throw new ApiError(
      409,
      `You can store a maximum of ${MAX_RESUMES_PER_USER} resumes. Please delete one before uploading.`,
    );
  }

  // Extract text from PDF buffer — non-fatal if parsing fails
  let extractedText = '';
  let extractedSkills = [];
  try {
    const parsed = await pdfParse(file.buffer);
    extractedText = parsed.text || '';
    extractedSkills = extractSkills(extractedText);
  } catch (err) {
    logger.warn(`PDF parsing failed for user ${userId}: ${err.message}`);
  }

  // Upload PDF (Cloudinary when configured, local disk otherwise)
  const sanitizedName = file.originalname
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.pdf$/i, '');

  const publicId = `careersync/resumes/${userId}/${Date.now()}_${sanitizedName}`;

  const uploadResult = await uploadFile(file.buffer, {
    resource_type: 'raw',
    public_id: publicId,
    format: 'pdf',
    overwrite: false,
  });

  // First resume auto-becomes default
  const isDefault = count === 0;

  const resume = await Resume.create({
    userId,
    fileUrl: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    fileName: file.originalname,
    fileSize: file.size,
    extractedText,
    extractedSkills,
    isDefault,
  });

  // Return without extractedText to keep response lean
  return Resume.findById(resume._id);
};

// ─── List Resumes ─────────────────────────────────────────────────────────────
export const listResumesService = async (userId) =>
  Resume.find({ userId }).sort({ createdAt: -1 });

// ─── Get Single Resume (with extracted text for preview) ──────────────────────
export const getResumeService = async (userId, resumeId) => {
  const resume = await Resume.findOne({ _id: resumeId, userId }).select('+extractedText');
  if (!resume) throw new ApiError(404, 'Resume not found');
  return resume;
};

// ─── Delete Resume ────────────────────────────────────────────────────────────
export const deleteResumeService = async (userId, resumeId) => {
  const resume = await Resume.findOne({ _id: resumeId, userId });
  if (!resume) throw new ApiError(404, 'Resume not found');

  await deleteFromCloudinary(resume.publicId, 'raw');
  await resume.deleteOne();

  return { deleted: true };
};

// ─── Set Default Resume ───────────────────────────────────────────────────────
export const setDefaultResumeService = async (userId, resumeId) => {
  const resume = await Resume.findOne({ _id: resumeId, userId });
  if (!resume) throw new ApiError(404, 'Resume not found');

  if (resume.isDefault) return resume; // already default, no-op

  // Unset current default, then set new one
  await Resume.updateMany({ userId, isDefault: true }, { $set: { isDefault: false } });
  resume.isDefault = true;
  await resume.save();

  return resume;
};
