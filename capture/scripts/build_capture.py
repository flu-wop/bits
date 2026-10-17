"""Builds text.md, content.json, typography.json, palette.json, manifest.json, SITEMAP.md
from the raw crawl data in capture/_raw and the downloaded assets."""
import json, re, os, struct
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P3 = json.load(open(f'{ROOT}/_raw/pass3.json'))
P2 = json.load(open(f'{ROOT}/_raw/pass2.json'))
LIVE = 'https://breaksinthesimulation.com'
slug_key = lambda s: 'home' if s == 'home' else s

def norm(t): return re.sub(r'\s+', ' ', t.replace('\xa0', ' ')).strip()

# ---------- text.md ----------
TITLES = {}
for k, v in P3.items():
    lines = v['desktop']['lines']
    out = [f"# {k} — verbatim text (desktop 1440px)\n", f"Live URL: {LIVE}/{'' if k=='home' else k}\n",
           "Format: `[live element]` then each text run as `\"text\" #color` (a/b → runs). `¶` = blank line (spacing) on the live page. NBSP shown as `␣`.\n"]
    for l in lines:
        if l['block'] == 'img':
            i = l['img']; out.append(f"- IMAGE src={i['abs']} natural={i['natural']} rendered={i['rendered']} alt={i['alt']!r} link={i['href']}")
            continue
        if not l['runs']:
            out.append('- ¶'); continue
        runs = ' + '.join(f"\"{r['text'].replace(chr(160),'␣')}\" {r['color']}" + (f" →{r['hrefAbs']}" if r.get('href') else '') for r in l['runs'])
        lvl = l['block'] if re.fullmatch(r'h[1-6]', l['block']) else 'div'
        out.append(f"- [{lvl}] {runs}")
    d = f'{ROOT}/{k}'; os.makedirs(d, exist_ok=True)
    open(f'{d}/text.md', 'w').write('\n'.join(out) + '\n')

# ---------- content.json ----------
def R(text, href=None, color=None, ext=False, dead=False):
    r = {'text': text}
    if href: r['href'] = href
    if color: r['color'] = color
    if dead: r['deadLink'] = True
    return r
def para(runs, kind='paragraph', **kw):
    if isinstance(runs, str): runs = [R(runs)]
    b = {'type': kind, 'text': ''.join(r['text'] for r in runs), 'runs': runs}; b.update(kw); return b
MAIL = 'mailto:breaksinthesimulation@gmail.com'
pages = [
 {'slug': 'home', 'path': '/', 'title': 'Breaks In The Simulation', 'section': 'home', 'navLabel': None,
  'backdrop': {'type': 'none', 'color': '#000000'}, 'blocks': [
   {'type': 'link', 'text': 'get to know us!', 'href': 'about-us', 'color': '#12efad', 'role': 'about-link'},
   {'type': 'image', 'asset': 'bts-logos-03.png', 'alt': '', 'role': 'logo', 'liveDisplay': '1000px source, ~304px wide on desktop 1440, full width on 390'},
   {'type': 'link', 'text': '', 'icon': 'instagram', 'iconGlyph': 'U+E025', 'href': 'https://www.instagram.com/breaksinthesimulation/', 'external': True, 'newTab': True, 'role': 'social'},
   {'type': 'link', 'text': '', 'icon': 'spotify', 'iconGlyph': 'U+E051', 'href': 'https://open.spotify.com/user/ntixhuy6sld8s732reknd7vfs?si=122c0197351b423d&nd=1', 'external': True, 'newTab': True, 'role': 'social'},
   {'type': 'link', 'text': 'Programming & Events', 'href': 'Programming-Events', 'color': '#10f3fb', 'role': 'nav'},
   {'type': 'link', 'text': 'Artist Development & Creative Services', 'href': 'Creative-Services', 'color': '#11f4f4', 'role': 'nav'},
   {'type': 'link', 'text': 'Wellness Resources', 'href': 'Wellness-Resources', 'color': '#0afbfb', 'role': 'nav', 'note': 'live label has a trailing space'},
   {'type': 'link', 'text': 'Show Your Support', 'href': 'Show-Your-Support', 'color': '#12efad', 'role': 'nav', 'note': 'live text run colors: #12efad / #fc5d23 / #12efad (the space between "Show" and "Your" is orange)'},
 ]},
 {'slug': 'about-us', 'path': '/about-us', 'title': 'about us', 'section': 'home', 'backdrop': {'type': 'gradient', 'css': 'radial-gradient(circle, rgb(14, 29, 239) 0%, rgb(14, 29, 239) 0%, rgb(0, 175, 89) 45.92%, rgb(0, 175, 89) 54.08%, rgb(2, 2, 14) 100%, rgb(2, 2, 14) 100%)'}, 'blocks': [
   {'type': 'heading', 'level': 1, 'text': 'Breaking the pattern. Building the artist.', 'color': '#a4a5ab', 'liveTag': 'div (bold, <font>)'},
   {'type': 'heading', 'level': 2, 'text': 'WHO ARE WE?', 'color': '#0e1def', 'liveTag': 'span (bold)'},
   {'type': 'paragraph', 'text': 'Breaks In The Simulation (BITS) is a purpose-driven creative agency specializing in artist development, wellness integration, and creative entrepreneurship. Founded by a passionate multidisciplinary artist, educator, music enthusiast, and mental health specialist, BITS is poised to create a transformative impact in creative industries by prioritizing the holistic development of artists. By integrating social-emotional learning into immersive experiences and developmental services, we foster a community where artists can find support, guidance, and inspiration towards sustainable success. We believe that the path to artistic excellence goes hand in hand with personal growth, skill development, and resilience.', 'color': '#ffffff@0.9'},
   {'type': 'heading', 'level': 2, 'text': 'WHAT DO WE DO?', 'color': '#0e1def', 'liveTag': 'span (bold)'},
   {'type': 'paragraph', 'text': 'Breaks In The Simulation develops artists and the ecosystems around them, combining creative strategy with wellness-centered practices to help both artists and organizations build sustainable, impactful futures.', 'color': '#ffffff@0.9', 'note': 'live text is indented with 8 NBSP characters'},
   {'type': 'paragraph', 'text': 'We use innovative event programming, hands-on artist development services, and tailored resources to provide music artists with the tools and knowledge necessary to navigate the complex landscape of the music industry, while safeguarding their mental and emotional well-being. Our offerings focus on elevating creative entrepreneurship, social-emotional intelligence, community support, and creative expression within a robust cultural ecosystem.', 'color': '#ffffff@0.9'},
   {'type': 'heading', 'level': 2, 'text': 'OUR MISSION', 'color': '#0e1def', 'liveTag': 'span (bold)'},
   {'type': 'paragraph', 'text': 'BITS redefines artist development with holistic infrastructure that merges creative craft, holistic wellness, community connection, and entrepreneurial education to build sustainable artist careers and culturally vibrant ecosystems.', 'color': '#ffffff@0.9'},
   {'type': 'heading', 'level': 2, 'text': 'OUR VISION', 'color': '#0e1def', 'liveTag': 'span (bold)'},
   {'type': 'paragraph', 'text': 'We envision a long-term legacy of healthier creative communities, richer cultural expressions, and artists who have the foundation to grow into industry leaders, mentors, and innovators.', 'color': '#ffffff@0.9'},
   {'type': 'heading', 'level': 2, 'text': 'CONTACT US', 'color': '#0e1def', 'liveTag': 'span (bold)'},
   {'type': 'paragraph', 'text': 'EMAIL: BREAKSINTHESIMULATION@GMAIL.COM', 'color': '#a0a0a1', 'email': 'breaksinthesimulation@gmail.com', 'note': 'not a link on the live site'},
 ]},
 {'slug': 'Programming-Events', 'path': '/Programming-Events', 'title': 'Programming & Events', 'section': 'programming', 'navLabel': 'Programming & Events', 'backdrop': {'type': 'none', 'color': '#000000'}, 'blocks': [
   {'type': 'paragraph', 'text': '*click event name below for more info*', 'color': '#f9f9f9'},
   {'type': 'event', 'title': 'MMNT 2 MMNT', 'href': 'MMNT-2-MMNT', 'color': '#fc5d23'},
   {'type': 'event', 'title': 'Sunset Showcase', 'href': 'Sunset-Showcase', 'color': '#fc5d23'},
 ]},
 {'slug': 'MMNT-2-MMNT', 'path': '/MMNT-2-MMNT', 'title': 'MMNT 2 MMNT', 'section': 'programming', 'navLabel': None, 'backdrop': {'type': 'none', 'color': '#000000'}, 'blocks': [
   para([R('MMNT 2 MMNT', href='MMNT-2-MMNT-event', color='#f5e7f5', dead=True), R(' is a mental health initiative designed to amplify the voices of artists/musicians and creatives, and encourage collective healing in the music industry.', color='#16deed')]),
   {'type': 'paragraph', 'text': 'Stay connected for info about the next workshop and Retreat in 2023!', 'color': '#d00f89'},
   {'type': 'image', 'asset': 'IMG_2843-1.JPG', 'alt': ''},
   {'type': 'image', 'asset': 'IMG_8177.JPG', 'alt': ''},
 ]},
 {'slug': 'Sunset-Showcase', 'path': '/Sunset-Showcase', 'title': 'Sunset Showcase', 'section': 'programming', 'navLabel': None, 'backdrop': {'type': 'none', 'color': '#000000'}, 'blocks': [
   {'type': 'event', 'title': 'Sunset Showcase', 'titleColor': '#da5e00',
    'meta': 'September 22nd,  2024 / 3-8pm / Margaret Place Hotel, New Orleans', 'metaColor': '#e10ef0',
    'image': {'asset': 'SunShow24_-square_FINAL-1080-.jpg', 'alt': ''},
    'description': "This healing + arts experience combines elements from live concerts, health and wellness workshops, and immersive art exhibits for an experience that is both fun and entertaining while deeply impactful. Attendees will explore creative wellness and social-emotional intelligence through curated interactive design. The showcase features a powerful lineup of live music performances, healing arts practitioners and vendors, community health and wellness resources, and more! Explore what wellness looks like for you in an intentional, creatively engaging environment where you're sure to experience deeper connection to community, self, and art.", 'descriptionColor': '#f07f0e',
    'cta': {'type': 'button', 'text': 'GET TICKETS HERE', 'href': 'https://buytickets.at/breaksinthesimulation/1373264', 'external': True, 'newTab': True, 'color': '#fc5d23'}},
 ]},
 {'slug': 'Creative-Services', 'path': '/Creative-Services', 'title': 'Creative Services', 'section': 'services', 'navLabel': 'Artist Development & Creative Services', 'backdrop': {'type': 'none', 'color': '#000000'}, 'blocks': [
   {'type': 'link', 'text': 'Patreon', 'href': 'https://www.patreon.com/breaksinthesimulation?fan_landing=true', 'external': True, 'newTab': True, 'color': '#fc5d23', 'role': 'service'},
   {'type': 'link', 'text': 'Release Rollout Incubator', 'href': 'Release-Rollout', 'color': '#fc5d23', 'role': 'service'},
   {'type': 'link', 'text': 'Playlist Curation', 'href': 'playlists', 'color': '#fc5d23', 'role': 'service'},
   {'type': 'link', 'text': 'Special Inquiries', 'href': 'Special-Inquiries', 'color': '#fc5d23', 'role': 'service'},
 ]},
 {'slug': 'Release-Rollout', 'path': '/Release-Rollout', 'title': 'Release Rollout', 'section': 'services', 'navLabel': None, 'backdrop': {'type': 'none', 'color': '#000000'}, 'blocks': [
   {'type': 'paragraph', 'text': 'ARE YOU RELEASING AN ALBUM, EP, OR SINGLE? WORK WITH BITS TO HELP YOU ORGANIZE A STRATEGIC ROLLOUT PLAN, RELEASE EVENT, AND MORE FOR EXACTLY WHAT YOU WANT AND NEED.', 'color': '#c10ddd'},
   {'type': 'paragraph', 'text': 'YOU FOCUS ON THE ART, WE’LL DO THE REST.', 'color': '#c10ddd'},
   para([R('SCHEDULE A DISCOVERY CALL ', color='#ea6711'), R('HERE', href='https://cal.com/breaksinthesimulation', color='#8c10eb')], note='followed by a line break'),
   {'type': 'paragraph', 'text': 'OR EMAIL AT: BREAKSINTHESIMULATION@GMAIL.COM', 'color': '#ea6711', 'email': 'breaksinthesimulation@gmail.com', 'note': 'not a link on the live site'},
 ]},
 {'slug': 'playlists', 'path': '/playlists', 'title': 'playlists', 'section': 'services', 'navLabel': None, 'backdrop': {'type': 'parallax', 'asset': 'bts-logos-06.png'}, 'blocks': [
   {'type': 'link', 'text': t, 'href': 'https://open.spotify.com/playlist/' + h, 'external': True, 'newTab': True, 'color': c, 'column': col, 'role': 'playlist'}
   for t, h, c, col in [
    ('HOT NOLA!', '4VLZw3TIOsdGukfqXjsN7K?si=0f9ac4ddd509438d', '#fff700', 1),
    ('Faded Love.', '56xPT9oQwFFpOCMPTbaEus?si=5c6404e2ecae4a0c', '#fff700', 1),
    ('BOO!', '44LFXMWIRFYo9GCCaC628y?si=413257d4ef1a4199', '#fff700', 1),
    ('Morning Wheaties.', '2UGE5qPnox2RTQB9PnSVpN?si=2f953efd0241485f', '#fff700', 1),
    ('Yoncé.', '1IWV3Pa5snSkoR3c95S41H?si=a9ca3bd7bd694e6c', '#fff700', 1),
    ('Sun Showers.', '3AxewYARJvYQBfoumKbCNm?si=336b7516fc114ef3', '#fff700', 1),
    ('I.G.B.O.', '52iqjvStNlAcP5SS14k9Vg?si=b9b6e53d0f8245ed', '#f8f822', 2),
    ('Fall Feels.', '5xHQMbM6sYM5E7KuafYog1?si=29643d8634714ae3', '#f8f822', 2),
    ('BlackLivesMatter', '4FCIHs35tMLpDe7jKSbrhr?si=076410032e534cab', '#f8f822', 2),
    ('Get Down.', '0nj6f2bjD3314HFvUA2aU0?si=558243b9777f4623', '#f8f822', 2),
    ('GRL PWR.', '1IWV3Pa5snSkoR3c95S41H?si=ca17e42cd63b4ceb', '#f8f822', 2),
    ('First Edition.', '0Jtdn2Uy54INsY8BiH6PsW?si=a5a3957c13e44662', '#f8f822', 2)]
 ]},
 {'slug': 'Special-Inquiries', 'path': '/Special-Inquiries', 'title': 'Special Inquiries', 'section': 'services', 'navLabel': None, 'backdrop': {'type': 'none', 'color': '#000000'}, 'blocks': [
   {'type': 'paragraph', 'text': 'PLAYLISTS, EVENT,  HEALING WORKSHOPS...WHATEVER YOU NEED, WE’RE CURATING THE EXPERIENCE.', 'color': '#d44e14'},
   {'type': 'paragraph', 'text': 'LET’S TALK ABOUT YOUR IDEAS @ BREAKSINTHESIMULATION@GMAIL.COM', 'color': '#d44e14', 'email': 'breaksinthesimulation@gmail.com', 'note': 'not a link on the live site'},
 ]},
 {'slug': 'Wellness-Resources', 'path': '/Wellness-Resources', 'title': 'Wellness Resources', 'section': 'wellness', 'navLabel': 'Wellness Resources', 'backdrop': {'type': 'none', 'color': '#000000'}, 'blocks': [
   {'type': 'heading', 'level': 2, 'text': 'Mindset Coaching for Creatives:\nRewire with Rocky',
    'runs': [R('Mindset Coaching for Creatives:\n', color='#ffffff'), R('Rewire with Rocky', href='Rewire-with-Rocky', color='#ffffff')], 'liveTag': 'h2 (bold, Neue Haas Grotesk)'},
 ]},
 {'slug': 'Rewire-with-Rocky', 'path': '/Rewire-with-Rocky', 'title': 'Rewire with Rocky', 'section': 'wellness', 'navLabel': None, 'backdrop': {'type': 'none', 'color': '#000000'}, 'blocks': [
   {'type': 'paragraph', 'text': 'Rewire With Rocky is a 1-on-1\nMindset Coaching program for Creatives', 'color': '#0e1def'},
   {'type': 'paragraph', 'text': 'mixing therapeutic and mindfulness practices to ensure your beliefs and attitudes are serving you and your goals', 'color': '#eadddd'},
   {'type': 'paragraph', 'text': 'select one of the following options:', 'color': '#8ee1ea'},
   {'type': 'paragraph', 'text': '(1) 60min. session\n(3) 60min. sessions\n(8) 60min. sessions', 'color': '#0e1def', 'note': 'plain text on the live site: no prices, no per-option links'},
   {'type': 'button', 'text': 'BUY AND BOOK NOW!', 'href': 'https://www.patreon.com/rewirewithrocky', 'external': True, 'newTab': True, 'color': '#f6f1f1'},
   {'type': 'paragraph', 'text': 'Schedule a free 45min. consultation today!', 'color': '#129f8c', 'liveTag': 'sup (31.32px)'},
   para([R('Step 1: Click ', color='#5ffcf2'), R('HERE', href='https://docs.google.com/forms/d/1NQUu7-pYGrvmls7swbBzdj2UkNHCcClRRFyZgUgeS8s/edit', color='#e8f2f2'), R(' to fill out the consultation form', color='#5ffcf2')]),
   {'type': 'paragraph', 'text': 'Step 2: Check your email for a response to schedule consultation', 'color': '#48f5de'},
 ]},
 {'slug': 'Show-Your-Support', 'path': '/Show-Your-Support', 'title': 'Show Your Support', 'section': 'support', 'navLabel': 'Show Your Support', 'backdrop': {'type': 'none', 'color': '#000000'}, 'blocks': [
   {'type': 'link', 'text': 'MERCH', 'href': 'merch', 'color': '#ffffff', 'role': 'support'},
   {'type': 'link', 'text': 'BECOME A MEMBER', 'href': 'https://www.patreon.com/breaksinthesimulation?fan_landing=true', 'external': True, 'newTab': True, 'color': '#ffffff', 'role': 'support'},
   {'type': 'link', 'text': 'MAKE A DONATION', 'href': 'https://www.paypal.com/donate/?hosted_button_id=TURRDH52BUSN4', 'external': True, 'newTab': True, 'color': '#ffffff', 'role': 'support', 'note': 'PayPal only on the live site; no Venmo link found anywhere'},
 ]},
 {'slug': 'merch', 'path': '/merch', 'title': 'merch', 'section': 'support', 'navLabel': None, 'backdrop': {'type': 'wallpaper', 'asset': '1months6continent-1-8.jpg'}, 'blocks': [
   {'type': 'paragraph', 'text': 'RESTOCKING.....BE BACK SOON :]', 'color': '#09f858', 'backing': '#ff4006@0.85', 'note': 'live text is bold, 45.36px, green on a semi-transparent orange-red box; wraps mid-word on mobile ("RESTOCKIN / G....")'},
 ]},
]
LINKS_404 = [
 {'from': '/', 'href': '/Mindset-Coaching', 'label': '(empty, invisible link)', 'status': 404},
 {'from': '/Programming-Events', 'href': '/Fire-Ice', 'label': '(empty, invisible link around a <br>)', 'status': 404},
 {'from': '/MMNT-2-MMNT', 'href': '/MMNT-2-MMNT-event', 'label': 'MMNT 2 MMNT (visible link, first words of the page)', 'status': 404},
]
nav = [{'text': 'Programming & Events', 'href': 'Programming-Events'}, {'text': 'Artist Development & Creative Services', 'href': 'Creative-Services'}, {'text': 'Wellness Resources', 'href': 'Wellness-Resources'}, {'text': 'Show Your Support', 'href': 'Show-Your-Support'}]
content = {
 'source': LIVE, 'capturedAt': '2026-10-17', 'method': 'Playwright/Chromium, desktop 1440 + mobile 390, rendered DOM',
 'notes': ['text is transcribed from the rendered DOM; HTML whitespace is collapsed as a browser shows it and NBSP padding used by Cargo for layout is not transcribed (kept in capture/<slug>/text.md as ␣).',
           'color values are the computed text color of the run on the live site ("#hex@alpha" when semi-transparent). Design branches use palette.json accent mapping rather than the per-run live colors.',
           'hrefs without a scheme are site-relative paths exactly as authored in Cargo.'],
 'site': {'title': 'Breaks In The Simulation', 'metaDescription': 'Cargo', 'favicon': 'https://static.cargo.site/favicon/favicon.ico (Cargo default globe, not BITS)', 'nav': nav,
          'social': [{'name': 'Instagram', 'href': 'https://www.instagram.com/breaksinthesimulation/'}, {'name': 'Spotify', 'href': 'https://open.spotify.com/user/ntixhuy6sld8s732reknd7vfs?si=122c0197351b423d&nd=1'}],
          'email': 'breaksinthesimulation@gmail.com'},
 'pages': pages, 'deadLinks': LINKS_404,
}
# ---- verification: every text string must appear in the live extraction for that page
def live_text(slug):
    k = 'home' if slug == 'home' else slug
    return norm(' '.join(''.join(r['text'] for r in l.get('runs', [])) + ' ' for l in P3[k]['desktop']['lines']))
def walk_strings(b):
    for key in ('text', 'title', 'meta', 'description'):
        if b.get(key) and not b.get('icon'): yield b[key]
    for r in b.get('runs', []): yield r['text']
    if 'cta' in b: yield b['cta']['text']
bad = 0
for p in pages:
    lt = live_text(p['slug'])
    for b in p['blocks']:
        for s in walk_strings(b):
            if norm(s) and norm(s) not in lt:
                print('MISMATCH', p['slug'], repr(s)[:80]); bad += 1
print('content verification mismatches:', bad)
json.dump(content, open(f'{ROOT}/content.json', 'w'), indent=2, ensure_ascii=False)

# ---------- manifest.json ----------
CDN = 'https://freight.cargo.site/t/original/i/'
src = {
 'bts-logos-03.png': (CDN+'627c1e7a4a629e9a4dc47476246f47b07202de85fa7d736cde3fcc610142bf0e/bts-logos-03.png', 'Home logo: lime "b!ts" in checker-vortex corridor', ['/'], 'visible'),
 'bts-logos-06.png': (CDN+'a12f2e75a6604c2b1010ad8b831b8c4277148bb2d46840d3c1a1c81f61dcb90d/bts-logos-06.png', 'Red checker vortex with "BREAKS IN THE SIMULATION" lettering: parallax backdrop of the playlists page', ['/playlists'], 'visible (backdrop)'),
 'SunShow24_-square_FINAL-1080-.jpg': (CDN+'e80c1e102c9d7c61fc21133a5a531aba7ff91a75d891859bc0ee2c4a182fa7bf/SunShow24_-square_FINAL-1080-.jpg', 'Sunset Showcase flyer (Sept 22, 2024)', ['/Sunset-Showcase'], 'visible'),
 'IMG_2843-1.JPG': (CDN+'e311353b5846506fa0e1be316c8e7448a03c7049db5f46e929aac85182fd6848/IMG_2843-1.JPG', 'MMNT 2 MMNT photo 1', ['/MMNT-2-MMNT'], 'visible'),
 'IMG_8177.JPG': (CDN+'53cd5ca9c6e23e1411e5718ac2f5399e11e7e35ee5a13c19e8864e0211681658/IMG_8177.JPG', 'MMNT 2 MMNT photo 2', ['/MMNT-2-MMNT'], 'visible'),
 '1months6continent-1-8.jpg': (CDN+'0b5d319e18e9c699ffba90e787939ff06b5621fe34880565d7698c58910b6309/1months6continent-1-8.jpg', 'Road photo: wallpaper backdrop of the merch page', ['/merch'], 'visible (backdrop)'),
 'IMG_8188.JPG': (CDN+'f45dfa9ac23390d80e3211828a661d557d79507d528ae56d7e679b4dcc2c15c6/IMG_8188.JPG', 'Cargo page thumbnail / OG image for /MMNT-2-MMNT and /Rewire-with-Rocky. Not displayed on the pages.', ['/MMNT-2-MMNT', '/Rewire-with-Rocky'], 'og-only'),
 'AA019A_2.jpg': (CDN+'f26741312a98c5587797b69407616c75f4395947b4ab2dedbf15ad3e1bb44b1e/AA019A_2.jpg', 'Cargo page thumbnail / OG image for /about-us and /Creative-Services. Not displayed on the pages.', ['/about-us', '/Creative-Services'], 'og-only'),
 'R2_007.jpg': (CDN+'01b4f6d8c3136791c54faec1f497eb7d29c1123afaaaef2d6eaad554ed826175/R2_007.jpg', 'Cargo page thumbnail / OG image for /Programming-Events and /Sunset-Showcase. Not displayed on the pages.', ['/Programming-Events', '/Sunset-Showcase'], 'og-only'),
 'Oval1.svg': (CDN+'d8355555c72c3b0ae0d79f1486a72c4732bb1a57a3f70de39d7cd8d692d2aab9/Oval1.svg', 'Red dot: Cargo default OG image for /playlists. Not a brand asset.', ['/playlists'], 'og-only'),
 'favicon.ico': ('https://static.cargo.site/favicon/favicon.ico', 'Cargo default blue globe favicon (every page). Not a BITS asset.', ['*'], 'favicon'),
}
man = []
for fn, (url, desc, used, vis) in src.items():
    path = f'{ROOT}/assets/{fn}'
    ent = {'file': fn, 'sourceUrl': url, 'description': desc, 'usedOn': used, 'visibility': vis, 'bytes': os.path.getsize(path)}
    try:
        im = Image.open(path); ent['width'], ent['height'] = im.size
        if fn.endswith('.ico'): ent['icoSizes'] = sorted(im.ico.sizes())
    except Exception: ent['width'] = ent['height'] = 100; ent['note'] = 'SVG viewBox 100x100'
    man.append(ent)
json.dump({'note': 'Originals from freight.cargo.site/t/original (full resolution). The live pages serve resized /w/<n>/ derivatives of the same hash. Social icons are glyphs of the Cargo icon font (fonts/IconFont-Regular-0.9.3.woff2): Instagram U+E025, Spotify U+E051; they are not images. No video exists on the site.', 'assets': man},
          open(f'{ROOT}/assets/manifest.json', 'w'), indent=2)
