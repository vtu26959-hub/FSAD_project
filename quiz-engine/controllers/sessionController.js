// =============================================
// controllers/sessionController.js (v2 — Production Ready)
// Multi-session quiz hosting system.
//
// Key improvements over v1:
//  - asyncHandler removes all try/catch boilerplate
//  - requireAuth injected by route middleware, not inline
//  - submitSession uses a MySQL TRANSACTION (START/COMMIT/ROLLBACK)
//  - Answers validated: non-empty, A/B/C/D only, belong to correct quiz
//  - Duplicate submission checked inside the transaction
//  - getLeaderboard added (host sees all, participant sees own rank)
// =============================================

const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { generateCertificate } = require('../utils/pdfGenerator');
const { asyncHandler } = require('../middleware/errorHandler');

// =============================================
// HELPERS
// =============================================

const VALID_OPTIONS = new Set(['A', 'B', 'C', 'D']);

function generateJoinCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // avoids 0/O/1/I confusion
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// =============================================
// QUIZ TEMPLATE MANAGEMENT
// =============================================

// POST /api/session/create-quiz
const createQuiz = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    if (!title?.trim()) {
        return res.status(400).json({ success: false, message: 'Quiz title is required.' });
    }

    const [result] = await db.query(
        'INSERT INTO quizzes (title, description, created_by) VALUES (?, ?, ?)',
        [title.trim(), (description || '').trim(), req.session.user.id]
    );

    return res.status(201).json({
        success: true,
        message: 'Quiz template created.',
        quizId: result.insertId,
        title: title.trim()
    });
});

// POST /api/session/add-question
const addQuestion = asyncHandler(async (req, res) => {
    const { quizId, question, optionA, optionB, optionC, optionD, correctOption } = req.body;

    if (!quizId || !question || !optionA || !optionB || !optionC || !optionD || !correctOption) {
        return res.status(400).json({ success: false, message: 'All question fields are required.' });
    }
    const opt = (correctOption || '').toUpperCase();
    if (!VALID_OPTIONS.has(opt)) {
        return res.status(400).json({ success: false, message: 'Correct option must be A, B, C, or D.' });
    }

    // Verify ownership
    const [quizRows] = await db.query(
        'SELECT id FROM quizzes WHERE id = ? AND created_by = ?',
        [quizId, req.session.user.id]
    );
    if (quizRows.length === 0) {
        return res.status(403).json({ success: false, message: 'Quiz not found or not yours.' });
    }

    const [result] = await db.query(
        'INSERT INTO questions (quiz_id, question, optionA, optionB, optionC, optionD, correctOption) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [quizId, question.trim(), optionA.trim(), optionB.trim(), optionC.trim(), optionD.trim(), opt]
    );

    return res.status(201).json({ success: true, message: 'Question added.', questionId: result.insertId });
});

// DELETE /api/session/question/:id
const deleteQuestion = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [rows] = await db.query(
        `SELECT q.id FROM questions q
         JOIN quizzes qz ON q.quiz_id = qz.id
         WHERE q.id = ? AND qz.created_by = ?`,
        [id, req.session.user.id]
    );
    if (rows.length === 0) {
        return res.status(403).json({ success: false, message: 'Question not found or not yours.' });
    }
    await db.query('DELETE FROM questions WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Question deleted.' });
});

// GET /api/session/my-quizzes
const getMyQuizzes = asyncHandler(async (req, res) => {
    const [quizzes] = await db.query(
        `SELECT qz.id, qz.title, qz.description, qz.created_at,
                COUNT(q.id) AS questionCount
         FROM quizzes qz
         LEFT JOIN questions q ON q.quiz_id = qz.id
         WHERE qz.created_by = ?
         GROUP BY qz.id
         ORDER BY qz.created_at DESC`,
        [req.session.user.id]
    );
    return res.json({ success: true, quizzes });
});

// GET /api/session/quiz/:id/questions
const getQuizQuestions = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [rows] = await db.query(
        `SELECT q.id, q.question, q.optionA, q.optionB, q.optionC, q.optionD, q.correctOption
         FROM questions q
         JOIN quizzes qz ON q.quiz_id = qz.id
         WHERE q.quiz_id = ? AND qz.created_by = ?`,
        [id, req.session.user.id]
    );
    return res.json({ success: true, questions: rows });
});

// =============================================
// SESSION HOSTING
// =============================================

// POST /api/session/host
const hostQuiz = asyncHandler(async (req, res) => {
    const { quizId } = req.body;
    if (!quizId) {
        return res.status(400).json({ success: false, message: 'Quiz ID is required.' });
    }

    // Verify ownership
    const [quizRows] = await db.query(
        'SELECT id, title FROM quizzes WHERE id = ? AND created_by = ?',
        [quizId, req.session.user.id]
    );
    if (quizRows.length === 0) {
        return res.status(403).json({ success: false, message: 'Quiz not found or not yours.' });
    }

    // Must have at least one question
    const [[{ cnt }]] = await db.query(
        'SELECT COUNT(*) AS cnt FROM questions WHERE quiz_id = ?',
        [quizId]
    );
    if (cnt === 0) {
        return res.status(400).json({ success: false, message: 'Add at least one question before hosting.' });
    }

    // Generate collision-free join code
    let joinCode;
    for (let attempt = 0; attempt < 10; attempt++) {
        joinCode = generateJoinCode();
        const [[{ taken }]] = await db.query(
            'SELECT COUNT(*) AS taken FROM quiz_sessions WHERE join_code = ? AND status = "active"',
            [joinCode]
        );
        if (taken === 0) break;
    }

    const [result] = await db.query(
        'INSERT INTO quiz_sessions (quiz_id, host_id, join_code, status) VALUES (?, ?, ?, "active")',
        [quizId, req.session.user.id, joinCode]
    );

    return res.status(201).json({
        success: true,
        message: 'Session created.',
        sessionId: result.insertId,
        joinCode,
        quizTitle: quizRows[0].title
    });
});

// GET /api/session/my-sessions
const getMyHostedSessions = asyncHandler(async (req, res) => {
    const [sessions] = await db.query(
        `SELECT qs.id, qs.join_code, qs.status, qs.created_at, qs.ended_at,
                qz.title AS quizTitle,
                COUNT(sp.id) AS participantCount
         FROM quiz_sessions qs
         JOIN quizzes qz ON qs.quiz_id = qz.id
         LEFT JOIN session_participants sp ON sp.session_id = qs.id
         WHERE qs.host_id = ?
         GROUP BY qs.id
         ORDER BY qs.created_at DESC`,
        [req.session.user.id]
    );
    return res.json({ success: true, sessions });
});

// GET /api/session/:code/participants  (host only)
const getParticipants = asyncHandler(async (req, res) => {
    const { code } = req.params;
    const [sessionRows] = await db.query(
        'SELECT * FROM quiz_sessions WHERE join_code = ? AND host_id = ?',
        [code.toUpperCase(), req.session.user.id]
    );
    if (sessionRows.length === 0) {
        return res.status(403).json({ success: false, message: 'Session not found or you are not the host.' });
    }
    const [participants] = await db.query(
        `SELECT sp.id, sp.score, sp.total_questions, sp.percentage, sp.certificate_id,
                sp.joined_at, sp.submitted_at,
                u.name, u.email
         FROM session_participants sp
         JOIN users u ON sp.user_id = u.id
         WHERE sp.session_id = ?
         ORDER BY sp.joined_at ASC`,
        [sessionRows[0].id]
    );
    return res.json({ success: true, participants, session: sessionRows[0] });
});

// POST /api/session/:code/end  (host only)
const endSession = asyncHandler(async (req, res) => {
    const { code } = req.params;
    const [result] = await db.query(
        'UPDATE quiz_sessions SET status = "completed", ended_at = NOW() WHERE join_code = ? AND host_id = ? AND status = "active"',
        [code.toUpperCase(), req.session.user.id]
    );
    if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Session not found or already ended.' });
    }
    return res.json({ success: true, message: 'Session ended.' });
});

// =============================================
// JOINING & TAKING A SESSION
// =============================================

// POST /api/session/join
const joinQuiz = asyncHandler(async (req, res) => {
    const { joinCode } = req.body;
    if (!joinCode || String(joinCode).trim().length !== 6) {
        return res.status(400).json({ success: false, message: 'Enter a valid 6-character join code.' });
    }
    const code = String(joinCode).trim().toUpperCase();

    // Find session with quiz title
    const [sessionRows] = await db.query(
        `SELECT qs.id, qs.quiz_id, qs.host_id, qs.status, qz.title AS quizTitle
         FROM quiz_sessions qs
         JOIN quizzes qz ON qs.quiz_id = qz.id
         WHERE qs.join_code = ?`,
        [code]
    );
    if (sessionRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Invalid code. No active session found.' });
    }

    const session = sessionRows[0];

    if (session.status !== 'active') {
        return res.status(400).json({ success: false, message: 'This session has ended and is no longer accepting participants.' });
    }
    if (session.host_id === req.session.user.id) {
        return res.status(400).json({ success: false, message: 'You cannot join your own quiz session.' });
    }

    // Check for existing participation
    const [existing] = await db.query(
        'SELECT id, submitted_at FROM session_participants WHERE session_id = ? AND user_id = ?',
        [session.id, req.session.user.id]
    );
    if (existing.length > 0 && existing[0].submitted_at !== null) {
        return res.status(409).json({ success: false, message: 'You have already completed this session.' });
    }
    // Already joined but not submitted — allow re-entry
    if (existing.length === 0) {
        await db.query(
            'INSERT INTO session_participants (session_id, user_id) VALUES (?, ?)',
            [session.id, req.session.user.id]
        );
    }

    return res.json({
        success: true,
        message: 'Joined session.',
        sessionId: session.id,
        joinCode: code,
        quizTitle: session.quizTitle
    });
});

// GET /api/session/:code
const getSessionByCode = asyncHandler(async (req, res) => {
    const code = req.params.code.toUpperCase();

    const [sessionRows] = await db.query(
        `SELECT qs.id, qs.quiz_id, qs.host_id, qs.join_code, qs.status,
                qz.title AS quizTitle, u.name AS hostName
         FROM quiz_sessions qs
         JOIN quizzes qz ON qs.quiz_id = qz.id
         JOIN users u ON qs.host_id = u.id
         WHERE qs.join_code = ?`,
        [code]
    );
    if (sessionRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    const session = sessionRows[0];

    // Must be host or registered participant
    if (session.host_id !== req.session.user.id) {
        const [participant] = await db.query(
            'SELECT id FROM session_participants WHERE session_id = ? AND user_id = ?',
            [session.id, req.session.user.id]
        );
        if (participant.length === 0) {
            return res.status(403).json({ success: false, message: 'You have not joined this session.' });
        }
    }

    // Return questions without correct answers (security)
    const [questions] = await db.query(
        'SELECT id, question, optionA, optionB, optionC, optionD FROM questions WHERE quiz_id = ? ORDER BY RAND()',
        [session.quiz_id]
    );

    return res.json({
        success: true,
        session: {
            id: session.id,
            joinCode: session.join_code,
            status: session.status,
            quizTitle: session.quizTitle,
            hostName: session.hostName
        },
        questions
    });
});

// =============================================
// SUBMIT — uses TRANSACTION for atomicity
// =============================================

// POST /api/session/:code/submit
const submitSession = asyncHandler(async (req, res) => {
    const code = req.params.code.toUpperCase();
    const { answers } = req.body;

    // ---- 1. Validate answers payload ----
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
        return res.status(400).json({ success: false, message: 'Answers must be a non-null object.' });
    }
    const answersEntries = Object.entries(answers);
    if (answersEntries.length === 0) {
        return res.status(400).json({ success: false, message: 'You must answer at least one question before submitting.' });
    }

    // Validate every selected option is A/B/C/D
    for (const [qId, opt] of answersEntries) {
        if (!VALID_OPTIONS.has(String(opt).toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: `Invalid option "${opt}" for question ${qId}. Must be A, B, C, or D.`
            });
        }
        if (isNaN(Number(qId)) || Number(qId) <= 0) {
            return res.status(400).json({ success: false, message: `Invalid question ID: ${qId}` });
        }
    }

    // ---- 2. Acquire a connection for the transaction ----
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // -- 2a. Lock and verify session is still ACTIVE --
        const [sessionRows] = await conn.query(
            'SELECT id, quiz_id, host_id, status FROM quiz_sessions WHERE join_code = ? FOR UPDATE',
            [code]
        );
        if (sessionRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Session not found.' });
        }
        const session = sessionRows[0];
        if (session.status !== 'active') {
            await conn.rollback();
            return res.status(400).json({ success: false, message: 'This session has ended. Submissions are closed.' });
        }

        // -- 2b. Lock participant row and verify not already submitted --
        const [participantRows] = await conn.query(
            'SELECT id, submitted_at FROM session_participants WHERE session_id = ? AND user_id = ? FOR UPDATE',
            [session.id, req.session.user.id]
        );
        if (participantRows.length === 0) {
            await conn.rollback();
            return res.status(403).json({ success: false, message: 'You are not a registered participant in this session.' });
        }
        if (participantRows[0].submitted_at !== null) {
            await conn.rollback();
            return res.status(409).json({ success: false, message: 'You have already submitted this session.' });
        }

        // -- 2c. Fetch correct answers, verifying questions belong to this quiz --
        const questionIds = answersEntries.map(([id]) => Number(id));
        const placeholders = questionIds.map(() => '?').join(',');
        const [dbQuestions] = await conn.query(
            `SELECT id, correctOption FROM questions WHERE id IN (${placeholders}) AND quiz_id = ?`,
            [...questionIds, session.quiz_id]
        );

        // Detect any submitted question IDs that don't belong to this quiz
        if (dbQuestions.length !== questionIds.length) {
            const validIds = new Set(dbQuestions.map(q => q.id));
            const bad = questionIds.filter(id => !validIds.has(id));
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: `Question ID(s) ${bad.join(', ')} do not belong to this quiz.`
            });
        }

        // -- 2d. Calculate score --
        let correct = 0;
        for (const q of dbQuestions) {
            if (String(answers[q.id]).toUpperCase() === q.correctOption) correct++;
        }
        const total = dbQuestions.length;
        const percentage = total > 0 ? ((correct / total) * 100).toFixed(2) : '0.00';
        const passed = parseFloat(percentage) >= 60;
        const certId = passed ? uuidv4() : null;

        // -- 2e. Persist result --
        await conn.query(
            `UPDATE session_participants
             SET score = ?, total_questions = ?, percentage = ?,
                 certificate_id = ?, submitted_at = NOW()
             WHERE session_id = ? AND user_id = ?`,
            [correct, total, percentage, certId, session.id, req.session.user.id]
        );

        await conn.commit();

        return res.json({
            success: true,
            score: correct,
            total,
            percentage,
            passed,
            certificateId: certId,
            userName: req.session.user.name
        });

    } catch (err) {
        await conn.rollback();
        throw err; // asyncHandler forwards to globalErrorHandler
    } finally {
        conn.release();
    }
});

// =============================================
// LEADERBOARD
// =============================================

// GET /api/session/:code/leaderboard
const getLeaderboard = asyncHandler(async (req, res) => {
    const code = req.params.code.toUpperCase();

    // Find session
    const [sessionRows] = await db.query(
        `SELECT qs.id, qs.host_id, qs.status, qz.title AS quizTitle
         FROM quiz_sessions qs
         JOIN quizzes qz ON qs.quiz_id = qz.id
         WHERE qs.join_code = ?`,
        [code]
    );
    if (sessionRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Session not found.' });
    }
    const session = sessionRows[0];
    const isHost = session.host_id === req.session.user.id;
    const userId = req.session.user.id;

    // Fetch ranked participants (submitted only)
    const [ranked] = await db.query(
        `SELECT u.name, sp.score, sp.total_questions, sp.percentage, sp.submitted_at,
                @rank := @rank + 1 AS rank
         FROM session_participants sp
         JOIN users u ON sp.user_id = u.id
         CROSS JOIN (SELECT @rank := 0) r
         WHERE sp.session_id = ? AND sp.submitted_at IS NOT NULL
         ORDER BY sp.score DESC`,
        [session.id]
    );

    if (isHost) {
        // Host sees everyone
        return res.json({
            success: true,
            quizTitle: session.quizTitle,
            status: session.status,
            leaderboard: ranked
        });
    }

    // Participant: verify they belong to this session, return own rank only
    const [participant] = await db.query(
        'SELECT id FROM session_participants WHERE session_id = ? AND user_id = ?',
        [session.id, userId]
    );
    if (participant.length === 0) {
        return res.status(403).json({ success: false, message: 'You are not part of this session.' });
    }

    const myEntry = ranked.find((_, i) => {
        // Re-query to find own row
        return false; // default false, handled below
    });

    // Find own rank by re-querying with user join
    const [myRow] = await db.query(
        `SELECT sp.score, sp.total_questions, sp.percentage,
                (SELECT COUNT(*) + 1
                 FROM session_participants sp2
                 WHERE sp2.session_id = ? AND sp2.submitted_at IS NOT NULL AND sp2.score > sp.score
                ) AS rank,
                (SELECT COUNT(*) FROM session_participants WHERE session_id = ? AND submitted_at IS NOT NULL) AS totalSubmitted
         FROM session_participants sp
         WHERE sp.session_id = ? AND sp.user_id = ?`,
        [session.id, session.id, session.id, userId]
    );

    return res.json({
        success: true,
        quizTitle: session.quizTitle,
        status: session.status,
        myResult: myRow[0] || null
    });
});

// =============================================
// CERTIFICATE
// =============================================

// GET /api/session/certificate/:certId
const downloadSessionCert = asyncHandler(async (req, res) => {
    const { certId } = req.params;
    const [rows] = await db.query(
        `SELECT sp.score, sp.total_questions, sp.percentage, sp.certificate_id,
                sp.submitted_at, u.name AS userName
         FROM session_participants sp
         JOIN users u ON sp.user_id = u.id
         WHERE sp.certificate_id = ?`,
        [certId]
    );
    if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }
    const r = rows[0];
    generateCertificate(res, {
        userName: r.userName,
        score: r.score,
        total: r.total_questions,
        percentage: r.percentage,
        certificateId: r.certificate_id,
        date: r.submitted_at || new Date()
    });
});

module.exports = {
    createQuiz,
    addQuestion,
    deleteQuestion,
    getMyQuizzes,
    getQuizQuestions,
    hostQuiz,
    getMyHostedSessions,
    getParticipants,
    endSession,
    joinQuiz,
    getSessionByCode,
    submitSession,
    getLeaderboard,
    downloadSessionCert
};
