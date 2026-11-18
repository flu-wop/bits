import { db } from '@/lib/db';

export async function dashboardStats() {
  const c = await db();
  const one = async (sql: string) => Number((await c.execute(sql)).rows[0].n);
  return {
    published: await one("SELECT COUNT(*) AS n FROM events WHERE status='published'"),
    drafts: await one("SELECT COUNT(*) AS n FROM events WHERE status='draft'"),
    depositsOn: await one('SELECT COUNT(*) AS n FROM deposit_offers WHERE enabled=1'),
    depositsTotal: await one('SELECT COUNT(*) AS n FROM deposit_offers'),
    paidOrders: await one("SELECT COUNT(*) AS n FROM orders WHERE status='paid'"),
  };
}

/** Which services are configured. Booleans only: values are never shown. */
export function setupStatus() {
  const has = (k: string) => !!process.env[k];
  return [
    { label: 'Database (Turso)', ok: has('TURSO_DATABASE_URL') && has('TURSO_AUTH_TOKEN'), note: 'TURSO_DATABASE_URL, TURSO_AUTH_TOKEN' },
    { label: 'Admin emails', ok: has('ADMIN_EMAILS'), note: 'ADMIN_EMAILS' },
    { label: 'Site address', ok: has('SITE_URL'), note: 'SITE_URL' },
    { label: 'Email sending (Resend)', ok: has('RESEND_API_KEY') && has('MAIL_FROM'), note: 'RESEND_API_KEY, MAIL_FROM' },
    { label: 'Stripe', ok: has('STRIPE_SECRET_KEY') && has('STRIPE_WEBHOOK_SECRET'), note: 'STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET' },
  ];
}
