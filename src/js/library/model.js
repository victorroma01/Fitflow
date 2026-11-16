/* ═══ library/model ═══
   Modelo de ejercicios: lista completa, músculos, filas y orden.
   Define: groupOfName, overlapCount, exAll, exOrder, exMuscles, exSearchText, exSubtitle, exMusclesHtml, ROWS_WITH_PICTURE, exCellHtml, exRowHtml, exCompare, categoryOf
*/
import { X } from '../core/util.js';
import { EXERCISES, groupOf, GROUPS, MUSCLES } from '../data/library.js';
import { EX_ALIASES } from '../data/aliases.js';
import { S } from '../core/state.js';
import { exPicture, exPictureLater } from '../extras/anatomy.js';
import { html, raw } from '../core/html.js';
export const groupOfName = n => {
  const e = EXERCISES.concat(S.customExercises).find(x => x.n == n);
  return e ? groupOf(e) : 'Propio';
};
export const overlapCount = (a, b) => a.filter(x => b.includes(x)).length;
export const exAll = () => EXERCISES.concat(S.customExercises);
export const exOrder = e => e.k == null ? 9999 : e.k;
export const exMuscles = (e, k) => (e[k] || []).map(c => MUSCLES[c]).filter(Boolean);
export const exSearchText = e => {
  const s = (e.n + ' ' + (e.t || '') + ' ' + (e.q || '') + ' ' + exMuscles(e, 'p').concat(exMuscles(e, 's')).join(' ') + ' ' + (EX_ALIASES[e.n] || '')).toLowerCase();
  return s + ' ' + s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};
const exSubtitle = e => X((e.q || 'Personalizado') + (e.t && e.t != 'Otros' ? ' · ' + e.t : ''));
const exMusclesHtml = e => (exMuscles(e, 'p').length ? html`<small class="c-at">Principal: ${exMuscles(e, 'p').join(', ')}</small>` : '') + (exMuscles(e, 's').length ? html`<br><small class="mu">Secundarios: ${exMuscles(e, 's').join(', ')}</small>` : '');
/* las filas de una lista que llevan su figura desde el principio: las que se ven al abrirla, con algo de margen. Las
   siguientes la reciben al acercarse a la pantalla (extras/anatomy, exPictureLater) */
const ROWS_WITH_PICTURE = 12;
/** La celda de un ejercicio en una lista: su imagen, nombre, material y músculos. `row`, el puesto de la fila en la lista
    (si no se dice, lleva la imagen desde el principio). */
export const exCellHtml = (e, row) => html`<i class="exth">${row >= ROWS_WITH_PICTURE ? exPictureLater(e.n, 48) : exPicture(e.n, 48)}</i><span class="ext"><b>${e.n}</b><br><small>${raw(exSubtitle(e))}</small><br>${raw(exMusclesHtml(e))}</span>`;
export const exRowHtml = (o, btn, act, row) => html`<div class="it exr"><span class="exc" data-a="${act || 'exerciseDetail'}" data-i="${o.i}">${exCellHtml(o.e, row)}</span>${raw(btn)}</div>`;
export const exCompare = (a, b) => GROUPS.indexOf(groupOf(a)) - GROUPS.indexOf(groupOf(b)) || exOrder(a) - exOrder(b);
export const categoryOf = g => ['CrossFit', 'Hyrox', 'Funcional', 'Cardio'].includes(g) ? g : 'Culturismo';
