/**
 * Eliminates try/catch boilerplate in every async controller.
 * Any thrown error is forwarded to Express's global error handler.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
