/**
 * Guided mode prompt system
 */

import type { Prompt } from '../types';

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

export function getRandomPrompt(): Prompt {
  const hour = new Date().getHours();
  const timeOfDay =
    hour > 18 || hour < 5 ? 'evening' : hour < 12 ? 'morning' : 'anytime';
  const promptList = PROMPTS[timeOfDay];
  if (!promptList || promptList.length === 0) {
    throw new Error('Prompt system misconfigured');
  }
  const index = Math.floor(Math.random() * promptList.length);
  const prompt = promptList[index];
  if (!prompt) throw new Error('Prompt index out of bounds');
  return prompt;
}
