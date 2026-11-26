// Backup sync endpoint, same origin so no CORS is involved anywhere.
// The client authenticates with the sync token in `Authorization: Bearer`;
// the token is a Void secret in production and a local .env value in dev.
import { defineHandler } from 'void';
import { env } from 'void/env';
import { kv } from 'void/kv';

interface StoredBackup {
  storedAt: number;
  payload: Record<string, unknown>;
}

const backups = kv.map<StoredBackup>('backup');
const KEY = 'latest';
const MAX_BYTES = 25 * 1024 * 1024; // Workers KV value limit

async function digest(value: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(value);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

async function tokensMatch(given: string, secret: string): Promise<boolean> {
  const [a, b] = await Promise.all([digest(given), digest(secret)]);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function authorized(request: Request): Promise<boolean> {
  const header = request.headers.get('Authorization') ?? '';
  const [scheme, value] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) return false;
  return tokensMatch(value.trim(), env.SYNC_TOKEN);
}

// Same loose check as importJson: app tag plus the three core arrays.
// Anything deeper stays the client's job, so future export versions pass.
function isIchidoPayload(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return (
    data.app === 'ichido' &&
    typeof data.version === 'number' &&
    Array.isArray(data.days) &&
    Array.isArray(data.reasons) &&
    Array.isArray(data.events)
  );
}

export const PUT = defineHandler(async (c) => {
  if (!(await authorized(c.req.raw))) return c.json({ error: 'unauthorized' }, 401);
  const length = Number(c.req.header('Content-Length') ?? 0);
  if (length > MAX_BYTES) return c.json({ error: 'backup too large for Workers KV' }, 413);
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: 'body is not valid JSON' }, 400);
  }
  if (!isIchidoPayload(payload)) return c.json({ error: 'not an ichido export' }, 400);
  const storedAt = Date.now();
  await backups.put(KEY, { storedAt, payload });
  return { ok: true, storedAt };
});

export const GET = defineHandler(async (c) => {
  if (!(await authorized(c.req.raw))) return c.json({ error: 'unauthorized' }, 401);
  const stored = await backups.get(KEY);
  if (!stored) return c.json({ error: 'no backup stored' }, 404);
  return stored;
});
