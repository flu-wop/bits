# DESIGN — `cleaned-up`

Rocky's look, fixed and tightened: black, Mister Pixel, saturated accents, her checker-vortex logo. Nothing here adds copy or sections. Everything visible comes from `source/content.json`.

## Tokens (`css/site.css`)

| Token | Value | Source |
|---|---|---|
| `--black` | `#000` | all live pages |
| `--ink` | `#f6f1f1` | her off-white text |
| `--ink-dim` | `#a4a5ab` | her gray (about-us tagline) — back links |
| `--lime` | `#c9dd6b` | "b!ts" lettering, sampled from the logo |
| `--orange` | `#fc5d23` | her event + services link color (computed) |
| `--fuchsia` | `#e10ef0` | Sunset Showcase date line (computed) |
| `--cyan` | `#16deed` | MMNT 2 MMNT body (computed) |
| `--spring` | `#12efad` | "get to know us!" / Show Your Support (computed) |
| `--yellow` | `#fff700` | playlist links (computed). Playlists only |
| `--neon` | `#09f858` | merch "RESTOCKING" (computed). Merch only |

Corrections vs. the screenshot samples are in `source/palette.json` (spring green is `#12efad`, not `#00dca0`; orange is `#fc5d23`, not `#f05014`; `#b400dc` purple does not occur, magenta/fuchsia are `#c10ddd`/`#e10ef0`). All accent text colors have ≥ 5.5:1 contrast on black.

### Section → accent (fixed, never per-page)

| Section | Pages | Accent |
|---|---|---|
| Home / About | `/`, `/about-us` | lime `#c9dd6b` |
| Programming & Events | `/Programming-Events`, `/MMNT-2-MMNT`, `/Sunset-Showcase` | orange `#fc5d23` |
| Artist Development & Creative Services | `/Creative-Services`, `/Release-Rollout`, `/playlists`, `/Special-Inquiries` | fuchsia `#e10ef0` |
| Wellness Resources | `/Wellness-Resources`, `/Rewire-with-Rocky` | cyan `#16deed` |
| Show Your Support | `/Show-Your-Support`, `/merch` | spring green `#12efad` |

Two documented exceptions that keep her page identities: the playlist links stay her yellow on black chips over the red checker, and the merch text stays her neon green on black. Those colors are not used anywhere else.

## Fonts (`fonts/`, original files)

| Role | Family | File | Notes |
|---|---|---|---|
| Headings, nav, short text, buttons, cards | Mister Pixel | `MisterPixel.woff` | her file. 400 only; the bold look on nav/playlists/merch is browser-synthesized exactly as on the live site |
| Wellness h1, Support cards | Neue Haas Grotesk Bold | `NeueHaasGroteskText-Bold.woff` | her file. Falls back to Helvetica Neue / Helvetica / Arial |
| Social icons | Cargo icon font | `IconFont-Regular-0.9.3.woff2` | Instagram U+E025, Spotify U+E051 |
| Long body text | Space Mono 400/700 | `space-mono-latin-*.woff2` | **not hers.** Used where a paragraph is longer than 110 characters (about-us, Sunset description, MMNT description, Release Rollout intro, Rewire description). SIL OFL, `fonts/SpaceMono-OFL.txt` |

Licensing flags are in `REPORT.md`.

## Type scale

Pixel face steps: `--fs-pix-0` 18px (desktop nav) · `-1` 20→24px · `-2` 24→32px · `-3` 32→52px · `-4` 36→72px (fluid with `clamp`). Body: Space Mono 16→17px / 1.7. Measure `62ch`; headings `text-wrap: balance`, paragraphs `text-wrap: pretty`; `hyphens: manual`, no `overflow-wrap` breaks, and slash-joined words (`artists/musicians`) are kept whole so nothing wraps like `musi-cians`.

Spacing: 4px base, `--s-1`…`--s-8` = 4, 8, 12, 16, 24, 32, 48, 72px. Page gutter `clamp(1rem, 4vw, 2rem)`, wrap `72rem`.

## Components

- **Header / nav**: sticky, black, 2px accent rule. Logo (her `bts-logos-03` image) links home. Four sections in their accent colors, current section marked with `aria-current`. Under 56rem the nav collapses behind a 44px menu button; without JS it is always visible.
- **Section header**: `h1.page-title` in the section accent (text = the nav/link label that leads to the page).
- **Event card** (`.card--event`): bordered pixel-shadow card with arrow. Sunset Showcase uses the full `article.event`: title, meta line, framed flyer, description, CTA.
- **Service card** (`.card--service`), **Support card** (`.card--support`, Neue Haas Bold), **Section tile** (`.card--section`, home).
- **CTA button** (`.btn`): accent fill, 56px high.
- **Frame** (`.frame`): 2px accent border + offset shadow for the flyer and MMNT photos.
- **Pager**: every page except home ends with ← parent and next →, so there is no dead end. Order: home → about → Programming → MMNT → Sunset → Services → Release Rollout → Playlists → Special Inquiries → Wellness → Rewire → Support → Merch → home.
- **Texture** (sparingly): a 12px checker strip above the pager; the About page's own radial gradient behind a solid-black panel. No scanlines on this branch.
- **Backdrops**: playlists = her `bts-logos-06` red checker (fixed), merch = her road photo; text sits on solid black backing like on the live site.

## UI chrome not from her copy

Visible or screen-reader only, all listed here and in `qa/chrome-labels.json`:

| Label | Where | Visible? |
|---|---|---|
| `Skip to content` | skip link | only on keyboard focus |
| `←` `→` `↗` | pager and card arrows | yes (aria-hidden) |
| `Menu` | button `aria-label` | no |
| `Main`, `Back and next` | nav `aria-label`s | no |
| `Instagram`, `Spotify` | icon link `aria-label`s (names from `content.json` → `site.social`) | no |
| `b!ts` | logo `alt` (the lettering in the image) | no |

Page `<h1>`s on `/`, `/MMNT-2-MMNT`, `/Rewire-with-Rocky`, `/merch` are screen-reader only and reuse words from the site title or the link that leads to the page.

## Rebuilding

`python3 tools/build.py` regenerates all pages from `source/`. `python3 tools/prepare_assets.py <capture/assets> img` regenerates the optimized images from the originals on the `capture` branch.
