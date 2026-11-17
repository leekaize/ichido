import {
  addReason,
  countFailedByReason,
  getReasons,
  onReasonsChange,
  removeReason,
  SEVERITY_MAX,
  setReasonSeverity,
  severityColor,
  updateReasonTopic,
} from './state';
import { startInlineEdit } from './inlineedit';

let panel: HTMLElement;
let listEl: HTMLElement;

export function initReasonsPanel(parent: HTMLElement): void {
  panel = document.createElement('aside');
  panel.className = 'side-panel hidden';

  const head = document.createElement('div');
  head.className = 'panel-head';
  const h2 = document.createElement('h2');
  h2.textContent = 'Failure reasons';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'x';
  close.addEventListener('click', toggleReasonsPanel);
  head.append(h2, close);

  const sevLegend = document.createElement('div');
  sevLegend.className = 'sev-legend';
  sevLegend.append(document.createTextNode('mild'));
  for (let s = 1; s <= SEVERITY_MAX; s++) {
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = severityColor(s);
    sevLegend.append(dot);
  }
  sevLegend.append(document.createTextNode('severe'));

  listEl = document.createElement('div');
  listEl.className = 'reason-list';

  const form = document.createElement('form');
  form.className = 'reasons-form';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'new reason topic';
  input.maxLength = 40;
  const add = document.createElement('button');
  add.type = 'submit';
  add.textContent = 'Add';
  form.append(input, add);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void addReason(input.value);
    input.value = '';
  });

  panel.append(head, sevLegend, listEl, form);
  parent.append(panel);
  onReasonsChange(refreshList);
}

export function toggleReasonsPanel(): void {
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) void refreshList();
}

export function closePanel(): void {
  panel.classList.add('hidden');
}

async function refreshList(): Promise<void> {
  const counts = await countFailedByReason();
  listEl.replaceChildren();

  for (const reason of getReasons()) {
    const row = document.createElement('div');
    row.className = 'reason-row';

    const sevGroup = document.createElement('div');
    sevGroup.className = 'sev-group';
    for (let s = 1; s <= SEVERITY_MAX; s++) {
      const square = document.createElement('button');
      square.type = 'button';
      square.className = 'sev-square';
      if (s === reason.severity) square.classList.add('current');
      square.style.background = severityColor(s);
      square.title = `severity ${s} of ${SEVERITY_MAX}`;
      square.addEventListener('click', () => {
        void setReasonSeverity(reason.id, s);
      });
      sevGroup.append(square);
    }

    const topic = document.createElement('span');
    topic.className = 'topic editable';
    topic.textContent = reason.topic;
    topic.title = 'Click to rename';
    topic.addEventListener('click', () => {
      startInlineEdit(topic, reason.topic, {
        maxLength: 40,
        commit: (value) => {
          void updateReasonTopic(reason.id, value);
        },
        cancel: () => {
          void refreshList();
        },
      });
    });

    const n = counts.get(reason.id) ?? 0;
    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = String(n);
    count.title = n === 1 ? '1 failed block' : `${n} failed blocks`;

    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = 'x';
    del.disabled = n > 0;
    if (n > 0) del.title = 'Reason has failed blocks and cannot be deleted';
    del.addEventListener('click', () => {
      void removeReason(reason.id);
    });

    row.append(sevGroup, topic, count, del);
    listEl.append(row);
  }

  if (getReasons().length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No reasons yet. Add one below.';
    listEl.append(empty);
  }
}
