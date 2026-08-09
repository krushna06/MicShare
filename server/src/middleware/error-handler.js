const { HttpError } = require('../http-error');
const logger = require('../logger');

function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    logger.warn(`Request failed on ${req.method} ${req.originalUrl}`, {
      code: err.code,
      message: err.message,
    });
    return res.status(err.status).json({
      error: err.code,
      message: err.message,
    });
  }

  const isProduction = process.env.NODE_ENV === 'production';
  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, {
    error: err.message,
    stack: isProduction ? undefined : err.stack,
  });

  return res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: isProduction ? 'Internal server error' : err.message,
  });
}

module.exports = { errorHandler };
