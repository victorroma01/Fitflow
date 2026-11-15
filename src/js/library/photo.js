/* ═══ library/photo ═══
   Fotos de ejercicio: obtener la foto, cabecera de la ficha e insignia de miniatura.
   Un ejercicio que ya tiene figura (data/figposes) no enseña su foto: el modelo haciendo el ejercicio sustituye a las
   imágenes realistas, que se quitarán del todo cuando todos los ejercicios tengan la suya (decisión del propietario).
   Define: exPhotoUrl, exHero, exBadge
*/
import { EX_PHOTO_KEY, EX_PHOTOS } from '../data/photos.js';
import { FIG_POSES } from '../data/figposes.js';
import { html } from '../core/html.js';
const exPhotoUrl = n => {
  const k = EX_PHOTO_KEY[n];
  return !FIG_POSES[n] && k && EX_PHOTOS[k] ? EX_PHOTOS[k] : '';
};
export const exHero = n => {
  const u = exPhotoUrl(n);
  return u ? html`<div class="exph"><img class="b" src="${u}" alt=""><img class="f" src="${u}" alt="${n}"></div>` : '';
};
export const exBadge = n => exPhotoUrl(n) ? '<i class="phi" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="3"/><circle cx="9" cy="10" r="1.7"/><path d="M4.5 18l5-5 3.5 3.5 2.5-2.5 4 4"/></svg></i>' : '';
