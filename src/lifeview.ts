import { getEvents, getSettings, onEventsChange, onSettingsChange } from './state';
import { EVENT_COLORS } from './state';
import { hideTooltip, showTooltip } from './tooltip';
import type { TooltipContent } from './tooltip';
import type { LifeEvent } from './types';

let bodyEl: HTMLElement;
let summaryEl: HTMLElement;
let gridEl: HTMLElement;
let toggleBtn: HTMLButtonElement;
let lastEventByWeek: Map<number, LifeEvent> | null = null;

const mobileLayout = window.matchMedia('(max-width: 640px)');

export function initLifeView(parent: HTMLElement): void {
  const section = document.createElement('section');
  section.className = 'life-view';

  const head = document.createElement('div');
  head.className = 'life-head';
  const h2 = document.createElement('h2');
  h2.textContent = 'Your life in weeks';
  toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.textContent = 'hide';
  toggleBtn.addEventListener('click', () => {
    const hidden = bodyEl.classList.toggle('hidden');
    toggleBtn.textContent = hidden ? 'show' : 'hide';
  });
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

  bodyEl.append(summaryEl, legend, gridEl);
  section.append(head, bodyEl);
  parent.append(section);

  onSettingsChange(render);
  onEventsChange(render);
  mobileLayout.addEventListener('change', render);
  render();
}

function render(): void {
  gridEl.classList.toggle('mobile', mobileLayout.matches);
  gridEl.replaceChildren();
  const { birthdate, lifespanYears } = getSettings();
  if (!birthdate) {
    summaryEl.textContent = 'Set your birthday in Settings to see your life in weeks.';
    gridEl.classList.add('hidden');
    return;
  }
  gridEl.classList.remove('hidden');

  const lifespan = Math.min(120, Math.max(40, Math.round(lifespanYears ?? 90)));
  const birthParts = birthdate.split('-');
  const birthUTC = Date.UTC(Number(birthParts[0]), Number(birthParts[1]) - 1, Number(birthParts[2]));
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const daysSince = Math.floor((todayUTC - birthUTC) / 86400000);
  const currentWeek = Math.floor(daysSince / 7);
  const currentRow = Math.floor(daysSince / 365.25);
  const total = lifespan * 52;

  const eventByWeek = new Map<number, LifeEvent>();
  for (const event of getEvents()) {
    const parts = event.date.split('-');
    const idx = Math.floor((Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) - birthUTC) / 86400000 / 7);
    if (idx >= 0 && idx < total && !eventByWeek.has(idx)) eventByWeek.set(idx, event);
  }
  lastEventByWeek = eventByWeek;

  if (daysSince < 0) {
    summaryEl.textContent = 'Birthday is in the future.';
  } else if (currentWeek >= total) {
    summaryEl.textContent = `Beyond the ${lifespan}-year grid - age ${Math.floor(daysSince / 365.25)}.`;
  } else {
    summaryEl.textContent = `week ${currentWeek + 1} of ${total} - age ${Math.floor(daysSince / 365.25)}`;
  }

  if (mobileLayout.matches) {
    // two rows per year: first half of the year on top, second half below
    for (let year = 0; year < lifespan; year++) {
      gridEl.append(ageLabel(year, currentRow));
      for (let week = 0; week < 26; week++) gridEl.append(weekBox(year * 52 + week, currentWeek, eventByWeek));
      for (let week = 26; week < 52; week++) gridEl.append(weekBox(year * 52 + week, currentWeek, eventByWeek));
    }
  } else {
    for (let year = 0; year < lifespan; year++) {
      gridEl.append(ageLabel(year, currentRow));
      for (let week = 0; week < 52; week++) gridEl.append(weekBox(year * 52 + week, currentWeek, eventByWeek));
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

function weekBox(idx: number, currentWeek: number, eventByWeek: Map<number, LifeEvent>): HTMLDivElement {
  const box = document.createElement('div');
  box.className = 'life-box';
  box.dataset.week = String(idx);
  const event = eventByWeek.get(idx);
  if (idx === currentWeek) box.classList.add('now');
  const info = lifeTooltipData(idx, event);
  box.setAttribute('aria-label', [info.main, info.sub].filter(Boolean).join(' - '));
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
