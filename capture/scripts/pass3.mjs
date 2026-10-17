import { chromium } from 'playwright-core';
import fs from 'fs';
const OUT='/home/user/bits/capture';
const pages=['','about-us','Programming-Events','MMNT-2-MMNT','Sunset-Showcase','Creative-Services','Release-Rollout','playlists','Special-Inquiries','Wellness-Resources','Rewire-with-Rocky','Show-Your-Support','merch'];
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await browser.newContext({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',viewport:{width:1440,height:900}});
const page=await ctx.newPage();
const extract=()=>{
  const hex=c=>{const m=c.match(/[\d.]+/g).map(Number);return '#'+m.slice(0,3).map(x=>Math.round(x).toString(16).padStart(2,'0')).join('')+(m.length>3&&m[3]<1?`@${m[3]}`:'')};
  const vis=el=>{const s=getComputedStyle(el);return !(s.display==='none'||s.visibility==='hidden'||+s.opacity===0)};
  const BLOCK=new Set(['DIV','P','H1','H2','H3','H4','H5','H6','LI','UL','OL','SECTION','HEADER','FOOTER','NAV','TABLE','TR','HR']);
  const root=[...document.querySelectorAll('bodycopy')].find(b=>b.getBoundingClientRect().height>0&&!b.closest('[id*=template]'))||document.body;
  const lines=[];let cur=null;
  const newLine=blk=>({block:blk,runs:[]});
  const endLine=()=>{if(cur){lines.push(cur);cur=null}};
  const walk=(n,blk)=>{
    if(n.nodeType===3){
      let t=n.nodeValue.replace(/[ \t\r\n\f]+/g,' ');if(!t)return;const p=n.parentElement;if(!vis(p))return;
      if(!t.replace(/ /g,'')&&!cur)return;
      const s=getComputedStyle(p);const a=p.closest('a');
      if(!cur)cur=newLine(blk);
      const run={text:t,color:hex(s.color),font:s.fontFamily.split(',')[0].replace(/"/g,''),size:s.fontSize,weight:s.fontWeight,style:s.fontStyle,ls:s.letterSpacing,lh:s.lineHeight,tt:s.textTransform,va:s.verticalAlign,deco:s.textDecorationLine,bg:hex(s.backgroundColor)};
      if(a){run.href=a.getAttribute('href');run.hrefAbs=a.href;run.newTab=a.target==='_blank'}
      const last=cur.runs[cur.runs.length-1];
      const key=r=>JSON.stringify({...r,text:0});
      if(last&&key(last)===key(run))last.text+=t;else cur.runs.push(run);
      return}
    if(n.nodeType!==1)return;const el=n;
    if(['SCRIPT','STYLE','NOSCRIPT','SVG','svg','HEAD','TEMPLATE'].includes(el.tagName))return;
    if(!vis(el))return;
    if(el.tagName==='BR'){if(!cur)cur=newLine(blk);cur.br=true;endLine();return}
    if(el.tagName==='IMG'){endLine();lines.push({block:'img',img:{src:el.getAttribute('src'),abs:el.currentSrc||el.src,w:el.getAttribute('width'),h:el.getAttribute('height'),alt:el.alt,href:el.closest('a')?.getAttribute('href')||null,natural:[el.naturalWidth,el.naturalHeight],rendered:[Math.round(el.getBoundingClientRect().width),Math.round(el.getBoundingClientRect().height)]}});return}
    const isBlock=BLOCK.has(el.tagName);
    const b=isBlock?el.tagName.toLowerCase():blk;
    if(isBlock)endLine();
    for(const c of el.childNodes)walk(c,b);
    if(isBlock)endLine();
  };
  walk(root,'div');endLine();
  // trim edge spaces per line; keep blank markers
  for(const l of lines){if(l.runs){while(l.runs.length&&l.runs[0].text.replace(/ /g,'')===''&&l.runs.length>1)l.runs.shift();if(l.runs.length){l.runs[0].text=l.runs[0].text.replace(/^ +/,'');const e=l.runs[l.runs.length-1];e.text=e.text.replace(/ +$/,'')}l.runs=l.runs.filter(r=>r.text!=='')}}
  return lines;
};
const typo=()=>{const m=new Map();const hex=c=>{const x=c.match(/[\d.]+/g).map(Number);return '#'+x.slice(0,3).map(v=>Math.round(v).toString(16).padStart(2,'0')).join('')};
 const root=[...document.querySelectorAll('bodycopy')].find(b=>b.getBoundingClientRect().height>0)||document.body;
 const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
 while(n=w.nextNode()){if(!n.nodeValue.trim())continue;const p=n.parentElement;const s=getComputedStyle(p);if(s.display==='none'||s.visibility==='hidden')continue;
  const k=[s.fontFamily,s.fontSize,s.fontWeight,s.fontStyle,s.letterSpacing,s.lineHeight,hex(s.color),s.textTransform,s.verticalAlign].join('|');
  if(!m.has(k))m.set(k,{sample:n.nodeValue.trim().slice(0,40),tag:p.tagName.toLowerCase(),inLink:!!p.closest('a'),fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,fontStyle:s.fontStyle,letterSpacing:s.letterSpacing,lineHeight:s.lineHeight,color:hex(s.color),textTransform:s.textTransform,count:0});m.get(k).count++}
 const bc=getComputedStyle(root);const cs=getComputedStyle(root.closest('.content')||root);
 return {styles:[...m.values()],container:{width:Math.round(root.getBoundingClientRect().width),padding:cs.padding,textAlign:bc.textAlign,maxWidth:cs.maxWidth,fontSize:bc.fontSize,lineHeight:bc.lineHeight,color:bc.color},body:{bg:getComputedStyle(document.body).backgroundColor,html:getComputedStyle(document.documentElement).backgroundColor}}};
const res={};
for(const p of pages){await page.setViewportSize({width:1440,height:900});await page.goto('https://breaksinthesimulation.com/'+p,{waitUntil:'networkidle'});await page.waitForTimeout(1500);
 const d={desktop:{lines:await page.evaluate(extract),...await page.evaluate(typo)}};
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1200);
 d.mobile={lines:await page.evaluate(extract),...await page.evaluate(typo)};
 res[p||'home']=d;console.log(p||'home');await new Promise(r=>setTimeout(r,1500));}
fs.writeFileSync(OUT+'/_pass3.json',JSON.stringify(res,null,1));await browser.close();
