/* ═══ routines/builder ═══
   Mis workouts: lista, editor de bloques y lanzamiento.
   Define: routineState, BLOCK_KINDS, routineExRows, routineListPage, routineBlock, routineEditor, routineBlockPicker, openRoutines, routineCard, routineRows, routineList, refreshRoutineRows, routineSnapshot, routineEditIndex, overviewSnapshot, setOverviewSnapshot, routineToDay, restorePlanBackup  · acciones/registros: 25
*/
import { $, clampNum, fmtMinSec, roundInt, typedNum, X } from '../core/util.js';
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
  return filterRow(groupDropdown('crg', routineState.gs, bq), equipDropdown('cr', routineState.eq, equipIn(base), base, 1)) + base.filter(e => equipMatch(routineState.eq, e)).sort(exCompare).slice(0, 100).map(e => html`<div class="it exr cur-pointer" data-a="routinePickExercise" data-n="${e.n}"><span class="exc">${exCellHtml(e)}</span><small class="mu">Añadir +</small></div>`).join('') || '<p class="mu">Sin resultados.</p>';
};
const routineListPage = () => routineList();
/* un bloque del workout (A, B, C…): si es superserie o triserie, sus ejercicios, las series (− +) y el descanso */
const routineBlock = (block, j) => {
  const letter = String.fromCharCode(65 + j);
  const kind = block.ex.length > 1 ? html`<b class="c-wnx">${raw(BLOCK_KINDS[block.ex.length])} · 10 s</b>` : '';
  const exercises = block.ex.map(n => html`<div class="ovx"><div class="th">${exAnatomy(n, 64)}</div><b class="fx-1">${n}</b></div>`);
  const sets = html`<span><button data-a="routineBlockSets" data-i="${j}" data-v="-1" aria-label="${'Una serie menos, serie ' + letter}">−</button> ${raw(block.s)} series <button data-a="routineBlockSets" data-i="${j}" data-v="1" aria-label="${'Una serie más, serie ' + letter}">+</button></span>`;
  const rest = html`<select data-c="routineBlockReps" data-i="${j}" aria-label="${'Descanso, serie ' + letter}" class="w-auto">${REST_OPTIONS.map(v => html`<option value="${v}"${v == block.r ? ' selected' : ''}>Descanso ${raw(fmtMinSec(v))}</option>`)}</select>`;
  return html`<div class="row mt-16"><b class="mu">SERIE ${raw(letter)}</b>${kind}<button data-a="routineBlockDelete" data-i="${j}" class="p-4-10">Quitar</button></div>${exercises}<div class="row mt-6">${sets}${rest}</div>`;
};
/** El editor de un workout personalizado: nombre, imagen, sus bloques y «Crear» o «Guardar cambios». */
export const routineEditor = () => {
  const routine = S.routines[routineState.i];
  return html`<div class="row"><button data-a="routineEditorBack">‹ Rutinas</button>${raw(routineState.nw ? '' : '<button data-a="routineDeleteAsk" class="c-ctx">Eliminar</button>')}</div><h2 class="m-14-0-4 ls-n0_02em">Workout personalizado</h2><label>Nombre</label><input data-c="routineName" maxlength="60" value="${routine.n}" aria-label="Nombre del workout"><label>Imagen del entrenamiento</label>${imagePicker(routine)}${routine.bl.map(routineBlock)}<button data-a="routineAddBlock" class="w-full mt-16">+ Añadir bloque</button><div class="h-80"></div><button class="sb bg-tx c-bg bd-0 p-16 fs-16 r-16" data-a="routineSaveAsk">${routineState.nw ? 'Crear' : 'Guardar cambios'}</button>`;
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
/* la tarjeta de un workout en «Mis workouts»: imagen, nombre, minutos aproximados y grupos musculares; con el menú abierto,
   Empezar, Editar y Borrar */
const routineCard = (routine, i) => {
  const photo = routineImage(routine);
  const exercises = [].concat(...routine.bl.map(b => b.ex));
  const groups = [...new Set(exercises.map(n => groupLabel(groupOfName(n))))];
  const sets = routine.bl.reduce((s, b) => s + b.s * b.ex.length, 0);
  const menu = html`<button data-a="routineMenu" data-i="${i}" aria-label="${'Opciones de ' + routine.n}" class="bd-0 bg-none p-4-8"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>`;
  const tags = html`<div class="d-flex gap-6 wrap"><span class="tg">${roundInt(sets * 2.4)} min</span>${groups.slice(0, 2).map(g => html`<span class="tg">${raw(g)}</span>`)}${groups.length > 2 ? html`<span class="tg">+${groups.length - 2}</span>` : ''}</div>`;
  const actions = routineState.m === i ? html`<div class="g2 mt-10 cols-3"><button class="pr" data-a="routineStart" data-i="${i}">Empezar</button><button data-a="routineEdit" data-i="${i}">Editar</button><button data-a="routineListDeleteAsk" data-i="${i}" class="c-ctx">Borrar</button></div>` : '';
  return html`<div class="ovx ai-start p-16-0"><div data-a="routineEdit" data-i="${i}" aria-hidden="true" class="w-96 h-132 r-16 fx-none cur-pointer" data-style="background:url(${DAY_PHOTOS[photo]}) center/cover"></div><div class="fx-1 minw-0"><div class="row"><small class="c-at fw-700">${icon('prog', 14)} Personalizado</small>${menu}</div><b data-a="routineEdit" data-i="${i}" role="button" tabindex="0" class="fs-20 d-block m-4-0-10 cur-pointer">${routine.n}</b>${tags}${actions}</div></div>`;
};
function routineRows() {
  const q = (routineState.s || '').toLowerCase();
  let l = S.routines.map((r, i) => ({ r, i })).filter(o => o.r.n.toLowerCase().includes(q));
  if (routineState.so)
    l.sort((a, b) => a.r.n.localeCompare(b.r.n));
  else
    l.reverse();
  return l.map(({ r, i }) => routineCard(r, i)).join('') || '<p class="mu">Aún no tienes workouts. Crea el primero con el botón de abajo.</p>';
}
function routineList() {
  return html`<div class="row"><button data-a="closeSheet" aria-label="Volver" class="bd-0 bg-none fs-24 p-6-10">←</button></div><h1 class="fs-32 ls-n0_03em m-10-0-16">Workouts personalizados</h1><div class="row mb-6"><input placeholder="Buscar" aria-label="Buscar workout" data-u="routinesFilter" value="${routineState.s || ''}"><button data-a="routinesSort" aria-label="Cambiar el orden" class="p-12-14">${icon('swp', 20)}</button></div><div id="crl">${raw(routineRows())}</div><div class="h-90"></div><button class="sb bg-tx c-bg bd-0 p-16 fs-16 r-16" data-a="routineNew">Crear workout</button>`;
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
  S.routines[routineState.i].bl[i].r = clampNum(typedNum(e.value), 0, 1e5, 0);
  saveState();
};
