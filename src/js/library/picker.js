/* ═══ library/picker ═══
   Selector para añadir ejercicios al día.
   Define: PK, pkBody, pkUI  · acciones/registros: 5
*/
A.lad=(i,b)=>{const e=EX.concat(S.cx)[i],d=S.plan[S.sel];d.ex.push(nwx(e.n));if(d.n=='Descanso')d.n='Entreno';sv();R();b.textContent='✓ Añadido'};
let PK={g:'',gs:[],q:'',eq:[]};
const pkBody=()=>{const al=exAll().map((e,i)=>({e,i})),q=PK.q.toLowerCase().trim(),bq=al.filter(o=>!q||exHay(o.e).includes(q)),base=bq.filter(o=>grOk(PK.gs,o.e)),l=base.filter(o=>eqOk(PK.eq,o.e)).sort((a,b)=>exSort(a.e,b.e)),lim=120;
return eqRow(grDD('pkg',PK.gs,bq.map(o=>o.e)),eqDD('pk',PK.eq,eqOf(base.map(o=>o.e)),base.map(o=>o.e),1))+l.slice(0,lim).map(o=>'<div class="it exr" data-a="px" data-i="'+o.i+'" style="cursor:pointer"><span class="exc">'+exTx(o.e)+'</span><small class="mu">Añadir +</small></div>').join('')+(l.length>lim?'<p class="mu" style="text-align:center">Mostrando '+lim+' de '+l.length+'. Usa la búsqueda o un grupo.</p>':'')||'<p class="mu">Sin resultados.</p>'};
function pkUI(){return '<h3>Añadir ejercicio</h3><input placeholder="Buscar por nombre, músculo o equipo" data-u="pks" value="'+X(PK.q)+'"><div id="pkr">'+pkBody()+'</div><label>Crear ejercicio nuevo</label><div class="g2" style="grid-template-columns:1fr auto"><input id="xn" placeholder="Nombre"><button class="pr" data-a="nx">Crear</button></div>'}
A.pick=()=>{PK={g:'',gs:[],q:'',eq:[]};EQD.pk=0;EQD.pkg=0;AD={cat:'Culturismo'};sh(pkUI())};
A.pkg=(i,b)=>{PK.g=b.dataset.v;PK.eq=[];$('#pkgc').innerHTML=grChips(PK.g,'pkg');$('#pkr').innerHTML=pkBody()};
A.pkeq=(i,b)=>{PK.eq=b.dataset.v;$('#pkr').innerHTML=pkBody()};
U.pks=v=>{PK.q=v;$('#pkr').innerHTML=pkBody()};

/* — manejadores de esta función (registros A / C / U) — */
A.pc=(i,b)=>{AD.cat=b.dataset.v;sh(pkUI())};
A.px=i=>{const d=S.plan[S.sel],e=EX.concat(S.cx)[i];d.ex.push(nwx(e.n));if(d.n=='Descanso')d.n='Entreno';sv();sh();R()};
A.nx=()=>{const n=$('#xn').value.trim();if(!n)return;S.cx.push({n,c:zCat(PK.g),g:'Propio',t:'Personalizado',p:[],s:[],q:'Otro'});S.plan[S.sel].ex.push(nwx(n));sv();sh();R()};
