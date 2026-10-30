/* ═══ routines/builder ═══
   Mis workouts: lista, editor de bloques y lanzamiento.
   Define: routineState, BLOCK_KINDS, routineExRows, routineListPage, routineEditor, routineBlockPicker, openRoutines, routineRows, routineList, refreshRoutineRows, routineSnapshot, routineEditIndex, overviewSnapshot, routineToDay, restorePlanBackup  · acciones/registros: 22
*/
import { $, fmtMinSec, roundInt, X } from '../core/util.js';
import { A, C, U } from '../core/registry.js';
import { groupLabel } from '../data/library.js';
import { DAY_PHOTOS } from '../data/photos.js';
import { S, saveState } from '../core/state.js';
import { icon } from '../core/icons.js';
import { dialog, sheet } from '../core/ui.js';
import { exAll, exCellHtml, exCompare, exSearchText, groupOfName } from '../library/model.js';
import { equipDropdown, equipIn, equipMatch, filterOpen, filterRow, groupChips, groupDropdown, groupMatch } from '../library/filters.js';
import { REST_OPTIONS, restDefault } from '../workout/rest.js';
import { imagePicker, routineImage } from '../workout/images.js';
import { exAnatomy } from '../extras/anatomy.js';
import { html, raw } from '../core/html.js';
export let routineState = { i: -1, k: 1, sel: [], q: '' };
const BLOCK_KINDS = ['', 'Suelto', 'Superserie', 'Triserie'];
export const routineExRows = () => {
  const q = routineState.q.toLowerCase().trim();
  const bq = exAll().filter(e => !q || exSearchText(e).includes(q));
  const base = bq.filter(e => groupMatch(routineState.gs, e));
  return filterRow(groupDropdown('crg', routineState.gs, bq), equipDropdown('cr', routineState.eq, equipIn(base), base, 1)) + base.filter(e => equipMatch(routineState.eq, e)).sort(exCompare).slice(0, 100).map(e => html`<div class="it exr" data-a="bp" data-n="${e.n}" style="cursor:pointer"><span class="exc">${exCellHtml(e)}</span><small class="mu">Añadir +</small></div>`).join('') || '<p class="mu">Sin resultados.</p>';
};
const routineListPage = () => routineList();
export const routineEditor = () => {
  const r = S.cr[routineState.i];
  return html`<div class="row"><button data-a="cr">‹ Rutinas</button>${raw(routineState.nw ? '' : '<button data-a="crx" style="color:var(--c)">Eliminar</button>')}</div><h2 style="margin:14px 0 4px;letter-spacing:-.02em">Workout personalizado</h2><label>Nombre</label><input data-c="crn" value="${r.n}" aria-label="Nombre del workout"><label>Imagen del entrenamiento</label>${imagePicker(r)}${r.bl.map((b, j) => html`<div class="row" style="margin-top:16px"><b class="mu">SERIE ${raw(String.fromCharCode(65 + j))}</b>${b.ex.length > 1 ? html`<b style="color:#f59e0b">${raw(BLOCK_KINDS[b.ex.length])} · 10 s</b>` : ''}<button data-a="bd" data-i="${j}" style="padding:4px 10px">Quitar</button></div>${b.ex.map(n => html`<div class="ovx"><div class="th">${exAnatomy(n, 64)}</div><b style="flex:1">${n}</b></div>`)}<div class="row" style="margin-top:6px"><span><button data-a="bs" data-i="${j}" data-v="-1" aria-label="${'Una serie menos, serie ' + String.fromCharCode(65 + j)}">−</button> ${raw(b.s)} series <button data-a="bs" data-i="${j}" data-v="1" aria-label="${'Una serie más, serie ' + String.fromCharCode(65 + j)}">+</button></span><select data-c="br" data-i="${j}" aria-label="${'Descanso, serie ' + String.fromCharCode(65 + j)}" style="width:auto">${REST_OPTIONS.map(v => html`<option value="${v}"${v == b.r ? ' selected' : ''}>Descanso ${raw(fmtMinSec(v))}</option>`)}</select></div>`)}<button data-a="bnew" style="width:100%;margin-top:16px">+ Añadir bloque</button><div style="height:80px"></div><button class="sb" data-a="crc" style="background:var(--tx);color:var(--bg);border:0;padding:16px;font-size:16px;border-radius:16px">${routineState.nw ? 'Crear' : 'Guardar cambios'}</button>`;
};
const routineBlockPicker = () => html`<button data-a="cre" data-i="${routineState.i}">‹ Cancelar</button><h3>Nuevo bloque</h3>${[1, 2, 3].map(k => html`<button class="chip${routineState.k == k ? ' on' : ''}" data-a="bk" data-i="${k}">${raw(BLOCK_KINDS[k])}</button>`)}<p class="mu">Elige el ejercicio ${routineState.sel.length + 1} de ${routineState.k}${raw(routineState.sel.length ? ': ' + routineState.sel.map(X).join(' + ') : '')}</p><input placeholder="Buscar por nombre, músculo o equipo" aria-label="Buscar ejercicio" data-u="cq"><div id="cl2">${raw(routineExRows())}</div>`;
A.bp = (i, b) => {
  routineState.sel.push(b.dataset.n);
  routineState.q = '';
  if (routineState.sel.length >= routineState.k) {
    const l = routineState.sel[routineState.sel.length - 1];
    const r = restDefault(l);
    S.cr[routineState.i].bl.push({ ex: routineState.sel, s: 3, r: REST_OPTIONS.includes(r) ? r : 90 });
    routineState.sel = [];
    saveState();
    sheet(routineEditor());
  }
  else
    sheet(routineBlockPicker());
};
A.bs = (i, b) => {
  const x = S.cr[routineState.i].bl[i];
  x.s = Math.max(1, x.s + +b.dataset.v);
  saveState();
  sheet(routineEditor());
};
A.bd = i => {
  S.cr[routineState.i].bl.splice(i, 1);
  saveState();
  sheet(routineEditor());
};
const openRoutines = () => {
  sheet(routineListPage());
  $('#sh').className = 'full';
};
function routineRows() {
  const q = (routineState.s || '').toLowerCase();
  let l = S.cr.map((r, i) => ({ r, i })).filter(o => o.r.n.toLowerCase().includes(q));
  if (routineState.so)
    l.sort((a, b) => a.r.n.localeCompare(b.r.n));
  else
    l.reverse();
  return l.map(({ r, i }) => {
    const k = routineImage(r);
    const ex = [].concat(...r.bl.map(b => b.ex));
    const gs = [...new Set(ex.map(n => groupLabel(groupOfName(n))))];
    const ns = r.bl.reduce((s, b) => s + b.s * b.ex.length, 0);
    return html`<div class="ovx" style="align-items:flex-start;padding:16px 0"><div data-a="cre" data-i="${i}" aria-hidden="true" style="width:96px;height:132px;border-radius:16px;flex:none;cursor:pointer;background:url(${DAY_PHOTOS[k]}) center/cover"></div><div style="flex:1;min-width:0"><div class="row"><small style="color:var(--a1);font-weight:700">${icon('prog', 14)} Personalizado</small><button data-a="crm" data-i="${i}" aria-label="${'Opciones de ' + r.n}" style="border:0;background:none;padding:4px 8px"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button></div><b data-a="cre" data-i="${i}" role="button" tabindex="0" style="font-size:20px;display:block;margin:4px 0 10px;cursor:pointer">${r.n}</b><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="tg">${roundInt(ns * 2.4)} min</span>${gs.slice(0, 2).map(g => html`<span class="tg">${raw(g)}</span>`)}${gs.length > 2 ? html`<span class="tg">+${gs.length - 2}</span>` : ''}</div>${routineState.m === i ? html`<div class="g2" style="margin-top:10px;grid-template-columns:repeat(3,1fr)"><button class="pr" data-a="crgo" data-i="${i}">Empezar</button><button data-a="cre" data-i="${i}">Editar</button><button data-a="crd" data-i="${i}" style="color:var(--c)">Borrar</button></div>` : ''}</div></div>`;
  }).join('') || '<p class="mu">Aún no tienes workouts. Crea el primero con el botón de abajo.</p>';
}
function routineList() {
  return html`<div class="row"><button data-a="cl" aria-label="Volver" style="border:0;background:none;font-size:24px;padding:6px 10px">←</button></div><h1 style="font-size:32px;letter-spacing:-.03em;margin:10px 0 16px">Workouts personalizados</h1><div class="row" style="margin-bottom:6px"><input placeholder="Buscar" aria-label="Buscar workout" data-u="crs" value="${routineState.s || ''}"><button data-a="crso" aria-label="Cambiar el orden" style="padding:12px 14px">${icon('swp', 20)}</button></div><div id="crl">${raw(routineRows())}</div><div style="height:90px"></div><button class="sb" data-a="crn" style="background:var(--tx);color:var(--bg);border:0;padding:16px;font-size:16px;border-radius:16px">Crear workout</button>`;
}
const refreshRoutineRows = () => {
  const e = $('#crl');
  if (e)
    e.innerHTML = routineRows();
};
U.crs = v => {
  routineState.s = v;
  refreshRoutineRows();
};
A.crso = () => {
  routineState.so = !routineState.so;
  refreshRoutineRows();
};
A.crm = i => {
  routineState.m = routineState.m === i ? null : i;
  refreshRoutineRows();
};
let routineSnapshot = null;
let routineEditIndex = -1;
export let overviewSnapshot = '';
/** Cambia `overviewSnapshot` desde otros módulos (un módulo no puede asignar una variable importada). */
export const setOverviewSnapshot = v => {
  overviewSnapshot = v;
};
A.crn = () => {
  routineState.nw = true;
  S.cr.push({ n: 'Mi workout ' + (S.cr.length + 1), bl: [] });
  routineState.i = S.cr.length - 1;
  saveState();
  sheet(routineEditor());
  routineEditIndex = routineState.i;
  routineSnapshot = JSON.stringify(S.cr[routineState.i]);
};
A.cre = i => {
  if (routineEditIndex !== i || routineSnapshot == null) {
    routineEditIndex = i;
    routineSnapshot = JSON.stringify(S.cr[i]);
    routineState.nw = false;
  }
  routineState.i = i;
  sheet(routineEditor());
};
A.cr = () => {
  if (routineSnapshot == null || !S.cr[routineEditIndex]) {
    routineSnapshot = null;
    openRoutines();
    return;
  }
  if (routineState.nw)
    dialog('¿Descartar este workout?', 'Aún no lo has creado. Si sales, se perderá.', [['Seguir editando', 'zno', ''], ['Descartar', 'crn2', 'pr']]);
  else if (JSON.stringify(S.cr[routineEditIndex]) != routineSnapshot)
    dialog('¿Guardar los cambios?', 'Has modificado este workout.', [['Descartar', 'crd2', ''], ['Guardar', 'crs2', 'pr']]);
  else {
    routineSnapshot = null;
    openRoutines();
  }
};
A.crn2 = () => {
  S.cr.splice(routineEditIndex, 1);
  routineState.nw = false;
  routineSnapshot = null;
  saveState();
  openRoutines();
};
A.crs2 = () => {
  routineSnapshot = null;
  saveState();
  openRoutines();
};
A.crd2 = () => {
  S.cr[routineEditIndex] = JSON.parse(routineSnapshot);
  routineSnapshot = null;
  saveState();
  openRoutines();
};
A.crc = () => {
  const r = S.cr[routineState.i];
  if (!r.bl.length) {
    dialog('Añade al menos un bloque', 'Elige uno o varios ejercicios con el botón Añadir bloque.', [['Entendido', 'zno', 'pr']]);
    return;
  }
  if (!routineState.nw) {
    dialog('¿Guardar los cambios?', 'Se actualizará este workout personalizado.', [['Cancelar', 'zno', ''], ['Guardar', 'crc1', 'pr']]);
    return;
  }
  A.crc1();
};
A.crc1 = () => {
  routineState.nw = false;
  routineSnapshot = null;
  saveState();
  openRoutines();
};
A.crx = () => dialog('¿Borrar este workout?', 'Se eliminará de tu lista.', [['Cancelar', 'zno', ''], ['Borrar', 'crx1', 'pr']]);
A.crx1 = () => {
  routineState.nw = false;
  routineSnapshot = null;
  S.cr.splice(routineState.i, 1);
  saveState();
  sheet(routineListPage());
};
A.crd = i => {
  routineState.dx = i;
  dialog('¿Borrar este workout?', 'Se eliminará de tu lista.', [['Cancelar', 'zno', ''], ['Borrar', 'crdo', 'pr']]);
};
A.crdo = () => {
  S.cr.splice(routineState.dx, 1);
  routineState.m = null;
  saveState();
  refreshRoutineRows();
};
export const routineToDay = i => {
  const r = S.cr[i];
  const ex = [];
  r.bl.forEach((b, j) => {
    const u = 'b' + Date.now() + j;
    b.ex.forEach((n, k) => {
      const o = { n, s: b.s, r: k < b.ex.length - 1 ? 10 : b.r };
      if (b.ex.length > 1)
        o.b = u;
      ex.push(o);
    });
  });
  return { n: r.n, ex, cu: 1, img: routineImage(r) };
};
export const restorePlanBackup = () => {
  if (S.pbk) {
    S.plan[S.pbk.sel] = S.pbk.day;
    S.pbk = null;
    saveState();
  }
};
A.crgo = i => {
  if (!S.cr[i].bl.length)
    return;
  S.pbk = { sel: S.sel, day: S.plan[S.sel] };
  S.plan[S.sel] = routineToDay(i);
  saveState();
  sheet();
  A.go();
};
A.bnew = () => {
  routineState.g = '';
  routineState.gs = [];
  routineState.eq = [];
  filterOpen.cr = 0;
  filterOpen.crg = 0;
  routineState.k = 1;
  routineState.sel = [];
  routineState.q = '';
  sheet(routineBlockPicker());
};
A.bk = (i, b) => {
  routineState.g = '';
  routineState.gs = [];
  routineState.eq = [];
  filterOpen.cr = 0;
  filterOpen.crg = 0;
  routineState.k = i;
  routineState.sel = [];
  routineState.q = '';
  sheet(routineBlockPicker());
};
A.crg = (i, b) => {
  routineState.g = b.dataset.v;
  routineState.eq = [];
  $('#crgc').innerHTML = groupChips(routineState.g, 'crg');
  $('#cl2').innerHTML = routineExRows();
};
/* — manejadores de esta función (registros A / C / U) — */
U.cq = v => {
  routineState.q = v;
  $('#cl2').innerHTML = routineExRows();
};
C.crn = e => {
  S.cr[routineState.i].n = e.value;
  saveState();
};
C.br = (e, i) => {
  S.cr[routineState.i].bl[i].r = +e.value;
  saveState();
};
