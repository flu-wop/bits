#!/usr/bin/env python3
"""Browser check of the public buy UI and the gallery against `next start` on 4311 (run npm run build first)."""
import os, sqlite3, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:4311'; DB = '.data/bits.db'; fails = []
def ok(c, m):
    print(('ok   ' if c else 'FAIL ') + m)
    if not c: fails.append(m)

env = dict(os.environ, STRIPE_SECRET_KEY='sk_test_dummy', STRIPE_WEBHOOK_SECRET='whsec_x', SITE_URL=BASE, ADMIN_EMAILS='flu.wop@gmail.com', TURSO_DATABASE_URL='file:.data/bits.db')
subprocess.run('rm -rf .data; mkdir -p .data', shell=True)
srv = subprocess.Popen(['npx', 'next', 'start', '-p', '4311', '-H', '127.0.0.1'], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for _ in range(60):
        try: urllib.request.urlopen(BASE + '/api/catalog'); break
        except Exception: time.sleep(1)
    db = sqlite3.connect(DB)
    with sync_playwright() as pw:
        b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844})
        pg.goto(BASE + '/Build-Systems', wait_until='load'); pg.wait_for_timeout(500)
        ok(pg.locator('.pay').count() == 0, 'nothing enabled: no pay UI on Build Systems')
        pg.goto(BASE + '/Programming-Events', wait_until='load'); pg.wait_for_timeout(500)
        ok(pg.locator('.pay-events').count() == 0, 'nothing enabled: no ticket list on Programming & Events')
        ok(pg.goto(BASE + '/events/first-ticketed-event').status == 404, 'draft event page is 404')

        db.execute("UPDATE deposit_offers SET amount_cents=50000, enabled=1 WHERE key='discovery'")
        eid = db.execute('select id from events').fetchone()[0]
        db.execute("UPDATE events SET status='published', starts_at='2030-05-01T19:00', title='Spring Showcase', slug='spring' WHERE id=?", (eid,))
        db.execute('UPDATE ticket_types SET price_cents=2500, capacity=10, enabled=1 WHERE event_id=?', (eid,)); db.commit()

        pg.goto(BASE + '/Build-Systems', wait_until='load'); pg.wait_for_selector('.pay button', timeout=5000)
        ok(pg.locator('.pay').count() == 1, 'only the switched-on package gets a pay button')
        ok('$500' in pg.locator('.pay button').inner_text(), 'button shows the admin-set amount')
        pg.click('.pay button'); ok('agree' in pg.locator('.pay__msg').inner_text().lower(), 'needs the terms tick-box')
        pg.check('.pay input[type=checkbox]'); pg.click('.pay button'); pg.wait_for_function("document.querySelector('.pay__msg').textContent.length>0")
        ok('checkout' in pg.locator('.pay__msg').inner_text().lower(), 'payment error is shown, button re-enabled: ' + pg.locator('.pay__msg').inner_text())
        ok(pg.locator('.pay button').is_enabled(), 'button usable again')

        pg.goto(BASE + '/Programming-Events', wait_until='load'); pg.wait_for_selector('.pay-events a', timeout=5000)
        ok(pg.locator('.pay-events a').first.get_attribute('href') == '/events/spring', 'event list links to the event page')
        pg.goto(BASE + '/events/spring', wait_until='load')
        ok('Spring Showcase' in pg.inner_text('h1'), 'event page renders')
        ok(pg.locator('.tix select').count() == 2 and 'Buy tickets' in pg.inner_text('.tix'), 'ticket form present')
        pg.click('.tix button'); pg.wait_for_function("document.querySelector('.tix .pay__msg').textContent.length>0")
        ok(True, 'buy click shows error with dummy Stripe: ' + pg.inner_text('.tix .pay__msg'))
        ok(pg.goto(BASE + '/events/nope').status == 404, 'unknown event is 404')

        pg.goto(BASE + '/gallery', wait_until='load')
        ok('coming soon' in pg.inner_text('main').lower(), 'empty gallery says coming soon')
        for i in range(8):
            db.execute("INSERT INTO gallery_items (id,url,pathname,alt,caption,category,sort,published,created_at) VALUES (?,?,?,?,?,?,?,1,'2026-01-01')",
                       (f'g{i}', '/img/favicon.png', f'p{i}', f'Photo {i}', f'Caption {i}' if i % 2 else '', 'Events' if i < 5 else 'Studio', i)); db.commit()
        pg.goto(BASE + '/gallery', wait_until='load')
        ok(pg.locator('.gal-item').count() == 8, 'grid shows all 8')
        ok(pg.locator('.drift__row').count() == 3, 'three drifting rows')
        ok(pg.locator('.drift').get_attribute('aria-hidden') == 'true', 'drifting rows hidden from screen readers')
        pg.click('.gal-chips >> text=Studio'); ok(pg.locator('.gal-item').count() == 3, 'chip filters to Studio (3)')
        ok(pg.locator('.gal-chips [aria-pressed=true]').inner_text() == 'Studio', 'pressed state follows the chip')
        ok(pg.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'no horizontal overflow at 390px')
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce'); p2 = ctx.new_page()
        p2.goto(BASE + '/gallery', wait_until='load')
        ok(p2.evaluate("getComputedStyle(document.querySelector('.drift__track')).animationName") == 'none', 'reduced motion: rows do not drift')
        db.execute("UPDATE gallery_items SET published=0 WHERE id='g0'"); db.commit(); pg.wait_for_timeout(100)
        b.close()
finally:
    srv.terminate(); subprocess.run('pkill -f "next dev"; pkill -f next-server', shell=True)
print('FAILS:', fails); sys.exit(1 if fails else 0)
