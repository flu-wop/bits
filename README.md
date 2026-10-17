# BITS — `immersive`

Static site for Breaks In The Simulation, presented as the simulation: checker-vortex corridor, HUD header, level-select menu, CRT scanlines, glitch hovers and a pixel warp between pages. Same copy, pages and assets as the live site. No framework, no build step at deploy time; deploys on Vercel as-is.

- `*.html` — one page per live URL (`cleanUrls`: `/about-us`, `/Programming-Events`, …)
- `css/site.css`, `js/site.js` (menu + warp transition; the site works without JS)
- `fonts/`, `img/` — her original fonts and images (images resized/re-encoded; originals on the `capture` branch)
- `source/content.json` — single content source; `palette.json`, `typography.json`, `meta.json` alongside
- `tools/build.py`, `tools/prepare_assets.py`
- `qa/` — Playwright checks: text diff, links, screenshots, transition behavior; `serve.mjs` = local server with cleanUrls
- `DESIGN.md`, `REPORT.md`

Local preview: `node qa/serve.mjs . 4173`, open http://localhost:4173. Motion respects `prefers-reduced-motion` (corridor, CRT flicker, glitch, warp all off).
`.vercelignore` keeps `source/`, `tools/`, `qa/` and the markdown docs out of the deployment.
