# Breaks In The Simulation (BITS)

Next.js site for BITS: the pixel/corridor look of the flat site, plus an admin where Raquel manages events, tickets, deposits and the gallery. The flat site stays live until cutover (see DEPLOYMENT.md).

## What is where
- `app/` pages. Each public page has its own route group and root layout so `public/css/site.css` and `public/js/site.js` work unchanged. `(admin)` is the admin, `(ticket)` holds `/ticket/[code]` and `/thanks`, `(events)` holds `/events/[slug]`, `(gallery)` holds `/gallery`, `api/` holds checkout, webhook, catalog and cron.
- `content/` the 17 migrated pages (`main/*.html`, `pages.json`). `legacy/` is the flat site, kept only as the parity reference.
- `lib/` business logic: `orders.ts` (checkout and seat holds), `fulfil.ts` (webhook and emails), `checkin.ts`, `events.ts`, `deposits.ts`, `gallery.ts`, `auth.ts`.
- `db/migrations.ts` schema (applied automatically). `tests/` unit tests. `scripts/` browser checks.
- `PLAN-NEXTJS.md` decisions, phase notes, open items. `STRIPE.md` payments. `DESIGN.md` look and tokens.

## Run it
```
npm install
npm run dev          # http://localhost:3000, local database in .data/ (git-ignored)
npm test             # unit tests
npm run build
```
Without keys the site works; payments, email and uploads stay off. Copy `.env.example` for the variables. Sign-in links print to the dev server console when no email service is configured.

## Checks
`python3 scripts/parity.py` (pixel and DOM match with the flat site), `smoke.py`, `admin-e2e.py`, `phase4-e2e.py`, `a11y.py` (axe). Run `npm run build` first. The flat-site comparison needs `legacy/`.

## Rules that matter
Secrets live only in Vercel environment variables (this repo is public). Prices are decided on the server, never the browser. Rooted in Rhythm is a separate project: do not touch it.
