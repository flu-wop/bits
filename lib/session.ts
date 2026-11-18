import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_TTL_MS, createSession, deleteSession, getSessionEmail } from '@/lib/auth';

// Cookie handling for the admin. Every admin page AND every admin server action calls requireAdmin():
// layouts alone are not a security boundary in the App Router.
const NAME = process.env.NODE_ENV === 'production' ? '__Host-bits_admin' : 'bits_admin';

export async function requireAdmin(): Promise<string> {
  const store = await cookies();
  const email = await getSessionEmail(store.get(NAME)?.value);
  if (!email) redirect('/admin/login');
  return email;
}

export async function currentAdmin(): Promise<string | null> {
  const store = await cookies();
  return getSessionEmail(store.get(NAME)?.value);
}

export async function startSession(email: string) {
  const { token } = await createSession(email);
  const store = await cookies();
  store.set(NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_TTL_MS / 1000 });
}

export async function endSession() {
  const store = await cookies();
  await deleteSession(store.get(NAME)?.value);
  store.delete(NAME);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
}
