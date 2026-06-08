import mongoose from 'mongoose';
import Job from '../../models/Job.js';
import SavedJob from '../../models/SavedJob.js';
import ApiError from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';
import { paginate, paginationMeta } from '../../utils/pagination.js';
import { syncJobsFromProviders } from '../../services/jobSync.service.js';

// ─── Build search query ────────────────────────────────────────────────────────
const buildQuery = ({ keyword, location, source, employmentType, skills, salaryMin, remote, postedWithin }) => {
  const q = { isActive: true };

  if (keyword)        q.$text = { $search: keyword };
  if (location)       q.location = { $regex: location, $options: 'i' };
  if (source)         q.source = source;
  if (employmentType) q.employmentType = employmentType;

  if (skills) {
    const arr = Array.isArray(skills) ? skills : [skills];
    if (arr.length) q.skills = { $in: arr.map((s) => s.toLowerCase()) };
  }

  if (salaryMin)      q['salary.min'] = { $gte: Number(salaryMin) };
  if (remote === true || remote === 'true') {
    q.location = { $regex: 'remote', $options: 'i' };
  }

  if (postedWithin) {
    q.postedAt = { $gte: new Date(Date.now() - Number(postedWithin) * 24 * 60 * 60 * 1000) };
  }

  return q;
};

// ─── Search Jobs ──────────────────────────────────────────────────────────────
export const searchJobsService = async (queryParams) => {
  const { sort = 'latest', page, limit, keyword, location } = queryParams;
  const { skip } = paginate(queryParams);

  // Sync from external APIs when a keyword is present.
  // On page 1 (first load) we await so the DB is populated before querying.
  // On subsequent pages the cache is warm so sync returns immediately anyway.
  if (keyword) {
    try {
      await syncJobsFromProviders({ keywords: keyword, location: location || '' });
    } catch (err) {
      logger.warn(`[searchJobs] Provider sync failed: ${err.message}`);
    }
  }

  const query = buildQuery(queryParams);

  const sortObj = sort === 'relevance' && queryParams.keyword
    ? { score: { $meta: 'textScore' }, postedAt: -1 }
    : { postedAt: -1 };

  const projection = sort === 'relevance' && queryParams.keyword
    ? { score: { $meta: 'textScore' } }
    : {};

  const [jobs, total] = await Promise.all([
    Job.find(query, projection).sort(sortObj).skip(skip).limit(Number(limit)).lean(),
    Job.countDocuments(query),
  ]);

  return {
    jobs,
    pagination: paginationMeta(total, Number(page), Number(limit)),
  };
};

// ─── Get Single Job ───────────────────────────────────────────────────────────
export const getJobService = async (jobId) => {
  if (!mongoose.Types.ObjectId.isValid(jobId)) throw new ApiError(400, 'Invalid job ID');
  const job = await Job.findOne({ _id: jobId, isActive: true });
  if (!job) throw new ApiError(404, 'Job not found');
  return job;
};

// ─── Save Job ─────────────────────────────────────────────────────────────────
export const saveJobService = async (userId, jobId) => {
  if (!mongoose.Types.ObjectId.isValid(jobId)) throw new ApiError(400, 'Invalid job ID');
  const job = await Job.findById(jobId);
  if (!job) throw new ApiError(404, 'Job not found');

  // upsert — idempotent save
  const saved = await SavedJob.findOneAndUpdate(
    { userId, jobId },
    { userId, jobId },
    { upsert: true, new: true },
  );
  return saved;
};

// ─── Unsave Job ───────────────────────────────────────────────────────────────
export const unsaveJobService = async (userId, jobId) => {
  await SavedJob.findOneAndDelete({ userId, jobId });
};

// ─── Get Saved Jobs ───────────────────────────────────────────────────────────
export const getSavedJobsService = async (userId, queryParams) => {
  const { skip, page, limit } = paginate(queryParams);

  const [saved, total] = await Promise.all([
    SavedJob.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'jobId', match: { isActive: true } })
      .lean(),
    SavedJob.countDocuments({ userId }),
  ]);

  // Filter out saves where the job was deactivated (populate returns null)
  const jobs = saved
    .filter((s) => s.jobId)
    .map((s) => ({ ...s.jobId, savedAt: s.createdAt, savedJobId: s._id }));

  return { jobs, pagination: paginationMeta(total, page, limit) };
};

// ─── Get saved job IDs for current user (for "is saved" UI state) ────────────
export const getSavedJobIdsService = async (userId) => {
  const saved = await SavedJob.find({ userId }).select('jobId').lean();
  return saved.map((s) => s.jobId.toString());
};
