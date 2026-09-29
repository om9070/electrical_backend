const rateLimit = require('express-rate-limit');

/**
 * Admin Login Rate Limiter: Max 10 attempts per 10 minutes
 */
const adminLoginRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many admin login attempts. Access blocked for 10 minutes.',
  },
});

/**
 * General Admin API Rate Limiter: Max 60 requests per 30 minutes
 */
const adminGeneralRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests on Admin API. Limit of 60 requests per 30 minutes exceeded.',
  },
});

module.exports = {
  adminLoginRateLimiter,
  adminGeneralRateLimiter,
};
