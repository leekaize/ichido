/**
 * Application configuration constants
 */

import type { Theme } from './types';

export const CONFIG = {
  ZERO_WIDTH_SPACE: '\u200B',
  ARCHIVE_KEY: 'ichido_archives',
  THEME_KEY: 'ichido_theme',
  GUIDED_MODE_KEY: 'ichido_guided_mode',
  INTRO_SEEN_KEY: 'ichido_intro_seen',
  THEMES: ['auto', 'light', 'dark'] as Theme[],
} as const;
