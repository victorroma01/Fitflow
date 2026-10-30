/* ═══ core/html ═══
   Plantillas HTML seguras. html`<b>${nombre}</b>` escapa cada valor que se inserta (como X), así que un nombre escrito
   por el usuario, un alimento de Open Food Facts o un programa importado nunca se convierten en código. Se insertan tal
   cual solo lo que ya es HTML de la app: otra plantilla html`…`, una lista de ellas (el resultado de un map) o un valor
   marcado con raw(…) (textos con etiquetas hechos aquí…). Cada raw() es un sitio donde no se escapa: si recibe datos de fuera, hay que
   escaparlos antes con X.
   El resultado es un Html: se comporta como texto (se concatena, se asigna a innerHTML, se guarda en JSON).
   Define: Html, raw, part, html
*/
import { X } from './util.js';
/** Texto que ya es HTML seguro (lo devuelve html`…` y raw()). */
export class Html extends String {
}
/** Marca como HTML un texto generado por la app, para insertarlo sin escapar. */
export const raw = v => v instanceof Html ? v : new Html(v);
/** Un valor insertado: el Html tal cual, el resto escapado; una lista (p. ej. el resultado de un map) se une sin separador. */
const part = v => Array.isArray(v) ? v.map(part).join('') : v instanceof Html ? v : X(v);
/** Plantilla que escapa los valores insertados salvo los que ya son Html. */
export const html = (parts, ...values) => {
  let out = parts[0];
  for (let i = 0; i < values.length; i++)
    out += part(values[i]) + parts[i + 1];
  return new Html(out);
};
