// =============================================
// controllers/quizController.js
// Handles Questions, Submission, Results, PDF
// =============================================

const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { generateCertificate } = require('../utils/pdfGenerator');

// ---- GET ALL QUESTIONS (shuffled, for the quiz) ----
const getQuestions = async (req, res) => {
    try {
        // Only send question and options — NOT the correct answer
        const [questions] = await db.query(
            'SELECT id, question, optionA, optionB, optionC, optionD FROM questions ORDER BY RAND()'
        );
        return res.json({ success: true, questions });
    } catch (err) {
        console.error('Get questions error:', err);
        return res.status(500).json({ success: false, message: 'Failed to load questions.' });
    }
};

// ---- SUBMIT QUIZ ----
const submitQuiz = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Please login first.' });
        }

        const { answers } = req.body; // { questionId: selectedOption, ... }
        const userId = req.session.user.id;
        const userName = req.session.user.name;

        if (!answers || typeof answers !== 'object') {
            return res.status(400).json({ success: false, message: 'Invalid answers format.' });
        }

        // Fetch correct answers for all submitted question IDs
        const questionIds = Object.keys(answers).map(Number);
        if (questionIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No answers submitted.' });
        }

        const placeholders = questionIds.map(() => '?').join(',');
        const [questions] = await db.query(
            `SELECT id, correctOption FROM questions WHERE id IN (${placeholders})`,
            questionIds
        );

        // Calculate score
        let correct = 0;
        questions.forEach((q) => {
            if (answers[q.id] === q.correctOption) correct++;
        });

        const total = questions.length;
        const percentage = ((correct / total) * 100).toFixed(2);

        // Generate certificate ID only if score >= 60%
        let certificateId = null;
        if (parseFloat(percentage) >= 60) {
            certificateId = uuidv4();
        }

        // Save attempt to DB
        await db.query(
            'INSERT INTO quiz_attempts (user_id, score, total_questions, percentage, certificate_id) VALUES (?, ?, ?, ?, ?)',
            [userId, correct, total, percentage, certificateId]
        );

        return res.json({
            success: true,
            score: correct,
            total,
            percentage,
            passed: parseFloat(percentage) >= 60,
            certificateId,
            userName
        });
    } catch (err) {
        console.error('Submit quiz error:', err);
        return res.status(500).json({ success: false, message: 'Failed to submit quiz.' });
    }
};

// ---- DOWNLOAD CERTIFICATE ----
const downloadCertificate = async (req, res) => {
    try {
        const { certificateId } = req.params;

        // Fetch attempt with user name
        const [rows] = await db.query(
            `SELECT qa.*, u.name as userName 
             FROM quiz_attempts qa 
             JOIN users u ON qa.user_id = u.id 
             WHERE qa.certificate_id = ?`,
            [certificateId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Certificate not found.' });
        }

        const attempt = rows[0];
        generateCertificate(res, {
            userName: attempt.userName,
            score: attempt.score,
            total: attempt.total_questions,
            percentage: attempt.percentage,
            certificateId: attempt.certificate_id,
            date: attempt.date
        });
    } catch (err) {
        console.error('Download certificate error:', err);
        return res.status(500).json({ success: false, message: 'Failed to generate certificate.' });
    }
};

// ---- GET USER RESULTS HISTORY ----
const getUserResults = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Please login first.' });
        }
        const userId = req.session.user.id;
        const [rows] = await db.query(
            'SELECT * FROM quiz_attempts WHERE user_id = ? ORDER BY date DESC',
            [userId]
        );
        return res.json({ success: true, results: rows });
    } catch (err) {
        console.error('Get results error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch results.' });
    }
};

module.exports = { getQuestions, submitQuiz, downloadCertificate, getUserResults };
