import ActionForm from '@/components/admin/ActionForm';
import { resendOrderEmailAction } from '../../actions';
import { listOrders } from '@/lib/checkin';
import { requireAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  await requireAdmin();
  const rows = await listOrders();
  return (
    <main className="adm-wrap">
      <h1 className="adm-h1">Orders</h1>
      <p className="adm-lede">Tickets and deposits. Refunds are made in the Stripe dashboard and show up here as refunded.</p>
      {rows.length === 0 ? <p className="adm-hint">No orders yet.</p> : rows.map((o) => (
        <div key={String(o.id)} className="adm-card">
          <h3>{o.kind === 'ticket' ? 'Tickets' : 'Deposit'} · ${(Number(o.amount_cents) / 100).toFixed(2)} · {String(o.status)}</h3>
          <p className="adm-hint">{o.name ? `${o.name} · ` : ''}{o.email ? String(o.email) : 'no email yet'} · {new Date(String(o.paid_at ?? o.created_at)).toLocaleString('en-US')}{o.kind === 'ticket' ? ` · ${o.used}/${o.tickets} scanned` : ''}{o.emailed_at ? ' · email sent' : ''}</p>
          {o.notes ? <p className="adm-hint">{String(o.notes)}</p> : null}
          {o.status === 'paid' ? <ActionForm action={resendOrderEmailAction.bind(null, String(o.id))} submitLabel="Resend email" tone="ghost" /> : null}
        </div>
      ))}
    </main>
  );
}
