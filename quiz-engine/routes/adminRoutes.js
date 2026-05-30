// =============================================
// routes/adminRoutes.js (v2)
// Uses requireAuth + requireAdmin from middleware/auth.js
// instead of the inline isAdmin from adminController.
// =============================================

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
    getAllQuestions, addQuestion, updateQuestion, deleteQuestion,
    getAllUsers, getAllAttempts, getStats
} = require('../controllers/adminController');

// All admin routes require a logged-in admin
router.use(requireAuth, requireAdmin);

router.get('/stats', getStats);
router.get('/questions', getAllQuestions);
router.post('/questions', addQuestion);
router.put('/questions/:id', updateQuestion);
router.delete('/questions/:id', deleteQuestion);
router.get('/users', getAllUsers);
router.get('/attempts', getAllAttempts);

module.exports = router;
