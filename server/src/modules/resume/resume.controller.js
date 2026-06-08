import asyncHandler from '../../utils/asyncHandler.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import {
  uploadResumeService,
  listResumesService,
  getResumeService,
  deleteResumeService,
  setDefaultResumeService,
} from './resume.service.js';

// POST /api/v1/resumes
export const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No PDF file provided');
  const resume = await uploadResumeService(req.user.id, req.file);
  res.status(201).json(new ApiResponse(201, resume, 'Resume uploaded successfully'));
});

// GET /api/v1/resumes
export const listResumes = asyncHandler(async (req, res) => {
  const resumes = await listResumesService(req.user.id);
  res.status(200).json(new ApiResponse(200, resumes, 'Resumes fetched'));
});

// GET /api/v1/resumes/:id
export const getResume = asyncHandler(async (req, res) => {
  const resume = await getResumeService(req.user.id, req.params.id);
  res.status(200).json(new ApiResponse(200, resume, 'Resume fetched'));
});

// DELETE /api/v1/resumes/:id
export const deleteResume = asyncHandler(async (req, res) => {
  await deleteResumeService(req.user.id, req.params.id);
  res.status(200).json(new ApiResponse(200, null, 'Resume deleted'));
});

// PATCH /api/v1/resumes/:id/default
export const setDefaultResume = asyncHandler(async (req, res) => {
  const resume = await setDefaultResumeService(req.user.id, req.params.id);
  res.status(200).json(new ApiResponse(200, resume, 'Default resume updated'));
});
