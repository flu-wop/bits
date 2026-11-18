import { notFound } from 'next/navigation';
import TicketForm from '@/components/TicketForm';
import { db } from '@/lib/db';
import { getCatalog } from '@/lib/orders';
import { stripeConfigured } from '@/lib/stripe';
import { formatLocal } from '@/lib/time';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = (await getCatalog(await db())).events.find((x) => x.slug === slug);
  return { title: e ? `${e.title} - Breaks In The Simulation` : 'Event not found', robots: e ? undefined : { index: false } };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = (await getCatalog(await db())).events.find((x) => x.slug === slug);
  if (!e) notFound();
  return (
    <main id="main" className="main"><div className="panel">
      <h1 className="page-title">{e.title}</h1>
      <p className="prose prose--meta">{formatLocal(e.startsAt)}{e.venue ? ` · ${e.venue}` : ''}</p>
      {e.description ? <p className="prose">{e.description}</p> : null}
      <h2 className="section-head">Tickets</h2>
      <TicketForm types={e.ticketTypes} paymentsOpen={stripeConfigured()} />
      {e.policy ? <p className="prose prose--meta">{e.policy}</p> : null}
      <nav className="pager" aria-label="Back"><a className="pager__link pager__back" href="/Programming-Events"><span aria-hidden="true">&larr;</span> <span>Programming &amp; Events</span></a></nav>
    </div></main>
  );
}
