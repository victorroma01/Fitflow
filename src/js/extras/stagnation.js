/* ═══ extras/stagnation ═══
   Detección de estancamiento.
   Define: f2Stag, f2StzCard  · acciones/registros: 2
*/
function f2Stag(){const out=[];if(typeof dlOn=='function'&&dlOn(S.wk))return out;
 const h=S.hist||{},inPlan=new Set((S.plan||[]).flatMap(d=>(d.ex||[]).map(e=>e.n))),now=Date.now(),hide=S.stz||{};
 Object.keys(h).forEach(n=>{if(!inPlan.has(n))return;if(hide[n]&&now-hide[n]<14*864e5)return;
  const L=Array.isArray(h[n])?h[n]:[];
  const ses=L.slice(0,12).map(x=>{let m=0,b=null;(x&&Array.isArray(x.s)?x.s:[]).forEach(q=>{const w=+q[1]||0,r=+q[0]||0;if(w>0&&r>0){const v=e1(w,r);if(v>m){m=v;b=[r,w]}}});return{d:x&&x.d,e:m,b}}).filter(s=>s.e>0);
  if(ses.length<4)return;
  const mx=Math.max(...ses.map(s=>s.e));let bi=0;while(bi<ses.length&&ses[bi].e<mx*.995)bi++;
  if(bi<3)return;
  const d0=new Date(ses[0].d+'T12:00:00'),d1=new Date(ses[bi].d+'T12:00:00');
  if(isNaN(d0)||isNaN(d1))return;
  if(now-d0>35*864e5)return;if((d0-d1)/864e5<14)return;
  out.push({n,k:bi,mx,d:ses[bi].d,b:ses[bi].b,ses:ses.slice(0,4)})});
 return out.sort((a,b)=>b.k-a.k).slice(0,3)}
function f2StzCard(){try{const L=f2Stag();if(!L.length)return '';
 return '<div class="cd"><div class="row"><b>Posible estancamiento</b><small>'+L.length+(L.length==1?' ejercicio':' ejercicios')+'</small></div><div class="mu" style="font-size:13px;margin:4px 0 6px">No superas tu mejor marca desde hace varias sesiones.</div>'
 +L.map((x,i)=>'<div class="it exr" data-a="f2sz" data-i="'+i+'" style="cursor:pointer"><span><b>'+X(x.n)+'</b><br><small>Sin récord en '+x.k+' sesiones</small></span><span class="mu" style="align-self:center">›</span></div>').join('')+'</div>'}catch(e){return ''}}
A.f2sz=i=>{const x=f2Stag()[i];if(!x)return;
 sh('<h3>'+X(x.n)+'</h3><p class="mu" style="margin:0 0 10px">Tu mejor marca estimada fue el '+f2d(x.d,{day:'numeric',month:'long'})+(x.b?': '+ffDW(x.b[1])+' '+ffUL()+' × '+x.b[0]:'')+' (1RM estimado '+R1(ffDW(x.mx))+' '+ffUL()+'). Desde entonces llevas '+x.k+' sesiones sin superarla.</p>'
 +'<div class="cd" style="margin:0 0 10px"><small class="mu">Últimas sesiones</small>'+x.ses.map(s=>'<div class="it" style="grid-template-columns:1fr auto"><span>'+f2d(s.d,{day:'numeric',month:'short'})+'</span><b>'+(s.b?ffDW(s.b[1])+' '+ffUL()+' × '+s.b[0]:'')+'</b></div>').join('')+'</div>'
 +'<b>Qué probar</b><div class="mu" style="font-size:14px;display:grid;gap:7px;margin:6px 0 12px"><div>· Cambia el rango de repeticiones durante 3 o 4 semanas, por ejemplo de 8-12 a 4-6 con más peso.</div><div>· Añade una serie a este ejercicio o descansa un poco más entre series.</div><div>· Revisa el sueño y la comida: dormir poco o comer en déficit frena la fuerza.</div><div>· Prueba una variante del ejercicio (opción Swap) durante un bloque.</div><div>· Una semana de descarga (mitad de series, sin subir peso) suele desbloquear el progreso.</div></div>'
 +'<div class="g2"><button data-a="f2sx" data-i="'+i+'">Ocultar 2 semanas</button><button class="pr" data-a="dlon2">Activar descarga</button></div>')};
A.f2sx=i=>{const x=f2Stag()[i];if(x){S.stz=S.stz||{};S.stz[x.n]=Date.now();sv()}sh();R()};
