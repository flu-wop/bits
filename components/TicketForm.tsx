'use client';
import { useState } from 'react';

type T = { id: string; name: string; priceCents: number; maxPerOrder: number; left: number; soldOut: boolean; onSale: boolean };
const money = (c: number) => '$' + (c / 100).toFixed(c % 100 ? 2 : 0);

export default function TicketForm({ types, paymentsOpen }: { types: T[]; paymentsOpen: boolean }) {
  const buyable = types.filter((t) => t.onSale && !t.soldOut);
  const [id, setId] = useState(buyable[0]?.id ?? '');
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const t = types.find((x) => x.id === id);
  if (!paymentsOpen) return <p className="prose">Tickets are not on sale yet. Check back soon.</p>;
  if (!buyable.length) return <p className="prose" role="status">{types.some((x) => x.soldOut) ? 'Sold out.' : 'Ticket sales are not open right now.'}</p>;
  async function buy() {
    setErr(''); setBusy(true);
    try {
      const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'ticket', ticketTypeId: id, qty }) });
      const j = await r.json();
      if (!r.ok || !j.url) throw new Error(j.error || 'Something went wrong. Please try again.');
      location.href = j.url;
    } catch (e) { setErr(e instanceof Error ? e.message : 'Something went wrong.'); setBusy(false); }
  }
  const max = Math.max(1, Math.min(t?.maxPerOrder ?? 1, t?.left ?? 1));
  return (
    <div className="tix">
      <label>Ticket
        <select value={id} onChange={(e) => { setId(e.target.value); setQty(1); }}>
          {buyable.map((x) => <option key={x.id} value={x.id}>{x.name}: {money(x.priceCents)}</option>)}
        </select>
      </label>
      <label>How many
        <select value={qty} onChange={(e) => setQty(Number(e.target.value))}>
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <p className="prose">Total: {money((t?.priceCents ?? 0) * qty)}</p>
      <button className="btn" type="button" onClick={buy} disabled={busy}>{busy ? 'Opening secure checkout...' : 'Buy tickets'}</button>
      <p role="alert" className="pay__msg">{err}</p>
    </div>
  );
}
