/* ═══ library/browse ═══
   Librería de ejercicios y ficha de cada ejercicio.
   Define: LB, lbBody, lbUI2  · acciones/registros: 5
*/
let LB={g:'',q:''};
function lbBody(){const al=exAll().map((e,i)=>({e,i})),q=(LB.q||'').toLowerCase().trim(),g=LB.g,eq=LB.eq||[];
if(!q&&!g)return '<p class="mu" style="margin:10px 0 4px">'+al.length+' ejercicios · toca un grupo muscular</p><div class="gg">'+GR.map(x=>[x,al.filter(o=>gk(o.e)==x).length]).filter(a=>a[1]).map(a=>'<button data-a="lb" data-v="'+a[0]+'">'+ico(a[0],88)+'<b>'+nm(a[0])+'</b><small>'+a[1]+' ejercicios</small></button>').join('')+'</div>';
const base=al.filter(o=>q?exHay(o.e).includes(q):gk(o.e)==g),l=base.filter(o=>eqOk(eq,o.e)).sort((a,b)=>q?exSort(a.e,b.e):exK(a.e)-exK(b.e)).slice(0,q?80:500);let h='',last=null;
l.forEach(o=>{const key=q?nm(gk(o.e)):o.e.t;if(key!==last){last=key;h+='<div class="ph">'+X(key||'')+'</div>'}h+=exRow(o,'<button data-a="lad" data-i="'+o.i+'">+ Al día</button>')});
return (g&&!q?'<div class="row" style="margin:8px 0 0"><button data-a="lb" data-v="">‹ Grupos</button><b>'+X(nm(g))+' <span class="mu" style="font-weight:400">· '+base.length+'</span></b>'+ico(g,60)+'</div>':'')+eqDD('lb',eq,eqOf(base.map(o=>o.e)),base.map(o=>o.e))+(h||'<p class="mu">Sin resultados.</p>')}
const lbUI2=()=>pgHead('Librería de ejercicios')+'<input placeholder="Buscar por nombre, músculo o equipo" data-u="ls" value="'+X(LB.q||'')+'"><div id="lr">'+lbBody()+'</div>';
A.lib=()=>{LB={g:'',q:'',eq:[]};fullPage(lbUI2())};
A.lib2=()=>{sh(lbUI2());zst()};
A.lb=(i,b)=>{LB.g=b.dataset.v;LB.q='';LB.eq=[];EQD.lb=0;sh(lbUI2());zst()};
A.leq=(i,b)=>{LB.eq=b.dataset.v;$('#lr').innerHTML=lbBody()};
A.exd=i=>{const all=exAll(),e=all[i];if(!e)return;const g=gk(e),pr=prOf(e.n),vr=all.map((x,j)=>({e:x,i:j})).filter(o=>o.e!==e&&gk(o.e)==g&&o.e.t==e.t&&e.t!='Otros');
sh('<div class="row"><button data-a="lib2" aria-label="Volver" style="border:0;background:none;font-size:24px;padding:6px 10px">←</button><button class="pr" data-a="lad" data-i="'+i+'" style="padding:9px 14px">+ Al día</button></div><div class="row" style="align-items:flex-start;margin:6px 0 4px"><div><h2 style="margin:0 0 8px;letter-spacing:-.02em">'+X(e.n)+'</h2><div>'+[nm(g),e.q,e.t&&e.t!='Otros'?e.t:''].filter(Boolean).map(x=>'<span class="tg" style="margin-right:6px;font-size:12px;padding:4px 9px">'+X(x)+'</span>').join('')+'</div></div><span class="anb" style="width:72px;height:72px;flex:none">'+anEx(e.n,72)+'</span></div>'+anFull(e)+'<h4 class="ph">Músculos principales</h4>'+(exM(e,'p').map(m=>'<span class="mc on">'+X(m)+'</span>').join('')||'<small class="mu">Sin datos</small>')+(exM(e,'s').length?'<h4 class="ph">Músculos secundarios</h4>'+exM(e,'s').map(m=>'<span class="mc">'+X(m)+'</span>').join(''):'')+'<h4 class="ph">Técnica</h4>'+tips(e.n).map(t=>'<p style="margin:6px 0">'+X(t)+'</p>').join('')+(pr?'<h4 class="ph">Tu mejor marca</h4><p style="margin:6px 0">'+ffDW(pr.w)+' '+ffUL()+' × '+pr.r+' · 1RM estimado '+Z(ffDW(pr.e))+' '+ffUL()+'</p>':'')+(vr.length?'<h4 class="ph">Variantes ('+vr.length+')</h4>'+vr.map(o=>exRow(o,'<button data-a="lad" data-i="'+o.i+'">+ Al día</button>')).join(''):'')+'<div style="height:20px"></div>');zst()};

/* — manejadores de esta función (registros A / C / U) — */
U.ls=v=>{LB.q=v;$('#lr').innerHTML=lbBody()};
