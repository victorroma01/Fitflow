/* ═══ core/html ═══
   Plantillas HTML seguras. html`<b>${nombre}</b>` escapa cada valor que se inserta (como X), así que un nombre escrito
   por el usuario, un alimento de Open Food Facts o un programa importado nunca se convierten en código. Se insertan tal
   cual solo lo que ya es HTML de la app: otra plantilla html`…`, una lista de ellas (el resultado de un map) o un valor
   marcado con raw(…) (textos con etiquetas hechos aquí…). Cada raw() es un sitio donde no se escapa: si recibe datos de fuera, hay que
   escaparlos antes con X.
   El resultado es un Html: se comporta como texto (se concatena, se asigna a innerHTML, se guarda en JSON). Por eso, para el
   comprobador de tipos (tools/types.js), html`…` y raw() dan texto.
   Una plantilla larga se escribe en varias líneas, sangrada como HTML: dentro de html`…`, un salto de línea no forma parte del
   HTML (entre dos atributos de una etiqueta es el espacio que los separa). Los quita build.py antes de compilar y los pone
   «npm run format»; la regla entera está en tools/templates.js.
   En inglés (core/i18n), la plantilla pinta su texto fijo traducido y traduce los valores que van donde se lee texto.
   Define: raw, commas, part, partEn, html
*/
import { X } from './util.js';
import { EN, htmlPlan, tr } from './i18n.js';
/** Texto que ya es HTML seguro (lo devuelve html`…` y raw()). */
export class Html extends String {
}
/** Marca como HTML un texto generado por la app, para insertarlo sin escapar. En inglés, si el texto es una frase del
    diccionario, es su traducción (así se traduce un título o un rótulo que una función recibe y pone con raw).
    @param {any} v
    @returns {string} */
export const raw = v => /** @type {any} */ (v instanceof Html ? v : new Html(EN ? tr(v) : v));
/** Una lista separada por comas («Tríceps, Core»), con cada cosa en el idioma de la app.
    @param {any[]} items
    @returns {string} */
export const commas = items => /** @type {any} */ (new Html(items.map(v => X(tr(v))).join(', ')));
/** Un valor insertado: el Html tal cual, el resto escapado; una lista (p. ej. el resultado de un map) se une sin separador. */
const part = v => Array.isArray(v) ? v.map(part).join('') : v instanceof Html ? v : X(v);
/** Lo mismo, en inglés, para un valor que va donde se lee texto: si es una frase del diccionario, su traducción. */
const partEn = v => Array.isArray(v) ? v.map(partEn).join('') : v instanceof Html ? v : X(tr(v));
/** Plantilla que escapa los valores insertados salvo los que ya son Html.
    @param {TemplateStringsArray} parts
    @param {...any} values
    @returns {string} */
export const html = (parts, ...values) => {
  if (EN) {
    const p = htmlPlan(parts);
    let en = p.lits[0];
    for (let k = 0; k < p.idx.length; k++)
      en += (p.shown[k] ? partEn : part)(values[p.idx[k]]) + p.lits[k + 1];
    return /** @type {any} */ (new Html(en));
  }
  let out = parts[0];
  for (let i = 0; i < values.length; i++)
    out += part(values[i]) + parts[i + 1];
  return /** @type {any} */ (new Html(out));
};
