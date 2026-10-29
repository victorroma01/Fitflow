/* ═══ workout/images ═══
   Imágenes de portada del día y su selector.
   Define: zhb, ZGI, zimg, ZL, zip  · acciones/registros: 1
*/
const zhb=(n,d)=>{const k=d&&d.cu&&PH[d.img]?d.img:(PHK.find(r=>r[0].test(n))||[])[1],u=PH[k];return u?'background:linear-gradient(180deg,#0002,#000b),url(data:image/jpeg;base64,'+u+') center/cover':''};
const ZGI={'Pecho':'pecho','Espalda':'espalda','Hombros':'hombros','Bíceps':'brazos','Tríceps':'brazos','Antebrazos':'brazos','Abdomen':'torso','Cuádriceps':'piernas','Isquios y glúteos':'legs','Gemelos':'piernas'};
const zimg=r=>{if(r.img&&r.img!='descanso'&&PH[r.img])return r.img;const c={};r.bl.forEach(b=>b.ex.forEach(n=>{const k=ZGI[zgx(n)]||'torso';c[k]=(c[k]||0)+1}));const t=Object.keys(c).sort((a,b)=>c[b]-c[a])[0];return t||(PHK.find(x=>x[0].test(r.n))||[])[1]||'torso'};
const ZL={pecho:'Pecho',espalda:'Espalda',hombros:'Hombros',brazos:'Brazos',piernas:'Piernas',legs:'Prensa de piernas',torso:'Torso',descanso:'Descanso'};
const zip=r=>{const v=zimg(r);return '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:6px 0 4px">'+Object.keys(PH).filter(k=>k!='descanso').map(k=>'<button data-a="crim" data-v="'+k+'" aria-label="'+ZL[k]+'" style="padding:0;height:78px;position:relative;overflow:hidden;border-radius:14px;border:2px solid '+(v==k?'var(--a2)':'var(--ln)')+'"><img src="data:image/jpeg;base64,'+PH[k]+'" alt="" style="width:100%;height:100%;object-fit:cover;display:block'+(v==k?'':';opacity:.55')+'"></button>').join('')+'</div>'};
A.crim=(i,b)=>{S.cr[CR.i].img=b.dataset.v;sv();sh(crEd())};
Object.assign(ZL,{cardio:'Cardio',hyrox:'Hyrox',crossfit:'CrossFit',core:'Core',funcional:'Funcional'});
Object.assign(ZGI,{Abdomen:'core',CrossFit:'crossfit',Hyrox:'hyrox',Funcional:'funcional',Cardio:'cardio'});
