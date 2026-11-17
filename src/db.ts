import type { AppSettings, Cell, DayRecord, LifeEvent, Reason } from './types';

const DB_NAME = 'ichido';
const DB_VERSION = 2;

type StoreName = 'days' | 'reasons' | 'settings' | 'events';

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('days')) {
          db.createObjectStore('days', { keyPath: 'date' });
        }
        if (!db.objectStoreNames.contains('reasons')) {
          db.createObjectStore('reasons', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('events')) {
          db.createObjectStore('events', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function get<T>(store: StoreName, key: string): Promise<T | undefined> {
  return open().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const req = db.transaction(store, 'readonly').objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      }),
  );
}

function getAll<T>(store: StoreName): Promise<T[]> {
  return open().then(
    (db) =>
      new Promise<T[]>((resolve, reject) => {
        const req = db.transaction(store, 'readonly').objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result as T[]);
        req.onerror = () => reject(req.error);
      }),
  );
}

function put(store: StoreName, value: unknown): Promise<void> {
  return open().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).put(value);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

function remove(store: StoreName, key: string): Promise<void> {
  return open().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

/** Records saved before multi-select reasons existed carry reasonId (singular). */
function normalizeDay(day: DayRecord): DayRecord {
  const cells = day.cells.map((cell) => {
    const legacy = cell as Cell & { reasonId?: string };
    const reasonIds = legacy.reasonIds ?? (legacy.reasonId !== undefined ? [legacy.reasonId] : []);
    return { status: cell.status, reasonIds, note: cell.note };
  });
  return { ...day, cells };
}

export const db = {
  getDay: async (date: string) => {
    const day = await get<DayRecord>('days', date);
    return day ? normalizeDay(day) : undefined;
  },
  getAllDays: async () => {
    const days = await getAll<DayRecord>('days');
    return days.map(normalizeDay);
  },
  putDay: (record: DayRecord) => put('days', record),
  getReasons: () => getAll<Reason>('reasons'),
  putReason: (reason: Reason) => put('reasons', reason),
  deleteReason: (id: string) => remove('reasons', id),
  getSettings: () => get<AppSettings>('settings', 'app'),
  putSettings: (settings: AppSettings) => put('settings', settings),
  getEvents: () => getAll<LifeEvent>('events'),
  putEvent: (event: LifeEvent) => put('events', event),
  deleteEvent: (id: string) => remove('events', id),
};
