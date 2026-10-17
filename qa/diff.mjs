// Phase 3.1: (a) every string in content.json appears in the built page, (b) no rendered text exists that is not in content.json
// usage: node qa/diff.mjs http://localhost:4173
import { chromium } from '/tmp/claude-0/-home-user-bits/980858ce-3b8d-59d4-a72a-13d56e33e7ea/scratchpad/pw/node_modules/playwright-core/index.mjs';
import fs from 'fs';
const base = process.argv[2] || 'http://localhost:4173';
const C = JSON.parse(fs.readFileSync('source/content.json', 'utf8'));
const chrome = JSON.parse(fs.readFileSync('qa/chrome-labels.json', 'utf8')).labels;
const stripIcons = s => s.replace(/[\uE000-\uF8FF\uFE0E]/g, ''); // icon-font glyphs (Instagram/Spotify) are icons, not words
const norm = s => stripIcons(s).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const strings = b => { const o = [];
  for (const k of ['text', 'title', 'meta', 'description']) if (b[k] && !b.icon) o.push(b[k]);
  for (const r of b.runs || []) o.push(r.text);
  if (b.cta) o.push(b.cta.text); return o.map(norm).filter(Boolean); };
const corpus = []; const perPage = {};
for (const p of C.pages) { perPage[p.slug] = p.blocks.flatMap(strings); corpus.push(...perPage[p.slug]); }
for (const n of C.site.nav) corpus.push(norm(n.text)); corpus.push(norm(C.site.title));
const corpusJoined = corpus.join(' ¦ ');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: process.argv[3] !== 'nojs' }); const page = await ctx.newPage();
let missing = 0, extra = 0;
for (const p of C.pages) {
  await page.goto(`${base}${p.path}`, { waitUntil: 'networkidle' });
  // open the mobile-only menu state is irrelevant: nav text is checked through the corpus (nav labels)
  const raw = await page.evaluate(() => document.body.innerText);
  const text = norm(raw.replace(/\n/g, ' '));
  for (const s of perPage[p.slug]) if (!text.includes(s)) { console.log('MISSING', p.slug, JSON.stringify(s.slice(0, 70))); missing++; }
  for (const line of raw.split('\n').map(norm).filter(Boolean)) {
    if (chrome.includes(line)) continue;
    // a rendered line may be a fragment of a corpus string (wrapping across <br>, links) -> substring test on the corpus
    if (!corpusJoined.includes(line)) { console.log('EXTRA  ', p.slug, JSON.stringify(line.slice(0, 80))); extra++; }
  }
}
await b.close();
console.log(`pages=${C.pages.length} missing=${missing} extra=${extra}`);
process.exit(missing || extra ? 1 : 0);
