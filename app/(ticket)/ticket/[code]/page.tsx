import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { qrDataUrl } from '@/lib/fulfil';
import { siteUrl } from '@/lib/stripe';
import { formatLocal } from '@/lib/time';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your ticket', robots: { index: false, follow: false } };

export default async function TicketPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(code)) notFound();
  const t = (await (await db()).execute({
    sql: `SELECT t.code, t.checked_in_at, o.status, tt.name AS type_name, e.title, e.starts_at, e.venue, e.policy
          FROM tickets t JOIN orders o ON o.id = t.order_id JOIN ticket_types tt ON tt.id = t.ticket_type_id JOIN events e ON e.id = tt.event_id WHERE t.code = ?`,
    args: [code],
  })).rows[0];
  if (!t) notFound();
  const valid = t.status === 'paid';
  const qr = valid ? await qrDataUrl(`${siteUrl()}/ticket/${t.code}`) : null;
  return (
    <main className="adm-wrap adm-wrap--narrow">
      <h1 className="adm-h1">{String(t.title)}</h1>
      <p className="adm-lede">{formatLocal((t.starts_at as string) ?? null)}{t.venue ? ` · ${t.venue}` : ''}</p>
      <div className="adm-card adm-card--accent" style={{ textAlign: 'center' }}>
        <h3>{String(t.type_name)}</h3>
        {valid && qr ? <img src={qr} alt="QR code. Show this at the door." width={240} height={240} style={{ background: '#fff', padding: 8, maxWidth: '100%', height: 'auto' }} /> : <p role="alert">This ticket is no longer valid{t.status === 'refunded' ? ' (refunded)' : ''}.</p>}
        {t.checked_in_at ? <p className="adm-hint">Already scanned in.</p> : valid ? <p className="adm-hint">Show this code at the door.</p> : null}
      </div>
      {t.policy ? <p className="adm-hint">{String(t.policy)}</p> : null}
    </main>
  );
}
