/* ═══ profile/appearance ═══
   Tema, color de acento y estilo Cristal.
   Define: ACC, zAcc, zsw, zth, glM, GLN, GLD, glUI, glSync  · acciones/registros: 4
*/
const ACC=[['Morado','#b183ff','#7a45ee','#4b2a90','#fff'],['Azul eléctrico','#4da3ff','#1565ff','#0b3a9c','#fff'],['Azul oscuro','#5a7be0','#2443b0','#0f1f66','#fff'],['Verde oscuro','#3fbf7f','#14804a','#0c4a2b','#fff'],['Amarillo','#ffd84d','#e8b400','#6e5300','#1a1400'],['Rojo','#ff7a7a','#d62839','#6a1020','#fff'],['Naranja','#ffa04d','#e8590c','#702a05','#fff']];
function zAcc(){const a=ACC[S.acc||0],r=document.documentElement.style;r.setProperty('--a1',a[1]);r.setProperty('--a2',a[2]);r.setProperty('--a3',a[3]);r.setProperty('--ft',a[4]);r.setProperty('--ac',a[2])}
const zsw=()=>'<div class="swg">'+ACC.map((a,i)=>{const on=(S.acc||0)==i;return '<button class="swb'+(on?' on':'')+'" data-a="zac" data-i="'+i+'"><i style="background:linear-gradient(135deg,'+a[1]+','+a[2]+');color:'+a[4]+'">'+(on?'✓':'')+'</i><small>'+a[0]+'</small></button>'}).join('')+'</div>';
A.zac=i=>{S.acc=i;zAcc();sv();R()};
const zth=()=>'<div class="seg">'+[['','Auto'],['dark','Oscuro'],['light','Claro']].map(x=>'<button class="'+((S.theme||'')==x[0]?'on':'')+'" data-a="zth" data-v="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>';
A.zth=(i,b)=>{S.theme=b.dataset.v;th();sv();R()};
const glM=()=>{const m=S.gm;return(m===0||m===1||m===2||m===3)?m:(S.gl===0?0:2)};
const GLN=[['3','Máximo'],['2','Medio'],['1','Mínimo']];
const GLD={3:'Más transparencia, desenfoque y brillo. Es el más vistoso y el que más batería usa.',2:'Equilibrado: se nota el cristal sin perder legibilidad.',1:'Cristal discreto: casi opaco, con brillos suaves. Muy ligero.'};
const glUI=()=>{const m=glM(),g=m>0;
 return '<label>Estilo</label><div class="gst">'
 +'<button class="gso'+(g?' on':'')+'" data-a="glk" data-v="1" aria-pressed="'+g+'"><i class="gpv gc"></i><b>Cristal</b><small>Translúcido y con brillos</small></button>'
 +'<button class="gso'+(g?'':' on')+'" data-a="glk" data-v="0" aria-pressed="'+!g+'"><i class="gpv fl"></i><b>Clásico</b><small>Sólido, sin transparencias</small></button></div>'
 +(g?'<label>Intensidad del Cristal</label><div class="seg">'+GLN.map(x=>'<button class="'+(m==x[0]?'on':'')+'" data-a="gl" data-v="'+x[0]+'">'+x[1]+'</button>').join('')+'</div><small class="mu" style="display:block;margin-top:4px">'+GLD[m]+(m>1?' Si notas lentitud, elige Mínimo o Clásico.':'')+'</small>'
   :'<small class="mu" style="display:block;margin-top:4px">Modo Clásico: el aspecto de siempre y el más ligero. Pulsa Cristal para elegir su intensidad.</small>')};
A.glk=(i,b)=>{const v=+b.dataset.v,m=glM();if(v){S.gm=(S.gk>=1&&S.gk<=3)?S.gk:2}else{if(m>0)S.gk=m;S.gm=0}S.gl=S.gm?1:0;sv();R()};
A.gl=(i,b)=>{const v=+b.dataset.v;S.gm=(v>=1&&v<=3)?v:2;S.gk=S.gm;S.gl=1;sv();R()};
const glSync=()=>{try{const m=glM(),d=document.documentElement;if(d.classList.contains('gl')!==(m>0))d.classList.toggle('gl',m>0);if(m>0){if(d.dataset.gm!=m)d.dataset.gm=m}else if(d.hasAttribute('data-gm'))d.removeAttribute('data-gm')}catch(e){}};

/* — manejadores de esta función (registros A / C / U) — */
C.tm=e=>{S.theme=e.value;th();sv()};
