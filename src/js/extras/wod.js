/* ═══ extras/wod ═══
   Temporizadores de WOD (AMRAP, EMOM, Tabata, For time).
   Define: WDM, WDD, WDI, WDS, wdC, wdTot, wdUI, wdState, wdName, wdSkel, wdTick, wdStart, wdClose, wdEnd  · acciones/registros: 13
*/
const WDM=[['amrap','AMRAP'],['emom','EMOM'],['tabata','Tabata'],['ft','For time']];
const WDD={m:'amrap',a:12,en:10,ei:60,tw:20,tr:10,tn:8,ct:0,pre:10};
const WDI={amrap:'Tantas rondas como puedas en el tiempo marcado. Cuenta cada ronda con un toque.',emom:'Cada intervalo empieza un trabajo nuevo. Lo que te sobra del intervalo es descanso.',tabata:'Trabajo y descanso en intervalos cortos. El clásico: 20 s de trabajo, 10 s de descanso, 8 rondas.',ft:'Cronómetro hacia arriba. Completa el trabajo lo antes posible; opcionalmente con tiempo límite.'};
let WDS=null;
const wdC=()=>{const c=Object.assign({},WDD,S.wdc&&typeof S.wdc=='object'?S.wdc:{});
 return{m:WDM.some(x=>x[0]==c.m)?c.m:'amrap',a:f2n(c.a,1,180,12),en:f2n(c.en,1,120,10),ei:f2n(c.ei,10,600,60),tw:f2n(c.tw,5,600,20),tr:f2n(c.tr,0,600,10),tn:f2n(c.tn,1,99,8),ct:f2n(c.ct,0,180,0),pre:f2n(c.pre,0,30,10)}};
const wdTot=c=>c.m=='amrap'?c.a*60:c.m=='emom'?c.en*c.ei:c.m=='tabata'?(c.tw+c.tr)*c.tn-c.tr:c.ct*60;
const wdUI=()=>{const c=wdC(),m=c.m;
 const num=(l,k,mn,mx)=>'<div><label>'+l+'</label><input type="number" inputmode="numeric" min="'+mn+'" max="'+mx+'" value="'+c[k]+'" data-c="wdv" data-k="'+k+'"></div>';
 const sel=(l,k,o)=>'<div><label>'+l+'</label><select data-c="wdv" data-k="'+k+'">'+o.map(x=>'<option value="'+x[0]+'"'+(c[k]==x[0]?' selected':'')+'>'+x[1]+'</option>').join('')+'</select></div>';
 let f='';
 if(m=='amrap')f=num('Duración (min)','a',1,180);
 else if(m=='emom')f='<div class="g2">'+num('Rondas','en',1,120)+sel('Intervalo','ei',[[30,'30 s'],[45,'45 s'],[60,'1 min'],[90,'1:30'],[120,'2 min'],[180,'3 min']])+'</div>';
 else if(m=='tabata')f='<div class="g2" style="grid-template-columns:repeat(3,1fr)">'+num('Trabajo (s)','tw',5,600)+num('Descanso (s)','tr',0,600)+num('Rondas','tn',1,99)+'</div>';
 else f=num('Tiempo límite (min, 0 = sin límite)','ct',0,180);
 const t=wdTot(c);
 return pgHead('Temporizador WOD')
 +'<div class="seg" style="grid-template-columns:repeat(4,1fr)">'+WDM.map(x=>'<button class="'+(m==x[0]?'on':'')+'" data-a="wdm" data-v="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>'
 +'<p class="mu" style="font-size:13px;margin:10px 2px 4px">'+WDI[m]+'</p>'+f
 +'<div class="g2" style="margin-top:2px">'+sel('Cuenta atrás inicial','pre',[[0,'Sin cuenta atrás'],[5,'5 s'],[10,'10 s'],[15,'15 s'],[30,'30 s']])+'<div><label>Duración total</label><div class="cd" style="margin:0;padding:10px;text-align:center"><b id="f2tt">'+(t?f2h(t):'Sin límite')+'</b></div></div></div>'
 +'<p class="mu" style="font-size:12px;margin:12px 2px 0">Suena un aviso en los últimos 3 segundos de cada tramo y al empezar el siguiente. La pantalla se mantiene encendida. Si bloqueas el móvil, el tiempo sigue corriendo pero el sonido solo se oye con la app abierta.</p>'
 +'<div style="height:90px"></div><div class="sb"><button class="pr" data-a="wdgo" style="width:100%;padding:14px">Empezar</button></div>'};
A.wod=()=>fullPage(wdUI());
A.wdm=(i,b)=>{S.wdc=Object.assign(wdC(),{m:b.dataset.v});sv();sh(wdUI())};
C.wdv=e=>{const k=e.dataset.k;if(!(k in WDD))return;const c=wdC();c[k]=+e.value;S.wdc=c;sv();e.value=wdC()[k];const t=document.getElementById('f2tt');if(t){const T=wdTot(wdC());t.textContent=T?f2h(T):'Sin límite'}};
function wdState(){const c=WDS.c,e=((WDS.pa||Date.now())-WDS.t0-WDS.pt)/1000;
 if(e<c.pre)return{ph:'pre',rem:Math.ceil(c.pre-e),id:'p',len:c.pre,el:e};
 const t=e-c.pre;
 if(c.m=='amrap'){const T=c.a*60;if(t>=T)return{fin:1,t:T};return{ph:'work',rem:Math.ceil(T-t),id:'a',len:T,el:t}}
 if(c.m=='ft'){const T=c.ct*60;if(T&&t>=T)return{fin:1,t:T,cap:1};return{ph:'work',up:Math.floor(t),id:'f',len:T,el:t}}
 if(c.m=='emom'){const T=c.en*c.ei;if(t>=T)return{fin:1,t:T,rd:c.en};const i=Math.floor(t/c.ei),w=t-i*c.ei;return{ph:'work',rem:Math.ceil(c.ei-w),id:'r'+i,len:c.ei,el:w,rd:i+1,tot:c.en,t}}
 const cy=c.tw+c.tr,T=cy*c.tn-c.tr;if(t>=T)return{fin:1,t:T,rd:c.tn};
 const i=Math.floor(t/cy),w=t-i*cy;
 if(w<c.tw)return{ph:'work',rem:Math.ceil(c.tw-w),id:'w'+i,len:c.tw,el:w,rd:i+1,tot:c.tn,t};
 return{ph:'rest',rem:Math.ceil(cy-w),id:'x'+i,len:c.tr,el:w-c.tw,rd:i+1,tot:c.tn,t}}
const wdName=c=>c.m=='amrap'?'AMRAP '+c.a+' min':c.m=='emom'?'EMOM '+(c.ei==60?c.en+' min':c.en+' × '+c.ei+' s'):c.m=='tabata'?'Tabata '+c.tw+'/'+c.tr+' · '+c.tn+' rondas':'For time'+(c.ct?' · tope '+c.ct+' min':'');
function wdSkel(){const o=document.getElementById('f2w');if(!o||!WDS)return;const c=WDS.c,m=c.m;
 o.dataset.ph=WDS.done?'done':WDS.ph||'pre';o.classList.toggle('pz',!!WDS.pa);
 let h='<div class="f2hd"><button data-a="wdx" aria-label="Cerrar" class="f2cl">'+ic('x',22)+'</button><b>'+X(wdName(c))+'</b><span></span></div>';
 if(WDS.done){const f=WDS.fin;
  h+='<div class="f2dn"><small>Terminado</small>';
  if(m=='amrap')h+='<b class="f2rs" id="f2rs">'+WDS.r+(WDS.r==1?' ronda':' rondas')+'</b><div class="g2" style="width:100%;margin-top:6px"><div><label>Rondas</label><input id="f2r" type="number" inputmode="numeric" min="0" max="999" value="'+WDS.r+'"></div><div><label>Repeticiones extra</label><input id="f2e" type="number" inputmode="numeric" min="0" max="999" value="0"></div></div>';
  else if(m=='ft')h+='<b class="f2rs">'+f2h(Math.round(f.t))+'</b><small>'+(f.cap?'Tiempo límite alcanzado':WDS.r?WDS.r+(WDS.r==1?' vuelta':' vueltas'):'')+'</small>';
  else h+='<b class="f2rs">'+(f.rd||'')+(f.rd?(f.rd==1?' ronda':' rondas'):'')+'</b><small>'+(f.early?'Terminado antes de tiempo':'Completado')+' · '+f2h(Math.round(f.t))+'</small>';
  h+='<input id="f2n" maxlength="80" placeholder="Nota (opcional): nombre del WOD, movimientos…" style="margin-top:12px"><div class="g2" style="width:100%;margin-top:12px"><button data-a="wdd">Descartar</button><button class="pr" data-a="wds">Guardar</button></div></div>';
 }else{
  h+='<div class="f2p" id="f2p"></div><div class="f2t" id="f2t">0:00</div><div class="f2s" id="f2s"></div><div class="f2b"><i id="f2bar"></i></div><div class="f2sp"></div>';
  if(m=='amrap')h+='<button class="f2big" data-a="wdr" aria-label="Sumar una ronda"><small>Rondas</small><b id="f2rn">'+WDS.r+'</b><small>Toca para sumar una</small></button><div style="text-align:center"><button data-a="wdu" class="f2sm">Restar una ronda</button></div>';
  else if(m=='ft')h+='<button class="f2big" data-a="wdr" aria-label="Marcar vuelta"><small>Vueltas</small><b id="f2rn">'+WDS.r+'</b><small id="f2lp">'+(WDS.laps.length?'Última: '+f2h(WDS.laps[WDS.laps.length-1]-(WDS.laps[WDS.laps.length-2]||0)):'Toca para marcar una vuelta')+'</small></button>';
  h+='<div class="g2 f2ct"><button data-a="wdp" id="f2pb">'+(WDS.pa?'Seguir':'Pausa')+'</button><button data-a="wdf">Terminar</button></div>';
 }
 o.innerHTML=h}
function wdTick(){if(!WDS||WDS.done)return;const s=wdState();if(s.fin){wdEnd(s,0);return}
 const o=document.getElementById('f2w');if(!o)return;
 if(o.dataset.ph!==s.ph)o.dataset.ph=s.ph;WDS.ph=s.ph;
 const set=(id,v)=>{const e=document.getElementById(id);if(e&&e.textContent!==v)e.textContent=v};
 set('f2t',s.up!=null?f2h(s.up):f2h(s.rem));
 set('f2p',s.ph=='pre'?'Prepárate':s.ph=='rest'?'Descanso':WDS.c.m=='ft'?'Cronómetro':'Trabajo');
 set('f2s',s.rd?'Ronda '+s.rd+' de '+s.tot:s.ph=='pre'?'Empieza en '+s.rem+' s':WDS.c.m=='ft'&&WDS.c.ct?'Límite '+f2h(WDS.c.ct*60):'');
 const bar=document.getElementById('f2bar');if(bar)bar.style.width=(s.len?Math.min(100,Math.max(0,s.el/s.len*100)):0)+'%';
 if(!WDS.pa){
  if(WDS.sg!==s.id){if(WDS.sg!==''){zbp(1);ffVib([120])}WDS.sg=s.id}
  if(s.rem!=null&&s.rem<=3&&s.rem>=1){const k=s.id+':'+s.rem;if(WDS.bk!==k){WDS.bk=k;zbp(0)}}
 }}
function wdStart(){const c=wdC();S.wdc=c;sv();
 WDS={c,t0:Date.now(),pt:0,pa:0,r:0,laps:[],sg:'',bk:'',done:0,ph:'pre',fin:null};
 sh();let o=document.getElementById('f2w');if(!o){o=document.createElement('div');o.id='f2w';document.body.appendChild(o)}
 wdSkel();clearInterval(wdTick.iv);wdTick.iv=setInterval(wdTick,200);wdTick();zbp(1);ffVib([60]);ffWake()}
function wdClose(){clearInterval(wdTick.iv);WDS=null;const o=document.getElementById('f2w');if(o)o.remove();ffWake()}
function wdEnd(s,early){if(!WDS||WDS.done)return;clearInterval(wdTick.iv);
 const c=WDS.c;let t=s.t;
 if(early){const e=((WDS.pa||Date.now())-WDS.t0-WDS.pt)/1000-c.pre;t=Math.max(0,Math.min(e,wdTot(c)||e))}
 WDS.done=1;WDS.fin={t,cap:!!s.cap,rd:s.rd||0,early:!!early};
 if(early&&s.rd&&c.m!='amrap'&&c.m!='ft')WDS.fin.rd=Math.max(0,s.rd-1+(s.ph=='rest'?1:0));
 if(!early){zbp(1);setTimeout(()=>zbp(1),500);ffVib([200,80,200])}
 wdSkel();ffWake()}
A.wdgo=()=>wdStart();
A.wdr=()=>{if(!WDS||WDS.done||WDS.pa)return;const s=wdState();if(s.ph=='pre')return;WDS.r++;
 if(WDS.c.m=='ft'){WDS.laps.push(Math.round(s.up!=null?s.up:0));const l=document.getElementById('f2lp');if(l)l.textContent='Última: '+f2h(WDS.laps[WDS.laps.length-1]-(WDS.laps[WDS.laps.length-2]||0))}
 const n=document.getElementById('f2rn');if(n)n.textContent=WDS.r;ffVib(25)};
A.wdu=()=>{if(!WDS||WDS.done||!WDS.r)return;WDS.r--;const n=document.getElementById('f2rn');if(n)n.textContent=WDS.r};
A.wdp=()=>{if(!WDS||WDS.done)return;if(WDS.pa){WDS.pt+=Date.now()-WDS.pa;WDS.pa=0}else WDS.pa=Date.now();
 const o=document.getElementById('f2w');if(o)o.classList.toggle('pz',!!WDS.pa);const b=document.getElementById('f2pb');if(b)b.textContent=WDS.pa?'Seguir':'Pausa';ffWake()};
A.wdf=()=>{if(!WDS||WDS.done)return;const s=wdState();if(s.fin){wdEnd(s,0);return}
 if(s.ph=='pre'){wdClose();return}
 if(WDS.c.m=='ft'){wdEnd({t:s.el},0);return}
 zcf('¿Terminar antes de tiempo?','Podrás guardar lo que llevas hecho.','wdf2','Terminar')};
A.wdf2=()=>{if(!WDS||WDS.done)return;const s=wdState();if(s.fin){wdEnd(s,0);return}wdEnd(s,1)};
A.wdx=()=>{if(!WDS)return;if(WDS.done||WDS.ph=='pre'&&!WDS.r)wdClose();else zcf('¿Salir del temporizador?','Se perderá lo que llevas.','wdq','Salir')};
A.wdq=()=>wdClose();
A.wdd=()=>wdClose();
A.wds=()=>{if(!WDS||!WDS.done)return;const c=WDS.c,f=WDS.fin,nt=((document.getElementById('f2n')||{}).value||'').trim().slice(0,80),mins=Math.max(1,Math.round(f.t/60));
 let x,w={md:c.m};
 if(c.m=='amrap'){const r=f2n((document.getElementById('f2r')||{}).value,0,999,WDS.r),ex=f2n((document.getElementById('f2e')||{}).value,0,999,0);x=r+(r==1?' ronda':' rondas')+(ex?' + '+ex+' reps':'');w.r=r;w.e=ex}
 else if(c.m=='ft'){x=f2h(Math.round(f.t))+(f.cap?' (tope)':'')+(WDS.r?' · '+WDS.r+(WDS.r==1?' vuelta':' vueltas'):'');w.t=Math.round(f.t);w.r=WDS.r}
 else{const rd=f.rd||0;x=rd+(rd==1?' ronda':' rondas')+(f.early?' (antes de tiempo)':'')+' · '+f2h(Math.round(f.t));w.r=rd;w.t=Math.round(f.t)}
 const l={d:dk(new Date),n:'WOD · '+wdName(c),v:0,s:0,m:mins,q:0,k:'w',x,w};if(nt)l.nt=nt;
 S.logs.push(l);sv();wdClose();zt('WOD guardado');f2Ach();R()};
