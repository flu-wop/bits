# Payments (Stripe)

BITS sells **event tickets** (limited seats) and **Build Systems deposits** (fixed amount per package). Everything uses Stripe Checkout on BITS's own Stripe account. Donations are not built: the PayPal link stays until Raquel confirms (see PLAN-NEXTJS.md).

## How a purchase flows
1. Buyer clicks Buy. The browser sends only *which item* and *how many* to `/api/checkout`.
2. The server looks up the price, checks the event is published, sales are open and the quantity is allowed, then **holds the seats** in the database (one write transaction, so the last seat cannot be sold twice).
3. The server creates a Stripe Checkout Session (30+ minute expiry) and sends the buyer there.
4. Stripe calls `/api/webhook`. The signature is verified, the event id is recorded (replays do nothing), the order is marked paid, one ticket per seat is created with a random 128-bit code, and the confirmation email goes out with a QR code per ticket.
5. At the door, an admin pastes or types the scanned link on **Admin > Check-in**. Each ticket works once.

Seats count as taken while an order is paid or its hold is unexpired. Abandoned checkouts free their seats by themselves; a daily cron only tidies old rows.

## Edge cases handled
- Stripe cannot create the session: the hold is released at once.
- Payment arrives after a hold expired: kept if seats remain, otherwise **refunded automatically** and flagged on the order.
- Refund made in the Stripe dashboard: the order shows refunded and its tickets stop working.
- Webhook fails halfway: Stripe retries; the event is only remembered once it succeeded.
- Email fails: use **Admin > Orders > Resend email**.

## Setup (once, in Vercel and Stripe)
Environment variables (Vercel project settings, never the repo): `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_EMAILS`, `SITE_URL`, `RESEND_API_KEY`, `MAIL_FROM`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`.

Stripe dashboard: add a webhook endpoint `https://<site>/api/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `charge.refunded`; copy its signing secret into `STRIPE_WEBHOOK_SECRET`. Use **test keys first**.

## Going live checklist
1. Test keys: buy a ticket with card 4242 4242 4242 4242, confirm email, QR page and check-in; buy the last seat from two browsers; refund in Stripe and confirm the ticket stops working.
2. Verify the sending domain in Resend so mail does not land in spam.
3. Set deposit amounts in Admin > Deposits (they ship switched off).
4. BITS reviews the draft Terms and Privacy text.
5. Swap in live keys and the live webhook secret last. Make one real low-value purchase and refund it.

## Where the code is
`lib/orders.ts` checkout and holds, `lib/fulfil.ts` webhook and emails, `app/api/*` routes, `lib/checkin.ts` door, `tests/orders.test.ts` the tests (concurrency, signatures, replays, late payment).
