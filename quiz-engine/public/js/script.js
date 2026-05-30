// =============================================
// public/js/script.js - Shared Utility Functions
// Used by all pages
// =============================================

/**
 * Show a sliding toast notification
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {number} duration ms
 */
function showToast(message, type = 'info', duration = 3500) {
    // Remove old toast if present
    const old = document.getElementById('globalToast');
    if (old) old.remove();

    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

    const toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = `toast ${type}`;
    toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span>${message}</span>
  `;
    document.body.appendChild(toast);

    // Trigger slide-in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('show'));
    });

    // Auto-remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

/**
 * Show a full-page loading spinner overlay
 */
function showSpinner() {
    if (document.getElementById('globalSpinner')) return;
    const overlay = document.createElement('div');
    overlay.id = 'globalSpinner';
    overlay.className = 'spinner-overlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(overlay);
}

/**
 * Remove the loading spinner overlay
 */
function hideSpinner() {
    const el = document.getElementById('globalSpinner');
    if (el) el.remove();
}

/**
 * Format date string to locale
 * @param {string|Date} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}
