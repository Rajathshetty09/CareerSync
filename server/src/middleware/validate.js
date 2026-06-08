import ApiError from '../utils/ApiError.js';

/**
 * Express middleware that validates req.body against a Joi schema.
 * Collects all validation errors at once (abortEarly: false).
 */
const validate = (schema) => (req, _res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map((d) => d.message);
    return next(new ApiError(422, 'Validation failed', messages));
  }

  req.body = value; // use the sanitized/coerced value
  next();
};

export { validate };
export default validate;
