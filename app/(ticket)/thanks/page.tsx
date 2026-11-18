import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Thank you', robots: { index: false, follow: false } };

export default async function Thanks({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const o = session_id && /^cs_[A-Za-z0-9_]{10,200}$/.test(session_id)
    ? (await (await db()).execute({ sql: 'SELECT kind, status FROM orders WHERE stripe_session_id = ?', args: [session_id] })).rows[0] : undefined;
  const paid = o?.status === 'paid';
  return (
    <main className="adm-wrap adm-wrap--narrow">
      <h1 className="adm-h1">{paid ? 'Thank you.' : 'Almost there'}</h1>
      {paid
        ? <p className="adm-lede">{o?.kind === 'ticket' ? 'Your tickets are on their way to your email, each with a QR code for the door.' : 'We received your deposit and sent a receipt to your email. We will be in touch shortly.'}</p>
        : <p className="adm-lede" role="status">We are confirming your payment. This can take a minute. Your confirmation email arrives as soon as it clears. Questions? Email us and we will sort it out.</p>}
      <p><a href="/">Back to the site</a></p>
    </main>
  );
}
