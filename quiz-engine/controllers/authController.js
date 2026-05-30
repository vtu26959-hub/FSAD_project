// =============================================
// controllers/authController.js (v2)
// Wrapped with asyncHandler. No logic changes.
// =============================================

const db = require('../config/db');
const bcrypt = require('bcrypt');
const { asyncHandler } = require('../middleware/errorHandler');

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await db.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, "user")',
        [name.trim(), email.toLowerCase().trim(), hashed]
    );

    return res.status(201).json({ success: true, message: 'Registered successfully! Please login.' });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    };

    return res.json({
        success: true,
        message: 'Login successful!',
        role: user.role,
        name: user.name
    });
});

// POST /api/auth/logout
const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ success: false, message: 'Logout failed.' });
        res.clearCookie('connect.sid');
        return res.json({ success: true, message: 'Logged out successfully.' });
    });
};

// GET /api/auth/session
const getSession = (req, res) => {
    if (req.session?.user) {
        return res.json({ success: true, user: req.session.user });
    }
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
};

module.exports = { register, login, logout, getSession };
