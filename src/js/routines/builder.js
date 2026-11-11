/* ═══ routines/builder ═══
   Mis workouts: lista, editor de bloques y lanzamiento.
   Define: routineState, BLOCK_KINDS, routineExRows, routineListPage, routineEditor, routineBlockPicker, openRoutines, routineRows, routineList, refreshRoutineRows, routineSnapshot, routineEditIndex, overviewSnapshot, setOverviewSnapshot, routineToDay, restorePlanBackup  · acciones/registros: 25
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
  return filterRow(groupDropdown('crg', routineState.gs, bq), equipDropdown('cr', routineState.eq, equipIn(base), base, 1)) + base.filter(e => equipMatch(routineState.eq, e)).sort(exCompare).slice(0, 100).map(e => html`<div class="it exr" data-a="routinePickExercise" data-n="${e.n}" style="cursor:pointer"><span class="exc">${exCellHtml(e)}</span><small class="mu">Añadir +</small></div>`).join('') || '<p class="mu">Sin resultados.</p>';
};
const routineListPage = () => routineList();
export const routineEditor = () => {
  const r = S.routines[routineState.i];
  return html`<div class="row"><button data-a="routineEditorBack">‹ Rutinas</button>${raw(routineState.nw ? '' : '<button data-a="routineDeleteAsk" style="color:var(--ctx)">Eliminar</button>')}</div><h2 style="margin:14px 0 4px;letter-spacing:-.02em">Workout personalizado</h2><label>Nombre</label><input data-c="routineName" value="${r.n}" aria-label="Nombre del workout"><label>Imagen del entrenamiento</label>${imagePicker(r)}${r.bl.map((b, j) => html`<div class="row" style="margin-top:16px"><b class="mu">SERIE ${raw(String.fromCharCode(65 + j))}</b>${b.ex.length > 1 ? html`<b style="color:var(--wnx)">${raw(BLOCK_KINDS[b.ex.length])} · 10 s</b>` : ''}<button data-a="routineBlockDelete" data-i="${j}" style="padding:4px 10px">Quitar</button></div>${b.ex.map(n => html`<div class="ovx"><div class="th">${exAnatomy(n, 64)}</div><b style="flex:1">${n}</b></div>`)}<div class="row" style="margin-top:6px"><span><button data-a="routineBlockSets" data-i="${j}" data-v="-1" aria-label="${'Una serie menos, serie ' + String.fromCharCode(65 + j)}">−</button> ${raw(b.s)} series <button data-a="routineBlockSets" data-i="${j}" data-v="1" aria-label="${'Una serie más, serie ' + String.fromCharCode(65 + j)}">+</button></span><select data-c="routineBlockReps" data-i="${j}" aria-label="${'Descanso, serie ' + String.fromCharCode(65 + j)}" style="width:auto">${REST_OPTIONS.map(v => html`<option value="${v}"${v == b.r ? ' selected' : ''}>Descanso ${raw(fmtMinSec(v))}</option>`)}</select></div>`)}<button data-a="routineAddBlock" style="width:100%;margin-top:16px">+ Añadir bloque</button><div style="height:80px"></div><button class="sb" data-a="routineSaveAsk" style="background:var(--tx);color:var(--bg);border:0;padding:16px;font-size:16px;border-radius:16px">${routineState.nw ? 'Crear' : 'Guardar cambios'}</button>`;
};
const routineBlockPicker = () => html`<button data-a="routineEdit" data-i="${routineState.i}">‹ Cancelar</button><h3>Nuevo bloque</h3>${[1, 2, 3].map(k => html`<button class="chip${routineState.k == k ? ' on' : ''}" data-a="routineAddBlockKind" data-i="${k}">${raw(BLOCK_KINDS[k])}</button>`)}<p class="mu">Elige el ejercicio ${routineState.sel.length + 1} de ${routineState.k}${raw(routineState.sel.length ? ': ' + routineState.sel.map(X).join(' + ') : '')}</p><input placeholder="Buscar por nombre, músculo o equipo" aria-label="Buscar ejercicio" data-u="routinePickerSearch"><div id="cl2">${raw(routineExRows())}</div>`;
A.routinePickExercise = (i, b) => {
  routineState.sel.push(b.dataset.n);
  routineState.q = '';
  if (routineState.sel.length >= routineState.k) {
    const l = routineState.sel[routineState.sel.length - 1];
    const r = restDefault(l);
    S.routines[routineState.i].bl.push({ ex: routineState.sel, s: 3, r: REST_OPTIONS.includes(r) ? r : 90 });
    routineState.sel = [];
    saveState();
    sheet(routineEditor());
  }
  else
    sheet(routineBlockPicker());
};
A.routineBlockSets = (i, b) => {
  const x = S.routines[routineState.i].bl[i];
  x.s = Math.max(1, x.s + +b.dataset.v);
  saveState();
  sheet(routineEditor());
};
A.routineBlockDelete = i => {
  S.routines[routineState.i].bl.splice(i, 1);
  saveState();
  sheet(routineEditor());
};
const openRoutines = () => {
  sheet(routineListPage());
  $('#sh').className = 'full';
};
function routineRows() {
  const q = (routineState.s || '').toLowerCase();
  let l = S.routines.map((r, i) => ({ r, i })).filter(o => o.r.n.toLowerCase().includes(q));
  if (routineState.so)
    l.sort((a, b) => a.r.n.localeCompare(b.r.n));
  else
    l.reverse();
  return l.map(({ r, i }) => {
    const k = routineImage(r);
    const ex = [].concat(...r.bl.map(b => b.ex));
    const gs = [...new Set(ex.map(n => groupLabel(groupOfName(n))))];
    const ns = r.bl.reduce((s, b) => s + b.s * b.ex.length, 0);
    return html`<div class="ovx" style="align-items:flex-start;padding:16px 0"><div data-a="routineEdit" data-i="${i}" aria-hidden="true" style="width:96px;height:132px;border-radius:16px;flex:none;cursor:pointer;background:url(${DAY_PHOTOS[k]}) center/cover"></div><div style="flex:1;min-width:0"><div class="row"><small style="color:var(--at);font-weight:700">${icon('prog', 14)} Personalizado</small><button data-a="routineMenu" data-i="${i}" aria-label="${'Opciones de ' + r.n}" style="border:0;background:none;padding:4px 8px"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button></div><b data-a="routineEdit" data-i="${i}" role="button" tabindex="0" style="font-size:20px;display:block;margin:4px 0 10px;cursor:pointer">${r.n}</b><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="tg">${roundInt(ns * 2.4)} min</span>${gs.slice(0, 2).map(g => html`<span class="tg">${raw(g)}</span>`)}${gs.length > 2 ? html`<span class="tg">+${gs.length - 2}</span>` : ''}</div>${routineState.m === i ? html`<div class="g2" style="margin-top:10px;grid-template-columns:repeat(3,1fr)"><button class="pr" data-a="routineStart" data-i="${i}">Empezar</button><button data-a="routineEdit" data-i="${i}">Editar</button><button data-a="routineListDeleteAsk" data-i="${i}" style="color:var(--ctx)">Borrar</button></div>` : ''}</div></div>`;
  }).join('') || '<p class="mu">Aún no tienes workouts. Crea el primero con el botón de abajo.</p>';
}
function routineList() {
  return html`<div class="row"><button data-a="closeSheet" aria-label="Volver" style="border:0;background:none;font-size:24px;padding:6px 10px">←</button></div><h1 style="font-size:32px;letter-spacing:-.03em;margin:10px 0 16px">Workouts personalizados</h1><div class="row" style="margin-bottom:6px"><input placeholder="Buscar" aria-label="Buscar workout" data-u="routinesFilter" value="${routineState.s || ''}"><button data-a="routinesSort" aria-label="Cambiar el orden" style="padding:12px 14px">${icon('swp', 20)}</button></div><div id="crl">${raw(routineRows())}</div><div style="height:90px"></div><button class="sb" data-a="routineNew" style="background:var(--tx);color:var(--bg);border:0;padding:16px;font-size:16px;border-radius:16px">Crear workout</button>`;
}
const refreshRoutineRows = () => {
  const e = $('#crl');
  if (e)
    e.innerHTML = routineRows();
};
U.routinesFilter = v => {
  routineState.s = v;
  refreshRoutineRows();
};
A.routinesSort = () => {
  routineState.so = !routineState.so;
  refreshRoutineRows();
};
A.routineMenu = i => {
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
A.routineNew = () => {
  routineState.nw = true;
  S.routines.push({ n: 'Mi workout ' + (S.routines.length + 1), bl: [] });
  routineState.i = S.routines.length - 1;
  saveState();
  sheet(routineEditor());
  routineEditIndex = routineState.i;
  routineSnapshot = JSON.stringify(S.routines[routineState.i]);
};
A.routineEdit = i => {
  if (routineEditIndex !== i || routineSnapshot == null) {
    routineEditIndex = i;
    routineSnapshot = JSON.stringify(S.routines[i]);
    routineState.nw = false;
  }
  routineState.i = i;
  sheet(routineEditor());
};
A.routineEditorBack = () => {
  if (routineSnapshot == null || !S.routines[routineEditIndex]) {
    routineSnapshot = null;
    openRoutines();
    return;
  }
  if (routineState.nw)
    dialog('¿Descartar este workout?', 'Aún no lo has creado. Si sales, se perderá.', [['Seguir editando', 'doNothing', ''], ['Descartar', 'routineNewDiscard', 'pr']]);
  else if (JSON.stringify(S.routines[routineEditIndex]) != routineSnapshot)
    dialog('¿Guardar los cambios?', 'Has modificado este workout.', [['Descartar', 'routineDiscardChanges', ''], ['Guardar', 'routineKeepChanges', 'pr']]);
  else {
    routineSnapshot = null;
    openRoutines();
  }
};
A.routineNewDiscard = () => {
  S.routines.splice(routineEditIndex, 1);
  routineState.nw = false;
  routineSnapshot = null;
  saveState();
  openRoutines();
};
A.routineKeepChanges = () => {
  routineSnapshot = null;
  saveState();
  openRoutines();
};
A.routineDiscardChanges = () => {
  S.routines[routineEditIndex] = JSON.parse(routineSnapshot);
  routineSnapshot = null;
  saveState();
  openRoutines();
};
A.routineSaveAsk = () => {
  const r = S.routines[routineState.i];
  if (!r.bl.length) {
    dialog('Añade al menos un bloque', 'Elige uno o varios ejercicios con el botón Añadir bloque.', [['Entendido', 'doNothing', 'pr']]);
    return;
  }
  if (!routineState.nw) {
    dialog('¿Guardar los cambios?', 'Se actualizará este workout personalizado.', [['Cancelar', 'doNothing', ''], ['Guardar', 'routineSave', 'pr']]);
    return;
  }
  A.routineSave();
};
A.routineSave = () => {
  routineState.nw = false;
  routineSnapshot = null;
  saveState();
  openRoutines();
};
A.routineDeleteAsk = () => dialog('¿Borrar este workout?', 'Se eliminará de tu lista.', [['Cancelar', 'doNothing', ''], ['Borrar', 'routineDelete', 'pr']]);
A.routineDelete = () => {
  routineState.nw = false;
  routineSnapshot = null;
  S.routines.splice(routineState.i, 1);
  saveState();
  sheet(routineListPage());
};
A.routineListDeleteAsk = i => {
  routineState.dx = i;
  dialog('¿Borrar este workout?', 'Se eliminará de tu lista.', [['Cancelar', 'doNothing', ''], ['Borrar', 'routineListDelete', 'pr']]);
};
A.routineListDelete = () => {
  S.routines.splice(routineState.dx, 1);
  routineState.m = null;
  saveState();
  refreshRoutineRows();
};
export const routineToDay = i => {
  const r = S.routines[i];
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
  if (S.planBackup) {
    S.plan[S.planBackup.sel] = S.planBackup.day;
    S.planBackup = null;
    saveState();
  }
};
A.routineStart = i => {
  if (!S.routines[i].bl.length)
    return;
  S.planBackup = { sel: S.selectedDay, day: S.plan[S.selectedDay] };
  S.plan[S.selectedDay] = routineToDay(i);
  saveState();
  sheet();
  A.startWorkout();
};
A.routineAddBlock = () => {
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
A.routineAddBlockKind = (i, b) => {
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
A.routineGroup = (i, b) => {
  routineState.g = b.dataset.v;
  routineState.eq = [];
  $('#crgc').innerHTML = groupChips(routineState.g, 'routineGroup');
  $('#cl2').innerHTML = routineExRows();
};
/* — manejadores de esta función (registros A / C / U) — */
U.routinePickerSearch = v => {
  routineState.q = v;
  $('#cl2').innerHTML = routineExRows();
};
C.routineName = e => {
  S.routines[routineState.i].n = e.value;
  saveState();
};
C.routineBlockReps = (e, i) => {
  S.routines[routineState.i].bl[i].r = +e.value;
  saveState();
};
