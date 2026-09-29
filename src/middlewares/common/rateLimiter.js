const rateLimit = require('express-rate-limit');

/**
 * Global API Rate Limiter
 * Restricts general API calls to prevent DDoS and high-frequency request spam.
 * Default: 300 requests per 15-minute window per IP.
 */
const apiRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 300, // Limit each IP to 300 requests per window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

/**
 * Authentication / Login Rate Limiter
 * Restricts login attempts to prevent brute-force attacks.
 * Default: 15 requests per 15-minute window per IP.
 */
const authRateLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 15, // Limit each IP to 15 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

/**
 * Strict Rate Limiter for Sensitive Write/Mutation Operations
 * Default: 60 requests per 15-minute window per IP.
 */
const sensitiveRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.SENSITIVE_RATE_LIMIT_MAX, 10) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many sensitive operations submitted from this IP. Please slow down.',
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

module.exports = {
  apiRateLimiter,
  authRateLimiter,
  sensitiveRateLimiter,
};
