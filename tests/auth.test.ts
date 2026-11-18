import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Client } from '@libsql/client';
import { freshDb } from './helpers';
import { SESSION_TTL_MS, TOKEN_TTL_MS, consumeLoginToken, createSession, deleteSession, getSessionEmail, requestLoginLink } from '@/lib/auth';
import { __setMailer, type Mail } from '@/lib/email';

let c: Client; let sent: Mail[];
const tokenFrom = (m: Mail) => new URL(m.text.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;

beforeEach(async () => {
  c = await freshDb(); sent = [];
  process.env.ADMIN_EMAILS = 'Raquel@example.com, james@example.com'; process.env.SITE_URL = 'https://bits.test';
  __setMailer(async (m) => { sent.push(m); return { delivered: true }; });
});
afterEach(() => { __setMailer(null); delete process.env.ADMIN_EMAILS; delete process.env.SITE_URL; });

describe('login link', () => {
  it('emails a one-time link only to allowlisted addresses (case-insensitive)', async () => {
    expect(await requestLoginLink('RAQUEL@example.com', '1.1.1.1')).toEqual({ allowed: true, throttled: false });
    expect(sent).toHaveLength(1); expect(sent[0].to).toBe('raquel@example.com');
    expect(sent[0].text).toContain('https://bits.test/admin/login/verify?token=');
    expect(await requestLoginLink('stranger@example.com', '1.1.1.1')).toEqual({ allowed: false, throttled: false });
    expect(await requestLoginLink('not-an-email', '1.1.1.1')).toEqual({ allowed: false, throttled: false });
    expect(sent).toHaveLength(1);
  });
  it('stores only a hash of the token', async () => {
    await requestLoginLink('james@example.com', '1.1.1.1');
    const raw = tokenFrom(sent[0]);
    const rows = (await c.execute('SELECT token_hash FROM login_tokens')).rows;
    expect(rows).toHaveLength(1); expect(String(rows[0].token_hash)).not.toContain(raw);
  });
  it('token works once, then never again', async () => {
    await requestLoginLink('james@example.com', '1.1.1.1');
    const t = tokenFrom(sent[0]);
    expect(await consumeLoginToken(t)).toBe('james@example.com');
    expect(await consumeLoginToken(t)).toBeNull();
  });
  it('token expires after 15 minutes; garbage tokens fail', async () => {
    const now = 5_000_000;
    await requestLoginLink('james@example.com', '1.1.1.1', { now });
    const t = tokenFrom(sent[0]);
    expect(await consumeLoginToken(t, { now: now + TOKEN_TTL_MS + 1 })).toBeNull();
    expect(await consumeLoginToken('nope')).toBeNull(); expect(await consumeLoginToken('')).toBeNull();
  });
  it('throttles repeated requests for one address and from one IP', async () => {
    for (let i = 0; i < 5; i++) expect((await requestLoginLink('james@example.com', `9.9.9.${i}`)).throttled).toBe(false);
    expect((await requestLoginLink('james@example.com', '9.9.9.99')).throttled).toBe(true);
    expect(sent).toHaveLength(5);
    for (let i = 0; i < 20; i++) await requestLoginLink(`x${i}@example.com`, '8.8.8.8');
    expect((await requestLoginLink('x99@example.com', '8.8.8.8')).throttled).toBe(true);
  });
});

describe('sessions', () => {
  it('create, read, expire, delete', async () => {
    const now = 7_000_000;
    const { token } = await createSession('james@example.com', { now });
    expect(await getSessionEmail(token, { now: now + 1000 })).toBe('james@example.com');
    expect(await getSessionEmail(token, { now: now + SESSION_TTL_MS + 1 })).toBeNull();
    expect(await getSessionEmail('wrong')).toBeNull(); expect(await getSessionEmail(undefined)).toBeNull();
    await deleteSession(token);
    expect(await getSessionEmail(token, { now: now + 1000 })).toBeNull();
  });
  it('stores only a hash, and removing an address from the allowlist signs it out', async () => {
    const { token } = await createSession('raquel@example.com');
    const row = (await c.execute('SELECT token_hash FROM admin_sessions')).rows[0];
    expect(String(row.token_hash)).not.toBe(token);
    expect(await getSessionEmail(token)).toBe('raquel@example.com');
    process.env.ADMIN_EMAILS = 'james@example.com';
    expect(await getSessionEmail(token)).toBeNull();
  });
});
