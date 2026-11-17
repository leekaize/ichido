import { db } from './db';
import { reloadFromDb } from './state';
import { reloadDayView } from './dayview';
import { clear as clearHistory } from './history';
import type { AppSettings, Cell, CellStatus, DayRecord, LifeEvent, Reason } from './types';

const EXPORT_VERSION = 2;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface ImportSummary {
  days: number;
  reasons: number;
  events: number;
  skipped: number;
}

/** Downloads every store as one JSON file. */
export async function exportJson(): Promise<void> {
  const [days, reasons, events, settings] = await Promise.all([
    db.getAllDays(),
    db.getReasons(),
    db.getEvents(),
    db.getSettings(),
  ]);
  const payload = {
    app: 'ichido',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    days,
    reasons,
    events,
    settings: settings ?? null,
  };
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
  const data = parsed as { days?: unknown; reasons?: unknown; events?: unknown; settings?: unknown } | null;
  if (!data || !Array.isArray(data.days) || !Array.isArray(data.reasons) || !Array.isArray(data.events)) {
    throw new Error('not an ichido export');
  }

  const days = sanitizeDays(data.days);
  const reasons = sanitizeReasons(data.reasons);
  const events = sanitizeEvents(data.events);
  const settings = sanitizeSettings(data.settings);
  const skipped =
    data.days.length - days.length + (data.reasons.length - reasons.length) + (data.events.length - events.length);

  await db.replaceAllStores({ days, reasons, events, settings });
  clearHistory();
  await reloadFromDb();
  reloadDayView();
  return { days: days.length, reasons: reasons.length, events: events.length, skipped };
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

/** Returns undefined when the file carries no usable settings, keeping the current ones. */
function sanitizeSettings(raw: unknown): AppSettings | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const stored = raw as Partial<AppSettings>;
  const settings: AppSettings = { key: 'app' };
  if (typeof stored.birthdate === 'string' && DATE_RE.test(stored.birthdate)) settings.birthdate = stored.birthdate;
  if (typeof stored.lifespanYears === 'number' && Number.isFinite(stored.lifespanYears)) {
    settings.lifespanYears = Math.min(120, Math.max(40, Math.round(stored.lifespanYears)));
  }
  return settings;
}

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
