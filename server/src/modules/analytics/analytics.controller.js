import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import { getAnalyticsService } from './analytics.service.js';

export const getAnalytics = asyncHandler(async (req, res) => {
  const data = await getAnalyticsService(req.user.id);
  res.json(new ApiResponse(200, data, 'Analytics retrieved'));
});
