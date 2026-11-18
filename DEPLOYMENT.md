# Deployment and cutover

The Next.js build deploys from branch `rebuild/nextjs-admin`. The flat site on `main` keeps serving `www.breaksinthesimulation.com` until the last step.

## Before cutover
1. Create a Turso database; set `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`. Tables are created on first request.
2. Set `ADMIN_EMAILS`, `SITE_URL` (the final https address, no trailing slash), `CRON_SECRET`.
3. Resend: verify the sending domain, set `RESEND_API_KEY` and `MAIL_FROM`. Sign-in links and ticket emails depend on this.
4. Vercel Blob: create a store in the project (sets `BLOB_READ_WRITE_TOKEN`) so gallery uploads work.
5. Stripe: follow the checklist in `STRIPE.md` with **test keys** on a preview deployment.
6. Run `npm test`, `npm run build` and the scripts in `scripts/` locally; all should pass.

## Cutover
1. In the Vercel project `bits`, set the framework preset to Next.js and the production branch to the rebuild (or merge it into `main`). `vercel.json` already says `"framework": "nextjs"` and registers the daily cron.
2. Swap Stripe to live keys and the live webhook secret last. Make one real low-value purchase and refund it.
3. Sign in at `/admin` as Raquel and as James and confirm both links arrive.
4. Spot-check every page against the old site; check `/about-us.html` style links redirect.

## Rollback
Re-deploy the previous production deployment from the Vercel dashboard (or `vercel rollback`). The flat site is untouched on `main` history, so this is a one-click revert. Data in Turso is not affected.
