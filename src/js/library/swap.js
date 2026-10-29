/* ═══ library/swap ═══
   Cambiar un ejercicio por otro (swap) y deshacer.
   Define: swapExercise, SW, swCand, swTiers, swBody, swHead  · acciones/registros: 6
*/
const swapExercise=(i,b)=>{const nn=b.dataset.n,d=S.plan[S.sel].ex,old=d[i].n,ch=e=>{e.o=e.o||e.n;e.n=nn};if(b.dataset.v=='1')S.plan.forEach(dy=>dy.ex.forEach(e=>{if(e.n==old)ch(e)}));else ch(d[i]);if(W&&W.x[i])W.x[i].forEach(s=>{if(!s.ok)s.w=S.last[nn]||''});sv();sh();R()};
A.zun=i=>{const e=S.plan[S.sel].ex[i],o=e.o,c=e.n;if(!o)return;S.plan.forEach(dy=>dy.ex.forEach(x=>{if(x.o==o&&x.n==c){x.n=o;delete x.o;if(x.ou){if(x.ou.u)x.u=x.ou.u;else delete x.u;if(x.ou.rg)x.rg=x.ou.rg;else delete x.rg;delete x.ou}}}));W.x[i].forEach(s=>{if(!s.ok)s.w=S.last[o]||''});zfill(S.plan[S.sel].ex[i],W.x[i]);sv();R()};
let SW={i:0,q:'',eq:[],all:0};
const swCand=c=>{const inDay=new Set(S.plan[S.sel].ex.map(x=>x.n)),q=SW.q.trim();return exAll().filter(e=>e.n!=c.n&&!inDay.has(e.n)&&(!q||exHay(e).includes(q)))};
const swTiers=(c,l)=>{const cp=c.p||[],cs=c.s||[],cg=gk(c),t0=[],t1=[],t2=[],t3=[];l.forEach(e=>{const sc=2*inter(cp,e.p||[])+inter(cp,e.s||[])+inter(cs,e.p||[]),g=gk(e);if(g==cg&&c.t&&c.t!='Otros'&&e.t==c.t)t0.push([sc,e]);else if(g==cg)(inter(cp,e.p||[])?t1:t2).push([sc,e]);else if(e.c==c.c&&sc>0&&inter(cp.concat(cs),e.p||[])>0)t3.push([sc,e])});
const so=a=>a.sort((x,y)=>y[0]-x[0]||exK(x[1])-exK(y[1])).map(x=>x[1]);return [['Mismo enfoque',so(t0)],['Mismo grupo muscular',so(t1).concat(so(t2))],['Músculos relacionados',so(t3).slice(0,SW.q?40:10)]]};
const swBody=()=>{const cur=S.plan[S.sel].ex[SW.i],c=exAll().find(x=>x.n==cur.n)||{n:cur.n,p:[],s:[]},cand=swCand(c),eqs=eqOf(cand),l=cand.filter(e=>eqOk(SW.eq,e)),T=swTiers(c,l);let h=eqDD('sw',SW.eq,eqs,cand);
T.forEach(t=>{if(!t[1].length)return;h+='<div class="ph">'+t[0]+' · '+t[1].length+'</div>'+t[1].slice(0,SW.q?60:t[0]=='Mismo enfoque'?30:14).map(e=>'<div class="it exr" data-a="zsd" data-i="'+SW.i+'" data-n="'+X(e.n)+'" style="cursor:pointer"><span class="exc">'+exTx(e)+'</span><small class="mu">Elegir ›</small></div>').join('')});
return h||'<p class="mu">No hay alternativas con esos filtros.</p>'};
const swHead=()=>['Este día','Todo el programa'].map((x,i)=>'<button class="chip'+(!!SW.all==!!i?' on':'')+'" data-a="swsc" data-i="'+i+'">'+x+'</button>').join('');
A.zsw=i=>{SW={i,q:'',eq:[],all:0};EQD.sw=0;const e=S.plan[S.sel].ex[i];sh('<h3>Swap</h3><p class="mu" style="margin:-4px 0 8px">Sustituir «'+X(e.n)+'» por otra opción. Primero verás las más parecidas.</p><div id="swh">'+swHead()+'</div><input placeholder="Buscar alternativa" data-u="sws" style="margin-top:8px"><div id="swb">'+swBody()+'</div>')};
A.swsc=i=>{SW.all=i;$('#swh').innerHTML=swHead()};
A.sweq=(i,b)=>{SW.eq=b.dataset.v;$('#swb').innerHTML=swBody()};
U.sws=v=>{SW.q=v.toLowerCase();$('#swb').innerHTML=swBody()};
A.zsd=(i,b)=>{const nn=b.dataset.n;b.dataset.v=SW.all?'1':'0';swapExercise(i,b);zfx(nn);if(W&&W.x[i])zfill(S.plan[S.sel].ex[i],W.x[i]);R()};
