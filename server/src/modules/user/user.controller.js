import asyncHandler from '../../utils/asyncHandler.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import {
  getProfileService,
  updateProfileService,
  updateSkillsService,
  addExperienceService,
  updateExperienceService,
  deleteExperienceService,
  updatePreferencesService,
  uploadAvatarService,
  deleteAvatarService,
} from './user.service.js';

// GET /api/v1/users/me
export const getProfile = asyncHandler(async (req, res) => {
  const user = await getProfileService(req.user.id);
  res.status(200).json(new ApiResponse(200, user, 'Profile fetched'));
});

// PUT /api/v1/users/me
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await updateProfileService(req.user.id, req.body);
  res.status(200).json(new ApiResponse(200, user, 'Profile updated'));
});

// PATCH /api/v1/users/me/skills
export const updateSkills = asyncHandler(async (req, res) => {
  const user = await updateSkillsService(req.user.id, req.body.skills);
  res.status(200).json(new ApiResponse(200, user, 'Skills updated'));
});

// POST /api/v1/users/me/experience
export const addExperience = asyncHandler(async (req, res) => {
  const user = await addExperienceService(req.user.id, req.body);
  res.status(201).json(new ApiResponse(201, user, 'Experience added'));
});

// PUT /api/v1/users/me/experience/:expId
export const updateExperience = asyncHandler(async (req, res) => {
  const user = await updateExperienceService(req.user.id, req.params.expId, req.body);
  res.status(200).json(new ApiResponse(200, user, 'Experience updated'));
});

// DELETE /api/v1/users/me/experience/:expId
export const deleteExperience = asyncHandler(async (req, res) => {
  const user = await deleteExperienceService(req.user.id, req.params.expId);
  res.status(200).json(new ApiResponse(200, user, 'Experience removed'));
});

// PATCH /api/v1/users/me/preferences
export const updatePreferences = asyncHandler(async (req, res) => {
  const user = await updatePreferencesService(req.user.id, req.body);
  res.status(200).json(new ApiResponse(200, user, 'Preferences updated'));
});

// PATCH /api/v1/users/me/avatar
export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image file provided');
  const user = await uploadAvatarService(req.user.id, req.file.buffer);
  res.status(200).json(new ApiResponse(200, user, 'Avatar updated'));
});

// DELETE /api/v1/users/me/avatar
export const deleteAvatar = asyncHandler(async (req, res) => {
  const user = await deleteAvatarService(req.user.id);
  res.status(200).json(new ApiResponse(200, user, 'Avatar removed'));
});
