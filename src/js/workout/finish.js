/* ═══ workout/finish ═══
   Fin del entreno: récords, historial, registro del día e instantánea.
   Define: ZPR, wkLog, wkHistory, prOf, wkPRs, FFS, wkSnap  · acciones/registros: 3
*/
let ZPR=[];
const wkLog=()=>{const d=S.plan[S.sel];let v=0,n=0;W.x.forEach((a,i)=>a.forEach(s=>{if(s.ok){n++;v+=uX(d.ex[i])?0:s.r*s.w;if(s.w)S.last[d.ex[i].n]=s.w}}));if(n){S.logs.push({d:dk(new Date),n:d.n,v,s:n,m:Z((Date.now()-W.t0)/6e4),q:avgQ(),dl:W.dl?1:0});S.done[S.wk+'-'+S.sel]=1}W=null;sv();R()};
const wkHistory=()=>{const d=S.plan[S.sel],dt=dk(new Date);S.hist=S.hist||{};ZPR=[];W.x.forEach((a,i)=>{const n=d.ex[i].n,h=S.hist[n]||[],pb=Math.max(0,...h.flatMap(x=>x.s.map(y=>+y[1]||0))),m=Math.max(0,...a.filter(q=>q.ok).map(q=>+q.w||0));if(pb>0&&m>pb)ZPR.push(n)});W.x.forEach((a,i)=>{const l=a.filter(s=>s.ok).map(s=>[s.r,s.w||0,s.q||0,s.t||0]);if(l.length){const n=d.ex[i].n,h=S.hist[n]=S.hist[n]||[];h.unshift({d:dt,s:l});if(h.length>60)h.length=60}})};
A.end=()=>zcf('¿Guardar el entreno?','Se registrarán las series completadas en tu historial.','zend','Guardar y salir');
A.zdis=()=>zcf('¿Salir sin guardar?','Se perderán las series de este entreno.','zdc','Salir y descartar');
const prOf=n=>{let b=(S.pr||{})[n]||null;((S.hist||{})[n]||[]).forEach(x=>x.s.forEach(q=>{const r=+q[0],w=+q[1];if(w>0&&(!b||e1(w,r)>b.e+1e-6))b={w,r,e:e1(w,r),d:x.d}}));return b};
const wkPRs=()=>{try{if(W){const d=S.plan[S.sel];S.pr=S.pr||{};W.x.forEach((a,i)=>{const n=d.ex[i].n;a.forEach(s=>{const w=+s.w||0;if(s.ok&&w>0&&!uX(d.ex[i])){const e=e1(w,+s.r),c=S.pr[n];if(!c||e>c.e)S.pr[n]={w,r:+s.r,e,d:dk(new Date)}}})})}}catch(x){}};
let FFS=null;
const wkSnap=()=>{let sn=null;
 try{if(W){const d=S.plan[S.sel];
  sn={n:d.n,dt:dk(new Date),ex:d.ex.map((e,i)=>{const a=(W.x[i]||[]).filter(s=>s.ok),h=(S.hist||{})[e.n]||[];let pw=0,pe=0;
   h.forEach(x=>(x&&Array.isArray(x.s)?x.s:[]).forEach(q=>{const w=+q[1]||0,r=+q[0]||0;if(w>0){pw=Math.max(pw,w);pe=Math.max(pe,e1(w,r))}}));
   return{n:e.n,u:!!uX(e),sets:a.map(s=>[+s.r||0,+s.w||0]),pw,pe}}).filter(e=>e.sets.length),pv:null,old:[]};
  for(let i=S.logs.length-1;i>=0;i--){const l=S.logs[i];if(l&&!l.k&&l.n==d.n){if(!sn.pv)sn.pv=l;sn.old.push(l)}}}}catch(e){sn=null}
 return sn};
A.zend=()=>{FFS=wkSnap();const n0=S.logs.length;
 wkPRs();
 const one=S.pbk,k=S.wk+'-'+S.sel,had=S.done[k],n1=S.logs.length;
 sh();wkHistory();wkLog();
 if(one&&!had)delete S.done[k];if(S.logs.length>n1)setTimeout(f2Sum,50);
 pbr();sv();R();
 if(S.logs.length>n0){try{S.pc=(S.pc||0)+(Array.isArray(ZPR)?ZPR.length:0)}catch(e){}}};
