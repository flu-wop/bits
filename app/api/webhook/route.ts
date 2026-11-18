import { db } from '@/lib/db';
import { stripe, siteUrl } from '@/lib/stripe';
import { handleStripeEvent } from '@/lib/fulfil';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get('stripe-signature');
  if (!secret || !sig) return new Response('bad request', { status: 400 });
  const raw = await req.text(); // the signature covers the exact bytes
  let ev;
  try { ev = stripe().webhooks.constructEvent(raw, sig, secret); } catch { return new Response('bad signature', { status: 400 }); }
  try {
    await handleStripeEvent(await db(), ev as never, { stripe: stripe(), siteUrl: siteUrl() });
  } catch (e) {
    console.error('webhook failed', ev.type, e instanceof Error ? e.message : e);
    return new Response('retry', { status: 500 });
  }
  return new Response('ok');
}
