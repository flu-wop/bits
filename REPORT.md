# REPORT — `cleaned-up`

**Preview:** https://bits-git-cleaned-up-flu-wops-projects.vercel.app
(per-commit URLs are also created for every push; if Vercel asks you to log in, that is the project's Deployment Protection setting.)
Live source: https://breaksinthesimulation.com (captured 2026-10-17, branch `capture`).

## Pages captured (13 live + 3 dead)

`/` · `/about-us` · `/Programming-Events` · `/MMNT-2-MMNT` · `/Sunset-Showcase` · `/Creative-Services` · `/Release-Rollout` · `/playlists` · `/Special-Inquiries` · `/Wellness-Resources` · `/Rewire-with-Rocky` · `/Show-Your-Support` · `/merch`. Found by crawling every internal link in the rendered DOM, including invisible ones. Desktop 1440 and mobile 390 screenshots, rendered HTML, text, links, typography, palette and assets are on `capture`. The site is a client-rendered Cargo site; a real Chromium session was needed and worked (plain `curl` was only blocked by this sandbox's proxy at first). The Wayback Machine was not needed and nothing here is sourced from an archive.

## What could not be captured / not reproduced

- **Nothing visible was missing.** All visible copy, links, images and the three backdrops are in `content.json`.
- **Hidden / platform items not reproduced:** Cargo's own scripts and admin UI, the `/rss` feed the head advertises, and the OG thumbnail images (`IMG_8188`, `AA019A_2`, `R2_007`, `Oval1.svg`) that Cargo attaches to pages but never displays (they are used only as `og:image` here, except `Oval1.svg`, a red dot that is Cargo's default).
- **Social icons are glyphs, not images.** Instagram and Spotify are Cargo icon-font glyphs (U+E025, U+E051), so there is no icon image file; the same font file is used.
- **No video exists** on the site.
- **Layout whitespace:** Cargo pads with runs of non-breaking spaces and blank lines (e.g. 13 NBSPs before "RESTOCKING"); these are layout, not copy, and are not transcribed. "September 22nd,&nbsp; 2024" and "EVENT,&nbsp; HEALING" contain a double space on the live site; rendered here as a single space (kept in `content.json`).
- **External destinations could not be verified from this environment** (see QA). Hrefs are exactly as captured.

## Content that looks stale

- **Sunset Showcase is dated September 22nd, 2024** (3-8pm, Margaret Place Hotel) with a live "GET TICKETS HERE" link to `buytickets.at/breaksinthesimulation/1373264`. Today is 2026-10-17; that event is over.
- **MMNT 2 MMNT: "Stay connected for info about the next workshop and Retreat in 2023!"** (the page's photos are dated 2021 and 2022).
- The Programming & Events page lists only these two events.

## Appears broken on the live site

- **Three dead internal links (404):** `/MMNT-2-MMNT-event` (the visible words "MMNT 2 MMNT" that open the MMNT page), and two invisible empty links, `/Mindset-Coaching` on the home page and `/Fire-Ice` on Programming & Events. Here the visible one is shown as plain text and the invisible ones are dropped (see `source/content.json` → `deadLinks`).
- **Merch is "RESTOCKING.....BE BACK SOON :]"** with the road photo; there is no store behind it. Kept as is.
- **"Step 1: Click HERE" on Rewire with Rocky links to a Google Form *edit* URL** (`docs.google.com/forms/d/…/edit`). Visitors normally get a request-access screen from an edit link; the public link ends in `/viewform`. Kept exactly as captured. **Rocky should check this.**
- **Two playlists share one Spotify link:** "Yoncé." and "GRL PWR." both point to playlist `1IWV3Pa5snSkoR3c95S41H` (different `si=` tracking ids).
- **No Venmo link anywhere.** The Support page's "MAKE A DONATION" goes only to PayPal (`hosted_button_id=TURRDH52BUSN4`).
- **The three email addresses are plain text** on the live site. They are `mailto:` links here (same visible text).
- Rewire with Rocky lists "(1) / (3) / (8) 60min. sessions" with no prices and no per-option links; one "BUY AND BOOK NOW!" goes to `patreon.com/rewirewithrocky`.
- Meta description of the home page is literally "Cargo"; the favicon is Cargo's default blue globe; no image on the site has alt text; the live mobile wrap on merch splits "RESTOCKING." / "....BE BACK" / "SOON :]".
- **The glyph `]` in Mister Pixel looks like `)`**, so the text `:]` renders as a smiley `:)`. That is why it looked like ":)" in the screenshots; the copy is `:]`.

## Fonts: sources and licensing

| Font | Where | File | Licence | Flag |
|---|---|---|---|---|
| Mister Pixel | all headings, nav, most text | `fonts/MisterPixel.woff` (from `type.cargo.site`) | **Velvetyne Black Licence** (font name table): libre use but "except for branding, logos and direct trade", must credit Velvetyne and Christophe Badani, derivatives must be shared | **Yes.** It is the brand typeface, which that licence discourages; credit is in `fonts/CREDITS.txt` (not shown on the page, no visible copy added). Rocky may want to confirm with Velvetyne or choose a commercial pixel face |
| Neue Haas Grotesk Text Bold | Wellness heading, Support links | `fonts/NeueHaasGroteskText-Bold.woff` | Type Network, "licensed for web use only", "any use or distribution beyond original license prohibited" | **Yes.** This is a commercial font Cargo serves under its own licence. Hosting the file from another domain is likely outside it. The CSS falls back to Helvetica Neue / Helvetica / Arial; **delete the file if the licence does not cover this site** (6 other weights are declared by her Cargo theme but unused, not copied) |
| Cargo icon font | Instagram / Spotify glyphs | `fonts/IconFont-Regular-0.9.3.woff2` | Cargo platform asset | **Yes (minor).** Easy to replace with two SVGs |
| Space Mono 400/700 | body text > 110 chars | `fonts/space-mono-latin-*.woff2` | SIL OFL 1.1 | No. Not hers |

## UI chrome that is not her copy

| Label | Where | Visible |
|---|---|---|
| `Skip to content` | skip link | only on keyboard focus |
| `←` `→` `↗` | pager and card arrows | yes |
| `Menu`, `Main`, `Back and next` | `aria-label`s | no |
| `Instagram`, `Spotify` | icon link `aria-label`s (names from `content.json`) | no |
| `b!ts` | logo `alt` (the lettering inside the image) | no |

Page and pager labels reuse the text of the link that leads to each page (e.g. "Release Rollout Incubator"), so nothing is invented. Page `<h1>`s on `/`, `/MMNT-2-MMNT`, `/Rewire-with-Rocky` and `/merch` are screen-reader only.

## Where this branch differs from the live site (by design)

- Each section has one fixed accent color (orange / fuchsia / cyan / spring green / lime) instead of Cargo's per-run colors; playlists keep her yellow and merch her neon green. Her per-run colors are in `capture/<slug>/text.md`.
- Paragraphs over 110 characters use Space Mono; her pixel face stays for everything short.
- A persistent header nav, a favicon cropped from her own logo, `mailto:` links on her three email addresses, and a back/next pager on every page (labels from her own link text). The dead `/MMNT-2-MMNT-event` link is plain text.
- Page `<title>`s, descriptions and `og:` tags are the live ones (home has no description; the live one is "Cargo").

## QA results

- **Text diff** (`qa/diff.mjs`): every string in `content.json` is on its page and no rendered text exists outside `content.json` + the chrome list: **13 pages, 0 missing, 0 extra**, with and without JavaScript.
- **Links and assets** (`qa/links.mjs`, `qa/links-report.json`): 36 local references (pages, CSS, JS, fonts, every image and `srcset` entry, CSS `url()`s, `og:image`) **all 200**. 20 external https URLs (Instagram, Spotify ×13, Patreon ×2, PayPal, Cal.com, Google Forms, buytickets.at) **could not be checked: this sandbox's egress policy returns 403 to every one of them**, so they are unverified, not known-broken. They are byte-identical to the live site's hrefs. `mailto:` OK.
- **Screenshots** (`qa/screenshots/`, 390 and 1440 for all 13 pages): reviewed; no horizontal overflow on any page, no tap target under 44px, no wrapping like "musi-cians". Fixes made from them: backdrop layers hidden behind the body background, a CSS ordering bug that set the Rewire lede in the body face, duplicate social icons on desktop home, playlist columns and chip widths, pager legibility over the checker.
- **Lighthouse mobile** (`qa/lighthouse.md`): accessibility 100 and best-practices 100 on all 13 pages; performance 94–100 when run alone (first parallel pass dipped on 4 pages from CPU contention); SEO 91–100. Run against a local static server, so treat absolute performance as indicative; accessibility and best-practices are not affected by that.


## Questions for Rocky

1. **Fonts:** is she comfortable keeping Mister Pixel as the brand typeface under the Velvetyne Black Licence (credit required, "not for branding"), and does her Neue Haas Grotesk licence cover hosting it outside Cargo?
2. **What happens to the dated items?** Sunset Showcase (Sept 22, 2024) and "Retreat in 2023!" are stale; does she want them archived, replaced with the next event, or kept as past events?
3. **Fix the links:** the Rewire consultation form link is an edit URL, the MMNT page links to a dead page, "Yoncé." and "GRL PWR." share a playlist, and there is no Venmo link even though she mentioned Venmo. What should each point to?
