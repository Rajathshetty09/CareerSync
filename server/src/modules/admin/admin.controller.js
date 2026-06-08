import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import {
  getAdminStatsService,
  listUsersService,
  updateUserRoleService,
  deleteUserService,
  listJobsAdminService,
  toggleJobActiveService,
  deleteJobService,
  triggerScraperService,
} from './admin.service.js';

export const getAdminStats  = asyncHandler(async (req, res) => {
  const stats = await getAdminStatsService();
  res.json(new ApiResponse(200, { stats }, 'Stats retrieved'));
});

export const listUsers      = asyncHandler(async (req, res) => {
  const result = await listUsersService(req.query);
  res.json(new ApiResponse(200, result, 'Users retrieved'));
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const user = await updateUserRoleService(req.params.id, req.body.role);
  res.json(new ApiResponse(200, { user }, 'Role updated'));
});

export const deleteUser     = asyncHandler(async (req, res) => {
  await deleteUserService(req.params.id);
  res.json(new ApiResponse(200, {}, 'User deleted'));
});

export const listJobs       = asyncHandler(async (req, res) => {
  const result = await listJobsAdminService(req.query);
  res.json(new ApiResponse(200, result, 'Jobs retrieved'));
});

export const toggleJobActive = asyncHandler(async (req, res) => {
  const job = await toggleJobActiveService(req.params.id);
  res.json(new ApiResponse(200, { job }, 'Job updated'));
});

export const deleteJob      = asyncHandler(async (req, res) => {
  await deleteJobService(req.params.id);
  res.json(new ApiResponse(200, {}, 'Job deleted'));
});

export const triggerScraper = asyncHandler(async (req, res) => {
  const { query, portals } = req.body;
  const result = await triggerScraperService(query, portals);
  res.json(new ApiResponse(200, result, 'Scraper queued'));
});
