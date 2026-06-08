import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import {
  getApplicationsService,
  getApplicationByIdService,
  createApplicationService,
  updateApplicationService,
  deleteApplicationService,
  getApplicationStatsService,
} from './application.service.js';

export const listApplications = asyncHandler(async (req, res) => {
  const result = await getApplicationsService(req.user.id, req.query);
  res.json(new ApiResponse(200, result, 'Applications retrieved'));
});

export const getApplication = asyncHandler(async (req, res) => {
  const application = await getApplicationByIdService(req.params.id, req.user.id);
  res.json(new ApiResponse(200, { application }, 'Application retrieved'));
});

export const createApplication = asyncHandler(async (req, res) => {
  const application = await createApplicationService(req.user.id, req.body);
  res.status(201).json(new ApiResponse(201, { application }, 'Application created'));
});

export const updateApplication = asyncHandler(async (req, res) => {
  const application = await updateApplicationService(req.params.id, req.user.id, req.body);
  res.json(new ApiResponse(200, { application }, 'Application updated'));
});

export const deleteApplication = asyncHandler(async (req, res) => {
  await deleteApplicationService(req.params.id, req.user.id);
  res.json(new ApiResponse(200, {}, 'Application deleted'));
});

export const getStats = asyncHandler(async (req, res) => {
  const stats = await getApplicationStatsService(req.user.id);
  res.json(new ApiResponse(200, { stats }, 'Stats retrieved'));
});
