import mongoose from 'mongoose';
import Application from '../../models/Application.js';
import Job from '../../models/Job.js';

export const getAnalyticsService = async (userId) => {
  const uid = new mongoose.Types.ObjectId(userId);

  const [
    statusBreakdown,
    applicationsOverTime,
    sourceBreakdown,
    responseRate,
  ] = await Promise.all([
    // Applications by status
    Application.aggregate([
      { $match: { userId: uid } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // Applications per week for last 12 weeks
    Application.aggregate([
      {
        $match: {
          userId: uid,
          createdAt: { $gte: new Date(Date.now() - 84 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: '$createdAt' },
            week: { $isoWeek: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
    ]),

    // Applications by job source
    Application.aggregate([
      { $match: { userId: uid } },
      {
        $lookup: {
          from: 'jobs',
          localField: 'jobId',
          foreignField: '_id',
          as: 'job',
        },
      },
      { $unwind: { path: '$job', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$job.source', count: { $sum: 1 } } },
    ]),

    // Response rate: (interviewing + offered) / total
    Application.aggregate([
      { $match: { userId: uid } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          responses: {
            $sum: {
              $cond: [{ $in: ['$status', ['interviewing', 'offered', 'rejected']] }, 1, 0],
            },
          },
          offers: {
            $sum: { $cond: [{ $eq: ['$status', 'offered'] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const rateData = responseRate[0] || { total: 0, responses: 0, offers: 0 };

  return {
    statusBreakdown: statusBreakdown.reduce((acc, { _id, count }) => {
      acc[_id] = count;
      return acc;
    }, {}),
    applicationsOverTime: applicationsOverTime.map(({ _id, count }) => ({
      label: `W${_id.week}`,
      count,
    })),
    sourceBreakdown: sourceBreakdown.map(({ _id, count }) => ({
      source: _id || 'unknown',
      count,
    })),
    metrics: {
      total: rateData.total,
      responseRate: rateData.total > 0
        ? Math.round((rateData.responses / rateData.total) * 100)
        : 0,
      offerRate: rateData.total > 0
        ? Math.round((rateData.offers / rateData.total) * 100)
        : 0,
    },
  };
};
