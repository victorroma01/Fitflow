/* ═══ library/model ═══
   Modelo de ejercicios: lista completa, músculos, filas y orden.
   Define: groupOfName, overlapCount, exAll, exOrder, exMuscles, exSearchText, exSubtitle, exMusclesHtml, exCellHtml, exRowHtml, exCompare, categoryOf
*/
import { X } from '../core/util.js';
import { EXERCISES, groupOf, GROUPS, MUSCLES } from '../data/library.js';
import { EX_ALIASES } from '../data/photos.js';
import { S } from '../core/state.js';
import { exBadge } from './photo.js';
import { exAnatomy } from '../extras/anatomy.js';
import { html, raw } from '../core/html.js';
export const groupOfName = n => {
  const e = EXERCISES.concat(S.cx).find(x => x.n == n);
  return e ? groupOf(e) : 'Propio';
};
export const overlapCount = (a, b) => a.filter(x => b.includes(x)).length;
export const exAll = () => EXERCISES.concat(S.cx);
export const exOrder = e => e.k == null ? 9999 : e.k;
export const exMuscles = (e, k) => (e[k] || []).map(c => MUSCLES[c]).filter(Boolean);
export const exSearchText = e => {
  const s = (e.n + ' ' + (e.t || '') + ' ' + (e.q || '') + ' ' + exMuscles(e, 'p').concat(exMuscles(e, 's')).join(' ') + ' ' + (EX_ALIASES[e.n] || '')).toLowerCase();
  return s + ' ' + s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};
const exSubtitle = e => X((e.q || 'Personalizado') + (e.t && e.t != 'Otros' ? ' · ' + e.t : ''));
const exMusclesHtml = e => (exMuscles(e, 'p').length ? html`<small style="color:var(--a1)">Principal: ${exMuscles(e, 'p').join(', ')}</small>` : '') + (exMuscles(e, 's').length ? html`<br><small class="mu">Secundarios: ${exMuscles(e, 's').join(', ')}</small>` : '');
export const exCellHtml = e => html`<i class="exth">${exAnatomy(e.n, 48)}${raw(exBadge(e.n))}</i><span class="ext"><b>${e.n}</b><br><small>${raw(exSubtitle(e))}</small><br>${raw(exMusclesHtml(e))}</span>`;
export const exRowHtml = (o, btn, act) => html`<div class="it exr"><span class="exc" data-a="${act || 'exd'}" data-i="${o.i}">${exCellHtml(o.e)}</span>${raw(btn)}</div>`;
export const exCompare = (a, b) => GROUPS.indexOf(groupOf(a)) - GROUPS.indexOf(groupOf(b)) || exOrder(a) - exOrder(b);
export const categoryOf = g => ['CrossFit', 'Hyrox', 'Funcional', 'Cardio'].includes(g) ? g : 'Culturismo';
