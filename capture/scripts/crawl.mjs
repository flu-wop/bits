import { chromium } from 'playwright-core';
import fs from 'fs'; import path from 'path';
const OUT='/home/user/bits/capture';
const ORIGIN='https://breaksinthesimulation.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const slugOf=u=>{const p=new URL(u).pathname.replace(/^\/|\/$/g,'');return p?p.replace(/[^a-zA-Z0-9_-]+/g,'-'):'home'};
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await browser.newContext({userAgent:UA,viewport:{width:1440,height:900}});
const page=await ctx.newPage();
const resources=new Map(); // url -> {type,status,ctype}
page.on('response',async r=>{try{const u=r.url();resources.set(u,{status:r.status(),ctype:r.headers()['content-type']||'',rtype:r.request().resourceType()})}catch{}});
const extract=()=>{
  const out={runs:[],styles:[]};
  const blockTags=new Set(['DIV','P','H1','H2','H3','H4','H5','H6','LI','UL','OL','SECTION','ARTICLE','HEADER','FOOTER','NAV','BODY','BR','FIGURE','TABLE','TR']);
  const vis=el=>{const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0)return false;const r=el.getBoundingClientRect();return r.width>0||r.height>0};
  const hex=c=>{const m=c.match(/[\d.]+/g).map(Number);return '#'+m.slice(0,3).map(x=>Math.round(x).toString(16).padStart(2,'0')).join('')+(m[3]!==undefined&&m[3]<1?` (a=${m[3]})`:'')};
  const lines=[];let cur=null;
  const flush=()=>{if(cur&&cur.runs.length)lines.push(cur);cur=null};
  const start=el=>{flush();cur={tag:el.tagName.toLowerCase(),cls:el.className&&el.className.toString().slice(0,80),runs:[]}};
  const walk=(node,ctxEl)=>{
    if(node.nodeType===3){const t=node.nodeValue.replace(/\s+/g,' ');if(!t.trim())return;const p=node.parentElement;if(!p||!vis(p))return;
      if(['SCRIPT','STYLE','NOSCRIPT'].includes(p.tagName))return;
      const s=getComputedStyle(p);if(!cur)start(ctxEl||p);
      const a=p.closest('a');
      cur.runs.push({text:t,color:hex(s.color),href:a?a.href:undefined,font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,ls:s.letterSpacing,lh:s.lineHeight,tt:s.textTransform,bg:hex(s.backgroundColor)});
      return}
    if(node.nodeType!==1)return;const el=node;
    if(['SCRIPT','STYLE','NOSCRIPT','svg','HEAD'].includes(el.tagName))return;
    if(!vis(el)&&el.tagName!=='BODY')return;
    if(el.tagName==='IMG'){flush();lines.push({tag:'img',src:el.currentSrc||el.src,alt:el.alt,w:el.naturalWidth,h:el.naturalHeight,href:el.closest('a')?.href});return}
    const block=blockTags.has(el.tagName)||getComputedStyle(el).display==='block'||getComputedStyle(el).display==='flex';
    if(block)start(el);
    for(const c of el.childNodes)walk(c,el);
    if(block)flush();
  };
  walk(document.body);flush();
  return lines;
};
const linksFn=()=>[...document.querySelectorAll('a[href]')].map(a=>({label:(a.innerText||a.getAttribute('aria-label')||a.querySelector('img')?.alt||'').trim(),href:a.href,raw:a.getAttribute('href'),target:a.target||'',rel:a.rel||'',hasImg:!!a.querySelector('img')}));
const typoFn=()=>{
  const seen=new Map();
  for(const el of document.querySelectorAll('body *')){
    if(![...el.childNodes].some(n=>n.nodeType===3&&n.nodeValue.trim()))continue;
    const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden')continue;
    const k=[s.fontFamily,s.fontSize,s.fontWeight,s.letterSpacing,s.lineHeight,s.color,s.textTransform].join('|');
    if(!seen.has(k))seen.set(k,{tag:el.tagName.toLowerCase(),cls:el.className?.toString().slice(0,60),sample:el.innerText.trim().slice(0,50),fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,fontStyle:s.fontStyle,letterSpacing:s.letterSpacing,lineHeight:s.lineHeight,color:s.color,textTransform:s.textTransform,count:0});
    seen.get(k).count++;
  }
  return [...seen.values()];
};
const queue=[ORIGIN+'/'];const visited=new Map();const graph={};const pageData={};
const norm=u=>{const x=new URL(u);x.hash='';return x.origin+(x.pathname.replace(/\/$/,'')||'/')+x.search};
async function load(u){
  const resp=await page.goto(u,{waitUntil:'networkidle',timeout:45000});
  await page.waitForTimeout(1500);
  // scroll to trigger lazy
  await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,120))}window.scrollTo(0,0)});
  await page.waitForTimeout(800);
  return resp;
}
while(queue.length){
  const u=norm(queue.shift());if(visited.has(u))continue;
  const slug=slugOf(u);const dir=path.join(OUT,slug);fs.mkdirSync(dir,{recursive:true});
  console.log('GET',u);
  let resp;try{resp=await load(u)}catch(e){console.log('ERR',u,e.message);visited.set(u,{error:e.message});continue}
  const status=resp?.status();visited.set(u,{slug,status,finalUrl:page.url()});
  fs.writeFileSync(path.join(dir,'rendered.html'),await page.content());
  const lines=await page.evaluate(extract);
  const links=await page.evaluate(linksFn);
  const typo=await page.evaluate(typoFn);
  const title=await page.title();
  const imgs=await page.evaluate(()=>[...document.images].map(i=>({src:i.currentSrc||i.src,alt:i.alt,w:i.naturalWidth,h:i.naturalHeight,dataSrc:i.dataset.src||null})));
  const bgs=await page.evaluate(()=>{const o=[];for(const el of document.querySelectorAll('*')){const b=getComputedStyle(el).backgroundImage;if(b&&b!=='none')o.push({tag:el.tagName,cls:el.className?.toString().slice(0,60),bg:b,size:getComputedStyle(el).backgroundSize,color:getComputedStyle(el).backgroundColor})}return o});
  const bodyBg=await page.evaluate(()=>({body:getComputedStyle(document.body).backgroundColor,html:getComputedStyle(document.documentElement).backgroundColor,bodyImg:getComputedStyle(document.body).backgroundImage}));
  const L=links.map(l=>{let internal=false;try{internal=new URL(l.href).origin===ORIGIN}catch{};return {label:l.label,href:l.href,raw:l.raw,type:l.href.startsWith('mailto:')||l.href.startsWith('tel:')?'contact':internal?'internal':'external',newTab:l.target==='_blank',hasImage:l.hasImg}});
  fs.writeFileSync(path.join(dir,'links.json'),JSON.stringify(L,null,2));
  pageData[slug]={url:u,title,status,lines,typo,imgs,bgs,bodyBg};
  fs.writeFileSync(path.join(dir,'raw.json'),JSON.stringify(pageData[slug],null,2));
  await page.screenshot({path:path.join(dir,'desktop.png'),fullPage:true});
  graph[slug]=L.filter(l=>l.type==='internal').map(l=>norm(l.href));
  for(const l of L)if(l.type==='internal'){const n=norm(l.href);if(!visited.has(n)&&!/\.(png|jpe?g|gif|pdf|zip|mp4|webp)$/i.test(n))queue.push(n)}
  await sleep(1500);
}
fs.writeFileSync(path.join(OUT,'_visited.json'),JSON.stringify([...visited],null,2));
fs.writeFileSync(path.join(OUT,'_graph.json'),JSON.stringify(graph,null,2));
fs.writeFileSync(path.join(OUT,'_resources.json'),JSON.stringify([...resources],null,2));
// mobile pass
const mctx=await browser.newContext({userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const mp=await mctx.newPage();
for(const [u,v] of visited){if(!v.slug)continue;
  console.log('MOBILE',u);
  await mp.goto(u,{waitUntil:'networkidle',timeout:45000});await mp.waitForTimeout(1500);
  await mp.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,120))}window.scrollTo(0,0)});
  await mp.waitForTimeout(600);
  await mp.screenshot({path:path.join(OUT,v.slug,'mobile.png'),fullPage:true});
  const lines=await mp.evaluate(extract);
  fs.writeFileSync(path.join(OUT,v.slug,'raw-mobile.json'),JSON.stringify(lines,null,2));
  await sleep(1500);
}
await browser.close();
