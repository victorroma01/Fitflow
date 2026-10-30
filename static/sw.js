/* StrataFit · arranque instantáneo: abre al momento la última copia guardada y busca actualizaciones en segundo plano.
   build.py completa la lista de precarga con las fotos (marcador IMG). */
const C='ff-app-2',PRE=['./','index.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'/*@@IMG@@*/];
self.addEventListener('install',e=>{e.waitUntil((async()=>{
  const c=await caches.open(C);
  await Promise.all(PRE.map(async u=>{try{const r=await fetch(new Request(u,{cache:'reload'}));if(r.ok&&!r.redirected)await c.put(new URL(u,self.registration.scope).href,r)}catch(_){}}));
  self.skipWaiting()
})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==C)await caches.delete(k);await self.clients.claim()})())});
const same=async(a,b)=>{const[x,y]=await Promise.all([a.arrayBuffer(),b.arrayBuffer()]);if(x.byteLength!==y.byteLength)return false;const p=new Uint8Array(x),q=new Uint8Array(y);for(let i=0;i<p.length;i++)if(p[i]!==q[i])return false;return true};
const tell=async()=>{for(const w of await self.clients.matchAll({type:'window'}))w.postMessage({t:'upd'})};
/* si la versión nueva se detecta antes de que la página termine de abrirse, el aviso se perdería: la página pregunta al arrancar */
let changedAt=0;
self.addEventListener('message',e=>{if(e.data&&e.data.t==='ask'&&changedAt&&Date.now()-changedAt<120000&&e.source)e.source.postMessage({t:'upd'})});
const isDoc=u=>/\/(index\.html)?$/.test(u.pathname);
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin!==self.location.origin)return;
  /* version.json: siempre de la red (la app lo usa para saber si hay versión nueva) */
  if(/\/version\.json$/.test(u.pathname))return;
  /* «Actualizar»: ?fresh=… pide la versión de la red y la guarda en la caché, sin el parámetro */
  if(u.searchParams.has('fresh')){
    changedAt=0;
    e.respondWith((async()=>{
      const c=await caches.open(C),key=new URL(u.href);key.searchParams.delete('fresh');
      try{const n=await fetch(u.href,{cache:'no-store',credentials:'same-origin'});if(n&&n.ok&&n.type==='basic'&&!n.redirected)await c.put(key.href,n.clone());return n}
      catch(_){return(await c.match(key.href,{ignoreSearch:true}))||Response.error()}
    })());
    return;
  }
  e.respondWith((async()=>{
    const c=await caches.open(C);
    const hit=await c.match(r,{ignoreSearch:true,ignoreVary:true});
    const old=hit?hit.clone():null;
    const net=fetch(r.url,{cache:'no-cache',credentials:'same-origin'}).then(async n=>{
      if(!(n&&n.ok&&n.type==='basic'))return n;
      if(n.redirected)return r.mode==='navigate'?Response.redirect(n.url,302):n;
      let changed=false;
      if(old&&isDoc(u)){try{changed=!(await same(old,n.clone()))}catch(_){}}
      await c.put(r.url,n.clone());
      if(changed){changedAt=Date.now();await tell();}
      return n;
    });
    if(hit){e.waitUntil(net.catch(()=>{}));return hit}
    return net;
  })());
});
