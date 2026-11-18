import { db } from '@/lib/db';
import { releaseExpiredHolds } from '@/lib/orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('unauthorized', { status: 401 });
  return Response.json({ released: await releaseExpiredHolds(await db()) });
}
