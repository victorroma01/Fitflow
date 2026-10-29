/* ═══ extras/foods-online ═══
   Alimentos en línea (Open Food Facts) y escáner de códigos.
   Define: f2nm, fl, ff2Of, f2ot, f2Fetch, f2Off, f2Search, EL, EG, ER, EP, ELM, ERM, f2Mod, f2DecRuns, f2DecRow, … (+7)  · acciones/registros: 6
*/
const f2nm=s=>String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
function fl(q){const e=$('#rs');if(!e)return;const k=f2nm(String(q||'').trim()),ws=k.split(/\s+/).filter(Boolean);
 const L=FA().map((f,i)=>({f,i,n:f2nm(f.n)})).filter(o=>!ws.length||ws.every(w=>o.n.includes(w)));
 L.sort((a,b)=>(ws.length&&b.n.startsWith(ws[0])?1:0)-(ws.length&&a.n.startsWith(ws[0])?1:0));
 e.innerHTML=L.slice(0,ws.length?60:30).map(o=>'<div class="it" style="grid-template-columns:1fr auto" data-a="pk" data-i="'+o.i+'"><span>'+X(o.f.n)+'</span><small>'+o.f.b[0]+' kcal/100 g</small></div>').join('')+(ws.length&&!L.length?'<p class="mu" style="font-size:13px;margin:10px 2px">No está en tu lista. Prueba «Buscar en internet» o créalo en «Nuevo».</p>':'')}
var ff2Of=[];
let f2ot=0;
async function f2Fetch(url,ms){const ac=typeof AbortController!='undefined'?new AbortController():null,t=ac?setTimeout(()=>ac.abort(),ms||9000):0;
 try{const r=await fetch(url,{signal:ac?ac.signal:undefined,headers:{Accept:'application/json'}});
  if(r.status==429||r.status==503)throw 'busy';
  if(r.status==404)return{_nf:1};
  if(!r.ok)throw 'http';
  return await r.json()}finally{if(t)clearTimeout(t)}}
function f2Off(p){try{if(!p||typeof p!='object')return null;
 const nm=String(p.product_name_es||p.product_name||'').trim();if(!nm)return null;const m=p.nutriments&&typeof p.nutriments=='object'?p.nutriments:{};
 const num=k=>{const v=parseFloat(m[k]);return isFinite(v)?v:null};
 let kc=num('energy-kcal_100g');if(kc==null){const kj=num('energy_100g');if(kj!=null)kc=kj/4.184}
 if(kc==null)return null;
 const c=num('carbohydrates_100g')||0,pr=num('proteins_100g')||0,f=num('fat_100g')||0,fi=num('fiber_100g')||0;let sa=num('salt_100g');if(sa==null){const so=num('sodium_100g');sa=so!=null?so*2.5:0}
 if(kc<0||kc>950||c<0||pr<0||f<0||c>100||pr>100||f>100||c+pr+f>105)return null;
 const brs=Array.isArray(p.brands)?p.brands[0]:String(p.brands||''),br=String(brs||'').split(',')[0].trim(),r1=v=>Math.round(v*10)/10;
 return{n:nm.slice(0,60)+(br?' ('+br.slice(0,24)+')':''),b:[Math.round(kc),r1(c),r1(pr),r1(f),r1(Math.max(0,fi)),Math.round(Math.max(0,sa)*100)/100],ean:String(p.code||p._id||'').replace(/\D/g,'').slice(0,14)}
}catch(e){return null}}
async function f2Search(q){
 const fl_='code,product_name,product_name_es,brands,nutriments';let j;
 try{j=await f2Fetch('https://world.openfoodfacts.org/cgi/search.pl?search_terms='+encodeURIComponent(q)+'&search_simple=1&action=process&json=1&page_size=24&sort_by=unique_scans_n&fields='+fl_,10000)}
 catch(e){if(e==='busy')throw e;j=await f2Fetch('https://search.openfoodfacts.org/search?q='+encodeURIComponent(q)+'&page_size=24&langs=es&fields='+fl_,10000)}
 const arr=j&&Array.isArray(j.products)?j.products:j&&Array.isArray(j.hits)?j.hits:[];
 const seen=new Set();return arr.map(f2Off).filter(x=>{if(!x||seen.has(x.n))return false;seen.add(x.n);return true})}
A.f2os=async()=>{const inp=document.querySelector('input[data-u="fs"]'),q=((inp&&inp.value)||'').trim(),e=$('#rs');if(!e)return;
 if(q.length<2){zt('Escribe al menos 2 letras');return}
 if(Date.now()-f2ot<6000){zt('Espera unos segundos entre búsquedas');return}
 f2ot=Date.now();e.innerHTML='<p class="mu" style="margin:10px 2px">Buscando en Open Food Facts…</p>';
 try{const L=await f2Search(q);ff2Of=L;const e2=$('#rs');if(!e2)return;
  e2.innerHTML=L.length?'<small class="mu" style="display:block;margin:6px 2px">Valores por 100 g · datos de Open Food Facts (ODbL)</small>'+L.map((f,i)=>'<div class="it" style="grid-template-columns:1fr auto" data-a="f2op" data-i="'+i+'"><span>'+X(f.n)+'</span><small>'+f.b[0]+' kcal</small></div>').join(''):'<p class="mu" style="margin:10px 2px">No hay resultados para «'+X(q)+'». Prueba con otra palabra o crea el alimento en «Nuevo».</p>'}
 catch(x){const e2=$('#rs');if(e2)e2.innerHTML='<p class="mu" style="margin:10px 2px">'+(x==='busy'?'Open Food Facts está saturado. Prueba en un minuto.':'No se pudo consultar. Comprueba tu conexión e inténtalo de nuevo.')+'</p>'}};
A.f2op=i=>{const f=ff2Of[i];if(!f)return;AD.pick={n:f.n,b:f.b.slice()};sh(addUI());U.gr(100)};
const EL=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'],EG=['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'],ER=['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'],EP=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
const ELM={},ERM={};
EL.forEach((b,d)=>ELM[b]=['L',d]);
EG.forEach((b,d)=>ELM[b]=['G',d]);
ER.forEach((b,d)=>ERM[b]=d);
function f2Mod(r,p,startBar){const t=r[p]+r[p+1]+r[p+2]+r[p+3],m=t/7;let s='',sum=0;const q=[];
 for(let k=0;k<4;k++){const v=Math.round(r[p+k]/m);if(v<1||v>4)return null;q.push(v);sum+=v}
 if(sum!=7)return null;
 for(let k=0;k<4;k++){const bar=startBar?k%2==0:k%2==1;s+=(bar?'1':'0').repeat(q[k])}return s}
function f2DecRuns(r,firstDark){const N=r.length;
 for(let i=0;i+59<=N;i++){const dark=firstDark?i%2==0:i%2==1;if(!dark)continue;
  const u=(r[i]+r[i+1]+r[i+2])/3;if(u<1.2)continue;
  if(Math.abs(r[i]-u)>u*.6||Math.abs(r[i+1]-u)>u*.6||Math.abs(r[i+2]-u)>u*.6)continue;
  let p=i+3,ok=1,par='',dg=[];
  for(let d=0;d<6&&ok;d++){const b=f2Mod(r,p,false);if(!b){ok=0;break}const e=ELM[b];if(!e){ok=0;break}par+=e[0];dg.push(e[1]);p+=4}
  if(!ok)continue;
  let mg=0;for(let k=0;k<5;k++)mg+=r[p+k];if(Math.abs(mg-5*u)>u*2.2)continue;p+=5;
  for(let d=0;d<6&&ok;d++){const b=f2Mod(r,p,true);if(!b){ok=0;break}const e=ERM[b];if(e==null){ok=0;break}dg.push(e);p+=4}
  if(!ok)continue;
  const first=EP.indexOf(par);if(first<0)continue;
  const all=[first].concat(dg);let s=0;for(let k=0;k<12;k++)s+=all[k]*(k%2?3:1);
  if((10-s%10)%10!=all[12])continue;
  return all.join('')}
 return null}
function f2DecRow(a){const n=a.length;if(n<80)return null;
 const s=new Float32Array(n);for(let i=0;i<n;i++){const x=a[i-1]!=null?a[i-1]:a[i],z=a[i+1]!=null?a[i+1]:a[i];s[i]=(x+a[i]*2+z)/4}
 let mn=255,mx=0;for(let i=0;i<n;i++){if(s[i]<mn)mn=s[i];if(s[i]>mx)mx=s[i]}
 if(mx-mn<35)return null;
 const pre=new Float32Array(n+1);for(let i=0;i<n;i++)pre[i+1]=pre[i]+s[i];
 const tryBin=(thr)=>{const bin=new Uint8Array(n);for(let i=0;i<n;i++)bin[i]=s[i]<thr(i)?1:0;
  const runs=[];let c=bin[0],l=1;for(let i=1;i<n;i++){if(bin[i]==c)l++;else{runs.push(l);c=bin[i];l=1}}runs.push(l);
  const fd=bin[0]==1;let r=f2DecRuns(runs,fd);if(r)return r;
  const rr=runs.slice().reverse(),lastDark=(runs.length%2==1)?fd:!fd;return f2DecRuns(rr,lastDark)};
 const mid=(mn+mx)/2;let r=tryBin(()=>mid);if(r)return r;
 const w=Math.max(12,n>>4);
 r=tryBin(i=>{const a0=Math.max(0,i-w),b0=Math.min(n,i+w+1);return(pre[b0]-pre[a0])/(b0-a0)});return r}
function f2DecFrame(img){const W_=img.width,H_=img.height,d=img.data,gray=new Uint8Array(W_*H_);
 for(let i=0,j=0;i<d.length;i+=4,j++)gray[j]=(d[i]*77+d[i+1]*150+d[i+2]*29)>>8;
 const rows=[.5,.45,.55,.4,.6,.35,.65,.3,.7,.25,.75];
 for(const f of rows){const y=Math.min(H_-1,Math.round(H_*f)),row=gray.subarray(y*W_,y*W_+W_);const r=f2DecRow(row);if(r)return r}
 for(const f of rows){const x=Math.min(W_-1,Math.round(W_*f)),col=new Uint8Array(H_);for(let y=0;y<H_;y++)col[y]=gray[y*W_+x];const r=f2DecRow(col);if(r)return r}
 return null}
let SCN=null;
const f2msg=t=>{const e=document.getElementById('f2sm');if(e)e.textContent=t};
function f2ScanStop(){if(SCN){SCN.run=0;try{SCN.st.getTracks().forEach(t=>t.stop())}catch(e){}SCN=null}}
A.cl=()=>{f2ScanStop();sh()};
A.f2sc=()=>{AD.pick=null;sh('<h3>Escanear código de barras</h3><div class="f2sv"><video id="f2v" playsinline muted autoplay></video><div class="f2gd"></div></div><p id="f2sm" class="mu" style="margin:8px 2px;font-size:13px">Abriendo la cámara…</p>'
 +'<label>O escribe el código (8 a 14 cifras)</label><div class="g2" style="grid-template-columns:1fr auto"><input id="f2ean" inputmode="numeric" maxlength="14" placeholder="Por ejemplo 8410000000000"><button class="pr" data-a="f2ln">Buscar</button></div>'
 +'<p class="mu" style="font-size:12px;margin:10px 2px">Solo se envía el número del código a Open Food Facts. La imagen de la cámara no sale del móvil.</p><button data-a="f2bk" style="width:100%">Volver</button>');
 f2ScanStart()};
A.f2bk=()=>{f2ScanStop();sh(addUI());fl('')};
A.f2ln=()=>{const v=String((document.getElementById('f2ean')||{}).value||'').replace(/\D/g,'');if(v.length<8||v.length>14){f2msg('El código debe tener entre 8 y 14 cifras');return}f2ScanStop();f2Lookup(v)};
async function f2ScanStart(){
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){f2msg('Este navegador no permite usar la cámara. Escribe el código.');return}
 try{const st=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
  const v=document.getElementById('f2v');if(!v){st.getTracks().forEach(t=>t.stop());return}
  v.srcObject=st;try{await v.play()}catch(e){}
  let bd=null;try{if('BarcodeDetector' in window)bd=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e']})}catch(e){bd=null}
  SCN={st,v,run:1,last:'',n:0,bd};f2msg('Apunta al código de barras del envase.');f2ScanLoop()}
 catch(e){f2msg(e&&e.name=='NotAllowedError'?'Permiso de cámara denegado. Puedes escribir el código.':'No se pudo abrir la cámara. Puedes escribir el código.')}}
async function f2ScanLoop(){const me=SCN;if(!me)return;const cv=document.createElement('canvas'),g=cv.getContext('2d',{willReadFrequently:true});
 while(SCN===me&&me.run){
  if(!document.getElementById('f2v')){f2ScanStop();return}
  const v=me.v;
  if(document.visibilityState=='visible'&&v.readyState>=2&&v.videoWidth){
   let code=null;
   try{if(me.bd){const r=await me.bd.detect(v);if(r&&r.length)code=r[0].rawValue}}catch(e){me.bd=null}
   if(!code){const w=Math.min(720,v.videoWidth),h=Math.round(v.videoHeight*w/v.videoWidth);cv.width=w;cv.height=h;g.drawImage(v,0,0,w,h);code=f2DecFrame(g.getImageData(0,0,w,h))}
   if(code&&/^\d{8,14}$/.test(code)){if(code===me.last)me.n++;else{me.last=code;me.n=1}
    if(me.n>=2||me.bd){f2ScanStop();f2Lookup(code);return}}
  }
  await new Promise(r=>setTimeout(r,170))}}
async function f2Lookup(code){f2msg('Buscando '+code+'…');
 try{const c=S.bc&&S.bc[code];let it=c&&Array.isArray(c.b)&&c.b.length==6?{n:String(c.n||'').slice(0,80),b:c.b.map(Number)}:null;
  if(!it){const F_='code,product_name,product_name_es,brands,nutriments';let j=null;
   try{j=await f2Fetch('https://world.openfoodfacts.org/api/v3/product/'+code+'.json?fields='+F_,9000)}catch(e){if(e==='busy')throw e;j=null}
   if(!j||(!j.product&&!j._nf))j=await f2Fetch('https://world.openfoodfacts.org/api/v2/product/'+code+'.json?fields='+F_,9000);
   const p=j&&j.product;it=p?f2Off(p):null;
   if(!it){f2msg(p?'Este producto no tiene información nutricional completa. Créalo a mano en «Nuevo».':'Ese código no está en Open Food Facts. Créalo a mano en «Nuevo».');return}
   S.bc=S.bc&&typeof S.bc=='object'?S.bc:{};S.bc[code]={n:it.n,b:it.b,t:Date.now()};
   const ks=Object.keys(S.bc);if(ks.length>200){ks.sort((a,b)=>(S.bc[a].t||0)-(S.bc[b].t||0)).slice(0,ks.length-200).forEach(k=>delete S.bc[k])}
   sv()}
  AD.pick={n:it.n,b:it.b.slice()};sh(addUI());U.gr(100)}
 catch(x){f2msg(x==='busy'?'Open Food Facts está saturado. Prueba en un minuto.':'No se pudo consultar. Comprueba tu conexión; los productos ya escaneados funcionan sin conexión.')}}

/* — manejadores de esta función (registros A / C / U) — */
U.fs=fl;
