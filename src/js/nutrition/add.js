/* ═══ nutrition/add ═══
   Añadir alimentos y comidas al día.
   Define: FA, addUI0, addMealItem, addUI  · acciones/registros: 2
*/
const FA=()=>FD.concat(S.cf);
function addUI0(){const a=AD;let h='<div style="margin-bottom:8px">'+['Alimentos','Librería','Nuevo'].map((x,i)=>'<button class="chip '+(a.tab==i?'on':'')+'" data-a="at" data-i="'+i+'">'+x+'</button>').join('')+'</div>';
if(a.pick){const f=a.pick;return h+'<h3>'+X(f.n)+'</h3><label>Gramos</label><input id="gr" type="number" value="100" data-u="gr"><p id="pv" class="mu"></p><button class="pr" data-a="fa" style="width:100%">Añadir</button>'}
if(a.tab==0)return h+habUI(a.m)+'<input placeholder="Buscar alimento" data-u="fs"><div id="rs"></div>';
if(a.tab==1)return h+(S.lib.length?S.lib.map((p,i)=>'<div class="it" style="grid-template-columns:1fr auto auto"><span>'+X(p.n)+'<br><small>'+Z(sum(p.it.map(T))[0])+' kcal</small></span><button data-a="la" data-i="'+i+'">Añadir</button><button data-a="lx" data-i="'+i+'" style="padding:6px">✕</button></div>').join(''):'<p class="mu">Aún no hay platos. Pulsa ★ Guardar plato en una comida.</p>');
return h+'<label>Nombre</label><input id="n0">'+[['Kcal','k'],['Hidratos g','c'],['Proteínas g','p'],['Grasas g','f'],['Fibra g','fi'],['Sal g','s']].map(x=>'<label>'+x[0]+' (por 100 g)</label><input type="number" id="n_'+x[1]+'">').join('')+'<button class="pr" data-a="nf" style="width:100%;margin-top:10px">Guardar alimento</button>'}
A.la=i=>{const k=dk(new Date(Date.now()+ND*864e5));(S.meals[k]=S.meals[k]||{});(S.meals[k][AD.m]=S.meals[k][AD.m]||[]).push(...S.lib[i].it.map(x=>({...x})));sv();sh();R()};
const addMealItem=()=>{const g=+$('#gr').value||100,k=dk(new Date(Date.now()+ND*864e5));(S.meals[k]=S.meals[k]||{});(S.meals[k][AD.m]=S.meals[k][AD.m]||[]).push({n:AD.pick.n,g,b:AD.pick.b});sv();sh();R()};
A.fa=()=>{const f=AD&&AD.pick,e=$('#gr'),g=e?(+e.value||100):100;addMealItem();if(f&&f.n&&f.n!='__proto__'&&Array.isArray(f.b)){S.fq=S.fq||{};const q=S.fq[f.n]||{c:0};S.fq[f.n]={c:(q.c||0)+1,g,b:f.b,t:Date.now()};sv()}};
function addUI(){const h=addUI0();try{if(AD&&!AD.pick&&AD.tab==0){const m='data-u="fs">';const k=h.indexOf(m);if(k>=0)return h.slice(0,k+m.length)+'<div class="g2" style="margin:8px 0 2px"><button data-a="f2os">'+ic('globe',16)+' Buscar online</button><button data-a="f2sc">'+ic('scan',16)+' Escanear código</button></div><small class="mu" style="display:block;margin:0 2px 6px;font-size:11px">Open Food Facts: solo se envía el texto o el código que buscas.</small>'+h.slice(k+m.length)}}catch(e){}return h}

/* — manejadores de esta función (registros A / C / U) — */
A.add=i=>{AD={m:i,tab:0};sh(addUI());fl('')};
A.at=i=>{AD.tab=i;AD.pick=null;sh(addUI());fl('')};
A.pk=i=>{AD.pick=FA()[i];sh(addUI());U.gr(100)};
A.nf=()=>{const v=id=>+$('#n_'+id).value||0,n=$('#n0').value.trim();if(!n)return;S.cf.push({n,b:[v('k'),v('c'),v('p'),v('f'),v('fi'),v('s')]});sv();AD.tab=0;sh(addUI());fl('')};
A.xi=(i,b)=>{S.meals[dk(new Date(Date.now()+ND*864e5))][i].splice(+b.dataset.j,1);sv();R()};
U.gr=v=>{const e=$('#pv');if(e&&AD.pick){const t=AD.pick.b.map(x=>x*v/100);e.textContent=Z(t[0])+' kcal · C '+R1(t[1])+' · P '+R1(t[2])+' · G '+R1(t[3])+' · Fibra '+R1(t[4])+' · Sal '+R1(t[5])}};
