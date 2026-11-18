# BITS rebuild plan: Next.js + admin (Nov 17, 2026)

Branch: `rebuild/nextjs-admin` (off `main`). Nothing here touches `main` or the live flat site until cutover.
Inputs: `HANDOFF.md`, `DESIGN.md`, `feature/stripe-checkout` (`STRIPE.md`, `api/*`, `js/pay.js`, `thanks.html`, draft legal copy).

## 1. What the source material actually says

| Finding | Consequence |
|---|---|
| **`tools/build.py` and `source/content.json` are stale.** They generate the old four-room structure (`programming / services / wellness / support`) and have no Build People / Build Communities / Build Systems pages. The live HTML on `main` was edited by hand after. | The **HTML on `main` is the source of truth** for content. Port from it, not from `content.json`. Retire `build.py` once ported. |
| **`DESIGN.md` is partly stale** for the same reason: it lists rooms 00-04 and their accents. Live CSS uses `people` fuchsia, `communities` orange, `systems` cyan, `support` spring green, `home` lime. Tokens, fonts, corridor, CRT, warp and glitch descriptions still hold. | Treat `css/site.css` as the spec. Update `DESIGN.md` as part of the port. |
| Stripe branch is a **stopgap**: server-side pricing, origin check, signature-verified webhook, deposit tick-box. Webhook only `console.log`s `PAID`; there is no order record, no capacity, no idempotency. 18 offline tests, **no live Stripe session ever run**. | Carry over the rules, replace the storage. Re-run a real test-mode session early. |
| Sunset Showcase (Sept 2024, buytickets.at) and MMNT 2 MMNT ("Retreat in 2023") are stale. No upcoming event exists. | Ticketing ships with no live event. Seed one test event only in Preview. |
| Rooted in Rhythm links disagree (`rooted-in-rhythm.vercel.app` on most pages, `rootedinrhythm.co` on `index`, `Build-People`, `Build-Systems` footer). | Out of scope. Port links **byte-for-byte as they are**; flag the mismatch to James, do not fix. |
| Deposit text already promises "We reply with next steps and a deposit invoice." Packages are ranges. | Fixed public deposit buttons may not fit; see decision D2. |

## 2. Stack

- **Next.js App Router** (matches the rest of the ecosystem), deployed on the existing Vercel project `bits` (team `flu-wops-projects`).
- **Turso (libSQL)** for events, ticket types, orders, holds, idempotency, rate limits. Needed because Stripe Checkout cannot cap counts.
- **Stripe** (BITS's own account), Checkout Sessions with `expires_at`. Route handlers for checkout and webhook (raw body via `req.text()`).
- **Resend** for ticket and deposit confirmation emails (phase 4; Stripe receipts cover launch).
- **Admin auth:** allowlisted emails, magic link via Resend, signed httpOnly session cookie. No passwords to leak. Allowlist: Raquel plus James.
- Follow the existing site-security standard: server-side pricing, webhook signature + idempotency, Turso-backed rate limiting on `/api/checkout`, security headers, no secrets in the (public) repo.
- All secrets only in Vercel env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `RESEND_API_KEY`, `ADMIN_SESSION_SECRET`. Preview uses Stripe **test** keys.

## 3. Visual parity (the hard constraint)

Rocky/Raquel is particular about the brand, so the port is a **transplant, not a redesign**.

- Copy `css/site.css` into `app/globals.css` unchanged (same class names, tokens, `data-section` / `data-backdrop` / `data-page` attributes). New admin/ticket styles go in separate files and reuse tokens.
- Port each page's markup 1:1 into server components (content as typed TS modules, one per page). Plain `<img>`/`<picture>` with the existing WebP `srcset`s, no `next/image`, so the rendered output cannot drift.
- Fonts: same files in `public/fonts`, `@font-face` as today, same preload for `MisterPixel.woff`. Carry the licensing flags from `REPORT.md` (Mister Pixel / Velvetyne, Neue Haas Grotesk web licence, Cargo icon font) forward as open items for Raquel.
- Corridor, CRT, warp, glitch: unchanged markup and CSS. **One real change:** `js/site.js` does full-page navigations with a `sessionStorage` flag. With client-side routing, rebuild the warp as a client component (iris closes 260 ms, `router.push`, iris opens 220 ms, skip on key/tap/second click, off for `prefers-reduced-motion`). Keep the no-JS fallback (plain links).
- URLs: keep every existing path exactly, including case (`/Build-People`, `/Programming-Events`, `/Sunset-Showcase`, ...), plus `/privacy`, `/terms`. No redirects needed.
- `vercel.json` headers and the immutable cache on `/fonts` and `/img` move to `next.config` headers.
- **Gate:** reuse `qa/shots.mjs` + `qa/diff.mjs`. Screenshot every page on the flat site and the Next build at 1440 and 390 (plus reduced-motion). Phase 1 does not close until the diff is clean or each difference is explained and approved. Also rerun `qa/links.mjs` and the Lighthouse notes in `qa/lighthouse.md`.

## 4. Data model (Turso)

- `events` (id, slug, title, starts_at, venue, description, status draft/published/archived)
- `ticket_types` (id, event_id, name, price_cents, capacity, max_per_order, sales_open, sales_close, enabled)
- `deposit_offers` (id, package key `discovery|event-ops|residency`, label, amount_cents, enabled)
- `orders` (id, kind `ticket|deposit`, stripe_session_id UNIQUE, status `held|paid|expired|refunded`, email, name, amount_cents, expires_at, created_at)
- `order_items` (order_id, ticket_type_id or deposit_offer_id, qty, unit_cents)
- `stripe_events` (event_id PRIMARY KEY, type, processed_at) for idempotency
- `rate_limits`, `admin_sessions` / `login_tokens`
- Seed script creates the three deposit offers disabled, no events.

## 5. Capacity without overselling

1. `POST /api/checkout` validates item + qty, checks same-origin and rate limit, then in **one transaction** inserts a `held` order and only if `sold + held + qty <= capacity` (conditional UPDATE, no read-then-write).
2. Create the Stripe session with `expires_at` = 30 min and the order id in metadata. If Stripe fails, delete the hold.
3. Webhook `checkout.session.completed` (paid) marks the order `paid`; `checkout.session.expired` releases the hold. A scheduled cleanup (Vercel Cron) releases stale holds as a backstop.
4. Webhook inserts the event id into `stripe_events` first; a duplicate delivery is a no-op.
5. Public pages show "sold out" from the database count, never from client state.

## 6. Admin (`/admin`, noindex, behind auth)

- **Events:** create/edit/publish/archive; ticket types with price, capacity, sale window.
- **Orders:** list and filter, per-event attendee list, CSV export, link to the Stripe payment, mark refunded (refunds themselves are issued in Stripe).
- **Deposits:** set the fixed amount per package and switch on/off; optionally issue a one-off deposit link for a named client with an agreed amount (see D2).
- **Dashboard:** tickets sold vs capacity, revenue by event, recent orders.
- Styled with the same tokens (dark, pixel headings, readable body), but plain and fast. Mobile-usable, since Raquel will likely use a phone.

## 7. Public flows

- **Tickets:** event pages (in the Build Communities room) show ticket types from the DB, quantity picker, sold-out state, Checkout. Sunset Showcase's buytickets.at link stays until BITS decides otherwise, never both for one event.
- **Deposits:** on `/Build-Systems#start-a-project`, pay button per package only when its offer is enabled, with the deposit tick-box ("non-refundable once work begins, applied to the package"). The email path stays as the fallback.
- **`/thanks`** (noindex) carried over, reads the session to show what was bought.
- **Legal:** draft Terms and Privacy payment wording from the Stripe branch is carried over, still marked DRAFT in comments until BITS approves. Privacy must now also cover the stored order data (name, email, what was bought, amount) and Resend.

## 8. Phases

| # | Phase | Done when |
|---|---|---|
| 0 | Decisions below answered; Stripe test keys + Turso DB + Resend domain in Vercel Preview env | Keys present, nothing in the repo |
| 1 | Scaffold Next, port all 17 pages, layout, warp component | Screenshot diff vs flat site clean at 1440/390; links check passes |
| 2 | DB schema, seed, admin auth, events + ticket types + deposit offers CRUD | Admin works end to end on Preview |
| 3 | Checkout, capacity holds, webhook (idempotent), expiry/cron, ported + new tests | Real Stripe **test-mode** purchase, oversell attempt rejected, duplicate webhook ignored |
| 4 | Public ticket + deposit UI, `/thanks`, emails, legal copy updated | Full ticket and deposit flows on Preview |
| 5 | Security pass, a11y, Lighthouse, site-audit, `DESIGN.md` + `STRIPE.md` rewritten | Audit findings fixed; Raquel walkthrough on a Share link |
| 6 | Cutover | See below |

**Cutover:** keep the flat site live. Develop on branch previews only (they are login-protected, so share via Share link or screenshots). When Raquel approves: switch the Vercel project's framework preset to Next.js, set Production env (live keys last), merge to `main`, register the live webhook endpoint, run one real low-value live charge and refund, and keep the previous flat deployment ready to roll back to.

## 9. Decisions needed

- **D1. Admin people:** Raquel + James only, or others? Magic link OK?
- **D2. Deposits:** fixed public amount per package (as the handoff says), or Raquel-issued per-client deposit links after a quote (matches "we reply with a deposit invoice" and the 25-40% ranges)? Either way she must give the numbers; recommendation is both.
- **D3. First ticketed event:** name, date, price tiers, capacity, refund/transfer policy.
- **D4. Ticket delivery:** Stripe receipt only, or a confirmation email with a QR code and door check-in list?
- **D5. Stripe account:** Raquel creates/owns it and shares restricted/test keys; who adds the live webhook?
- **D6. Copy approvals:** the dropped "agency" About text and the "Assets" line in the full-picture toggle, plus the DRAFT Terms/Privacy payment wording.
- **D7. Fonts:** Mister Pixel and Neue Haas Grotesk licensing (from `REPORT.md`) before this is called final.
- **D8. Rooted in Rhythm URL mismatch:** left alone here; someone should decide the canonical link separately.

## 10. Risks

- Visual drift on the port (mitigated by the diff gate).
- Overselling or double-processing (mitigated by atomic holds, idempotency, test-mode race test).
- Secrets in a public repo (env-only; `.env*` already ignored).
- Static-to-Next framework switch on the live Vercel project at cutover (rehearse on Preview; keep rollback).
- Scope creep into Rooted in Rhythm (explicitly excluded).
