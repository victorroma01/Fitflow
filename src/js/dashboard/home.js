/* ═══ dashboard/home ═══
   Pestaña Dashboard: tarjetas de resumen.
   Define: DB0, prCard, wkMon, wkStats, wkCard, DB
*/
function DB0(){const lg=S.logs,now=new Date(),wkc=lg.filter(l=>(now-new Date(l.d))<7*864e5).length,vol=lg.reduce((s,l)=>s+l.v,0),last=lg.filter(l=>!l.k).slice(-8),mx=Math.max(1,...last.map(l=>l.v));
return '<div class="hd"><h1>Dashboard</h1><button data-a="zwv" style="padding:8px 12px">'+ic('dash',24)+'</button></div><div class="g2" style="margin-top:12px"><div class="cd"><b style="font-size:26px">'+lg.length+'</b><br><small>Entrenos totales</small></div><div class="cd"><b style="font-size:26px">'+wkc+'</b><br><small>Últimos 7 días</small></div><div class="cd"><b style="font-size:26px">'+ffVT(vol)+'</b><br><small>Volumen total</small></div><div class="cd"><b style="font-size:26px">'+Z(sum((S.meals[dk(now)]&&Object.values(S.meals[dk(now)]).flat()||[]).map(T))[0])+'</b><br><small>kcal hoy</small></div></div><div class="cd"><b>Volumen por sesión</b><div style="display:flex;align-items:flex-end;gap:6px;height:90px;margin-top:8px">'+(last.length?last.map(l=>'<div style="flex:1;background:var(--ac);border-radius:4px;height:'+Math.max(6,l.v/mx*100)+'%"></div>').join(''):'<small>Completa un entreno para ver tu progreso.</small>')+'</div></div><div class="cd">'+calUI()+'</div>'}
const prCard=()=>{const ks=new Set(Object.keys(S.pr||{}).concat(Object.keys(S.hist||{}))),l=[...ks].map(n=>[n,prOf(n)]).filter(x=>x[1]).sort((a,b)=>b[1].e-a[1].e).slice(0,6);return '<div class="cd"><b>Récords personales</b>'+(l.length?l.map(x=>'<div class="it" style="grid-template-columns:1fr auto"><span>'+X(x[0])+'<br><small>'+x[1].d+'</small></span><span style="text-align:right"><b>'+ffDW(x[1].w)+' '+ffUL()+' × '+x[1].r+'</b><br><small>1RM est. '+Z(ffDW(x[1].e))+' '+ffUL()+'</small></span></div>').join(''):'<p class="mu" style="margin:8px 0 0">Aquí aparecerán tus mejores marcas cuando registres pesos.</p>')+'</div>'};
const wkMon=d=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x};
const wkStats=()=>{
  const now=new Date(),m0=wkMon(now),cnt={},day={};
  (S.logs||[]).forEach(l=>{if(!l||typeof l.d!='string')return;const t=new Date(l.d+'T12:00:00');if(isNaN(t))return;const k=dk(wkMon(t));cnt[k]=(cnt[k]||0)+1;day[l.d]=1});
  const g=Math.max(1,(S.plan||[]).filter(d=>d.ex.length).length),t=g>=4?g-1:g,
  at=k=>new Date(m0.getFullYear(),m0.getMonth(),m0.getDate()-7*k),wk=k=>cnt[dk(at(k))]||0;
  let st=wk(0)>=t?1:0,k=1;while(k<600&&wk(k)>=t){st++;k++}
  let best=0,run=0;const ks=Object.keys(cnt).sort();
  if(ks.length){const n=Math.min(600,Math.max(0,Math.round((m0-new Date(ks[0]+'T12:00:00'))/6048e5)));for(let i=n;i>=0;i--){if(wk(i)>=t){run++;best=Math.max(best,run)}else if(i>0)run=0}}
  const dots=[...Array(7)].map((_,i)=>{const d=new Date(m0.getFullYear(),m0.getMonth(),m0.getDate()+i);return{l:'LMXJVSD'[i],on:!!day[dk(d)],td:dk(d)==dk(now),fu:d>now&&dk(d)!=dk(now)}});
  return{c:wk(0),g,t,st,best:Math.max(best,st),dots,any:!!ks.length}
};
const wkCard=()=>{const s=wkStats();
  return '<div class="cd wkc"><div class="row"><b>Esta semana</b><small>'+s.c+' de '+s.g+(s.g==1?' entreno':' entrenos')+'</small></div>'+
  '<div class="wkd">'+s.dots.map(d=>'<span class="'+(d.on?'on ':'')+(d.td?'td ':'')+(d.fu?'fu':'')+'"><i></i>'+d.l+'</span>').join('')+'</div>'+
  '<div class="wks"><div><b>'+s.st+'</b><small>'+(s.st==1?'semana de racha':'semanas de racha')+'</small></div><div><b>'+s.best+'</b><small>mejor racha</small></div></div>'+
  '<small class="mu wkn">'+(s.any?'La semana cuenta con '+s.t+' o más entrenos.':'Completa tu primer entreno para empezar la racha.')+'</small></div>'};
function DB(){const h=DB0()+prCard(),m='<div class="cd"><b>Volumen por sesión</b>';return (h.indexOf(m)>=0?h.replace(m,wkCard()+m):h+wkCard())+f2StzCard()+f2CdCard()+pgCard()+prTl()+bkWarn()}
