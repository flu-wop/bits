# Stripe: tickets and deposits

Checkout runs on Vercel serverless functions in `/api` next to the flat HTML site. No framework needed.
Everything stays OFF until the keys exist and an item in `api/_catalog.js` is switched on, so the site is safe to deploy first.

## How it works
1. `js/pay.js` asks `/api/catalog` what is for sale and reveals the matching pay buttons.
2. A click sends only the item id (and quantity) to `/api/checkout`. The server looks up the price in `api/_catalog.js`, creates a Stripe Checkout session and returns its URL.
3. The buyer pays on Stripe, then lands on `/thanks`. Stripe emails the receipt.
4. Stripe calls `/api/webhook` (signature verified). A paid session is logged in Vercel as `PAID {...}`.

## Go-live checklist
1. **BITS owns the Stripe account** (Raquel or the BITS entity). Payouts and tax forms go to her.
2. In Vercel > Project > Settings > Environment Variables, add for Production (and Preview, using TEST keys):
   - `STRIPE_SECRET_KEY` (`sk_test_...` first, `sk_live_...` later)
   - `STRIPE_WEBHOOK_SECRET` (`whsec_...`)
   Never commit these. This repo is public.
3. Stripe Dashboard > Developers > Webhooks > add endpoint `https://www.breaksinthesimulation.com/api/webhook`, event `checkout.session.completed`. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Stripe Dashboard > Settings > Emails: turn on successful payment receipts.
5. Set the real amounts in `api/_catalog.js` (cents) and `enabled: true`. Deposits are blank on purpose: the Build Systems prices are ranges, so decide the fixed deposit amounts first.
6. Review the DRAFT payment language in `terms.html` and `privacy.html` (marked with HTML comments). Remove the comments once approved.
7. Test in Stripe test mode with card `4242 4242 4242 4242`, then swap to live keys.

## Adding a ticketed event
1. Add an entry to `api/_catalog.js` (see the commented example), with `maxQty`.
2. On the event page, add:

```html
<div class="pay" data-pay="ticket-ID" data-label="Buy tickets" hidden>
  <select class="pay__qty" aria-label="Quantity"><option>1</option><option>2</option><option>3</option><option>4</option></select>
  <button class="btn pay__btn" type="button">Buy tickets</button>
  <p class="pay__msg" role="status"></p>
</div>
<script src="/js/pay.js" defer></script>
```

## Not built yet (decide if you need it)
- **Capacity limits.** Stripe Checkout cannot cap ticket counts. Selling out safely needs a small database (or switch to Stripe Payment Links with inventory limits).
- **Custom confirmation emails or a ticket with a QR code.** Right now the buyer gets Stripe's receipt only.
- **Abuse limits** on `/api/checkout` (the origin check blocks other sites, not scripts).
- **Existing ticket link.** The Sunset Showcase page still points at buytickets.at; do not mix the two for the same event.
