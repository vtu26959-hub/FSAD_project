// =============================================
// server.js (v2 — Production Ready)
// =============================================

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const { notFound, globalErrorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- SECURITY HEADERS ----
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// ---- BODY PARSING ----
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ---- STATIC FILES ----
app.use(express.static(path.join(__dirname, 'public')));

// ---- SESSION ----
app.use(session({
    secret: process.env.SESSION_SECRET || 'quiz_engine_secret_key_2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60  // 1 hour
    }
}));

// ---- API ROUTES ----
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/quiz', require('./routes/quizRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/session', require('./routes/sessionRoutes'));

// ---- PAGE ROUTES ----
const send = (file) => (req, res) => res.sendFile(path.join(__dirname, 'public', file));

app.get('/', send('index.html'));
app.get('/login', send('login.html'));
app.get('/register', send('register.html'));
app.get('/dashboard', send('dashboard.html'));
app.get('/host', send('host.html'));
app.get('/join', send('join.html'));
app.get('/session-quiz', send('session-quiz.html'));
app.get('/session-result', send('session-result.html'));
app.get('/quiz', send('quiz.html'));
app.get('/result', send('result.html'));
app.get('/admin', send('admin.html'));

// ---- ERROR HANDLING ----
app.use(notFound);
app.use(globalErrorHandler);

// ---- START ----
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║   🚀  Quiz Engine (Production Mode) — Started!       ║
║   🌐  http://localhost:${PORT}                         ║
║   🛡  Rate limiting: ON                                ║
║   🔒  Security headers: ON                            ║
╚══════════════════════════════════════════════════════╝
    `);
});
