# BITS rebuild plan: Next.js + admin (Nov 17, 2026)

Branch: `rebuild/nextjs-admin` (off `main`). Nothing here touches `main` or the live flat site until cutover.
Updated Nov 17 (evening) with James's answers and the new gallery + donations scope.
Inputs: `HANDOFF.md`, `DESIGN.md`, `feature/stripe-checkout` (`STRIPE.md`, `api/*`, `js/pay.js`, `thanks.html`, draft legal copy).

## 1. What the source material actually says

| Finding | Consequence |
|---|---|
| **`tools/build.py` and `source/content.json` are stale.** They generate the old four-room structure (`programming / services / wellness / support`) and have no Build People / Build Communities / Build Systems pages. The live HTML on `main` was edited by hand after. | The **HTML on `main` is the source of truth** for content. Port from it, not from `content.json`. Retire `build.py` once ported. |
| **`DESIGN.md` is partly stale** for the same reason: it lists rooms 00-04 and their accents. Live CSS uses `people` fuchsia, `communities` orange, `systems` cyan, `support` spring green, `home` lime. Tokens, fonts, corridor, CRT, warp and glitch descriptions still hold. | Treat `css/site.css` as the spec. Update `DESIGN.md` as part of the port. |
| Stripe branch is a **stopgap**: server-side pricing, origin check, signature-verified webhook, deposit tick-box. Webhook only `console.log`s `PAID`; there is no order record, no capacity, no idempotency. 18 offline tests, **no live Stripe session ever run**. | Carry over the rules, replace the storage. Re-run a real test-mode session early. |
| Sunset Showcase (Sept 2024, buytickets.at) and MMNT 2 MMNT ("Retreat in 2023") are stale. No upcoming event exists. | Ticketing ships with no live event. Seed one test event only in Preview. |
| Rooted in Rhythm links disagree (`rooted-in-rhythm.vercel.app` on most pages, `rootedinrhythm.co` on `index`, `Build-People`, `Build-Systems` footer). | Out of scope. Port links **byte-for-byte as they are**; flag the mismatch to James, do not fix. |
| Deposit text already promises "We reply with next steps and a deposit invoice." Packages are ranges. | Decided: fixed public amounts per package, set in admin (section 9). The email path stays as the fallback for custom quotes. |

## 2. Stack

- **Next.js App Router** (matches the rest of the ecosystem), deployed on the existing Vercel project `bits` (team `flu-wops-projects`).
- **Turso (libSQL)** for events, ticket types, orders, holds, idempotency, rate limits. Needed because Stripe Checkout cannot cap counts.
- **Stripe** (BITS's own account), Checkout Sessions with `expires_at`. Route handlers for checkout and webhook (raw body via `req.text()`).
- **Resend** for ticket confirmation emails with QR codes (required for launch) and deposit confirmations. Needs the BITS sending domain verified in Resend (DNS access to `breaksinthesimulation.com`).
- **Vercel Blob** for gallery images uploaded from the admin (same pattern as the Liquid Gold admin upload route), resized to WebP on upload.
- **Admin auth:** exactly two allowlisted emails (Raquel and James), magic link via Resend, signed httpOnly session cookie. No passwords to leak. Raquel's login email is still needed. Magic links to Gmail need the Resend domain verified first, so that is a phase 0 blocker.
- Follow the existing site-security standard: server-side pricing, webhook signature + idempotency, Turso-backed rate limiting on `/api/checkout`, security headers, no secrets in the (public) repo.
- All secrets only in Vercel env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `RESEND_API_KEY`, `ADMIN_SESSION_SECRET`. Preview uses Stripe **test** keys.

## 3. Visual parity (the hard constraint)

Rocky/Raquel is particular about the brand, so the port is a **transplant, not a redesign**.

- Serve `css/site.css` unchanged from `public/css/site.css` (plain `<link>`, so Next's CSS pipeline cannot reorder or rewrite it) (same class names, tokens, `data-section` / `data-backdrop` / `data-page` attributes). New admin/ticket styles go in separate files and reuse tokens.
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
- `orders` (id, kind `ticket|deposit|donation`, stripe_session_id UNIQUE, status `held|paid|expired|refunded`, email, name, amount_cents, expires_at, created_at)
- `order_items` (order_id, ticket_type_id or deposit_offer_id, qty, unit_cents)
- `tickets` (id, order_id, ticket_type_id, code UNIQUE random 128-bit token, holder_name nullable, checked_in_at nullable): one row per seat, created on `paid`
- `gallery_items` (id, image_url, width, height, alt, caption, branch `people|communities|systems|support`, event_label, year, sort, visible)
- `stripe_events` (event_id PRIMARY KEY, type, processed_at) for idempotency
- `rate_limits`, `admin_sessions` / `login_tokens`
- Seed script (all environments) creates the three deposit offers disabled, the donation presets, and one **placeholder draft event** ("First ticketed event: TBA", one disabled General Admission type with price and capacity blank). It is never public until Raquel fills it in and publishes it.

## 5. Capacity without overselling

1. `POST /api/checkout` validates item + qty, checks same-origin and rate limit, then in **one transaction** inserts a `held` order and only if `sold + held + qty <= capacity` (conditional UPDATE, no read-then-write).
2. Create the Stripe session with `expires_at` = 30 min and the order id in metadata. If Stripe fails, delete the hold.
3. Webhook `checkout.session.completed` (paid) marks the order `paid`; `checkout.session.expired` releases the hold. A scheduled cleanup (Vercel Cron) releases stale holds as a backstop.
4. Webhook inserts the event id into `stripe_events` first; a duplicate delivery is a no-op.
5. Public pages show "sold out" from the database count, never from client state.

## 6. Admin (`/admin`, noindex, behind auth)

- **Events:** create/edit/publish/archive; ticket types with price, capacity, sale window.
- **Orders:** list and filter, per-event attendee list, CSV export, link to the Stripe payment, mark refunded (refunds themselves are issued in Stripe).
- **Deposits:** set the fixed amount per package and switch each on/off. Public buttons appear only for enabled packages.
- **Check-in:** phone-friendly page at `/admin/checkin`. Scanning a ticket QR with any phone camera opens `/admin/checkin/<code>` (behind login), shows holder, event and ticket type, and marks it used once. Already-used and wrong-event codes are shown clearly. A manual search by email or name is the fallback.
- **Gallery:** upload images, set alt text (required), caption, branch tag, event/year, order and visibility. Drag to reorder.
- **Donations:** set the preset amounts and a min/max for custom amounts.
- **Dashboard:** tickets sold vs capacity, revenue by event, recent orders.
- Styled with the same tokens (dark, pixel headings, readable body), but plain and fast. Mobile-usable, since Raquel will likely use a phone.

## 7. Public flows

- **Tickets:** event pages (in the Build Communities room) show ticket types from the DB, quantity picker, sold-out state, Checkout. Sunset Showcase's buytickets.at link stays until BITS decides otherwise, never both for one event.
- **Deposits:** on `/Build-Systems#start-a-project`, pay button per package only when its offer is enabled, with the deposit tick-box ("non-refundable once work begins, applied to the package"). The email path stays as the fallback.
- **Ticket emails:** on `paid`, one email per order with a QR code per seat (PNG attached inline, since email clients block data URIs), event details, order id, and the refund/transfer line. Code is an unguessable token, not the order id. Resend failures are logged and retried; the buyer still has Stripe's receipt.
- **Donations (proposed, Raquel to confirm):** replaces the PayPal link on `/Show-Your-Support` with a Stripe Checkout one-time donation (preset amounts plus custom within a min/max, server-validated). Kept completely separate from deposits, as the site copy already insists. Patreon and merch links are untouched. Monthly giving is not in scope unless asked.
- **Gallery (`/gallery`):** new page, see section 7a.
- **`/thanks`** (noindex) carried over, reads the session to show what was bought.
- **Legal:** draft Terms and Privacy payment wording from the Stripe branch is carried over, still marked DRAFT in comments until BITS approves. Privacy must now also cover the stored order data (name, email, what was bought, amount) and Resend.

## 7a. Gallery (`/gallery`)

Reference: the gallery on the Liquid Gold site (`GalleryMarquee.tsx`): three stacked rows of tall cards drifting in alternating directions (70-90 s loops), soft edge fades, a category chip on each card, a caption that rises on hover, pure CSS motion, static and swipeable under `prefers-reduced-motion`, server-rendered.

For BITS:
- **Same behaviour, BITS look.** Not Liquid Gold's rounded cream cards. Hard pixel edges, the branch accent as the chip color (people fuchsia, communities orange, systems cyan, support spring), glitch hover from the existing CSS, sitting on the room plate. Reuses tokens only.
- **Below the marquee:** a full grid of the whole archive with filters by branch and year, click to open a larger view (native `<dialog>`, keyboard and Esc support). A marquee alone cannot show an archive of dozens of items.
- **Content comes from the admin** (`gallery_items`, images in Vercel Blob), so Raquel can add events without a developer. Initial seed comes from her media archive.
- **Route:** `/gallery` (not `/portfolio`), indexable, included in the sitemap.
- **Navigation is a decision (G1):** the header has four brand-defined items. Adding a fifth changes the header Rocky is particular about. Proposal: no new nav item; link from the footer, a section tile on the home page, and from the bottom of Build Communities. Raquel decides.
- **Rights:** admin requires alt text; Raquel confirms she has permission for photos of people and any third-party media.
- Videos, if the archive has them, are out of scope for v1 (poster image plus link out).

## 8. Phases

| # | Phase | Done when |
|---|---|---|
| 0 | Decisions below answered; Stripe test keys + Turso DB + Resend domain in Vercel Preview env | Keys present, nothing in the repo |
| 1 | **DONE** Scaffold Next, port all 17 pages, layout, warp (see Phase 1 notes below) | Screenshot diff vs flat site clean at 1440/390; links check passes |
| 2 | **DONE (locally)** DB schema, seed, admin auth, events + ticket types + deposit offers CRUD | Admin works end to end; still to do on Preview: Turso + Resend + env vars |
| 3 | Checkout, capacity holds, webhook (idempotent), ticket rows + QR email, check-in page, expiry/cron, ported + new tests | Real Stripe **test-mode** purchase, oversell attempt rejected, duplicate webhook ignored |
| 4 | Public ticket, deposit and donation UI, `/thanks`, `/gallery` + admin gallery, legal copy updated | Ticket (with QR email and check-in scan), deposit and donation flows and the gallery working on Preview |
| 5 | Security pass, a11y, Lighthouse, site-audit, `DESIGN.md` + `STRIPE.md` rewritten | Audit findings fixed; Raquel walkthrough on a Share link |
| 6 | Cutover | See below |

**Cutover:** keep the flat site live. Develop on branch previews only (they are login-protected, so share via Share link or screenshots). When Raquel approves: switch the Vercel project's framework preset to Next.js, set Production env (live keys last), merge to `main`, register the live webhook endpoint, run one real low-value live charge and refund, and keep the previous flat deployment ready to roll back to.

## 8a. Phase 1 notes (done)

- Flat pages moved to `legacy/` (still the visual reference); `css/ js/ fonts/ img/ images/` moved to `public/` with identical URLs.
- `scripts/migrate-flat-site.py` extracted each page's `<main>` into `content/main/<slug>.html` and the head/body/header/footer variables into `content/pages.json`, and generated the routes. It asserts the head and body skeleton are identical across pages.
- **Every page has its own root layout (route group)** so `<html data-section>` and `<body data-page data-backdrop>` match the flat site and the CSS needs no changes. Moving between pages is a full page load, exactly as on the flat site, so `public/js/site.js` (menu, warp, deep link) is **unchanged** instead of being rewritten as a client component. Cost: no client-side routing. Admin gets its own root layout later.
- `vercel.json` now just sets `"framework": "nextjs"`; headers, redirects (`/x.html` to `/x`) and cache rules live in `next.config.mjs`. `app/global-not-found.tsx` is a branded 404 (new chrome text: "Page not found").
- Page content is HTML in `content/main/` for now. Pages that need data (events, ticketing, gallery, donations) become components when their phase starts.
- Checks: `npm run build && npm run parity` compares flat vs Next for all 17 pages at 390 and 1440 (rendered DOM and full-page pixels, animation frozen on both): **0 differences**. `python3 scripts/smoke.py` covers menu, warp navigation, arrival, deep link, redirects, 404, headers, no-JS, reduced motion, console errors: all pass.
- Footer Rooted in Rhythm links carried over per page exactly as on the flat site (mixed `rootedinrhythm.co` / `rooted-in-rhythm.vercel.app`).

## 8b. Phase 2 notes (done)

- **Database:** libSQL client. Production uses Turso (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`); development falls back to a local file `.data/bits.db` with the same code. Migration `0001` (`db/migrations.ts`) creates every table in section 4 except `gallery_items` (phase 4); runs automatically on first use. The database itself enforces the key rules (no enabled ticket type or deposit without a price/capacity/amount, 50-cent minimum).
- **Seed:** three deposit offers (off, no amount; the package ranges are shown only as hints) and the placeholder draft event with one off General Admission type. It cannot be published until the placeholder title, date, venue and an on-sale ticket type are filled in.
- **Admin auth:** exactly the addresses in `ADMIN_EMAILS`. Magic link (15 min, single use, stored hashed); the emailed link only opens a confirm page and the button consumes it, so mail scanners can't burn it. Sessions 7 days, stored hashed, re-checked against the allowlist on every request. Rate limits per IP and per address. Same neutral message for allowed and unknown addresses. Every admin page and every server action calls `requireAdmin()` itself. `/admin/*` is `noindex` and `no-store`.
- **Admin screens:** Dashboard (counts + which services are configured, booleans only), Events (list, create, edit, publish/draft/archive with live "what's missing" list), Ticket types (add, edit, on/off, delete unless it has orders), Deposits (amount + on/off per package). Money entered in dollars, stored as cents.
- **Tests:** `npm test` (42 unit tests: validation, schema/seed, event and ticket rules, deposits, rate limit, auth) and `python3 scripts/admin-e2e.py` (real browser: sign-in flow, link reuse, publish rules, persistence, sign-out, headers). Public parity and smoke checks still pass.
- Needs setup before Preview works: Turso database, `ADMIN_EMAILS`, `SITE_URL`, Resend key and a verified sending domain (see `.env.example`). Without Resend, local development prints the sign-in link in the server console.

## 9. Decisions

**Answered by James (Nov 17):**
- Deposits: **fixed public amount per package**, set in admin. (Per-client links are not being built.)
- First ticketed event: **placeholder** draft event seeded, filled in by Raquel later.
- Ticket delivery: **confirmation email with a QR code per seat**, plus a check-in scan page.
- Admin users: **James and Raquel only.**
- Gallery: its own page, **`/gallery`**, modelled on the Liquid Gold gallery.

**Still open:**
- **Deposit amounts** (cents) for Discovery, Event Ops, Residency. Ranges are $250-$500, $2,500-$7,500, $8,000-$20,000+. Raquel decides; they ship disabled until set.
- **Donations on Stripe:** James suggested it to Raquel; her reply in the screenshots does not confirm it. Needs her yes, her preset amounts, and whether BITS is a registered nonprofit (affects receipt wording and the Privacy/Terms text).
- **G1:** gallery in the header nav, or footer/home/Build Communities links only (recommended).
- **Media archive access:** Raquel's archive (the Google link in the screenshots was a sign-in page). Needs sharing with James's Google account so it can be pulled in; also which items are cleared for public use.
- **Raquel's admin login email** and **James's** (flu.wop@gmail.com assumed).
- **DNS/Resend:** who can add DNS records for `breaksinthesimulation.com` so BITS can send email from its own domain.
- **Stripe account:** Raquel owns it and shares test keys; who registers the live webhook.
- **Ticket policy text:** refund/transfer wording for the first event.
- **Copy approvals:** dropped "agency" About text, the "Assets" line, DRAFT Terms/Privacy payment wording.
- **Fonts:** Mister Pixel and Neue Haas Grotesk licensing (`REPORT.md`).
- **Eventbrite / buytickets.at:** Sunset Showcase still links to buytickets.at. Replace once a Stripe-sold event exists; never both for one event.
- **Rooted in Rhythm URL mismatch:** left alone here.

## 10. Risks

- Visual drift on the port (mitigated by the diff gate).
- Overselling or double-processing (mitigated by atomic holds, idempotency, test-mode race test).
- Secrets in a public repo (env-only; `.env*` already ignored).
- Static-to-Next framework switch on the live Vercel project at cutover (rehearse on Preview; keep rollback).
- Scope creep into Rooted in Rhythm (explicitly excluded).
- Gallery performance: many images in a drifting marquee. Mitigated by WebP resizing on upload, lazy loading, and only the first row animating more than a few cards.
- Email deliverability for QR tickets (domain verification, SPF/DKIM) and a lost-email path: admin can resend a ticket email.
