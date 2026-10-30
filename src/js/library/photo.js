/* ═══ library/photo ═══
   Fotos de ejercicio: obtener la foto, cabecera de la ficha e insignia de miniatura.
   Define: exPhotoUrl, exHero, exBadge
*/
const exPhotoUrl = n => {
  const k = EX_PHOTO_KEY[n];
  return k && EX_PHOTOS[k] ? EX_PHOTOS[k] : '';
};
const exHero = n => {
  const u = exPhotoUrl(n);
  return u ? '<div class="exph"><img class="b" src="' + u + '" alt=""><img class="f" src="' + u + '" alt="' + X(n) + '"></div>' : '';
};
const exBadge = n => exPhotoUrl(n) ? '<i class="phi" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="3"/><circle cx="9" cy="10" r="1.7"/><path d="M4.5 18l5-5 3.5 3.5 2.5-2.5 4 4"/></svg></i>' : '';
