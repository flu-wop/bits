import { attendees, toCsv } from '@/lib/checkin';
import { currentAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentAdmin())) return new Response('unauthorized', { status: 401 });
  const { id } = await params;
  const rows = await attendees(id);
  const csv = toCsv([['Ticket', 'Holder', 'Buyer email', 'Order status', 'Paid at', 'Checked in', 'Code'],
    ...rows.map((r) => [String(r.type_name), (r.holder_name as string) ?? '', String(r.email ?? ''), String(r.status), String(r.paid_at ?? ''), String(r.checked_in_at ?? ''), String(r.code)])]);
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="attendees.csv"', 'Cache-Control': 'no-store' } });
}
