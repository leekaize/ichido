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
            helpButton: document.getElementById('helpButton'),
            themeButton: document.getElementById('themeButton'),
            archiveOverlay: document.getElementById('archiveOverlay'),
            helpOverlay: document.getElementById('helpOverlay'),
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
            lastText: "", // Tracks text state for reliable mobile input detection
        },
        icons: {
            light: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"></path></svg>',
            dark: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z"></path></svg>',
            auto: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M208,40H48A24,24,0,0,0,24,64V176a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V64A24,24,0,0,0,208,40Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V64a8,8,0,0,1,8-8H208a8,8,0,0,1,8,8Zm-48,48a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,224Z"></path></svg>',
            copy: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"></path></svg>',
            delete: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path></svg>',
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
                    const htmlString = `
                        <div class="archive-item-content">
                            <strong>${formatDate(draft.date)}</strong>
                            <p>${draft.content.replace(/\n/g, '<br>')}</p>
                        </div>
                        <div class="archive-actions">
                            <button class="archive-btn copy-btn" data-id="${draft.id}">${app.icons.copy} Copy</button>
                            <button class="archive-btn delete-btn" data-id="${draft.id}">${app.icons.delete} Delete</button>
                        </div>`;
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
        getText: () => app.dom.editor.innerText.replace(app.config.ZERO_WIDTH_SPACE, ''),
        focus: () => {
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(app.dom.editor);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        },
        clear: () => {
            app.dom.editor.innerHTML = '';
            app.state.currentDraftId = null;
            editorManager.handleInput();
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
        handleInput: () => {
            const currentText = app.dom.editor.innerText;

            if (
                currentText.length > app.state.lastText.length &&
                !/\s$/.test(app.state.lastText) &&
                /\s$/.test(currentText)
            ) {
                editorManager.autoSaveCurrentDraft();
            }

            app.state.lastText = currentText;

            const words = currentText.split(/(\s+)/);
            let newHTML = '';
            const filteredWords = words.filter(w => w.length > 0);

            for (let i = 0; i < filteredWords.length; i++) {
                const word = filteredWords[i];
                const isLastWord = i === filteredWords.length - 1;
                const isWhitespace = /^\s+$/.test(word);

                if (isLastWord && !isWhitespace) {
                    newHTML += `<span class="current">${word}</span>`;
                } else if (!isWhitespace) {
                    newHTML += `<span class="previous">${word}</span>`;
                } else {
                    newHTML += word;
                }
            }

            if (currentText.length === 0 || /\s$/.test(currentText[currentText.length - 1])) {
                newHTML += `<span class="current">${app.config.ZERO_WIDTH_SPACE}</span>`;
            }

            if (app.dom.editor.innerHTML !== newHTML) {
                app.dom.editor.innerHTML = newHTML;
            }

            editorManager.focus();
            uiManager.toggleHint();
        }
    };

    // --- MODULE: Event Binding ---

    const eventBinder = {
        init: () => {
            document.body.addEventListener('click', e => {
                if (!e.target.closest('#pageHeader') && !e.target.closest('.button-container') && !e.target.closest('.overlay')) {
                    editorManager.focus();
                }
            });

            app.dom.editor.addEventListener('input', editorManager.handleInput);

            app.dom.editor.addEventListener('keydown', e => {
                if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter'].includes(e.key)) {
                    e.preventDefault();
                }

                const selection = window.getSelection();
                if (e.key === 'Backspace' && selection.anchorOffset === 0) {
                    const node = selection.anchorNode;
                    if (node && node.nodeType === Node.TEXT_NODE && node.parentNode.classList.contains('current')) {
                        const previousSibling = node.parentNode.previousSibling;
                        if (previousSibling && previousSibling.nodeType === Node.TEXT_NODE && /\s/.test(previousSibling.textContent)) {
                            e.preventDefault();
                        }
                    }
                }
            });

            app.dom.copyButton.addEventListener('click', () => {
                const textToCopy = editorManager.getText();
                if (textToCopy.length > 0) {
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        uiManager.showButtonFeedback(app.dom.copyButton, 'Copied!', `${app.icons.copy} Copy`);
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

            app.dom.helpButton.addEventListener('click', () => {
                app.dom.helpOverlay.style.display = 'flex';
            });

            app.dom.helpOverlay.addEventListener('click', e => {
                if (e.target === app.dom.helpOverlay) {
                    app.dom.helpOverlay.style.display = 'none';
                }
            });

            app.dom.archiveOverlay.addEventListener('click', e => {
                const target = e.target.closest('.archive-btn') || e.target;
                if (!target.classList.contains('delete-btn') || Number(target.dataset.id) !== app.state.pendingDeletionId) {
                    uiManager.revertDeleteButton();
                }
                if (target === app.dom.archiveOverlay) {
                    app.dom.archiveOverlay.style.display = 'none';
                }
                if (target.classList.contains('copy-btn')) {
                    const id = Number(target.dataset.id);
                    const draft = stateManager.getArchives().find(a => a.id === id);
                    if (draft) {
                        navigator.clipboard.writeText(draft.content).then(() => {
                            uiManager.showButtonFeedback(target, 'Copied!', `${app.icons.copy} Copy`);
                        });
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

            app.dom.editor.addEventListener('paste', e => e.preventDefault());

            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                if (stateManager.getTheme() === 'auto') {
                    uiManager.applyTheme('auto');
                }
            });
        },
    };

    // --- INITIALIZE THE APPLICATION ---
    eventBinder.init();
    editorManager.clear();
    uiManager.applyTheme(stateManager.getTheme());
});