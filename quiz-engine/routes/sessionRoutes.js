// =============================================
// routes/sessionRoutes.js (v2)
// requireAuth applied globally via router.use().
// Rate limiters applied per-route.
// Leaderboard route added.
// Named routes stay BEFORE /:code wildcard.
// =============================================

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { joinLimiter, submitLimiter } = require('../middleware/rateLimiter');
const {
    createQuiz, addQuestion, deleteQuestion,
    getMyQuizzes, getQuizQuestions,
    hostQuiz, getMyHostedSessions,
    getParticipants, endSession,
    joinQuiz, getSessionByCode,
    submitSession, getLeaderboard,
    downloadSessionCert
} = require('../controllers/sessionController');

// All session routes require authentication
router.use(requireAuth);

// =============================================
// NAMED ROUTES — must be BEFORE /:code wildcard
// =============================================
router.post('/create-quiz', createQuiz);
router.post('/add-question', addQuestion);
router.delete('/question/:id', deleteQuestion);
router.get('/my-quizzes', getMyQuizzes);
router.get('/my-sessions', getMyHostedSessions);
router.get('/quiz/:id/questions', getQuizQuestions);
router.post('/host', hostQuiz);
router.post('/join', joinLimiter, joinQuiz);          // rate-limited
router.get('/certificate/:certId', downloadSessionCert);

// =============================================
// WILDCARD /:code routes — must be LAST
// =============================================
router.get('/:code', getSessionByCode);
router.get('/:code/participants', getParticipants);
router.get('/:code/leaderboard', getLeaderboard);                 // NEW
router.post('/:code/submit', submitLimiter, submitSession);   // rate-limited
router.post('/:code/end', endSession);

module.exports = router;
