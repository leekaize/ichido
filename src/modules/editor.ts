/**
 * Editor operations - text handling, rendering, autosave
 */

import { CONFIG } from '../config';
import type { DOMElements, Draft } from '../types';
import { StateManager } from './state';

export class EditorManager {
  private dom: DOMElements;
  private stateManager: StateManager;
  private lastText = '';
  private currentDraftId: number | null = null;

  constructor(dom: DOMElements, stateManager: StateManager) {
    this.dom = dom;
    this.stateManager = stateManager;
  }

  getText(): string {
    return this.dom.editor.innerText.replace(CONFIG.ZERO_WIDTH_SPACE, '');
  }

  focusEditor(): void {
    const range = document.createRange();
    const selection = window.getSelection();
    if (!selection) return;

    range.selectNodeContents(this.dom.editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  clearEditor(): void {
    this.dom.editor.innerHTML = '';
    this.currentDraftId = null;
    this.handleInput();
  }

  autoSaveDraft(): void {
    const text = this.getText();
    if (text.length === 0) return;

    const archives = this.stateManager.getArchives();
    const now = new Date();
    const draft: Draft = {
      id: this.currentDraftId || now.getTime(),
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
    this.currentDraftId = draft.id;
  }

  handleInput(): void {
    const currentText = this.dom.editor.innerText;

    if (
      currentText.length > this.lastText.length &&
      !/\s$/.test(this.lastText) &&
      /\s$/.test(currentText)
    ) {
      this.autoSaveDraft();
    }

    this.lastText = currentText;

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

    if (this.dom.editor.innerHTML !== newHTML) {
      this.dom.editor.innerHTML = newHTML;
    }

    this.focusEditor();
    this.toggleHint();
  }

  toggleHint(): void {
    this.dom.hint.style.opacity = this.getText().length === 0 ? '1' : '0';
  }

  getCurrentDraftId(): number | null {
    return this.currentDraftId;
  }
}
