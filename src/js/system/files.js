/* ═══ system/files ═══
   Descarga, copia y codificación de archivos.
   Define: ffSa, ffDl, ffCopy, ffB64, ffUn, ffTx  · acciones/registros: 1
*/
const ffSa=()=>{try{return navigator.standalone===true||matchMedia('(display-mode: standalone)').matches}catch(e){return false}};
const ffDl=async(name,data)=>{let d=null;try{d=window.claude&&window.claude.use?await window.claude.use('downloads'):null}catch(e){d=null}
 if(d){try{const r=await d.save({filename:name,data});return r&&r.status?r.status:'saved'}catch(e){return e&&e.code=='declined'?'declined':'fail'}}
 if(ffSa()&&navigator.canShare&&typeof File!='undefined'){try{const f=new File([data],name,{type:'application/json'});if(navigator.canShare({files:[f]})){await navigator.share({files:[f]});return 'saved'}}catch(e){if(e&&e.name=='AbortError')return 'declined'}}
 try{const b=new Blob([data],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);return 'saved'}catch(e){return 'fail'}};
const ffCopy=async(t,el)=>{try{await navigator.clipboard.writeText(t);return true}catch(e){}try{if(el){el.focus();el.select();el.setSelectionRange&&el.setSelectionRange(0,t.length+1)}return document.execCommand&&document.execCommand('copy')}catch(e){return false}};
A.zbc=()=>{const e=$('#bk');try{navigator.clipboard.writeText(e.value)}catch(x){e.select()}S.bkd=Date.now();sv();zt('Texto copiado')};
const ffB64=s=>{const b=new TextEncoder().encode(s);let t='';b.forEach(c=>t+=String.fromCharCode(c));return btoa(t)};
const ffUn=s=>{const t=atob(s),b=new Uint8Array(t.length);for(let i=0;i<t.length;i++)b[i]=t.charCodeAt(i);return new TextDecoder().decode(b)};
const ffTx=(v,n)=>String(v).replace(/[<>&"'`\\]/g,'').replace(/\s+/g,' ').trim().slice(0,n);
