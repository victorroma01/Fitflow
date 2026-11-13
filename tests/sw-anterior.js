/* (tests) El service worker de hasta la V1.0.2, tal cual se publicó: tests/deploy.py (from_previous) instala la app con él y
   publica encima una versión con el de ahora, para comprobar que un móvil que viene de aquel se actualiza bien. No forma parte de
   la app. Lo de abajo no se toca. */
/* StrataFit · arranque instantáneo: abre al momento la última copia guardada y busca actualizaciones en segundo plano.
   build.py completa la lista de precarga con el código (js/…, nombres que cambian con cada versión) y las fotos (img/…).
   Un documento solo entra en la caché con todo su código ya guardado, también al instalarse (I-08): así la app abre igual sin
   conexión. El código sale siempre de la caché, sin volver a pedirlo (I-09); el documento, las fotos y los iconos se revalidan. */
const C='ff-app-2',PRE=['./','index.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png','icon-dark-192.png'/*@@FILES@@*/];
const abs=u=>new URL(u,self.registration.scope).href;
const DOCS=['./','index.html'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{
  const c=await caches.open(C);
  /* primero todo menos el documento: el código, imprescindible; una foto o un icono que falle se guardará al pedirlo */
  await Promise.all(PRE.filter(u=>!DOCS.includes(u)).map(async u=>{
    try{const r=await fetch(new Request(u,{cache:'reload'}));if(r.ok&&!r.redirected){await c.put(abs(u),r);return}}catch(_){}
    if(/^js\//.test(u))throw new Error(u);
  }));
  /* el documento, solo con todo su código ya guardado (putDoc, como al actualizar). Si falta algo, la instalación falla y el
     navegador la reintenta en la próxima apertura con red: nunca queda guardada una página a la que le falta código (I-08) */
  for(const u of DOCS){const r=await fetch(new Request(u,{cache:'reload'}));if(!r.ok||r.redirected||!(await putDoc(c,abs(u),r)))throw new Error(u)}
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
  /* el código (js/…): su nombre cambia con cada versión, así que lo guardado nunca está viejo y sale de la caché sin volver a
     pedirlo; si no está, de la red, y se guarda (I-09) */
  if(/\/js\/[^/]+\.js$/.test(u.pathname)){
    e.respondWith((async()=>{
      const c=await caches.open(C),hit=await c.match(r,{ignoreSearch:true,ignoreVary:true});
      if(hit)return hit;
      const n=await fetch(r);
      if(n&&n.ok&&n.type==='basic'&&!n.redirected)await c.put(r.url,n.clone());
      return n;
    })());
    return;
  }
  /* lo demás (el documento, las fotos, los iconos): la copia guardada al momento (si la hay) y, mientras, la de la red, que actualiza la caché y avisa si el documento cambió.
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
