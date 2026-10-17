#!/usr/bin/env python3
"""Generates the static site from source/content.json (+ source/meta.json).

    python3 tools/build.py

Output: one flat .html per page in the repo root (Vercel `cleanUrls` serves /about-us etc.).
Every visible word comes from content.json; the only words not from it are the UI chrome labels
listed in DESIGN.md. Edit content.json, re-run, commit. Nothing runs at deploy time.
"""
import html
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VARIANT = 'immersive'           # 'cleaned-up' | 'immersive'
C = json.load(open(f'{ROOT}/source/content.json'))
META = json.load(open(f'{ROOT}/source/meta.json'))['pages']
PAGES = {p['slug']: p for p in C['pages']}
SITE_TITLE = C['site']['title']
EMAIL_TEXT = 'BREAKSINTHESIMULATION@GMAIL.COM'

# ---- structure ------------------------------------------------------------------------------------------
ORDER = ['home', 'about-us', 'Programming-Events', 'MMNT-2-MMNT', 'Sunset-Showcase', 'Creative-Services',
         'Release-Rollout', 'playlists', 'Special-Inquiries', 'Wellness-Resources', 'Rewire-with-Rocky',
         'Show-Your-Support', 'merch']
SECTIONS = ['programming', 'services', 'wellness', 'support']            # level order, 01-04
SECTION_HOME = {'programming': 'Programming-Events', 'services': 'Creative-Services',
                'wellness': 'Wellness-Resources', 'support': 'Show-Your-Support'}
LONG = 110                      # paragraphs longer than this are set in the readable body face


def rel(h):
    return bool(h) and not re.match(r'^(https?:|mailto:)', h)


def url(h):
    if not rel(h):
        return h
    return '/' if h == 'home' else '/' + h


# label of each page = the text of the link that points to it (never invented)
LABEL = {'home': SITE_TITLE}
PARENT = {}
for p in C['pages']:
    for b in p['blocks']:
        cands = []
        if b['type'] in ('link', 'event', 'button') and rel(b.get('href')):
            cands.append((b['href'], b.get('text') or b.get('title')))
        for r in b.get('runs', []):
            if rel(r.get('href')) and not r.get('deadLink'):
                cands.append((r['href'], r['text']))
        for h, t in cands:
            if h not in LABEL and t:
                LABEL[h] = t.strip()
            PARENT.setdefault(h, p['slug'])
LABEL['about-us'] = 'get to know us!'


def section_of(slug):
    return PAGES[slug]['section']


# ---- text helpers ---------------------------------------------------------------------------------------
def nobr_slashes(s):
    """keep tokens like artists/musicians together (no orphaned 'musi-cians' breaks)"""
    parts = re.split(r'(\S*[A-Za-z]/[A-Za-z]\S*)', s)
    return ''.join(f'<span class="nobr">{html.escape(x)}</span>' if i % 2 else html.escape(x)
                   for i, x in enumerate(parts))


def fmt(text):
    return '<br>'.join(nobr_slashes(line) for line in text.split('\n'))


def link_email(s_html):
    mail = 'mailto:' + C['site']['email']
    return s_html.replace(EMAIL_TEXT, f'<a class="inline-link" href="{mail}">{EMAIL_TEXT}</a>')


def ext(b):
    return ' target="_blank" rel="noopener noreferrer"' if b.get('newTab') else ''


def runs_html(b):
    out = []
    for r in b['runs']:
        t = fmt(r['text'])
        if r.get('href') and not r.get('deadLink'):
            h = r['href']
            at = ' target="_blank" rel="noopener noreferrer"' if not rel(h) else ''
            out.append(f'<a class="inline-link" href="{html.escape(url(h), quote=True)}"{at}>{t}</a>')
        else:
            out.append(t)       # dead (404) links are rendered as plain text
    return ''.join(out)


def para_html(b, cls=''):
    inner = runs_html(b) if b.get('runs') else fmt(b['text'])
    if b.get('email'):
        inner = link_email(inner)
    face = 'prose' if len(b['text']) > LONG else 'pix'
    c = f'{face} {cls}'.strip()
    return f'<p class="{c}">{inner}</p>'


def srcset(base, widths, ext_='webp'):
    return ', '.join(f'/img/{base}-{w}.{ext_} {w}w' for w in widths)


def picture(asset, alt='', sizes='(min-width: 640px) 560px, 100vw', loading='lazy', cls=''):
    spec = {
        'SunShow24_-square_FINAL-1080-.jpg': ('SunShow24_-square_FINAL-1080-', [540, 1080], 1080, 1080),
        'IMG_2843-1.JPG': ('IMG_2843-1', [800, 1600], 1600, 1200),
        'IMG_8177.JPG': ('IMG_8177', [800, 1600], 1600, 1127),
        'bts-logos-03.png': ('bts-logos-03', [240, 480, 1000], 1000, 608),
    }[asset]
    base, widths, w, h = spec
    big = widths[-1]
    return (f'<img class="{cls}" src="/img/{base}-{big}.webp" srcset="{srcset(base, widths)}" sizes="{sizes}" '
            f'width="{w}" height="{h}" alt="{html.escape(alt, quote=True)}" loading="{loading}" decoding="async">')


ICON = {'instagram': '&#xE025;&#xFE0E;', 'spotify': '&#xE051;&#xFE0E;'}


def social_html(cls='social'):
    items = []
    for s in C['site']['social']:
        key = s['name'].lower()
        items.append(f'<a class="social__link" href="{html.escape(s["href"], quote=True)}" target="_blank" '
                     f'rel="noopener noreferrer" aria-label="{s["name"]}"><span class="icon" aria-hidden="true">'
                     f'{ICON[key]}</span></a>')
    return f'<div class="{cls}">{"".join(items)}</div>'


# ---- components -----------------------------------------------------------------------------------------
def card(href, label, cls, section=None, external=False, tag_font=''):
    sec = f' data-section="{section}"' if section else ''
    at = ' target="_blank" rel="noopener noreferrer"' if external else ''
    arrow = '&#8599;' if external else '&rarr;'
    return (f'<a class="card {cls} {tag_font}"{sec} href="{html.escape(url(href), quote=True)}"{at}>'
            f'<span class="card__label">{fmt(label)}</span><span class="card__go" aria-hidden="true">{arrow}</span></a>')


def event_full(b):
    parts = [f'<article class="event">', f'<h1 class="event__title">{html.escape(b["title"].strip())}</h1>']
    meta = ' <span class="sep">/</span> '.join(f'<span class="nobr">{html.escape(x.strip())}</span>'
                                              for x in re.split(r'\s+/\s+', b['meta']))
    parts.append(f'<p class="event__meta">{meta}</p>')
    img = b['image']
    parts.append(f'<figure class="frame">{picture(img["asset"], img["alt"], loading="eager")}</figure>')
    parts.append(f'<p class="prose event__body">{fmt(b["description"])}</p>')
    c = b['cta']
    parts.append(f'<p class="event__cta"><a class="btn" href="{html.escape(c["href"], quote=True)}"{ext(c)}>'
                 f'{html.escape(c["text"])}</a></p>')
    parts.append('</article>')
    return '\n'.join(parts)


# ---- page bodies ----------------------------------------------------------------------------------------
def page_h1(slug):
    """(visible?, text) for the page's h1. Always text from content.json."""
    p = PAGES[slug]
    b = p['blocks']
    if slug == 'home':
        return False, SITE_TITLE
    if slug == 'about-us':
        return True, b[0]['text']
    if slug in ('Programming-Events', 'Creative-Services', 'Show-Your-Support'):
        return True, LABEL[slug]
    if slug == 'Wellness-Resources':
        return True, None            # the heading block itself is the h1
    if slug in ('Release-Rollout', 'playlists', 'Special-Inquiries'):
        return True, LABEL[slug]
    if slug == 'Sunset-Showcase':
        return True, None            # event title is the h1
    return False, LABEL[slug]        # MMNT-2-MMNT, Rewire-with-Rocky, merch: lede/backing text is the visible lead


def body_for(slug):
    p = PAGES[slug]
    bl = p['blocks']
    out = []
    vis, h1 = page_h1(slug)
    head = ''
    if slug not in ('home',) and h1 is not None:
        cls = 'page-title' if vis else 'sr-only'
        head = f'<h1 class="{cls}">{fmt(h1)}</h1>'

    if slug == 'home':
        out.append(f'<h1 class="sr-only">{html.escape(SITE_TITLE)}</h1>')
        about = bl[0]
        out.append(f'<a class="home__about" href="{url(about["href"])}">{html.escape(about["text"])}</a>')
        out.append(f'<figure class="home__logo">{picture("bts-logos-03.png", "b!ts", sizes="(min-width: 700px) 560px, calc(100vw - 2rem)", loading="eager")}</figure>')
        out.append(social_html('social social--home'))
        tiles = [card(b['href'], b['text'], 'card--section', section=PAGES[b['href']]['section'])
                 for b in bl if b.get('role') == 'nav']
        out.append('<ul class="tiles">' + ''.join(f'<li>{t}</li>' for t in tiles) + '</ul>')
        return '\n'.join(out), 'home'

    if slug == 'about-us':
        out.append('<div class="panel">')
        out.append(head)
        for b in bl[1:]:
            if b['type'] == 'heading':
                out.append(f'<h2 class="section-head">{html.escape(b["text"])}</h2>')
            else:
                out.append(para_html(b))
        out.append('</div>')
        return '\n'.join(out), 'gradient'

    if slug == 'Programming-Events':
        out.append(head)
        out.append(para_html(bl[0], 'hint'))
        out.append('<ul class="stack">' + ''.join(
            f'<li>{card(b["href"], b["title"], "card--event")}</li>' for b in bl[1:]) + '</ul>')
        return '\n'.join(out), ''

    if slug == 'MMNT-2-MMNT':
        out.append(head)
        lead = bl[0]
        name = html.escape(lead['runs'][0]['text'])
        rest = fmt(lead['runs'][1]['text'])
        out.append(f'<p class="lede"><strong class="lede__name">{name}</strong>{rest}</p>')
        out.append(para_html(bl[1], 'note'))
        out.append('<div class="gallery">' + ''.join(
            f'<figure class="frame">{picture(b["asset"], b["alt"], sizes="(min-width: 900px) 520px, 100vw")}</figure>'
            for b in bl[2:]) + '</div>')
        return '\n'.join(out), ''

    if slug == 'Sunset-Showcase':
        out.append(event_full(bl[0]))
        return '\n'.join(out), ''

    if slug == 'Creative-Services':
        out.append(head)
        out.append('<ul class="stack">' + ''.join(
            f'<li>{card(b["href"], b["text"], "card--service", external=b.get("external", False))}</li>'
            for b in bl) + '</ul>')
        return '\n'.join(out), ''

    if slug == 'Release-Rollout':
        out.append(head)
        out.append(para_html(bl[0], 'first'))
        out.append(para_html(bl[1], 'tag'))
        call = bl[2]
        cta = runs_html(call)
        mail = link_email(fmt(bl[3]['text']))
        out.append(f'<p class="pix cta-line">{cta}<br>{mail}</p>')
        return '\n'.join(out), ''

    if slug == 'playlists':
        out.append(head)
        cols = {1: [], 2: []}
        for b in bl:
            cols[b['column']].append(b)
        items = ''.join(f'<li><a class="chip" href="{html.escape(b["href"], quote=True)}" target="_blank" '
                        f'rel="noopener noreferrer">{html.escape(b["text"])}</a></li>' for b in cols[1] + cols[2])
        out.append(f'<ul class="chips">{items}</ul>')
        return '\n'.join(out), 'parallax'

    if slug == 'Special-Inquiries':
        out.append(head)
        out.append(para_html(bl[0], 'first'))
        out.append(f'<p class="pix cta-line">{link_email(fmt(bl[1]["text"]))}</p>')
        return '\n'.join(out), ''

    if slug == 'Wellness-Resources':
        h = bl[0]
        out.append(f'<h1 class="page-title sans">{runs_html(h).replace(chr(10), "<br>")}</h1>')
        return '\n'.join(out), ''

    if slug == 'Rewire-with-Rocky':
        out.append(head)
        out.append(f'<p class="lede lede--pix">{fmt(bl[0]["text"])}</p>')
        out.append(para_html(bl[1], 'desc'))
        out.append(para_html(bl[2], 'hint'))
        opts = ''.join(f'<li>{html.escape(x)}</li>' for x in bl[3]['text'].split('\n'))
        out.append(f'<ul class="options pix">{opts}</ul>')
        b = bl[4]
        out.append(f'<p class="actions"><a class="btn" href="{html.escape(b["href"], quote=True)}"{ext(b)}>{html.escape(b["text"])}</a></p>')
        out.append('<div class="consult">')
        out.append(f'<p class="pix small">{html.escape(bl[5]["text"])}</p>')
        out.append(f'<p class="pix step">{runs_html(bl[6])}</p>')
        out.append(f'<p class="pix step">{html.escape(bl[7]["text"])}</p>')
        out.append('</div>')
        return '\n'.join(out), ''

    if slug == 'Show-Your-Support':
        out.append(head)
        out.append('<ul class="stack">' + ''.join(
            f'<li>{card(b["href"], b["text"], "card--support", external=b.get("external", False), tag_font="sans")}</li>'
            for b in bl) + '</ul>')
        return '\n'.join(out), ''

    if slug == 'merch':
        out.append(head)
        out.append(f'<p class="backing">{fmt(bl[0]["text"])}</p>')
        return '\n'.join(out), 'wallpaper'
    raise KeyError(slug)


# ---- chrome ---------------------------------------------------------------------------------------------
def nav_items(current):
    items = []
    cur_sec = section_of(current)
    for i, n in enumerate(C['site']['nav'], 1):
        sec = PAGES[n['href']]['section']
        aria = ''
        if current == n['href']:
            aria = ' aria-current="page"'
        elif cur_sec == sec:
            aria = ' aria-current="true"'
        items.append((i, n, sec, aria))
    return items


def header_html(slug):
    sec = section_of(slug)
    nav = ''.join(
        f'<li><a class="site-nav__link" data-section="{s}" href="{url(n["href"])}"{aria}>'
        + f'<span class="site-nav__text">{html.escape(n["text"])}</span></a></li>'
        for i, n, s, aria in nav_items(slug))
    # header mark = just the lime "b!ts" lettering (transparent), cut from her logo by tools/make_letters.py; 40px slot
    logo = ('<img src="/img/bts-letters-80.webp" srcset="/img/bts-letters-80.webp 2x, /img/bts-letters-120.webp 3x" '
            'width="103" height="40" alt="b!ts">')
    btn = ('<button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav" '
           'aria-label="Menu" data-menu-btn><span class="menu-btn__bars" aria-hidden="true"></span></button>')
    if VARIANT == 'cleaned-up':
        return (f'<header class="site-header"><div class="site-header__bar">'
                f'<a class="brand" href="/">{logo}</a>{btn}</div>'
                f'<nav class="site-nav" id="site-nav" aria-label="Main"><ul>{nav}</ul>{social_html("social social--nav")}</nav>'
                f'</header>')
    # immersive: HUD
    idx = '00' if sec == 'home' else f'{SECTIONS.index(sec) + 1:02d}'
    where = SITE_TITLE if sec == 'home' else LABEL[SECTION_HOME[sec]]
    return (f'<header class="hud"><div class="hud__bar">'
            f'<a class="brand" href="/">{logo}</a>'
            f'<p class="hud__where"><span class="hud__idx" data-idx="{idx}" aria-hidden="true"></span><span class="hud__sep" aria-hidden="true"></span>'
            f'<span class="hud__name">{html.escape(where)}</span></p>{btn}</div>'
            f'<nav class="site-nav levels" id="site-nav" aria-label="Main"><ol>{nav}</ol>{social_html("social social--nav")}</nav>'
            f'</header>')


def pager_html(slug):
    if slug == 'home':
        return ''
    par = PARENT.get(slug, 'home')
    nxt = ORDER[(ORDER.index(slug) + 1) % len(ORDER)]
    return (f'<nav class="pager" aria-label="Back and next">'
            f'<a class="pager__link pager__back" href="{url(par)}"><span aria-hidden="true">&larr;</span> '
            f'<span>{html.escape(LABEL[par])}</span></a>'
            f'<a class="pager__link pager__next" data-section="{section_of(nxt)}" href="{url(nxt)}">'
            f'<span>{html.escape(LABEL[nxt])}</span> <span aria-hidden="true">&rarr;</span></a></nav>')


def head_html(slug):
    m = META[slug]
    d = re.sub(r'\s+', ' ', (m.get('ogDescription') or '').replace('\xa0', ' ')).strip()
    og_img = ''
    if m.get('ogImage') and 'Oval1' not in m['ogImage']:
        name = m['ogImage'].rsplit('/', 1)[1]
        base = os.path.splitext(name)[0]
        if base in ('IMG_8188', 'AA019A_2', 'R2_007'):
            og_img = f'<meta property="og:image" content="/img/{base}-og.jpg">\n'
        elif base == '1months6continent-1-8':
            og_img = '<meta property="og:image" content="/img/1months6continent-1-8-800.webp">\n'
    desc = f'<meta name="description" content="{html.escape(d, quote=True)}">\n<meta property="og:description" content="{html.escape(d, quote=True)}">\n' if d else ''
    return f'''<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(m["title"])}</title>
{desc}<meta property="og:title" content="{html.escape(m["ogTitle"] or m["title"], quote=True)}">
<meta property="og:type" content="website">
{og_img}<meta name="theme-color" content="#000000">
<link rel="icon" href="/img/favicon.png" type="image/png">
<link rel="preload" href="/fonts/MisterPixel.woff" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="/css/site.css">
<script>document.documentElement.classList.add('js');try{{if(sessionStorage.getItem('bits-warp')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('is-arriving')}}catch(e){{}}</script>'''


def footer_html():
    # studio footer (UI chrome, not her copy; listed in DESIGN.md): copyright + legal pages + build credit
    return ('<footer class="site-footer"><div class="site-footer__inner">'
            '<p class="site-footer__copy">&copy; 2026 Breaks In The Simulation. All rights reserved.'
            '<span aria-hidden="true"> &middot; </span><a href="/privacy">Privacy</a>'
            '<span aria-hidden="true"> &middot; </span><a href="/terms">Terms</a></p>'
            '<p class="site-footer__credit">Designed by <a href="https://in-flu-ential.vercel.app" '
            'target="_blank" rel="noopener noreferrer">IN-FLU-ENTIAL</a></p>'
            '</div></footer>')


def render(slug):
    body, backdrop = body_for(slug)
    sec = section_of(slug)
    extra = ''
    if VARIANT == 'immersive':
        extra = ('<div class="corridor" aria-hidden="true"><div class="corridor__floor"></div>'
                 '<div class="corridor__wall corridor__wall--l"></div><div class="corridor__wall corridor__wall--r"></div>'
                 '<div class="corridor__glow"></div></div>\n<div class="crt" aria-hidden="true"></div>\n'
                 '<div class="warp" aria-hidden="true"></div>\n')
    return f'''<!doctype html>
<html lang="en" data-section="{sec}">
<head>
{head_html(slug)}
</head>
<body data-page="{slug}" data-backdrop="{backdrop}">
{extra}<a class="skip" href="#main">Skip to content</a>
{header_html(slug)}
<main id="main" class="main">
{body}
{pager_html(slug)}
</main>
{footer_html()}
<script src="/js/site.js" defer></script>
</body>
</html>
'''


def main():
    for slug in ORDER:
        name = 'index.html' if slug == 'home' else f'{slug}.html'
        open(f'{ROOT}/{name}', 'w').write(render(slug))
    print('built', len(ORDER), 'pages')


if __name__ == '__main__':
    main()
