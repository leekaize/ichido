/**
 * Application orchestration
 */

import { ICONS } from './icons';
import { CONFIG } from './config';
import type { DOMElements, Prompt } from './types';
import { StateManager } from './modules/state';
import { EditorManager } from './modules/editor';
import { UIManager } from './modules/ui';
import { getRandomPrompt } from './modules/prompts';

export class IchidoApp {
  private dom: DOMElements;
  private stateManager: StateManager;
  private editorManager: EditorManager;
  private uiManager: UIManager;
  private guidedMode = false;
  private currentPrompt: Prompt | null = null;

  constructor(dom: DOMElements) {
    this.dom = dom;
    this.stateManager = new StateManager();
    this.editorManager = new EditorManager(dom, this.stateManager);
    this.uiManager = new UIManager(dom, this.stateManager);
  }

  init(): void {
    this.injectStaticIcons();
    this.guidedMode = this.stateManager.getGuidedMode();
    this.uiManager.applyTheme(this.stateManager.getTheme());
    this.uiManager.updateGuidedModeUI(this.guidedMode);
    this.bindEvents();
    this.editorManager.clearEditor();

    if (!this.stateManager.hasSeenIntro()) {
      this.uiManager.showIntro();
    }

    if (this.guidedMode) {
      this.showPrompt();
    }
  }

  private injectStaticIcons(): void {
    this.dom.helpButton.innerHTML = ICONS.help;

    const githubLink = document.getElementById('githubLink');
    if (githubLink) {
      githubLink.innerHTML = ICONS.github;
    }

    this.dom.copyButton.innerHTML = `${ICONS.copy} Copy`;
    this.dom.newButton.innerHTML = `${ICONS.new} New`;
    this.dom.archiveButton.innerHTML = `${ICONS.archive} Archives`;
  }

  private showPrompt(): void {
    if (!this.guidedMode) return;
    this.currentPrompt = getRandomPrompt();
    this.uiManager.showPrompt(this.currentPrompt);
  }

  private bindEvents(): void {
    this.dom.editor.addEventListener('input', () => {
      this.editorManager.handleInput();
    });

    this.dom.editor.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain') || '';
      document.execCommand('insertText', false, text);
    });

    this.dom.editor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.execCommand('insertLineBreak');
      }
    });

    this.dom.copyButton.addEventListener('click', () => {
      const text = this.editorManager.getText();
      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          this.uiManager.showButtonFeedback(
            this.dom.copyButton,
            'Copied!',
            `${ICONS.copy} Copy`
          );
        });
      }
    });

    this.dom.newButton.addEventListener('click', () => {
      this.editorManager.autoSaveDraft();
      this.editorManager.clearEditor();
      if (this.guidedMode) {
        this.showPrompt();
      }
    });

    this.dom.archiveButton.addEventListener('click', () => {
      this.uiManager.renderArchives();
      this.dom.archiveOverlay.style.display = 'flex';
    });

    this.dom.themeButton.addEventListener('click', () => {
      const themes = CONFIG.THEMES;
      const currentTheme = this.stateManager.getTheme();
      const currentIndex = themes.indexOf(currentTheme);
      const nextIndex = (currentIndex + 1) % themes.length;
      const nextTheme = themes[nextIndex];
      if (!nextTheme) return;

      this.stateManager.saveTheme(nextTheme);
      this.uiManager.applyTheme(nextTheme);
    });

    this.dom.guidedModeButton.addEventListener('click', () => {
      this.guidedMode = !this.guidedMode;
      this.stateManager.saveGuidedMode(this.guidedMode);
      this.uiManager.updateGuidedModeUI(this.guidedMode);

      if (this.guidedMode) {
        this.showPrompt();
      } else {
        this.uiManager.hidePrompt();
      }
    });

    this.dom.helpButton.addEventListener('click', () => {
      this.dom.helpOverlay.style.display = 'flex';
    });

    this.dom.dismissPrompt.addEventListener('click', () => {
      this.uiManager.hidePrompt();
    });

    this.dom.helpOverlay.addEventListener('click', (e) => {
      if (e.target === this.dom.helpOverlay) {
        this.dom.helpOverlay.style.display = 'none';
      }
    });

    this.dom.introOverlay.addEventListener('click', (e) => {
      if (
        e.target === this.dom.introOverlay ||
        (e.target as HTMLElement).id === 'closeIntro'
      ) {
        this.dom.introOverlay.style.display = 'none';
        this.stateManager.markIntroSeen();
      }
    });

    this.dom.archiveOverlay.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      this.uiManager.handleArchiveClick(
        target,
        (id) => {
          const draft = this.stateManager
            .getArchives()
            .find((a) => a.id === id);
          if (draft) {
            navigator.clipboard.writeText(draft.content).then(() => {
              const button = target.closest('.copy-btn') as HTMLButtonElement;
              if (button) {
                this.uiManager.showButtonFeedback(
                  button,
                  'Copied!',
                  `${ICONS.copy} Copy`
                );
              }
            });
          }
        },
        (id) => {
          this.stateManager.deleteArchive(id);
          this.uiManager.renderArchives();
        }
      );

      if (target === this.dom.archiveOverlay) {
        this.dom.archiveOverlay.style.display = 'none';
      }
    });

    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (this.stateManager.getTheme() === 'auto') {
          this.uiManager.applyTheme('auto');
        }
      });
  }
}
