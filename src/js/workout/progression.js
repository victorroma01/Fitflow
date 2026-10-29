/* ═══ workout/progression ═══
   Sugerencias de progresión y autorrelleno de series.
   Define: zsf, zfill, pgs, sgBox, zlv2  · acciones/registros: 1
*/
const zsf=(e,s)=>{const U=uX(e),w=ffDW(s[1]),x=(s[3]==1?' (drop)':'')+(+s[2]>0?' @'+s[2]:'');return U?s[0]+' '+U+(s[1]>0?' · '+w+' '+ffUL():'')+x:s[0]+' × '+w+' '+ffUL()+x};
function zfill(e,a){const h=lh(e),U=uX(e),r=tgX(e),lo=r[0],hi=r[1],P=pgs(e);a.forEach((q,j)=>{if(q.ok)return;const l=h&&h.s.length?h.s[Math.min(j,h.s.length-1)]:null;if(U){q.r=hi;if(l&&l[1]>0)q.w=l[1];return}if(P){if(P.nw>0)q.w=P.nw;q.r=P.up||P.dn?lo:Math.min(hi,(+l[0]||lo-1)+1)}else{q.r=lo;if(l&&l[1]>0)q.w=l[1]}})}
function pgs(e){const h=lh(e);if(!h||!h.s.length||uX(e))return null;const ss=h.s.filter(x=>x[3]!=1);if(!ss.length)return null;
 const r=tgX(e),lo=r[0],hi=r[1],w=Math.max(...ss.map(x=>+x[1]||0)),rp=ss.map(x=>+x[2]||0).filter(x=>x>0),ra=rp.length?rp.reduce((a,b)=>a+b,0)/rp.length:0;
 const full=w>0&&ss.every(x=>x[0]>=hi&&x[1]>0),low=!full&&w>0&&ss.every(x=>x[0]<lo&&x[1]>0),dl=dlOn(S.wk);
 let up=full,dn=low,why='';if(up&&ra>=9.5){up=false;why='rpe'}
 if(dl){up=false;dn=false;why='dl'}
 const heavy=stpX(e)==5;let nw=w;
 if(ffLb()){const wl=ffDW(w);nw=up?ffUW(Math.round((wl+(heavy?10:5))/2.5)*2.5):dn?ffUW(Math.round(wl*.92/5)*5):w}
 else nw=up?rnd5(w+stpX(e)):dn?rnd5(w*.92):w;
 return{lo,hi,w,up,dn,nw,ra,why}}
const sgBox=(e,i,P)=>{if(!W||!P||!W.x[i])return '';const u=ffUL(),wv=ffDW(P.w),nv=ffDW(P.nw);let t;
 if(P.why=='dl')t='Descarga: '+wv+' '+u+', 3-4 reps en reserva';
 else if(P.up)t='sube a '+nv+' '+u+' (hiciste '+P.hi+' reps en todas)';
 else if(P.dn)t='baja a '+nv+' '+u+' (no llegaste a '+P.lo+' reps)';
 else if(P.why=='rpe')t='mantén '+wv+' '+u+' (RPE '+(Math.round(P.ra*10)/10)+' la última vez)';
 else t='mantén '+wv+' '+u+' y busca 1 rep más hasta '+P.hi;
 const dif=W.x[i].some(s=>!s.ok&&s.t!=1&&Math.abs((+s.w||0)-P.nw)>1e-6);
 return '<div class="sgb"><span><b>Sugerido</b> · '+t+'</span>'+(dif?'<button class="chip" data-a="sgap" data-i="'+i+'">Aplicar</button>':'')+'</div>'};
A.sgap=i=>{const e=S.plan[S.sel].ex[i];if(!e||!W.x[i])return;zfill(e,W.x[i].filter(s=>s.t!=1));R()};
const zlv2=(e,i)=>{const h=lh(e);if(!h||!h.s.length)return '';const U=uX(e),P=pgs(e);
 return '<div class="mu" style="font-size:12px">Última vez: '+h.s.map(x=>U?x[0]+' '+U:x[0]+'×'+(x[1]?ffDW(x[1]):'–')+(x[3]==1?' (drop)':'')).join(' · ')+'</div>'+sgBox(e,i,P)};
