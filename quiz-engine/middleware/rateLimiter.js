// =============================================
// middleware/rateLimiter.js
// Rate limiting for sensitive endpoints using express-rate-limit.
// Prevents brute-force login, spam joining, and double-submission abuse.
// =============================================

const rateLimit = require('express-rate-limit');

/**
 * loginLimiter
 * Applied to POST /api/auth/login and POST /api/auth/register
 * Max 10 attempts per IP per 15 minutes.
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many attempts from this IP. Please try again after 15 minutes.'
    }
});

/**
 * joinLimiter
 * Applied to POST /api/session/join
 * Max 20 join attempts per IP per 5 minutes.
 */
const joinLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,    // 5 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many join requests. Please wait a few minutes.'
    }
});

/**
 * submitLimiter
 * Applied to POST /api/session/:code/submit
 * Max 5 submit attempts per IP per 60 seconds.
 * Prevents automated submissions.
 */
const submitLimiter = rateLimit({
    windowMs: 60 * 1000,        // 1 minute
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many submission requests. Please wait before trying again.'
    }
});

module.exports = { loginLimiter, joinLimiter, submitLimiter };
