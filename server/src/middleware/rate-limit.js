const rateLimit = require('express-rate-limit');

let rateLimitingEnabled = process.env.NODE_ENV !== 'test';

function setRateLimitingEnabled(value) {
  rateLimitingEnabled = value;
}

function rateLimitJsonResponse(req, res) {
  return res.status(429).json({
    error: 'RATE_LIMITED',
    message: 'Too many attempts. Please try again later.',
  });
}

function buildLimiter(options) {
  const limiter = rateLimit({
    ...options,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: rateLimitJsonResponse,
  });
  return (req, res, next) => {
    if (!rateLimitingEnabled) return next();
    return limiter(req, res, next);
  };
}

const authLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 15,
  message: 'Too many attempts. Please try again later.',
});

const registerLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 8,
  message: 'Too many accounts created from this address. Please try again later.',
});

module.exports = { authLimiter, registerLimiter, setRateLimitingEnabled };
