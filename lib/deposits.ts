import type { Client } from '@libsql/client';
import { db } from '@/lib/db';
import { MAX_DEPOSIT_CENTS, checkDepositOffer, cleanText, type Result } from '@/lib/validate';

export type DepositOffer = { id: string; key: string; label: string; hint: string; amountCents: number | null; enabled: boolean };

export async function listDepositOffers(c?: Client): Promise<DepositOffer[]> {
  const client = c ?? (await db());
  return (await client.execute('SELECT * FROM deposit_offers ORDER BY sort')).rows.map((r) => ({
    id: String(r.id), key: String(r.key), label: String(r.label), hint: String(r.hint), amountCents: r.amount_cents == null ? null : Number(r.amount_cents), enabled: Number(r.enabled) === 1,
  }));
}

export async function saveDepositOffer(id: string, input: { label: string; amountCents: number | null; enabled: boolean }, c?: Client): Promise<Result> {
  const client = c ?? (await db());
  const label = cleanText(input.label, 100, 'Label', true); if (!label.ok) return label;
  if (input.amountCents != null && input.amountCents > MAX_DEPOSIT_CENTS) return { ok: false, error: 'That amount is too large.' };
  const problem = checkDepositOffer(input); if (problem) return { ok: false, error: problem };
  const r = await client.execute({ sql: 'UPDATE deposit_offers SET label=?, amount_cents=?, enabled=? WHERE id=?', args: [label.value, input.amountCents, input.enabled ? 1 : 0, id] });
  return r.rowsAffected ? { ok: true } : { ok: false, error: 'Offer not found.' };
}
