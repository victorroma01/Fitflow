/* ═══ library/filters ═══
   Filtros de equipo y grupo muscular (desplegables).
   Define: eqOf, EQD, eqOk, eqDD, EQR, EQS, grChips, grOk, grDD, eqRow  · acciones/registros: 5
*/
const eqOf=l=>EQO.filter(q=>l.some(e=>e.q==q));
const EQD={},eqOk=(c,e)=>!c||!c.length||c.includes(e.q);
const eqDD=(k,cur,items,base,sh)=>{cur=cur||[];if(items.length<2&&!cur.length)return '';const open=!!EQD[k],cnt=n=>base.filter(e=>e.q==n).length;return '<div class="eqd"><button class="eqb'+(cur.length?' on':'')+'" data-a="eqo" data-k="'+k+'" aria-haspopup="true" aria-expanded="'+open+'"><span>Equipo</span><b>'+(cur.length?X(sh&&cur.length>1?cur[0]+' +'+(cur.length-1):cur.join(', ')):'Todos')+'</b>'+ic('chev',16)+'</button><div class="eqp"'+(open?'':' hidden')+'><div class="eqg">'+items.map(x=>'<button class="eqi'+(cur.includes(x)?' on':'')+'" data-a="eqt" data-k="'+k+'" data-v="'+X(x)+'"><i>'+(cur.includes(x)?ic('chk',14):'')+'</i><span>'+X(x)+'</span><small>'+cnt(x)+'</small></button>').join('')+'</div><div class="eqf"><button data-a="eqc" data-k="'+k+'"'+(cur.length?'':' disabled')+'>Limpiar</button><button class="pr" data-a="eqo" data-k="'+k+'">Listo</button></div></div></div>'};
const EQR={lb:()=>{const e=$('#lr');if(e)e.innerHTML=lbBody()},sw:()=>{const e=$('#swb');if(e)e.innerHTML=swBody()},pk:()=>{const e=$('#pkr');if(e)e.innerHTML=pkBody()},cr:()=>{const e=$('#cl2');if(e)e.innerHTML=crRows()}};
const EQS=k=>({lb:LB,sw:SW,pk:PK,cr:CR})[k];
A.eqo=(i,b)=>{const k=b.dataset.k,d=b.closest('.eqd');Object.keys(EQD).forEach(x=>{if(x!=k)EQD[x]=0});document.querySelectorAll('.eqd').forEach(o=>{if(o!==d){const p=o.querySelector('.eqp'),t=o.querySelector('.eqb');if(p)p.hidden=true;if(t)t.setAttribute('aria-expanded','false')}});EQD[k]=!EQD[k];const p=d.querySelector('.eqp'),t=d.querySelector('.eqb');p.hidden=!EQD[k];t.setAttribute('aria-expanded',!!EQD[k])};
A.eqt=(i,b)=>{const k=b.dataset.k,o=EQS(k),v=b.dataset.v;o.eq=(o.eq||[]).includes(v)?o.eq.filter(x=>x!=v):(o.eq||[]).concat(v);EQR[k]()};
A.eqc=(i,b)=>{const k=b.dataset.k;EQS(k).eq=[];EQR[k]()};
document.addEventListener('click',e=>{if(!Object.keys(EQD).some(k=>EQD[k]))return;if(e.target.closest('.eqd'))return;Object.keys(EQD).forEach(k=>EQD[k]=0);document.querySelectorAll('.eqp').forEach(p=>p.hidden=true);document.querySelectorAll('.eqb').forEach(t=>t.setAttribute('aria-expanded','false'))},true);
const grChips=(cur,act)=>'<div class="chs">'+['Todos'].concat(GR.filter(x=>exAll().some(e=>gk(e)==x))).map(x=>'<button class="chip'+((x=='Todos'?'':x)==cur?' on':'')+'" data-a="'+act+'" data-v="'+(x=='Todos'?'':X(x))+'">'+(x=='Propio'?'Mis ejercicios':x)+'</button>').join('')+'</div>';
const grOk=(c,e)=>!c||!c.length||c.includes(gk(e));
const grDD=(k,cur,list)=>{cur=cur||[];const gs=GR.filter(x=>list.some(e=>gk(e)==x));if(gs.length<2&&!cur.length)return '';const open=!!EQD[k],cnt=n=>list.filter(e=>gk(e)==n).length;
return '<div class="eqd"><button class="eqb'+(cur.length?' on':'')+'" data-a="eqo" data-k="'+k+'" aria-haspopup="true" aria-expanded="'+open+'"><span>Músculo</span><b>'+(cur.length?X(cur.length>1?nm(cur[0])+' +'+(cur.length-1):nm(cur[0])):'Todos')+'</b>'+ic('chev',16)+'</button><div class="eqp"'+(open?'':' hidden')+'><div class="eqg gr">'+gs.map(x=>'<button class="eqi'+(cur.includes(x)?' on':'')+'" data-a="grt" data-k="'+k+'" data-v="'+X(x)+'"><i>'+(cur.includes(x)?ic('chk',14):'')+'</i><span>'+X(nm(x))+'</span><small>'+cnt(x)+'</small></button>').join('')+'</div><div class="eqf"><button data-a="grc" data-k="'+k+'"'+(cur.length?'':' disabled')+'>Limpiar</button><button class="pr" data-a="eqo" data-k="'+k+'">Listo</button></div></div></div>'};
const eqRow=(...l)=>{l=l.filter(Boolean);return l.length?'<div class="eqrow">'+l.join('')+'</div>':''};
A.grt=(i,b)=>{const k=b.dataset.k.slice(0,-1),o=EQS(k),v=b.dataset.v;o.gs=(o.gs||[]).includes(v)?o.gs.filter(x=>x!=v):(o.gs||[]).concat(v);o.eq=[];EQR[k]()};
A.grc=(i,b)=>{const k=b.dataset.k.slice(0,-1),o=EQS(k);o.gs=[];o.eq=[];EQR[k]()};
