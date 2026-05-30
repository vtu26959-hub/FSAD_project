// =============================================
// routes/authRoutes.js (v2)
// loginLimiter applied to /login and /register.
// =============================================

const express = require('express');
const router = express.Router();
const { loginLimiter } = require('../middleware/rateLimiter');
const { register, login, logout, getSession } = require('../controllers/authController');

router.post('/register', loginLimiter, register);   // rate-limited
router.post('/login', loginLimiter, login);       // rate-limited
router.post('/logout', logout);
router.get('/session', getSession);

module.exports = router;
