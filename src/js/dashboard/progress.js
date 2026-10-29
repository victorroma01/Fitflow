/* ═══ dashboard/progress ═══
   Gráficas de progreso por ejercicio.
   Define: PGX, ffShort, pgList, pgSer, pgFmt, pgAx, pgSvg, pgBody, pgUp, pgCard, prEv, prTl  · acciones/registros: 3
*/
let PGX={n:'',m:'e',p:-1};
const ffShort=d=>new Date(d+'T00:00:00').toLocaleDateString('es',{day:'numeric',month:'short'});
const pgList=()=>Object.keys(S.hist||{}).filter(n=>{const h=S.hist[n];return Array.isArray(h)&&h.some(x=>x.s.some(y=>+y[1]>0))}).sort((a,b)=>{const da=(S.hist[a][0]||{}).d||'',db=(S.hist[b][0]||{}).d||'';return da<db?1:da>db?-1:0});
const pgSer=(n,m)=>{const h=((S.hist||{})[n]||[]).slice().reverse();return h.map(x=>{const ss=x.s.filter(y=>y[3]!=1&&+y[1]>0);let v=0;
 if(m=='v')v=x.s.reduce((a,y)=>a+(+y[0]||0)*(+y[1]||0),0);else if(ss.length)v=Math.max(...ss.map(y=>m=='w'?+y[1]:e1(+y[1],+y[0])));
 return v>0?{d:x.d,v}:null}).filter(Boolean).slice(-30)};
const pgFmt=(v,m)=>m=='v'?Z(ffDW(v))+' '+ffUL():(Math.round(ffDW(v)*10)/10)+' '+ffUL();
const pgAx=v=>v>=10000?R1(v/1000)+'k':Math.round(v)+'';
const pgSvg=(pts,m,sel,inter)=>{const W0=320,H0=150,pl=38,pr=12,pt=12,pb=24,iw=W0-pl-pr,ih=H0-pt-pb,vs=pts.map(p=>ffDW(p.v));
 let lo=Math.min(...vs),hi=Math.max(...vs);if(hi-lo<1e-6){lo=Math.max(0,lo*.9);hi=hi*1.1+1}else{const pd=(hi-lo)*.15;lo=Math.max(0,lo-pd);hi=hi+pd}
 const t=pts.map(p=>new Date(p.d+'T00:00:00').getTime()),t0=t[0],t1=t[t.length-1],xx=i=>pts.length<2||t1==t0?pl+iw/2:pl+(t[i]-t0)/(t1-t0)*iw,yy=v=>pt+ih-(v-lo)/(hi-lo)*ih;
 let b=0;pts.forEach(p=>{p.pr=m!='v'&&b>0&&p.v>b+1e-6;if(p.v>b)b=p.v});
 const tk=[lo,(lo+hi)/2,hi];
 let s='<svg viewBox="0 0 '+W0+' '+H0+'" role="img" aria-label="Evolución del ejercicio">';
 tk.forEach(v=>{const y=yy(v);s+='<line x1="'+pl+'" x2="'+(W0-pr)+'" y1="'+y+'" y2="'+y+'" stroke="var(--ln)" stroke-width="1"/><text x="'+(pl-6)+'" y="'+(y+3.5)+'" text-anchor="end" class="pga">'+pgAx(v)+'</text>'});
 s+='<text x="'+pl+'" y="'+(H0-6)+'" class="pga">'+ffShort(pts[0].d)+'</text>';if(pts.length>1)s+='<text x="'+(W0-pr)+'" y="'+(H0-6)+'" text-anchor="end" class="pga">'+ffShort(pts[pts.length-1].d)+'</text>';
 if(pts.length>1)s+='<path d="'+pts.map((p,i)=>(i?'L':'M')+xx(i).toFixed(1)+' '+yy(ffDW(p.v)).toFixed(1)).join(' ')+'" fill="none" stroke="var(--a2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
 pts.forEach((p,i)=>{const cx=xx(i).toFixed(1),cy=yy(ffDW(p.v)).toFixed(1);
  if(i==sel)s+='<circle cx="'+cx+'" cy="'+cy+'" r="9" fill="var(--a2)" opacity=".18"/>';
  s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+(i==sel?5:3.6)+'" fill="'+(p.pr?'var(--a2)':'var(--cd)')+'" stroke="'+(p.pr?'var(--cd)':'var(--a2)')+'" stroke-width="2"/>';
  if(inter)s+='<circle cx="'+cx+'" cy="'+cy+'" r="15" fill="transparent" data-a="pgp" data-i="'+i+'" style="cursor:pointer"/>'});
 return s+'</svg>'};
const pgBody=(stat)=>{const L=pgList();if(!L.length)return '<p class="mu" style="margin:8px 0 0">Cuando registres pesos verás aquí la evolución de cada ejercicio.</p>';
 if(!stat&&!L.includes(PGX.n))PGX.n=L[0];const n=stat||PGX.n,m=stat?'e':PGX.m,pts=pgSer(n,m);
 const ML={e:'1RM estimado',w:'Peso máximo',v:'Volumen'};
 let h='';
 if(!stat){h+='<select data-c="pgn" aria-label="Ejercicio" style="margin:10px 0 8px">'+L.map((x,i)=>'<option value="'+i+'"'+(x==n?' selected':'')+'>'+X(x)+'</option>').join('')+'</select>'
  +ffSeg('pgm',m,[['e','1RM'],['w','Peso máx.'],['v','Volumen']]).replace('class="seg"','class="seg pgm"')}
 if(!pts.length)return h+'<p class="mu" style="margin:10px 0 0">Este ejercicio no tiene pesos registrados.</p>';
 const sel=stat?pts.length-1:(PGX.p>=0&&PGX.p<pts.length?PGX.p:pts.length-1),p=pts[sel];
 h+='<div class="pgt2"><span><b>'+pgFmt(p.v,m)+'</b>'+(p.pr?' <em class="pgr">RÉCORD</em>':'')+'</span><small>'+ML[m]+' · '+ffShort(p.d)+'</small></div>'+pgSvg(pts,m,sel,!stat);
 if(pts.length>1){const a=pts[0].v,z=pts[pts.length-1].v,dl=(z-a)/a*100;h+='<div class="mu pgsum">De '+pgFmt(a,m)+' a '+pgFmt(z,m)+' · <b style="color:'+(dl>=0?'var(--a1)':'inherit')+'">'+(dl>=0?'+':'')+(Math.round(dl*10)/10)+' %</b>'+(m!='v'?'<br><span style="font-size:11.5px">Punto relleno = récord personal</span>':'')+'</div>'}
 else h+='<div class="mu pgsum">Con una segunda sesión verás la tendencia.</div>';
 return h};
const pgUp=()=>{const e=$('#pgc');if(e)e.innerHTML=pgBody()};
A.pgp=i=>{PGX.p=+i;pgUp()};
A.pgm=(i,b)=>{PGX.m=['e','w','v'].includes(b.dataset.v)?b.dataset.v:'e';PGX.p=-1;pgUp()};
C.pgn=e=>{const L=pgList();PGX.n=L[+e.value]||PGX.n;PGX.p=-1;pgUp()};
const pgCard=()=>'<div class="cd"><b>Progreso por ejercicio</b><div id="pgc" class="pgs">'+pgBody()+'</div></div>';
const prEv=()=>{const ev=[];Object.keys(S.hist||{}).forEach(n=>{let b=0;S.hist[n].slice().reverse().forEach(x=>{const ss=x.s.filter(y=>y[3]!=1&&+y[1]>0);if(!ss.length)return;
 const top=ss.reduce((a,y)=>e1(+y[1],+y[0])>e1(+a[1],+a[0])?y:a),m=e1(+top[1],+top[0]);if(b>0&&m>b+1e-6)ev.push({d:x.d,n,w:+top[1],r:+top[0],e:m,up:m-b});if(m>b)b=m})});
 return ev.sort((a,b)=>a.d<b.d?1:a.d>b.d?-1:b.e-a.e)};
const prTl=()=>{const ev=prEv().slice(0,8);if(!ev.length)return '';
 return '<div class="cd"><b>Línea de récords</b>'+ev.map(o=>'<div class="it" style="grid-template-columns:1fr auto"><span>'+X(o.n)+'<br><small>'+ffShort(o.d)+'</small></span><span style="text-align:right"><b>'+ffDW(o.w)+' '+ffUL()+' × '+o.r+'</b><br><small>1RM est. '+(Math.round(ffDW(o.e)*10)/10)+' (+'+(Math.round(ffDW(o.up)*10)/10)+')</small></span></div>').join('')+'</div>'};
