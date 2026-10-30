/* ═══ library/photo ═══
   Fotos de ejercicio: obtener la foto, cabecera de la ficha e insignia de miniatura.
   Define: exph, exHero, exBadge
*/
const exph=n=>{const k=EXPK[n];return k&&EXPH[k]?'data:image/webp;base64,'+EXPH[k]:''};
const exHero=n=>{const u=exph(n);return u?'<div class="exph"><img class="b" src="'+u+'" alt=""><img class="f" src="'+u+'" alt="'+X(n)+'"></div>':''};
const exBadge=n=>exph(n)?'<i class="phi" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="3"/><circle cx="9" cy="10" r="1.7"/><path d="M4.5 18l5-5 3.5 3.5 2.5-2.5 4 4"/></svg></i>':'';
