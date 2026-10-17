// verifies: warp class on click, total < 600ms animation budget, skippable, off for reduced motion, works without JS
import { chromium } from '/tmp/claude-0/-home-user-bits/980858ce-3b8d-59d4-a72a-13d56e33e7ea/scratchpad/pw/node_modules/playwright-core/index.mjs';
const base = process.argv[2] || 'http://localhost:4173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const out = {};
async function run(name, opts, fn) { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ...opts }); const p = await ctx.newPage(); out[name] = await fn(p); await ctx.close(); }
// 1. normal motion: click -> is-warping -> navigates after ~320ms -> is-arriving then cleared
await run('motion', {}, async p => {
  await p.goto(base + '/'); const t0 = Date.now();
  await Promise.all([p.waitForURL('**/Programming-Events', { timeout: 3000 }), p.click('.tiles a[href="/Programming-Events"]')]);
  const leaveMs = Date.now() - t0; const arriving = await p.evaluate(() => document.documentElement.classList.contains('is-arriving'));
  await p.waitForTimeout(450); const cleared = await p.evaluate(() => !document.documentElement.classList.contains('is-arriving'));
  const anim = await p.evaluate(() => getComputedStyle(document.querySelector('.warp')).animationDuration);
  return { leaveMs, arrivingOnLoad: arriving, arrivingCleared: cleared, warpAnimDurationAfter: anim, budgetMs: 260 + 220 };
});
// 2. skip: key press during warp navigates immediately
await run('skip', {}, async p => {
  await p.goto(base + '/'); const t0 = Date.now();
  await p.click('.tiles a[href="/Creative-Services"]', { noWaitAfter: true }); await p.waitForTimeout(40); await p.keyboard.press('Space');
  await p.waitForURL('**/Creative-Services', { timeout: 3000 }); return { skippedAfterMs: Date.now() - t0 };
});
// 3. reduced motion: no class, instant nav, animations off
await run('reduced', { reducedMotion: 'reduce' }, async p => {
  await p.goto(base + '/'); const t0 = Date.now(); let warped = false;
  await p.click('.tiles a[href="/Show-Your-Support"]', { noWaitAfter: true });
  try { warped = await p.evaluate(() => document.documentElement.classList.contains('is-warping')); } catch (e) { warped = false; /* already navigated: no warp */ }
  await p.waitForURL('**/Show-Your-Support', { timeout: 3000 });
  const anims = await p.evaluate(() => ({ crt: getComputedStyle(document.querySelector('.crt')).animationName, floor: getComputedStyle(document.querySelector('.corridor__floor'), '::before').animationName, warp: getComputedStyle(document.querySelector('.warp')).display }));
  return { warpedClass: warped, navMs: Date.now() - t0, anims };
});
// 4. no JS: plain links work, nav visible
await run('nojs', { javaScriptEnabled: false }, async p => {
  await p.goto(base + '/'); const navVisible = await p.isVisible('#site-nav');
  await p.click('.tiles a[href="/Wellness-Resources"]'); await p.waitForURL('**/Wellness-Resources'); return { navVisible, reached: p.url() };
});
await b.close(); console.log(JSON.stringify(out, null, 1));
