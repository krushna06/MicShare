function validate(schema, part = 'body') {
  return function validateRequest(req, res, next) {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    req[part] = result.data;
    return next();
  };
}

module.exports = { validate };
