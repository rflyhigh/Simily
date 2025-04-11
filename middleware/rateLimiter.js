// FILE: /middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Create different rate limiters for different routes
const createLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Auth rate limiters
const loginLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 requests per window
  'Too many login attempts, please try again after 15 minutes'
);

const registerLimiter = createLimiter(
  60 * 60 * 1000, // 1 hour
  3, // 3 accounts per hour
  'Too many accounts created from this IP, please try again after an hour'
);

// API rate limiters
const apiLimiter = createLimiter(
  60 * 1000, // 1 minute
  30, // 30 requests per minute
  'Too many requests, please try again after a minute'
);

// Comment rate limiter
const commentLimiter = createLimiter(
  60 * 1000, // 1 minute
  5, // 5 comments per minute
  'You are commenting too quickly, please slow down'
);

// Vote rate limiter
const voteLimiter = createLimiter(
  60 * 1000, // 1 minute
  10, // 10 votes per minute
  'You are voting too quickly, please slow down'
);

// Report rate limiter
const reportLimiter = createLimiter(
  60 * 60 * 1000, // 1 hour
  5, // 5 reports per hour
  'You have submitted too many reports, please try again later'
);

module.exports = {
  loginLimiter,
  registerLimiter,
  apiLimiter,
  commentLimiter,
  voteLimiter,
  reportLimiter
};