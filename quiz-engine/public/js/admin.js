// =============================================
// public/js/admin.js - Admin Dashboard Logic
// Handles: Auth check, Stats, Questions CRUD,
//          Users list, Attempts list, Edit modal
// =============================================

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Verify admin session
    try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();

        if (!data.success || data.user.role !== 'admin') {
            showToast('Admin access required.', 'error');
            setTimeout(() => window.location.href = '/login', 1500);
            return;
        }

        document.getElementById('adminName').textContent = data.user.name;
    } catch (e) {
        window.location.href = '/login';
        return;
    }

    // Set date
    document.getElementById('dashDate').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Load initial data
    loadStats();
    loadQuestions();
});

// ============================================
// PANEL NAVIGATION
// ============================================
function switchPanel(name) {
    // Hide all panels
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Show target panel
    document.getElementById(`panel-${name}`).classList.add('active');

    // Highlight nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('onclick') === `switchPanel('${name}')`) {
            item.classList.add('active');
        }
    });

    // Load data for panel
    if (name === 'users') loadUsers();
    if (name === 'attempts') loadAttempts();
    if (name === 'questions') loadQuestions();
}

// ============================================
// LOGOUT
// ============================================
async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
}

// ============================================
// LOAD STATS
// ============================================
async function loadStats() {
    try {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();
        if (data.success) {
            const { totalUsers, totalQuestions, totalAttempts, totalCertificates } = data.stats;
            document.getElementById('statUsers').textContent = totalUsers;
            document.getElementById('statQuestions').textContent = totalQuestions;
            document.getElementById('statAttempts').textContent = totalAttempts;
            document.getElementById('statCerts').textContent = totalCertificates;
        }
    } catch (e) {
        console.error('Stats error:', e);
    }
}

// ============================================
// LOAD QUESTIONS
// ============================================
async function loadQuestions() {
    try {
        const res = await fetch('/api/admin/questions');
        const data = await res.json();

        const tbody = document.getElementById('questionsTbody');
        if (!data.success || data.questions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px;">No questions found.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.questions.map((q, i) => `
      <tr>
        <td style="color:var(--text-muted)">${i + 1}</td>
        <td style="max-width:240px;">${escapeHtml(q.question)}</td>
        <td>${escapeHtml(q.optionA)}</td>
        <td>${escapeHtml(q.optionB)}</td>
        <td>${escapeHtml(q.optionC)}</td>
        <td>${escapeHtml(q.optionD)}</td>
        <td><span class="badge badge-success">${q.correctOption}</span></td>
        <td style="text-align:center; white-space:nowrap;">
          <button class="btn btn-secondary btn-sm" onclick="openEdit(${q.id})" style="margin-right:6px;">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteQuestion(${q.id})">🗑 Delete</button>
        </td>
      </tr>
    `).join('');

        // Store for edit lookup
        window._questions = data.questions;
    } catch (e) {
        console.error('Load questions error:', e);
    }
}

// ============================================
// ADD QUESTION
// ============================================
async function addQuestion(e) {
    e.preventDefault();
    const payload = {
        question: document.getElementById('qQuestion').value.trim(),
        optionA: document.getElementById('qOptA').value.trim(),
        optionB: document.getElementById('qOptB').value.trim(),
        optionC: document.getElementById('qOptC').value.trim(),
        optionD: document.getElementById('qOptD').value.trim(),
        correctOption: document.getElementById('qCorrect').value
    };

    try {
        const res = await fetch('/api/admin/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            showToast('Question added successfully!', 'success');
            e.target.reset();
            loadQuestions();
            loadStats();
        } else {
            showToast(data.message || 'Failed to add question.', 'error');
        }
    } catch (err) {
        showToast('Network error.', 'error');
    }
}

// ============================================
// DELETE QUESTION
// ============================================
async function deleteQuestion(id) {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
        const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' });
        const data = await res.json();

        if (data.success) {
            showToast('Question deleted.', 'success');
            loadQuestions();
            loadStats();
        } else {
            showToast(data.message || 'Failed to delete.', 'error');
        }
    } catch (err) {
        showToast('Network error.', 'error');
    }
}

// ============================================
// EDIT MODAL
// ============================================
function openEdit(id) {
    const q = (window._questions || []).find(x => x.id === id);
    if (!q) return;

    document.getElementById('editId').value = q.id;
    document.getElementById('editQuestion').value = q.question;
    document.getElementById('editA').value = q.optionA;
    document.getElementById('editB').value = q.optionB;
    document.getElementById('editC').value = q.optionC;
    document.getElementById('editD').value = q.optionD;
    document.getElementById('editCorrect').value = q.correctOption;

    document.getElementById('editModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

// Close modal on outside click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('editModal');
    if (e.target === modal) closeModal();
});

async function saveEdit(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const payload = {
        question: document.getElementById('editQuestion').value.trim(),
        optionA: document.getElementById('editA').value.trim(),
        optionB: document.getElementById('editB').value.trim(),
        optionC: document.getElementById('editC').value.trim(),
        optionD: document.getElementById('editD').value.trim(),
        correctOption: document.getElementById('editCorrect').value
    };

    try {
        const res = await fetch(`/api/admin/questions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            showToast('Question updated!', 'success');
            closeModal();
            loadQuestions();
        } else {
            showToast(data.message || 'Update failed.', 'error');
        }
    } catch (err) {
        showToast('Network error.', 'error');
    }
}

// ============================================
// LOAD USERS
// ============================================
async function loadUsers() {
    try {
        const res = await fetch('/api/admin/users');
        const data = await res.json();

        const tbody = document.getElementById('usersTbody');
        if (!data.success || data.users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:32px;">No users found.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.users.map((u, i) => `
      <tr>
        <td style="color:var(--text-muted)">${i + 1}</td>
        <td>${escapeHtml(u.name)}</td>
        <td style="color:var(--text-secondary)">${escapeHtml(u.email)}</td>
        <td><span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-primary'}">${u.role}</span></td>
        <td style="color:var(--text-muted); font-size:0.82rem;">${formatDate(u.created_at)}</td>
      </tr>
    `).join('');
    } catch (e) {
        console.error('Load users error:', e);
    }
}

// ============================================
// LOAD ATTEMPTS
// ============================================
async function loadAttempts() {
    try {
        const res = await fetch('/api/admin/attempts');
        const data = await res.json();

        const tbody = document.getElementById('attemptsTbody');
        if (!data.success || data.attempts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px;">No attempts found.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.attempts.map((a, i) => `
      <tr>
        <td style="color:var(--text-muted)">${i + 1}</td>
        <td>${escapeHtml(a.name)}</td>
        <td style="color:var(--text-secondary); font-size:0.82rem;">${escapeHtml(a.email)}</td>
        <td>${a.score} / ${a.total_questions}</td>
        <td>
          <span class="${parseFloat(a.percentage) >= 60 ? 'badge badge-success' : 'badge badge-danger'}">
            ${parseFloat(a.percentage).toFixed(1)}%
          </span>
        </td>
        <td>
          ${a.certificate_id
                ? `<a href="/api/quiz/certificate/${a.certificate_id}" target="_blank" style="color:#FF7A59; font-size:0.82rem; text-decoration:none;">📜 View PDF</a>`
                : '<span style="color:var(--text-muted); font-size:0.82rem;">—</span>'
            }
        </td>
        <td style="color:var(--text-muted); font-size:0.82rem;">${formatDate(a.date)}</td>
      </tr>
    `).join('');
    } catch (e) {
        console.error('Load attempts error:', e);
    }
}

// ============================================
// HELPER: Escape HTML to prevent XSS
// ============================================
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
