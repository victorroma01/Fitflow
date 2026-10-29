/* ═══ system/backup ═══
   Copias de seguridad, restauración y avisos.
   Define: BKP, bkAgo, bkWarn, BXV, bxN, bxP, bxWip, bxRows, bxLine, bxBuild, BXE, bxParse, bxDate, bxAsk, bxPre, bkRestore, … (+5)  · acciones/registros: 8
*/
let BKP=null;
const bkAgo=()=>{if(!S.bkd)return 'Aún no has guardado ninguna copia.';const d=Math.floor((Date.now()-S.bkd)/864e5);return 'Última copia: '+(d<=0?'hoy':d==1?'ayer':'hace '+d+' días')+'.'};
const bkWarn=()=>{if(S.logs.length<3||(S.bkd&&Date.now()-S.bkd<21*864e5))return '';
 return '<div class="cd"><b>Haz una copia de seguridad</b><div class="mu" style="font-size:13px;margin:4px 0 10px">Tus entrenos solo viven en este dispositivo. '+(S.bkd?bkAgo():'Aún no has guardado ninguna copia.')+'</div><button data-a="zbk" style="width:100%">Copia de seguridad</button></div>'};
const BXV=2;
const bxN=x=>Array.isArray(x)?x.length:(x&&typeof x=='object'?Object.keys(x).length:0);
const bxP=(n,a,b)=>n+' '+(n==1?a:b);
const bxWip=()=>{try{const z=JSON.parse(Store.get(ZK));if(z&&z.W&&z.d&&Array.isArray(z.W.x)&&z.d&&Array.isArray(z.d.ex))return z}catch(e){}return null};
const bxRows=(s,wip)=>{
 const it=Object.values(s.meals||{}).reduce((t,d)=>t+(d&&typeof d=='object'?Object.values(d).reduce((u,l)=>u+(Array.isArray(l)?l.length:0),0):0),0);
 const dias=new Set((s.logs||[]).map(l=>l&&l.d)).size;
 const r=[bxP(bxN(s.logs),'entreno registrado','entrenos registrados')+(dias?' ('+bxP(dias,'día','días')+')':''),
  'Historial de pesos de '+bxP(bxN(s.hist),'ejercicio','ejercicios')+' y '+bxP(bxN(s.pr),'récord personal','récords personales'),
  bxP(bxN(s.wl),'registro de peso corporal','registros de peso corporal'),
  'Comidas de '+bxP(bxN(s.meals),'día','días')+' ('+bxP(it,'alimento anotado','alimentos anotados')+') y agua de '+bxP(bxN(s.wt),'día','días'),
  bxP(bxN(s.cf),'alimento nuevo','alimentos nuevos')+', '+bxP(bxN(s.lib),'plato guardado','platos guardados')+' y '+bxP(Object.keys(s.tp||{}).length,'plantilla de día','plantillas de día'),
  bxP(bxN(s.cr),'rutina personalizada','rutinas personalizadas')+', '+bxP(bxN(s.cp),'programa guardado','programas guardados')+' y '+bxP(bxN(s.cx),'ejercicio propio','ejercicios propios'),
  'Notas de '+bxP(bxN(s.notes),'ejercicio','ejercicios'),...f2BxRows(s),
  'Perfil, objetivos de nutrición, nivel y ajustes (tema, acento, estilo, unidades, avisos)'];
 if(wip)r.push('Entreno en curso, para retomarlo');
 return r};
const bxLine=s=>[bxP(bxN(s.logs),'entreno','entrenos'),bxP(bxN(s.cr),'rutina','rutinas'),bxP(bxN(s.cf),'alimento nuevo','alimentos nuevos'),'comidas de '+bxP(bxN(s.meals),'día','días')].join(' · ');
const bxBuild=()=>{const wip=bxWip();return JSON.stringify(Object.assign({_sf:{app:'StrataFit',fmt:BXV,ver:APPV,at:new Date().toISOString(),wip:wip||undefined,sum:bxRows(S,wip)}},S))};
const BXE={vacio:'El archivo está vacío',prog:'Eso es un código de programa, no una copia: impórtalo en Programas',grande:'El archivo es demasiado grande para ser una copia de StrataFit',formato:'El archivo no es una copia válida de StrataFit',plan:'La copia está dañada: no tiene un programa de entrenamiento válido'};
const bxParse=txt=>{txt=String(txt||'').trim();if(!txt)throw 'vacio';if(/^FFP1:/.test(txt))throw 'prog';if(txt.length>4e7)throw 'grande';
 let o;try{o=JSON.parse(txt,(k,v)=>k=='__proto__'?undefined:v)}catch(e){throw 'formato'}
 const A_=Array.isArray,O_=x=>x&&typeof x=='object'&&!A_(x);
 if(!O_(o))throw 'formato';
 const meta=O_(o._sf)?o._sf:null;delete o._sf;
 if(!A_(o.plan)||!o.plan.length||!o.plan.every(d=>d&&typeof d.n=='string'&&A_(d.ex)&&d.ex.every(e=>e&&typeof e.n=='string'&&+e.s>0)))throw 'plan';
 let fix=0;const L1=['logs','cr','cx','cf','lib','cp','wl','ms'],O1=['done','last','meals','hist','pr','notes','bio','pf','nu','wt','tp','dt','fq','dl','dq','ach','bc','wdc','stz'];
 L1.forEach(k=>{if(o[k]!=null){if(!A_(o[k])){o[k]=[];fix++}else{const n=o[k].length;o[k]=o[k].filter(x=>x&&typeof x=='object');fix+=n-o[k].length}}});
 O1.forEach(k=>{if(o[k]!=null&&!O_(o[k])){delete o[k];fix++}});
 let wip=null;const w=meta&&meta.wip;if(O_(w)&&O_(w.W)&&A_(w.W.x)&&O_(w.d)&&A_(w.d.ex)&&w.W.x.length==w.d.ex.length)wip=w;
 return{s:o,meta,wip,fix}};
const bxDate=(t,l)=>{const d=new Date(t);return isNaN(d)?'':d.toLocaleDateString('es',l?{day:'numeric',month:'long',year:'numeric'}:{day:'numeric',month:'short'})};
const bxAsk=txt=>{let r;try{r=bxParse(txt)}catch(x){zt(BXE[x]||BXE.formato);return}
 BKP=r;const ds=r.meta&&r.meta.at?bxDate(r.meta.at,1):'';
 zcf('¿Restaurar esta copia?','<b>Copia'+(ds?' del '+X(ds):'')+'</b><br>'+X(bxLine(r.s))+(r.wip?'<br>Incluye un entreno en curso.':'')+(r.meta&&Array.isArray(r.meta.ph)&&r.meta.ph.length?'<br>Incluye '+r.meta.ph.length+' fotos de progreso (se añaden a las que ya tienes).':'')+'<br><br><b>Ahora tienes</b><br>'+X(bxLine(S))+'<br><br>Se reemplazarán los datos actuales. Antes se guarda lo que tienes ahora, para que puedas deshacerlo.','bkok','Restaurar')};
const bxPre=()=>{try{const p=JSON.parse(Store.get(Store.K.pre));if(p&&p.s&&Array.isArray(p.s.plan)&&Date.now()-p.t<30*864e5)return p}catch(e){}return null};
const bkRestore=()=>{const r=BKP;if(!r||!r.s)return;BKP=null;let pre;
 try{pre=JSON.stringify({t:Date.now(),v:APPV,s:S,w:Store.get(ZK)});Store.set(Store.K.pre,pre)}catch(e){zt('No hay espacio para guardar tus datos actuales: no se restauró nada');return}
 try{const s=r.s;s.bkd=Date.now();Store.set(Store.K.app,JSON.stringify(s));
  if(r.wip){r.wip.t=Date.now();Store.set(ZK,JSON.stringify(r.wip))}else Store.del(ZK);
  Store.set(Store.K.rs,JSON.stringify({s:bxRows(s,r.wip),f:r.fix||0}))}
 catch(e){try{const p=JSON.parse(pre);Store.set(Store.K.app,JSON.stringify(p.s));if(p.w)Store.set(ZK,p.w);else Store.del(ZK)}catch(_){}zt('No se pudo restaurar; tus datos siguen como estaban');return}
 location.reload()};
A.bkun=()=>{const p=bxPre();if(!p)return;zcf('¿Deshacer la última restauración?','Volverás a los datos que tenías antes ('+X(bxLine(p.s))+'). Lo que tienes ahora se guardará por si cambias de idea.','bkun2','Deshacer')};
A.bkun2=()=>{const p=bxPre();if(!p)return;
 try{Store.set(Store.K.pre,JSON.stringify({t:Date.now(),v:APPV,s:S,w:Store.get(ZK)}))}catch(e){zt('No hay espacio para deshacer');return}
 try{Store.set(Store.K.app,JSON.stringify(p.s));if(p.w)Store.set(ZK,p.w);else Store.del(ZK);
  Store.set(Store.K.rs,JSON.stringify({s:bxRows(p.s,null),f:0,u:1}))}
 catch(e){try{Store.set(Store.K.app,JSON.stringify(S))}catch(_){}zt('No se pudo deshacer');return}
 location.reload()};
C.bkim=e=>{const f=e.files&&e.files[0];if(!f)return;if(f.size>4e7){zt(BXE.grande);e.value='';return}const r=new FileReader();r.onload=()=>bxAsk(String(r.result));r.onerror=()=>zt('No se pudo leer el archivo');r.readAsText(f);e.value=''};
A.zbr=()=>{const e=$('#bk');bxAsk(e?e.value:'')};
A.bkf=async()=>{const pv=S.bkd;S.bkd=Date.now();sv();const r=await ffDl('stratafit-copia-'+dk(new Date)+'.json',await f2Full());
 if(r=='saved'||r=='delivered')zt('Copia guardada');else{S.bkd=pv;sv();zt(r=='declined'?'No se guardó la copia':'No se pudo guardar el archivo. Usa la opción de texto.')}};
A.zbk=()=>{const p=bxPre();
 sh('<h3>Copia de seguridad</h3><p class="mu" style="margin:0 0 6px">Tus datos viven solo en este dispositivo. Guarda un archivo de vez en cuando: si cambias de móvil o borras los datos del navegador, podrás restaurarlo aquí y seguir por donde ibas.</p><p class="mu" style="font-size:12px;margin:0 0 12px">'+bkAgo()+'</p>'
 +'<div class="g2"><button class="pr" data-a="bkf">Guardar archivo</button><label class="btnl">Importar archivo<input type="file" accept=".json,application/json,text/plain" hidden data-c="bkim"></label></div>'
 +'<details class="cd" style="margin-top:12px"><summary>Qué incluye la copia</summary><div class="mu" style="font-size:13px;margin-top:8px;display:grid;gap:6px">'+bxRows(S,bxWip()).map(x=>'<div>· '+X(x)+'</div>').join('')+'</div></details>'
 +'<details class="cd" style="margin-top:12px"><summary>Copiar o pegar como texto (sin fotos)</summary><textarea id="bk" rows="5" style="margin-top:8px">'+X(bxBuild())+'</textarea><div class="g2" style="margin-top:10px"><button data-a="zbc">Copiar</button><button class="pr" data-a="zbr">Restaurar</button></div></details>'
 +(p?'<button data-a="bkun" style="width:100%;margin-top:12px">Deshacer última restauración ('+X(bxDate(p.t))+')</button>':''))};
const bxNew=()=>!S.nbk&&!S.logs.length&&!S.bkd&&!(S.cp||[]).length&&!(S.cr||[]).length&&!bxN(S.meals)&&!(S.wl||[]).length;
A.bknx=()=>{S.nbk=1;sv();R()};
const bxBanner=()=>'<div class="cd" style="margin:0 0 12px"><b>¿Ya usabas StrataFit?</b><div class="mu" style="font-size:13px;margin:4px 0 10px">Importa tu copia de seguridad y sigue por donde ibas.</div><div class="g2"><button class="pr" data-a="zbk">Importar copia</button><button data-a="bknx">Ahora no</button></div></div>';
function f2BxRows(s){const L=(Array.isArray(s.logs)?s.logs:[]).filter(l=>l&&typeof l=='object'),cd=L.filter(l=>l.k=='c').length,wd=L.filter(l=>l.k=='w').length,r=[];
 if(cd||wd)r.push(bxP(cd,'sesión de cardio','sesiones de cardio')+' y '+bxP(wd,'WOD','WOD'));
 const ms=Array.isArray(s.ms)?s.ms.length:0;if(ms)r.push(bxP(ms,'medición corporal','mediciones corporales'));
 const na=s.ach&&typeof s.ach=='object'?Object.keys(s.ach).length:0;if(na)r.push(bxP(na,'logro conseguido','logros conseguidos'));
 if(s===S&&PHN)r.push(bxP(PHN,'foto de progreso','fotos de progreso')+' (solo en la copia en archivo)');
 if(s!==S&&f2PhR)r.push(bxP(f2PhR,'foto de progreso restaurada','fotos de progreso restauradas'));
 return r}
const f2Full=async()=>{let ph=[];try{ph=await phAllFull()}catch(e){ph=[]}const base=bxBuild();
 return ph.length?base.replace('{"_sf":{',()=>'{"_sf":{"ph":'+JSON.stringify(ph)+','):base};
let f2PhR=0;
A.bkok=async()=>{const r=BKP;f2PhR=0;
 try{if(r&&r.meta&&Array.isArray(r.meta.ph)&&r.meta.ph.length){const n=await phMerge(r.meta.ph);f2PhR=n;if(!n)zt('No se pudieron restaurar las fotos')}}catch(e){zt('No se pudieron restaurar las fotos')}
 bkRestore()};
