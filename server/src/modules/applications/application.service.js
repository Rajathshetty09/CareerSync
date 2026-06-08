import mongoose from 'mongoose';
import Application from '../../models/Application.js';
import Job from '../../models/Job.js';
import { APPLICATION_STATUS } from '../../constants/index.js';
import ApiError from '../../utils/ApiError.js';
import { paginate, paginationMeta } from '../../utils/pagination.js';

export const getApplicationsService = async (userId, queryParams) => {
  const { page, limit, skip } = paginate(queryParams);
  const { status, sort = 'newest' } = queryParams;

  const filter = { userId };
  if (status && status !== 'all') filter.status = status;

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    updated: { updatedAt: -1 },
  };

  const [applications, total] = await Promise.all([
    Application.find(filter)
      .populate('jobId', 'title company location source employmentType skills applyUrl')
      .populate('resumeId', 'fileName fileUrl')
      .sort(sortMap[sort] || sortMap.newest)
      .skip(skip)
      .limit(limit)
      .lean(),
    Application.countDocuments(filter),
  ]);

  // Normalise 'Unknown' company — treat it as missing so the UI shows the fallback
  for (const app of applications) {
    if (app.jobId?.company === 'Unknown') app.jobId.company = null;
  }

  return { applications, pagination: paginationMeta(total, page, limit) };
};

export const getApplicationByIdService = async (applicationId, userId) => {
  const application = await Application.findOne({ _id: applicationId, userId })
    .populate('jobId')
    .populate('resumeId', 'fileName fileUrl');

  if (!application) throw new ApiError(404, 'Application not found');
  return application;
};

export const createApplicationService = async (userId, data) => {
  const job = await Job.findById(data.jobId);
  if (!job) throw new ApiError(404, 'Job not found');

  const existing = await Application.findOne({ userId, jobId: data.jobId });
  if (existing) throw new ApiError(409, 'You have already tracked this application');

  const appliedAt = data.status === APPLICATION_STATUS.APPLIED ? new Date() : null;

  const application = await Application.create({
    userId,
    jobId: data.jobId,
    resumeId: data.resumeId || null,
    status: data.status,
    coverLetter: data.coverLetter,
    notes: data.notes,
    source: 'manual',
    appliedAt,
  });

  return application.populate([
    { path: 'jobId', select: 'title company location source' },
    { path: 'resumeId', select: 'fileName fileUrl' },
  ]);
};

export const updateApplicationService = async (applicationId, userId, data) => {
  const application = await Application.findOne({ _id: applicationId, userId });
  if (!application) throw new ApiError(404, 'Application not found');

  // Set appliedAt when transitioning INTO applied status for the first time
  if (
    data.status === APPLICATION_STATUS.APPLIED &&
    application.status !== APPLICATION_STATUS.APPLIED &&
    !application.appliedAt
  ) {
    data.appliedAt = new Date();
  }

  Object.assign(application, data);
  await application.save();

  return application.populate([
    { path: 'jobId', select: 'title company location source' },
    { path: 'resumeId', select: 'fileName fileUrl' },
  ]);
};

export const deleteApplicationService = async (applicationId, userId) => {
  const result = await Application.findOneAndDelete({ _id: applicationId, userId });
  if (!result) throw new ApiError(404, 'Application not found');
};

export const getApplicationStatsService = async (userId) => {
  const pipeline = [
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ];

  const raw = await Application.aggregate(pipeline);
  const total = await Application.countDocuments({ userId });

  const stats = {
    total,
    pending: 0,
    applied: 0,
    interviewing: 0,
    offered: 0,
    rejected: 0,
    withdrawn: 0,
  };

  for (const { _id, count } of raw) {
    if (_id in stats) stats[_id] = count;
  }

  return stats;
};
