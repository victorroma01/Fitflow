/* ═══ workout/warmup ═══
   Series de calentamiento.
   Define: zhv, wup  · acciones/registros: 1
*/
const zhv=e=>{const x=exAll().find(y=>y.n==e.n);return x&&['Barra','Smith'].includes(x.q)&&CP.test(e.n)&&!/Hip thrust/i.test(e.n)};
const wup=(e,i)=>{const d=S.plan[S.sel];if(!W||!zhv(e)||d.ex.findIndex(zhv)!=i||W.x[i].some(s=>s.ok))return '';
 const w=+W.x[i][0].w||0;if(!w)return '<div class="mu" style="font-size:12px">Calentamiento: 2-3 series de aproximación al 50 %, 70 % y 85 % de tu peso de trabajo</div>';
 const lb=ffLb(),wl=ffDW(w),bar=lb?45:20,rd=v=>lb?Math.max(bar,Math.round(v/5)*5):Math.max(bar,Math.round(v/2.5)*2.5);
 let st=[];if(wl>=bar*3)st.push([bar,10]);st.push([rd(wl*.5),8],[rd(wl*.7),5],[rd(wl*.85),2]);
 st=st.filter((x,k)=>!k||x[0]!=st[k-1][0]);W.wu=W.wu||{};
 return '<div class="wup"><span>Calentamiento</span>'+st.map((x,k)=>'<button class="chip'+(W.wu[i+'_'+k]?' on':'')+'" data-a="wuk" data-i="'+i+'" data-k="'+k+'">'+x[1]+' × '+x[0]+' '+ffUL()+'</button>').join('')+'</div>'};
A.wuk=(i,b)=>{W.wu=W.wu||{};const k=i+'_'+b.dataset.k;if(W.wu[k])delete W.wu[k];else W.wu[k]=1;R()};
