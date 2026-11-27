import { db } from './db';
import { reloadFromDb } from './state';
import { reloadDayView } from './dayview';
import { clear as clearHistory } from './history';
import type { AppSettings, Cell, CellStatus, DayRecord, Habit, LifeEvent, Reason, Tombstone, TodoItem } from './types';

const EXPORT_VERSION = 5;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface ImportSummary {
  days: number;
  reasons: number;
  events: number;
  todos: number;
  habits: number;
  skipped: number;
}

export interface BackupPayload {
  app: string;
  version: number;
  exportedAt: string;
  days: DayRecord[];
  reasons: Reason[];
  events: LifeEvent[];
  todos: TodoItem[];
  habits: Habit[];
  settings: AppSettings | null;
  tombstones?: Tombstone[];
}

/** Collects every store as one payload object, shared by export and sync push. */
export async function buildPayload(): Promise<BackupPayload> {
  const [days, reasons, events, todos, habits, settings, tombstones] = await Promise.all([
    db.getAllDays(),
    db.getReasons(),
    db.getEvents(),
    db.getTodos(),
    db.getHabits(),
    db.getSettings(),
    db.getTombstones(),
  ]);
  return {
    app: 'ichido',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    days,
    reasons,
    events,
    todos,
    habits,
    settings: settings ?? null,
    tombstones,
  };
}

/** Downloads every store as one JSON file. */
export async function exportJson(): Promise<void> {
  const payload = await buildPayload();
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `ichido-${todayStr()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Replaces all stores with the file contents and refreshes the UI. */
export async function importJson(file: File): Promise<ImportSummary> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('not valid JSON');
  }
  return applyBackup(parsed);
}

interface ParsedPayload {
  days: DayRecord[];
  reasons: Reason[];
  events: LifeEvent[];
  todos: TodoItem[];
  habits: Habit[];
  settings: AppSettings | undefined;
  tombstones: Tombstone[] | undefined;
  rawCount: number;
}

/** Shared validation and sanitation for import, manual pull, and sync merge. */
function parsePayload(parsed: unknown): ParsedPayload {
  const data = parsed as { days?: unknown; reasons?: unknown; events?: unknown; todos?: unknown; habits?: unknown; settings?: unknown; tombstones?: unknown } | null;
  if (!data || !Array.isArray(data.days) || !Array.isArray(data.reasons) || !Array.isArray(data.events)) {
    throw new Error('not an ichido export');
  }

  const days = sanitizeDays(data.days);
  const reasons = sanitizeReasons(data.reasons);
  const events = sanitizeEvents(data.events);
  // exports from before the focus list existed carry no todos;
  // exports from before the habit tracker existed carry no habits
  const todos = Array.isArray(data.todos) ? sanitizeTodos(data.todos) : [];
  const habits = Array.isArray(data.habits) ? sanitizeHabits(data.habits) : [];
  const settings = sanitizeSettings(data.settings);
  // payloads from before tombstones existed carry none; undefined keeps the local ones
  const tombstones = Array.isArray(data.tombstones) ? sanitizeTombstones(data.tombstones) : undefined;
  const rawCount =
    data.days.length + data.reasons.length + data.events.length + (Array.isArray(data.todos) ? data.todos.length : 0) + (Array.isArray(data.habits) ? data.habits.length : 0);
  return { days, reasons, events, todos, habits, settings, tombstones, rawCount };
}

function summarize(payload: ParsedPayload): ImportSummary {
  const skipped =
    payload.rawCount -
    (payload.days.length + payload.reasons.length + payload.events.length + payload.todos.length + payload.habits.length);
  return {
    days: payload.days.length,
    reasons: payload.reasons.length,
    events: payload.events.length,
    todos: payload.todos.length,
    habits: payload.habits.length,
    skipped,
  };
}

/** Validates a parsed export, replaces all stores with it, and refreshes the UI. */
export async function applyBackup(parsed: unknown): Promise<ImportSummary> {
  const payload = parsePayload(parsed);
  await db.replaceAllStores({
    days: payload.days,
    reasons: payload.reasons,
    events: payload.events,
    todos: payload.todos,
    habits: payload.habits,
    settings: payload.settings,
    tombstones: payload.tombstones,
  });
  clearHistory();
  await reloadFromDb();
  reloadDayView();
  return summarize(payload);
}

function sanitizeDays(raw: unknown[]): DayRecord[] {
  const days: DayRecord[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const day = item as Partial<DayRecord>;
    if (typeof day.date !== 'string' || !DATE_RE.test(day.date) || !Array.isArray(day.cells)) continue;
    days.push({
      date: day.date,
      cells: day.cells.map(sanitizeCell),
      updatedAt: typeof day.updatedAt === 'number' ? day.updatedAt : 0,
    });
  }
  return days;
}

function sanitizeCell(raw: unknown): Cell {
  const cell = (raw ?? {}) as Partial<Cell> & { reasonId?: unknown };
  const status: CellStatus = cell.status === 'done' || cell.status === 'failed' ? cell.status : 'empty';
  let reasonIds: string[] = [];
  if (Array.isArray(cell.reasonIds)) {
    reasonIds = cell.reasonIds.filter((id): id is string => typeof id === 'string');
  } else if (typeof cell.reasonId === 'string') {
    reasonIds = [cell.reasonId]; // days saved before multi-select reasons existed
  }
  return { status, reasonIds, note: typeof cell.note === 'string' && cell.note !== '' ? cell.note : undefined };
}

function sanitizeReasons(raw: unknown[]): Reason[] {
  const reasons: Reason[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const reason = item as Partial<Reason>;
    if (typeof reason.id !== 'string' || typeof reason.topic !== 'string' || reason.topic.trim() === '') continue;
    reasons.push({
      id: reason.id,
      topic: reason.topic,
      severity:
        typeof reason.severity === 'number' && reason.severity >= 1 && reason.severity <= 5
          ? Math.round(reason.severity)
          : 3,
      createdAt: typeof reason.createdAt === 'number' ? reason.createdAt : Date.now(),
      updatedAt: typeof reason.updatedAt === 'number' ? reason.updatedAt : undefined,
    });
  }
  return reasons;
}

function sanitizeEvents(raw: unknown[]): LifeEvent[] {
  const events: LifeEvent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const event = item as Partial<LifeEvent>;
    if (
      typeof event.id !== 'string' ||
      typeof event.date !== 'string' ||
      !DATE_RE.test(event.date) ||
      typeof event.label !== 'string' ||
      typeof event.color !== 'string'
    ) {
      continue;
    }
    events.push({ id: event.id, date: event.date, label: event.label, color: event.color });
  }
  return events;
}

function sanitizeTodos(raw: unknown[]): TodoItem[] {
  const todos: TodoItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const todo = item as Partial<TodoItem>;
    if (typeof todo.id !== 'string' || typeof todo.text !== 'string' || todo.text.trim() === '') continue;
    const done = todo.done === true;
    todos.push({
      id: todo.id,
      text: todo.text,
      done,
      createdAt: typeof todo.createdAt === 'number' ? todo.createdAt : Date.now(),
      doneAt: done && typeof todo.doneAt === 'number' ? todo.doneAt : undefined,
      updatedAt: typeof todo.updatedAt === 'number' ? todo.updatedAt : undefined,
    });
  }
  return todos;
}

function sanitizeHabits(raw: unknown[]): Habit[] {
  const habits: Habit[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const habit = item as Partial<Habit>;
    if (typeof habit.id !== 'string' || typeof habit.name !== 'string' || habit.name.trim() === '') continue;
    const days = Array.isArray(habit.days) ? habit.days.filter((day): day is string => typeof day === 'string' && DATE_RE.test(day)) : [];
    habits.push({
      id: habit.id,
      name: habit.name,
      createdAt: typeof habit.createdAt === 'number' ? habit.createdAt : Date.now(),
      days: [...new Set(days)].sort(),
      updatedAt: typeof habit.updatedAt === 'number' ? habit.updatedAt : undefined,
    });
  }
  return habits;
}

/** Returns undefined when the file carries no usable settings, keeping the current ones. */
function sanitizeSettings(raw: unknown): AppSettings | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const stored = raw as Partial<AppSettings>;
  const settings: AppSettings = { key: 'app' };
  if (typeof stored.birthdate === 'string' && DATE_RE.test(stored.birthdate)) settings.birthdate = stored.birthdate;
  if (typeof stored.lifespanYears === 'number' && Number.isFinite(stored.lifespanYears)) {
    settings.lifespanYears = Math.min(120, Math.max(40, Math.round(stored.lifespanYears)));
  }
  if (typeof stored.updatedAt === 'number' && Number.isFinite(stored.updatedAt)) settings.updatedAt = stored.updatedAt;
  return settings;
}

const TOMBSTONE_STORES = new Set(['reasons', 'events', 'todos', 'habits']);

function sanitizeTombstones(raw: unknown[]): Tombstone[] {
  const tombstones: Tombstone[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const t = item as Partial<Tombstone>;
    if (typeof t.id !== 'string' || typeof t.deletedAt !== 'number' || !Number.isFinite(t.deletedAt)) continue;
    if (!t.store || !TOMBSTONE_STORES.has(t.store)) continue;
    tombstones.push({ store: t.store, id: t.id, deletedAt: Math.round(t.deletedAt) });
  }
  return tombstones;
}

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

// --- sync merge -----------------------------------------------------------
// Union of local and server records with per-record last-write-wins. Deletions
// win outright: a tombstone removes its record on every device, so stale copies
// cannot resurrect a deleted todo, habit, event, or reason.

function mergeRecords<T>(local: T[], remote: T[], keyOf: (r: T) => string, tombstoned: Set<string>, stamp: (r: T) => number): T[] {
  const merged = new Map<string, T>(local.map((r) => [keyOf(r), r]));
  for (const r of remote) {
    const key = keyOf(r);
    const mine = merged.get(key);
    if (!mine) merged.set(key, r);
    else if (stamp(r) > stamp(mine)) merged.set(key, r); // tie keeps the local copy
  }
  for (const id of tombstoned) merged.delete(id);
  return [...merged.values()];
}

function sameRecords<T>(a: T[], b: T[], keyOf: (r: T) => string): boolean {
  if (a.length !== b.length) return false;
  const before = new Map(a.map((r) => [keyOf(r), JSON.stringify(r)]));
  return b.every((r) => before.get(keyOf(r)) === JSON.stringify(r));
}

function sameTombstones(a: Tombstone[], b: Tombstone[]): boolean {
  if (a.length !== b.length) return false;
  const before = new Map(a.map((t) => [`${t.store}:${t.id}`, t.deletedAt]));
  return b.every((t) => before.get(`${t.store}:${t.id}`) === t.deletedAt);
}

/**
 * Merges the server payload into the local stores instead of replacing them:
 * union by id with last-write-wins per record (days use `updatedAt`, the rest
 * fall back to `createdAt`). Applies locally only when something changed, so
 * the caller can push the converged state back.
 */
export async function mergeBackup(parsed: unknown): Promise<{ changed: boolean; summary: ImportSummary }> {
  const payload = parsePayload(parsed);
  const [localDays, localReasons, localEvents, localTodos, localHabits, localSettings, localTombstones] = await Promise.all([
    db.getAllDays(),
    db.getReasons(),
    db.getEvents(),
    db.getTodos(),
    db.getHabits(),
    db.getSettings(),
    db.getTombstones(),
  ]);

  const tombstoned = new Set<string>();
  const mergedTombstones = new Map<string, Tombstone>();
  for (const t of [...localTombstones, ...(payload.tombstones ?? [])]) {
    const key = `${t.store}:${t.id}`;
    const existing = mergedTombstones.get(key);
    if (!existing || t.deletedAt > existing.deletedAt) mergedTombstones.set(key, t);
    tombstoned.add(t.id);
  }

  const stampTodo = (t: TodoItem) => t.updatedAt ?? t.doneAt ?? t.createdAt;
  const dayKey = (d: DayRecord) => d.date;
  const idKey = (r: { id: string }) => r.id;
  const days = mergeRecords(localDays, payload.days, dayKey, tombstoned, (d) => d.updatedAt).sort((a, b) => a.date.localeCompare(b.date));
  const reasons = mergeRecords(localReasons, payload.reasons, idKey, tombstoned, (r) => r.updatedAt ?? r.createdAt);
  const events = mergeRecords(localEvents, payload.events, idKey, tombstoned, () => 0);
  const todos = mergeRecords(localTodos, payload.todos, idKey, tombstoned, stampTodo).sort((a, b) => a.createdAt - b.createdAt);
  const habits = mergeRecords(localHabits, payload.habits, idKey, tombstoned, (h) => h.updatedAt ?? h.createdAt).sort((a, b) => a.createdAt - b.createdAt);
  const tombstones = [...mergedTombstones.values()];

  // settings: single record, newer stamp wins; tie or no stamps keeps local
  const remoteSettings = payload.settings;
  let settings = localSettings ?? remoteSettings;
  if (localSettings && remoteSettings && (remoteSettings.updatedAt ?? 0) > (localSettings.updatedAt ?? 0)) settings = remoteSettings;

  const changed =
    !sameRecords(localDays, days, dayKey) ||
    !sameRecords(localReasons, reasons, idKey) ||
    !sameRecords(localEvents, events, idKey) ||
    !sameRecords(localTodos, todos, idKey) ||
    !sameRecords(localHabits, habits, idKey) ||
    !sameTombstones(localTombstones, tombstones) ||
    JSON.stringify(localSettings ?? null) !== JSON.stringify(settings ?? null);
  if (!changed) return { changed: false, summary: summarize(payload) };

  await db.replaceAllStores({ days, reasons, events, todos, habits, settings, tombstones });
  clearHistory();
  await reloadFromDb();
  reloadDayView();
  return { changed: true, summary: summarize(payload) };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
