import { chromium } from 'playwright-core';
import fs from 'fs';
const OUT='/home/user/bits/capture';
const pages=['','about-us','Programming-Events','MMNT-2-MMNT','Sunset-Showcase','Creative-Services','Release-Rollout','playlists','Special-Inquiries','Wellness-Resources','Rewire-with-Rocky','Show-Your-Support','merch'];
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await browser.newContext({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',viewport:{width:1440,height:900}});
const page=await ctx.newPage();let reqs=[];
page.on('response',r=>{const t=r.request().resourceType();if(['image','font','media'].includes(t))reqs.push({url:r.url(),type:t,status:r.status(),ctype:r.headers()['content-type'],len:r.headers()['content-length']})});
const res={};
for(const p of pages){reqs=[];await page.goto('https://breaksinthesimulation.com/'+p,{waitUntil:'networkidle'});await page.waitForTimeout(1500);
 const info=await page.evaluate(()=>{const ff=[];for(const ss of document.styleSheets){let rules;try{rules=ss.cssRules}catch{continue}for(const r of rules)if(r.type===5)ff.push(r.cssText)}
  const b=document.querySelector('.backdrop');
  return {fontFaces:ff,fonts:[...document.fonts].map(f=>({family:f.family,weight:f.weight,style:f.style,status:f.status})),backdrop:b?{type:b.dataset.backdrop,html:b.innerHTML.slice(0,1500)}:null,favicon:[...document.querySelectorAll('link[rel*=icon]')].map(l=>l.href),og:[...document.querySelectorAll('meta[property^="og:"],meta[name^="twitter:"]')].map(m=>[m.getAttribute('property')||m.name,m.content]),htmlStyle:document.documentElement.getAttribute('style'),cssvars:null}});
 res[p||'home']={reqs,...info};console.log(p||'home',reqs.length);await new Promise(r=>setTimeout(r,1500));}
fs.writeFileSync(OUT+'/_pass2.json',JSON.stringify(res,null,1));await browser.close();
