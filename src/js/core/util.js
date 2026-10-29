/* ═══ core/util ═══
   Utilidades puras: selector $, lectura L, escape X, redondeos, fechas dk y formateo (FT, f2*).
   Define: $, L, X, R1, Z, F, dk, e1, FT, f2n, f2f, f2h, f2d, f2id
*/
window.__ffs=1;
const $=q=>document.querySelector(q),L=(k,v)=>{try{return v===undefined?JSON.parse(Store.get(k)):Store.set(k,JSON.stringify(v))}catch(e){return null}};
const X=s=>String(s).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';'),R1=v=>Math.round(v*10)/10,Z=v=>Math.round(v),F=t=>Math.floor(t/60)+':'+String(t%60).padStart(2,'0');
const dk=d=>new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const e1=(w,r)=>w*(1+r/30);
const FT=s=>{s=Math.max(0,Math.floor(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60,p=v=>String(v).padStart(2,'0');return h?h+':'+p(m)+':'+p(x):m+':'+p(x)};
const f2n=(v,a,b,d)=>{v=Math.round(+v);return v>=a&&v<=b?v:d};
const f2f=(v,a,b,d)=>{v=+v;return v>=a&&v<=b?v:d};
const f2h=s=>{s=Math.max(0,Math.round(s));return s>=3600?Math.floor(s/3600)+':'+String(Math.floor(s%3600/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'):Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const f2d=(d,o)=>{const t=new Date(d+'T12:00:00');return isNaN(t)?String(d||''):t.toLocaleDateString('es',o||{day:'numeric',month:'short'})};
const f2id=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
