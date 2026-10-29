/* ═══ workout/targets ═══
   Unidades, repeticiones objetivo, duración y volumen semanal.
   Define: zrp, uD, uX, tgX, ULB, ULH, rpx, ulh, ulb, rirX, tmd, lh, stpX, rnd5, zfx, nwx, … (+7)  · acciones/registros: 1
*/
const zrp=n=>/sentadilla|press banca|peso muerto|press militar|remo con barra|dominadas|fondos|hip thrust|prensa/i.test(n)?8:/curl|extensi|elevaciones|aperturas|pájaros|gemelo|patada|abducci|face pull|crunch|encogimientos|muñeca/i.test(n)?12:10;
const uD=n=>{const m=String(n).match(/(\d+(?:[.,]\d+)?)\s*(km|m)\b/i);if(m){const v=+m[1].replace(',','.')*(m[2].toLowerCase()=='km'?1000:1);return{u:'m',rg:[v,v]}}
if(/^(Carrera continua|Rodaje|Trote|Bicicleta|Cinta|Elíptica|Caminata|Remo continuo|Natación)/i.test(n)){const z=/largo/i.test(n)?60:/zona 2|suave/i.test(n)?45:/Tabata|intervalos/i.test(n)?20:30;return{u:'min',rg:[z,z]}}
if(/Plancha|Hollow hold|Dead hang|Wall sit|Farmers hold/i.test(n))return{u:'s',rg:[40,40]};return null};
const uX=e=>{if(e.u)return e.u;if(e.rg)return '';const d=uD(e.n);return d?d.u:''};
const tgX=e=>{if(e.rg)return e.rg;const d=uD(e.n);if(d)return d.rg;const t=zrp(e.n);return t==8?[6,10]:t==12?[10,15]:[8,12]};
const ULB={m:'Metros',s:'Segundos',min:'Minutos',cal:'Calorías',km:'Km'},ULH={m:'Dist.',s:'Seg',min:'Min',cal:'Cal',km:'Km'};
const rpx=e=>{const U=uX(e),r=tgX(e);return(r[0]==r[1]?r[0]:r[0]+'-'+r[1])+(U?' '+U:' reps')};
const ulh=e=>uX(e)?ULH[uX(e)]||'Reps':'Reps',ulb=e=>uX(e)?ULB[uX(e)]||'Reps':'Reps';
const rirX=e=>CP.test(e.n)?'1-2':/Elevaciones|Aperturas|Cruce|Pájaros|Face pull|Extensi|Curl|Patada|Gemelo|Encogim|Crunch/i.test(e.n)?'0-1':'1-2';
const tmd=e=>{if(e.t)return e.t;if(uX(e))return '';const n=e.n;if(/swing|thruster|wall ball|burpee|box jump|snatch|clean|push press|salto/i.test(n))return '1/0/X/0';if(/Gemelo|Elevaciones laterales|Cruce|Aperturas|Pájaros|Face pull/i.test(n))return '2/2/2/0';if(CP.test(n)&&!/Hip thrust/i.test(n))return '3/0/1/0';return '2/0/2/0'};
const lh=e=>((S.hist||{})[e.n]||[])[0],stpX=e=>/Sentadilla|Peso muerto|Prensa|Hip thrust|Hack/i.test(e.n)?5:2.5,rnd5=x=>Math.round(x*2)/2;
const zfx=nn=>{const nd=uD(nn);S.plan.forEach(dy=>dy.ex.forEach(e=>{if(!e.o||e.n!=nn)return;if(!e.ou)e.ou={u:e.u,rg:e.rg};if(nd){if(e.u!=nd.u||nd.u=='m'){e.u=nd.u;e.rg=nd.rg}}else if(e.u){delete e.u;delete e.rg}}));sv()};
const nwx=n=>{const u=uD(n),o={n,s:u?(u.u=='min'?1:3):3};if(u){o.u=u.u;o.rg=u.rg}else o.rg=tgX({n});return o};
const zdu=d=>{if(!d.ex.length)return 0;let t=300;d.ex.forEach((e,i)=>{const U=uX(e),r=tgX(e),v=(r[0]+r[1])/2,w=U?(U=='m'?(v<=100?45:v/3):U=='s'?v:U=='min'?v*60:v*3):v*3+12;t+=e.s*(w+(zSB(i)?10:rsx(e)))});return Math.max(5,Math.round(t/300)*5)};
const zvw=pl=>{const o={};pl.forEach(d=>d.ex.forEach(e=>{if(uX(e))return;const x=exAll().find(y=>y.n==e.n),g=x?gk(x):'Otros';o[g]=(o[g]||0)+e.s}));return Object.entries(o).sort((a,b)=>b[1]-a[1])};
const zvwh=pl=>'<div class="cd" style="margin:8px 0"><b>Series directas por semana</b><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">'+zvw(pl).map(o=>'<span style="padding:4px 10px;border-radius:12px;background:rgba(128,128,128,.18);font-size:12px">'+X(o[0])+' · '+o[1]+'</span>').join('')+'</div></div>';
const zwh=e=>!uX(e)||/Sled|Farmers|Sandbag|Carry|chaleco|con peso|con balón|arrastre|Lunges/i.test(e.n);
const zob=(e,i)=>{const U=uX(e),p=[];if(e.s>1)p.push('Descanso '+F(zSB(i)?10:rsx(e)));if(!U)p.push('Tempo '+tmd(e));return '<div class="mu">Objetivo: '+e.s+' × '+rpx(e)+(U?'':' · RIR '+rirX(e))+'</div>'+(p.length?'<div class="mu">'+p.join(' · ')+'</div>':'')+wup(e,i)};
const RGO=['3-5','5-8','6-10','8-10','8-12','10-12','10-15','12-15','15-20'];
const rrsel=(e,i)=>{if(uX(e))return '';const c=tgX(e).join('-');return '<select data-c="rg" data-i="'+i+'" style="width:auto;padding:5px 10px;font-size:13px">'+(RGO.includes(c)?RGO:RGO.concat([c])).map(v=>'<option value="'+v+'"'+(v==c?' selected':'')+'>'+v+' reps</option>').join('')+'</select>'};
C.rg=(e,i)=>{const x=S.plan[S.sel].ex[i];if(!x)return;const r=e.value.split('-').map(Number);if(r.length<2)r.push(r[0]);x.rg=r;sv();R()};
