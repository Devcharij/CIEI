/**
 * ui-manager.js
 * Gerencia a interatividade geral da UI: alternador de tema (Light/Dark),
 * sistema de notificações de feedback (Toasts) e controle de loaders.
 */
export class UIManager {
    constructor() {
        this.themeBtn = document.getElementById('theme-toggle-btn');
        this.toastContainer = document.getElementById('toast-container');
        this.initTheme();
    }

    /**
     * Inicializa o modo claro ou noturno verificando preferências salvas no localStorage.
     */
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
                
                // Dispara recarregamento suave para adaptar cores da Google Charts / Chart.js
                window.dispatchEvent(new Event('resize'));
            });
        }
    }

    updateThemeIcon(theme) {
        if (this.themeBtn) {
            this.themeBtn.textContent = theme === 'light' ? '🌙' : '☀️';
            this.themeBtn.setAttribute('title', theme === 'light' ? 'Ativar Modo Noturno' : 'Ativar Modo Claro');
        }
    }

    /**
     * Exibe notificação flutuante de feedback ao usuário.
     * @param {String} message - Texto descritivo.
     * @param {String} type - 'success', 'warning' ou 'error'.
     */
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

        // Remove automaticamente após 5 segundos
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 5000);
    }

    /**
     * Controla visualização do indicador de status da base de dados no menu lateral.
     */
    updateDBStatus(status, count = 0) {
        const dot = document.getElementById('db-status-dot');
        const text = document.getElementById('db-status-text');
        const countText = document.getElementById('db-record-count');

        if (!dot || !text) return;

        if (status === 'online') {
            dot.className = 'status-indicator online';
            text.textContent = 'IndexedDB Ativo (Pronto)';
            countText.textContent = `${count.toLocaleString('pt-BR')} registros indexados`;
        } else if (status === 'processing') {
            dot.className = 'status-indicator processing';
            text.textContent = 'Processando Planilha...';
            countText.textContent = 'Inspecionando assinaturas e inserindo dados';
        } else {
            dot.className = 'status-indicator';
            text.textContent = 'Banco de Dados Offline';
            countText.textContent = 'Carregue um arquivo .xlsx/.csv';
        }
    }
}