import User from '../../models/User.js';
import Job from '../../models/Job.js';
import Application from '../../models/Application.js';
import Resume from '../../models/Resume.js';
import { paginate, paginationMeta } from '../../utils/pagination.js';
import ApiError from '../../utils/ApiError.js';
import { enqueueAllPortals } from '../../queues/jobDiscovery.queue.js';

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const getAdminStatsService = async () => {
  const [users, jobs, applications, resumes] = await Promise.all([
    User.countDocuments(),
    Job.countDocuments(),
    Application.countDocuments(),
    Resume.countDocuments(),
  ]);
  return { users, jobs, applications, resumes };
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const listUsersService = async (queryParams) => {
  const { page, limit, skip } = paginate(queryParams);
  const { search } = queryParams;

  const filter = search
    ? { $or: [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }] }
    : {};

  const [users, total] = await Promise.all([
    User.find(filter).select('-password -refreshTokenHash').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return { users, pagination: paginationMeta(total, page, limit) };
};

export const updateUserRoleService = async (userId, role) => {
  const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).select('-password');
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

export const deleteUserService = async (userId) => {
  const user = await User.findByIdAndDelete(userId);
  if (!user) throw new ApiError(404, 'User not found');
};

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export const listJobsAdminService = async (queryParams) => {
  const { page, limit, skip } = paginate(queryParams);
  const { source, isActive } = queryParams;

  const filter = {};
  if (source) filter.source = source;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const [jobs, total] = await Promise.all([
    Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Job.countDocuments(filter),
  ]);

  return { jobs, pagination: paginationMeta(total, page, limit) };
};

export const toggleJobActiveService = async (jobId) => {
  const job = await Job.findById(jobId);
  if (!job) throw new ApiError(404, 'Job not found');
  job.isActive = !job.isActive;
  await job.save();
  return job;
};

export const deleteJobService = async (jobId) => {
  const job = await Job.findByIdAndDelete(jobId);
  if (!job) throw new ApiError(404, 'Job not found');
};

// ─── Scraper trigger ──────────────────────────────────────────────────────────

export const triggerScraperService = async (query, portals) => {
  const opts = portals?.length ? { portals } : {};
  await enqueueAllPortals(query, opts);
  return { queued: true, query, portals: portals || 'all' };
};
