/**
 * ichido - Entry point
 * A minimalist space for honest reflection
 */

import { IchidoApp } from './app';
import type { DOMElements } from './types';

const DOM: DOMElements = {
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

document.addEventListener('DOMContentLoaded', () => {
  const app = new IchidoApp(DOM);
  app.init();
});
