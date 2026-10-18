# DESIGN — `immersive`

Same words, same assets, same pages as the live site, presented as the simulation: the homepage is the checker-vortex corridor from her logo, each section is a numbered room you travel into. Everything visible comes from `source/content.json`; nothing here adds lore or copy.

## Concept → implementation

| Idea | How (all CSS/JS, no media, no libraries) |
|---|---|
| Home = the corridor | the BITS (mic as the i) logo, `source/bts-logo-mic.png`, in the corridor centered over a pure-CSS checker tunnel (`.corridor`: perspective floor + two walls + vanishing-point glow). Hovering a level tile pushes the logo forward 5% |
| Sections = rooms/levels | `01` Programming & Events · `02` Artist Development & Creative Services · `03` Wellness Resources · `04` Show Your Support (`00` = home). The tunnel is re-tinted per room with the section accent |
| HUD header | logo · `[02] / Section name ▌` (blinking cursor) · level-select nav. Numerals are CSS-generated (`counter()`, `attr()`), so they are not text in the DOM |
| Level select | the four nav items as numbered rows; current room inverted |
| Warp transition | clicking an internal link closes a checker iris over the page (260 ms, 7 steps), navigates, and the next page opens the iris (220 ms, 6 steps): 480 ms total, `steps()` easing for a pixel feel. Any key press, tap or second click skips straight to the page. Skipped entirely when `prefers-reduced-motion` is set |
| Glitch hover | RGB-split text-shadow + 2px jitter, 280 ms, on nav, cards, buttons, chips |
| CRT overlay | fixed scanlines (4.5% white, 1px/3px) + vignette + rare brightness flicker; `pointer-events: none`; removed for `prefers-contrast: more` |
| Room plate | content sits on a 88%-black plate with accent rails so every line of text stays readable over the moving checker |
| Backdrop pages | about-us keeps her radial gradient; playlists keeps `bts-logos-06` (red checker); merch keeps the road photo. The CSS corridor is switched off on these three so her own backdrops are the room |

Progressive enhancement: without JS every link is a normal link, the nav is always visible, and the corridor/CRT/glitch still work (they are CSS). Text is real, selectable text everywhere. Performance: no video; images are WebP (largest 380 KB, mobile gets the 73 KB variant); the corridor animates `transform` only (compositor).

## Tokens (`css/site.css`)

Identical to `cleaned-up` (see `source/palette.json`): `--black #000`, `--ink #f6f1f1`, `--ink-dim #a4a5ab`, `--lime #c9dd6b`, `--orange #fc5d23`, `--fuchsia #e10ef0`, `--cyan #16deed`, `--spring #12efad`, `--yellow #fff700` (playlists only), `--neon #09f858` (merch only). Spacing 4px base `--s-1…--s-8`; type scale `--fs-pix-0…4` + body `--fs-body`.

### Section → accent (fixed)

| Room | Pages | Accent |
|---|---|---|
| 00 Home / About | `/`, `/about-us` | lime `#c9dd6b` |
| 01 Programming & Events | `/Programming-Events`, `/MMNT-2-MMNT`, `/Sunset-Showcase` | orange `#fc5d23` |
| 02 Artist Development & Creative Services | `/Creative-Services`, `/Release-Rollout`, `/playlists`, `/Special-Inquiries` | fuchsia `#e10ef0` |
| 03 Wellness Resources | `/Wellness-Resources`, `/Rewire-with-Rocky` | cyan `#16deed` |
| 04 Show Your Support | `/Show-Your-Support`, `/merch` | spring green `#12efad` |

## Fonts (`fonts/`)

Mister Pixel (`MisterPixel.woff`, her file): headings, nav, HUD, short text. Neue Haas Grotesk Bold (`NeueHaasGroteskText-Bold.woff`, her file): Wellness heading and Support cards, falling back to Helvetica. Cargo icon font (`IconFont-Regular-0.9.3.woff2`): Instagram/Spotify glyphs. Space Mono 400/700 (not hers, SIL OFL): paragraphs longer than 110 characters. Licensing flags in `REPORT.md`.

## Components

Header/HUD, level select, section header (`h1.page-title`), event card, service card, support card, section tile, CTA button, framed image, chip (playlist), pager (← parent / next →). Markup is shared with `cleaned-up`; this branch swaps the CSS layer and the header.

## UI chrome not from her copy

| Label | Where | Visible? |
|---|---|---|
| `Skip to content` | skip link | only on keyboard focus |
| `←` `→` `↗` | pager and card arrows | yes (aria-hidden) |
| `00`–`04`, `/` | HUD index, level numbers, separator | yes, **CSS-generated** (not in the DOM text) |
| `▌` | blinking cursor after the HUD section name | yes, CSS-generated |
| `Menu`, `Main`, `Back and next` | `aria-label`s | no |
| `Instagram`, `Spotify` | icon `aria-label`s (from `content.json` → `site.social`) | no |
| `BITS` | logo `alt` | no |
| `© 2026 Breaks In The Simulation. All rights reserved.` `Privacy` `Terms` `Designed by IN-FLU-ENTIAL` | studio footer on every page (copyright, links to `/privacy` and `/terms`, build credit linking to in-flu-ential.vercel.app) | yes |
| `Start a Project` section + `Rooted in Rhythm` footer link (paid-work path) | `/Creative-Services`, `/Special-Inquiries`, footer on every page | studio-written paid-work copy in `PACKAGES`/`start_project_html()` in `tools/build.py`; orange dashed panel keeps client work visually apart from the support cards. Links out to the separate Rooted in Rhythm site (`RIR_URL`) | yes |
| `Privacy Policy`, `Terms of Service`, `Last updated: October 2026`, `Contact Us` + body text | `/privacy` and `/terms` (not on her live site, not in `content.json`): studio-written legal text in `LEGAL` in `tools/build.py`, rendered in the same shell. Privacy text states what the site actually does (no forms, analytics or trackers; host logs; links to third-party services). Contact is her own address from `content.json` | yes |

The HUD section name is the nav/link label that leads to the room (e.g. "Programming & Events"); on home it is the site title. Page `<h1>`s on `/`, `/MMNT-2-MMNT`, `/Rewire-with-Rocky`, `/merch` are screen-reader only and reuse words from the site title or the link that leads to the page.

## Rebuilding

`python3 tools/build.py` regenerates all pages from `source/` (`VARIANT = 'immersive'`). `tools/prepare_assets.py` regenerates `img/` from the originals on the `capture` branch.
