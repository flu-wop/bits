// Phase 3.2: every href and asset path. Local -> must be 200. External -> status reported; sandbox-blocked hosts reported separately.
// usage: node qa/links.mjs http://localhost:4173
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
import { chromium } from '/tmp/claude-0/-home-user-bits/980858ce-3b8d-59d4-a72a-13d56e33e7ea/scratchpad/pw/node_modules/playwright-core/index.mjs';
const base = process.argv[2] || 'http://localhost:4173';
const pages = ['/', ...fs.readdirSync('.').filter(f => f.endsWith('.html') && f !== 'index.html').map(f => '/' + f.replace('.html', ''))];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const page = await (await b.newContext()).newPage();
const local = new Map(), external = new Map();
const add = (u, from) => { if (!u) return; if (/^(mailto:|tel:|data:|#|javascript:)/.test(u)) { if (u.startsWith('mailto:')) external.set(u, [...(external.get(u) || []), from]); return; }
  const abs = new URL(u, base + from).href; const m = abs.startsWith(base) ? local : external; m.set(abs, [...(m.get(abs) || []), from]); };
for (const p of pages) {
  await page.goto(base + p, { waitUntil: 'networkidle' });
  const refs = await page.evaluate(() => { const o = [];
    document.querySelectorAll('a[href]').forEach(a => o.push(a.getAttribute('href')));
    document.querySelectorAll('img[src]').forEach(i => o.push(i.getAttribute('src')));
    document.querySelectorAll('img[srcset]').forEach(i => i.srcset.split(',').forEach(x => o.push(x.trim().split(/\s+/)[0])));
    document.querySelectorAll('link[href],script[src],meta[property="og:image"]').forEach(l => o.push(l.getAttribute('href') || l.getAttribute('src') || l.getAttribute('content')));
    return o; });
  refs.forEach(r => add(r, p));
}
await b.close();
// css url() refs
for (const f of fs.readdirSync('css')) for (const m of fs.readFileSync('css/' + f, 'utf8').matchAll(/url\("?([^")]+)"?\)/g)) add(m[1], '/css/' + f);
const rows = []; let bad = 0;
for (const [u, from] of local) { const r = await fetch(u); const ok = r.status === 200; if (!ok) bad++; rows.push({ url: u.replace(base, ''), status: r.status, ok, from: [...new Set(from)].slice(0, 3) }); }
for (const [u, from] of external) {
  if (u.startsWith('mailto:')) { rows.push({ url: u, status: 'mailto', ok: true, from: [...new Set(from)].slice(0, 2) }); continue; }
  let status; try { // curl honours the sandbox egress proxy (Node fetch does not)
    const o = execFileSync('curl', ['-sS', '-o', '/dev/null', '-w', '%{http_code}', '-L', '-m', '20', '-A', 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130 Safari/537.36', u], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    status = +o; if (!status) status = 'no response'; } catch (e) { status = 'blocked/err: ' + String(e.stderr || e.message).trim().split('\n').pop().slice(0, 70); }
  rows.push({ url: u.slice(0, 110), status, ok: typeof status === 'number' && status < 400, from: [...new Set(from)].slice(0, 2) }); await new Promise(r => setTimeout(r, 800));
}
fs.writeFileSync('qa/links-report.json', JSON.stringify(rows, null, 1));
for (const r of rows.filter(r => !r.ok)) console.log('NOT OK', r.status, r.url, r.from.join(','));
console.log(`local refs: ${local.size} (bad ${bad}); external refs: ${external.size}; ok total ${rows.filter(r => r.ok).length}/${rows.length}`);
process.exit(bad ? 1 : 0);
