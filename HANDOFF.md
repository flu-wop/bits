# BITS rebuild: handoff (Nov 17, 2026)

Start the full build in a new session. Work on a new branch off `main`, never on `main` directly.

## Where things stand
- **Live (main):** flat HTML site, restructured around three branches: Build People, Build Communities, Build Systems, plus Show Your Support. Pixel/corridor look, layered About page, paid-work packages on `/Build-Systems`. Production is `www.breaksinthesimulation.com` (Vercel project `bits`, team `flu-wops-projects`).
- **Branch `feature/stripe-checkout` (not merged):** stopgap Stripe checkout on the flat site: `api/checkout.js`, `api/catalog.js`, `api/webhook.js`, `api/_catalog.js`, `js/pay.js`, `thanks.html`, `STRIPE.md`, draft payment language in `terms.html` and `privacy.html`. Tested offline (18 tests); no live Stripe session has been run. Every item ships disabled.

## The goal
Rebuild as Next.js with an admin, so Raquel (BITS founder) can manage events, tickets and deposits. Sells:
- **Event tickets** with capacity limits (Stripe Checkout cannot cap counts on its own, so this needs a database).
- **Build Systems deposits** at fixed amounts. Amounts are not decided yet; the packages are price ranges (Discovery $250-$500, Event Ops $2,500-$7,500, Residency $8,000-$20,000+).

## Decisions already made
- Stripe account is **BITS's own** (not James's). Keys go in Vercel environment variables, never the repo (the repo is public).
- Three-branch structure and the new About copy are in place. Raquel has not yet approved the copy: the dropped "agency" About text and the "Assets" line in the full-picture toggle are unconfirmed.
- **Rooted in Rhythm is a separate project. Leave it untouched.** Existing pages link to `rooted-in-rhythm.vercel.app`; `index.html` and the new pages link to `rootedinrhythm.co`. This mismatch pre-dates this work.

## Carry over from the Stripe branch
Server-side pricing only, signature-verified webhook, same-origin check, deposit terms tick-box ("non-refundable once work begins, applied to the package"), draft Terms and Privacy wording (Privacy previously claimed no personal data is collected).

## Constraints
- **The look must stay visually identical.** Rocky/Raquel is particular about the brand. Read `DESIGN.md` for tokens, section colors, fonts and the corridor/CRT/warp effects.
- Keep the flat site live until the Next.js version is ready to replace it.
- Event content is stale: Sunset Showcase shows September 22, 2024 with a buytickets.at link; MMNT 2 MMNT says "Retreat in 2023". No upcoming event exists to sell tickets for yet.
- Terms and Privacy payment language is a DRAFT and needs BITS review before payments go live.
- Vercel preview deployments are login-protected; share previews via a Share link or screenshots.
