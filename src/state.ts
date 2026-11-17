import { db } from './db';
import type { AppSettings, LifeEvent, Reason } from './types';

export const SEVERITY_MAX = 5;
const DEFAULT_SEVERITY = 3;

export const EVENT_COLORS = [
  'hsl(210, 70%, 55%)',
  'hsl(145, 55%, 42%)',
  'hsl(275, 55%, 55%)',
  'hsl(25, 75%, 50%)',
  'hsl(330, 65%, 55%)',
  'hsl(175, 60%, 38%)',
];

let reasons: Reason[] = [];
let settings: AppSettings = { key: 'app' };
let events: LifeEvent[] = [];

type Listener = () => void;

const reasonListeners: Listener[] = [];
const settingsListeners: Listener[] = [];
const eventsListeners: Listener[] = [];

export function onReasonsChange(fn: Listener): void {
  reasonListeners.push(fn);
}

export function onSettingsChange(fn: Listener): void {
  settingsListeners.push(fn);
}

export function onEventsChange(fn: Listener): void {
  eventsListeners.push(fn);
}

function emitTo(listeners: Listener[]): void {
  for (const fn of listeners) fn();
}

const DEFAULT_REASONS: Array<[string, number]> = [
  ['distraction', 2],
  ['overslept', 2],
  ['low energy', 2],
  ["didn't start", 3],
  ['emergency', 4],
];

export async function initReasons(): Promise<void> {
  let stored = await db.getReasons();
  if (stored.length === 0) {
    for (const [topic, severity] of DEFAULT_REASONS) {
      await db.putReason({ id: crypto.randomUUID(), topic, severity, createdAt: Date.now() });
    }
    stored = await db.getReasons();
  }
  // reasons saved before severity existed get the neutral middle value
  let upgraded = false;
  for (const reason of stored) {
    if (typeof reason.severity !== 'number') {
      reason.severity = DEFAULT_SEVERITY;
      upgraded = true;
    }
  }
  if (upgraded) {
    for (const reason of stored) await db.putReason(reason);
  }
  stored.sort((a, b) => a.topic.localeCompare(b.topic));
  reasons = stored;
}

export function getReasons(): Reason[] {
  return reasons;
}

export function getReason(id: string): Reason | undefined {
  return reasons.find((reason) => reason.id === id);
}

export async function addReason(topic: string): Promise<void> {
  const trimmed = topic.trim();
  if (!trimmed) return;
  const reason: Reason = { id: crypto.randomUUID(), topic: trimmed, severity: DEFAULT_SEVERITY, createdAt: Date.now() };
  await db.putReason(reason);
  reasons = [...reasons, reason];
  reasons.sort((a, b) => a.topic.localeCompare(b.topic));
  emitTo(reasonListeners);
}

export async function removeReason(id: string): Promise<void> {
  const counts = await countFailedByReason();
  if ((counts.get(id) ?? 0) > 0) return;
  await db.deleteReason(id);
  reasons = reasons.filter((reason) => reason.id !== id);
  emitTo(reasonListeners);
}

export async function setReasonSeverity(id: string, severity: number): Promise<void> {
  const reason = reasons.find((r) => r.id === id);
  if (!reason) return;
  const updated: Reason = { ...reason, severity: clampSeverity(severity) };
  await db.putReason(updated);
  reasons = reasons.map((r) => (r.id === id ? updated : r));
  emitTo(reasonListeners);
}

export async function updateReasonTopic(id: string, topic: string): Promise<void> {
  const trimmed = topic.trim();
  if (!trimmed) return;
  const reason = reasons.find((r) => r.id === id);
  if (!reason || reason.topic === trimmed) return;
  const updated: Reason = { ...reason, topic: trimmed };
  await db.putReason(updated);
  reasons = reasons.map((r) => (r.id === id ? updated : r));
  reasons.sort((a, b) => a.topic.localeCompare(b.topic));
  emitTo(reasonListeners);
}

export async function countFailedByReason(): Promise<Map<string, number>> {
  const days = await db.getAllDays();
  const counts = new Map<string, number>();
  for (const day of days) {
    for (const cell of day.cells) {
      if (cell.status === 'failed') {
        // a block with several reasons counts once for each
        for (const id of cell.reasonIds) {
          counts.set(id, (counts.get(id) ?? 0) + 1);
        }
      }
    }
  }
  return counts;
}

function clampSeverity(severity: number): number {
  return Math.min(SEVERITY_MAX, Math.max(1, Math.round(severity)));
}

/** Yellow (mild) to dark red (severe), level 1 to 5. */
const SEVERITY_HUES = [45, 30, 15, 0, 0];
const SEVERITY_LIGHTNESS = [62, 56, 52, 50, 38];

export function severityColor(severity: number): string {
  const s = clampSeverity(severity);
  return `hsl(${SEVERITY_HUES[s - 1]}, 70%, ${SEVERITY_LIGHTNESS[s - 1]}%)`;
}

/** A failed block is as severe as its worst selected reason. */
export function maxSeverity(reasonIds: string[]): number {
  let max = 0;
  for (const id of reasonIds) {
    const reason = getReason(id);
    if (reason) max = Math.max(max, clampSeverity(reason.severity));
  }
  return max;
}

export async function initSettings(): Promise<void> {
  settings = (await db.getSettings()) ?? { key: 'app' };
}

export function getSettings(): AppSettings {
  return settings;
}

export async function setBirthday(date: string | undefined): Promise<void> {
  settings = { ...settings, birthdate: date && date !== '' ? date : undefined };
  await db.putSettings(settings);
  emitTo(settingsListeners);
}

export async function setLifespan(years: number): Promise<void> {
  if (!Number.isFinite(years)) return;
  settings = { ...settings, lifespanYears: Math.min(120, Math.max(40, Math.round(years))) };
  await db.putSettings(settings);
  emitTo(settingsListeners);
}

export async function initEvents(): Promise<void> {
  events = await db.getEvents();
  events.sort((a, b) => a.date.localeCompare(b.date));
}

export function getEvents(): LifeEvent[] {
  return events;
}

export async function addEvent(label: string, date: string, color: string): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed || !date) return;
  const event: LifeEvent = { id: crypto.randomUUID(), date, label: trimmed, color };
  await db.putEvent(event);
  events = [...events, event];
  events.sort((a, b) => a.date.localeCompare(b.date));
  emitTo(eventsListeners);
}

export async function removeEvent(id: string): Promise<void> {
  await db.deleteEvent(id);
  events = events.filter((event) => event.id !== id);
  emitTo(eventsListeners);
}

export async function updateEvent(
  id: string,
  patch: { label?: string; date?: string; color?: string },
): Promise<void> {
  const event = events.find((e) => e.id === id);
  if (!event) return;
  const next: LifeEvent = {
    ...event,
    label: patch.label !== undefined && patch.label.trim() !== '' ? patch.label.trim() : event.label,
    date: patch.date && /^\d{4}-\d{2}-\d{2}$/.test(patch.date) ? patch.date : event.date,
    color: patch.color ?? event.color,
  };
  if (next.label === event.label && next.date === event.date && next.color === event.color) return;
  await db.putEvent(next);
  events = events.map((e) => (e.id === id ? next : e));
  events.sort((a, b) => a.date.localeCompare(b.date));
  emitTo(eventsListeners);
}
