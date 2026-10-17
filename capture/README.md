# capture/

Snapshot of https://breaksinthesimulation.com taken 2026-10-17 with Playwright/Chromium (one session, 1.5 s between page loads, desktop 1440px and mobile 390px).

| Path | What |
|---|---|
| `<slug>/rendered.html` | full rendered DOM (desktop run) |
| `<slug>/text.md` | verbatim visible text in reading order with element and per-run color |
| `<slug>/desktop.png`, `mobile.png` | full-page screenshots |
| `<slug>/links.json` | every `<a>`: label, resolved href, raw href, internal/external/contact, opens-in-new-tab |
| `assets/` + `assets/manifest.json` | original-resolution images, source URLs, pixel sizes |
| `fonts/` | the font files the live site loads |
| `typography.json`, `palette.json` | computed styles / colors |
| `content.json` | structured verbatim content, the single source for both design branches |
| `SITEMAP.md` | page tree + link graph |
| `scripts/` | the crawl and build scripts that produced this folder |
| `_raw/` | raw crawl data (pass2: fonts/network, pass3: break-aware text runs, graph, visited) |

Directories `Mindset-Coaching`, `Fire-Ice`, `MMNT-2-MMNT-event` are live 404s that the site links to; kept as evidence.
Wayback Machine was not needed (and is blocked by this environment); nothing here is sourced from an archive.
