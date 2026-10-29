/* ═══ programs/levels ═══
   Niveles de programa (aplicar, variantes, selector).
   Define: lvOk, lvR5, lvDay, lvPlan, lvSig, lvCur, lvAct, lvGen, lvEdited, lvWk, lvDot, lvVars, LVO, PVL, LVP, lvPill, … (+4)  · acciones/registros: 5
*/
const lvOk=v=>LVK.includes(v);
const lvR5=x=>Math.max(5,Math.round(x/5)*5);
const lvDay=(d,lv)=>{
  if(!d.ex.length)return{n:d.n,ex:[]};
  const src=d.ex.map(e=>({...e,rg:e.rg?e.rg.slice():e.rg})),sw=LVS[lv]||{};let ex=[];
  src.forEach(e=>{const r=sw[e.n];if(r){if(src.some(x=>x!==e&&x.n==r)||ex.some(x=>x.n==r)){if(lv=='ini')return;ex.push(e);return}e.n=r;e.sw=1}ex.push(e)});
  if(lv=='ini')ex=ex.slice(0,6);
  ex.forEach((e,i)=>{
    const u=e.u,rg=e.rg;
    if(lv=='ini'){
      if(u){if(e.s>=4)e.s=Math.max(2,e.s-2);else if(e.s==3)e.s=2;if(rg&&(u=='min'||u=='s'||u=='cal'))e.rg=[lvR5(rg[0]*.7),lvR5(rg[1]*.7)]}
      else{e.s=Math.max(2,i<3?Math.min(e.s,3):Math.min(e.s,2));if(rg&&rg[0]<8)e.rg=[8,Math.min(12,Math.max(rg[1],10))]}
      if(e.r>120)e.r=120;delete e.b
    }else if(lv=='ava'){
      if(u){if(u=='min'){if(rg)e.rg=[lvR5(rg[0]*1.25),lvR5(rg[1]*1.25)]}else if(e.s>=2)e.s=Math.min(10,e.s+(e.s>=6?2:1))}
      else{if(i<3)e.s=Math.min(5,e.s+1);if(i<2&&rg&&rg[1]>rg[0]&&rg[0]<=8&&rg[1]<=10){const lo=Math.max(3,rg[0]-1);e.rg=[lo,Math.max(lo+2,rg[1]-2)]}if(e.r>=120)e.r=Math.min(240,e.r+30)}
    }
  });
  if(lv=='ava'&&ex.length>=5){const a=ex.length-2,c=ex.length-1;if(!ex[a].u&&!ex[c].u&&ex[a].b==null&&ex[c].b==null){const m=Math.max(0,...ex.map(x=>x.b||0))+1;ex[a].b=ex[c].b=m}}
  ex.forEach(e=>{if(e.sw){const o=LVOV[e.n];if(o)Object.assign(e,o,o.rg?{rg:o.rg.slice()}:{});delete e.sw}});
  const cnt={};ex.forEach(e=>{if(e.b!=null)cnt[e.b]=(cnt[e.b]||0)+1});ex.forEach(e=>{if(e.b!=null&&cnt[e.b]<2)delete e.b});
  return{n:d.n,ex}
};
const lvPlan=(pl,lv,id)=>{
  if(!lvOk(lv)||lv=='int')return pl;
  const tx=pl.map(d=>lvDay(d,lv)),L=(LVL[id]||{})[lv];
  if(!L)return tx;
  return L.map(k=>k===-1?{n:'Descanso',ex:[]}:typeof k=='string'?parseB(LVX[k])[0]:tx[k])
};
const lvSig=pl=>JSON.stringify(pl.map(d=>[d.n,d.ex.map(e=>[e.n,e.s,e.rg||0,e.u||0,e.r||0,e.b||0])]));
const lvCur=()=>S.cpi>=0?S.cp[S.cpi]:null;
const lvAct=()=>S.cpi<0||!!(lvCur()&&lvCur().o);
const lvGen=(v)=>{const p=lvCur();if(p)return p.o?cpGen({...p.o,niv:v,vr:p.o.vr||0}):null;return lvPlan(parse(S.prog),v,S.prog)};
const lvEdited=()=>{try{const g=lvGen(S.lv);return !g||lvSig(g)!=lvSig(S.plan)}catch(e){return true}};
const lvWk=()=>Object.keys(S.done||{}).some(k=>k.indexOf(S.wk+'-')==0&&S.done[k]);
const lvDot=v=>'<i class="lvd" style="--lc:'+LVC[v]+';--ld:'+LVC[v]+'38"></i>';
const lvVars=v=>'--lc:'+LVC[v]+';--lb:'+LVC[v]+'24;--lr:'+LVC[v]+'6b';
let LVO=false,PVL=null,LVP=null;
const lvPill=()=>{if(!lvAct())return '';const v=lvOk(S.lv)?S.lv:'int';
  return '<div class="lvw" style="'+lvVars(v)+'"><button class="lvp" data-a="lvo" aria-haspopup="menu" aria-expanded="'+(LVO?'true':'false')+'" aria-label="Nivel del programa: '+LVN[v]+'">'+lvDot(v)+'<span>'+LVN[v]+'</span><span class="lvc">▾</span></button>'+
  (LVO?'<div class="lvb" data-a="lvx"></div><div class="lvm" role="menu">'+LVK.map(k=>'<button class="lvi'+(k==v?' on':'')+'" data-a="lvs" data-v="'+k+'" role="menuitem" style="'+lvVars(k)+'">'+lvDot(k)+'<span><b>'+LVN[k]+'</b><small class="mu">'+LVD[k]+'</small></span>'+(k==v?'<em>✓</em>':'')+'</button>').join('')+'</div>':'')+'</div>'};
A.lvo=()=>{LVO=!LVO;R()};
A.lvx=()=>{LVO=false;R()};
const lvApply=v=>{
  try{
    const p=lvCur();let np;
    if(p){if(!p.o)return;const o={...p.o,niv:v};np=cpGen({...o,vr:o.vr||0});p.o=o;p.plan=cpClone(np);S.plan=cpClone(np)}
    else{np=lvPlan(parse(S.prog),v,S.prog);S.plan=np}
    zrDrop();S.lv=v;S.sel=0;Object.keys(S.done||{}).forEach(k=>{if(k.indexOf(S.wk+'-')==0)delete S.done[k]});
    sv();sh();R();zt('Nivel '+LVN[v].toLowerCase()+': programa reorganizado')
  }catch(e){zt('No se pudo cambiar el nivel');R()}
};
A.lvs=(i,b)=>{
  const v=b&&b.dataset?b.dataset.v:'';LVO=false;
  if(!lvOk(v)||v==S.lv){R();return}
  if(W){R();zt('Termina o descarta el entreno en curso');return}
  LVP=v;const ed=lvEdited(),dn=lvWk(),zr=!!ZRS;
  if(ed||dn||zr){R();zcf('Cambiar a nivel '+LVN[v].toLowerCase(),'Se reorganizarán los días del programa para el nivel '+LVN[v].toLowerCase()+'.'+(ed?' Perderás los cambios que hayas hecho a mano en los días.':'')+(dn?' Se reiniciará el progreso de esta semana.':'')+(zr?' Se descartará el entreno pausado.':''),'lvc','Cambiar')}
  else lvApply(v)
};
A.lvc=()=>{if(lvOk(LVP))lvApply(LVP)};
const lvSeg=()=>'<div class="lvs">'+LVK.map(k=>'<button class="'+(k==PVL?'on':'')+'" data-a="pvl" data-v="'+k+'" style="'+lvVars(k)+'">'+lvDot(k)+'<span>'+LVN[k]+'</span></button>').join('')+'</div><p class="mu lvn">'+LVT[PVL]+'</p>';
A.pvl=(i,b)=>{const v=b&&b.dataset?b.dataset.v:'';if(lvOk(v))PVL=v;A.pv(PGI)};
const lvTag=v=>'<span class="lvt">'+lvDot(v)+LVN[v]+'</span>';
const lvRow=(n,tag)=>'<span class="pgr"><b style="font-size:17px">'+X(n)+'</b>'+tag+'</span>';
