/* ═══ workout/resume ═══
   Reanudar un entreno interrumpido (estado en curso guardado).
   Define: ZK, ZRS, wsv, rsSync, zbn, zrDrop  · acciones/registros: 3
*/
const ZK=Store.K.wip;
let ZRS=null;
const wsv=()=>{try{if(W)Store.set(ZK,JSON.stringify({W,d:S.plan[S.sel],sel:S.sel,wk:S.wk,pb:!!S.pbk,t:Date.now()}));else if(!ZRS)Store.del(ZK)}catch(e){}};
const rsSync=()=>{if(W)ZRS=null};
A.zres=()=>{const z=ZRS;ZRS=null;if(!z)return;S.sel=z.sel;S.wk=z.wk;if(z.pb){S.pbk={sel:z.sel,day:S.plan[z.sel]};S.plan[z.sel]=z.d}W=z.W;W.t0+=Date.now()-z.t;W.re=0;W.p=0;W.lb=0;W.ri=null;sv();try{zlk2()}catch(e){}R();scrollTo(0,0)};
A.zrd=()=>{sh();ZRS=null;try{Store.del(ZK)}catch(e){}R()};
A.zrq=()=>zcf('¿Descartar el entreno en curso?','Se perderán las series de esa sesión.','zrd','Descartar');
const zbn=()=>{if(!ZRS||W)return '';const t=ZRS,n=t.W.x.reduce((a,b)=>a+b.length,0),o=t.W.x.reduce((a,b)=>a+b.filter(x=>x.ok).length,0);return '<div class="cd" style="border-color:var(--a2)"><small style="color:var(--a1);font-weight:700;letter-spacing:.1em">ENTRENO EN CURSO</small><div style="font-size:19px;font-weight:700;margin:4px 0 2px">'+X(t.d.n)+'</div><div class="mu" style="margin-bottom:12px">'+o+' de '+n+' series completadas</div><div class="g2"><button data-a="zrq">Descartar</button><button class="pr" data-a="zres">Reanudar</button></div></div>'};
const zrDrop=()=>{ZRS=null;try{Store.del(ZK)}catch(e){}};
