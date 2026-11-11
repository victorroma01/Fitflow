/* ═══ library/browse ═══
   Librería de ejercicios y ficha de cada ejercicio.
   Define: libState, libBody, libPage, exDetailHead, exDetailMuscles, exDetailExtras, exDetailHtml, exDetailSheet  · acciones/registros: 6
*/
import { $, roundInt, X } from '../core/util.js';
import { A, U } from '../core/registry.js';
import { groupLabel, groupOf, GROUPS } from '../data/library.js';
import { groupIcon } from '../core/icons.js';
import { fullPage, pgHead, sheet, sheetToTop } from '../core/ui.js';
import { exAll, exCompare, exMuscles, exOrder, exRowHtml, exSearchText } from './model.js';
import { exHero } from './photo.js';
import { equipDropdown, equipIn, equipMatch, filterOpen } from './filters.js';
import { exTip, withExInfo } from './howto.js';
import { bestOf } from '../workout/finish.js';
import { toDisplayWeight, weightUnit } from '../profile/units.js';
import { exAnatomy, exAnatomyFull } from '../extras/anatomy.js';
import { html, raw } from '../core/html.js';
export let libState = { g: '', q: '' };
export function libBody() {
  const al = exAll().map((e, i) => ({ e, i }));
  const q = (libState.q || '').toLowerCase().trim();
  const g = libState.g;
  const eq = libState.eq || [];
  if (!q && !g)
    return html`<p class="mu" style="margin:10px 0 4px">${al.length} ejercicios · toca un grupo muscular</p><div class="gg">${GROUPS.map(x => [x, al.filter(o => groupOf(o.e) == x).length]).filter(a => a[1]).map(a => html`<button data-a="libraryGroup" data-v="${a[0]}">${groupIcon(a[0], 88)}<b>${raw(groupLabel(a[0]))}</b><small>${raw(a[1])} ejercicios</small></button>`)}</div>`;
  const base = al.filter(o => q ? exSearchText(o.e).includes(q) : groupOf(o.e) == g);
  const l = base.filter(o => equipMatch(eq, o.e)).sort((a, b) => q ? exCompare(a.e, b.e) : exOrder(a.e) - exOrder(b.e)).slice(0, q ? 80 : 500);
  let h = '';
  let last = null;
  l.forEach(o => {
    const key = q ? groupLabel(groupOf(o.e)) : o.e.t;
    if (key !== last) {
      last = key;
      h += html`<div class="ph">${key || ''}</div>`;
    }
    h += exRowHtml(o, html`<button data-a="libraryAddToDay" data-i="${o.i}">+ Al día</button>`);
  });
  return (g && !q ? html`<div class="row" style="margin:8px 0 0"><button data-a="libraryGroup" data-v="">‹ Grupos</button><b>${groupLabel(g)} <span class="mu" style="font-weight:400">· ${base.length}</span></b>${groupIcon(g, 60)}</div>` : '') + equipDropdown('lb', eq, equipIn(base.map(o => o.e)), base.map(o => o.e)) + (h || '<p class="mu">Sin resultados.</p>');
}
const libPage = () => html`${pgHead('Librería de ejercicios')}<input placeholder="Buscar por nombre, músculo o equipo" aria-label="Buscar ejercicio" data-u="librarySearch" value="${libState.q || ''}"><div id="lr">${raw(libBody())}</div>`;
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
/* la ficha de un ejercicio: nombre, etiquetas (grupo, material y tipo) y su figura, que abre cómo se hace si no hay foto */
const exDetailHead = (e, g, ph, tap) => '<div class="row" style="align-items:flex-start;margin:6px 0 4px"><div style="flex:1;min-width:0"><h2 style="margin:0 0 8px;letter-spacing:-.02em">' + X(e.n) + '</h2><div class="exchips">' + [groupLabel(g), e.q, e.t && e.t != 'Otros' ? e.t : ''].filter(Boolean).map(x => html`<span class="tg" style="margin-right:6px;font-size:12px;padding:4px 9px">${x}</span>`).join('') + '</div></div><span class="anb"' + (ph ? '' : tap) + ' style="width:72px;height:72px;flex:none">' + exAnatomy(e.n, 72) + '</span></div>' + (ph ? '' : '<p class="mu hwh2">Toca la figura para ver cómo se hace.</p>');
/* los músculos principales y, si los hay, los secundarios */
const exDetailMuscles = e => '<h4 class="ph">Músculos principales</h4>' + (exMuscles(e, 'p').map(m => html`<span class="mc on">${m}</span>`).join('') || '<small class="mu">Sin datos</small>') + (exMuscles(e, 's').length ? html`<h4 class="ph">Músculos secundarios</h4>${exMuscles(e, 's').map(m => html`<span class="mc">${m}</span>`)}` : '');
/* su consejo, tu mejor marca y las variantes del mismo grupo y tipo, cada una con «+ Al día» */
const exDetailExtras = (e, pr, vr) => '<h4 class="ph">Consejo</h4>' + html`<p style="margin:6px 0">${exTip(e.n)}</p>` + (pr ? html`<h4 class="ph">Tu mejor marca</h4><p style="margin:6px 0">${toDisplayWeight(pr.w)} ${weightUnit()} × ${raw(pr.r)} · 1RM estimado ${roundInt(toDisplayWeight(pr.e))} ${weightUnit()}</p>` : '') + (vr.length ? html`<h4 class="ph">Variantes (${vr.length})</h4>${raw(vr.map(o => exRowHtml(o, html`<button data-a="libraryAddToDay" data-i="${o.i}">+ Al día</button>`)).join(''))}` : '');
const exDetailHtml = (i, nav, w) => {
  const all = exAll();
  const e = all[i];
  const g = groupOf(e);
  const pr = bestOf(e.n);
  const vr = w ? [] : all.map((x, j) => ({ e: x, i: j })).filter(o => o.e !== e && groupOf(o.e) == g && o.e.t == e.t && e.t != 'Otros');
  /* la imagen (la foto o, si no hay, la figura) abre cómo se hace el ejercicio (F-14) */
  const tap = html` data-a="exerciseHowTo" data-n="${e.n}"${raw(w ? '' : ' data-i="' + i + '"')} role="button" tabindex="0" aria-label="Cómo se hace: ${e.n}"`;
  const ph = exHero(e.n);
  return nav + (ph ? html`<div class="exhw"${tap}>${ph}<span class="hwh">Cómo se hace</span></div>` : '') + exDetailHead(e, g, ph, tap) + exAnatomyFull(e) + exDetailMuscles(e) + exDetailExtras(e, pr, vr) + '<div style="height:20px"></div>';
};
A.exerciseDetail = i => {
  if (!exAll()[i])
    return;
  withExInfo(() => exDetailSheet(i));
};
const exDetailSheet = i => {
  sheet(exDetailHtml(i, html`<div class="row"><button data-a="libraryBack" aria-label="Volver" style="border:0;background:none;font-size:24px;padding:6px 10px">←</button><button class="pr" data-a="libraryAddToDay" data-i="${i}" style="padding:9px 14px">+ Al día</button></div>`));
  sheetToTop();
};
A.exerciseDetailByName = (i, b) => {
  const j = exAll().findIndex(x => x.n == b.dataset.n);
  if (j < 0)
    return;
  withExInfo(() => {
    sheet(exDetailHtml(j, '<div class="row"><button data-a="closeSheet" aria-label="Cerrar" style="border:0;background:none;font-size:24px;padding:6px 10px">←</button></div>', 1));
    sheetToTop();
  });
};
/* — manejadores de esta función (registros A / C / U) — */
U.librarySearch = v => {
  libState.q = v;
  $('#lr').innerHTML = libBody();
};
