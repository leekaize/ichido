export interface TooltipContent {
  main: string;
  sub?: string;
  note?: string;
}

let tip: HTMLElement | null = null;
let lastKey = '';

/** Cursor-following tooltip; same key skips DOM rebuilds, edges flip the box. */
export function showTooltip(content: TooltipContent, x: number, y: number, key: string): void {
  const el = ensureTip();
  if (key !== lastKey) {
    el.replaceChildren();
    const main = document.createElement('div');
    main.className = 'tt-main';
    main.textContent = content.main;
    el.append(main);
    if (content.sub) {
      const sub = document.createElement('div');
      sub.className = 'tt-sub';
      sub.textContent = content.sub;
      el.append(sub);
    }
    if (content.note) {
      const note = document.createElement('div');
      note.className = 'tt-note';
      note.textContent = content.note;
      el.append(note);
    }
    lastKey = key;
  }
  position(el, x, y);
}

export function hideTooltip(): void {
  if (tip) tip.remove();
  tip = null;
  lastKey = '';
}

function ensureTip(): HTMLElement {
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'tooltip';
    document.body.append(tip);
  }
  return tip;
}

function position(el: HTMLElement, x: number, y: number): void {
  const width = el.offsetWidth;
  const height = el.offsetHeight;
  let left = x + 14;
  let top = y + 16;
  if (left + width > window.innerWidth - 8) left = x - width - 14;
  if (top + height > window.innerHeight - 8) top = y - height - 16;
  el.style.left = `${Math.max(8, left)}px`;
  el.style.top = `${Math.max(8, top)}px`;
}
