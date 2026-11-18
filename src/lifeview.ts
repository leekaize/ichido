import { getEvents, getSettings, onEventsChange, onSettingsChange } from './state';
import { EVENT_COLORS } from './state';
import { openBirthdayModal } from './birthdaymodal';
import { hideTooltip, showTooltip } from './tooltip';
import type { TooltipContent } from './tooltip';
import type { LifeEvent } from './types';

let sectionEl: HTMLElement;
let bodyEl: HTMLElement;
let summaryEl: HTMLElement;
let gridEl: HTMLElement;
let toggleBtn: HTMLButtonElement;
let rowEl: HTMLElement | null = null;
let expanded = false;
let lastEventByWeek: Map<number, LifeEvent> | null = null;

// shown before the user sets a real birthday so the section is never blank
const EXAMPLE_BIRTHDATE = '1990-01-01';

const mobileLayout = window.matchMedia('(max-width: 640px)');

export function initLifeView(parent: HTMLElement): void {
  rowEl = parent;
  const section = document.createElement('section');
  section.className = 'life-view';
  sectionEl = section;

  const head = document.createElement('div');
  head.className = 'life-head';
  const h2 = document.createElement('h2');
  h2.textContent = 'Your life in weeks';
  toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.textContent = 'expand';
  toggleBtn.addEventListener('click', () => setExpanded(!expanded));
  head.append(h2, toggleBtn);

  bodyEl = document.createElement('div');
  bodyEl.className = 'life-body';

  summaryEl = document.createElement('div');
  summaryEl.className = 'life-summary';

  const legend = document.createElement('div');
  legend.className = 'life-legend';
  legend.append(
    legendItem('var(--empty)', 'past'),
    legendItem('var(--empty)', 'future', '0.45'),
    legendItem('var(--accent)', 'this week'),
    legendItem(EVENT_COLORS[0], 'events'),
  );

  gridEl = document.createElement('div');
  gridEl.className = 'life-grid';
  gridEl.addEventListener('pointermove', onLifeTooltipMove);
  gridEl.addEventListener('pointerleave', hideTooltip);
  gridEl.addEventListener('click', () => {
    if (!expanded) setExpanded(true);
  });

  bodyEl.append(summaryEl, legend, gridEl);
  section.append(head, bodyEl);
  parent.append(section);

  onSettingsChange(render);
  onEventsChange(render);
  mobileLayout.addEventListener('change', render);
  render();
}

function setExpanded(value: boolean): void {
  expanded = value;
  sectionEl.classList.toggle('expanded', value);
  rowEl?.classList.toggle('life-expanded', value);
  toggleBtn.textContent = value ? 'collapse' : 'expand';
  hideTooltip();
  render();
}

function render(): void {
  gridEl.classList.toggle('mobile', expanded && mobileLayout.matches);
  gridEl.replaceChildren();
  const { birthdate, lifespanYears } = getSettings();
  const isExample = !birthdate;
  const birth = birthdate ?? EXAMPLE_BIRTHDATE;

  const lifespan = Math.min(120, Math.max(40, Math.round(lifespanYears ?? 90)));
  const birthParts = birth.split('-');
  const birthUTC = Date.UTC(Number(birthParts[0]), Number(birthParts[1]) - 1, Number(birthParts[2]));
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const daysSince = Math.floor((todayUTC - birthUTC) / 86400000);
  const currentWeek = Math.floor(daysSince / 7);
  const currentRow = Math.floor(daysSince / 365.25);
  const total = lifespan * 52;
  const age = Math.floor(daysSince / 365.25);

  const eventByWeek = new Map<number, LifeEvent>();
  if (!isExample) {
    for (const event of getEvents()) {
      const parts = event.date.split('-');
      const idx = Math.floor((Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) - birthUTC) / 86400000 / 7);
      if (idx >= 0 && idx < total && !eventByWeek.has(idx)) eventByWeek.set(idx, event);
    }
  }
  lastEventByWeek = eventByWeek;

  summaryEl.replaceChildren();
  if (!isExample && daysSince < 0) {
    summaryEl.textContent = 'Birthday is in the future.';
  } else if (!isExample && currentWeek >= total) {
    summaryEl.textContent = `Beyond the ${lifespan}-year grid - age ${age}.`;
  } else if (isExample) {
    summaryEl.append(document.createTextNode(`example - week ${currentWeek + 1} of ${total} - age ${age}`));
    const setBtn = document.createElement('button');
    setBtn.type = 'button';
    setBtn.className = 'life-set-birthday';
    setBtn.textContent = 'set your birthday';
    setBtn.addEventListener('click', openBirthdayModal);
    summaryEl.append(setBtn);
  } else {
    summaryEl.textContent = `week ${currentWeek + 1} of ${total} - age ${age}`;
  }

  if (!expanded) {
    // mini: static 52-column snapshot at a fixed small size, same shape on every screen
    // no age labels here; 3px rows cannot hold them and the summary line carries the age
    for (let week = 0; week < total; week++) {
      gridEl.append(weekBox(week, currentWeek, eventByWeek, false));
    }
  } else if (mobileLayout.matches) {
    // two rows per year: first half of the year on top, second half below
    for (let year = 0; year < lifespan; year++) {
      gridEl.append(ageLabel(year, currentRow));
      for (let week = 0; week < 26; week++) gridEl.append(weekBox(year * 52 + week, currentWeek, eventByWeek, true));
      for (let week = 26; week < 52; week++) gridEl.append(weekBox(year * 52 + week, currentWeek, eventByWeek, true));
    }
  } else {
    for (let year = 0; year < lifespan; year++) {
      gridEl.append(ageLabel(year, currentRow));
      for (let week = 0; week < 52; week++) gridEl.append(weekBox(year * 52 + week, currentWeek, eventByWeek, true));
    }
  }
}

function ageLabel(row: number, currentRow: number): HTMLDivElement {
  const label = document.createElement('div');
  label.className = 'life-age';
  if (row % 10 === 0) {
    label.textContent = String(row);
    if (currentRow >= row && currentRow < row + 10) label.classList.add('current');
  }
  return label;
}

function weekBox(idx: number, currentWeek: number, eventByWeek: Map<number, LifeEvent>, detailed: boolean): HTMLDivElement {
  const box = document.createElement('div');
  box.className = 'life-box';
  box.dataset.week = String(idx);
  const event = eventByWeek.get(idx);
  if (idx === currentWeek) box.classList.add('now');
  if (detailed) {
    const info = lifeTooltipData(idx, event);
    box.setAttribute('aria-label', [info.main, info.sub].filter(Boolean).join(' - '));
  }
  if (event) {
    box.classList.add('event');
    box.style.background = event.color;
  } else {
    if (idx < currentWeek) box.classList.add('past');
    else if (idx > currentWeek) box.classList.add('future');
  }
  return box;
}

function onLifeTooltipMove(event: PointerEvent): void {
  if (!expanded) return;
  if (event.pointerType === 'touch') return;
  const box = event.target instanceof Element ? event.target.closest('.life-box') : null;
  if (!(box instanceof HTMLElement) || !lastEventByWeek) {
    hideTooltip();
    return;
  }
  const idx = Number(box.dataset.week);
  if (!Number.isInteger(idx)) {
    hideTooltip();
    return;
  }
  const lifeEvent = lastEventByWeek.get(idx);
  const key = `${idx}|${lifeEvent?.id ?? ''}`;
  showTooltip(lifeTooltipData(idx, lifeEvent), event.clientX, event.clientY, key);
}

function lifeTooltipData(idx: number, lifeEvent: LifeEvent | undefined): TooltipContent {
  if (lifeEvent) return { main: lifeEvent.label, sub: `${lifeEvent.date} - week ${idx + 1}` };
  return { main: `week ${idx + 1}`, sub: `age ${Math.floor(idx / 52)}` };
}

function legendItem(color: string, text: string, opacity?: string): HTMLSpanElement {
  const item = document.createElement('span');
  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.style.background = color;
  if (opacity) dot.style.opacity = opacity;
  item.append(dot, document.createTextNode(text));
  return item;
}
