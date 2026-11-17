import { getSettings, setBirthday, setLifespan } from './state';

let panel: HTMLElement;

export function initSettingsPanel(parent: HTMLElement): void {
  panel = document.createElement('aside');
  panel.className = 'side-panel hidden';

  const head = document.createElement('div');
  head.className = 'panel-head';
  const h2 = document.createElement('h2');
  h2.textContent = 'Settings';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'x';
  close.addEventListener('click', toggleSettingsPanel);
  head.append(h2, close);

  const birthdayRow = document.createElement('div');
  birthdayRow.className = 'settings-row';
  const birthdayLabel = document.createElement('span');
  birthdayLabel.textContent = 'Birthday';
  const birthdayInput = document.createElement('input');
  birthdayInput.type = 'date';
  birthdayInput.value = getSettings().birthdate ?? '';
  birthdayInput.addEventListener('change', () => {
    void setBirthday(birthdayInput.value || undefined);
  });
  birthdayRow.append(birthdayLabel, birthdayInput);

  const lifespanRow = document.createElement('div');
  lifespanRow.className = 'settings-row';
  const lifespanLabel = document.createElement('span');
  lifespanLabel.textContent = 'Lifespan (years)';
  const lifespanInput = document.createElement('input');
  lifespanInput.type = 'number';
  lifespanInput.min = '40';
  lifespanInput.max = '120';
  lifespanInput.value = String(getSettings().lifespanYears ?? 90);
  lifespanInput.addEventListener('change', () => {
    void setLifespan(Number(lifespanInput.value));
    lifespanInput.value = String(getSettings().lifespanYears ?? 90);
  });
  lifespanRow.append(lifespanLabel, lifespanInput);

  panel.append(head, birthdayRow, lifespanRow);
  parent.append(panel);
}

export function toggleSettingsPanel(): void {
  panel.classList.toggle('hidden');
}

export function closePanel(): void {
  panel.classList.add('hidden');
}
