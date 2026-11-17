import { getSettings, setBirthday } from './state';

let overlay: HTMLElement;
let input: HTMLInputElement;

export function initBirthdayModal(parent: HTMLElement): void {
  overlay = document.createElement('div');
  overlay.className = 'modal-overlay hidden';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-label', 'Set your birthday');

  const h2 = document.createElement('h2');
  h2.textContent = 'When were you born?';

  const note = document.createElement('p');
  note.className = 'modal-note';
  note.textContent = 'The life in weeks grid behind this dialog is an example. Your birthday makes it yours.';

  input = document.createElement('input');
  input.type = 'date';

  const actions = document.createElement('div');
  actions.className = 'modal-actions';
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.textContent = 'Skip';
  const save = document.createElement('button');
  save.type = 'button';
  save.textContent = 'Save';

  skip.addEventListener('click', closeBirthdayModal);
  save.addEventListener('click', () => {
    if (input.value) void setBirthday(input.value);
    closeBirthdayModal();
  });
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeBirthdayModal();
  });
  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeBirthdayModal();
  });

  actions.append(skip, save);
  modal.append(h2, note, input, actions);
  overlay.append(modal);
  parent.append(overlay);
}

export function openBirthdayModal(): void {
  input.value = getSettings().birthdate ?? '';
  overlay.classList.remove('hidden');
  input.focus();
}

export function closeBirthdayModal(): void {
  overlay.classList.add('hidden');
}
