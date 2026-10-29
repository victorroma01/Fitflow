/* StrataFit · uso sin conexión: primero red (siempre revalidada), y si falla, la última versión guardada */
const C='ff-app-1';
self.addEventListener('install',()=>{self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==C)await caches.delete(k);await self.clients.claim()})())});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin!==self.location.origin)return;
  e.respondWith((async()=>{
    const c=await caches.open(C);
    const hit=await c.match(r,{ignoreSearch:true,ignoreVary:true});
    const net=fetch(r.url,{cache:'no-cache',credentials:'same-origin'}).then(n=>{if(n&&n.ok&&n.type==='basic')c.put(r.url,n.clone());return n});
    if(!hit)return net;
    net.catch(()=>{});
    return Promise.race([net,new Promise((_,rej)=>setTimeout(rej,3500))]).catch(()=>hit);
  })());
});
