import Stripe from 'stripe';

let cached: Stripe | null = null;
/** Server-side Stripe client. The secret key only ever comes from the environment (never the repo). */
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  cached ??= new Stripe(key);
  return cached;
}
export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

export function siteUrl(): string {
  const u = process.env.SITE_URL;
  if (u) return u.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') throw new Error('SITE_URL is not set');
  return 'http://localhost:3000';
}
