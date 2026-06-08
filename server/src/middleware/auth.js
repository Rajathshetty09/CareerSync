import { verifyAccessToken } from '../utils/token.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Access token required');
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);

  // Normalize to { id, role } — controllers never touch raw JWT claims
  req.user = { id: decoded.sub, role: decoded.role };
  next();
});

export { authenticate };
export default authenticate;
