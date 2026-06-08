import ApiError from '../utils/ApiError.js';

/**
 * Role-based authorization. Must come after the `authenticate` middleware.
 * Usage: router.get('/admin', authenticate, authorize('admin'), handler)
 */
const authorize = (...roles) =>
  (req, _res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new ApiError(403, 'Forbidden: insufficient permissions'));
    }
    next();
  };

export { authorize };
export default authorize;
