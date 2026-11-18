import { db } from '@/lib/db';
import { getCatalog } from '@/lib/orders';
import { stripeConfigured } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const cat = await getCatalog(await db());
  return Response.json({ ...cat, paymentsOpen: stripeConfigured() }, { headers: { 'Cache-Control': 'no-store' } });
}
