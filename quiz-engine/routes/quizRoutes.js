// =============================================
// routes/quizRoutes.js - Quiz Routes
// =============================================

const express = require('express');
const router = express.Router();
const { getQuestions, submitQuiz, downloadCertificate, getUserResults } = require('../controllers/quizController');

// Middleware: require login
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Please login to continue.' });
    }
    next();
};

// GET /api/quiz/questions - Fetch quiz questions
router.get('/questions', requireAuth, getQuestions);

// POST /api/quiz/submit - Submit quiz answers
router.post('/submit', requireAuth, submitQuiz);

// GET /api/quiz/certificate/:certificateId - Download certificate PDF
router.get('/certificate/:certificateId', downloadCertificate);

// GET /api/quiz/results - Get user's result history
router.get('/results', requireAuth, getUserResults);

module.exports = router;
