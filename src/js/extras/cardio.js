/* ═══ extras/cardio ═══
   Registro de cardio.
   Define: CDT, CDS, cdLbl, cdPace, cdLb, cdUI, cdRead, cdAll, f2CdCard  · acciones/registros: 4
*/
const CDT=[['run','Carrera'],['walk','Caminata'],['bike','Bici'],['row','Remo'],['swim','Natación'],['ell','Elíptica'],['oth','Otro']];
let CDS={t:'run'};
const cdLbl=t=>(CDT.find(x=>x[0]==t)||CDT[6])[1];
function cdPace(t,km,sec){if(!(km>0&&sec>0))return '';
 if(t=='bike'||t=='ell'||t=='oth')return R1(km/(sec/3600))+' km/h';
 if(t=='row')return f2h(sec/(km*2))+' /500 m';
 if(t=='swim')return f2h(sec/(km*10))+' /100 m';
 return f2h(sec/km)+' /km'}
const cdLb=t=>t=='bike'||t=='ell'||t=='oth'?'Velocidad media':'Ritmo';
function cdUI(){const t=CDS.t,td=dk(new Date);
 return '<h3>Registrar cardio</h3><div>'+CDT.map(x=>'<button class="chip '+(t==x[0]?'on':'')+'" data-a="cdt" data-v="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>'
 +'<label>Fecha</label><input id="f2cdd" type="date" value="'+td+'" max="'+td+'">'
 +'<div class="g2"><div><label>Distancia (km, opcional)</label><input id="f2cdk" type="number" inputmode="decimal" step="0.01" min="0" max="1000" placeholder="0" data-u="cdp"></div><div><label>Tiempo (min y s)</label><div class="g2" style="gap:6px"><input id="f2cdm" type="number" inputmode="numeric" min="0" max="999" placeholder="min" data-u="cdp"><input id="f2cds" type="number" inputmode="numeric" min="0" max="59" placeholder="s" data-u="cdp"></div></div></div>'
 +'<div class="cd" style="margin:12px 0 0;text-align:center"><small id="f2cdl" class="mu">'+cdLb(t)+'</small><br><b id="f2cdr" style="font-size:22px">—</b></div>'
 +'<button class="pr" data-a="cdsv" style="width:100%;margin-top:12px">Guardar</button>'}
function cdRead(){const g=id=>document.getElementById(id),km=f2f(g('f2cdk')&&g('f2cdk').value,0,1000,0),mn=f2n(g('f2cdm')&&g('f2cdm').value,0,999,0),sc=f2n(g('f2cds')&&g('f2cds').value,0,59,0);return{km:Math.round(km*100)/100,sec:mn*60+sc,d:(g('f2cdd')||{}).value||dk(new Date)}}
U.cdp=()=>{const r=cdRead(),e=document.getElementById('f2cdr');if(e)e.textContent=cdPace(CDS.t,r.km,r.sec)||'—'};
A.cardio=()=>{CDS={t:CDS.t||'run'};sh(cdUI())};
A.cdt=(i,b)=>{const r=cdRead();CDS.t=b.dataset.v;sh(cdUI());const g=id=>document.getElementById(id);if(r.km)g('f2cdk').value=r.km;if(r.sec){g('f2cdm').value=Math.floor(r.sec/60);g('f2cds').value=r.sec%60}if(r.d)g('f2cdd').value=r.d;U.cdp()};
A.cdsv=()=>{const r=cdRead();if(r.sec<60){zt('Indica al menos 1 minuto');return}
 const d=/^\d{4}-\d{2}-\d{2}$/.test(r.d)&&r.d<=dk(new Date)?r.d:dk(new Date),pc=cdPace(CDS.t,r.km,r.sec);
 const x=(r.km?R1(r.km)+' km · ':'')+f2h(r.sec)+(pc?' · '+pc:'');
 S.logs.push({d,n:'Cardio · '+cdLbl(CDS.t),v:0,s:0,m:Math.max(1,Math.round(r.sec/60)),q:0,k:'c',x,c:{t:CDS.t,km:r.km,sec:r.sec}});
 S.logs.sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
 sv();sh();zt('Cardio guardado');f2Ach();R()};
function cdAll(){return (S.logs||[]).filter(l=>l&&l.k=='c'&&l.c&&typeof l.c=='object'&&typeof l.d=='string')}
function f2CdCard(){try{const L=cdAll();if(!L.length)return '';
 const m0=wkMon(new Date()),wk=k=>dk(new Date(m0.getFullYear(),m0.getMonth(),m0.getDate()-7*k)),W4=[3,2,1,0].map(k=>{const key=wk(k),a=L.filter(l=>dk(wkMon(new Date(l.d+'T12:00:00')))==key);return{k,n:a.length,km:a.reduce((s,l)=>s+(+l.c.km||0),0),sec:a.reduce((s,l)=>s+(+l.c.sec||0),0)}});
 const cur=W4[3],mx=Math.max(1,...W4.map(w=>w.km||w.sec/600)),tot=L.reduce((s,l)=>s+(+l.c.km||0),0);
 return '<div class="cd"><div class="row"><b>Cardio</b><small>'+R1(tot)+' km en total</small></div><div class="f2cs"><div><b>'+R1(cur.km)+'</b><small>km esta semana</small></div><div><b>'+f2h(cur.sec)+'</b><small>tiempo</small></div><div><b>'+cur.n+'</b><small>'+(cur.n==1?'sesión':'sesiones')+'</small></div></div>'
 +'<div class="f2bars">'+W4.map(w=>'<div><i style="height:'+Math.max(4,Math.round((w.km||w.sec/600)/mx*56))+'px"></i><small>'+(w.k?'−'+w.k+' sem':'Ahora')+'</small></div>').join('')+'</div></div>'}catch(e){return ''}}
