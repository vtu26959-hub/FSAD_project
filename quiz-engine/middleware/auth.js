// =============================================
// middleware/auth.js
// Centralized authentication & role middleware.
// Replaces inline requireUser() / isAdmin() helpers
// that were scattered across every controller.
// =============================================

/**
 * requireAuth
 * Rejects requests where the user is not logged in.
 * Attach to any route that needs an authenticated user.
 */
const requireAuth = (req, res, next) => {
    if (!req.session?.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required. Please login.'
        });
    }
    next();
};

/**
 * requireAdmin
 * Rejects requests where the logged-in user is not an admin.
 * Always chain after requireAuth (or use both on the router).
 */
const requireAdmin = (req, res, next) => {
    if (!req.session?.user || req.session.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required.'
        });
    }
    next();
};

module.exports = { requireAuth, requireAdmin };
