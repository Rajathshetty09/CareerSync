import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import {
  searchJobsService,
  getJobService,
  saveJobService,
  unsaveJobService,
  getSavedJobsService,
  getSavedJobIdsService,
} from './job.service.js';

// GET /api/v1/jobs
export const searchJobs = asyncHandler(async (req, res) => {
  const result = await searchJobsService(req.query);
  res.status(200).json(new ApiResponse(200, result, 'Jobs fetched'));
});

// GET /api/v1/jobs/saved
export const getSavedJobs = asyncHandler(async (req, res) => {
  const result = await getSavedJobsService(req.user.id, req.query);
  res.status(200).json(new ApiResponse(200, result, 'Saved jobs fetched'));
});

// GET /api/v1/jobs/saved/ids
export const getSavedJobIds = asyncHandler(async (req, res) => {
  const ids = await getSavedJobIdsService(req.user.id);
  res.status(200).json(new ApiResponse(200, ids, 'Saved job IDs fetched'));
});

// GET /api/v1/jobs/:id
export const getJob = asyncHandler(async (req, res) => {
  const job = await getJobService(req.params.id);
  res.status(200).json(new ApiResponse(200, job, 'Job fetched'));
});

// POST /api/v1/jobs/save
export const saveJob = asyncHandler(async (req, res) => {
  const saved = await saveJobService(req.user.id, req.body.jobId);
  res.status(200).json(new ApiResponse(200, saved, 'Job saved'));
});

// DELETE /api/v1/jobs/save/:jobId
export const unsaveJob = asyncHandler(async (req, res) => {
  await unsaveJobService(req.user.id, req.params.jobId);
  res.status(200).json(new ApiResponse(200, null, 'Job removed from saved'));
});
