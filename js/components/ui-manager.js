/**
 * ui-manager.js
 * Manages UI interactions: Light/Dark theme toggling, pop-up toast feedback,
 * and loading indicator states.
 */
export class UIManager {
    constructor() {
        this.themeBtn = document.getElementById('theme-toggle-btn');
        this.toastContainer = document.getElementById('toast-container');
        this.initTheme();
    }

    initTheme() {
        const savedTheme = localStorage.getItem('comtrade_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);

        if (this.themeBtn) {
            this.themeBtn.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-theme');
                const next = current === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('comtrade_theme', next);
                this.updateThemeIcon(next);
                window.dispatchEvent(new Event('resize'));
            });
        }
    }

    updateThemeIcon(theme) {
        if (this.themeBtn) {
            this.themeBtn.textContent = theme === 'light' ? '🌙' : '☀️';
            this.themeBtn.setAttribute('title', theme === 'light' ? 'Activate Dark Mode' : 'Activate Light Mode');
        }
    }

    showToast(message, type = 'success') {
        if (!this.toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button style="background:none;border:none;color:inherit;cursor:pointer;font-weight:700;">✕</button>
        `;

        toast.querySelector('button').addEventListener('click', () => toast.remove());
        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 5000);
    }

    updateDBStatus(status, count = 0) {
        const dot = document.getElementById('db-status-dot');
        const text = document.getElementById('db-status-text');
        const countText = document.getElementById('db-record-count');

        if (!dot || !text) return;

        if (status === 'online') {
            dot.className = 'status-indicator online';
            text.textContent = 'IndexedDB Active (Ready)';
            countText.textContent = `${count.toLocaleString('en-US')} indexed records`;
        } else if (status === 'processing') {
            dot.className = 'status-indicator processing';
            text.textContent = 'Processing Dataset...';
            countText.textContent = 'Inspecting headers and inserting records';
        } else {
            dot.className = 'status-indicator';
            text.textContent = 'Database Offline';
            countText.textContent = 'Upload a .xlsx/.csv dataset';
        }
    }
}
