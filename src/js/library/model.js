/* ═══ library/model ═══
   Modelo de ejercicios: lista completa, músculos, filas y orden.
   Define: zgx, inter, exAll, exK, exM, exHay, exSub, exMus, exTx, exRow, exSort, zCat
*/
const zgx=n=>{const e=EX.concat(S.cx).find(x=>x.n==n);return e?gk(e):'Propio'};
const inter=(a,b)=>a.filter(x=>b.includes(x)).length,exAll=()=>EX.concat(S.cx),exK=e=>e.k==null?9999:e.k;
const exM=(e,k)=>(e[k]||[]).map(c=>MU[c]).filter(Boolean);
const exHay=e=>(e.n+' '+(e.t||'')+' '+(e.q||'')+' '+exM(e,'p').concat(exM(e,'s')).join(' ')).toLowerCase();
const exSub=e=>X((e.q||'Personalizado')+(e.t&&e.t!='Otros'?' · '+e.t:''));
const exMus=e=>(exM(e,'p').length?'<small style="color:var(--a1)">Principal: '+X(exM(e,'p').join(', '))+'</small>':'')+(exM(e,'s').length?'<br><small class="mu">Secundarios: '+X(exM(e,'s').join(', '))+'</small>':'');
const exTx=e=>'<i class="exth">'+anEx(e.n,48)+'</i><span class="ext"><b>'+X(e.n)+'</b><br><small>'+exSub(e)+'</small><br>'+exMus(e)+'</span>';
const exRow=(o,btn,act)=>'<div class="it exr"><span class="exc" data-a="'+(act||'exd')+'" data-i="'+o.i+'">'+exTx(o.e)+'</span>'+btn+'</div>';
const exSort=(a,b)=>GR.indexOf(gk(a))-GR.indexOf(gk(b))||exK(a)-exK(b);
const zCat=g=>['CrossFit','Hyrox','Funcional','Cardio'].includes(g)?g:'Culturismo';
