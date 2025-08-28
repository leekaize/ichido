/**
 * Main application entry point for Ichido.
 * Initializes all modules and binds events when the DOM is ready.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- APPLICATION SETUP AND CONFIGURATION ---

    const app = {
        dom: {
            editor: document.getElementById('editor'),
            copyButton: document.getElementById('copyButton'),
            newButton: document.getElementById('newButton'),
            archiveButton: document.getElementById('archiveButton'),
            themeButton: document.getElementById('themeButton'),
            archiveOverlay: document.getElementById('archiveOverlay'),
            archiveContainer: document.getElementById('archiveContainer'),
            hint: document.getElementById('hint'),
        },
        config: {
            ZERO_WIDTH_SPACE: '\u200B',
            ARCHIVE_KEY: 'thoughtArchives',
            THEME_KEY: 'thoughtTheme',
            THEMES: ['auto', 'light', 'dark'],
        },
        state: {
            currentDraftId: null,
            pendingDeletionId: null,
        },
        icons: {
            light: '<i class="ph-bold ph-sun"></i>',
            dark: '<i class="ph-bold ph-moon"></i>',
            auto: '<i class="ph-bold ph-monitor"></i>',
            copy: '<i class="ph-bold ph-copy"></i>',
            delete: '<i class="ph-bold ph-trash"></i>',
        }
    };

    // --- MODULE: State Management (LocalStorage) ---

    const stateManager = {
        getArchives: () => JSON.parse(localStorage.getItem(app.config.ARCHIVE_KEY) || '[]'),
        saveArchives: (archives) => localStorage.setItem(app.config.ARCHIVE_KEY, JSON.stringify(archives)),
        deleteArchive: (id) => {
            let archives = stateManager.getArchives().filter(a => a.id !== id);
            stateManager.saveArchives(archives);
        },
        getTheme: () => localStorage.getItem(app.config.THEME_KEY) || 'auto',
        saveTheme: (theme) => localStorage.setItem(app.config.THEME_KEY, theme),
    };

    // --- MODULE: UI Management ---

    const uiManager = {
        renderArchives: () => {
            app.dom.archiveContainer.innerHTML = '';
            const archives = stateManager.getArchives();
            if (archives.length === 0) {
                app.dom.archiveContainer.innerHTML = '<p>No archives yet.</p>';
            } else {
                archives.forEach(draft => {
                    const item = document.createElement('div');
                    item.className = 'archive-item';
                    
                    const formatDate = (dateString) => {
                        const d = new Date(dateString);
                        const pad = (num) => String(num).padStart(2, '0');
                        const datePart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                        const timePart = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
                        return `${datePart} ${timePart}`;
                    };

                    // Create the readable, indented HTML string
                    const htmlString = `
                        <div class="archive-item-content">
                            <strong>${formatDate(draft.date)}</strong>
                            <p>${draft.content.replace(/\n/g, '<br>')}</p>
                        </div>
                        <div class="archive-actions">
                            <button class="archive-btn copy-btn" data-id="${draft.id}">${app.icons.copy} Copy</button>
                            <button class="archive-btn delete-btn" data-id="${draft.id}">${app.icons.delete} Delete</button>
                        </div>
                    `;

                    /**
                     * --- THE DEFINITIVE FIX ---
                     * This regex removes all newlines and spaces between HTML tags
                     * that were introduced by the template literal's indentation.
                     * It keeps the code readable while ensuring the output is clean.
                     */
                    item.innerHTML = htmlString.replace(/>\s+</g, '><').trim();
                    
                    app.dom.archiveContainer.appendChild(item);
                });
            }
        },
        applyTheme: (theme) => {
            document.body.className = '';
            if (theme === 'light') document.body.classList.add('light-theme');
            else if (theme === 'dark') document.body.classList.add('dark-theme');
            else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) document.body.classList.add('dark-theme');
            app.dom.themeButton.innerHTML = `${app.icons[theme]} <span style="text-transform: capitalize;">${theme}</span>`;
        },
        toggleHint: () => {
            app.dom.hint.style.opacity = editorManager.getText().length === 0 ? '1' : '0';
        },
        showButtonFeedback: (button, message, originalHTML, revertTime = 1500) => {
            button.textContent = message;
            setTimeout(() => { button.innerHTML = originalHTML; }, revertTime);
        },
        revertDeleteButton: () => {
            if (app.state.pendingDeletionId) {
                const button = app.dom.archiveContainer.querySelector(`.delete-btn[data-id="${app.state.pendingDeletionId}"]`);
                if (button) {
                    button.innerHTML = `${app.icons.delete} Delete`;
                    button.classList.remove('confirm-delete');
                }
                app.state.pendingDeletionId = null;
            }
        },
    };

    // --- MODULE: Editor & Draft Actions ---

    const editorManager = {
        getText: () => app.dom.editor.innerText.trim(),
        focus: () => {
            const currentSpan = app.dom.editor.querySelector('.current');
            if (!currentSpan) return;
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(currentSpan);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        },
        clear: () => {
            app.dom.editor.innerHTML = '';
            const span = document.createElement('span');
            span.className = 'current';
            span.textContent = app.config.ZERO_WIDTH_SPACE;
            app.dom.editor.appendChild(span);
            app.state.currentDraftId = null;
            editorManager.focus();
            uiManager.toggleHint();
        },
        autoSaveCurrentDraft: () => {
            const text = editorManager.getText();
            if (text.length === 0) return;
            const archives = stateManager.getArchives();
            const now = new Date();
            const draft = { id: app.state.currentDraftId || now.getTime(), date: now.toISOString(), content: text };
            const existingIndex = archives.findIndex(a => a.id === draft.id);
            if (existingIndex > -1) { archives[existingIndex] = draft; } 
            else { archives.unshift(draft); }
            stateManager.saveArchives(archives);
            app.state.currentDraftId = draft.id;
        },
    };

    // --- MODULE: Event Binding ---

    const eventBinder = {
        init: () => {
            document.body.addEventListener('click', (e) => {
                if (e.target.closest('#pageHeader') || e.target.closest('.button-container') || e.target.closest('#archiveOverlay')) return;
                editorManager.focus();
            });

            app.dom.copyButton.addEventListener('click', () => {
                const textToCopy = editorManager.getText();
                if (textToCopy.length > 0) {
                    const originalHTML = app.dom.copyButton.innerHTML;
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        uiManager.showButtonFeedback(app.dom.copyButton, 'Copied!', originalHTML);
                    }).catch(err => {
                        console.error("Failed to copy text: ", err);
                    });
                }
            });

            app.dom.newButton.addEventListener('click', () => {
                editorManager.autoSaveCurrentDraft();
                editorManager.clear();
            });

            app.dom.archiveButton.addEventListener('click', () => {
                uiManager.renderArchives();
                app.dom.archiveOverlay.style.display = 'flex';
            });

            app.dom.themeButton.addEventListener('click', () => {
                const nextTheme = app.config.THEMES[(app.config.THEMES.indexOf(stateManager.getTheme()) + 1) % app.config.THEMES.length];
                stateManager.saveTheme(nextTheme);
                uiManager.applyTheme(nextTheme);
            });

            app.dom.archiveOverlay.addEventListener('click', (e) => {
                const target = e.target.closest('.archive-btn') || e.target;
                if (!target.classList.contains('delete-btn') || Number(target.dataset.id) !== app.state.pendingDeletionId) {
                    uiManager.revertDeleteButton();
                }
                if (target === app.dom.archiveOverlay) app.dom.archiveOverlay.style.display = 'none';
                if (target.classList.contains('copy-btn')) {
                    const id = Number(target.dataset.id);
                    const draft = stateManager.getArchives().find(a => a.id === id);
                    if (draft) {
                        navigator.clipboard.writeText(draft.content);
                        uiManager.showButtonFeedback(target, 'Copied!', `${app.icons.copy} Copy`);
                    }
                }
                if (target.classList.contains('delete-btn')) {
                    const id = Number(target.dataset.id);
                    if (app.state.pendingDeletionId === id) {
                        stateManager.deleteArchive(id);
                        uiManager.renderArchives();
                        app.state.pendingDeletionId = null;
                    } else {
                        app.state.pendingDeletionId = id;
                        target.textContent = 'Confirm?';
                        target.classList.add('confirm-delete');
                    }
                }
            });

            app.dom.editor.addEventListener('keydown', (e) => {
                const currentSpan = app.dom.editor.querySelector('.current');
                if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter'].includes(e.key)) e.preventDefault();
                if (e.key === ' ' && currentSpan && currentSpan.textContent.length > 1) {
                    e.preventDefault();
                    currentSpan.textContent = currentSpan.textContent.replace(app.config.ZERO_WIDTH_SPACE, '');
                    currentSpan.classList.replace('current', 'previous');
                    app.dom.editor.appendChild(document.createTextNode(' '));
                    const newSpan = document.createElement('span');
                    newSpan.className = 'current'; newSpan.textContent = app.config.ZERO_WIDTH_SPACE;
                    app.dom.editor.appendChild(newSpan);
                    editorManager.focus();
                    editorManager.autoSaveCurrentDraft();
                }
                if (e.key === 'Backspace' && currentSpan?.textContent.length <= 1) e.preventDefault();
                setTimeout(() => { app.dom.editor.scrollTop = app.dom.editor.scrollHeight; }, 0);
            });

            app.dom.editor.addEventListener('input', uiManager.toggleHint);
            app.dom.editor.addEventListener('paste', e => e.preventDefault());
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                if (stateManager.getTheme() === 'auto') uiManager.applyTheme('auto');
            });
        },
    };

    // --- INITIALIZE THE APPLICATION ---
    editorManager.clear();
    eventBinder.init();
    uiManager.applyTheme(stateManager.getTheme());
});