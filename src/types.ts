export type CellStatus = 'empty' | 'done' | 'failed';

export interface Cell {
  status: CellStatus;
  /** reasons selected when status is 'failed'; empty otherwise */
  reasonIds: string[];
  /** optional note when status is 'failed' */
  note?: string;
}

export interface DayRecord {
  date: string; // YYYY-MM-DD, local time
  cells: Cell[]; // always length 48, one per half-hour
  updatedAt: number; // epoch ms, used by future WebDAV sync for last-write-wins
}

export interface Reason {
  id: string;
  topic: string;
  /** 1 (mild) to 5 (severe); drives the failed box color */
  severity: number;
  createdAt: number;
  /** epoch ms of the last topic/severity edit; sync merge uses it for last-write-wins */
  updatedAt?: number;
}

export interface LifeEvent {
  id: string;
  date: string; // YYYY-MM-DD
  label: string;
  color: string; // from the palette in state.ts
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  doneAt?: number;
  /** epoch ms of the last text/done edit; sync merge uses it for last-write-wins */
  updatedAt?: number;
}

export interface Habit {
  id: string;
  name: string;
  createdAt: number;
  /** sorted YYYY-MM-DD (local time) of every day the habit was achieved */
  days: string[];
  /** epoch ms of the last rename/toggle; sync merge uses it for last-write-wins */
  updatedAt?: number;
}

/** Marks a record deleted by sync so other devices do not resurrect it. */
export interface Tombstone {
  store: 'reasons' | 'events' | 'todos' | 'habits';
  id: string;
  deletedAt: number; // epoch ms
}

export interface AppSettings {
  key: 'app';
  birthdate?: string; // YYYY-MM-DD, anchors the life view
  lifespanYears?: number; // grid length, default 90
  /** epoch ms of the last settings edit; sync merge uses it for last-write-wins */
  updatedAt?: number;
}
