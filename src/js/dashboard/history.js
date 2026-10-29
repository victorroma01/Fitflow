/* ═══ dashboard/history ═══
   Registro de entrenos y calendario.
   Define: calUI, lgUI, LGI, f2LgTx, f2LgRt  · acciones/registros: 4
*/
function calUI(){const b=new Date(),d=new Date(b.getFullYear(),b.getMonth()+CM,1),n=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(),o=(d.getDay()+6)%7,ds=new Set(S.logs.map(l=>l.d));let c='';for(let i=0;i<o;i++)c+='<i></i>';for(let i=1;i<=n;i++)c+='<i class="'+(ds.has(dk(new Date(d.getFullYear(),d.getMonth(),i)))?'on':'')+'">'+i+'</i>';
return '<div class="row"><button data-a="cm" data-i="-1">‹</button><b>'+d.toLocaleDateString('es',{month:'long',year:'numeric'})+'</b><button data-a="cm" data-i="1">›</button></div><div class="cal" style="margin-top:8px">'+'LMXJVSD'.split('').map(x=>'<small>'+x+'</small>').join('')+c+'</div>'}
const lgUI=()=>{const L=S.logs.map((l,i)=>({l,i})).reverse(),tv=S.logs.reduce((s,l)=>s+l.v,0),tm=S.logs.reduce((s,l)=>s+(+l.m||0),0);let h=pgHead('Registros')+'<div class="g2" style="grid-template-columns:repeat(3,1fr);gap:8px"><div class="cd" style="margin:0;text-align:center;padding:12px 6px"><b style="font-size:22px">'+S.logs.length+'</b><br><small>Entrenos</small></div><div class="cd" style="margin:0;text-align:center;padding:12px 6px"><b style="font-size:22px">'+ffVT(tv,1)+'</b><br><small>Volumen</small></div><div class="cd" style="margin:0;text-align:center;padding:12px 6px"><b style="font-size:22px">'+R1(tm/60)+' h</b><br><small>Tiempo</small></div></div>',last='';
if(!L.length)return h+'<p class="mu" style="margin-top:18px">Aún no hay entrenos guardados. Se registran al pulsar Log out.</p>';
L.forEach(o=>{const d=new Date(o.l.d+'T00:00:00'),m=d.toLocaleDateString('es',{month:'long',year:'numeric'});if(m!=last){last=m;h+='<div class="ph">'+X(m)+'</div>'}h+='<div class="it exr" data-a="lgx" data-i="'+o.i+'" style="cursor:pointer"><span><b>'+X(o.l.n)+'</b><br><small>'+d.toLocaleDateString('es',{weekday:'short',day:'numeric',month:'short'})+f2LgTx(o.l)+'</small></span><b>'+f2LgRt(o.l)+'</b></div>'});
return h+'<p class="mu" style="font-size:12px;margin-top:14px">Toca un registro para borrarlo.</p>'};
A.lg=()=>fullPage(lgUI());
A.lgx=i=>{LGI=i;const l=S.logs[i];if(l)zcf('¿Borrar este registro?',l.n+' · '+l.d,'lgd','Borrar')};
let LGI=-1;
A.lgd=()=>{if(S.logs[LGI]){S.logs.splice(LGI,1);sv()}LGI=-1;sh(lgUI());R()};
A.cl2=()=>fullPage(pgHead('Calendario')+'<div class="cd" id="cl">'+calUI()+'</div><p class="mu" style="font-size:13px">Los días marcados son los que registraste un entreno.</p>');
function f2LgTx(l){return l.k=='c'&&l.x?' · '+X(l.x):l.k=='w'&&l.x?' · '+X(l.x)+(l.nt?' · '+X(l.nt):''):' · '+l.s+' series · '+l.m+' min'}
function f2LgRt(l){return l.k=='c'?(l.c&&+l.c.km>0?R1(+l.c.km)+' km':l.m+' min'):l.k=='w'?'WOD':Z(ffDW(l.v))+' '+ffUL()}

/* — manejadores de esta función (registros A / C / U) — */
A.cm=i=>{CM+=i;$('#cl').innerHTML=calUI()};
