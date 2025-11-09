/**
 * UI operations - theme, overlays, archives, prompts
 */

import { ICONS } from '../icons';
import type { DOMElements, Theme, Prompt } from '../types';
import { StateManager } from './state';

export class UIManager {
  private dom: DOMElements;
  private stateManager: StateManager;
  private pendingDeletionId: number | null = null;

  constructor(dom: DOMElements, stateManager: StateManager) {
    this.dom = dom;
    this.stateManager = stateManager;
  }

  applyTheme(theme: Theme): void {
    document.body.className = '';
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('dark-theme');
    }

    this.dom.themeButton.innerHTML = `${ICONS[theme]} <span style="text-transform: capitalize;">${theme}</span>`;
  }

  updateGuidedModeUI(guidedMode: boolean): void {
    const icon = guidedMode ? '●' : '○';
    this.dom.guidedModeButton.innerHTML = `${icon} Guided`;
    this.dom.guidedModeButton.classList.toggle('active', guidedMode);
  }

  showPrompt(prompt: Prompt): void {
    const icon =
      prompt.context === 'morning'
        ? ICONS.promptMorning
        : prompt.context === 'evening'
          ? ICONS.promptEvening
          : '';

    this.dom.promptText.innerHTML = `${icon} ${prompt.text}`;
    this.dom.promptBar.classList.add('visible');
  }

  hidePrompt(): void {
    this.dom.promptBar.classList.remove('visible');
  }

  showIntro(): void {
    this.dom.introOverlay.style.display = 'flex';
  }

  renderArchives(): void {
    this.dom.archiveContainer.innerHTML = '';
    const archives = this.stateManager.getArchives();

    if (archives.length === 0) {
      this.dom.archiveContainer.innerHTML =
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

      this.dom.archiveContainer.appendChild(item);
    });
  }

  showButtonFeedback(
    button: HTMLButtonElement,
    message: string,
    originalHTML: string
  ): void {
    button.innerHTML = message;
    setTimeout(() => {
      button.innerHTML = originalHTML;
    }, 1500);
  }

  handleArchiveClick(
    target: HTMLElement,
    onCopy: (id: number) => void,
    onDelete: (id: number) => void
  ): void {
    const button = target.closest('.archive-btn') as HTMLButtonElement;

    if (
      !button?.classList.contains('delete-btn') ||
      Number(button.dataset.id) !== this.pendingDeletionId
    ) {
      this.revertDeleteButton();
    }

    if (button?.classList.contains('copy-btn')) {
      const id = Number(button.dataset.id);
      onCopy(id);
    }

    if (button?.classList.contains('delete-btn')) {
      const id = Number(button.dataset.id);
      if (this.pendingDeletionId === id) {
        onDelete(id);
        this.pendingDeletionId = null;
      } else {
        this.pendingDeletionId = id;
        button.textContent = 'Confirm?';
        button.classList.add('confirm-delete');
      }
    }
  }

  revertDeleteButton(): void {
    const buttons = this.dom.archiveContainer.querySelectorAll(
      '.delete-btn.confirm-delete'
    );
    buttons.forEach((btn) => {
      const button = btn as HTMLButtonElement;
      button.textContent = `${ICONS.delete} Delete`;
      button.classList.remove('confirm-delete');
    });
    this.pendingDeletionId = null;
  }
}
