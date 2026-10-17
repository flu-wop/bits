// screenshots of every page at 390 and 1440 + overflow / tap-target / tiny-text report
import { chromium } from '/tmp/claude-0/-home-user-bits/980858ce-3b8d-59d4-a72a-13d56e33e7ea/scratchpad/pw/node_modules/playwright-core/index.mjs';
import fs from 'fs';
const base = process.argv[2] || 'http://localhost:4173'; const out = process.argv[3] || '/tmp/shots';
fs.mkdirSync(out, { recursive: true });
const pages = ['', 'about-us', 'Programming-Events', 'MMNT-2-MMNT', 'Sunset-Showcase', 'Creative-Services', 'Release-Rollout', 'playlists', 'Special-Inquiries', 'Wellness-Resources', 'Rewire-with-Rocky', 'Show-Your-Support', 'merch'];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const report = [];
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage();
  for (const p of pages) {
    await page.goto(`${base}/${p}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const de = document.documentElement; const small = [];
      for (const a of document.querySelectorAll('a,button')) { const s = a.getBoundingClientRect(); const cs = getComputedStyle(a);
        if (s.width && s.height && cs.visibility !== 'hidden' && (s.height < 44 || s.width < 44) && !(a.classList.contains('inline-link')) ) small.push((a.innerText || a.getAttribute('aria-label') || a.className).trim().slice(0, 30) + ` ${Math.round(s.width)}x${Math.round(s.height)}`); }
      return { overflowX: de.scrollWidth - de.clientWidth, small };
    });
    report.push({ w, page: p || 'home', ...r });
    await page.screenshot({ path: `${out}/${p || 'home'}-${w}.png`, fullPage: true });
  }
  await ctx.close();
}
await b.close(); fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
for (const r of report) if (r.overflowX > 0 || r.small.length) console.log(r.w, r.page, 'overflowX', r.overflowX, r.small);
console.log('done', report.length);
