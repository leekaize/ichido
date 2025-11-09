/**
 * State management - localStorage operations
 */

import { CONFIG } from '../config';
import type { Draft, Theme } from '../types';

export class StateManager {
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
