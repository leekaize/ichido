import { db } from './db';
import type { AppSettings, Habit, LifeEvent, Reason, TodoItem } from './types';

export const SEVERITY_MAX = 5;
const DEFAULT_SEVERITY = 3;

/** Strength window and decay: only the last N days count, recent days weigh more. */
const STRENGTH_WINDOW_DAYS = 30;
const STRENGTH_HALF_LIFE_DAYS = 10;

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
let todos: TodoItem[] = [];
let habits: Habit[] = [];

type Listener = () => void;

const reasonListeners: Listener[] = [];
const settingsListeners: Listener[] = [];
const eventsListeners: Listener[] = [];
const todoListeners: Listener[] = [];
const habitListeners: Listener[] = [];

export function onReasonsChange(fn: Listener): void {
  reasonListeners.push(fn);
}

export function onSettingsChange(fn: Listener): void {
  settingsListeners.push(fn);
}

export function onEventsChange(fn: Listener): void {
  eventsListeners.push(fn);
}

export function onTodosChange(fn: Listener): void {
  todoListeners.push(fn);
}

export function onHabitsChange(fn: Listener): void {
  habitListeners.push(fn);
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
      await db.putReason({ id: newId(), topic, severity, createdAt: Date.now() });
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
  const reason: Reason = { id: newId(), topic: trimmed, severity: DEFAULT_SEVERITY, createdAt: Date.now() };
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

/** Re-reads the caches from the database after a bulk change such as backup import. */
export async function reloadFromDb(): Promise<void> {
  reasons = await db.getReasons();
  reasons.sort((a, b) => a.topic.localeCompare(b.topic));
  settings = (await db.getSettings()) ?? { key: 'app' };
  events = await db.getEvents();
  events.sort((a, b) => a.date.localeCompare(b.date));
  todos = await db.getTodos();
  todos.sort((a, b) => a.createdAt - b.createdAt);
  habits = await db.getHabits();
  habits.sort((a, b) => a.createdAt - b.createdAt);
  emitTo(reasonListeners);
  emitTo(settingsListeners);
  emitTo(eventsListeners);
  emitTo(todoListeners);
  emitTo(habitListeners);
}

export function getEvents(): LifeEvent[] {
  return events;
}

export async function addEvent(label: string, date: string, color: string): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed || !date) return;
  const event: LifeEvent = { id: newId(), date, label: trimmed, color };
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

export async function initTodos(): Promise<void> {
  todos = await db.getTodos();
  todos.sort((a, b) => a.createdAt - b.createdAt);
}

export function getTodos(): TodoItem[] {
  return todos;
}

/** Open items in creation order, then done items. */
export function sortedTodos(): TodoItem[] {
  const open = todos.filter((todo) => !todo.done);
  const done = todos.filter((todo) => todo.done);
  return [...open, ...done];
}

export async function addTodo(text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  const todo: TodoItem = { id: newId(), text: trimmed, done: false, createdAt: Date.now() };
  await db.putTodo(todo);
  todos = [...todos, todo];
  emitTo(todoListeners);
}

export async function toggleTodo(id: string): Promise<void> {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  const next: TodoItem = todo.done
    ? { ...todo, done: false, doneAt: undefined }
    : { ...todo, done: true, doneAt: Date.now() };
  await db.putTodo(next);
  todos = todos.map((t) => (t.id === id ? next : t));
  emitTo(todoListeners);
}

export async function updateTodoText(id: string, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  const todo = todos.find((t) => t.id === id);
  if (!todo || todo.text === trimmed) return;
  const next: TodoItem = { ...todo, text: trimmed };
  await db.putTodo(next);
  todos = todos.map((t) => (t.id === id ? next : t));
  emitTo(todoListeners);
}

export async function removeTodo(id: string): Promise<void> {
  await db.deleteTodo(id);
  todos = todos.filter((todo) => todo.id !== id);
  emitTo(todoListeners);
}

export async function clearDoneTodos(): Promise<void> {
  const doneIds = todos.filter((todo) => todo.done).map((todo) => todo.id);
  for (const id of doneIds) await db.deleteTodo(id);
  todos = todos.filter((todo) => !todo.done);
  emitTo(todoListeners);
}

export async function initHabits(): Promise<void> {
  habits = await db.getHabits();
  habits.sort((a, b) => a.createdAt - b.createdAt);
}

export function getHabits(): Habit[] {
  return habits;
}

export async function addHabit(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const habit: Habit = { id: newId(), name: trimmed, createdAt: Date.now(), days: [] };
  await db.putHabit(habit);
  habits = [...habits, habit];
  emitTo(habitListeners);
}

export async function removeHabit(id: string): Promise<void> {
  await db.deleteHabit(id);
  habits = habits.filter((habit) => habit.id !== id);
  emitTo(habitListeners);
}

export async function renameHabit(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const habit = habits.find((h) => h.id === id);
  if (!habit || habit.name === trimmed) return;
  const next: Habit = { ...habit, name: trimmed };
  await db.putHabit(next);
  habits = habits.map((h) => (h.id === id ? next : h));
  emitTo(habitListeners);
}

/** Clicking a habit box marks it achieved today; clicking again cancels. */
export async function toggleHabitToday(id: string): Promise<void> {
  const habit = habits.find((h) => h.id === id);
  if (!habit) return;
  const today = localDateStr(new Date());
  const days = habit.days.includes(today) ? habit.days.filter((d) => d !== today) : [...habit.days, today].sort();
  const next: Habit = { ...habit, days };
  await db.putHabit(next);
  habits = habits.map((h) => (h.id === id ? next : h));
  emitTo(habitListeners);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** crypto.randomUUID needs HTTPS or localhost; getRandomValues works everywhere. */
function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Local-time YYYY-MM-DD, same format the days store uses for keys. */
export function localDateStr(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function dateFromStr(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDaysStr(str: string, delta: number): string {
  const date = dateFromStr(str);
  date.setDate(date.getDate() + delta);
  return localDateStr(date);
}

function daysBetween(from: string, to: string): number {
  return Math.round((dateFromStr(to).getTime() - dateFromStr(from).getTime()) / 86400000);
}

/**
 * Recent completion, 0-100. Counts at most the last 30 days (only days since
 * the habit was created), each day weighted by exponential decay with a
 * 10-day half-life, so yesterday matters about as much as the last week combined.
 */
export function habitStrength(habit: Habit, today = localDateStr(new Date())): number {
  const hits = new Set(habit.days);
  const earliest = addDaysStr(today, -(STRENGTH_WINDOW_DAYS - 1));
  const created = localDateStr(new Date(habit.createdAt));
  const start = created > earliest ? created : earliest;
  if (start > today) return 0; // clock jumped backward since creation
  let num = 0;
  let den = 0;
  for (let day = start; ; day = addDaysStr(day, 1)) {
    const weight = Math.pow(0.5, daysBetween(day, today) / STRENGTH_HALF_LIFE_DAYS);
    den += weight;
    if (hits.has(day)) num += weight;
    if (day === today) break;
  }
  return den > 0 ? Math.round((100 * num) / den) : 0;
}

/**
 * Consecutive achieved days ending today. If today is not achieved yet the
 * streak may still be alive through yesterday, since the day is not over.
 */
export function habitStreak(habit: Habit, today = localDateStr(new Date())): number {
  const hits = new Set(habit.days);
  let cursor = hits.has(today) ? today : addDaysStr(today, -1);
  if (!hits.has(cursor)) return 0;
  let streak = 0;
  while (hits.has(cursor)) {
    streak += 1;
    cursor = addDaysStr(cursor, -1);
  }
  return streak;
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
