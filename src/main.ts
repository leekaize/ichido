/**
 * ichido - A minimalist space for honest reflection
 *
 * Core Philosophy:
 * 1. Forward-only writing enforces presence
 * 2. Belief-neutral language serves everyone
 * 3. Privacy by design (localStorage only)
 * 4. Simplicity as strategy
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Draft {
  id: number;
  date: string;
  content: string;
}

interface AppState {
  currentDraftId: number | null;
  pendingDeletionId: number | null;
  lastText: string;
  guidedMode: boolean;
  currentPrompt: Prompt | null;
}

interface Prompt {
  text: string;
  context: 'morning' | 'evening' | 'anytime';
}

type Theme = 'auto' | 'light' | 'dark';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  ZERO_WIDTH_SPACE: '\u200B',
  ARCHIVE_KEY: 'ichido_archives',
  THEME_KEY: 'ichido_theme',
  GUIDED_MODE_KEY: 'ichido_guided_mode',
  INTRO_SEEN_KEY: 'ichido_intro_seen',
  THEMES: ['auto', 'light', 'dark'] as Theme[],
} as const;

// Phosphor Icons v2.1.0
const ICONS = {
  // sun
  light:
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"></path></svg>',
  // moon
  dark: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z"></path></svg>',
  // monitor
  auto: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M208,40H48A24,24,0,0,0,24,64V176a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V64A24,24,0,0,0,208,40Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V64a8,8,0,0,1,8-8H208a8,8,0,0,1,8,8Zm-48,48a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,224Z"></path></svg>',
  // plus
  new: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path></svg>',
  // archive
  archive:
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M224,48H32A16,16,0,0,0,16,64V88a16,16,0,0,0,16,16v88a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V104a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48ZM208,192H48V104H208ZM224,88H32V64H224V88ZM96,136a8,8,0,0,1,8-8h48a8,8,0,0,1,0,16H104A8,8,0,0,1,96,136Z"></path></svg>',
  // question
  help: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180ZM128,72c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Zm104,56A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"></path></svg>',
  // github-logo
  github:
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M208.31,75.68A59.78,59.78,0,0,0,202.93,28,8,8,0,0,0,196,24a59.75,59.75,0,0,0-48,24H124A59.75,59.75,0,0,0,76,24a8,8,0,0,0-6.93,4,59.78,59.78,0,0,0-5.38,47.68A58.14,58.14,0,0,0,56,104v8a56.06,56.06,0,0,0,48.44,55.47A39.8,39.8,0,0,0,96,192v8H72a24,24,0,0,1-24-24A40,40,0,0,0,8,136a8,8,0,0,0,0,16,24,24,0,0,1,24,24,40,40,0,0,0,40,40H96v16a8,8,0,0,0,16,0V192a24,24,0,0,1,48,0v40a8,8,0,0,0,16,0V192a39.8,39.8,0,0,0-8.44-24.53A56.06,56.06,0,0,0,216,112v-8A58.14,58.14,0,0,0,208.31,75.68ZM200,112a40,40,0,0,1-40,40H112a40,40,0,0,1-40-40v-8a41.74,41.74,0,0,1,6.9-22.48A8,8,0,0,0,80,73.83a43.81,43.81,0,0,1,.79-33.58,43.88,43.88,0,0,1,32.32,20.06A8,8,0,0,0,119.82,64h32.35a8,8,0,0,0,6.74-3.69,43.87,43.87,0,0,1,32.32-20.06A43.81,43.81,0,0,1,192,73.83a8.09,8.09,0,0,0,1,7.65A41.72,41.72,0,0,1,200,104Z"></path></svg>',
  // copy
  copy: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"></path></svg>',
  // trash
  delete:
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path></svg>',
  // sun-horizon
  promptMorning:
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M240,152H199.55a73.54,73.54,0,0,0,.45-8,72,72,0,0,0-144,0,73.54,73.54,0,0,0,.45,8H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM72,144a56,56,0,1,1,111.41,8H72.59A56.13,56.13,0,0,1,72,144Zm144,56a8,8,0,0,1-8,8H48a8,8,0,0,1,0-16H208A8,8,0,0,1,216,200ZM72.84,43.58a8,8,0,0,1,14.32-7.16l8,16a8,8,0,0,1-14.32,7.16Zm-56,48.84a8,8,0,0,1,10.74-3.57l16,8a8,8,0,0,1-7.16,14.31l-16-8A8,8,0,0,1,16.84,92.42Zm192,15.16a8,8,0,0,1,3.58-10.73l16-8a8,8,0,1,1,7.16,14.31l-16,8a8,8,0,0,1-10.74-3.58Zm-48-55.16,8-16a8,8,0,0,1,14.32,7.16l-8,16a8,8,0,1,1-14.32-7.16Z"></path></svg>',
  //
  promptEvening:
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z"></path></svg>',
} as const;

// ============================================================================
// PROMPTS SYSTEM
// ============================================================================

const PROMPTS: Record<string, Prompt[]> = {
  morning: [
    { text: 'What intention guides today?', context: 'morning' },
    { text: 'What are you grateful for?', context: 'morning' },
    { text: 'What needs your attention?', context: 'morning' },
  ],
  evening: [
    { text: 'Where did you show up today?', context: 'evening' },
    { text: 'What surprised you?', context: 'evening' },
    { text: 'What are you releasing?', context: 'evening' },
  ],
  anytime: [
    { text: 'Write to what you hold sacred...', context: 'anytime' },
    { text: 'What matters right now?', context: 'anytime' },
  ],
};

function getRandomPrompt(): Prompt {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'anytime' : 'evening';
  const promptList = PROMPTS[timeOfDay];
  if (!promptList || promptList.length === 0) {
    throw new Error('Prompt system misconfigured');
  }
  const index = Math.floor(Math.random() * promptList.length);
  const prompt = promptList[index];
  if (!prompt) throw new Error('Prompt index out of bounds');
  return prompt;
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

class StateManager {
  getArchives(): Draft[] {
    const data = localStorage.getItem(CONFIG.ARCHIVE_KEY);
    return data ? JSON.parse(data) : [];
  }

  saveArchives(archives: Draft[]): void {
    localStorage.setItem(CONFIG.ARCHIVE_KEY, JSON.stringify(archives));
  }

  deleteArchive(id: number): void {
    const archives = this.getArchives().filter((a) => a.id !== id);
    this.saveArchives(archives);
  }

  getTheme(): Theme {
    const theme = localStorage.getItem(CONFIG.THEME_KEY);
    return (theme as Theme) || 'auto';
  }

  saveTheme(theme: Theme): void {
    localStorage.setItem(CONFIG.THEME_KEY, theme);
  }

  getGuidedMode(): boolean {
    return localStorage.getItem(CONFIG.GUIDED_MODE_KEY) === 'true';
  }

  saveGuidedMode(enabled: boolean): void {
    localStorage.setItem(CONFIG.GUIDED_MODE_KEY, String(enabled));
  }

  hasSeenIntro(): boolean {
    return localStorage.getItem(CONFIG.INTRO_SEEN_KEY) === 'true';
  }

  markIntroSeen(): void {
    localStorage.setItem(CONFIG.INTRO_SEEN_KEY, 'true');
  }
}

// ============================================================================
// DOM REFERENCES
// ============================================================================

const DOM = {
  editor: document.getElementById('editor') as HTMLDivElement,
  copyButton: document.getElementById('copyButton') as HTMLButtonElement,
  newButton: document.getElementById('newButton') as HTMLButtonElement,
  archiveButton: document.getElementById('archiveButton') as HTMLButtonElement,
  helpButton: document.getElementById('helpButton') as HTMLButtonElement,
  themeButton: document.getElementById('themeButton') as HTMLButtonElement,
  guidedModeButton: document.getElementById(
    'guidedModeButton'
  ) as HTMLButtonElement,
  archiveOverlay: document.getElementById('archiveOverlay') as HTMLDivElement,
  helpOverlay: document.getElementById('helpOverlay') as HTMLDivElement,
  introOverlay: document.getElementById('introOverlay') as HTMLDivElement,
  archiveContainer: document.getElementById(
    'archiveContainer'
  ) as HTMLDivElement,
  hint: document.getElementById('hint') as HTMLDivElement,
  promptBar: document.getElementById('promptBar') as HTMLDivElement,
  promptText: document.getElementById('promptText') as HTMLSpanElement,
  dismissPrompt: document.getElementById('dismissPrompt') as HTMLButtonElement,
};

// ============================================================================
// APPLICATION
// ============================================================================

class IchidoApp {
  private state: AppState = {
    currentDraftId: null,
    pendingDeletionId: null,
    lastText: '',
    guidedMode: false,
    currentPrompt: null,
  };

  private stateManager = new StateManager();

  constructor() {
    this.init();
  }

  private init(): void {
    this.injectStaticIcons();
    this.state.guidedMode = this.stateManager.getGuidedMode();
    this.applyTheme(this.stateManager.getTheme());
    this.updateGuidedModeUI();
    this.bindEvents();
    this.clearEditor();

    if (!this.stateManager.hasSeenIntro()) {
      this.showIntro();
    }

    if (this.state.guidedMode) {
      this.showPrompt();
    }
  }

  private injectStaticIcons(): void {
    DOM.helpButton.innerHTML = ICONS.help;

    const githubLink = document.getElementById('githubLink');
    if (githubLink) {
      githubLink.innerHTML = ICONS.github;
    }

    DOM.copyButton.innerHTML = `${ICONS.copy} Copy`;
    DOM.newButton.innerHTML = `${ICONS.new} New`;
    DOM.archiveButton.innerHTML = `${ICONS.archive} Archives`;
  }

  // ========================================================================
  // EDITOR OPERATIONS
  // ========================================================================

  private getText(): string {
    return DOM.editor.innerText.replace(CONFIG.ZERO_WIDTH_SPACE, '');
  }

  private focusEditor(): void {
    const range = document.createRange();
    const selection = window.getSelection();
    if (!selection) return;

    range.selectNodeContents(DOM.editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  private clearEditor(): void {
    DOM.editor.innerHTML = '';
    this.state.currentDraftId = null;
    this.handleInput();
  }

  private autoSaveDraft(): void {
    const text = this.getText();
    if (text.length === 0) return;

    const archives = this.stateManager.getArchives();
    const now = new Date();
    const draft: Draft = {
      id: this.state.currentDraftId || now.getTime(),
      date: now.toISOString(),
      content: text,
    };

    const existingIndex = archives.findIndex((a) => a.id === draft.id);
    if (existingIndex > -1) {
      archives[existingIndex] = draft;
    } else {
      archives.unshift(draft);
    }

    this.stateManager.saveArchives(archives);
    this.state.currentDraftId = draft.id;
  }

  private handleInput(): void {
    const currentText = DOM.editor.innerText;

    if (
      currentText.length > this.state.lastText.length &&
      !/\s$/.test(this.state.lastText) &&
      /\s$/.test(currentText)
    ) {
      this.autoSaveDraft();
    }

    this.state.lastText = currentText;

    const words = currentText.split(/(\s+)/);
    let newHTML = '';
    const filteredWords = words.filter((w) => w.length > 0);

    for (let i = 0; i < filteredWords.length; i++) {
      const word = filteredWords[i];
      if (!word) continue;

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

    if (currentText.length === 0) {
      newHTML += `<span class="current">${CONFIG.ZERO_WIDTH_SPACE}</span>`;
    } else if (/\s$/.test(currentText)) {
      newHTML += `<span class="current"></span>`;
    }

    if (DOM.editor.innerHTML !== newHTML) {
      DOM.editor.innerHTML = newHTML;
    }

    this.focusEditor();
    this.toggleHint();
  }

  // ========================================================================
  // UI OPERATIONS
  // ========================================================================

  private toggleHint(): void {
    DOM.hint.style.opacity = this.getText().length === 0 ? '1' : '0';
  }

  private applyTheme(theme: Theme): void {
    document.body.className = '';
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('dark-theme');
    }

    DOM.themeButton.innerHTML = `${ICONS[theme]} <span style="text-transform: capitalize;">${theme}</span>`;
  }

  private updateGuidedModeUI(): void {
    const icon = this.state.guidedMode ? '●' : '○';
    DOM.guidedModeButton.innerHTML = `${icon} Guided`;
    DOM.guidedModeButton.classList.toggle('active', this.state.guidedMode);
  }

  private showPrompt(): void {
    if (!this.state.guidedMode) return;

    this.state.currentPrompt = getRandomPrompt();
    const icon =
      this.state.currentPrompt.context === 'morning'
        ? ICONS.promptMorning
        : this.state.currentPrompt.context === 'evening'
          ? ICONS.promptEvening
          : '';

    DOM.promptText.innerHTML = `${icon} ${this.state.currentPrompt.text}`;
    DOM.promptBar.classList.add('visible');
  }

  private hidePrompt(): void {
    DOM.promptBar.classList.remove('visible');
    this.state.currentPrompt = null;
  }

  private showIntro(): void {
    DOM.introOverlay.style.display = 'flex';
  }

  private renderArchives(): void {
    DOM.archiveContainer.innerHTML = '';
    const archives = this.stateManager.getArchives();

    if (archives.length === 0) {
      DOM.archiveContainer.innerHTML =
        '<p class="empty-state">No reflections yet. Start writing to create your first one.</p>';
      return;
    }

    archives.forEach((draft) => {
      const item = document.createElement('div');
      item.className = 'archive-item';

      const formatDate = (dateString: string): string => {
        const d = new Date(dateString);
        const pad = (num: number): string => String(num).padStart(2, '0');
        const datePart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const timePart = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
        return `${datePart} ${timePart}`;
      };

      item.innerHTML = `
        <div class="archive-item-content">
          <strong>${formatDate(draft.date)}</strong>
          <p>${draft.content.replace(/\n/g, '<br>')}</p>
        </div>
        <div class="archive-actions">
          <button class="archive-btn copy-btn" data-id="${draft.id}">
            ${ICONS.copy} Copy
          </button>
          <button class="archive-btn delete-btn" data-id="${draft.id}">
            ${ICONS.delete} Delete
          </button>
        </div>
      `;

      DOM.archiveContainer.appendChild(item);
    });
  }

  private showButtonFeedback(
    button: HTMLButtonElement,
    message: string,
    originalHTML: string
  ): void {
    button.textContent = message;
    setTimeout(() => {
      button.innerHTML = originalHTML;
    }, 1500);
  }

  private revertDeleteButton(): void {
    if (this.state.pendingDeletionId) {
      const button = DOM.archiveContainer.querySelector(
        `.delete-btn[data-id="${this.state.pendingDeletionId}"]`
      ) as HTMLButtonElement;

      if (button) {
        button.innerHTML = `${ICONS.delete} Delete`;
        button.classList.remove('confirm-delete');
      }
      this.state.pendingDeletionId = null;
    }
  }

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  private bindEvents(): void {
    document.body.addEventListener('click', (e) => {
      if (
        !e.target ||
        (e.target as HTMLElement).closest('#pageHeader') ||
        (e.target as HTMLElement).closest('.button-container') ||
        (e.target as HTMLElement).closest('.overlay') ||
        (e.target as HTMLElement).closest('#promptBar')
      ) {
        return;
      }
      this.focusEditor();
    });

    DOM.editor.addEventListener('input', () => this.handleInput());
    DOM.editor.addEventListener('paste', (e) => e.preventDefault());
    DOM.editor.addEventListener('keydown', (e) => {
      const blockedKeys = [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
        'Enter',
      ];
      if (blockedKeys.includes(e.key)) {
        e.preventDefault();
      }

      const selection = window.getSelection();
      if (e.key === 'Backspace' && selection?.anchorOffset === 0) {
        const node = selection.anchorNode;
        if (node && node.nodeType === Node.TEXT_NODE) {
          const parent = node.parentNode as HTMLElement;
          if (parent.classList.contains('current')) {
            const previousSibling = parent.previousSibling;
            if (
              previousSibling &&
              previousSibling.nodeType === Node.TEXT_NODE &&
              /\s/.test(previousSibling.textContent || '')
            ) {
              e.preventDefault();
            }
          }
        }
      }
    });

    DOM.copyButton.addEventListener('click', () => {
      const text = this.getText();
      if (text.length > 0) {
        navigator.clipboard.writeText(text).then(() => {
          this.showButtonFeedback(
            DOM.copyButton,
            'Copied!',
            `${ICONS.copy} Copy`
          );
        });
      }
    });

    DOM.newButton.addEventListener('click', () => {
      this.autoSaveDraft();
      this.clearEditor();
      if (this.state.guidedMode) {
        this.showPrompt();
      }
    });

    DOM.archiveButton.addEventListener('click', () => {
      this.renderArchives();
      DOM.archiveOverlay.style.display = 'flex';
    });

    DOM.themeButton.addEventListener('click', () => {
      const themes = CONFIG.THEMES;
      const currentTheme = this.stateManager.getTheme();
      const currentIndex = themes.indexOf(currentTheme);
      const nextIndex = (currentIndex + 1) % themes.length;
      const nextTheme = themes[nextIndex];
      if (!nextTheme) return;

      this.stateManager.saveTheme(nextTheme);
      this.applyTheme(nextTheme);
    });

    DOM.guidedModeButton.addEventListener('click', () => {
      this.state.guidedMode = !this.state.guidedMode;
      this.stateManager.saveGuidedMode(this.state.guidedMode);
      this.updateGuidedModeUI();

      if (this.state.guidedMode) {
        this.showPrompt();
      } else {
        this.hidePrompt();
      }
    });

    DOM.helpButton.addEventListener('click', () => {
      DOM.helpOverlay.style.display = 'flex';
    });

    DOM.dismissPrompt.addEventListener('click', () => {
      this.hidePrompt();
    });

    DOM.helpOverlay.addEventListener('click', (e) => {
      if (e.target === DOM.helpOverlay) {
        DOM.helpOverlay.style.display = 'none';
      }
    });

    DOM.introOverlay.addEventListener('click', (e) => {
      if (
        e.target === DOM.introOverlay ||
        (e.target as HTMLElement).id === 'closeIntro'
      ) {
        DOM.introOverlay.style.display = 'none';
        this.stateManager.markIntroSeen();
      }
    });

    DOM.archiveOverlay.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.archive-btn') as HTMLButtonElement;

      if (
        !button?.classList.contains('delete-btn') ||
        Number(button.dataset.id) !== this.state.pendingDeletionId
      ) {
        this.revertDeleteButton();
      }

      if (target === DOM.archiveOverlay) {
        DOM.archiveOverlay.style.display = 'none';
      }

      if (button?.classList.contains('copy-btn')) {
        const id = Number(button.dataset.id);
        const draft = this.stateManager.getArchives().find((a) => a.id === id);
        if (draft) {
          navigator.clipboard.writeText(draft.content).then(() => {
            this.showButtonFeedback(button, 'Copied!', `${ICONS.copy} Copy`);
          });
        }
      }

      if (button?.classList.contains('delete-btn')) {
        const id = Number(button.dataset.id);
        if (this.state.pendingDeletionId === id) {
          this.stateManager.deleteArchive(id);
          this.renderArchives();
          this.state.pendingDeletionId = null;
        } else {
          this.state.pendingDeletionId = id;
          button.textContent = 'Confirm?';
          button.classList.add('confirm-delete');
        }
      }
    });

    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (this.stateManager.getTheme() === 'auto') {
          this.applyTheme('auto');
        }
      });
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  new IchidoApp();
});
