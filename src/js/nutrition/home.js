/* ═══ nutrition/home ═══
   Pestaña Nutrición: resumen del día y barras de macros.
   Define: T, sum, bar, NU0
*/
const T=it=>it.b.map(v=>v*it.g/100),sum=a=>a.reduce((s,t)=>s.map((v,i)=>v+t[i]),[0,0,0,0,0,0]);
function bar(l,v,t,c){return '<div><span style="color:var('+c+')">'+l+'</span><div class="bar"><i style="width:'+Math.min(100,v/t*100||0)+'%;background:var('+c+')"></i></div><b>'+Z(v)+' / '+Z(t)+' g</b></div>'}
function NU0(){const dt=new Date(Date.now()+ND*864e5),k=dk(dt),n=S.nu,m=S.meals[k]||{},tg=[n.k,n.k*n.c/400,n.k*n.p/400,n.k*n.f/900],w=WT[n.n]||Array(n.n).fill(1/n.n),all=[];
const mt=Array.from({length:n.n},(_,i)=>{const v=sum((m[i]||[]).map(T));all.push(v);return v});const tt=sum(mt);
let h='<div class="hd"><button data-a="nd" data-i="-1">‹</button><h1>'+(ND?dt.toLocaleDateString('es',{day:'numeric',month:'short'}):'Hoy')+'</h1><button data-a="nd" data-i="1">›</button></div><div class="cd" style="position:sticky;top:6px;z-index:3"><div class="mac">'+bar('Hidratos',tt[1],tg[1],'--c')+bar('Proteínas',tt[2],tg[2],'--p')+bar('Grasas',tt[3],tg[3],'--g')+'</div><div class="bar" style="margin-top:8px"><i style="width:'+Math.min(100,tt[0]/tg[0]*100)+'%;background:var(--ac)"></i></div><div style="text-align:center"><b>'+Z(tt[0])+' / '+Z(tg[0])+' kcal</b></div></div>';
h+=dietUI()+tplUI(k);h+='<details class="cd"><summary>Objetivos y comidas</summary><div class="g2"><div><label>Kcal diarias</label><input type="number" value="'+n.k+'" data-c="nk"></div><div><label>Nº de comidas</label><select data-c="nn">'+[2,3,4,5,6,7,8].map(x=>'<option '+(x==n.n?'selected':'')+'>'+x+'</option>').join('')+'</select></div></div><div class="g2" style="grid-template-columns:repeat(3,1fr)"><div><label>% Hidr.</label><input type="number" value="'+n.c+'" data-c="np" data-i="0"></div><div><label>% Prot.</label><input type="number" value="'+n.p+'" data-c="np" data-i="1"></div><div><label>% Grasas</label><input type="number" value="'+n.f+'" data-c="np" data-i="2"></div></div>'+(n.c+n.p+n.f!=100?'<small style="color:var(--c)">Los porcentajes deben sumar 100.</small>':'<small>Reparto automático entre comidas según el número elegido.</small>')+'</details>';
for(let i=0;i<n.n;i++){const nm=n.n<=5?MN[[0,1,2,3,4].filter(x=>n.n==3?[0,2,4].includes(x):n.n==4?[0,2,3,4].includes(x):n.n==2?[0,4].includes(x):1)[i]]:MN[i],t=all[i];
h+='<div class="cd"><div class="row"><b>'+nm+'</b><small>Objetivo '+Z(tg[0]*w[i])+' kcal</small></div>'+(m[i]||[]).map((it,j)=>{const v=T(it);return '<div class="it"><div>'+X(it.n)+'<br><small>'+Z(v[0])+' kcal · C '+R1(v[1])+' P '+R1(v[2])+' G '+R1(v[3])+'</small></div><input type="number" value="'+it.g+'" data-c="ig" data-i="'+i+'" data-j="'+j+'"><button data-a="xi" data-i="'+i+'" data-j="'+j+'" style="padding:2px 6px">✕</button></div>'}).join('')+'<div class="mac" style="margin:8px 0"><b style="color:var(--c)">'+Z(t[1])+' / '+Z(tg[1]*w[i])+' C</b><b style="color:var(--p)">'+Z(t[2])+' / '+Z(tg[2]*w[i])+' P</b><b style="color:var(--g)">'+Z(t[3])+' / '+Z(tg[3]*w[i])+' G</b></div><div class="g2"><button data-a="add" data-i="'+i+'">+ Alimento</button><button data-a="sd" data-i="'+i+'" data-n="'+nm+'">★ Guardar plato</button></div></div>'}
return h}

/* — manejadores de esta función (registros A / C / U) — */
A.nd=i=>{ND+=i;R()};
C.nk=e=>{S.nu.k=+e.value||1942;sv();R()};
C.nn=e=>{S.nu.n=+e.value;sv();R()};
C.np=(e,i)=>{S.nu['cpf'[i]]=+e.value||0;sv();R()};
C.ig=(e,i,j)=>{S.meals[dk(new Date(Date.now()+ND*864e5))][i][j].g=+e.value||0;sv();R()};
