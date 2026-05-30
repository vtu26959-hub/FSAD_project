// =============================================
// controllers/adminController.js
// Handles Admin CRUD for the Global Question Bank,
// Users, and Quiz Attempts.
// Auth is handled by middleware/auth.js (requireAdmin).
// All question operations are scoped to quiz_id IS NULL
// (global admin questions, not user quiz templates).
// =============================================

const db = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');



// ---- GET ALL QUESTIONS (global bank only: quiz_id IS NULL) ----
const getAllQuestions = async (req, res) => {
    try {
        const [questions] = await db.query('SELECT * FROM questions WHERE quiz_id IS NULL ORDER BY id DESC');
        return res.json({ success: true, questions });
    } catch (err) {
        console.error('Get all questions error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch questions.' });
    }
};

// ---- ADD QUESTION ----
const addQuestion = async (req, res) => {
    try {
        const { question, optionA, optionB, optionC, optionD, correctOption } = req.body;

        if (!question || !optionA || !optionB || !optionC || !optionD || !correctOption) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }
        if (!['A', 'B', 'C', 'D'].includes(correctOption.toUpperCase())) {
            return res.status(400).json({ success: false, message: 'Correct option must be A, B, C, or D.' });
        }

        // quiz_id left NULL → goes into the global admin question bank
        await db.query(
            'INSERT INTO questions (quiz_id, question, optionA, optionB, optionC, optionD, correctOption) VALUES (NULL, ?, ?, ?, ?, ?, ?)',
            [question, optionA, optionB, optionC, optionD, correctOption.toUpperCase()]
        );

        return res.status(201).json({ success: true, message: 'Question added successfully.' });
    } catch (err) {
        console.error('Add question error:', err);
        return res.status(500).json({ success: false, message: 'Failed to add question.' });
    }
};

// ---- UPDATE QUESTION ----
const updateQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { question, optionA, optionB, optionC, optionD, correctOption } = req.body;

        if (!question || !optionA || !optionB || !optionC || !optionD || !correctOption) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        const [result] = await db.query(
            'UPDATE questions SET question=?, optionA=?, optionB=?, optionC=?, optionD=?, correctOption=? WHERE id=? AND quiz_id IS NULL',
            [question, optionA, optionB, optionC, optionD, correctOption.toUpperCase(), id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Question not found.' });
        }

        return res.json({ success: true, message: 'Question updated successfully.' });
    } catch (err) {
        console.error('Update question error:', err);
        return res.status(500).json({ success: false, message: 'Failed to update question.' });
    }
};

// ---- DELETE QUESTION ----
const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM questions WHERE id = ? AND quiz_id IS NULL', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Question not found.' });
        }

        return res.json({ success: true, message: 'Question deleted successfully.' });
    } catch (err) {
        console.error('Delete question error:', err);
        return res.status(500).json({ success: false, message: 'Failed to delete question.' });
    }
};

// ---- GET ALL USERS ----
const getAllUsers = async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
        );
        return res.json({ success: true, users });
    } catch (err) {
        console.error('Get users error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
    }
};

// ---- GET ALL ATTEMPTS ----
const getAllAttempts = async (req, res) => {
    try {
        const [attempts] = await db.query(
            `SELECT qa.id, u.name, u.email, qa.score, qa.total_questions, 
                    qa.percentage, qa.certificate_id, qa.date 
             FROM quiz_attempts qa 
             JOIN users u ON qa.user_id = u.id 
             ORDER BY qa.date DESC`
        );
        return res.json({ success: true, attempts });
    } catch (err) {
        console.error('Get attempts error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch attempts.' });
    }
};

// ---- GET DASHBOARD STATS ----
const getStats = async (req, res) => {
    try {
        const [[{ totalUsers }]] = await db.query('SELECT COUNT(*) as totalUsers FROM users WHERE role = "user"');
        const [[{ totalQuestions }]] = await db.query('SELECT COUNT(*) as totalQuestions FROM questions WHERE quiz_id IS NULL');
        const [[{ totalAttempts }]] = await db.query('SELECT COUNT(*) as totalAttempts FROM session_participants WHERE submitted_at IS NOT NULL');
        const [[{ totalCertificates }]] = await db.query('SELECT COUNT(*) as totalCertificates FROM session_participants WHERE certificate_id IS NOT NULL');

        return res.json({
            success: true,
            stats: { totalUsers, totalQuestions, totalAttempts, totalCertificates }
        });
    } catch (err) {
        console.error('Get stats error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
    }
};

module.exports = { getAllQuestions, addQuestion, updateQuestion, deleteQuestion, getAllUsers, getAllAttempts, getStats };

