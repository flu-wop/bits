import { notFound } from 'next/navigation';
import ActionForm from '@/components/admin/ActionForm';
import { deleteTicketTypeAction, eventStatusAction, saveTicketTypeAction, updateEventAction } from '../../../actions';
import { getEvent, type TicketTypeRow } from '@/lib/events';
import { requireAdmin } from '@/lib/session';
import { TIMEZONES, centsToInput, publishBlockers } from '@/lib/validate';

function TicketTypeFields({ t }: { t?: TicketTypeRow }) {
  return (
    <>
      <div className="adm-cols">
        <div className="adm-field"><label className="adm-label">Name</label><input name="name" type="text" required maxLength={80} defaultValue={t?.name ?? ''} /></div>
        <div className="adm-field"><label className="adm-label">Price (USD)</label><input name="price" type="text" inputMode="decimal" placeholder="e.g. 35" defaultValue={centsToInput(t?.priceCents ?? null)} /></div>
        <div className="adm-field"><label className="adm-label">Capacity (tickets)</label><input name="capacity" type="text" inputMode="numeric" placeholder="e.g. 120" defaultValue={t?.capacity ?? ''} /></div>
        <div className="adm-field"><label className="adm-label">Max per order</label><input name="maxPerOrder" type="text" inputMode="numeric" defaultValue={t?.maxPerOrder ?? 6} /></div>
      </div>
      <div className="adm-cols">
        <div className="adm-field"><label className="adm-label">Sales open (optional)</label><input name="salesOpen" type="datetime-local" defaultValue={t?.salesOpen ?? ''} /></div>
        <div className="adm-field"><label className="adm-label">Sales close (optional)</label><input name="salesClose" type="datetime-local" defaultValue={t?.salesClose ?? ''} /></div>
      </div>
      <label className="adm-check"><input name="enabled" type="checkbox" defaultChecked={t?.enabled ?? false} /> On sale (needs a price and a capacity)</label>
    </>
  );
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const e = await getEvent(id);
  if (!e) notFound();
  const blockers = publishBlockers(e);
  return (
    <main className="adm-wrap">
      <p className="adm-hint"><a href="/admin/events">&larr; All events</a></p>
      <h1 className="adm-h1">{e.title}</h1>
      <p><span className={`adm-badge adm-badge--${e.status}`}>{e.status}</span></p>

      <div className="adm-card adm-card--accent">
        <h3>Visibility</h3>
        {e.status !== 'published' && blockers.length ? (<><p className="adm-hint">To publish:</p><ul className="adm-blockers">{blockers.map((b) => <li key={b}>{b}</li>)}</ul></>) : null}
        <div className="adm-row">
          {e.status !== 'published' ? <ActionForm action={eventStatusAction.bind(null, e.id, 'published')} submitLabel="Publish" /> : null}
          {e.status === 'published' ? <ActionForm action={eventStatusAction.bind(null, e.id, 'draft')} submitLabel="Back to draft" tone="ghost" /> : null}
          {e.status !== 'archived' ? <ActionForm action={eventStatusAction.bind(null, e.id, 'archived')} submitLabel="Archive" tone="ghost" /> : null}
        </div>
      </div>

      <h2 className="adm-h2">Details</h2>
      <ActionForm action={updateEventAction.bind(null, e.id)} submitLabel="Save details" className="adm-card">
        <div className="adm-field"><label className="adm-label">Title</label><input name="title" type="text" required maxLength={120} defaultValue={e.title} /></div>
        <div className="adm-field"><label className="adm-label">Web address (letters, numbers, hyphens)</label><input name="slug" type="text" required maxLength={60} defaultValue={e.slug} /></div>
        <div className="adm-cols">
          <div className="adm-field"><label className="adm-label">Date and time</label><input name="startsAt" type="datetime-local" defaultValue={e.startsAt ?? ''} /></div>
          <div className="adm-field"><label className="adm-label">Timezone</label>
            <select name="timezone" defaultValue={e.timezone}>{TIMEZONES.map((z) => <option key={z} value={z}>{z.replace('America/', '').replace('_', ' ')}</option>)}</select></div>
        </div>
        <div className="adm-field"><label className="adm-label">Venue</label><input name="venue" type="text" maxLength={160} defaultValue={e.venue} /></div>
        <div className="adm-field"><label className="adm-label">Description</label><textarea name="description" maxLength={2000} defaultValue={e.description} /></div>
      </ActionForm>

      <h2 className="adm-h2">Ticket types</h2>
      {e.ticketTypes.map((t) => (
        <div className="adm-card" key={t.id}>
          <h3>{t.name} {t.enabled ? <span className="adm-ok">on sale</span> : <span className="adm-hint">off</span>}</h3>
          <ActionForm action={saveTicketTypeAction.bind(null, e.id, t.id)} submitLabel="Save"><TicketTypeFields t={t} /></ActionForm>
          <ActionForm action={deleteTicketTypeAction.bind(null, e.id, t.id)} submitLabel="Delete" tone="danger" />
        </div>
      ))}
      <h3 className="adm-h2">Add a ticket type</h3>
      <ActionForm action={saveTicketTypeAction.bind(null, e.id, null)} submitLabel="Add ticket type" className="adm-card"><TicketTypeFields /></ActionForm>
    </main>
  );
}
