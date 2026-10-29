/* ═══ nutrition/water ═══
   Registro de agua diaria.
   Define: wtG, wtUI, NU  · acciones/registros: 1
*/
const wtG=()=>{const w=+S.bio.w;return w?Math.max(2000,Math.round(35*w/250)*250):2500};
function wtUI(){const k=dk(new Date(Date.now()+ND*864e5)),v=(S.wt||{})[k]||0,g=wtG();return '<div class="cd"><div class="row"><b>Agua</b><b>'+(v/1000)+' / '+(g/1000)+' L</b></div><div class="bar" style="height:10px;margin:10px 0"><i style="width:'+Math.min(100,v/g*100)+'%;background:var(--a2)"></i></div><div class="g2" style="grid-template-columns:repeat(3,1fr)"><button data-a="zwt" data-i="-250">−250 ml</button><button data-a="zwt" data-i="250">+250 ml</button><button data-a="zwt" data-i="500">+500 ml</button></div></div>'}
A.zwt=i=>{S.wt=S.wt||{};const k=dk(new Date(Date.now()+ND*864e5));S.wt[k]=Math.max(0,(S.wt[k]||0)+i);sv();R()};
function NU(){return NU0().replace('<details class="cd"><summary>Tipo de dieta',wtUI()+'<details class="cd"><summary>Tipo de dieta')}
