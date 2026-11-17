import type { Cell } from './types';

export interface CellChange {
  idx: number;
  before: Cell;
  after: Cell;
}

export interface HistoryEntry {
  date: string;
  changes: CellChange[];
}

const MAX_ENTRIES = 200;

let undoStack: HistoryEntry[] = [];
let redoStack: HistoryEntry[] = [];

type Listener = () => void;
const listeners: Listener[] = [];

export function onHistoryChange(fn: Listener): void {
  listeners.push(fn);
}

function emit(): void {
  for (const fn of listeners) fn();
}

/** One user gesture becomes one entry; a new action discards the redo branch. */
export function recordChanges(date: string, changes: CellChange[]): void {
  if (changes.length === 0) return;
  undoStack.push({ date, changes });
  if (undoStack.length > MAX_ENTRIES) undoStack.shift();
  redoStack = [];
  emit();
}

export function popUndo(): HistoryEntry | undefined {
  const entry = undoStack.pop();
  if (entry) {
    redoStack.push(entry);
    emit();
  }
  return entry;
}

export function popRedo(): HistoryEntry | undefined {
  const entry = redoStack.pop();
  if (entry) {
    undoStack.push(entry);
    emit();
  }
  return entry;
}

/** A bulk change such as backup import invalidates past entries. */
export function clear(): void {
  undoStack = [];
  redoStack = [];
  emit();
}

export function canUndo(): boolean {
  return undoStack.length > 0;
}

export function canRedo(): boolean {
  return redoStack.length > 0;
}
