// =============================================
// middleware/errorHandler.js
// Centralized error handling utilities.
// =============================================

/**
 * asyncHandler
 * Wraps an async Express route handler and forwards any thrown
 * error to Express's next() — eliminating try/catch boilerplate.
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * notFound
 * 404 middleware — catches any route that was not matched.
 */
const notFound = (req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
};

/**
 * globalErrorHandler
 * Final Express error-handling middleware (4 arguments).
 * Logs errors with timestamp and returns a clean JSON response.
 * In development, includes the stack trace.
 */
const globalErrorHandler = (err, req, res, next) => {
    const timestamp = new Date().toISOString();
    const status = err.status || err.statusCode || 500;

    console.error(`[${timestamp}] ${req.method} ${req.originalUrl} ${status} — ${err.message}`);
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    }

    res.status(status).json({
        success: false,
        message: err.message || 'Internal server error.',
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

module.exports = { asyncHandler, notFound, globalErrorHandler };
