#!/usr/bin/env python3
"""Admin end-to-end test in a real browser against `next dev` with a throwaway local database.
Sign-in links are printed by the dev mailer, so the test reads them from the server output."""
import os, re, shutil, subprocess, sys, threading, time
from playwright.sync_api import sync_playwright, expect
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 4210; B = f'http://127.0.0.1:{PORT}'; SHOTS = sys.argv[1] if len(sys.argv) > 1 else '/tmp/bits-admin-shots'
os.makedirs(SHOTS, exist_ok=True); shutil.rmtree(os.path.join(ROOT, '.data'), ignore_errors=True)
env = {**os.environ, 'ADMIN_EMAILS': 'raquel@example.com,james@example.com', 'SITE_URL': B, 'NEXT_TELEMETRY_DISABLED': '1'}
for k in ('TURSO_DATABASE_URL', 'RESEND_API_KEY', 'MAIL_FROM'): env.pop(k, None)
srv = subprocess.Popen(['npx', 'next', 'dev', '-p', str(PORT)], cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
out = []; threading.Thread(target=lambda: [out.append(l) for l in srv.stdout], daemon=True).start()
fails = []
def check(name, ok, extra=''):
    print(('ok   ' if ok else 'FAIL ') + name + (' ' + str(extra) if extra else ''))
    if not ok: fails.append(name)
def link_for(addr_count):
    for _ in range(60):
        ls = re.findall(r'http://127\.0\.0\.1:%d/admin/login/verify\?token=\S+' % PORT, ''.join(out))
        if len(ls) >= addr_count: return ls[addr_count - 1]
        time.sleep(0.5)
    return None
try:
    for _ in range(60):
        try:
            import urllib.request; urllib.request.urlopen(B + '/admin/login', timeout=60); break
        except Exception: time.sleep(1)
    with sync_playwright() as pw:
        b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 900}); pg = ctx.new_page(); pg.set_default_timeout(60000)
        pg.goto(B + '/admin/events'); check('unauthenticated /admin/events redirects to login', pg.url.endswith('/admin/login'))
        pg.screenshot(path=f'{SHOTS}/login.png', full_page=True)
        pg.fill('input[name=email]', 'stranger@example.com'); pg.click('button[type=submit]'); pg.wait_for_selector('p[role=status]')
        msg_stranger = pg.inner_text('p[role=status]'); time.sleep(1)
        check('stranger sees the same neutral message, no mail', 'link is on its way' in msg_stranger and not re.search('verify', ''.join(out)))
        pg.fill('input[name=email]', 'Raquel@Example.com'); pg.click('button[type=submit]'); pg.wait_for_selector('p[role=status]')
        link = link_for(1); check('allowed address got a link', bool(link))
        pg.goto(link); check('link opens a confirm page, not a session', 'Continue to sign in' in pg.inner_text('main'))
        pg.goto(B + '/admin'); check('opening the link alone did not sign in', pg.url.endswith('/admin/login'))
        pg.goto(link); pg.click('button[type=submit]'); pg.wait_for_url('**/admin'); check('confirm signs in', 'Dashboard' in pg.inner_text('h1'))
        pg.screenshot(path=f'{SHOTS}/dashboard.png', full_page=True)
        ctx2 = b.new_context(); p2 = ctx2.new_page(); p2.set_default_timeout(60000); p2.goto(link); p2.click('button[type=submit]'); p2.wait_for_selector('p[role=alert]')
        check('link cannot be reused', 'expired or was already used' in p2.inner_text('p[role=alert]')); ctx2.close()

        pg.goto(B + '/admin/events'); check('placeholder event is listed as draft', 'placeholder' in pg.inner_text('main') and 'draft' in pg.inner_text('main'))
        pg.click('text=First ticketed event (placeholder)'); pg.wait_for_url('**/admin/events/*')
        ev_url = pg.url
        pg.click('button:has-text("Publish")'); pg.wait_for_selector('p[role=alert]')
        check('placeholder cannot be published', 'Not ready to publish' in pg.inner_text('p[role=alert]'), pg.inner_text('p[role=alert]')[:80])
        pg.screenshot(path=f'{SHOTS}/event-draft.png', full_page=True)
        pg.fill('input[name=title]', 'Sunset Showcase 2027'); pg.fill('input[name=slug]', 'sunset-showcase-2027')
        pg.fill('input[name=startsAt]', '2027-03-05T19:30'); pg.fill('input[name=venue]', 'The Venue')
        pg.click('button:has-text("Save details")'); pg.wait_for_selector('p[role=status]:has-text("Saved")')
        check('event details saved', True)
        pg.locator('input[name=price]').first.fill('abc'); pg.locator('input[name=enabled]').first.check()
        pg.locator('button:has-text("Save")').nth(1).click()
        try: pg.wait_for_selector('p[role=alert]:has-text("amount")', timeout=15000); ok = True
        except Exception: ok = False
        check('bad price rejected', ok)
        check('failed save keeps what was typed', pg.locator('input[name=price]').first.input_value() == 'abc' and pg.locator('input[name=enabled]').first.is_checked(), (pg.locator('input[name=price]').first.input_value(), pg.locator('input[name=enabled]').first.is_checked()))
        pg.locator('input[name=price]').first.fill('35'); pg.locator('input[name=capacity]').first.fill('120')
        pg.locator('button:has-text("Save")').nth(1).click(); pg.wait_for_selector('p[role=status]:has-text("Saved")'); pg.wait_for_timeout(800); check('ticket type saved and on', 'on sale' in pg.inner_text('main'), pg.locator('h3').all_inner_texts())
        pg.click('button:has-text("Publish")')
        try: pg.wait_for_selector('.adm-badge--published', timeout=15000); ok = True
        except Exception: ok = False
        check('event published', ok, pg.locator('p[role=alert]').all_inner_texts())
        pg.reload(); check('values persist after reload', pg.input_value('input[name=price]') == '35' and pg.input_value('input[name=capacity]') == '120')
        pg.screenshot(path=f'{SHOTS}/event-published.png', full_page=True)
        pg.goto(B + '/admin/events'); pg.fill('input[name=title]', 'Second Night'); pg.click('button:has-text("Create draft")'); pg.wait_for_url('**/admin/events/*')
        check('new event created and opened', 'Second Night' in pg.inner_text('h1'))

        pg.goto(B + '/admin/deposits'); pg.locator('input[name=enabled]').first.check(); pg.locator('button:has-text("Save")').first.click(); pg.wait_for_selector('p[role=alert]')
        check('deposit cannot be on without an amount', 'amount' in pg.inner_text('p[role=alert]').lower())
        pg.locator('input[name=amount]').first.fill('250'); pg.locator('button:has-text("Save")').first.click(); pg.wait_for_selector('p[role=status]:has-text("Saved")')
        pg.reload(); check('deposit amount + on persisted', pg.locator('input[name=amount]').first.input_value() == '250' and pg.locator('input[name=enabled]').first.is_checked())
        pg.screenshot(path=f'{SHOTS}/deposits.png', full_page=True)
        pg.goto(B + '/admin'); check('dashboard counts update', '1/3' in pg.inner_text('main'))

        pg.click('button:has-text("Sign out")'); pg.wait_for_url('**/admin/login'); pg.goto(B + '/admin/deposits'); check('signed out: panel redirects to login', pg.url.endswith('/admin/login'))
        r = pg.request.get(B + '/admin/login'); check('admin headers: noindex + no-store', 'noindex' in r.headers.get('x-robots-tag', '') and 'no-store' in r.headers.get('cache-control', ''))
        b.close()
finally:
    srv.terminate()
print('FAILS:', fails); sys.exit(1 if fails else 0)
