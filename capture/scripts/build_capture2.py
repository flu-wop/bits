"""typography.json, palette.json, SITEMAP.md, links aggregation."""
import json, os, re, colorsys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P3 = json.load(open(f'{ROOT}/_raw/pass3.json'))
C = json.load(open(f'{ROOT}/content.json'))
G = json.load(open(f'{ROOT}/_raw/graph.json'))
VIS = json.load(open(f'{ROOT}/_raw/visited.json'))

FILES = {'Mister Pixel': {'400': 'fonts/MisterPixel.woff'},
         'Neue Haas Grotesk': {'400': 'fonts/NeueHaasGroteskText-Regular.woff', '700': 'fonts/NeueHaasGroteskText-Bold.woff', '500': 'fonts/NeueHaasGroteskText-Medium.woff'}}
def style_for(slug, sample, vp):
    for s in P3[slug][vp]['styles']:
        if s['sample'].startswith(sample): return s
    raise KeyError((slug, sample))
ROLES = [
 ('home', 'about-link', 'get to know us!', 'home: "get to know us!" link'),
 ('home', 'nav-link', 'Programming & Events', 'home: main nav links (Programming & Events / Artist Development… / Wellness Resources)'),
 ('home', 'nav-link-support', 'Show', 'home: "Show Your Support" link'),
 ('about-us', 'about-tagline', 'Breaking the pattern', 'about-us: tagline'),
 ('about-us', 'about-label', 'WHO ARE WE?', 'about-us: section labels (WHO ARE WE? / WHAT DO WE DO? / OUR MISSION / OUR VISION / CONTACT US)'),
 ('about-us', 'about-body', 'Breaks In The Simulation (BI', 'about-us: body paragraphs'),
 ('about-us', 'about-email', 'EMAIL:', 'about-us: email line'),
 ('Programming-Events', 'events-intro', '*click event name', 'Programming & Events: instruction line'),
 ('Programming-Events', 'event-link', 'MMNT 2 MMNT', 'Programming & Events: event names'),
 ('MMNT-2-MMNT', 'mmnt-lead-link', 'MMNT 2 MMNT', 'MMNT 2 MMNT: first words (link)'),
 ('MMNT-2-MMNT', 'mmnt-body', 'is a mental health', 'MMNT 2 MMNT: description'),
 ('MMNT-2-MMNT', 'mmnt-note', 'Stay connected', 'MMNT 2 MMNT: "Stay connected…" line'),
 ('Sunset-Showcase', 'event-title', 'Sunset Showcase', 'Sunset Showcase: title'),
 ('Sunset-Showcase', 'event-meta', 'September 22nd', 'Sunset Showcase: date/time/place line'),
 ('Sunset-Showcase', 'event-body', 'This healing', 'Sunset Showcase: description (<sup>)'),
 ('Sunset-Showcase', 'event-cta', 'GET TICKETS', 'Sunset Showcase: GET TICKETS HERE'),
 ('Creative-Services', 'service-link', 'Patreon', 'Creative Services: link list'),
 ('Release-Rollout', 'rollout-body', 'ARE YOU RELEASING', 'Release Rollout: body'),
 ('Release-Rollout', 'rollout-cta-label', 'SCHEDULE A DISCOVERY', 'Release Rollout: discovery call + email lines'),
 ('Release-Rollout', 'rollout-cta-link', 'HERE', 'Release Rollout: HERE link'),
 ('playlists', 'playlist-link', 'HOT NOLA', 'playlists: link list (first 6 / second 6 differ by 1 hue step)'),
 ('Special-Inquiries', 'inquiries-body', 'PLAYLISTS, EVENT', 'Special Inquiries: both lines'),
 ('Wellness-Resources', 'wellness-heading', 'Mindset Coaching', 'Wellness Resources: h2 (Neue Haas Grotesk)'),
 ('Rewire-with-Rocky', 'rewire-lead', 'Rewire With Rocky', 'Rewire with Rocky: intro + options'),
 ('Rewire-with-Rocky', 'rewire-body', 'mixing therapeutic', 'Rewire with Rocky: description'),
 ('Rewire-with-Rocky', 'rewire-select', 'select one', 'Rewire with Rocky: "select one…"'),
 ('Rewire-with-Rocky', 'rewire-buy', 'BUY AND BOOK', 'Rewire with Rocky: BUY AND BOOK NOW!'),
 ('Rewire-with-Rocky', 'rewire-consult', 'Schedule a free', 'Rewire with Rocky: consultation line (<sup>)'),
 ('Rewire-with-Rocky', 'rewire-step', 'Step 1', 'Rewire with Rocky: Step 1/2 text'),
 ('Rewire-with-Rocky', 'rewire-step-link', 'HERE', 'Rewire with Rocky: HERE link'),
 ('Show-Your-Support', 'support-link', 'MERCH', 'Show Your Support: MERCH / BECOME A MEMBER / MAKE A DONATION (Neue Haas Grotesk Bold)'),
 ('merch', 'merch-text', 'RESTOCKING', 'merch: RESTOCKING…'),
]
roles = {}
for slug, role, sample, desc in ROLES:
    d, m = style_for(slug, sample, 'desktop'), style_for(slug, sample, 'mobile')
    fam = d['fontFamily'].split(',')[0].strip('"')
    w = '700' if d['fontWeight'] in ('700', 'bold') else d['fontWeight']
    fontFile = FILES.get(fam, {}).get(w) or FILES.get(fam, {}).get('400')
    entry = {'where': desc, 'page': slug, 'fontFamily': d['fontFamily'], 'fontFile': fontFile, 'fontWeight': d['fontWeight'], 'fontStyle': d['fontStyle'],
             'syntheticBold': bool(fam == 'Mister Pixel' and w == '700'),
             'desktop1440': {'fontSize': d['fontSize'], 'lineHeight': d['lineHeight'], 'letterSpacing': d['letterSpacing']},
             'mobile390': {'fontSize': m['fontSize'], 'lineHeight': m['lineHeight'], 'letterSpacing': m['letterSpacing']},
             'color': d['color'], 'textTransform': d['textTransform']}
    roles[role] = entry
layout = {}
for k, v in P3.items():
    layout[k] = {'desktop1440': v['desktop']['container'], 'mobile390': v['mobile']['container']}
typ = {
 'note': 'Computed with getComputedStyle on the rendered DOM. Every text style on the live site is "Mister Pixel" (400 only; bold 700 is browser-synthesized) except the two Neue Haas Grotesk Bold link blocks on Wellness Resources and Show Your Support. Cargo scales type per viewport: mobile 390 sizes are exactly 0.722x desktop (22.464/31.104). Letter-spacing is "normal" everywhere. The social icons are glyphs of the "Icons" font (fonts/IconFont-Regular-0.9.3.woff2) via the font stack "Mister Pixel", Icons.',
 'fonts': [
  {'family': 'Mister Pixel', 'file': 'fonts/MisterPixel.woff', 'format': 'woff', 'source': 'https://type.cargo.site/files/MisterPixel.woff', 'hostedBy': 'Cargo (custom upload)', 'styles': 'normal 400 only',
   'fontFace': '@font-face { font-display: block; font-family: "Mister Pixel"; src: url(MisterPixel.woff) format("woff"); font-style: normal; font-weight: normal; unicode-range: U+0-DFFF, U+F900-FFFD; }',
   'internalName': 'VTF MisterPixel v1.005, Christophe Badani (Velvetyne Type Foundry)', 'license': 'SIL Open Font License per name-table record (see REPORT)'},
  {'family': 'Neue Haas Grotesk', 'files': {k: v for k, v in FILES['Neue Haas Grotesk'].items()} | {'400-italic': 'fonts/NeueHaasGroteskText-Italic.woff', '500-italic': 'fonts/NeueHaasGroteskText-MediumItalic.woff', '700-italic': 'fonts/NeueHaasGroteskText-BoldItalic.woff'},
   'format': 'woff', 'source': 'https://type.cargo.site/files/NeueHaasGroteskText-*.woff', 'hostedBy': 'Cargo font library (Type Network web license)', 'usedOnLive': 'Bold (700) only; other weights are declared by the Cargo theme but unused',
   'internalName': 'NeueHaasGroteskText "TN web use only" (Type Network)', 'license': 'name table: "licensed for web use only"; copyright Type Network; distribution beyond original license prohibited. FLAG'},
  {'family': 'Icons', 'file': 'fonts/IconFont-Regular-0.9.3.woff2', 'format': 'woff2', 'source': 'https://static.cargo.site/assets/social/IconFont-Regular-0.9.3.woff2', 'hostedBy': 'Cargo', 'glyphs': {'Instagram': 'U+E025', 'Spotify': 'U+E051'}, 'license': 'Cargo icon font. FLAG (not hers to redistribute; glyphs only)'},
 ],
 'roles': roles, 'pageLayout': layout,
}
json.dump(typ, open(f'{ROOT}/typography.json', 'w'), indent=2)

# ---------- palette.json ----------
def hx(c): return c.split('@')[0].lower()
def rgb(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
def lum(h):
    f = lambda v: (v/255)/12.92 if v/255 <= 0.03928 else (((v/255)+0.055)/1.055)**2.4
    r, g, b = map(f, rgb(h)); return 0.2126*r+0.7152*g+0.0722*b
def contrast_on_black(h): return round((lum(h)+0.05)/0.05, 2)
ANCH = {'cyan': '#10f3fb', 'cyan-mid': '#16deed', 'spring-green': '#12efad', 'neon-green': '#09f858', 'lime': '#c9dd6b', 'orange': '#fc5d23', 'amber': '#f07f0e',
        'magenta': '#c10ddd', 'fuchsia': '#e10ef0', 'violet': '#8c10eb', 'hot-pink': '#d00f89', 'blue': '#0e1def', 'yellow': '#fff700', 'white': '#ffffff', 'grey': '#a4a5ab', 'teal': '#129f8c', 'light-aqua': '#8ee1ea', 'burnt-orange': '#d44e14', 'orange-2': '#ea6711', 'dark-orange': '#da5e00'}
def near(h):
    a = rgb(h); return min(ANCH, key=lambda k: sum((x-y)**2 for x, y in zip(a, rgb(ANCH[k]))))
use = {}
def add(h, slug, role):
    h = hx(h); use.setdefault(h, {}).setdefault(slug, set()).add(role)
for p in C['pages']:
    for b in p['blocks']:
        role = b.get('role') or b['type']
        if b.get('color'): add(b['color'], p['slug'], role)
        for r in b.get('runs', []):
            if r.get('color'): add(r['color'], p['slug'], 'inline-'+('link' if r.get('href') else 'text'))
        for k, r in (('titleColor', 'event-title'), ('metaColor', 'event-meta'), ('descriptionColor', 'event-body')):
            if b.get(k): add(b[k], p['slug'], r)
        if b.get('cta'): add(b['cta']['color'], p['slug'], 'button')
        if b.get('backing'): add(b['backing'], p['slug'], 'text-backing')
families = {}
for h, pg in sorted(use.items()):
    families.setdefault(near(h), []).append({'computed': h, 'contrastOnBlack': contrast_on_black(h), 'usedOn': {s: sorted(r) for s, r in pg.items()}})
user_samples = {'cyan': '#14dcdc', 'bright-cyan': '#00f0f0', 'lime': '#c8dc64', 'spring-green': '#00dca0', 'orange': '#f05014', 'purple': '#b400dc', 'black': '#000000'}
verdict = {
 'black': {'computed': '#000000', 'status': 'confirmed', 'note': 'body background on every page; html element is white but never visible (body covers it). 404 pages are white.'},
 'cyan': {'computed': '#16deed', 'status': 'confirmed (≈)', 'note': 'closest live value #16deed (MMNT 2 MMNT body); sample #14dcdc is within 2 channel steps.'},
 'bright-cyan': {'computed': '#10f3fb / #11f4f4 / #0afbfb', 'status': 'confirmed (≈)', 'note': 'home nav links. Cargo applies slightly different values per link; #00f0f0 is within 16 per channel. Use one token.'},
 'lime': {'computed': '#c9dd6b', 'status': 'confirmed (≈)', 'note': 'not text: it is the "b!ts" lettering inside bts-logos-03.png (sampled, 32,388 px of #c9dd6b). #c8dc64 is within 1-2 steps. Never used as a computed text color on the live site.'},
 'spring-green': {'computed': '#12efad', 'status': 'CORRECTED', 'note': 'live text is #12efad ("get to know us!", "Show Your Support"), not #00dca0. #00dca0 does not occur as a computed color.'},
 'orange': {'computed': '#fc5d23', 'status': 'CORRECTED', 'note': 'dominant live orange (event links, services links) is #fc5d23; #f05014 does not occur. Other oranges: #da5e00, #ea6711, #d44e14, #f07f0e. Cargo default text color on all pages is rgb(255,64,6)=#ff4006.'},
 'purple': {'computed': '#c10ddd / #e10ef0 / #8c10eb', 'status': 'CORRECTED', 'note': '#b400dc does not occur. Magenta #c10ddd (Release Rollout), fuchsia #e10ef0 (Sunset date line), violet #8c10eb (HERE link). Hot pink #d00f89 on MMNT 2 MMNT.'},
}
extra = {'blue #0e1def': 'About-us section labels and Rewire with Rocky text. Not in the screenshot samples. Only 2.6:1 on black, below AA for text.',
         'yellow #fff700 / #f8f822': 'playlists page links (bold, on the red checker backdrop).',
         'neon green #09f858': 'merch RESTOCKING text (on a semi-transparent #ff4006 @0.85 box).',
         'white / greys': '#ffffff (Wellness + Support links, About body @0.9), #f9f9f9, #f6eeee, #eadddd, #a4a5ab (About tagline), #a0a0a1 (About email).',
         'teal/aqua (Rewire steps)': '#129f8c, #5ffcf2, #48f5de, #8ee1ea.'}
pal = {
 'note': 'computed = getComputedStyle(color) of text runs on the live site. Family grouping is by nearest named anchor and only for reading convenience.',
 'userSamplesVsComputed': {k: {'sampledFromScreenshots': user_samples[k], **verdict[k]} for k in verdict},
 'additionalColorsFound': extra,
 'backdrops': {
  'about-us': 'radial-gradient(circle, #0e1def 0%, #0e1def 0%, #00af59 45.92%, #00af59 54.08%, #02020e 100%): blue center, green ring, near-black edge',
  'playlists': 'bts-logos-06.png parallax image; dominant sampled colors #e44222 (red-orange), #050708 (black), #511f16',
  'merch': '1months6continent-1-8.jpg wallpaper (teal/green forest, tan road)',
  'sunsetFlyer': 'SunShow24_-square_FINAL-1080-.jpg dominant sampled: #f67b22, #ee6234, #ed3126, #ea8e32 (orange to red sunset)'},
 'byFamily': families,
}
json.dump(pal, open(f'{ROOT}/palette.json', 'w'), indent=2)

# ---------- SITEMAP.md ----------
pages = {p['slug']: p for p in C['pages']}
def path2slug(u):
    p = u.replace('https://breaksinthesimulation.com', '').strip('/')
    return 'home' if not p else p
tree = """# SITEMAP

Source: https://breaksinthesimulation.com (Cargo). Crawled 2026-10-17 from the homepage by following every internal link in the rendered DOM (visible and invisible). 16 URLs requested, 13 live pages, 3 return 404.

## Page tree (by navigation)

```
/ (home)                                   [logo, Instagram, Spotify]
├── /about-us                              ("get to know us!")
├── /Programming-Events                    (nav 1)
│   ├── /MMNT-2-MMNT
│   │   └── /MMNT-2-MMNT-event             404  (visible link on the first words of /MMNT-2-MMNT)
│   ├── /Sunset-Showcase
│   │   └── https://buytickets.at/breaksinthesimulation/1373264   (GET TICKETS HERE)
│   └── /Fire-Ice                          404  (invisible empty link on /Programming-Events)
├── /Creative-Services                     (nav 2: "Artist Development & Creative Services")
│   ├── https://www.patreon.com/breaksinthesimulation?fan_landing=true   (Patreon)
│   ├── /Release-Rollout                   ("Release Rollout Incubator")
│   │   ├── https://cal.com/breaksinthesimulation   (SCHEDULE A DISCOVERY CALL HERE)
│   │   └── email BREAKSINTHESIMULATION@GMAIL.COM (plain text)
│   ├── /playlists                         ("Playlist Curation": 12 Spotify playlists)
│   └── /Special-Inquiries                 (plain-text email)
├── /Wellness-Resources                    (nav 3)
│   └── /Rewire-with-Rocky
│       ├── https://www.patreon.com/rewirewithrocky   (BUY AND BOOK NOW!)
│       └── https://docs.google.com/forms/d/1NQUu7-pYGrvmls7swbBzdj2UkNHCcClRRFyZgUgeS8s/edit   (Step 1 HERE)
├── /Show-Your-Support                     (nav 4)
│   ├── /merch                             ("Restocking")
│   ├── https://www.patreon.com/breaksinthesimulation?fan_landing=true   (BECOME A MEMBER)
│   └── https://www.paypal.com/donate/?hosted_button_id=TURRDH52BUSN4   (MAKE A DONATION)
└── /Mindset-Coaching                      404  (invisible empty link on home)
```

Only the homepage links to the four main sections. No page except the homepage has a persistent way back: sub-pages have **no** navigation, logo, or back link in the DOM. Besides their own content links, each contains only an empty anchor pointing at the page itself and Cargo's hidden https://cargo.site/ link, so the browser back button is the only way back.

## Link graph (internal links by page, from the rendered DOM)

| Page | Status | Links to (internal) |
|---|---|---|
"""
for u, d in VIS:
    s = d.get('slug')
    out = sorted({path2slug(x) for x in G.get(s, []) if path2slug(x) != s})
    tree += f"| /{'' if s=='home' else s} | {d.get('status')} | {', '.join('/'+o if o!='home' else '/' for o in out) or '—'} |\n"
tree += """
## External destinations

| Destination | Linked from |
|---|---|
| https://www.instagram.com/breaksinthesimulation/ | / (icon) |
| https://open.spotify.com/user/ntixhuy6sld8s732reknd7vfs?si=122c0197351b423d&nd=1 | / (icon) |
| https://buytickets.at/breaksinthesimulation/1373264 | /Sunset-Showcase |
| https://www.patreon.com/breaksinthesimulation?fan_landing=true | /Creative-Services, /Show-Your-Support |
| https://cal.com/breaksinthesimulation | /Release-Rollout |
| https://www.patreon.com/rewirewithrocky | /Rewire-with-Rocky |
| https://docs.google.com/forms/d/1NQUu7-pYGrvmls7swbBzdj2UkNHCcClRRFyZgUgeS8s/edit | /Rewire-with-Rocky |
| https://www.paypal.com/donate/?hosted_button_id=TURRDH52BUSN4 | /Show-Your-Support |
| 12 Spotify playlists (see content.json) | /playlists |
| https://cargo.site/ | every page (hidden Cargo link) |

No Venmo link exists anywhere on the site (see REPORT).
"""
open(f'{ROOT}/SITEMAP.md', 'w').write(tree)
print('ok')
