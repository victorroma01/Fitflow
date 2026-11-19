/* ═══ library/model ═══
   Modelo de ejercicios: lista completa, músculos, filas y orden.
   Define: LIB_BY_NAME, libByName, exByName, groupOfName, overlapCount, exAll, exOrder, exMuscles, searchText, SEARCH_TEXT, exSearchText, exSubtitle, exMusclesHtml, ROWS_WITH_PICTURE, exCellHtml, exRowHtml, exCompare, categoryOf
*/
import { X } from '../core/util.js';
import { EXERCISES, groupOf, GROUPS, MUSCLES } from '../data/library.js';
import { EX_ALIASES } from '../data/aliases.js';
import { S } from '../core/state.js';
import { exPicture, exPictureLater } from '../extras/anatomy.js';
import { html, raw } from '../core/html.js';
/* los ejercicios de la biblioteca por nombre (el primero, si alguno se repitiera). La biblioteca no cambia después de
   arrancar; los propios, sí (se renombran en su sitio), y por eso esos se buscan en su lista, que es corta */
let LIB_BY_NAME = null;
const libByName = () => {
  if (!LIB_BY_NAME) {
    LIB_BY_NAME = new Map();
    EXERCISES.forEach(e => LIB_BY_NAME.has(e.n) || LIB_BY_NAME.set(e.n, e));
  }
  return LIB_BY_NAME;
};
/** El ejercicio llamado `n`: el de la biblioteca o, si no lo hay, el propio con ese nombre; undefined si no existe. Lo mismo
    que buscarlo en exAll(), sin juntar ni recorrer las dos listas en cada llamada (las listas y las figuras lo piden por fila). */
export const exByName = n => libByName().get(n) || (S.customExercises || []).find(x => x.n == n);
export const groupOfName = n => {
  const e = exByName(n);
  return e ? groupOf(e) : 'Propio';
};
export const overlapCount = (a, b) => a.filter(x => b.includes(x)).length;
export const exAll = () => EXERCISES.concat(S.customExercises);
export const exOrder = e => e.k == null ? 9999 : e.k;
export const exMuscles = (e, k) => (e[k] || []).map(c => MUSCLES[c]).filter(Boolean);
const searchText = e => {
  const s = (e.n + ' ' + (e.t || '') + ' ' + (e.q || '') + ' ' + exMuscles(e, 'p').concat(exMuscles(e, 's')).join(' ') + ' ' + (EX_ALIASES[e.n] || '')).toLowerCase();
  return s + ' ' + s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};
/* el de los de la biblioteca, que no cambian, se calcula una vez: el buscador lo pide para todos en cada letra. El de los
   propios, que se pueden editar, cada vez */
const SEARCH_TEXT = new WeakMap();
/** El texto en el que busca el buscador: nombre, tipo, material, músculos y otros nombres, también sin tildes. */
export const exSearchText = e => {
  if (libByName().get(e.n) !== e)
    return searchText(e);
  let s = SEARCH_TEXT.get(e);
  if (s == null)
    SEARCH_TEXT.set(e, s = searchText(e));
  return s;
};
const exSubtitle = e => X((e.q || 'Personalizado') + (e.t && e.t != 'Otros' ? ' · ' + e.t : ''));
const exMusclesHtml = e => (exMuscles(e, 'p').length ? html`
  <small class="c-at">Principal: ${exMuscles(e, 'p').join(', ')}</small>
` : '') + (exMuscles(e, 's').length ? html`<br><small class="mu">Secundarios: ${exMuscles(e, 's').join(', ')}</small>` : '');
/* las filas de una lista que llevan su figura desde el principio: las que se ven al abrirla, con algo de margen. Las
   siguientes la reciben al acercarse a la pantalla (extras/anatomy, exPictureLater) */
const ROWS_WITH_PICTURE = 12;
/** La celda de un ejercicio en una lista: su imagen, nombre, material y músculos. `row`, el puesto de la fila en la lista
    (si no se dice, lleva la imagen desde el principio). */
export const exCellHtml = (e, row) => html`
  <i class="exth">${row >= ROWS_WITH_PICTURE ? exPictureLater(e.n, 48) : exPicture(e.n, 48)}</i>
  <span class="ext"><b>${e.n}</b><br><small>${raw(exSubtitle(e))}</small><br>${raw(exMusclesHtml(e))}</span>`;
export const exRowHtml = (o, btn, act, row) => html`
  <div class="it exr"><span class="exc" data-a="${act || 'exerciseDetail'}" data-i="${o.i}">${exCellHtml(o.e, row)}</span>${raw(btn)}</div>`;
export const exCompare = (a, b) => GROUPS.indexOf(groupOf(a)) - GROUPS.indexOf(groupOf(b)) || exOrder(a) - exOrder(b);
export const categoryOf = g => ['CrossFit', 'Hyrox', 'Funcional', 'Cardio'].includes(g) ? g : 'Culturismo';
