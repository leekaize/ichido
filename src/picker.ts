import { getReasons, severityColor } from './state';
import type { Cell } from './types';

export interface PickerCallbacks {
  onApply: (reasonIds: string[], note: string) => void;
  onClear: () => void;
}

let picker: HTMLElement | null = null;
let outsideHandler: ((event: MouseEvent) => void) | null = null;
let keyHandler: ((event: KeyboardEvent) => void) | null = null;

export function showPicker(anchor: HTMLElement, label: string, cell: Cell, callbacks: PickerCallbacks): void {
  hidePicker();

  const selected = new Set<string>(cell.status === 'failed' ? [...cell.reasonIds] : []);

  picker = document.createElement('div');
  picker.className = 'picker';

  const title = document.createElement('div');
  title.className = 'picker-title';
  title.textContent = cell.status === 'failed' ? label : `${label} - done`;

  const reasonButtons = document.createDocumentFragment();
  for (const reason of getReasons()) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'reason-btn';
    if (selected.has(reason.id)) btn.classList.add('active');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = severityColor(reason.severity);
    const topic = document.createElement('span');
    topic.textContent = reason.topic;
    btn.append(dot, topic);
    btn.addEventListener('click', () => {
      if (selected.has(reason.id)) {
        selected.delete(reason.id);
        btn.classList.remove('active');
      } else {
        selected.add(reason.id);
        btn.classList.add('active');
      }
      apply.disabled = selected.size === 0;
      apply.title = apply.disabled ? 'pick at least one reason' : '';
    });
    reasonButtons.append(btn);
  }

  const noteRow = document.createElement('div');
  noteRow.className = 'picker-note-row';
  const noteInput = document.createElement('input');
  noteInput.type = 'text';
  noteInput.placeholder = 'note (optional)';
  noteInput.value = cell.note ?? '';
  noteRow.append(noteInput);

  const actions = document.createElement('div');
  actions.className = 'picker-actions';
  const apply = document.createElement('button');
  apply.type = 'button';
  apply.textContent = cell.status === 'failed' ? 'Save' : 'Mark failed';
  apply.disabled = selected.size === 0;
  if (apply.disabled) apply.title = 'pick at least one reason';
  apply.addEventListener('click', () => {
    hidePicker();
    callbacks.onApply([...selected], noteInput.value);
  });
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.textContent = 'Clear block';
  clear.addEventListener('click', () => {
    hidePicker();
    callbacks.onClear();
  });
  actions.append(apply, clear);

  noteInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !apply.disabled) apply.click();
  });

  picker.append(title, reasonButtons, noteRow, actions);

  outsideHandler = (event: MouseEvent) => {
    if (picker && event.target instanceof Node && !picker.contains(event.target)) {
      hidePicker();
    }
  };
  keyHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape') hidePicker();
  };
  document.addEventListener('mousedown', outsideHandler);
  document.addEventListener('keydown', keyHandler);

  picker.style.visibility = 'hidden';
  document.body.append(picker);
  const width = picker.offsetWidth;
  const height = picker.offsetHeight;
  const rect = anchor.getBoundingClientRect();
  let left = rect.left;
  if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
  let top = rect.bottom + 4;
  if (top + height > window.innerHeight - 8) top = rect.top - height - 4;
  picker.style.left = `${Math.max(8, left)}px`;
  picker.style.top = `${Math.max(8, top)}px`;
  picker.style.visibility = '';
}

export function hidePicker(): void {
  if (!picker) return;
  if (outsideHandler) document.removeEventListener('mousedown', outsideHandler);
  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  outsideHandler = null;
  keyHandler = null;
  picker.remove();
  picker = null;
}
