import type { AppSettings, Cell, DayRecord, Habit, LifeEvent, Reason, Tombstone, TodoItem } from './types';

const DB_NAME = 'ichido';
const DB_VERSION = 5;

type StoreName = 'days' | 'reasons' | 'settings' | 'events' | 'todos' | 'habits' | 'tombstones';

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
        if (!db.objectStoreNames.contains('todos')) {
          db.createObjectStore('todos', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('habits')) {
          db.createObjectStore('habits', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('tombstones')) {
          db.createObjectStore('tombstones', { keyPath: ['store', 'id'] });
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

// Sync hooks: every data write funnels through the helpers above, so this is
// the one place auto-sync needs to watch. Tombstones ride along with deletes
// so a merge on another device can drop the record instead of resurrecting it.

type DataListener = () => void;
const dataListeners: DataListener[] = [];

export function onDataWrite(fn: DataListener): void {
  dataListeners.push(fn);
}

function emitDataWrite(): void {
  for (const fn of dataListeners) fn();
}

const TOMBSTONE_STORES = new Set<StoreName>(['reasons', 'events', 'todos', 'habits']);

async function removeWithTombstone(store: StoreName, key: string): Promise<void> {
  if (!TOMBSTONE_STORES.has(store)) {
    await remove(store, key);
  } else {
    const tombstone: Tombstone = { store: store as Tombstone['store'], id: key, deletedAt: Date.now() };
    const conn = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = conn.transaction([store, 'tombstones'], 'readwrite');
      tx.objectStore(store).delete(key);
      tx.objectStore('tombstones').put(tombstone);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  emitDataWrite();
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
  putDay: async (record: DayRecord) => {
    await put('days', record);
    emitDataWrite();
  },
  getReasons: () => getAll<Reason>('reasons'),
  putReason: async (reason: Reason) => {
    await put('reasons', reason);
    emitDataWrite();
  },
  deleteReason: (id: string) => removeWithTombstone('reasons', id),
  getSettings: () => get<AppSettings>('settings', 'app'),
  putSettings: async (settings: AppSettings) => {
    await put('settings', settings);
    emitDataWrite();
  },
  getEvents: () => getAll<LifeEvent>('events'),
  putEvent: async (event: LifeEvent) => {
    await put('events', event);
    emitDataWrite();
  },
  deleteEvent: (id: string) => removeWithTombstone('events', id),
  getTodos: () => getAll<TodoItem>('todos'),
  putTodo: async (todo: TodoItem) => {
    await put('todos', todo);
    emitDataWrite();
  },
  deleteTodo: (id: string) => removeWithTombstone('todos', id),
  getHabits: () => getAll<Habit>('habits'),
  putHabit: async (habit: Habit) => {
    await put('habits', habit);
    emitDataWrite();
  },
  deleteHabit: (id: string) => removeWithTombstone('habits', id),
  getTombstones: () => getAll<Tombstone>('tombstones'),
  /** Wipes and refills the stores in one transaction; used by backup import and sync merge. */
  replaceAllStores: async (data: {
    days: DayRecord[];
    reasons: Reason[];
    events: LifeEvent[];
    todos: TodoItem[];
    habits: Habit[];
    settings?: AppSettings;
    tombstones?: Tombstone[];
  }): Promise<void> =>
    open().then(
      (db) =>
        new Promise<void>((resolve, reject) => {
          const stores: StoreName[] = ['days', 'reasons', 'settings', 'events', 'todos', 'habits'];
          if (data.tombstones) stores.push('tombstones');
          const tx = db.transaction(stores, 'readwrite');
          tx.objectStore('days').clear();
          tx.objectStore('reasons').clear();
          tx.objectStore('events').clear();
          tx.objectStore('todos').clear();
          tx.objectStore('habits').clear();
          for (const day of data.days) tx.objectStore('days').put(day);
          for (const reason of data.reasons) tx.objectStore('reasons').put(reason);
          for (const event of data.events) tx.objectStore('events').put(event);
          for (const todo of data.todos) tx.objectStore('todos').put(todo);
          for (const habit of data.habits) tx.objectStore('habits').put(habit);
          if (data.settings) {
            tx.objectStore('settings').clear();
            tx.objectStore('settings').put(data.settings);
          }
          if (data.tombstones) {
            tx.objectStore('tombstones').clear();
            for (const tombstone of data.tombstones) tx.objectStore('tombstones').put(tombstone);
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        }),
    ).then(() => emitDataWrite()),
};
