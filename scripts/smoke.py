#!/usr/bin/env python3
"""Behaviour smoke test against `next start` (run npm run build first)."""
import subprocess, sys, time, os
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = 'http://127.0.0.1:4200'
nx = subprocess.Popen(['npx', 'next', 'start', '-p', '4200'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(4)
fails = []
def check(name, ok, extra=''):
    print(('ok   ' if ok else 'FAIL ') + name + (' ' + str(extra) if extra else '')); 
    if not ok: fails.append(name)
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page()
        errs = []; pg.on('console', lambda m: errs.append(m.text) if m.type in ('error', 'warning') else None); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(B + '/', wait_until='networkidle')
        check('js class set', pg.evaluate("document.documentElement.classList.contains('js')"))
        pg.click('[data-menu-btn]'); check('menu opens', pg.get_attribute('[data-menu-btn]', 'aria-expanded') == 'true' and pg.evaluate("document.documentElement.classList.contains('menu-open')"))
        pg.keyboard.press('Escape'); check('menu closes on Esc', pg.get_attribute('[data-menu-btn]', 'aria-expanded') == 'false')
        pg.click('[data-menu-btn]')
        pg.click('a.site-nav__link[data-section=systems]')
        pg.wait_for_url('**/Build-Systems', timeout=5000); pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(500)
        check('navigated to /Build-Systems', pg.url.endswith('/Build-Systems'))
        check('arrival iris cleared', not pg.evaluate("document.documentElement.classList.contains('is-arriving')"))
        check('current nav marked', pg.get_attribute('a.site-nav__link[data-section=systems]', 'aria-current') == 'page')
        check('no console errors/warnings', not errs, errs[:5])
        pg.goto(B + '/about-us#full-picture', wait_until='networkidle'); check('deep link opens full picture', pg.evaluate("document.getElementById('full-picture').open"))
        r = pg.goto(B + '/about-us.html', wait_until='networkidle'); check('/about-us.html redirects', pg.url.endswith('/about-us'))
        r = pg.goto(B + '/nope', wait_until='networkidle'); check('404 status', r.status == 404, r.status); check('404 page branded', 'Page not found' in pg.inner_text('h1'))
        r = pg.request.get(B + '/img/favicon.png'); h = r.headers
        check('img cache header', 'immutable' in h.get('cache-control', ''), h.get('cache-control'))
        check('security headers', h.get('x-content-type-options') == 'nosniff' and h.get('x-frame-options') == 'SAMEORIGIN')
        ctx2 = b.new_context(java_script_enabled=False, viewport={'width': 1440, 'height': 900}); p2 = ctx2.new_page(); p2.goto(B + '/Build-People')
        check('no-JS: nav links present', p2.locator('a.site-nav__link').count() == 4)
        reduced = b.new_context(reduced_motion='reduce'); p3 = reduced.new_page(); p3.goto(B + '/', wait_until='networkidle')
        p3.click('a.site-nav__link[data-section=people]', force=True); p3.wait_for_url('**/Build-People', timeout=3000); check('reduced motion navigates directly', True)
        b.close()
finally:
    nx.terminate()
print('FAILS:', fails); sys.exit(1 if fails else 0)
