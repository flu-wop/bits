// Pure validation helpers (no database, no Next). Money is integer cents everywhere.
export type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

export const MIN_CENTS = 50;                  // Stripe's minimum charge
export const MAX_TICKET_CENTS = 500_000;      // $5,000 per ticket: sanity cap
export const MAX_DEPOSIT_CENTS = 5_000_000;   // $50,000 deposit: sanity cap
export const TIMEZONES = ['America/Chicago', 'America/New_York', 'America/Denver', 'America/Los_Angeles'] as const;

/** "35", "35.5", "35.50" or "$1,250.00" to cents. Strict: at most 2 decimals, no negatives, no exponent. */
export function parseDollars(input: string, max: number): Result<{ cents: number }> {
  const s = input.trim().replace(/^\$/, '').replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return { ok: false, error: 'Enter an amount like 35 or 35.50.' };
  const [whole, frac = ''] = s.split('.');
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) return { ok: false, error: 'That amount is too large.' };
  if (cents < MIN_CENTS) return { ok: false, error: 'The minimum is $0.50.' };
  if (cents > max) return { ok: false, error: `The maximum is $${(max / 100).toLocaleString('en-US')}.` };
  return { ok: true, cents };
}

export function parseInteger(input: string, min: number, max: number, what: string): Result<{ value: number }> {
  const s = input.trim();
  if (!/^\d+$/.test(s)) return { ok: false, error: `${what} must be a whole number.` };
  const value = Number(s);
  if (value < min || value > max) return { ok: false, error: `${what} must be between ${min} and ${max}.` };
  return { ok: true, value };
}

export const formatCents = (c: number) => '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 });
export const centsToInput = (c: number | null) => (c == null ? '' : (c % 100 ? (c / 100).toFixed(2) : String(c / 100)));

const LOCAL_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
export function parseLocalDateTime(input: string): Result<{ value: string | null }> {
  const s = input.trim();
  if (!s) return { ok: true, value: null };
  if (!LOCAL_DT.test(s) || Number.isNaN(Date.parse(s + ':00Z'))) return { ok: false, error: 'Enter a valid date and time.' };
  return { ok: true, value: s };
}

export function slugify(title: string): string {
  const s = title.toLowerCase().normalize('NFKD').replace(/[^\x00-\x7f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/g, '');
  return s || 'event';
}
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function cleanText(input: string, max: number, what: string, required = false): Result<{ value: string }> {
  const value = input.replace(/\r\n/g, '\n').trim();
  if (required && !value) return { ok: false, error: `${what} is required.` };
  if (value.length > max) return { ok: false, error: `${what} must be ${max} characters or fewer.` };
  return { ok: true, value };
}

export type TicketTypeInput = {
  name: string; priceCents: number | null; capacity: number | null; maxPerOrder: number;
  salesOpen: string | null; salesClose: string | null; enabled: boolean;
};

/** A ticket type can only be switched on when it has a price and a capacity; the sales window must make sense. */
export function checkTicketType(t: TicketTypeInput): string | null {
  if (!t.name.trim()) return 'Name is required.';
  if (t.enabled && t.priceCents == null) return 'Set a price before switching this ticket type on.';
  if (t.enabled && t.capacity == null) return 'Set a capacity before switching this ticket type on.';
  if (t.capacity != null && t.maxPerOrder > t.capacity) return 'Max per order cannot be more than the capacity.';
  if (t.salesOpen && t.salesClose && t.salesClose <= t.salesOpen) return 'Sales must close after they open.';
  return null;
}

export type PublishCheck = { title: string; startsAt: string | null; venue: string; ticketTypes: { enabled: boolean; priceCents: number | null; capacity: number | null }[] };

/** What stops an event from being published. Empty list = ready. */
export function publishBlockers(e: PublishCheck): string[] {
  const out: string[] = [];
  if (/placeholder/i.test(e.title)) out.push('Replace the placeholder title.');
  if (!e.title.trim()) out.push('Add a title.');
  if (!e.startsAt) out.push('Set the date and time.');
  if (!e.venue.trim()) out.push('Add the venue.');
  if (!e.ticketTypes.some((t) => t.enabled && t.priceCents != null && t.capacity != null)) out.push('Switch on at least one ticket type with a price and capacity.');
  return out;
}

export function checkDepositOffer(o: { amountCents: number | null; enabled: boolean }): string | null {
  if (o.enabled && o.amountCents == null) return 'Set the deposit amount before switching it on.';
  return null;
}
