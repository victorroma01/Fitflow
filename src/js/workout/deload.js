/* ═══ workout/deload ═══
   Semana de descarga.
   Define: dlCad, dlOn, dlWeekSync, dlQ, dlCard  · acciones/registros: 4
*/
const dlCad=()=>({ini:6,int:5,ava:4})[S.lv||'int']||5;
const dlOn=wk=>S.dl&&S.dl[wk]!=null?!!S.dl[wk]:(wk>1&&wk%dlCad()==0);
const dlWeekSync=()=>{if(S.wk<ffLW){S.dl={};S.dq={}}ffLW=S.wk};
const dlQ=()=>{const l=S.logs.filter(x=>!x.k).slice(-2);return l.length==2&&l.every(x=>+x.q>=9)};
const dlCard=()=>{const on=dlOn(S.wk),L=LVN&&LVN[S.lv||'int']?LVN[S.lv||'int'].toLowerCase():'intermedio';
 if(on)return '<div class="cd dlc"><b>Semana de descarga</b><div class="mu" style="font-size:13px;margin-top:4px">Esta semana haces la mitad de series, sin subir el peso y con 3-4 repeticiones en reserva. Se aplica solo al empezar cada entreno. Nivel '+L+': descarga cada '+dlCad()+' semanas.</div><button data-a="dloff" style="margin-top:10px;width:100%">Hacer la semana normal</button></div>';
 if(S.wk>1&&dlQ()&&!(S.dq&&S.dq[S.wk]))return '<div class="cd dlc"><b>Esfuerzo muy alto</b><div class="mu" style="font-size:13px;margin-top:4px">Tus dos últimos entrenos han salido con RPE 9 o más. Una semana de descarga ayuda a recuperar y a seguir progresando.</div><div class="g2" style="margin-top:10px"><button data-a="dlno">Ahora no</button><button class="pr" data-a="dlon">Activar descarga</button></div></div>';
 return ''};
A.dlon=()=>{S.dl=S.dl||{};S.dl[S.wk]=1;sv();R()};
A.dloff=()=>{S.dl=S.dl||{};S.dl[S.wk]=0;sv();R()};
A.dlno=()=>{S.dq=S.dq||{};S.dq[S.wk]=1;sv();R()};
A.dlon2=()=>{A.dlon();sh();zt('Semana de descarga activada')};
