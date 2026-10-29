/* ═══ routines/builder ═══
   Mis workouts: lista, editor de bloques y lanzamiento.
   Define: CR, BL, crRows, crList, crEd, crPk, cr0, crRowsL, CRL, crr, CRS, CRI, OVS, crday, pbr  · acciones/registros: 22
*/
let CR={i:-1,k:1,sel:[],q:''};
const BL=['','Suelto','Superserie','Triserie'];
const crRows=()=>{const q=CR.q.toLowerCase().trim(),bq=exAll().filter(e=>!q||exHay(e).includes(q)),base=bq.filter(e=>grOk(CR.gs,e));return eqRow(grDD('crg',CR.gs,bq),eqDD('cr',CR.eq,eqOf(base),base,1))+base.filter(e=>eqOk(CR.eq,e)).sort(exSort).slice(0,100).map(e=>'<div class="it exr" data-a="bp" data-n="'+X(e.n)+'" style="cursor:pointer"><span class="exc">'+exTx(e)+'</span><small class="mu">Añadir +</small></div>').join('')||'<p class="mu">Sin resultados.</p>'};
const crList=()=>CRL();
const crEd=()=>{const r=S.cr[CR.i];return '<div class="row"><button data-a="cr">‹ Rutinas</button>'+(CR.nw?'':'<button data-a="crx" style="color:var(--c)">Eliminar</button>')+'</div><h2 style="margin:14px 0 4px;letter-spacing:-.02em">Workout personalizado</h2><label>Nombre</label><input data-c="crn" value="'+X(r.n)+'"><label>Imagen del entrenamiento</label>'+zip(r)+''+r.bl.map((b,j)=>'<div class="row" style="margin-top:16px"><b class="mu">SERIE '+String.fromCharCode(65+j)+'</b>'+(b.ex.length>1?'<b style="color:#f59e0b">'+BL[b.ex.length]+' · 10 s</b>':'')+'<button data-a="bd" data-i="'+j+'" style="padding:4px 10px">Quitar</button></div>'+b.ex.map(n=>'<div class="ovx"><div class="th">'+anEx(n,64)+'</div><b style="flex:1">'+X(n)+'</b></div>').join('')+'<div class="row" style="margin-top:6px"><span><button data-a="bs" data-i="'+j+'" data-v="-1">−</button> '+b.s+' series <button data-a="bs" data-i="'+j+'" data-v="1">+</button></span><select data-c="br" data-i="'+j+'" style="width:auto">'+RO.map(v=>'<option value="'+v+'"'+(v==b.r?' selected':'')+'>Descanso '+F(v)+'</option>').join('')+'</select></div>').join('')+'<button data-a="bnew" style="width:100%;margin-top:16px">+ Añadir bloque</button><div style="height:80px"></div><button class="sb" data-a="crc" style="background:var(--tx);color:var(--bg);border:0;padding:16px;font-size:16px;border-radius:16px">'+(CR.nw?'Crear':'Guardar cambios')+'</button>'};
const crPk=()=>'<button data-a="cre" data-i="'+CR.i+'">‹ Cancelar</button><h3>Nuevo bloque</h3>'+[1,2,3].map(k=>'<button class="chip'+(CR.k==k?' on':'')+'" data-a="bk" data-i="'+k+'">'+BL[k]+'</button>').join('')+'<p class="mu">Elige el ejercicio '+(CR.sel.length+1)+' de '+CR.k+(CR.sel.length?': '+CR.sel.map(X).join(' + '):'')+'</p><input placeholder="Buscar por nombre, músculo o equipo" data-u="cq"><div id="cl2">'+crRows()+'</div>';
A.bp=(i,b)=>{CR.sel.push(b.dataset.n);CR.q='';if(CR.sel.length>=CR.k){const l=CR.sel[CR.sel.length-1],r=rs0(l);S.cr[CR.i].bl.push({ex:CR.sel,s:3,r:RO.includes(r)?r:90});CR.sel=[];sv();sh(crEd())}else sh(crPk())};
A.bs=(i,b)=>{const x=S.cr[CR.i].bl[i];x.s=Math.max(1,x.s+ +b.dataset.v);sv();sh(crEd())};
A.bd=i=>{S.cr[CR.i].bl.splice(i,1);sv();sh(crEd())};
const cr0=()=>{sh(crList());$('#sh').className='full'};
function crRowsL(){const q=(CR.s||'').toLowerCase();let l=S.cr.map((r,i)=>({r,i})).filter(o=>o.r.n.toLowerCase().includes(q));if(CR.so)l.sort((a,b)=>a.r.n.localeCompare(b.r.n));else l.reverse();
return l.map(({r,i})=>{const k=zimg(r),ex=[].concat(...r.bl.map(b=>b.ex)),gs=[...new Set(ex.map(n=>nm(zgx(n))))],ns=r.bl.reduce((s,b)=>s+b.s*b.ex.length,0);
return '<div class="ovx" style="align-items:flex-start;padding:16px 0"><div data-a="cre" data-i="'+i+'" style="width:96px;height:132px;border-radius:16px;flex:none;cursor:pointer;background:url(data:image/jpeg;base64,'+PH[k]+') center/cover"></div><div style="flex:1;min-width:0"><div class="row"><small style="color:var(--a1);font-weight:700">'+ic('prog',14)+' Personalizado</small><button data-a="crm" data-i="'+i+'" style="border:0;background:none;padding:4px 8px"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button></div><b data-a="cre" data-i="'+i+'" style="font-size:20px;display:block;margin:4px 0 10px;cursor:pointer">'+X(r.n)+'</b><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="tg">'+Z(ns*2.4)+' min</span>'+gs.slice(0,2).map(g=>'<span class="tg">'+g+'</span>').join('')+(gs.length>2?'<span class="tg">+'+(gs.length-2)+'</span>':'')+'</div>'+(CR.m===i?'<div class="g2" style="margin-top:10px;grid-template-columns:repeat(3,1fr)"><button class="pr" data-a="crgo" data-i="'+i+'">Empezar</button><button data-a="cre" data-i="'+i+'">Editar</button><button data-a="crd" data-i="'+i+'" style="color:var(--c)">Borrar</button></div>':'')+'</div></div>'}).join('')||'<p class="mu">Aún no tienes workouts. Crea el primero con el botón de abajo.</p>'}
function CRL(){return '<div class="row"><button data-a="cl" style="border:0;background:none;font-size:24px;padding:6px 10px">←</button></div><h1 style="font-size:32px;letter-spacing:-.03em;margin:10px 0 16px">Workouts personalizados</h1><div class="row" style="margin-bottom:6px"><input placeholder="Buscar" data-u="crs" value="'+X(CR.s||'')+'"><button data-a="crso" style="padding:12px 14px">'+ic('swp',20)+'</button></div><div id="crl">'+crRowsL()+'</div><div style="height:90px"></div><button class="sb" data-a="crn" style="background:var(--tx);color:var(--bg);border:0;padding:16px;font-size:16px;border-radius:16px">Crear workout</button>'}
const crr=()=>{const e=$('#crl');if(e)e.innerHTML=crRowsL()};
U.crs=v=>{CR.s=v;crr()};
A.crso=()=>{CR.so=!CR.so;crr()};
A.crm=i=>{CR.m=CR.m===i?null:i;crr()};
let CRS=null,CRI=-1,OVS='';
A.crn=()=>{CR.nw=true;S.cr.push({n:'Mi workout '+(S.cr.length+1),bl:[]});CR.i=S.cr.length-1;sv();sh(crEd());CRI=CR.i;CRS=JSON.stringify(S.cr[CR.i])};
A.cre=i=>{if(CRI!==i||CRS==null){CRI=i;CRS=JSON.stringify(S.cr[i]);CR.nw=false}CR.i=i;sh(crEd())};
A.cr=()=>{if(CRS==null||!S.cr[CRI]){CRS=null;cr0();return}if(CR.nw)dlg('¿Descartar este workout?','Aún no lo has creado. Si sales, se perderá.',[['Seguir editando','zno',''],['Descartar','crn2','pr']]);else if(JSON.stringify(S.cr[CRI])!=CRS)dlg('¿Guardar los cambios?','Has modificado este workout.',[['Descartar','crd2',''],['Guardar','crs2','pr']]);else{CRS=null;cr0()}};
A.crn2=()=>{S.cr.splice(CRI,1);CR.nw=false;CRS=null;sv();cr0()};
A.crs2=()=>{CRS=null;sv();cr0()};
A.crd2=()=>{S.cr[CRI]=JSON.parse(CRS);CRS=null;sv();cr0()};
A.crc=()=>{const r=S.cr[CR.i];if(!r.bl.length){dlg('Añade al menos un bloque','Elige uno o varios ejercicios con el botón Añadir bloque.',[['Entendido','zno','pr']]);return}if(!CR.nw){dlg('¿Guardar los cambios?','Se actualizará este workout personalizado.',[['Cancelar','zno',''],['Guardar','crc1','pr']]);return}A.crc1()};
A.crc1=()=>{CR.nw=false;CRS=null;sv();cr0()};
A.crx=()=>dlg('¿Borrar este workout?','Se eliminará de tu lista.',[['Cancelar','zno',''],['Borrar','crx1','pr']]);
A.crx1=()=>{CR.nw=false;CRS=null;S.cr.splice(CR.i,1);sv();sh(crList())};
A.crd=i=>{CR.dx=i;dlg('¿Borrar este workout?','Se eliminará de tu lista.',[['Cancelar','zno',''],['Borrar','crdo','pr']])};
A.crdo=()=>{S.cr.splice(CR.dx,1);CR.m=null;sv();crr()};
const crday=i=>{const r=S.cr[i],ex=[];r.bl.forEach((b,j)=>{const u='b'+Date.now()+j;b.ex.forEach((n,k)=>{const o={n,s:b.s,r:k<b.ex.length-1?10:b.r};if(b.ex.length>1)o.b=u;ex.push(o)})});return{n:r.n,ex,cu:1,img:zimg(r)}};
const pbr=()=>{if(S.pbk){S.plan[S.pbk.sel]=S.pbk.day;S.pbk=null;sv()}};
A.crgo=i=>{if(!S.cr[i].bl.length)return;S.pbk={sel:S.sel,day:S.plan[S.sel]};S.plan[S.sel]=crday(i);sv();sh();A.go()};
A.bnew=()=>{CR.g='';CR.gs=[];CR.eq=[];EQD.cr=0;EQD.crg=0;CR.k=1;CR.sel=[];CR.q='';sh(crPk())};
A.bk=(i,b)=>{CR.g='';CR.gs=[];CR.eq=[];EQD.cr=0;EQD.crg=0;CR.k=i;CR.sel=[];CR.q='';sh(crPk())};
A.crg=(i,b)=>{CR.g=b.dataset.v;CR.eq=[];$('#crgc').innerHTML=grChips(CR.g,'crg');$('#cl2').innerHTML=crRows()};

/* — manejadores de esta función (registros A / C / U) — */
U.cq=v=>{CR.q=v;$('#cl2').innerHTML=crRows()};
C.crn=e=>{S.cr[CR.i].n=e.value;sv()};
C.br=(e,i)=>{S.cr[CR.i].bl[i].r=+e.value;sv()};
