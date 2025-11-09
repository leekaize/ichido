/**
 * Type definitions for ichido
 */

export interface Draft {
  id: number;
  date: string;
  content: string;
}

export interface AppState {
  currentDraftId: number | null;
  pendingDeletionId: number | null;
  lastText: string;
  guidedMode: boolean;
  currentPrompt: Prompt | null;
}

export interface Prompt {
  text: string;
  context: 'morning' | 'evening' | 'anytime';
}

export type Theme = 'auto' | 'light' | 'dark';

export interface DOMElements {
  editor: HTMLDivElement;
  copyButton: HTMLButtonElement;
  newButton: HTMLButtonElement;
  archiveButton: HTMLButtonElement;
  helpButton: HTMLButtonElement;
  themeButton: HTMLButtonElement;
  guidedModeButton: HTMLButtonElement;
  archiveOverlay: HTMLDivElement;
  helpOverlay: HTMLDivElement;
  introOverlay: HTMLDivElement;
  archiveContainer: HTMLDivElement;
  hint: HTMLDivElement;
  promptBar: HTMLDivElement;
  promptText: HTMLSpanElement;
  dismissPrompt: HTMLButtonElement;
}
