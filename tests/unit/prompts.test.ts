import { describe, it, expect, vi } from 'vitest';
import { getRandomPrompt } from '../../src/modules/prompts';

describe('getRandomPrompt', () => {
  it('returns morning prompt before noon', () => {
    vi.setSystemTime(new Date('2025-01-01T10:00:00'));
    const prompt = getRandomPrompt();
    expect(prompt.context).toBe('morning');
  });

  it('returns evening prompt after 6pm', () => {
    vi.setSystemTime(new Date('2025-01-01T19:00:00'));
    const prompt = getRandomPrompt();
    expect(prompt.context).toBe('evening');
  });

  it('returns anytime prompt in afternoon', () => {
    vi.setSystemTime(new Date('2025-01-01T14:00:00'));
    const prompt = getRandomPrompt();
    expect(prompt.context).toBe('anytime');
  });

  it('returns valid prompt structure', () => {
    const prompt = getRandomPrompt();
    expect(prompt).toHaveProperty('text');
    expect(prompt).toHaveProperty('context');
    expect(typeof prompt.text).toBe('string');
  });
});
