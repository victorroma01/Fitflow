/* StrataFit · arranque instantáneo: abre al momento la última copia guardada y busca actualizaciones en segundo plano.
   build.py completa la lista de precarga con el código (js/…, nombres que cambian con cada versión) y las fotos (img/…).
   Un documento nuevo solo entra en la caché con todo su código ya guardado: así la app abre igual sin conexión. */
const C='ff-app-2',PRE=['./','index.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png','js/chunk-GJGUGWPM.js','js/chunk-ZPCVGVP4.js','js/csv-FC2PQ4L3.js','js/foods-online-H5ODNP5H.js','js/main-5FHU33TT.js','js/wod-7KCDYAPA.js','img/day/pecho.jpg','img/day/espalda.jpg','img/day/hombros.jpg','img/day/piernas.jpg','img/day/brazos.jpg','img/day/torso.jpg','img/day/legs.jpg','img/day/descanso.jpg','img/day/crossfit.jpg','img/day/hyrox.jpg','img/day/cardio.jpg','img/day/core.jpg','img/day/funcional.jpg','img/ex/remo-mancuerna.webp','img/ex/curl-predicador.webp','img/ex/extension-triceps-polea.webp','img/ex/remo-polea-baja.webp','img/ex/extension-cuadriceps.webp','img/ex/curl-femoral-tumbado.webp','img/ex/gemelo-de-pie.webp','img/ex/face-pull.webp','img/ex/pajaros-mancuernas.webp','img/ex/hip-thrust.webp','img/ex/aperturas-polea.webp','img/ex/elevaciones-laterales.webp','img/ex/jalon-al-pecho.webp','img/ex/peso-muerto-rumano.webp','img/ex/fondos.webp','img/ex/curl-martillo.webp','img/ex/zancadas.webp','img/ex/press-banca-mancuernas.webp','img/ex/peso-muerto-sumo.webp','img/ex/sentadilla-bulgara.webp','img/ex/pullover-polea.webp','img/ex/curl-mancuernas.webp','img/ex/copa-triceps.webp','img/ex/pullover-mancuerna.webp','img/ex/encogimientos.webp','img/ex/curl-inclinado.webp','img/ex/extension-tras-nuca.webp','img/ex/gemelo-sentado.webp'];
const abs=u=>new URL(u,self.registration.scope).href;
self.addEventListener('install',e=>{e.waitUntil((async()=>{
  const c=await caches.open(C);
  await Promise.all(PRE.map(async u=>{try{const r=await fetch(new Request(u,{cache:'reload'}));if(r.ok&&!r.redirected)await c.put(abs(u),r)}catch(_){}}));
  self.skipWaiting()
})())});
/* al activarse: fuera las cachés antiguas y el código de versiones anteriores (js/… que ya no está en la lista) */
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k!==C)await caches.delete(k);
  const c=await caches.open(C),keep=new Set(PRE.map(abs));
  for(const r of await c.keys())if(/\/js\/[^/]+\.js$/.test(new URL(r.url).pathname)&&!keep.has(r.url))await c.delete(r);
  await self.clients.claim()
})())});
const same=async(a,b)=>{const[x,y]=await Promise.all([a.arrayBuffer(),b.arrayBuffer()]);if(x.byteLength!==y.byteLength)return false;const p=new Uint8Array(x),q=new Uint8Array(y);for(let i=0;i<p.length;i++)if(p[i]!==q[i])return false;return true};
const tell=async()=>{for(const w of await self.clients.matchAll({type:'window'}))w.postMessage({t:'upd'})};
/* código que usa un documento: los js/… que nombra y, dentro de cada uno, los ./….js que importa (también los que carga al usarlos) */
const code=async(c,doc)=>{
  const todo=[...new Set((doc.match(/js\/[\w.-]+\.js/g)||[]).map(abs))],seen=new Set();
  while(todo.length){
    const u=todo.pop();if(seen.has(u))continue;seen.add(u);
    let r=await c.match(u);
    if(!r){r=await fetch(u,{cache:'no-cache',credentials:'same-origin'});if(!r.ok||r.redirected)throw new Error(u);await c.put(u,r.clone())}
    for(const m of(await r.text()).match(/\.\/[\w.-]+\.js/g)||[])todo.push(new URL(m,u).href);
  }
};
/* guarda un documento después de su código; si falta algo, no lo guarda (se reintentará) y devuelve false */
const putDoc=async(c,key,n)=>{try{await code(c,await n.clone().text());await c.put(key,n);return true}catch(_){return false}};
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
  /* «Actualizar»: ?fresh=… pide la versión de la red y la guarda en la caché (con su código), sin el parámetro */
  if(u.searchParams.has('fresh')){
    changedAt=0;
    e.respondWith((async()=>{
      const c=await caches.open(C),key=new URL(u.href);key.searchParams.delete('fresh');
      try{const n=await fetch(u.href,{cache:'no-store',credentials:'same-origin'});if(n&&n.ok&&n.type==='basic'&&!n.redirected)await putDoc(c,key.href,n.clone());return n}
      catch(_){return(await c.match(key.href,{ignoreSearch:true}))||Response.error()}
    })());
    return;
  }
  /* la copia guardada al momento (si la hay) y, mientras, la de la red, que actualiza la caché y avisa si el documento cambió.
     respondWith y waitUntil se llaman ya, durante el evento (WebKit no admite waitUntil más tarde) */
  const work=(async()=>{
    const c=await caches.open(C);
    const hit=await c.match(r,{ignoreSearch:true,ignoreVary:true});
    const old=hit?hit.clone():null;
    const net=fetch(r.url,{cache:'no-cache',credentials:'same-origin'}).then(async n=>{
      if(!(n&&n.ok&&n.type==='basic'))return n;
      if(n.redirected)return r.mode==='navigate'?Response.redirect(n.url,302):n;
      if(!isDoc(u)){await c.put(r.url,n.clone());return n}
      let changed=false;
      if(old){try{changed=!(await same(old,n.clone()))}catch(_){}}
      if((changed||!old)&&!(await putDoc(c,r.url,n.clone())))return n;
      if(!changed&&old)await c.put(r.url,n.clone());
      if(changed){changedAt=Date.now();await tell();}
      return n;
    });
    return{hit,net};
  })();
  e.respondWith(work.then(w=>w.hit||w.net));
  e.waitUntil(work.then(w=>w.net).catch(()=>{}));
});
