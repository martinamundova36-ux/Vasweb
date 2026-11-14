/* WEBU mobile application controls and installation. */
(()=>{'use strict';
if(window.__WEBU_APP_READY__)return;
if(/^\/(?:ukazky|student-house-portal|android-studenthouse|supabase)(?:\/|$)/i.test(location.pathname))return;
window.__WEBU_APP_READY__=true;
const en=(document.documentElement.lang||'sk').toLowerCase().startsWith('en');
const standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
const tr=(sk,enText)=>en?enText:sk;
const href=(slug)=>'/'+slug+(en?'-en':'')+'.html';
const addMeta=(name,content)=>{if(!document.head.querySelector('meta[name="'+name+'"]')){const m=document.createElement('meta');m.name=name;m.content=content;document.head.appendChild(m)}};
if(!document.head.querySelector('link[rel="manifest"]')){const l=document.createElement('link');l.rel='manifest';l.href='/manifest.webmanifest';document.head.appendChild(l)}
addMeta('theme-color','#0b182d');
addMeta('apple-mobile-web-app-capable','yes');
addMeta('apple-mobile-web-app-title','WEBU');
addMeta('apple-mobile-web-app-status-bar-style','black-translucent');
if('serviceWorker' in navigator && location.protocol==='https:'){
  window.addEventListener('load',()=>navigator.serviceWorker.register('/webu-sw.js',{scope:'/'}).catch(err=>console.warn('WEBU PWA service worker:',err)),{once:true});
  if(document.readyState==='complete')navigator.serviceWorker.register('/webu-sw.js',{scope:'/'}).catch(()=>{});
}
const css=document.createElement('style');
css.id='webu-app-styles';
css.textContent='.webu-app-nav{display:none}.webu-install{position:fixed;z-index:1200;bottom:calc(16px + env(safe-area-inset-bottom));left:14px;right:14px;max-width:410px;margin:0 auto;background:#0b182d;color:#fff;border:1px solid #f4c76666;border-radius:18px;padding:16px 42px 16px 18px;box-shadow:0 16px 42px #05102065;font:500 14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif}.webu-install strong{display:block;font-size:16px;margin-bottom:5px}.webu-install p{margin:0 0 12px!important;color:#dce5f4!important;font-size:13px!important}.webu-install button{font:700 13px system-ui;cursor:pointer}.webu-install-action{border:0;background:#f4c766;color:#0b182d;padding:10px 16px;border-radius:12px}.webu-install-close{position:absolute;right:8px;top:7px;border:0;background:transparent;color:#fff;font-size:24px;padding:3px 9px}.webu-app-toast{position:fixed;z-index:1400;bottom:calc(95px + env(safe-area-inset-bottom));left:14px;right:14px;max-width:400px;margin:auto;background:#0b182d;color:white;border-radius:14px;padding:14px;text-align:center;box-shadow:0 6px 25px #0005;font:600 14px system-ui}.webu-is-app .webu-install{display:none}@media(max-width:850px){.webu-is-app body{padding-bottom:calc(72px + env(safe-area-inset-bottom))!important}.webu-is-app .webu-app-nav{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));position:fixed;left:0;right:0;bottom:0;z-index:1100;padding:5px 4px calc(5px + env(safe-area-inset-bottom));background:#0b182d;border-top:1px solid #f4c76655;box-shadow:0 -6px 22px #09132533;min-height:68px}.webu-app-nav a,.webu-app-nav button{display:flex;flex-direction:column;gap:3px;align-items:center;justify-content:center;min-width:0;border:0;background:transparent;color:#cbd8ea;text-decoration:none!important;padding:5px 0!important;border-radius:9px;font:650 10px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;cursor:pointer}.webu-app-nav svg{height:21px;width:21px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.webu-app-nav [aria-current="page"]{color:#f4c766;background:#ffffff12}.webu-app-nav a:focus-visible,.webu-app-nav button:focus-visible{outline:2px solid #f4c766;outline-offset:1px}}';
document.head.appendChild(css);
const icons={
home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
services:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
portfolio:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
journal:'<path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 0-4 0V4Z"/><path d="M4 18h12M9 9h6M9 13h6"/>',
contact:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/>',
share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.5 10.5 7-4m-7 9 7 4"/>'
};
const svg=(key)=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[key]+'</svg>';
const ready=(fn)=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
function toast(message){document.querySelector('.webu-app-toast')?.remove();const el=document.createElement('div');el.className='webu-app-toast';el.setAttribute('role','status');el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),3300)}
async function sharePage(){
  try{
    if(navigator.share){await navigator.share({title:document.title,url:location.href});return}
    if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(location.href);toast(tr('Odkaz skopírovaný ✓','Link copied ✓'));return}
    const box=document.createElement('textarea');box.value=location.href;box.style.position='fixed';box.style.opacity='0';document.body.appendChild(box);box.select();const done=document.execCommand('copy');box.remove();toast(done?tr('Odkaz skopírovaný ✓','Link copied ✓'):location.href);
  }catch(e){if(e.name!=='AbortError')toast(tr('Zdieľanie sa nepodarilo.','Unable to share.'))}
}
function mobileNav(){
  if(!standalone)return;
  document.documentElement.classList.add('webu-is-app');
  const path=location.pathname;
  const items=[
    {name:tr('Domov','Home'),icon:'home',url:en?'/index-en.html':'/',isActive:path==='/'||/^\/index(?:-en)?\.html$/.test(path)},
    {name:tr('Služby','Services'),icon:'services',url:href('sluzby'),isActive:/^\/sluzby(?:-en)?\.html$/.test(path)},
    {name:tr('Portfólio','Portfolio'),icon:'portfolio',url:href('portfolio'),isActive:/^\/portfolio(?:-en)?\.html$/.test(path)},
    {name:'Journal',icon:'journal',url:href('blog'),isActive:/^\/(?:blog|journal)[-/]/.test(path)||/^\/(?:blog|journal)(?:-en)?\.html$/.test(path)},
    {name:tr('Kontakt','Contact'),icon:'contact',url:href('kontakt'),isActive:/^\/kontakt(?:-en)?\.html$/.test(path)}
  ];
  const nav=document.createElement('nav');nav.className='webu-app-nav';nav.setAttribute('aria-label',tr('Navigácia aplikácie WEBU','WEBU app navigation'));
  for(const item of items){
    const link=document.createElement('a');link.href=item.url;
    link.innerHTML=svg(item.icon)+'<span>'+item.name+'</span>';
    if(item.isActive)link.setAttribute('aria-current','page');
    nav.appendChild(link);
  }
  const button=document.createElement('button');button.type='button';button.innerHTML=svg('share')+'<span>'+tr('Zdieľať','Share')+'</span>';button.setAttribute('aria-label',tr('Zdieľať aktuálnu stránku','Share this page'));button.addEventListener('click',sharePage);nav.appendChild(button);
  document.body.appendChild(nav);
}
let pendingInstall=null;
let banner=null;
function installBanner(){
  if(standalone||sessionStorage.getItem('webu-install-dismissed')==='1')return;
  if(!(/^\/(?:index(?:-en)?\.html)?$/.test(location.pathname)))return;
  if(!window.matchMedia('(max-width: 850px)').matches)return;
  banner=document.createElement('div');banner.className='webu-install';banner.setAttribute('role','region');banner.setAttribute('aria-label',tr('Inštalácia WEBU','Install WEBU'));
  const title=document.createElement('strong');title.textContent=tr('WEBU priamo v telefóne','WEBU on your phone');
  const info=document.createElement('p');info.textContent=tr('Pridajte si WEBU na plochu ako aplikáciu.','Add WEBU to your home screen as an app.');
  const action=document.createElement('button');action.type='button';action.className='webu-install-action';action.textContent=tr('Nainštalovať WEBU','Install WEBU');
  action.addEventListener('click',async()=>{
    if(pendingInstall){
      const event=pendingInstall;pendingInstall=null;event.prompt();
      const choice=await event.userChoice.catch(()=>null);
      if(choice?.outcome==='accepted'){banner?.remove();return}
    }
    const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent);
    toast(ios?tr('Safari: Zdieľať → Pridať na plochu','Safari: Share → Add to Home Screen'):tr('Chrome: menu ⋮ → Pridať na plochu','Chrome: menu ⋮ → Add to Home screen'));
  });
  const close=document.createElement('button');close.className='webu-install-close';close.type='button';close.setAttribute('aria-label',tr('Zavrieť','Close'));close.textContent='×';close.addEventListener('click',()=>{sessionStorage.setItem('webu-install-dismissed','1');banner.remove()});
  banner.append(title,info,action,close);document.body.appendChild(banner);
}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pendingInstall=event});
window.addEventListener('appinstalled',()=>{banner?.remove();pendingInstall=null});
ready(()=>{mobileNav();installBanner()});
})();
