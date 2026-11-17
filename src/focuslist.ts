import { addTodo, clearDoneTodos, getTodos, onTodosChange, removeTodo, sortedTodos, toggleTodo, updateTodoText } from './state';
import { startInlineEdit } from './inlineedit';

const MAX_TEXT = 80;

let listEl: HTMLElement;
let clearBtn: HTMLButtonElement;

export function initFocusList(parent: HTMLElement): void {
  const section = document.createElement('section');
  section.className = 'focus';

  const addRow = document.createElement('div');
  addRow.className = 'focus-add';
  const label = document.createElement('span');
  label.className = 'focus-label';
  label.textContent = 'focus';
  const form = document.createElement('form');
  form.className = 'focus-form';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'add item';
  input.maxLength = MAX_TEXT;
  form.append(input);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void addTodo(input.value);
    input.value = '';
  });
  addRow.append(label, form);

  listEl = document.createElement('div');
  listEl.className = 'focus-list';

  clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'focus-clear';
  clearBtn.textContent = 'clear done';
  clearBtn.addEventListener('click', () => void clearDoneTodos());

  section.append(addRow, listEl, clearBtn);
  parent.append(section);
  onTodosChange(refresh);
  refresh();
}

function refresh(): void {
  listEl.replaceChildren();

  for (const todo of sortedTodos()) {
    const row = document.createElement('div');
    row.className = todo.done ? 'focus-item done' : 'focus-item';

    const check = document.createElement('button');
    check.type = 'button';
    check.className = 'focus-check';
    check.title = todo.done ? 'Mark as open' : 'Mark as done';
    check.addEventListener('click', () => void toggleTodo(todo.id));

    const text = document.createElement('span');
    text.className = 'focus-text';
    text.textContent = todo.text;
    text.title = 'Click to edit';
    text.addEventListener('click', () => {
      startInlineEdit(text, todo.text, {
        maxLength: MAX_TEXT,
        commit: (value) => {
          if (value.trim() !== '') void updateTodoText(todo.id, value);
          else void refresh();
        },
        cancel: () => {
          void refresh();
        },
      });
    });

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'focus-del';
    del.textContent = 'x';
    del.title = 'Delete item';
    del.addEventListener('click', () => void removeTodo(todo.id));

    row.append(check, text, del);
    listEl.append(row);
  }

  const hasDone = getTodos().some((todo) => todo.done);
  clearBtn.classList.toggle('hidden', !hasDone);
}
