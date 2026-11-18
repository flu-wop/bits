// Event times are stored as local wall-clock strings 'YYYY-MM-DDTHH:mm' next to an IANA timezone.
/** The current time as a local wall-clock string in the given timezone (comparable with stored sales windows). */
export function localNow(timezone: string, now: number): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(now));
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/** 'Fri, Mar 5, 2027 at 7:30 PM' from a stored local wall-clock string (no timezone conversion: it is already local). */
export function formatLocal(local: string | null): string {
  if (!local) return 'Date to be announced';
  const d = new Date(local + ':00Z');
  const date = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' }).format(d);
  return `${date} at ${time}`;
}
