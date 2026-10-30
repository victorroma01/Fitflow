/* ═══ core/html ═══
   Plantillas HTML seguras. html`<b>${nombre}</b>` escapa cada valor que se inserta (como X), así que un nombre escrito
   por el usuario, un alimento de Open Food Facts o un programa importado nunca se convierten en código. Se insertan tal
   cual solo lo que ya es HTML de la app: otra plantilla html`…` o un valor marcado con raw(…) (listas unidas con join,
   textos con etiquetas hechos aquí…). Cada raw() es un sitio donde no se escapa: si recibe datos de fuera, hay que
   escaparlos antes con X.
   El resultado es un Html: se comporta como texto (se concatena, se asigna a innerHTML, se guarda en JSON).
   Define: Html, raw, html
*/
import { X } from './util.js';
/** Texto que ya es HTML seguro (lo devuelve html`…` y raw()). */
export class Html extends String {
}
/** Marca como HTML un texto generado por la app, para insertarlo sin escapar. */
export const raw = v => v instanceof Html ? v : new Html(v);
/** Plantilla que escapa los valores insertados salvo los que ya son Html. */
export const html = (parts, ...values) => {
  let out = parts[0];
  for (let i = 0; i < values.length; i++)
    out += (values[i] instanceof Html ? values[i] : X(values[i])) + parts[i + 1];
  return new Html(out);
};
