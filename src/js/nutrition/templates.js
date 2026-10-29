/* ═══ nutrition/templates ═══
   Plantillas de comidas y hábitos.
   Define: nuKey, dtyp, tplUI, habUI  · acciones/registros: 5
*/
const nuKey=()=>dk(new Date(Date.now()+ND*864e5));
const dtyp=k=>{if(S.dt&&(S.dt[k]=='t'||S.dt[k]=='r'))return S.dt[k];if(S.logs.some(l=>l.d==k))return 't';
 if(k==dk(new Date())){const d=S.plan[S.sel];return d&&d.ex.length?'t':'r'}
 const wd=new Date(k+'T00:00:00').getDay();let n=0;S.logs.forEach(l=>{if(l.d<k&&Date.now()-new Date(l.d+'T00:00:00')<29*864e5&&new Date(l.d+'T00:00:00').getDay()==wd)n++});return n>=2?'t':'r'};
const tplUI=k=>{const t=dtyp(k),tp=(S.tp||{})[t],nm=t=='t'?'entreno':'descanso',has=tp&&Object.keys(tp).some(i=>Array.isArray(tp[i])&&tp[i].length);
 let kc='';if(has)kc=Z(sum(Object.keys(tp).flatMap(i=>Array.isArray(tp[i])?tp[i]:[]).map(T))[0]);
 return '<details class="cd"><summary>Plantillas · día de '+nm+'</summary><label>Tipo de este día</label>'+ffSeg('dty',t,[['t','Entreno'],['r','Descanso']])
 +'<div class="g2" style="margin-top:10px"><button data-a="tpa">Aplicar plantilla</button><button data-a="tps">Guardar día como plantilla</button></div>'
 +'<small class="mu" style="display:block;margin-top:8px">'+(has?'Plantilla de '+nm+' guardada · '+kc+' kcal. Solo se rellenan las comidas vacías.':'Todavía no tienes plantilla de día de '+nm+'. Rellena el día y pulsa Guardar.')+'</small></details>'};
A.dty=(i,b)=>{const k=nuKey();S.dt=S.dt||{};S.dt[k]=b.dataset.v=='r'?'r':'t';sv();R()};
A.tps=()=>{const k=nuKey(),t=dtyp(k),m=S.meals[k]||{},o={};let n=0;for(let i=0;i<S.nu.n;i++){const l=(m[i]||[]).map(x=>({...x}));if(l.length){o[i]=l;n++}}
 if(!n){zt('Añade alimentos al día antes de guardarlo');return}S.tp=S.tp||{};S.tp[t]=o;sv();R();zt('Plantilla de '+(t=='t'?'entreno':'descanso')+' guardada')};
A.tpa=()=>{const k=nuKey(),t=dtyp(k),tp=(S.tp||{})[t];if(!tp){zt('No hay plantilla guardada para este tipo de día');return}
 const m=(S.meals[k]=S.meals[k]||{});let n=0;for(let i=0;i<S.nu.n;i++){if(!(m[i]||[]).length&&Array.isArray(tp[i])&&tp[i].length){m[i]=tp[i].map(x=>({...x}));n++}}
 if(!n){zt('Todas las comidas ya tienen alimentos');return}sv();R();zt('Plantilla aplicada a '+n+(n==1?' comida':' comidas'))};
const habUI=m=>{const l=Object.keys(S.fq||{}).map(n=>[n,S.fq[n]]).filter(x=>x[1]&&x[1].c>0&&Array.isArray(x[1].b)).sort((a,b)=>b[1].c-a[1].c||(b[1].t||0)-(a[1].t||0)).slice(0,8);
 const yk=dk(new Date(Date.now()+(ND-1)*864e5)),ys=(S.meals[yk]||{})[m]||[];
 if(!l.length&&!ys.length)return '';
 return '<div class="mu" style="font-size:12px;margin:2px 0 6px">Habituales · un toque los añade</div><div class="hab">'+(ys.length?'<button class="chip" data-a="hay">Repetir comida de ayer</button>':'')+l.map(x=>'<button class="chip" data-a="hab" data-n="'+X(x[0])+'">'+X(x[0])+' · '+x[1].g+' g</button>').join('')+'</div>'};
A.hab=(i,b)=>{const n=b.dataset.n,f=(S.fq||{})[n];if(!f||!AD)return;const k=nuKey();(S.meals[k]=S.meals[k]||{});(S.meals[k][AD.m]=S.meals[k][AD.m]||[]).push({n,g:f.g,b:f.b});f.c++;f.t=Date.now();sv();sh();R();zt('Añadido: '+n)};
A.hay=()=>{if(!AD)return;const yk=dk(new Date(Date.now()+(ND-1)*864e5)),ys=(S.meals[yk]||{})[AD.m]||[];if(!ys.length)return;const k=nuKey();(S.meals[k]=S.meals[k]||{});(S.meals[k][AD.m]=S.meals[k][AD.m]||[]).push(...ys.map(x=>({...x})));sv();sh();R();zt('Comida de ayer añadida')};

/* — manejadores de esta función (registros A / C / U) — */
A.sd=(i,b)=>{AD={m:i};sh('<h3>Guardar plato en la librería</h3><input id="pn" value="'+X(b.dataset.n)+'"><button class="pr" data-a="sdo" style="width:100%;margin-top:10px">Guardar</button>')};
A.sdo=()=>{const k=dk(new Date(Date.now()+ND*864e5)),it=((S.meals[k]||{})[AD.m]||[]).map(x=>({...x})),n=$('#pn').value.trim()||'Plato';if(it.length){S.lib=S.lib.filter(p=>p.n!=n).concat({n,it});sv()}sh()};
A.lx=i=>{S.lib.splice(i,1);sv();sh(addUI())};
