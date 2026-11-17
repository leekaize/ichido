import { addEvent, EVENT_COLORS, getEvents, onEventsChange, removeEvent, updateEvent } from './state';
import { startInlineEdit } from './inlineedit';

let panel: HTMLElement;
let listEl: HTMLElement;
let selectedColor = EVENT_COLORS[0];

export function initEventsPanel(parent: HTMLElement): void {
  panel = document.createElement('aside');
  panel.className = 'side-panel hidden';

  const head = document.createElement('div');
  head.className = 'panel-head';
  const h2 = document.createElement('h2');
  h2.textContent = 'Life events';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'x';
  close.addEventListener('click', toggleEventsPanel);
  head.append(h2, close);

  listEl = document.createElement('div');
  listEl.className = 'reason-list';

  const form = document.createElement('form');
  form.className = 'events-form';

  const swatches = document.createElement('div');
  swatches.className = 'swatches';
  for (const color of EVENT_COLORS) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'swatch';
    swatch.style.background = color;
    swatch.dataset.color = color;
    if (color === selectedColor) swatch.classList.add('selected');
    swatch.title = 'event color';
    swatch.addEventListener('click', () => {
      selectedColor = color;
      for (const child of swatches.children) {
        child.classList.toggle('selected', (child as HTMLElement).dataset.color === color);
      }
    });
    swatches.append(swatch);
  }

  const labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.placeholder = 'event label';
  labelInput.maxLength = 60;
  labelInput.required = true;

  const formRow = document.createElement('div');
  formRow.className = 'form-row';
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.required = true;
  const add = document.createElement('button');
  add.type = 'submit';
  add.textContent = 'Add';
  formRow.append(dateInput, add);

  form.append(swatches, labelInput, formRow);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void addEvent(labelInput.value, dateInput.value, selectedColor);
    labelInput.value = '';
    dateInput.value = '';
  });

  panel.append(head, listEl, form);
  parent.append(panel);
  onEventsChange(refreshList);
}

export function toggleEventsPanel(): void {
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) void refreshList();
}

export function closePanel(): void {
  panel.classList.add('hidden');
}

async function refreshList(): Promise<void> {
  listEl.replaceChildren();

  for (const event of getEvents()) {
    const row = document.createElement('div');
    row.className = 'reason-row';

    const dot = document.createElement('span');
    dot.className = 'dot clickable';
    dot.style.background = event.color;
    dot.title = 'Click to change color';
    dot.addEventListener('click', () => {
      const index = EVENT_COLORS.indexOf(event.color);
      const next = EVENT_COLORS[(index + 1) % EVENT_COLORS.length];
      void updateEvent(event.id, { color: next });
    });

    const label = document.createElement('span');
    label.className = 'topic editable';
    label.textContent = event.label;
    label.title = 'Click to rename';
    label.addEventListener('click', () => {
      startInlineEdit(label, event.label, {
        maxLength: 60,
        commit: (value) => {
          if (value.trim() !== '') void updateEvent(event.id, { label: value });
          else void refreshList();
        },
        cancel: () => {
          void refreshList();
        },
      });
    });

    const date = document.createElement('span');
    date.className = 'count editable';
    date.textContent = event.date;
    date.title = 'Click to change date';
    date.addEventListener('click', () => {
      startInlineEdit(date, event.date, {
        type: 'date',
        commit: (value) => {
          if (value !== '') void updateEvent(event.id, { date: value });
          else void refreshList();
        },
        cancel: () => {
          void refreshList();
        },
      });
    });

    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = 'x';
    del.title = 'Delete event';
    del.addEventListener('click', () => {
      void removeEvent(event.id);
    });

    row.append(dot, label, date, del);
    listEl.append(row);
  }

  if (getEvents().length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No events yet. Add one below.';
    listEl.append(empty);
  }
}
