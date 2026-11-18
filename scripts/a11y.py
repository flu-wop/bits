#!/usr/bin/env python3
"""axe-core (WCAG 2.1 A/AA) on every public page plus the buy UI states. Run after `npm run build`."""
import json, os, sqlite3, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:4312'; AXE = open('node_modules/axe-core/axe.min.js').read(); bad = 0
env = dict(os.environ, STRIPE_SECRET_KEY='sk_test_dummy', STRIPE_WEBHOOK_SECRET='whsec_x', SITE_URL=BASE, TURSO_DATABASE_URL='file:.data/bits.db', ADMIN_EMAILS='flu.wop@gmail.com')
subprocess.run('rm -rf .data; mkdir -p .data', shell=True)
srv = subprocess.Popen(['npx', 'next', 'start', '-p', '4312', '-H', '127.0.0.1'], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for _ in range(40):
        try: urllib.request.urlopen(BASE + '/api/catalog'); break
        except Exception: time.sleep(1)
    db = sqlite3.connect('.data/bits.db')
    db.execute("UPDATE deposit_offers SET amount_cents=50000, enabled=1")
    eid = db.execute('select id from events').fetchone()[0]
    db.execute("UPDATE events SET status='published', starts_at='2030-05-01T19:00', title='Spring Showcase', slug='spring', venue='The Hall', description='A night of music.', policy='All sales final.' WHERE id=?", (eid,))
    db.execute('UPDATE ticket_types SET price_cents=2500, capacity=10, enabled=1 WHERE event_id=?', (eid,))
    for i in range(8):
        db.execute("INSERT INTO gallery_items (id,url,pathname,alt,caption,category,sort,published,created_at) VALUES (?,?,?,?,?,?,?,1,'2026-01-01')", (f'g{i}', '/img/favicon.png', f'p{i}', f'Photo {i}', f'Caption {i}', 'Events' if i < 5 else 'Studio', i))
    db.commit()
    paths = json.load(open('content/pages.json'))['pages']
    urls = ['/' if s == 'home' else '/' + s for s in paths] + ['/events/spring', '/gallery']
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        for w, h in [(390, 844), (1440, 900)]:
            pg = b.new_context(viewport={'width': w, 'height': h}).new_page()
            for u in urls:
                pg.goto(BASE + u, wait_until='load'); pg.wait_for_timeout(900)
                if u == '/Build-Systems':
                    pg.wait_for_selector('.pay button', timeout=5000); pg.click('.pay button'); pg.wait_for_timeout(200)
                pg.evaluate("document.documentElement.classList.add('js')"); pg.add_script_tag(content=AXE)
                r = pg.evaluate("axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})")
                v = r['violations']
                if v:
                    bad += 1
                    print('VIOLATIONS', u, w)
                    for x in v: print('  ', x['id'], x['impact'], len(x['nodes']), x['nodes'][0]['target'], '|', x['nodes'][0].get('failureSummary', '')[:160].replace('\n', ' '))
                else: print('ok', u, w)
        b.close()
finally:
    srv.terminate(); subprocess.run('pkill -f next-server; rm -rf .data', shell=True)
print('PAGES WITH VIOLATIONS:', bad); sys.exit(1 if bad else 0)
