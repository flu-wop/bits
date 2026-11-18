#!/usr/bin/env python3
"""One-time migration: reads the flat HTML pages in legacy/ and writes
content/main/<slug>.html (the <main> inner HTML), content/pages.json (head/body/header/footer
variables) and one Next route per page (each page has its own root layout so <html>/<body>
carry the same data-* attributes as the flat site).  Re-runnable."""
import glob, html, json, os, re, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
STD_HEAD = None
pages = {}
for f in sorted(glob.glob('legacy/*.html')):
    s = open(f, encoding='utf-8').read()
    name = os.path.basename(f)[:-5]
    slug = 'home' if name == 'index' else name
    path = '/' if slug == 'home' else '/' + slug
    head = re.search(r'<head>\n(.*?)</head>', s, re.S).group(1)
    title = html.unescape(re.search(r'<title>(.*?)</title>', head).group(1))
    metas = []
    for m in re.finditer(r'<meta ([^>]*)>', head):
        a = dict(re.findall(r'([\w:-]+)="([^"]*)"', m.group(1)))
        if 'charset' in a or a.get('name') == 'viewport': continue
        metas.append({k: html.unescape(v) for k, v in a.items()})
    rest = re.sub(r'<title>.*?</title>\n?', '', head)
    rest = re.sub(r'<meta [^>]*>\n?', '', rest)
    if STD_HEAD is None: STD_HEAD = rest
    elif rest != STD_HEAD: sys.exit(f'head differs on {f}:\n{rest}\n---\n{STD_HEAD}')
    html_tag = re.search(r'<html lang="en" data-section="([^"]*)">', s).group(1)
    body = re.search(r'<body data-page="([^"]*)" data-backdrop="([^"]*)">', s)
    skeleton = re.sub(r'<header class="hud">.*?</header>', '<HEADER/>', s[s.index('<body'):], flags=re.S)
    skeleton = re.sub(r'<main id="main" class="main">.*?</main>', '<MAIN/>', skeleton, flags=re.S)
    skeleton = re.sub(r'<footer.*?</footer>', '<FOOTER/>', skeleton, flags=re.S)
    skeleton = re.sub(r'<body[^>]*>', '<body>', skeleton)
    hdr = re.search(r'<header class="hud">.*?</header>', s, re.S).group(0)
    idx = re.search(r'data-idx="(\d+)"', hdr).group(1)
    hname = html.unescape(re.search(r'hud__name">([^<]*)', hdr).group(1))
    cur = re.search(r'<a class="site-nav__link"[^>]*href="([^"]*)" aria-current="page"', hdr)
    ftr = re.search(r'<footer.*?</footer>', s, re.S).group(0)
    rir = re.search(r'<a href="(https://rooted[^"]*)"', ftr).group(1)
    main = re.search(r'<main id="main" class="main">\n?(.*?)</main>', s, re.S).group(1)
    pages[slug] = dict(slug=slug, path=path, title=title, metas=metas, section=html_tag, page=body.group(1),
                       backdrop=body.group(2), idx=idx, hudName=hname, current=cur.group(1) if cur else None, rir=rir,
                       skeleton=skeleton)
    os.makedirs('content/main', exist_ok=True)
    open(f'content/main/{slug}.html', 'w', encoding='utf-8').write(main)
sk = {p['skeleton'] for p in pages.values()}
if len(sk) != 1: sys.exit('body skeleton differs across pages: %d variants' % len(sk))
for p in pages.values(): del p['skeleton']
head_extra = STD_HEAD
json.dump({'headExtra': head_extra, 'pages': pages}, open('content/pages.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
# routes
for d in glob.glob('app/(*)'): shutil.rmtree(d)
for slug, p in pages.items():
    group = f'app/({slug})'
    pdir = group if slug == 'home' else f'{group}/{slug}'
    os.makedirs(pdir, exist_ok=True)
    open(f'{group}/layout.tsx', 'w').write(
        "import RootShell from '@/components/RootShell';\n\n"
        f"export default function Layout({{ children }}: {{ children: React.ReactNode }}) {{\n"
        f"  return <RootShell slug=\"{slug}\">{{children}}</RootShell>;\n}}\n")
    open(f'{pdir}/page.tsx', 'w').write(
        "import MainHtml from '@/components/MainHtml';\n\n"
        f"export default function Page() {{\n  return <MainHtml slug=\"{slug}\" />;\n}}\n")
print('pages', len(pages)); print('head extra:\n' + STD_HEAD)
