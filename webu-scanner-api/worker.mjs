// WEBU standalone public HTML audit. Deploy as a standalone workers.dev Worker,
// with no private-network, origin, VPC, database or service bindings.
const ORIGINS=new Set(['https://www.webu.sk','https://webu.sk']);
const MAX_BYTES=750000, MAX_REDIRECTS=4;
function reply(origin,status,data){
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin',...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}:{})}});
}
export function publicUrl(raw,selfHost=''){
  if(typeof raw!=='string'||raw.length>500)throw Error('Neplatná adresa.');
  const u=new URL(raw.includes('://')?raw:'https://'+raw);
  const host=u.hostname.toLowerCase().replace(/\.$/,'');
  if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.port||u.search||u.hash||!host.includes('.')||!/[a-z]/.test(host.split('.').pop())||!/^([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]+$/.test(host)||/\.(localhost|local|internal|lan|home|test|invalid|example|onion|arpa)$/i.test(host)||host===selfHost||host.endsWith('.workers.dev')||host==='scanner-api.webu.sk')throw Error('Povolené sú iba verejné HTTP(S) adresy bez parametrov, portov a prihlasovacích údajov.');
  return u;
}
async function fetchPublic(initial,selfHost){
  let url=initial,redirects=0;
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000),start=performance.now();
  try{
    while(true){
      const response=await fetch(url.href,{redirect:'manual',signal:ctrl.signal,headers:{'User-Agent':'WEBUScanner/1.0 (+https://www.webu.sk/)','Accept':'text/html,application/xhtml+xml;q=0.9'}});
      if([301,302,303,307,308].includes(response.status)){
        const dest=response.headers.get('location');await response.body?.cancel();
        if(!dest||redirects++>=MAX_REDIRECTS)throw Error('Presmerovanie sa nepodarilo overiť.');
        url=publicUrl(new URL(dest,url).href,selfHost);continue;
      }
      const responseMs=Math.round(performance.now()-start);
      const headers=Object.fromEntries(['content-type','strict-transport-security','content-security-policy','x-content-type-options','x-frame-options','x-robots-tag'].map(k=>[k,response.headers.get(k)||'']));
      if(!response.ok||!/^text\/html\b/i.test(headers['content-type'])){
        await response.body?.cancel();return {url:url.href,status:response.status,responseMs,headers,redirects,html:null,bytes:0};
      }
      const reader=response.body.getReader();let size=0,parts=[];
      try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES)throw Error('Stránka prekročila limit 750 kB HTML.');parts.push(value)}}finally{await reader.cancel().catch(()=>{})}
      const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength}
      return {url:url.href,status:response.status,responseMs,headers,redirects,html:bytes,bytes:size};
    }
  }finally{clearTimeout(timer)}
}
async function inspect(page){
  const findings=[],metrics=[];
  const add=(label,value)=>metrics.push({label,value:String(value)});
  const note=(level,text)=>findings.push({level,text});
  add('HTTP stav',page.status);add('HTTPS',page.url.startsWith('https:')?'Áno':'Nie');add('Odozva servera',page.responseMs+' ms');add('Presmerovania',page.redirects);
  if(!page.url.startsWith('https:'))note('issue','Konečná adresa nepoužíva HTTPS.');
  if(!page.html){note('info','HTML nebolo možné analyzovať (HTTP stav alebo typ obsahu).');return {metrics,findings}}
  const d={title:'',description:'',viewport:'',lang:'',canonical:'',robots:'',h1:0,images:0,missingAlt:0,inputs:0,labels:new Set(),inputIds:[],legal:new Set(),mixed:0};
  const legalPattern=/gdpr|privacy|ochrana.osobn|sukrom|súkrom|cookies?|obchodn.{0,3}podmien|odst.penie|vr.tenie.tovaru|reklam|dispute|withdrawal|terms|datenschutz/i;
  const handler=new HTMLRewriter()
    .on('html',{element(e){d.lang=e.getAttribute('lang')||''}})
    .on('title',{text(t){if(d.title.length<300)d.title+=t.text}})
    .on('meta',{element(e){let n=(e.getAttribute('name')||'').toLowerCase(),v=e.getAttribute('content')||'';if(n==='description')d.description=v;if(n==='viewport')d.viewport=v;if(n==='robots')d.robots=v}})
    .on('link',{element(e){if((e.getAttribute('rel')||'').toLowerCase().split(/\s+/).includes('canonical'))d.canonical=e.getAttribute('href')||''}})
    .on('h1',{element(){d.h1++}})
    .on('img',{element(e){d.images++;if(e.getAttribute('alt')===null)d.missingAlt++;if((e.getAttribute('src')||'').startsWith('http:'))d.mixed++}})
    .on('script[src], iframe[src], link[href]',{element(e){if((e.getAttribute('src')||e.getAttribute('href')||'').startsWith('http:'))d.mixed++}})
    .on('label[for]',{element(e){d.labels.add(e.getAttribute('for'))}})
    .on('input, textarea, select',{element(e){const t=(e.getAttribute('type')||'').toLowerCase();if(['hidden','button','submit','reset','image'].includes(t))return;d.inputs++}})
    .on('a[href]',{element(e){const h=e.getAttribute('href')||'';if(h.includes('ec.europa.eu/consumers/odr'))d.legal.add('Zistený odkaz na bývalú platformu ODR.');if(legalPattern.test(h))d.legal.add('Nájdený odkaz s právnou témou: '+h.slice(0,170))}});
  await handler.transform(new Response(page.html,{headers:{'Content-Type':page.headers['content-type']}})).arrayBuffer();
  add('HTML veľkosť',Math.round(page.bytes/1024)+' kB');add('SEO titulok',d.title.trim()?'Prítomný':'Chýba');add('Meta popis',d.description.trim()?'Prítomný':'Chýba');add('H1 nadpisy',d.h1);add('Mobilný viewport',d.viewport?'Prítomný':'Chýba');add('Obrázky bez alt',d.missingAlt+' / '+d.images);add('Jazyk stránky',d.lang||'Chýba');add('Canonical',d.canonical?'Prítomný':'Nenájdený');
  if(!d.title.trim())note('issue','Doplňte titulok stránky.');else note('info','Titulok: '+d.title.trim().slice(0,180));
  if(!d.description.trim())note('issue','Doplňte meta popis.');
  if(!d.h1)note('review','Skontrolujte hlavný nadpis H1.');
  if(!d.viewport)note('issue','Chýba nastavenie mobilného viewportu. Samotný viewport nepotvrdzuje responzivitu.');
  if(d.missingAlt)note('issue','Počet obrázkov bez atribútu alt: '+d.missingAlt+'. Dekoratívne obrázky môžu mať prázdny alt.');
  if(!d.lang)note('issue','Chýba jazyk dokumentu (lang).');
  if(!d.canonical)note('review','Canonical odkaz nebol nájdený; posúďte potrebu podľa typu stránky.');
  if(/noindex/i.test(d.robots+' '+page.headers['x-robots-tag']))note('review','Zistená smernica noindex. Overte, či je zámerná.');
  if(page.url.startsWith('https:')&&d.mixed)note('review','Nájdené HTTP adresy zdrojov v HTML: '+d.mixed+'. Skontrolujte zmiešaný obsah.');
  if(!page.headers['content-security-policy'])note('review','HTTP hlavička Content-Security-Policy nebola nájdená; skontrolujte zabezpečenie.');
  if(page.url.startsWith('https:')&&!page.headers['strict-transport-security'])note('review','Hlavička HSTS nebola nájdená; posúďte vhodnosť jej nasadenia.');
  for(const f of [...d.legal].slice(0,8))note('review',f);
  note('info','Právne odkazy sú orientačné; neprítomnosť odkazu nepotvrdzuje porušenie zákona. Cookies, zmluvný proces, úplná prístupnosť, Lighthouse a mobilné vykreslenie neboli merané.');
  return {metrics,findings};
}
export default {async fetch(req,env){
  const origin=req.headers.get('origin')||'',selfHost=new URL(req.url).hostname;
  if(!ORIGINS.has(origin))return reply(origin,403,{error:'Nepovolený pôvod požiadavky.'});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}});
  if(req.method!=='POST'||new URL(req.url).pathname!=='/scan')return reply(origin,405,{error:'Použite POST /scan.'});
  if(!env.PER_IP||!env.GLOBAL)return reply(origin,503,{error:'Skener nie je nakonfigurovaný.'});
  const ip=req.headers.get('CF-Connecting-IP');if(!ip)return reply(origin,403,{error:'Neoverený klient.'});
  if(!(await env.PER_IP.limit({key:ip})).success||!(await env.GLOBAL.limit({key:'webu-public'})).success)return reply(origin,429,{error:'Limit meraní bol dosiahnutý. Skúste neskôr.'});
  if(!/^application\/json\b/i.test(req.headers.get('content-type')||''))return reply(origin,415,{error:'Neplatný formát.'});
  try{
    const reader=req.body?.getReader();if(!reader)return reply(origin,400,{error:'Chýba adresa.'});
    let n=0,body='';const decoder=new TextDecoder();
    try{while(true){const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>2048)throw Error('Príliš dlhá požiadavka.');body+=decoder.decode(value,{stream:true})}body+=decoder.decode()}finally{await reader.cancel().catch(()=>{})}
    const url=publicUrl(JSON.parse(body).url,selfHost);
    const page=await fetchPublic(url,selfHost),result=await inspect(page);
    return reply(origin,200,{version:1,url:page.url,checkedAt:new Date().toISOString(),scope:'server-html',...result});
  }catch(e){return reply(origin,422,{error:e.name==='AbortError'?'Časový limit načítania stránky.':'Stránku sa nepodarilo bezpečne načítať alebo spracovať.'})}
}};
