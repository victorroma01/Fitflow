/* ═══ library/browse ═══
   Librería de ejercicios y ficha de cada ejercicio.
   Define: libState, libBody, libPage, exDetailHtml  · acciones/registros: 6
*/
import { $, roundInt, X } from '../core/util.js';
import { A, U } from '../core/registry.js';
import { groupLabel, groupOf, GROUPS } from '../data/library.js';
import { groupIcon } from '../core/icons.js';
import { fullPage, pgHead, sheet, sheetToTop } from '../core/ui.js';
import { exAll, exCompare, exMuscles, exOrder, exRowHtml, exSearchText } from './model.js';
import { exHero } from './photo.js';
import { equipDropdown, equipIn, equipMatch, filterOpen } from './filters.js';
import { exTips } from '../workout/day.js';
import { bestOf } from '../workout/finish.js';
import { toDisplayWeight, weightUnit } from '../profile/units.js';
import { exAnatomy, exAnatomyFull } from '../extras/anatomy.js';
export let libState = { g: '', q: '' };
export function libBody() {
  const al = exAll().map((e, i) => ({ e, i }));
  const q = (libState.q || '').toLowerCase().trim();
  const g = libState.g;
  const eq = libState.eq || [];
  if (!q && !g)
    return '<p class="mu" style="margin:10px 0 4px">' + al.length + ' ejercicios · toca un grupo muscular</p><div class="gg">' + GROUPS.map(x => [x, al.filter(o => groupOf(o.e) == x).length]).filter(a => a[1]).map(a => '<button data-a="lb" data-v="' + a[0] + '">' + groupIcon(a[0], 88) + '<b>' + groupLabel(a[0]) + '</b><small>' + a[1] + ' ejercicios</small></button>').join('') + '</div>';
  const base = al.filter(o => q ? exSearchText(o.e).includes(q) : groupOf(o.e) == g);
  const l = base.filter(o => equipMatch(eq, o.e)).sort((a, b) => q ? exCompare(a.e, b.e) : exOrder(a.e) - exOrder(b.e)).slice(0, q ? 80 : 500);
  let h = '';
  let last = null;
  l.forEach(o => {
    const key = q ? groupLabel(groupOf(o.e)) : o.e.t;
    if (key !== last) {
      last = key;
      h += '<div class="ph">' + X(key || '') + '</div>';
    }
    h += exRowHtml(o, '<button data-a="lad" data-i="' + o.i + '">+ Al día</button>');
  });
  return (g && !q ? '<div class="row" style="margin:8px 0 0"><button data-a="lb" data-v="">‹ Grupos</button><b>' + X(groupLabel(g)) + ' <span class="mu" style="font-weight:400">· ' + base.length + '</span></b>' + groupIcon(g, 60) + '</div>' : '') + equipDropdown('lb', eq, equipIn(base.map(o => o.e)), base.map(o => o.e)) + (h || '<p class="mu">Sin resultados.</p>');
}
const libPage = () => pgHead('Librería de ejercicios') + '<input placeholder="Buscar por nombre, músculo o equipo" data-u="ls" value="' + X(libState.q || '') + '"><div id="lr">' + libBody() + '</div>';
A.lib = () => {
  libState = { g: '', q: '', eq: [] };
  fullPage(libPage());
};
A.lib2 = () => {
  sheet(libPage());
  sheetToTop();
};
A.lb = (i, b) => {
  libState.g = b.dataset.v;
  libState.q = '';
  libState.eq = [];
  filterOpen.lb = 0;
  sheet(libPage());
  sheetToTop();
};
A.leq = (i, b) => {
  libState.eq = b.dataset.v;
  $('#lr').innerHTML = libBody();
};
const exDetailHtml = (i, nav, w) => {
  const all = exAll();
  const e = all[i];
  const g = groupOf(e);
  const pr = bestOf(e.n);
  const vr = w ? [] : all.map((x, j) => ({ e: x, i: j })).filter(o => o.e !== e && groupOf(o.e) == g && o.e.t == e.t && e.t != 'Otros');
  return nav + exHero(e.n) + '<div class="row" style="align-items:flex-start;margin:6px 0 4px"><div style="flex:1;min-width:0"><h2 style="margin:0 0 8px;letter-spacing:-.02em">' + X(e.n) + '</h2><div class="exchips">' + [groupLabel(g), e.q, e.t && e.t != 'Otros' ? e.t : ''].filter(Boolean).map(x => '<span class="tg" style="margin-right:6px;font-size:12px;padding:4px 9px">' + X(x) + '</span>').join('') + '</div></div><span class="anb" style="width:72px;height:72px;flex:none">' + exAnatomy(e.n, 72) + '</span></div>' + exAnatomyFull(e) + '<h4 class="ph">Músculos principales</h4>' + (exMuscles(e, 'p').map(m => '<span class="mc on">' + X(m) + '</span>').join('') || '<small class="mu">Sin datos</small>') + (exMuscles(e, 's').length ? '<h4 class="ph">Músculos secundarios</h4>' + exMuscles(e, 's').map(m => '<span class="mc">' + X(m) + '</span>').join('') : '') + '<h4 class="ph">Técnica</h4>' + exTips(e.n).map(t => '<p style="margin:6px 0">' + X(t) + '</p>').join('') + (pr ? '<h4 class="ph">Tu mejor marca</h4><p style="margin:6px 0">' + toDisplayWeight(pr.w) + ' ' + weightUnit() + ' × ' + pr.r + ' · 1RM estimado ' + roundInt(toDisplayWeight(pr.e)) + ' ' + weightUnit() + '</p>' : '') + (vr.length ? '<h4 class="ph">Variantes (' + vr.length + ')</h4>' + vr.map(o => exRowHtml(o, '<button data-a="lad" data-i="' + o.i + '">+ Al día</button>')).join('') : '') + '<div style="height:20px"></div>';
};
A.exd = i => {
  if (!exAll()[i])
    return;
  sheet(exDetailHtml(i, '<div class="row"><button data-a="lib2" aria-label="Volver" style="border:0;background:none;font-size:24px;padding:6px 10px">←</button><button class="pr" data-a="lad" data-i="' + i + '" style="padding:9px 14px">+ Al día</button></div>'));
  sheetToTop();
};
A.exv = (i, b) => {
  const j = exAll().findIndex(x => x.n == b.dataset.n);
  if (j < 0)
    return;
  sheet(exDetailHtml(j, '<div class="row"><button data-a="cl" aria-label="Cerrar" style="border:0;background:none;font-size:24px;padding:6px 10px">←</button></div>', 1));
  sheetToTop();
};
/* — manejadores de esta función (registros A / C / U) — */
U.ls = v => {
  libState.q = v;
  $('#lr').innerHTML = libBody();
};
