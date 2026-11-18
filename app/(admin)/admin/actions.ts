'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { consumeLoginToken, isAdminEmail, requestLoginLink } from '@/lib/auth';
import { clientIp, endSession, requireAdmin, startSession } from '@/lib/session';
import { createEvent, deleteTicketType, saveTicketType, setEventStatus, updateEvent } from '@/lib/events';
import { saveDepositOffer } from '@/lib/deposits';
import { MAX_DEPOSIT_CENTS, MAX_TICKET_CENTS, parseDollars, parseInteger, parseLocalDateTime } from '@/lib/validate';
import type { FormState } from '@/components/admin/ActionForm';

const str = (f: FormData, k: string) => String(f.get(k) ?? '');
const fail = (error: string): FormState => ({ error });

// ---- sign in / out (no session needed) -------------------------------------------------------------------
export async function requestLoginAction(_: FormState, f: FormData): Promise<FormState> {
  const r = await requestLoginLink(str(f, 'email'), await clientIp());
  if (r.throttled) return fail('Too many attempts. Wait a few minutes and try again.');
  return { ok: 'If that address can sign in, a link is on its way. It expires in 15 minutes.' };
}

export async function verifyLoginAction(_: FormState, f: FormData): Promise<FormState> {
  const email = await consumeLoginToken(str(f, 'token'));
  if (!email || !isAdminEmail(email)) return fail('That link has expired or was already used. Request a new one.');
  await startSession(email);
  redirect('/admin');
}

export async function logoutAction() {
  await endSession();
  redirect('/admin/login');
}

// ---- everything below requires a signed-in admin, checked in the action itself ---------------------------
export async function createEventAction(_: FormState, f: FormData): Promise<FormState> {
  await requireAdmin();
  const r = await createEvent(str(f, 'title'));
  if (!r.ok) return fail(r.error);
  revalidatePath('/admin/events');
  redirect(`/admin/events/${r.id}`);
}

export async function updateEventAction(id: string, _: FormState, f: FormData): Promise<FormState> {
  await requireAdmin();
  const r = await updateEvent(id, { title: str(f, 'title'), slug: str(f, 'slug'), startsAt: str(f, 'startsAt'), timezone: str(f, 'timezone'), venue: str(f, 'venue'), description: str(f, 'description'), policy: str(f, 'policy') });
  if (!r.ok) return fail(r.error);
  revalidatePath(`/admin/events/${id}`); revalidatePath('/admin/events');
  return { ok: 'Saved.' };
}

export async function eventStatusAction(id: string, status: 'draft' | 'published' | 'archived', _: FormState, __: FormData): Promise<FormState> {
  await requireAdmin();
  const r = await setEventStatus(id, status);
  if (!r.ok) return fail(r.error);
  revalidatePath(`/admin/events/${id}`); revalidatePath('/admin/events');
  return { ok: status === 'published' ? 'Published.' : status === 'archived' ? 'Archived.' : 'Moved back to draft.' };
}

function readTicketType(f: FormData) {
  const priceRaw = str(f, 'price').trim(), capRaw = str(f, 'capacity').trim();
  let priceCents: number | null = null, capacity: number | null = null;
  if (priceRaw) { const p = parseDollars(priceRaw, MAX_TICKET_CENTS); if (!p.ok) return { error: p.error }; priceCents = p.cents; }
  if (capRaw) { const c = parseInteger(capRaw, 1, 100000, 'Capacity'); if (!c.ok) return { error: c.error }; capacity = c.value; }
  const mpo = parseInteger(str(f, 'maxPerOrder') || '6', 1, 50, 'Max per order'); if (!mpo.ok) return { error: mpo.error };
  const open = parseLocalDateTime(str(f, 'salesOpen')); if (!open.ok) return { error: open.error };
  const close = parseLocalDateTime(str(f, 'salesClose')); if (!close.ok) return { error: close.error };
  return { input: { name: str(f, 'name'), priceCents, capacity, maxPerOrder: mpo.value, salesOpen: open.value, salesClose: close.value, enabled: f.get('enabled') === 'on' } };
}

export async function saveTicketTypeAction(eventId: string, typeId: string | null, _: FormState, f: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = readTicketType(f);
  if ('error' in parsed && parsed.error) return fail(parsed.error);
  const r = await saveTicketType(eventId, typeId, parsed.input!);
  if (!r.ok) return fail(r.error);
  revalidatePath(`/admin/events/${eventId}`);
  return { ok: typeId ? 'Saved.' : 'Ticket type added.' };
}

export async function deleteTicketTypeAction(eventId: string, typeId: string, _: FormState, __: FormData): Promise<FormState> {
  await requireAdmin();
  const r = await deleteTicketType(eventId, typeId);
  if (!r.ok) return fail(r.error);
  revalidatePath(`/admin/events/${eventId}`);
  return { ok: 'Deleted.' };
}

export async function saveDepositAction(id: string, _: FormState, f: FormData): Promise<FormState> {
  await requireAdmin();
  const raw = str(f, 'amount').trim();
  let amountCents: number | null = null;
  if (raw) { const p = parseDollars(raw, MAX_DEPOSIT_CENTS); if (!p.ok) return fail(p.error); amountCents = p.cents; }
  const r = await saveDepositOffer(id, { label: str(f, 'label'), amountCents, enabled: f.get('enabled') === 'on' });
  if (!r.ok) return fail(r.error);
  revalidatePath('/admin/deposits'); revalidatePath('/admin');
  return { ok: 'Saved.' };
}

// ---- orders and door ---------------------------------------------------------------------------------------
export async function resendOrderEmailAction(orderId: string, _: FormState, __: FormData): Promise<FormState> {
  await requireAdmin();
  const { sendOrderEmail } = await import('@/lib/fulfil');
  const { siteUrl } = await import('@/lib/stripe');
  const ok = await sendOrderEmail(await (await import('@/lib/db')).db(), orderId, siteUrl(), Date.now(), true);
  revalidatePath('/admin/orders');
  return ok ? { ok: 'Email sent.' } : fail('Could not send. Check email settings on the dashboard.');
}

export async function checkInAction(_: FormState, f: FormData): Promise<FormState> {
  await requireAdmin();
  const { checkIn } = await import('@/lib/checkin');
  const r = await checkIn(str(f, 'code'));
  if (r.ok) return { ok: `Checked in: ${r.ticketType}${r.holder ? ` for ${r.holder}` : ''} (${r.event}).` };
  if (r.status === 'already') return fail(`Already used${r.checkedInAt ? ` at ${new Date(r.checkedInAt).toLocaleTimeString('en-US')}` : ''}.`);
  if (r.status === 'void') return fail('Ticket is not valid (order refunded or unpaid).');
  return fail('No ticket found for that code.');
}

export async function undoCheckInAction(ticketId: string, _: FormState, __: FormData): Promise<FormState> {
  await requireAdmin();
  const { undoCheckIn } = await import('@/lib/checkin');
  await undoCheckIn(ticketId);
  revalidatePath('/admin/checkin');
  return { ok: 'Check-in undone.' };
}
