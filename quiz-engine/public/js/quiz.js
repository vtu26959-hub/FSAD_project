// =============================================
// public/js/quiz.js - Quiz Page Logic
// Handles: Auth check, Load questions, Timer, Submit
// =============================================

// ---- STATE ----
let questions = [];
let answers = {};          // { questionId: selectedOption }
let currentIndex = 0;
let submitted = false;

// ---- TIMER CONFIG ----
const QUIZ_DURATION = 10 * 60; // 10 minutes in seconds
let secondsLeft = QUIZ_DURATION;
let timerInterval = null;

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Verify session
    try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (!data.success) {
            showToast('Please login to take the quiz.', 'warning');
            setTimeout(() => window.location.href = '/login', 1500);
            return;
        }
        document.getElementById('userNameNav').textContent = data.user.name;
        await loadQuestions();
    } catch (e) {
        showToast('Connection error.', 'error');
    }
});

// ============================================
// LOAD QUESTIONS
// ============================================
async function loadQuestions() {
    try {
        const res = await fetch('/api/quiz/questions');
        const data = await res.json();

        if (!data.success) {
            showToast(data.message || 'Failed to load questions.', 'error');
            return;
        }

        questions = data.questions;

        if (questions.length === 0) {
            document.getElementById('loadingState').innerHTML = `
        <p style="color:var(--text-secondary)">No questions available. Please check back later.</p>
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
        showToast('Failed to load quiz. Please refresh.', 'error');
        console.error(err);
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

    // Update header
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

    // Progress bar
    const answered = Object.keys(answers).length;
    const pct = Math.round((answered / questions.length) * 100);
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressPct').textContent = pct + '%';
    document.getElementById('answeredCount').textContent = `${answered} answered`;

    // Options
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
      <div class="option-content" style="display:flex; align-items:center; gap:12px; width:100%;">
        <div class="option-radio"></div>
        <span class="opt-key">${opt.key}</span>
        <span>${opt.text}</span>
      </div>
    `;
        label.addEventListener('click', () => selectOption(q.id, opt.key, label));
        optionsGrid.appendChild(label);
    });

    // Prev / Next buttons
    document.getElementById('prevBtn').disabled = index === 0;

    const isLast = index === questions.length - 1;
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    nextBtn.style.display = isLast ? 'none' : 'inline-flex';
    submitBtn.style.display = isLast ? 'inline-flex' : 'none';

    // Question card animation
    const card = document.getElementById('questionCard');
    card.style.animation = 'none';
    card.offsetHeight; // reflow
    card.style.animation = 'fadeIn 0.3s ease';
}

// ============================================
// SELECT OPTION
// ============================================
function selectOption(questionId, optionKey, clickedLabel) {
    answers[questionId] = optionKey;

    // Update UI styling
    const allLabels = document.querySelectorAll('.option-label');
    allLabels.forEach(l => l.classList.remove('selected'));
    clickedLabel.classList.add('selected');

    // Update dot
    const dotEl = document.getElementById(`dot-${currentIndex}`);
    if (dotEl) dotEl.classList.add('answered');

    // Update progress
    const answered = Object.keys(answers).length;
    const pct = Math.round((answered / questions.length) * 100);
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressPct').textContent = pct + '%';
    document.getElementById('answeredCount').textContent = `${answered} answered`;
}

// ============================================
// NAVIGATE
// ============================================
function navigate(direction) {
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < questions.length) {
        renderQuestion(newIndex);
    }
}

function goTo(index) {
    renderQuestion(index);
}

function confirmLogout() {
    if (confirm('Are you sure you want to leave the quiz? Your progress will be lost.')) {
        fetch('/api/auth/logout', { method: 'POST' }).then(() => {
            window.location.href = '/';
        });
    }
}

// ============================================
// TIMER
// ============================================
function startTimer() {
    const totalSeconds = QUIZ_DURATION;
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
    const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    document.getElementById('timerDisplay').textContent = display;

    // Timer bar
    const pct = (secondsLeft / QUIZ_DURATION) * 100;
    const bar = document.getElementById('timerBar');
    bar.style.width = pct + '%';

    // Color warning
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
        const res = await fetch('/api/quiz/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers })
        });

        const data = await res.json();
        hideSpinner();

        if (data.success) {
            // Store result in sessionStorage for result page
            sessionStorage.setItem('quizResult', JSON.stringify(data));
            window.location.href = '/result';
        } else {
            showToast(data.message || 'Submission failed.', 'error');
            submitted = false;
        }
    } catch (err) {
        hideSpinner();
        showToast('Network error. Please try again.', 'error');
        submitted = false;
        console.error(err);
    }
}
