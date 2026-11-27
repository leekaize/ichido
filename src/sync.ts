// Client for the /api/backup route. Plain fetch on purpose: void/client's
// typed fetch would pull the server type chain (and Cloudflare workers types)
// into this DOM-only program. The token lives in localStorage, not in the
// settings record, so it never ends up inside exported backups.
//
// With a token set, auto-sync keeps devices in step: every data write schedules
// a debounced push, and a background loop merges the server copy into the local
// stores on load, once a minute, and when a hidden tab becomes visible again.
import { buildPayload, mergeBackup } from './backup';
import { onDataWrite } from './db';

const TOKEN_KEY = 'ichido.syncToken';
const LAST_SEEN_KEY = 'ichido.lastStoredAt';
const POLL_MS = 60_000;
const PUSH_DEBOUNCE_MS = 2_000;
// fetch keepalive bodies are capped at 64KB, so the flush on tab close only
// runs for small payloads; anything bigger converges on the next pull instead.
const KEEPALIVE_MAX = 60_000;

export function getSyncToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

export function setSyncToken(token: string): void {
  const trimmed = token.trim();
  if (trimmed === '') localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, trimmed);
  if (trimmed === '') stopAutoSync();
  else startAutoSync();
}

/** Lets the settings panel display auto-sync progress. */
type StatusHandler = (text: string, isError?: boolean) => void;
let statusHandler: StatusHandler | null = null;

export function setAutoSyncStatus(handler: StatusHandler | null): void {
  statusHandler = handler;
}

function showStatus(text: string, isError = false): void {
  if (statusHandler) statusHandler(text, isError);
}

async function request(method: 'GET' | 'PUT', body?: unknown): Promise<unknown> {
  const token = getSyncToken();
  if (token === '') throw new Error('enter the sync token first');
  let response: Response;
  try {
    response = await fetch('/api/backup', {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('cannot reach the sync server');
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data as { error?: unknown } | null)?.error;
    throw new Error(typeof message === 'string' ? message : `server error ${response.status}`);
  }
  return data;
}

/** Sends the current stores to the server; resolves with the storedAt stamp. */
export async function pushBackup(): Promise<number> {
  const payload = await buildPayload();
  const result = await request('PUT', payload) as { storedAt?: unknown } | null;
  if (typeof result?.storedAt !== 'number') throw new Error('unexpected server response');
  noteSynced(result.storedAt);
  return result.storedAt;
}

/** Fetches the server copy without touching local data. */
export async function fetchBackup(): Promise<{ storedAt: number; payload: unknown }> {
  const result = await request('GET') as { storedAt?: unknown; payload?: unknown } | null;
  if (typeof result?.storedAt !== 'number') throw new Error('unexpected server response');
  return { storedAt: result.storedAt, payload: result.payload };
}

// --- auto-sync ------------------------------------------------------------

let lastSeenStoredAt = Number(localStorage.getItem(LAST_SEEN_KEY)) || 0;
let started = false;
let pushTimer: number | null = null;
let pollTimer: number | null = null;
let pulling = false;
let applying = false; // echo guard: merge writes must not schedule pushes
let dirty = false; // local changes the server does not have yet

function noteSynced(storedAt: number): void {
  if (storedAt > lastSeenStoredAt) {
    lastSeenStoredAt = storedAt;
    localStorage.setItem(LAST_SEEN_KEY, String(storedAt));
  }
  dirty = false;
  showStatus(`Auto-synced ${new Date(storedAt).toLocaleTimeString()}.`);
}

function schedulePush(): void {
  if (applying) return; // writes from a merge are pushed explicitly afterwards
  if (getSyncToken() === '') return;
  dirty = true;
  if (pushTimer !== null) clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    pushTimer = null;
    void autoPush();
  }, PUSH_DEBOUNCE_MS);
}

async function autoPush(): Promise<void> {
  if (pulling || applying) {
    schedulePush(); // pull in flight; retry after it settles
    return;
  }
  try {
    await pushBackup();
  } catch (error: unknown) {
    showStatus(`Auto-sync failed: ${errorText(error)}`, true);
  }
}

async function autoPull(): Promise<void> {
  if (pulling || applying) return;
  if (getSyncToken() === '') return;
  pulling = true;
  try {
    const stored = await fetchBackup();
    if (stored.storedAt <= lastSeenStoredAt) return; // server unchanged since our last sync
    applying = true;
    let changed: boolean;
    try {
      changed = (await mergeBackup(stored.payload)).changed;
    } finally {
      applying = false;
    }
    if (changed) {
      await pushBackup(); // converge: other devices now see the merged state
    } else {
      noteSynced(stored.storedAt);
    }
  } catch (error: unknown) {
    const message = errorText(error);
    if (message === 'no backup stored') {
      // fresh server: nothing to merge; seed it with the local state
      if (dirty) await autoPush();
    } else {
      showStatus(`Auto-sync failed: ${message}`, true);
    }
  } finally {
    pulling = false;
  }
}

function flushOnHide(): void {
  if (!dirty || pushTimer === null || getSyncToken() === '') return;
  clearTimeout(pushTimer);
  pushTimer = null;
  void (async () => {
    const body = JSON.stringify(await buildPayload());
    if (body.length > KEEPALIVE_MAX) return; // too big for keepalive; next pull converges
    dirty = false;
    try {
      await fetch('/api/backup', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getSyncToken()}`, 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      });
    } catch {
      // tab is closing; the next pull picks the change up from local storage
    }
  })();
}

/** Starts auto-sync if a token is set; safe to call repeatedly. */
export function startAutoSync(): void {
  if (started || getSyncToken() === '') return;
  started = true;
  showStatus('Auto-sync on.');
  onDataWrite(schedulePush);
  pollTimer = window.setInterval(() => void autoPull(), POLL_MS);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('online', onOnline);
  window.addEventListener('pagehide', flushOnHide);
  void autoPull();
}

function stopAutoSync(): void {
  if (!started) return;
  started = false;
  if (pushTimer !== null) clearTimeout(pushTimer);
  if (pollTimer !== null) clearInterval(pollTimer);
  pushTimer = null;
  pollTimer = null;
  document.removeEventListener('visibilitychange', onVisibility);
  window.removeEventListener('online', onOnline);
  window.removeEventListener('pagehide', flushOnHide);
  showStatus('Auto-sync off: token removed.');
}

function onVisibility(): void {
  if (document.visibilityState === 'visible') void autoPull();
}

function onOnline(): void {
  void autoPull();
  if (dirty) schedulePush();
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
