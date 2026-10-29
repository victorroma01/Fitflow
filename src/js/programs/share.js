/* ═══ programs/share ═══
   Compartir e importar programas mediante código.
   Define: cleanPlan, pgCode, impParse, ensureEx, SHR, shUI, doImp  · acciones/registros: 7
*/
const cleanPlan=pl=>{if(!Array.isArray(pl)||!pl.length||pl.length>7)throw 0;const o=pl.map(d=>{if(!d||typeof d.n!='string'||!Array.isArray(d.ex)||d.ex.length>24)throw 0;
 const r={n:ffTx(d.n,40)||'Día',ex:d.ex.map(e=>{if(!e||typeof e.n!='string'||!ffTx(e.n,80)||!(+e.s>0))throw 0;const x={n:ffTx(e.n,80),s:Math.min(30,Math.round(+e.s))};
  if(+e.r>=0&&+e.r<=900&&e.r!=null)x.r=+e.r;if(Array.isArray(e.rg)&&e.rg.length==2&&e.rg.every(v=>+v>=0&&+v<=5000))x.rg=[+e.rg[0],+e.rg[1]];
  if(['m','s','min','cal','km'].includes(e.u))x.u=e.u;if(Number.isInteger(e.b)&&e.b>0&&e.b<50)x.b=e.b;if(typeof e.t=='string'&&/^([0-9X]\/[0-9X]\/[0-9X]\/[0-9X]|Libre)$/.test(e.t))x.t=e.t;return x})};
 if(d.cu&&typeof d.img=='string'&&PH[d.img]){r.cu=1;r.img=d.img}return r});while(o.length<7)o.push(cpRest());return o};
const pgCode=(n,plan)=>'FFP1:'+ffB64(JSON.stringify({n:ffTx(n,60),plan:cleanPlan(plan)}));
const impParse=t=>{t=String(t||'').trim();if(!t)throw 0;const o=t.startsWith('FFP1:')?JSON.parse(ffUn(t.slice(5).replace(/\s+/g,''))):JSON.parse(t);if(!o||typeof o!='object'||!Array.isArray(o.plan))throw 0;return o};
const ensureEx=pl=>{const have=new Set(EX.concat(S.cx).map(x=>x.n));pl.forEach(d=>d.ex.forEach(e=>{if(!have.has(e.n)){have.add(e.n);S.cx.push({n:e.n,c:'Culturismo',g:'Propio',t:'Personalizado',p:[],s:[],q:'Otro'})}}))};
let SHR=null;
const shUI=()=>{const code=pgCode(SHR.n,SHR.plan);return pgHead('Compartir programa',SHR.back||'pg')+'<p class="mu" style="margin:-6px 0 10px">«'+X(SHR.n)+'». Envía este código por mensaje o correo; quien lo reciba lo pega en Programas, Importar.</p><textarea id="shc" rows="6" readonly>'+X(code)+'</textarea><div class="g2" style="margin-top:10px"><button class="pr" data-a="shg">'+(navigator.share?'Compartir':'Copiar código')+'</button><button data-a="shf">Guardar archivo</button></div>'};
A.cpsh=()=>{const p=S.cp[PRG.k];if(!p)return;try{SHR={n:p.n,plan:S.cpi==PRG.k?S.plan:p.plan,back:'cpv0'};sh(shUI());zst()}catch(e){zt('No se pudo preparar el programa')}};
A.pgs0=()=>{try{SHR={n:S.cpi>=0&&S.cp[S.cpi]?S.cp[S.cpi].n:PN[S.prog],plan:S.plan,back:'pg'};sh(shUI());zst()}catch(e){zt('No se pudo preparar el programa')}};
A.shg=async()=>{const el=$('#shc');if(!el||!SHR)return;const code=el.value;
 if(navigator.share){try{await navigator.share({title:'Programa StrataFit',text:code});return}catch(e){if(e&&e.name=='AbortError')return}}
 zt(await ffCopy(code,el)?'Código copiado':'Selecciona el texto y cópialo')};
A.shf=async()=>{if(!SHR)return;const r=await ffDl('programa-'+String(SHR.n).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,30)+'.json',JSON.stringify({ff:'FFP1',n:SHR.n,plan:cleanPlan(SHR.plan)}));
 zt(r=='saved'||r=='delivered'?'Archivo guardado':r=='declined'?'No se guardó el archivo':'No se pudo guardar el archivo')};
A.pgi=()=>{sh(pgHead('Importar programa','pg')+'<p class="mu" style="margin:-6px 0 10px">Pega el código que te han enviado o elige un archivo .json.</p><textarea id="ipc" rows="5" placeholder="FFP1:…"></textarea><p id="ipe" class="mu" style="color:var(--c);display:none;margin:8px 0 0"></p><div class="g2" style="margin-top:10px"><label class="btnl">Elegir archivo<input type="file" accept=".json,application/json,text/plain" hidden data-c="pgif"></label><button class="pr" data-a="pgio">Importar</button></div>');zst()};
const doImp=t=>{try{const o=impParse(t),plan=cleanPlan(o.plan),nm=(typeof o.n=='string'&&ffTx(o.n,60))||'Programa importado';ensureEx(plan);
 S.cp.push({n:nm,plan,t:Date.now(),src:'import',d:'Programa importado'});PRG.k=S.cp.length-1;sv();A.pg();
 dlg('Programa importado','«'+X(nm)+'» ya está en Mis programas. ¿Quieres empezar con él ahora? Se reiniciará el progreso de la semana.',[['Más tarde','zno',''],['Usar ahora','cpa','pr']])}
 catch(x){const e=$('#ipe');if(e){e.textContent='El código o el archivo no es válido.';e.style.display='block'}}};
A.pgio=()=>{const e=$('#ipc');doImp(e?e.value:'')};
C.pgif=e=>{const f=e.files&&e.files[0];if(!f)return;const r=new FileReader();r.onload=()=>doImp(String(r.result));r.onerror=()=>zt('No se pudo leer el archivo');r.readAsText(f);e.value=''};
