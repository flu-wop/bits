import { createHash, randomBytes } from 'node:crypto';
import type { Client } from '@libsql/client';
import { db } from '@/lib/db';
import { sendMail } from '@/lib/email';
import { rateLimit } from '@/lib/rate-limit';

// Admin sign-in: magic link by email, two allowlisted addresses (ADMIN_EMAILS). No passwords.
//  - the emailed link only opens a confirm page; the token is consumed by a POST (mail scanners that GET links can't burn it)
//  - tokens: 15 minutes, single use, stored hashed. Sessions: 7 days, stored hashed, re-checked against the allowlist every request.
export const TOKEN_TTL_MS = 15 * 60 * 1000;
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
export const normalizeEmail = (s: string) => s.trim().toLowerCase();

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '').split(',').map(normalizeEmail).filter(Boolean);
}
export const isAdminEmail = (email: string) => adminEmails().includes(normalizeEmail(email));

export function siteUrl(): string {
  const u = process.env.SITE_URL;
  if (u) return u.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production') throw new Error('SITE_URL is not set');
  return 'http://localhost:3000';
}

/** Always resolves the same way for allowed and unknown addresses, so the form can't be used to discover who the admins are. */
export async function requestLoginLink(emailInput: string, ip: string, opts: { client?: Client; now?: number } = {}): Promise<{ allowed: boolean; throttled: boolean }> {
  const client = opts.client ?? (await db()); const now = opts.now ?? Date.now();
  const email = normalizeEmail(emailInput);
  if (!email || email.length > 254 || !email.includes('@')) return { allowed: false, throttled: false };
  const okIp = await rateLimit(client, `login-ip:${ip}`, 20, 900, now);
  const okEmail = await rateLimit(client, `login-email:${sha(email)}`, 5, 900, now);
  if (!okIp || !okEmail) return { allowed: false, throttled: true };
  if (!isAdminEmail(email)) return { allowed: false, throttled: false };
  const token = randomBytes(32).toString('base64url');
  await client.execute({ sql: 'INSERT INTO login_tokens (token_hash, email, expires_at) VALUES (?, ?, ?)', args: [sha(token), email, now + TOKEN_TTL_MS] });
  const link = `${siteUrl()}/admin/login/verify?token=${token}`;
  await sendMail({
    to: email,
    subject: 'Your BITS admin sign-in link',
    text: `Use this link to sign in to the BITS admin. It works once and expires in 15 minutes.\n\n${link}\n\nIf you didn't ask for it, ignore this email.`,
    html: `<p>Use this link to sign in to the BITS admin. It works once and expires in 15 minutes.</p><p><a href="${link}">Sign in</a></p><p>If you didn't ask for it, ignore this email.</p>`,
  });
  return { allowed: true, throttled: false };
}

/** Atomically marks the token used and returns its email, or null if unknown, used or expired. */
export async function consumeLoginToken(token: string, opts: { client?: Client; now?: number } = {}): Promise<string | null> {
  const client = opts.client ?? (await db()); const now = opts.now ?? Date.now();
  if (!token || token.length > 200) return null;
  const r = await client.execute({ sql: 'UPDATE login_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? RETURNING email', args: [now, sha(token), now] });
  return r.rows.length ? String(r.rows[0].email) : null;
}

export async function createSession(email: string, opts: { client?: Client; now?: number } = {}): Promise<{ token: string; expiresAt: number }> {
  const client = opts.client ?? (await db()); const now = opts.now ?? Date.now();
  const token = randomBytes(32).toString('base64url');
  await client.execute({ sql: 'INSERT INTO admin_sessions (token_hash, email, created_at, expires_at) VALUES (?, ?, ?, ?)', args: [sha(token), normalizeEmail(email), now, now + SESSION_TTL_MS] });
  await client.execute({ sql: 'DELETE FROM admin_sessions WHERE expires_at < ?', args: [now] });
  return { token, expiresAt: now + SESSION_TTL_MS };
}

export async function getSessionEmail(token: string | undefined, opts: { client?: Client; now?: number } = {}): Promise<string | null> {
  if (!token || token.length > 200) return null;
  const client = opts.client ?? (await db()); const now = opts.now ?? Date.now();
  const r = await client.execute({ sql: 'SELECT email FROM admin_sessions WHERE token_hash = ? AND expires_at > ?', args: [sha(token), now] });
  if (!r.rows.length) return null;
  const email = String(r.rows[0].email);
  return isAdminEmail(email) ? email : null; // removing an address from ADMIN_EMAILS signs it out everywhere
}

export async function deleteSession(token: string | undefined, opts: { client?: Client } = {}) {
  if (!token) return;
  const client = opts.client ?? (await db());
  await client.execute({ sql: 'DELETE FROM admin_sessions WHERE token_hash = ?', args: [sha(token)] });
}
