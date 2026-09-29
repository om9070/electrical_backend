const rateLimit = require('express-rate-limit');

/**
 * Role API Rate Limiter: Max 60 requests per 30 minutes
 */
const roleGeneralRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests on Role API. Limit of 60 requests per 30 minutes exceeded.',
  },
});

module.exports = {
  roleGeneralRateLimiter,
};
