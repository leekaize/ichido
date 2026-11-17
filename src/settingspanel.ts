import { exportJson, importJson } from './backup';
import { getSettings, onSettingsChange, setBirthday, setLifespan } from './state';

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

  const backupRow = document.createElement('div');
  backupRow.className = 'settings-row';
  const backupLabel = document.createElement('span');
  backupLabel.textContent = 'Backup';
  const backupButtons = document.createElement('div');
  backupButtons.className = 'backup-buttons';
  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.textContent = 'Export';
  exportBtn.title = 'Download all data as a JSON file';
  const importBtn = document.createElement('button');
  importBtn.type = 'button';
  importBtn.textContent = 'Import';
  importBtn.title = 'Replace all data with a JSON backup file';
  backupButtons.append(exportBtn, importBtn);
  backupRow.append(backupLabel, backupButtons);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';
  fileInput.hidden = true;

  const status = document.createElement('p');
  status.className = 'backup-status';
  const showStatus = (text: string, isError = false): void => {
    status.textContent = text;
    status.classList.toggle('error', isError);
  };

  exportBtn.addEventListener('click', () => {
    void exportJson()
      .then(() => showStatus('Backup file downloaded.'))
      .catch((error: unknown) => showStatus(`Export failed: ${errorText(error)}`, true));
  });

  importBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    if (!window.confirm('Import replaces all data in this browser with the file contents. Continue?')) return;
    showStatus('Importing...');
    void importJson(file)
      .then((summary) => {
        const parts = [`${summary.days} days`, `${summary.reasons} reasons`, `${summary.events} events`];
        const skipped = summary.skipped > 0 ? ` (${summary.skipped} bad records skipped)` : '';
        showStatus(`Imported ${parts.join(', ')}${skipped}.`);
      })
      .catch((error: unknown) => showStatus(`Import failed: ${errorText(error)}`, true));
  });

  // after an import the cached settings change under this panel
  onSettingsChange(() => {
    birthdayInput.value = getSettings().birthdate ?? '';
    lifespanInput.value = String(getSettings().lifespanYears ?? 90);
  });

  panel.append(head, birthdayRow, lifespanRow, backupRow, fileInput, status);
  parent.append(panel);
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function toggleSettingsPanel(): void {
  panel.classList.toggle('hidden');
}

export function closePanel(): void {
  panel.classList.add('hidden');
}
