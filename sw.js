/* MiniRP — PWA de nova geração. Arquivos centrais rede-primeiro; recursos cache-primeiro. */
const CACHE='minirp-reinicio-001';
const CORE=['./','./index.html','./style.css','./game.js','./world.js','./asset-sizes.json','./manifest.webmanifest','./icon-192.png','./icon-512.png','./assets/asphalt.webp','./assets/pavement.webp','./assets/concrete.webp','./assets/grass.webp','./assets/stone.webp'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 const url=new URL(req.url),isCore=CORE.some(f=>new URL(f,self.registration.scope).pathname===url.pathname);
 if(isCore){event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{if(res.ok){const clone=res.clone();caches.open(CACHE).then(c=>c.put(req,clone)).catch(()=>{})}return res}).catch(()=>caches.match(req)));return}
 event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{if(res.ok){const clone=res.clone();caches.open(CACHE).then(c=>c.put(req,clone)).catch(()=>{})}return res})))
});
