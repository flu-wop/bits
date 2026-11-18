# BITS rebuild: handoff (updated Nov 17, 2026)

Branch `rebuild/nextjs-admin` holds the full Next.js build. `main` is still the flat site and stays live until cutover. Read `PLAN-NEXTJS.md` (phase notes and open decisions), `STRIPE.md` (payments) and `DEPLOYMENT.md` (cutover).

## Built and verified
Visual and DOM parity with the flat site (15 pages exact; Terms and Privacy changed on purpose), admin sign-in by emailed link (James and Raquel only), events and ticket types, deposits (switched off until amounts are set), seat-safe Stripe checkout, signed webhook, QR ticket emails, orders, door check-in, attendee CSV, public buy buttons, `/gallery` with admin uploads, security headers, 0 production audit findings, axe 0 violations, Lighthouse accessibility and best practices 100.

## Not done / needs people
- Raquel: deposit amounts, whether to move ticketing off buytickets.at, donations on Stripe (and nonprofit status), where to link `/gallery`, her admin email, ticket refund and transfer wording, About "agency" text and "Assets" line approval.
- Legal: Terms and Privacy payment wording is a draft for BITS to review.
- Accounts: Turso database, Resend domain for breaksinthesimulation.com, Vercel Blob store, Stripe test then live keys and webhook (BITS owns the Stripe account).
- Fonts: confirm licences for Mister Pixel and Neue Haas Grotesk.
- Event content is stale (Sunset Showcase 2024, MMNT 2 MMNT 2023); no real event exists yet to sell.
- Rooted in Rhythm is separate and untouched; its two URLs (`rooted-in-rhythm.vercel.app` and `rootedinrhythm.co`) still disagree.

## Constraints that still hold
Look stays identical. Secrets only in Vercel env vars (public repo). Preview deployments are login-protected: share via a Share link or screenshots.
