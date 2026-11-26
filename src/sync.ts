// Client for the /api/backup route. Plain fetch on purpose: void/client's
// typed fetch would pull the server type chain (and Cloudflare workers types)
// into this DOM-only program. The token lives in localStorage, not in the
// settings record, so it never ends up inside exported backups.
import { buildPayload } from './backup';

const TOKEN_KEY = 'ichido.syncToken';

export function getSyncToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

export function setSyncToken(token: string): void {
  const trimmed = token.trim();
  if (trimmed === '') localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, trimmed);
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
  return result.storedAt;
}

/** Fetches the server copy without touching local data. */
export async function fetchBackup(): Promise<{ storedAt: number; payload: unknown }> {
  const result = await request('GET') as { storedAt?: unknown; payload?: unknown } | null;
  if (typeof result?.storedAt !== 'number') throw new Error('unexpected server response');
  return { storedAt: result.storedAt, payload: result.payload };
}
