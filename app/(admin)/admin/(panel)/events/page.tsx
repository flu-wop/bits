import ActionForm from '@/components/admin/ActionForm';
import { createEventAction } from '../../actions';
import { listEvents } from '@/lib/events';
import { requireAdmin } from '@/lib/session';
import { formatCents } from '@/lib/validate';

export default async function EventsPage() {
  await requireAdmin();
  const events = await listEvents();
  return (
    <main className="adm-wrap">
      <h1 className="adm-h1">Events</h1>
      <p className="adm-lede">Only published events with a ticket type that is switched on are shown to the public.</p>
      <ul className="adm-list">
        {events.map((e) => {
          const on = e.ticketTypes.filter((t) => t.enabled);
          const cap = on.reduce((n, t) => n + (t.capacity ?? 0), 0);
          const prices = on.map((t) => t.priceCents ?? 0);
          return (
            <li key={e.id}>
              <span className={`adm-badge adm-badge--${e.status}`}>{e.status}</span>
              <a href={`/admin/events/${e.id}`}><strong>{e.title}</strong></a>
              <span className="adm-hint">{e.startsAt ? e.startsAt.replace('T', ' ') : 'no date yet'}</span>
              <span className="adm-hint">{on.length ? `${on.length} ticket type${on.length > 1 ? 's' : ''} on, capacity ${cap}, from ${formatCents(Math.min(...prices))}` : 'no ticket types on'}</span>
            </li>
          );
        })}
      </ul>
      <h2 className="adm-h2">New event</h2>
      <ActionForm action={createEventAction} submitLabel="Create draft">
        <div className="adm-field">
          <label className="adm-label" htmlFor="title">Title</label>
          <input id="title" name="title" type="text" required maxLength={120} />
        </div>
      </ActionForm>
    </main>
  );
}
