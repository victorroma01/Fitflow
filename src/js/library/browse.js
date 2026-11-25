/* ═══ library/browse ═══
   Librería de ejercicios y ficha de cada ejercicio.
   Define: libState, libBody, libPage, exDetailHead, exDetailMuscles, exDetailExtras, exDetailHtml, exDetailSheet  · acciones/registros: 6
*/
import { $, roundInt, X } from '../core/util.js';
import { A, U } from '../core/registry.js';
import { groupLabel, groupOf, GROUPS } from '../data/library.js';
import { groupIcon } from '../core/icons.js';
import { fullPage, pgHead, sheet, sheetToTop } from '../core/ui.js';
import { exAll, exCompare, exMuscles, exOrder, exRowHtml, exSearchText, liveName } from './model.js';
import { equipDropdown, equipIn, equipMatch, filterOpen } from './filters.js';
import { exTip, withExInfo } from './howto.js';
import { customTools, isCustomExercise } from './custom.js';
import { bestOf } from '../workout/finish.js';
import { toDisplayWeight, weightUnit } from '../profile/units.js';
import { exAnatomyFull } from '../extras/anatomy.js';
import { exHasFigure, exPicture } from '../extras/pictures.js';
import { html, raw } from '../core/html.js';
export let libState = { g: '', q: '' };
export function libBody() {
  const al = exAll().map((e, i) => ({ e, i }));
  const q = (libState.q || '').toLowerCase().trim();
  const g = libState.g;
  const eq = libState.eq || [];
  if (!q && !g)
    return html`
      <p class="muted m-10-0-4">${al.length} ejercicios · toca un grupo muscular</p>
      <div class="group-grid">
        ${GROUPS.map(x => [x, al.filter(o => groupOf(o.e) == x).length]).filter(a => a[1]).map(a => html`
          <button data-a="libraryGroup" data-v="${a[0]}">
            ${groupIcon(a[0], 88)}
            <b>${raw(groupLabel(a[0]))}</b>
            <small>${raw(a[1])} ejercicios</small>
          </button>`)}
      </div>`;
  const base = al.filter(o => q ? exSearchText(o.e).includes(q) : groupOf(o.e) == g);
  const l = base.filter(o => equipMatch(eq, o.e)).sort((a, b) => q ? exCompare(a.e, b.e) : exOrder(a.e) - exOrder(b.e)).slice(0, q ? 80 : 500);
  let h = '';
  let last = null;
  l.forEach((o, row) => {
    const key = q ? groupLabel(groupOf(o.e)) : o.e.t;
    if (key !== last) {
      last = key;
      h += html`<div class="section-label">${key || ''}</div>`;
    }
    h += exRowHtml(o, html`<button data-a="libraryAddToDay" data-i="${o.i}">+ Al día</button>`, '', row);
  });
  return (g && !q ? html`
    <div class="row m-8-0-0">
      <button data-a="libraryGroup" data-v="" data-back="1">‹ Grupos</button>
      <b>${groupLabel(g)} <span class="muted fw-400">· ${base.length}</span></b>
      ${groupIcon(g, 60)}
    </div>
  ` : '') + equipDropdown('lb', eq, equipIn(base.map(o => o.e)), base.map(o => o.e)) + (h || '<p class="muted">Sin resultados.</p>');
}
const libPage = () => html`
  ${pgHead('Librería de ejercicios')}
  <input placeholder="Buscar por nombre, músculo o equipo" aria-label="Buscar ejercicio" data-u="librarySearch" value="${libState.q || ''}">
  <div id="lr">${raw(libBody())}</div>`;
A.openLibrary = () => {
  libState = { g: '', q: '', eq: [] };
  fullPage(libPage());
};
A.libraryBack = () => {
  sheet(libPage());
  sheetToTop();
};
A.libraryGroup = (i, b) => {
  libState.g = b.dataset.v;
  libState.q = '';
  libState.eq = [];
  filterOpen.lb = 0;
  sheet(libPage());
  sheetToTop();
};
/* la ficha de un ejercicio: nombre, etiquetas (grupo, material y tipo) y su imagen, que abre cómo se hace: la figura
   haciéndolo o, en uno propio, que no tiene, sus músculos o el icono de su grupo */
const exDetailHead = (e, g, tap) => '<div class="row ai-start m-6-0-4"><div class="fx-1 minw-0"><h2 class="m-0-0-8 ls-n0_02em">' + X(e.n) + '</h2><div class="exchips">' + [groupLabel(g), e.q, e.t && e.t != 'Otros' ? e.t : ''].filter(Boolean).map(x => html`<span class="tag mr-6 fs-12 p-4-9">${x}</span>`).join('') + '</div></div><span class="anatomy-box w-72 h-72 fx-none"' + tap + '>' + exPicture(e.n, 72) + '</span></div><p class="muted howto-hint">Toca la ' + (exHasFigure(e.n) ? 'figura' : 'imagen') + ' para ver cómo se hace.</p>';
/* los músculos principales y, si los hay, los secundarios */
const exDetailMuscles = e => '<h4 class="section-label">Músculos principales</h4>' + (exMuscles(e, 'p').map(m => html`<span class="muscle-chip on">${m}</span>`).join('') || '<small class="muted">Sin datos</small>') + (exMuscles(e, 's').length ? html`
  <h4 class="section-label">Músculos secundarios</h4>
  ${exMuscles(e, 's').map(m => html`<span class="muscle-chip">${m}</span>`)}` : '');
/* su consejo, tu mejor marca y las variantes del mismo grupo y tipo, cada una con «+ Al día» */
const exDetailExtras = (e, pr, vr) => '<h4 class="section-label">Consejo</h4>' + html`<p class="m-6-0">${exTip(e.n)}</p>` + (pr ? html`
  <h4 class="section-label">Tu mejor marca</h4>
  <p class="m-6-0">
    ${toDisplayWeight(pr.w)} ${weightUnit()} × ${raw(pr.r)} · 1RM estimado ${roundInt(toDisplayWeight(pr.e))} ${weightUnit()}
  </p>
` : '') + (vr.length ? html`
  <h4 class="section-label">Variantes (${vr.length})</h4>
  ${raw(vr.map(o => exRowHtml(o, html`<button data-a="libraryAddToDay" data-i="${o.i}">+ Al día</button>`)).join(''))}` : '');
const exDetailHtml = (i, nav, w) => {
  const all = exAll();
  const e = all[i];
  const g = groupOf(e);
  const pr = bestOf(e.n);
  const vr = w ? [] : all.map((x, j) => ({ e: x, i: j })).filter(o => o.e !== e && groupOf(o.e) == g && o.e.t == e.t && e.t != 'Otros');
  /* la figura abre cómo se hace el ejercicio (F-14) */
  const tap = html` data-a="exerciseHowTo" data-n="${e.n}"${raw(w ? '' : ' data-i="' + i + '"')} role="button" tabindex="0" aria-label="Cómo se hace: ${e.n}"`;
  return nav + exDetailHead(e, g, tap) + exAnatomyFull(e) + exDetailMuscles(e) + exDetailExtras(e, pr, vr) + (!w && isCustomExercise(e.n) ? customTools(i) : '') + '<div class="h-20"></div>';
};
A.exerciseDetail = i => {
  if (!exAll()[i])
    return;
  withExInfo(() => exDetailSheet(i));
};
const exDetailSheet = i => {
  sheet(exDetailHtml(i, html`
    <div class="row">
      <button data-a="libraryBack" aria-label="Volver" class="bd-0 bg-none fs-24 p-6-10">←</button>
      <button class="primary p-9-14" data-a="libraryAddToDay" data-i="${i}">+ Al día</button>
    </div>`));
  sheetToTop();
};
/* (la de un ejercicio que se guardó con un nombre que ya no está en la librería, porque era el mismo que otro, es la del que
   queda: data/aliases, EX_RETIRED) */
A.exerciseDetailByName = (i, b) => {
  const n = liveName(b.dataset.n);
  const j = exAll().findIndex(x => x.n == n);
  if (j < 0)
    return;
  withExInfo(() => {
    sheet(exDetailHtml(j, '<div class="row"><button data-a="closeSheet" aria-label="Cerrar" class="bd-0 bg-none fs-24 p-6-10">←</button></div>', 1));
    sheetToTop();
  });
};
/* — manejadores de esta función (registros A / C / U) — */
U.librarySearch = v => {
  libState.q = v;
  $('#lr').innerHTML = libBody();
};
