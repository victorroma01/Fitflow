/* ═══ extras/measures ═══
   Medidas corporales y fotos de progreso.
   Define: MSK, PHA, MPS, PHC, PHN, phP, phOpen, phDb, phDo, msShown, phLoad, phPrep, phFull, phAllFull, phOk, phMerge, … (+7)  · acciones/registros: 15
*/
const MSK=[['cu','Cuello'],['ho','Hombros'],['pe','Pecho'],['br','Brazo'],['ci','Cintura'],['ca','Cadera'],['mu','Muslo'],['ge','Gemelo']];
const PHA={f:'Frente',s:'Lado',b:'Espalda'};
let MPS={tab:0,ang:'f',k:'ci',cmp:0,sel:[]};
let PHC=[],PHN=0,phP=null;
const phOpen=()=>new Promise((res,rej)=>{try{if(!window.indexedDB)return rej('no');const r=indexedDB.open('ffph',1);
 r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('m'))db.createObjectStore('m',{keyPath:'id'});if(!db.objectStoreNames.contains('f'))db.createObjectStore('f',{keyPath:'id'})};
 r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error||'err');r.onblocked=()=>rej('blk')}catch(e){rej(e)}});
const phDb=()=>phP||(phP=phOpen().catch(e=>{phP=null;throw e}));
const phDo=(st,mode,fn)=>phDb().then(db=>new Promise((res,rej)=>{let tx;try{tx=db.transaction(st,mode)}catch(e){rej(e);return}let rq;
 tx.oncomplete=()=>res(rq&&'result' in rq?rq.result:undefined);tx.onerror=()=>rej(tx.error||'tx');tx.onabort=()=>rej(tx.error||'abort');
 try{rq=fn(tx)}catch(e){try{tx.abort()}catch(_){}rej(e)}}));
const msShown=()=>!!document.querySelector('#sh.full #f2ms');
const phLoad=()=>phDo('m','readonly',tx=>tx.objectStore('m').getAll()).then(a=>{PHC=(a||[]).filter(x=>x&&x.id&&typeof x.t=='string').sort((a,b)=>a.d<b.d?1:a.d>b.d?-1:(a.id<b.id?1:-1));PHN=PHC.length;if(msShown()&&MPS.tab==1&&!MPS.view)fullPage(msUI())}).catch(()=>{});
async function phPrep(f){let bm;
 try{bm=await createImageBitmap(f,{imageOrientation:'from-image'})}catch(e){bm=await new Promise((res,rej)=>{const u=URL.createObjectURL(f),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);res(im)};im.onerror=()=>{URL.revokeObjectURL(u);rej('img')};im.src=u})}
 const W0=bm.width||bm.naturalWidth,H0=bm.height||bm.naturalHeight;if(!W0||!H0)throw 'dim';
 const enc=(mx,q)=>{const k=Math.min(1,mx/Math.max(W0,H0)),w=Math.max(1,Math.round(W0*k)),h=Math.max(1,Math.round(H0*k)),c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,w,h);g.drawImage(bm,0,0,w,h);return c.toDataURL('image/jpeg',q)};
 const r={u:enc(960,.72),t:enc(300,.65)};if(bm.close)bm.close();return r}
C.f2ph=async e=>{const f=e.files&&e.files[0];e.value='';if(!f)return;
 if(PHN>=60){zt('Límite de 60 fotos: borra alguna antes');return}
 zt('Guardando foto…');
 try{const r=await phPrep(f),id=f2id(),d=dk(new Date),a=MPS.ang;
  await phDo(['m','f'],'readwrite',tx=>{tx.objectStore('m').put({id,d,a,t:r.t});tx.objectStore('f').put({id,u:r.u})});
  try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(_){}
  await phLoad();f2Ach();if(msShown())fullPage(msUI());zt('Foto guardada')}
 catch(x){zt('No se pudo guardar la foto en este dispositivo')}};
const phFull=id=>phDo('f','readonly',tx=>tx.objectStore('f').get(id)).then(r=>r&&r.u);
const phAllFull=async()=>{const[m,f]=await Promise.all([phDo('m','readonly',tx=>tx.objectStore('m').getAll()),phDo('f','readonly',tx=>tx.objectStore('f').getAll())]);const fm={};(f||[]).forEach(x=>{if(x&&x.id)fm[x.id]=x.u});return (m||[]).filter(x=>x&&x.id&&fm[x.id]).map(x=>({id:x.id,d:x.d,a:x.a,t:x.t,u:fm[x.id]}))};
const phOk=p=>p&&typeof p.id=='string'&&p.id.length<=40&&/^[\w-]+$/.test(p.id)&&/^\d{4}-\d{2}-\d{2}$/.test(p.d||'')&&PHA[p.a]&&typeof p.t=='string'&&typeof p.u=='string'&&p.t.length<4e5&&p.u.length<2.5e6&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.t)&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.u);
const phMerge=async arr=>{const L=(Array.isArray(arr)?arr:[]).filter(phOk).slice(0,80);if(!L.length)return 0;
 await phDo(['m','f'],'readwrite',tx=>{L.forEach(p=>{tx.objectStore('m').put({id:p.id,d:p.d,a:p.a,t:p.t});tx.objectStore('f').put({id:p.id,u:p.u})})});await phLoad();return L.length};
function msList(){return (Array.isArray(S.ms)?S.ms:[]).filter(m=>m&&typeof m.d=='string'&&m.v&&typeof m.v=='object')}
function msDelta(k){const L=msList().filter(m=>+m.v[k]>0);if(!L.length)return null;const a=L[L.length-1],b=L[L.length-2];return{v:+a.v[k],d:a.d,p:b?+b.v[k]:null,pd:b?b.d:null}}
function msChart(k){const nm=(MSK.find(x=>x[0]==k)||[0,''])[1],pts=msList().filter(m=>+m.v[k]>0).map(m=>({d:m.d,y:+m.v[k]}));
 if(pts.length<2)return '<p class="mu" style="font-size:13px;margin:8px 2px">Con dos mediciones de «'+nm+'» verás aquí su evolución.</p>';
 const w=300,h=120,px=14,py=18,ys=pts.map(p=>p.y),lo=Math.min(...ys),hi=Math.max(...ys),sp=Math.max(1,hi-lo),
 xx=i=>px+i*(w-2*px)/(pts.length-1),yy=y=>h-py-(y-lo)/sp*(h-2*py),
 d=pts.map((p,i)=>(i?'L':'M')+xx(i).toFixed(1)+' '+yy(p.y).toFixed(1)).join(' ');
 return '<svg viewBox="0 0 '+w+' '+h+'" class="f2ch" role="img" aria-label="Evolución de '+nm+'"><path d="'+d+'" fill="none" stroke="var(--a1)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
 +pts.map((p,i)=>'<circle cx="'+xx(i).toFixed(1)+'" cy="'+yy(p.y).toFixed(1)+'" r="'+(i==pts.length-1?4.5:3)+'" fill="'+(i==pts.length-1?'var(--a1)':'var(--bg)')+'" stroke="var(--a1)" stroke-width="2"/>').join('')
 +'<text x="'+px+'" y="'+(h-2)+'" font-size="10" fill="var(--mu)">'+f2d(pts[0].d,{day:'numeric',month:'short'})+'</text><text x="'+(w-px)+'" y="'+(h-2)+'" font-size="10" text-anchor="end" fill="var(--mu)">'+f2d(pts[pts.length-1].d,{day:'numeric',month:'short'})+'</text>'
 +'<text x="'+(w-px)+'" y="11" font-size="11" font-weight="700" text-anchor="end" fill="var(--tx)">'+R1(pts[pts.length-1].y)+' cm</text></svg>'}
function msTab(){const L=msList(),has=MSK.filter(x=>msDelta(x[0]));
 let h='<button class="pr" data-a="msnew" style="width:100%;margin-top:12px">Nueva medición</button>';
 if(!L.length)return h+'<p class="mu" style="margin:14px 2px;font-size:14px">Mide con una cinta métrica, siempre en el mismo punto y a la misma hora. Cada pocas semanas basta para ver cómo cambia tu cuerpo, aunque el peso no se mueva.</p>';
 if(!has.some(x=>x[0]==MPS.k))MPS.k=has[0][0];
 h+='<div style="margin-top:10px">'+has.map(x=>'<button class="chip '+(MPS.k==x[0]?'on':'')+'" data-a="msk" data-v="'+x[0]+'">'+x[1]+'</button>').join('')+'</div><div class="cd" style="margin-top:8px">'+msChart(MPS.k)+'</div>';
 h+='<div class="cd"><div class="row"><b>Última medición</b><small>'+f2d(L[L.length-1].d,{day:'numeric',month:'long'})+'</small></div>'+has.map(x=>{const t=msDelta(x[0]),df=t.p!=null?Math.round((t.v-t.p)*10)/10:null;
  return '<div class="it" style="grid-template-columns:1fr auto auto;gap:12px"><span>'+x[1]+'</span><b>'+R1(t.v)+' cm</b><small style="min-width:52px;text-align:right">'+(df==null?'':df==0?'igual':(df>0?'+':'−')+Math.abs(df))+'</small></div>'}).join('')+'</div>';
 h+='<details class="cd"><summary>Historial ('+L.length+')</summary>'+L.slice().reverse().map((m,i)=>'<div class="it exr" data-a="msdel" data-i="'+(L.length-1-i)+'" style="cursor:pointer"><span><b>'+f2d(m.d,{day:'numeric',month:'long',year:'numeric'})+'</b><br><small>'+MSK.filter(x=>+m.v[x[0]]>0).map(x=>x[1]+' '+R1(+m.v[x[0]])).join(' · ')+'</small></span></div>').join('')+'<p class="mu" style="font-size:12px;margin:8px 0 0">Toca una medición para borrarla.</p></details>';
 return h}
function phTab(){
 let h='<div class="seg" style="margin-top:12px">'+Object.keys(PHA).map(k=>'<button class="'+(MPS.ang==k?'on':'')+'" data-a="pha" data-v="'+k+'">'+PHA[k]+'</button>').join('')+'</div>'
 +'<div class="g2" style="margin-top:10px"><label class="btnl pr" style="margin:0;font-weight:700">'+ic('camera',18)+'&nbsp;Añadir foto<input type="file" accept="image/*" hidden data-c="f2ph"></label><button data-a="phcmp" class="'+(MPS.cmp?'on':'')+'" style="'+(MPS.cmp?'background:var(--a2);color:var(--ft);border-color:var(--a2)':'')+'">'+(MPS.cmp?'Cancelar':'Comparar')+'</button></div>'
 +'<p class="mu" style="font-size:12px;margin:8px 2px">Las fotos se guardan solo en este dispositivo. Entran en la copia de seguridad en archivo, no en la copia como texto.</p>';
 if(MPS.cmp)h+='<div class="cd" style="margin:8px 0;padding:10px;text-align:center">'+(MPS.sel.length==0?'Elige la primera foto':'Elige la segunda foto')+'</div>';
 if(!PHC.length)return h+'<p class="mu" style="margin:14px 2px;font-size:14px">Aún no hay fotos. Haz una cada pocas semanas con la misma luz, distancia y pose.</p>';
 h+='<div class="f2gr">'+PHC.map((p,i)=>'<button class="f2th'+(MPS.sel.indexOf(p.id)>=0?' sl':'')+'" data-a="phv" data-i="'+i+'"><img src="'+p.t+'" alt="'+PHA[p.a]+' '+f2d(p.d)+'" loading="lazy"><span>'+f2d(p.d)+' · '+PHA[p.a]+'</span></button>').join('')+'</div>';
 return h}
function msUI(){MPS.view=0;
 return '<div id="f2ms">'+pgHead('Medidas y fotos')+'<div class="seg" style="grid-template-columns:1fr 1fr"><button class="'+(MPS.tab==0?'on':'')+'" data-a="mstab" data-v="0">Medidas</button><button class="'+(MPS.tab==1?'on':'')+'" data-a="mstab" data-v="1">Fotos</button></div>'+(MPS.tab==0?msTab():phTab())+'<div style="height:30px"></div></div>'}
A.f2ms=()=>{MPS.cmp=0;MPS.sel=[];fullPage(msUI());phLoad()};
A.mstab=(i,b)=>{MPS.tab=+b.dataset.v;MPS.cmp=0;MPS.sel=[];sh(msUI())};
A.msk=(i,b)=>{MPS.k=b.dataset.v;sh(msUI())};
A.pha=(i,b)=>{MPS.ang=b.dataset.v;sh(msUI())};
A.phcmp=()=>{MPS.cmp=MPS.cmp?0:1;MPS.sel=[];sh(msUI())};
A.msb=()=>{sh(msUI())};
A.msnew=()=>{const td=dk(new Date),last={};MSK.forEach(x=>{const t=msDelta(x[0]);if(t)last[x[0]]=t.v});
 sh('<div id="f2ms">'+pgHead('Nueva medición','msb')+'<label>Fecha</label><input id="f2md" type="date" value="'+td+'" max="'+td+'"><p class="mu" style="font-size:13px;margin:10px 2px 0">Rellena solo lo que midas. Valores en centímetros.</p><div class="g2">'
 +MSK.map(x=>'<div><label>'+x[1]+' (cm)</label><input id="f2m_'+x[0]+'" type="number" inputmode="decimal" step="0.1" min="10" max="300" placeholder="'+(last[x[0]]?R1(last[x[0]]):'')+'"></div>').join('')
 +'</div><div style="height:90px"></div><div class="sb"><button class="pr" data-a="mssv" style="width:100%;padding:14px">Guardar medición</button></div></div>')};
A.mssv=()=>{const g=id=>document.getElementById(id),d0=(g('f2md')||{}).value,d=/^\d{4}-\d{2}-\d{2}$/.test(d0||'')&&d0<=dk(new Date)?d0:dk(new Date),v={};
 MSK.forEach(x=>{const e=g('f2m_'+x[0]),n=e?parseFloat(String(e.value).replace(',','.')):NaN;if(n>=10&&n<=300)v[x[0]]=Math.round(n*10)/10});
 if(!Object.keys(v).length){zt('Indica al menos una medida');return}
 const L=msList().filter(m=>m.d!=d),old=msList().find(m=>m.d==d);
 S.ms=L.concat({d,v:Object.assign({},old?old.v:{},v)}).sort((a,b)=>a.d<b.d?-1:1);
 sv();f2Ach();zt('Medición guardada');sh(msUI())};
A.msdel=i=>{const m=msList()[i];if(!m)return;MPS.di=i;zcf('¿Borrar esta medición?',f2d(m.d,{day:'numeric',month:'long',year:'numeric'}),'msdl','Borrar')};
A.msdl=()=>{const m=msList()[MPS.di];if(m){S.ms=msList().filter(x=>x!==m);sv()}MPS.di=-1;sh(msUI())};
A.phv=async(i,b)=>{const p=PHC[i];if(!p)return;
 if(MPS.cmp){const k=MPS.sel.indexOf(p.id);if(k>=0)MPS.sel.splice(k,1);else MPS.sel.push(p.id);
  if(MPS.sel.length==2){phCompare();return}sh(msUI());return}
 MPS.view=1;sh('<div id="f2ms">'+pgHead('Foto','msb')+'<div class="f2pv" id="f2pi"><div class="mu" style="padding:40px 0;text-align:center">Cargando…</div></div><div class="row" style="margin:10px 2px"><b>'+f2d(p.d,{day:'numeric',month:'long',year:'numeric'})+'</b><small>'+PHA[p.a]+'</small></div><div class="g2"><button data-a="phold" data-i="'+i+'">Comparar con la primera</button><button data-a="phdel" data-i="'+i+'" style="color:var(--c)">Borrar</button></div></div>');
 try{const u=await phFull(p.id),e=document.getElementById('f2pi');if(e&&u)e.innerHTML='<img src="'+u+'" alt="'+PHA[p.a]+'">'}catch(x){}};
A.phold=i=>{const p=PHC[i];if(!p)return;const same=PHC.filter(x=>x.a==p.a&&x.id!=p.id).sort((a,b)=>a.d<b.d?-1:1)[0];
 if(!same){zt('No hay otra foto del mismo ángulo');return}MPS.sel=[same.id,p.id];phCompare()};
A.phdel=i=>{const p=PHC[i];if(!p)return;MPS.pi=p.id;zcf('¿Borrar esta foto?',f2d(p.d,{day:'numeric',month:'long',year:'numeric'})+' · '+PHA[p.a],'phdl','Borrar')};
A.phdl=async()=>{const id=MPS.pi;MPS.pi=null;if(!id)return;try{await phDo(['m','f'],'readwrite',tx=>{tx.objectStore('m').delete(id);tx.objectStore('f').delete(id)});await phLoad()}catch(e){zt('No se pudo borrar')}MPS.sel=[];MPS.cmp=0;sh(msUI())};
async function phCompare(){const ps=MPS.sel.map(id=>PHC.find(p=>p.id==id)).filter(Boolean).sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);if(ps.length<2){MPS.sel=[];sh(msUI());return}
 MPS.view=1;const dd=Math.round((new Date(ps[1].d+'T12:00:00')-new Date(ps[0].d+'T12:00:00'))/864e5);
 sh('<div id="f2ms">'+pgHead('Antes y después','msb')+'<div class="f2cm"><div><div class="f2pv" id="f2ca"><div class="mu" style="padding:30px 0;text-align:center">…</div></div><b>'+f2d(ps[0].d,{day:'numeric',month:'short',year:'numeric'})+'</b><small>'+PHA[ps[0].a]+'</small></div><div><div class="f2pv" id="f2cb"><div class="mu" style="padding:30px 0;text-align:center">…</div></div><b>'+f2d(ps[1].d,{day:'numeric',month:'short',year:'numeric'})+'</b><small>'+PHA[ps[1].a]+'</small></div></div><p class="mu" style="text-align:center;margin:12px 0">'+(dd==0?'Mismo día':dd+(dd==1?' día':' días')+' entre las dos fotos')+'</p></div>');
 MPS.cmp=0;MPS.sel=[];
 try{const[a,b]=await Promise.all([phFull(ps[0].id),phFull(ps[1].id)]);const ea=document.getElementById('f2ca'),eb=document.getElementById('f2cb');if(ea&&a)ea.innerHTML='<img src="'+a+'" alt="">';if(eb&&b)eb.innerHTML='<img src="'+b+'" alt="">'}catch(x){}}
