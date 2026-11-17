import { db } from './db';
import { getReason, maxSeverity, severityColor, SEVERITY_MAX } from './state';
import { hidePicker, showPicker } from './picker';
import { canRedo, canUndo, onHistoryChange, popRedo, popUndo, recordChanges } from './history';
import { hideTooltip, showTooltip } from './tooltip';
import type { Cell, CellStatus, DayRecord } from './types';
import type { CellChange, HistoryEntry } from './history';
import type { TooltipContent } from './tooltip';

let root: HTMLElement;
let dateInput: HTMLInputElement;
let grid: HTMLElement;
let eraserBtn: HTMLButtonElement;
let record: DayRecord = { date: '', cells: [], updatedAt: 0 };
let currentDate = todayStr();
let eraserMode = false;
let gestureChanges: CellChange[] | null = null;
let historyChain: Promise<void> = Promise.resolve();
let nowWrap: HTMLElement;
let nowMarker: HTMLElement;
let nowLine: HTMLElement;
const timeDigits: HTMLSpanElement[] = [];
const hourLabels: HTMLDivElement[] = [];

const EMPTY_CELL: Cell = { status: 'empty', reasonIds: [] };
const mobileLayout = window.matchMedia('(max-width: 640px)');

interface DragState {
  pointerId: number;
  pointerType: string;
  startIdx: number;
  startBox: HTMLElement;
  startStatus: CellStatus;
  paint: (() => Cell) | null; // null for touch, which only taps
  paintedBeyondStart: boolean;
  lastIdx: number;
}

let drag: DragState | null = null;

export function initDayView(parent: HTMLElement): void {
  root = document.createElement('section');
  root.className = 'day-view';
  parent.append(root);

  const header = document.createElement('div');
  header.className = 'day-header';

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.textContent = '<';
  prev.title = 'Previous day';
  prev.addEventListener('click', () => void setDate(addDays(currentDate, -1)));

  dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.value = currentDate;
  dateInput.addEventListener('change', () => void setDate(dateInput.value || todayStr()));

  const today = document.createElement('button');
  today.type = 'button';
  today.textContent = 'Today';
  today.addEventListener('click', () => void setDate(todayStr()));

  const next = document.createElement('button');
  next.type = 'button';
  next.textContent = '>';
  next.title = 'Next day';
  next.addEventListener('click', () => void setDate(addDays(currentDate, 1)));

  eraserBtn = document.createElement('button');
  eraserBtn.type = 'button';
  eraserBtn.textContent = 'Eraser';
  eraserBtn.title = 'Clear boxes on click or drag';
  eraserBtn.addEventListener('click', toggleEraser);

  const undoBtn = document.createElement('button');
  undoBtn.type = 'button';
  undoBtn.textContent = 'Undo';
  undoBtn.title = 'Undo last change (Ctrl+Z)';
  undoBtn.addEventListener('click', onUndo);

  const redoBtn = document.createElement('button');
  redoBtn.type = 'button';
  redoBtn.textContent = 'Redo';
  redoBtn.title = 'Redo last undone change (Ctrl+Shift+Z)';
  redoBtn.addEventListener('click', onRedo);

  header.append(prev, dateInput, today, next, eraserBtn, undoBtn, redoBtn);
  root.append(header);

  nowWrap = document.createElement('div');
  nowWrap.className = 'now-wrap';
  nowMarker = document.createElement('div');
  nowMarker.className = 'now-marker';
  const nowTime = document.createElement('span');
  nowTime.className = 'now-time';
  const hourSpan = document.createElement('span');
  const colon1 = document.createElement('span');
  colon1.className = 'colon';
  colon1.textContent = ':';
  const minuteSpan = document.createElement('span');
  const colon2 = document.createElement('span');
  colon2.className = 'colon';
  colon2.textContent = ':';
  const secondSpan = document.createElement('span');
  nowTime.append(hourSpan, colon1, minuteSpan, colon2, secondSpan);
  timeDigits.push(hourSpan, minuteSpan, secondSpan);
  const caption = document.createElement('span');
  caption.className = 'now-caption';
  caption.textContent = 'time is running...';
  nowMarker.append(nowTime, caption);
  nowWrap.append(nowMarker);
  root.append(nowWrap);

  const gridArea = document.createElement('div');
  gridArea.className = 'now-grid-area';
  nowLine = document.createElement('div');
  nowLine.className = 'now-line';
  grid = document.createElement('div');
  grid.className = 'day-grid';
  grid.addEventListener('pointerdown', onGridPointerDown);
  grid.addEventListener('pointermove', onGridTooltipMove);
  grid.addEventListener('pointerleave', hideTooltip);
  gridArea.append(nowLine, grid);
  root.append(gridArea);

  tick();
  setInterval(tick, 1000);
  mobileLayout.addEventListener('change', renderGrid);

  const legend = document.createElement('div');
  legend.className = 'legend';
  buildLegend(legend);
  root.append(legend);

  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent =
    'Drag paints one stroke: start on an empty box to mark done, on a failed box to copy its reasons. The eraser clears. Ctrl+Z / Ctrl+Shift+Z undo / redo.';
  root.append(hint);

  const updateHistoryButtons = (): void => {
    undoBtn.disabled = !canUndo();
    redoBtn.disabled = !canRedo();
  };
  onHistoryChange(updateHistoryButtons);
  updateHistoryButtons();
  document.addEventListener('keydown', onKeyDown);

  void setDate(currentDate);
}

export function rerenderDayView(): void {
  renderGrid();
}

/** Re-fetches the shown date from the database, e.g. after backup import. */
export function reloadDayView(): void {
  void load(currentDate);
}

function toggleEraser(): void {
  eraserMode = !eraserMode;
  eraserBtn.classList.toggle('toggle-on', eraserMode);
  grid.classList.toggle('erasing', eraserMode);
}

function onKeyDown(event: KeyboardEvent): void {
  if (!(event.ctrlKey || event.metaKey)) return;
  const key = event.key.toLowerCase();
  if (key !== 'z' && key !== 'y') return;
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  event.preventDefault();
  if (key === 'z' && !event.shiftKey) onUndo();
  else onRedo();
}

function onUndo(): void {
  if (drag) return;
  const entry = popUndo();
  if (!entry) return;
  historyChain = historyChain.then(() => applyEntry(entry, 'undo'));
}

function onRedo(): void {
  if (drag) return;
  const entry = popRedo();
  if (!entry) return;
  historyChain = historyChain.then(() => applyEntry(entry, 'redo'));
}

async function applyEntry(entry: HistoryEntry, direction: 'undo' | 'redo'): Promise<void> {
  if (currentDate !== entry.date) await setDate(entry.date);
  if (currentDate !== entry.date) return; // load raced or failed
  for (const change of entry.changes) {
    record.cells[change.idx] = direction === 'undo' ? change.before : change.after;
  }
  await persistAndRender();
}

async function setDate(date: string): Promise<void> {
  currentDate = date;
  dateInput.value = date;
  await load(date);
}

async function load(date: string): Promise<void> {
  const existing = await db.getDay(date);
  if (currentDate !== date) return; // user moved on while loading
  record = existing ?? { date, cells: blankCells(), updatedAt: 0 };
  renderGrid();
}

async function persistAndRender(): Promise<void> {
  record.updatedAt = Date.now();
  await db.putDay(record);
  renderGrid();
}

function renderGrid(): void {
  if (!record.date) return;
  grid.classList.toggle('mobile', mobileLayout.matches);
  grid.replaceChildren();
  hourLabels.length = 0;
  if (mobileLayout.matches) {
    // two stacked halves: hours 0-11, then 12-23, so boxes stay big on phones
    for (let hour = 0; hour < 12; hour++) {
      const label = hourLabel(hour);
      hourLabels.push(label);
      grid.append(label);
    }
    for (let hour = 0; hour < 12; hour++) grid.append(boxCell(hour * 2));
    for (let hour = 0; hour < 12; hour++) grid.append(boxCell(hour * 2 + 1));
    for (let hour = 12; hour < 24; hour++) {
      const label = hourLabel(hour);
      hourLabels.push(label);
      grid.append(label);
    }
    for (let hour = 12; hour < 24; hour++) grid.append(boxCell(hour * 2));
    for (let hour = 12; hour < 24; hour++) grid.append(boxCell(hour * 2 + 1));
  } else {
    // row 1: hour labels, row 2: :00 half-hours, row 3: :30 half-hours
    for (let hour = 0; hour < 24; hour++) {
      const label = hourLabel(hour);
      hourLabels.push(label);
      grid.append(label);
    }
    for (let hour = 0; hour < 24; hour++) grid.append(boxCell(hour * 2));
    for (let hour = 0; hour < 24; hour++) grid.append(boxCell(hour * 2 + 1));
  }
  updateHourLabelShading();
  nowWrap.classList.toggle('hidden', currentDate !== todayStr());
}

function tick(): void {
  const now = new Date();
  timeDigits[0].textContent = pad2(now.getHours());
  timeDigits[1].textContent = pad2(now.getMinutes());
  timeDigits[2].textContent = pad2(now.getSeconds());
  const isToday = currentDate === todayStr();
  nowWrap.classList.toggle('hidden', !isToday);
  if (!isToday) return;
  const daySeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  setNowPosition((daySeconds / 86400) * 100, true);
  updateHourLabelShading();
}

function setNowPosition(pct: number, animate: boolean): void {
  const shift = pct < 8 ? 0 : pct > 92 ? -100 : -50;
  nowMarker.style.transition = animate ? 'left 1s linear' : 'none';
  nowLine.style.transition = nowMarker.style.transition;
  nowMarker.style.left = `${pct}%`;
  nowLine.style.left = `${pct}%`;
  nowMarker.style.transform = `translateX(${shift}%)`;
}

function updateHourLabelShading(): void {
  const isToday = currentDate === todayStr();
  const currentHour = new Date().getHours();
  for (let hour = 0; hour < hourLabels.length; hour++) {
    hourLabels[hour].classList.toggle('past', isToday && hour < currentHour);
    hourLabels[hour].classList.toggle('current', isToday && hour === currentHour);
  }
}

function hourLabel(hour: number): HTMLDivElement {
  const label = document.createElement('div');
  label.className = 'grid-label';
  label.textContent = pad2(hour);
  return label;
}

function boxCell(idx: number): HTMLDivElement {
  const cell = record.cells[idx];
  const box = document.createElement('div');
  box.className = `box ${cell.status}`;
  box.dataset.idx = String(idx);
  const info = dayTooltipData(idx, cell);
  box.setAttribute('aria-label', [info.main, info.sub, info.note].filter(Boolean).join(' - '));
  if (cell.status === 'failed') {
    const severity = maxSeverity(cell.reasonIds);
    if (severity > 0) box.style.background = severityColor(severity);
  }
  return box;
}

/** Mutate one cell; no-op when identical. Records into the active gesture batch. */
function applyCell(idx: number, next: Cell): boolean {
  const before = record.cells[idx];
  if (cellsEqual(before, next)) return false;
  record.cells[idx] = next;
  gestureChanges?.push({ idx, before, after: next });
  return true;
}

/** One-shot change outside a drag gesture (picker apply, touch tap). */
function applySingle(idx: number, next: Cell): void {
  gestureChanges = [];
  applyCell(idx, next);
  finishGesture(true);
}

function finishGesture(persist: boolean): void {
  const batch = gestureChanges;
  gestureChanges = null;
  if (batch && batch.length > 0) {
    recordChanges(currentDate, batch);
    if (persist) void persistAndRender();
  }
}

function onGridPointerDown(event: PointerEvent): void {
  hidePicker();
  hideTooltip();
  if (drag) return;
  if (event.pointerType !== 'touch' && event.button !== 0) return;
  const box = boxAt(event.clientX, event.clientY);
  if (!box) return;
  const idx = Number(box.dataset.idx);
  const cell = record.cells[idx];
  if (!cell) return;

  const state: DragState = {
    pointerId: event.pointerId,
    pointerType: event.pointerType,
    startIdx: idx,
    startBox: box,
    startStatus: cell.status,
    paint: null,
    paintedBeyondStart: false,
    lastIdx: idx,
  };

  if (event.pointerType !== 'touch') {
    gestureChanges = [];
    if (eraserMode) {
      state.paint = () => EMPTY_CELL;
    } else if (cell.status === 'failed') {
      const sourceIds = [...cell.reasonIds];
      const note = cell.note;
      state.paint = () => ({ status: 'failed', reasonIds: [...sourceIds], note });
    } else {
      // empty or done: paint done, starting with the box under the pointer
      state.paint = () => ({ status: 'done', reasonIds: [] });
    }
    if (applyCell(idx, state.paint())) renderGrid();
  }

  drag = state;
  document.addEventListener('pointermove', onDocumentPointerMove);
  document.addEventListener('pointerup', onDocumentPointerUp);
  document.addEventListener('pointercancel', onDocumentPointerCancel);
  try {
    grid.setPointerCapture(event.pointerId);
  } catch {
    // pointer already gone; document listeners still end the gesture
  }
}

function onDocumentPointerMove(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId || !drag.paint) return;
  const box = boxAt(event.clientX, event.clientY);
  if (!box) return;
  const idx = Number(box.dataset.idx);
  if (idx === drag.lastIdx) return;
  drag.lastIdx = idx;
  if (idx !== drag.startIdx) drag.paintedBeyondStart = true;
  const paint = drag.paint;
  if (applyCell(idx, paint())) renderGrid();
}

function onDocumentPointerUp(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const state = drag;
  detachDragListeners();
  drag = null;

  if (state.pointerType === 'touch') {
    if (eraserMode) {
      applySingle(state.startIdx, EMPTY_CELL);
    } else if (state.startStatus === 'empty') {
      applySingle(state.startIdx, { status: 'done', reasonIds: [] });
    } else {
      openPickerFor(state.startBox, state.startIdx);
    }
    return;
  }

  finishGesture(true);
  if (!state.paintedBeyondStart && !eraserMode && state.startStatus !== 'empty') {
    openPickerFor(state.startBox, state.startIdx);
  }
}

function onDocumentPointerCancel(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId) return;
  detachDragListeners();
  drag = null;
  finishGesture(true);
}

function detachDragListeners(): void {
  document.removeEventListener('pointermove', onDocumentPointerMove);
  document.removeEventListener('pointerup', onDocumentPointerUp);
  document.removeEventListener('pointercancel', onDocumentPointerCancel);
}

function openPickerFor(box: HTMLElement, idx: number): void {
  const cell = record.cells[idx];
  if (!cell || cell.status === 'empty') return;
  showPicker(box, blockRange(idx), cell, {
    onApply: (reasonIds, note) => {
      applySingle(idx, { status: 'failed', reasonIds, note });
    },
    onClear: () => {
      applySingle(idx, EMPTY_CELL);
    },
  });
}

function boxAt(x: number, y: number): HTMLElement | null {
  const el = document.elementFromPoint(x, y);
  if (!(el instanceof Element)) return null;
  const box = el.closest('.box');
  return box instanceof HTMLElement ? box : null;
}

function cellsEqual(a: Cell, b: Cell): boolean {
  if (a.status !== b.status || a.note !== b.note || a.reasonIds.length !== b.reasonIds.length) return false;
  for (let i = 0; i < a.reasonIds.length; i++) {
    if (a.reasonIds[i] !== b.reasonIds[i]) return false;
  }
  return true;
}

function buildLegend(container: HTMLElement): void {
  const items: Array<[string, string]> = [
    ['var(--empty)', 'empty'],
    ['var(--done)', 'done'],
  ];
  for (const [color, text] of items) {
    const item = document.createElement('span');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = color;
    item.append(dot, document.createTextNode(text));
    container.append(item);
  }

  const failedItem = document.createElement('span');
  for (let s = 1; s <= SEVERITY_MAX; s++) {
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = severityColor(s);
    failedItem.append(dot);
  }
  failedItem.append(document.createTextNode(`failed: severity 1-${SEVERITY_MAX}`));
  container.append(failedItem);
}

function blankCells(): Cell[] {
  return Array.from({ length: 48 }, () => ({ ...EMPTY_CELL }));
}

function onGridTooltipMove(event: PointerEvent): void {
  if (event.pointerType === 'touch') return;
  if (drag) {
    hideTooltip();
    return;
  }
  const box = event.target instanceof Element ? event.target.closest('.box') : null;
  if (!(box instanceof HTMLElement)) {
    hideTooltip();
    return;
  }
  const idx = Number(box.dataset.idx);
  const cell = record.cells[idx];
  if (!cell) return;
  const key = `${idx}|${cell.status}|${cell.reasonIds.join(',')}|${cell.note ?? ''}`;
  showTooltip(dayTooltipData(idx, cell), event.clientX, event.clientY, key);
}

function dayTooltipData(idx: number, cell: Cell): TooltipContent {
  const time = blockRange(idx);
  if (cell.status === 'done') return { main: time, sub: 'done' };
  if (cell.status === 'failed') {
    const topics = cell.reasonIds.map((id) => getReason(id)?.topic ?? 'unknown reason');
    return { main: time, sub: topics.length > 0 ? topics.join(', ') : 'unknown reason', note: cell.note };
  }
  return { main: time };
}

function blockRange(idx: number): string {
  return `${blockStart(idx)} - ${blockStart((idx + 1) % 48)}`;
}

function blockStart(idx: number): string {
  return `${pad2(Math.floor(idx / 2))}:${idx % 2 === 0 ? '00' : '30'}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function addDays(date: string, delta: number): string {
  const parts = date.split('-');
  const result = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) + delta);
  return `${result.getFullYear()}-${pad2(result.getMonth() + 1)}-${pad2(result.getDate())}`;
}
