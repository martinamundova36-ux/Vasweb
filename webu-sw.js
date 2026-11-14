/* WEBU public-site PWA only. No private portals, forms or authenticated requests are cached. */
const CACHE='webu-public-pwa-v1';
const PRECACHE=['/','/index.html','/index-en.html','/offline.html','/favicon-192.png','/favicon-512.png','/webu-app.js'];
const EXCLUDED=/^\/(?:student-house-portal|android-studenthouse|supabase|ukazky)(?:\/|$)/i;
const PUBLIC_ASSET=/^\/(?:favicon-(?:192|512)\.png|webu-app\.js|offline\.html)$/i;
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(PRECACHE.map(path=>cache.add(path)))));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('webu-public-pwa-')&&key!==CACHE).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin||EXCLUDED.test(url.pathname)||req.headers.has('authorization'))return;
  if(req.mode==='navigate'){
    if(!(/\/$|\.html$/i.test(url.pathname)))return;
    event.respondWith((async()=>{
      try{
        const response=await fetch(req);
        if(response.ok&&response.type==='basic'&&(response.headers.get('content-type')||'').includes('text/html')){
          const cache=await caches.open(CACHE);
          await cache.put(req,response.clone());
        }
        return response;
      }catch(err){
        return (await caches.match(req))||(await caches.match('/offline.html'))||Response.error();
      }
    })());
    return;
  }
  if(PUBLIC_ASSET.test(url.pathname)){
    event.respondWith((async()=>{
      try{
        const response=await fetch(req);
        if(response.ok&&response.type==='basic'){
          const cache=await caches.open(CACHE);
          await cache.put(req,response.clone());
        }
        return response;
      }catch(err){
        return (await caches.match(req))||Response.error();
      }
    })());
  }
});
