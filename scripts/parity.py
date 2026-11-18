#!/usr/bin/env python3
"""Parity check: flat site (legacy/ + public/) vs the Next build.
  npm run build && python3 scripts/parity.py [--shots DIR]
For every page it compares (1) the rendered DOM of <html>/<body> and the <head> tags, and (2) full-page screenshots at 390 and 1440
with animation frozen identically on both sides.  Exit code 1 on any difference."""
import difflib, http.server, os, re, socketserver, subprocess, sys, threading, time
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = sys.argv[sys.argv.index('--shots') + 1] if '--shots' in sys.argv else '/tmp/bits-shots'
os.makedirs(SHOTS, exist_ok=True)
PAGES = ['', 'about-us', 'Build-People', 'Build-Systems', 'Programming-Events', 'MMNT-2-MMNT', 'Sunset-Showcase', 'Creative-Services',
         'Release-Rollout', 'playlists', 'Special-Inquiries', 'Wellness-Resources', 'Rewire-with-Rocky', 'Show-Your-Support', 'merch',
         'privacy', 'terms']
# Pages whose copy was deliberately changed for payments (legal text). Everything else must match the flat site exactly.
INTENTIONAL = {'terms', 'privacy'}
TYPES = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png',
         '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2'}

class Flat(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        p = self.path.split('?')[0]
        cands = [os.path.join(ROOT, 'legacy', 'index.html' if p == '/' else p.lstrip('/') + '.html'), os.path.join(ROOT, 'public', p.lstrip('/'))]
        for f in cands:
            if os.path.isfile(f):
                self.send_response(200); self.send_header('content-type', TYPES.get(os.path.splitext(f)[1], 'application/octet-stream')); self.end_headers()
                return self.wfile.write(open(f, 'rb').read())
        self.send_response(404); self.end_headers()

FREEZE = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'
JS_DOM = """() => {
  const clone = document.documentElement.cloneNode(true);
  clone.querySelectorAll('script,next-route-announcer,noscript,meta[name=viewport],meta[charset],style').forEach(e => e.remove());
  clone.querySelectorAll('link[rel=preload][as=script],link[rel=preload][as=style],link[rel=modulepreload]').forEach(e => e.remove());
  clone.querySelectorAll('link[rel=stylesheet]').forEach(e => { if (!/site\\.css/.test(e.getAttribute('href'))) e.remove(); });
  clone.querySelectorAll('link[rel=stylesheet]').forEach(e => { e.removeAttribute('data-precedence'); });
  clone.querySelectorAll('[data-precedence]').forEach(e => e.removeAttribute('data-precedence'));
  clone.querySelectorAll('*').forEach(e => { for (const a of [...e.attributes]) if (/^(data-next|data-rh)/.test(a.name)) e.removeAttribute(a.name); });
  clone.querySelectorAll('link[rel=preload]').forEach(e => e.remove());
  clone.querySelectorAll('div[hidden]').forEach(e => { if (!e.textContent.trim() && !e.children.length) e.remove(); });
  clone.classList.remove('js');
  let h = clone.outerHTML.replace(/\\s+/g, ' ').replace(/> </g, '><').replace(/ class=""/g, '');
  h = h.replace(/<!--.*?-->/g, '');
  h = h.replace(/crossorigin="(anonymous)?"/g, 'crossorigin');
  return h.split(/(?=<)/).join('\\n');
}"""

def main():
    class Srv(socketserver.ThreadingTCPServer): allow_reuse_address = True
    srv = Srv(('127.0.0.1', 4301), Flat)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    nx = subprocess.Popen(['npx', 'next', 'start', '-p', '4200'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(4)
    bad = 0
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch()
            for w, h in [(390, 844), (1440, 900)]:
                ctx = b.new_context(viewport={'width': w, 'height': h}); page = ctx.new_page()
                for p in PAGES:
                    name = p or 'home'; out = {}
                    if name in INTENTIONAL: print('intentional change, not compared:', name, w); continue
                    for side, base in (('flat', 'http://127.0.0.1:4301'), ('next', 'http://127.0.0.1:4200')):
                        page.goto(f'{base}/{p}', wait_until='networkidle'); page.add_style_tag(content=FREEZE); page.wait_for_timeout(350)
                        out[side] = page.evaluate(JS_DOM)
                        page.screenshot(path=f'{SHOTS}/{name}-{w}-{side}.png', full_page=True)
                    if w == 390:  # DOM is the same at both widths
                        if out['flat'] != out['next']:
                            bad += 1; print('DOM DIFF', name)
                            for l in list(difflib.unified_diff(out['flat'].split('\n'), out['next'].split('\n'), 'flat', 'next', lineterm='', n=0))[:14]: print('   ', l[:200])
                    a = Image.open(f'{SHOTS}/{name}-{w}-flat.png').convert('RGB'); c = Image.open(f'{SHOTS}/{name}-{w}-next.png').convert('RGB')
                    if a.size != c.size:
                        bad += 1; print('SIZE DIFF', name, w, a.size, c.size); continue
                    d = ImageChops.difference(a, c).getbbox()
                    if d: bad += 1; print('PIXEL DIFF', name, w, 'bbox', d)
                    else: print('ok', name, w)
                ctx.close()
            b.close()
    finally:
        nx.terminate(); srv.shutdown()
    print('DIFFERENCES:', bad); sys.exit(1 if bad else 0)
main()
