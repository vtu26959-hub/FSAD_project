// =============================================
// public/js/session-quiz.js
// Quiz logic for a multi-session quiz
// Reads join code from URL: ?code=XXXXXX
// Uses /api/session/:code/* endpoints
// =============================================

// ---- STATE ----
let questions = [];
let answers = {};          // { questionId: selectedOption }
let currentIndex = 0;
let submitted = false;
let sessionCode = null;
let sessionInfo = null;

// ---- TIMER (10 minutes) ----
const QUIZ_DURATION = 10 * 60;
let secondsLeft = QUIZ_DURATION;
let timerInterval = null;

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Get join code from URL
    const params = new URLSearchParams(window.location.search);
    sessionCode = params.get('code');

    if (!sessionCode) {
        showToast('No join code found. Redirecting...', 'error');
        setTimeout(() => window.location.href = '/join', 1500);
        return;
    }

    // Verify auth
    try {
        const authRes = await fetch('/api/auth/session');
        const authData = await authRes.json();
        if (!authData.success) {
            window.location.href = '/login';
            return;
        }
    } catch (e) {
        window.location.href = '/login';
        return;
    }

    await loadSession();
});

// ============================================
// LOAD SESSION
// ============================================
async function loadSession() {
    try {
        const res = await fetch(`/api/session/${sessionCode}`);
        const data = await res.json();

        if (!data.success) {
            document.getElementById('loadingState').innerHTML = `
              <p style="color:#f87171; margin-bottom:16px;">${data.message || 'Failed to load session.'}</p>
              <a href="/dashboard" class="btn btn-secondary">← Dashboard</a>
            `;
            return;
        }

        if (data.session.status !== 'active') {
            document.getElementById('loadingState').innerHTML = `
              <p style="color:#f87171; margin-bottom:16px;">This session has ended.</p>
              <a href="/dashboard" class="btn btn-secondary">← Dashboard</a>
            `;
            return;
        }

        sessionInfo = data.session;
        questions = data.questions;

        // Update badge info
        document.getElementById('sessionBadge').textContent =
            `Session: ${sessionCode} • ${sessionInfo.quizTitle} • Hosted by ${sessionInfo.hostName}`;
        document.getElementById('quizTitleNav').textContent = sessionInfo.quizTitle;

        if (questions.length === 0) {
            document.getElementById('loadingState').innerHTML = `
              <p style="color:var(--text-secondary);">No questions in this quiz yet.</p>
              <a href="/dashboard" class="btn btn-secondary" style="margin-top:16px;">← Dashboard</a>
            `;
            return;
        }

        // Show quiz UI
        document.getElementById('loadingState').style.display = 'none';
        const container = document.getElementById('quizContainer');
        container.style.display = 'flex';

        document.getElementById('totalQ').textContent = questions.length;

        renderDots();
        renderQuestion(0);
        startTimer();

    } catch (err) {
        console.error(err);
        showToast('Failed to load session.', 'error');
    }
}

// ============================================
// RENDER NAVIGATION DOTS
// ============================================
function renderDots() {
    const dotsEl = document.getElementById('questionDots');
    dotsEl.innerHTML = '';
    questions.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = 'q-dot' + (i === 0 ? ' active' : '');
        dot.id = `dot-${i}`;
        dot.onclick = () => goTo(i);
        dot.title = `Question ${i + 1}`;
        dotsEl.appendChild(dot);
    });
}

// ============================================
// RENDER QUESTION
// ============================================
function renderQuestion(index) {
    const q = questions[index];
    currentIndex = index;

    document.getElementById('currentQ').textContent = index + 1;
    document.getElementById('qNumLabel').textContent = `QUESTION ${index + 1}`;
    document.getElementById('questionText').textContent = q.question;

    // Update dots
    document.querySelectorAll('.q-dot').forEach((d, i) => {
        d.classList.remove('active');
        if (i === index) d.classList.add('active');
        if (answers[questions[i].id]) d.classList.add('answered');
        else d.classList.remove('answered');
    });

    // Progress
    const answered = Object.keys(answers).length;
    const pct = Math.round((answered / questions.length) * 100);
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressPct').textContent = pct + '%';
    document.getElementById('answeredCount').textContent = `${answered} answered`;

    // Render options
    const optionsGrid = document.getElementById('optionsGrid');
    optionsGrid.innerHTML = '';
    const opts = [
        { key: 'A', text: q.optionA },
        { key: 'B', text: q.optionB },
        { key: 'C', text: q.optionC },
        { key: 'D', text: q.optionD }
    ];

    opts.forEach(opt => {
        const label = document.createElement('label');
        label.className = 'option-label' + (answers[q.id] === opt.key ? ' selected' : '');
        label.innerHTML = `
            <input type="radio" name="q${q.id}" value="${opt.key}" ${answers[q.id] === opt.key ? 'checked' : ''}/>
            <div style="display:flex; align-items:center; gap:12px; width:100%;">
                <div class="option-radio"></div>
                <span class="opt-key">${opt.key}</span>
                <span>${opt.text}</span>
            </div>
        `;
        label.addEventListener('click', () => selectOption(q.id, opt.key, label));
        optionsGrid.appendChild(label);
    });

    // Prev / Next / Submit buttons
    document.getElementById('prevBtn').disabled = index === 0;
    const isLast = index === questions.length - 1;
    document.getElementById('nextBtn').style.display = isLast ? 'none' : 'inline-flex';
    document.getElementById('submitBtn').style.display = isLast ? 'inline-flex' : 'none';

    // Animate card
    const card = document.getElementById('questionCard');
    card.style.animation = 'none';
    card.offsetHeight;
    card.style.animation = 'fadeIn 0.3s ease';
}

// ============================================
// SELECT OPTION
// ============================================
function selectOption(questionId, optionKey, clickedLabel) {
    answers[questionId] = optionKey;
    document.querySelectorAll('.option-label').forEach(l => l.classList.remove('selected'));
    clickedLabel.classList.add('selected');

    const dotEl = document.getElementById(`dot-${currentIndex}`);
    if (dotEl) dotEl.classList.add('answered');

    const answered = Object.keys(answers).length;
    const pct = Math.round((answered / questions.length) * 100);
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressPct').textContent = pct + '%';
    document.getElementById('answeredCount').textContent = `${answered} answered`;
}

// ============================================
// NAVIGATION
// ============================================
function navigate(direction) {
    const next = currentIndex + direction;
    if (next >= 0 && next < questions.length) renderQuestion(next);
}

function goTo(index) { renderQuestion(index); }

function confirmLeave() {
    if (confirm('Leave the quiz? Your progress will be lost.')) {
        window.location.href = '/dashboard';
    }
}

// ============================================
// TIMER
// ============================================
function startTimer() {
    timerInterval = setInterval(() => {
        secondsLeft--;
        updateTimerDisplay();
        if (secondsLeft <= 0) {
            clearInterval(timerInterval);
            showToast('⏰ Time is up! Auto-submitting...', 'warning');
            setTimeout(() => submitQuiz(true), 1500);
        }
    }, 1000);
}

function updateTimerDisplay() {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    document.getElementById('timerDisplay').textContent =
        `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const pct = (secondsLeft / QUIZ_DURATION) * 100;
    const bar = document.getElementById('timerBar');
    bar.style.width = pct + '%';

    if (secondsLeft <= 60) {
        bar.style.background = 'linear-gradient(90deg, #ef4444, #f97316)';
        document.getElementById('timerDisplay').style.color = '#fca5a5';
    } else if (secondsLeft <= 180) {
        bar.style.background = 'linear-gradient(90deg, #f59e0b, #eab308)';
    }
}

// ============================================
// SUBMIT QUIZ
// ============================================
async function submitQuiz(autoSubmit = false) {
    if (submitted) return;

    const unanswered = questions.length - Object.keys(answers).length;
    if (unanswered > 0 && !autoSubmit) {
        const proceed = confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`);
        if (!proceed) return;
    }

    submitted = true;
    clearInterval(timerInterval);
    showSpinner();

    try {
        const res = await fetch(`/api/session/${sessionCode}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers })
        });

        const data = await res.json();
        hideSpinner();

        if (data.success) {
            // Add session context to result data
            data.quizTitle = sessionInfo?.quizTitle || '';
            data.joinCode = sessionCode;

            sessionStorage.setItem('sessionResult', JSON.stringify(data));
            window.location.href = '/session-result';
        } else {
            showToast(data.message || 'Submission failed.', 'error');
            submitted = false;
        }
    } catch (err) {
        hideSpinner();
        showToast('Network error. Please try again.', 'error');
        submitted = false;
    }
}
