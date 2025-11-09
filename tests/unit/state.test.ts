import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '../../src/modules/state';

describe('StateManager', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    localStorage.clear();
    stateManager = new StateManager();
  });

  describe('Archives', () => {
    it('returns empty array when no archives exist', () => {
      expect(stateManager.getArchives()).toEqual([]);
    });

    it('saves and retrieves archives', () => {
      const draft = { id: 1, date: '2025-01-01', content: 'test' };
      stateManager.saveArchives([draft]);
      expect(stateManager.getArchives()).toEqual([draft]);
    });

    it('deletes archive by id', () => {
      const drafts = [
        { id: 1, date: '2025-01-01', content: 'first' },
        { id: 2, date: '2025-01-02', content: 'second' },
      ];
      stateManager.saveArchives(drafts);
      stateManager.deleteArchive(1);
      expect(stateManager.getArchives()).toEqual([drafts[1]]);
    });
  });

  describe('Theme', () => {
    it('defaults to auto', () => {
      expect(stateManager.getTheme()).toBe('auto');
    });

    it('saves and retrieves theme', () => {
      stateManager.saveTheme('dark');
      expect(stateManager.getTheme()).toBe('dark');
    });
  });

  describe('Guided Mode', () => {
    it('defaults to false', () => {
      expect(stateManager.getGuidedMode()).toBe(false);
    });

    it('saves and retrieves guided mode', () => {
      stateManager.saveGuidedMode(true);
      expect(stateManager.getGuidedMode()).toBe(true);
    });
  });
});
