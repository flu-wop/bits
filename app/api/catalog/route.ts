import { db } from '@/lib/db';
import { getCatalog } from '@/lib/orders';
import { stripeConfigured } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const cat = await getCatalog(await db());
    return Response.json({ ...cat, paymentsOpen: stripeConfigured() }, { headers });
  } catch (e) {
    // The marketing pages must never break because payments are unavailable: report "nothing on sale".
    console.error('catalog failed', e instanceof Error ? e.message : e);
    return Response.json({ events: [], deposits: [], paymentsOpen: false }, { headers });
  }
}
