/* StrataFit · arranque instantáneo: abre al momento la última copia guardada y busca actualizaciones en segundo plano */
const C='ff-app-2',PRE=['./','index.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png','img/day/pecho.jpg','img/day/espalda.jpg','img/day/hombros.jpg','img/day/piernas.jpg','img/day/brazos.jpg','img/day/torso.jpg','img/day/legs.jpg','img/day/descanso.jpg','img/day/crossfit.jpg','img/day/hyrox.jpg','img/day/cardio.jpg','img/day/core.jpg','img/day/funcional.jpg','img/ex/remo-mancuerna.webp','img/ex/curl-predicador.webp','img/ex/extension-triceps-polea.webp','img/ex/remo-polea-baja.webp','img/ex/extension-cuadriceps.webp','img/ex/curl-femoral-tumbado.webp','img/ex/gemelo-de-pie.webp','img/ex/face-pull.webp','img/ex/pajaros-mancuernas.webp','img/ex/hip-thrust.webp','img/ex/aperturas-polea.webp','img/ex/elevaciones-laterales.webp','img/ex/jalon-al-pecho.webp','img/ex/peso-muerto-rumano.webp','img/ex/fondos.webp','img/ex/curl-martillo.webp','img/ex/zancadas.webp','img/ex/press-banca-mancuernas.webp','img/ex/peso-muerto-sumo.webp','img/ex/sentadilla-bulgara.webp','img/ex/pullover-polea.webp','img/ex/curl-mancuernas.webp','img/ex/copa-triceps.webp','img/ex/pullover-mancuerna.webp','img/ex/encogimientos.webp','img/ex/curl-inclinado.webp','img/ex/extension-tras-nuca.webp','img/ex/gemelo-sentado.webp'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{
  const c=await caches.open(C);
  await Promise.all(PRE.map(async u=>{try{const r=await fetch(new Request(u,{cache:'reload'}));if(r.ok&&!r.redirected)await c.put(new URL(u,self.registration.scope).href,r)}catch(_){}}));
  self.skipWaiting()
})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==C)await caches.delete(k);await self.clients.claim()})())});
const same=async(a,b)=>{const[x,y]=await Promise.all([a.arrayBuffer(),b.arrayBuffer()]);if(x.byteLength!==y.byteLength)return false;const p=new Uint8Array(x),q=new Uint8Array(y);for(let i=0;i<p.length;i++)if(p[i]!==q[i])return false;return true};
const tell=async()=>{for(const w of await self.clients.matchAll({type:'window'}))w.postMessage({t:'upd'})};
const isDoc=u=>/\/(index\.html)?$/.test(u.pathname);
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin!==self.location.origin)return;
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
      if(changed)await tell();
      return n;
    });
    if(hit){e.waitUntil(net.catch(()=>{}));return hit}
    return net;
  })());
});
