import { addHabit, getHabits, habitStreak, habitStrength, localDateStr, onHabitsChange, removeHabit, renameHabit, toggleHabitToday } from './state';
import { startInlineEdit } from './inlineedit';

const MAX_NAME = 80;

let listEl: HTMLElement;
let input: HTMLInputElement;

export function initHabitTracker(parent: HTMLElement): void {
  const section = document.createElement('section');
  section.className = 'habits';

  const addRow = document.createElement('div');
  addRow.className = 'habits-add';
  const label = document.createElement('span');
  label.className = 'habits-label';
  label.textContent = 'habits';
  const form = document.createElement('form');
  form.className = 'habits-form';
  input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'add habit';
  input.maxLength = MAX_NAME;
  form.append(input);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void addHabit(input.value);
    input.value = '';
  });
  addRow.append(label, form);

  listEl = document.createElement('div');
  listEl.className = 'habits-list';

  section.append(addRow, listEl);
  parent.append(section);
  onHabitsChange(refresh);
  refresh();
}

function refresh(): void {
  listEl.replaceChildren();
  const today = localDateStr(new Date());

  for (const habit of getHabits()) {
    const achieved = habit.days.includes(today);
    const strength = habitStrength(habit, today);
    const streak = habitStreak(habit, today);

    const box = document.createElement('div');
    box.className = achieved ? 'habit-box achieved' : 'habit-box';
    box.title = achieved ? 'Achieved today, click to cancel' : 'Mark as achieved today';

    const top = document.createElement('div');
    top.className = 'habit-top';

    const name = document.createElement('span');
    name.className = 'habit-name';
    name.textContent = habit.name;
    name.title = 'Click to rename';
    name.addEventListener('click', (event) => {
      event.stopPropagation();
      startInlineEdit(name, habit.name, {
        maxLength: MAX_NAME,
        commit: (value) => {
          if (value.trim() !== '') void renameHabit(habit.id, value);
          else void refresh();
        },
        cancel: () => {
          void refresh();
        },
      });
    });

    const streakEl = document.createElement('span');
    streakEl.className = 'habit-streak';
    streakEl.textContent = `${streak}d`;
    streakEl.title = `Current streak: ${streak} day${streak === 1 ? '' : 's'}`;

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'habit-del';
    del.textContent = 'x';
    del.title = 'Delete habit and its history';
    del.addEventListener('click', (event) => {
      event.stopPropagation();
      void removeHabit(habit.id);
    });

    top.append(name, streakEl, del);

    const track = document.createElement('div');
    track.className = 'habit-track';
    track.title = `Strength: ${strength}% over the last 30 days`;
    const fill = document.createElement('div');
    fill.className = 'habit-fill';
    fill.style.width = `${strength}%`;
    // red when weak, green when strong
    fill.style.background = `hsl(${Math.round(strength * 1.2)}, 70%, 45%)`;
    track.append(fill);

    box.append(top, track);
    box.addEventListener('click', () => void toggleHabitToday(habit.id));
    listEl.append(box);
  }
}
