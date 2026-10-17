# BITS — `cleaned-up`

Static site for Breaks In The Simulation: Rocky's existing look, fixed and tightened. No framework, no build step at deploy time. Open `index.html` or deploy as-is on Vercel.

- `*.html` — one page per live URL (Vercel `cleanUrls`: `/about-us`, `/Programming-Events`, …)
- `css/site.css`, `js/site.js` (menu toggle only; site works without JS)
- `fonts/` — her original font files (+ Space Mono for long body text)
- `img/` — her original images, resized/re-encoded for the web (originals: `capture` branch)
- `source/content.json` — the single content source; `palette.json`, `typography.json`, `meta.json` alongside
- `tools/build.py` — regenerates the HTML from `source/`; `tools/prepare_assets.py` — images
- `qa/` — Playwright scripts (text diff, link check, screenshots) + `serve.mjs` (local server with cleanUrls)
- `DESIGN.md`, `REPORT.md`

Local preview: `node qa/serve.mjs . 4173` then open http://localhost:4173.
`.vercelignore` keeps `source/`, `tools/`, `qa/` and the markdown docs out of the deployment.
