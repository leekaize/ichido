import './style.css';
import { getSettings, initEvents, initReasons, initSettings, initTodos, onReasonsChange } from './state';
import { initDayView, rerenderDayView } from './dayview';
import { initLifeView } from './lifeview';
import { initBirthdayModal, openBirthdayModal } from './birthdaymodal';
import { closePanel as closeReasonsPanel, initReasonsPanel, toggleReasonsPanel } from './reasonspanel';
import { closePanel as closeEventsPanel, initEventsPanel, toggleEventsPanel } from './eventspanel';
import { closePanel as closeSettingsPanel, initSettingsPanel, toggleSettingsPanel } from './settingspanel';
import { initFocusList } from './focuslist';

async function main(): Promise<void> {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('#app element not found');

  await initReasons();
  await initSettings();
  await initEvents();
  await initTodos();

  const header = document.createElement('header');
  const title = document.createElement('h1');
  title.textContent = 'ichido';
  const actions = document.createElement('div');
  actions.className = 'header-actions';

  const reasonsBtn = document.createElement('button');
  reasonsBtn.type = 'button';
  reasonsBtn.textContent = 'Reasons';
  reasonsBtn.addEventListener('click', () => {
    closeEventsPanel();
    closeSettingsPanel();
    toggleReasonsPanel();
  });

  const eventsBtn = document.createElement('button');
  eventsBtn.type = 'button';
  eventsBtn.textContent = 'Events';
  eventsBtn.addEventListener('click', () => {
    closeReasonsPanel();
    closeSettingsPanel();
    toggleEventsPanel();
  });

  const settingsBtn = document.createElement('button');
  settingsBtn.type = 'button';
  settingsBtn.textContent = 'Settings';
  settingsBtn.addEventListener('click', () => {
    closeReasonsPanel();
    closeEventsPanel();
    toggleSettingsPanel();
  });

  actions.append(reasonsBtn, eventsBtn, settingsBtn);
  header.append(title, actions);
  app.append(header);

  initDayView(app);
  initFocusList(app);
  initLifeView(app);
  initReasonsPanel(app);
  initEventsPanel(app);
  initSettingsPanel(app);
  initBirthdayModal(app);
  if (!getSettings().birthdate) openBirthdayModal();
  onReasonsChange(rerenderDayView);
}

void main();
