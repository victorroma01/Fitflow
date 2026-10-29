/* ═══ core/render ═══
   Render principal R() y cambio de pestaña.
   Define: LT, R  · acciones/registros: 1
*/
let LT=-1;
function R(){glSync();dlWeekSync();rsSync();const od=[...document.querySelectorAll('#app details')].map(d=>d.open);$('#app').innerHTML=W?WS():zOV?zov():zWV&&S.tab==2?zwv():[WO,NU,DB,PF][S.tab]();if(LT==S.tab)document.querySelectorAll('#app details').forEach((d,i)=>d.open=!!od[i]);LT=S.tab;document.querySelectorAll('nav button').forEach((b,i)=>b.classList.toggle('on',i==S.tab));$('nav').style.display=W||zOV?'none':'flex';wsv();upSync()}
A.tab=(i,b)=>{LVO=false;S.tab=i;VW=0;R()};
