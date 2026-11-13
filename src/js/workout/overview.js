/* ═══ workout/overview ═══
   Resumen y edición del día de entreno.
   Define: overviewHead, overviewHero, DELOAD_NOTE, overviewEditButtons, overviewExercise, overviewBlock, overviewPage, toggleOverviewEdit  · acciones/registros: 6
*/
import { fmtMinSec } from '../core/util.js';
import { A } from '../core/registry.js';
import { overviewMode, S, saveState, setOverviewMode } from '../core/state.js';
import { dialog } from '../core/ui.js';
import { R } from '../core/render.js';
import { overviewSnapshot, setOverviewSnapshot } from '../routines/builder.js';
import { dayBlocks, inSuperset, linkPrev } from './day.js';
import { restOf, restSelect } from './rest.js';
import { dayMinutes, rangeSelect, rirOf, targetText, tempoOf, unitOf } from './targets.js';
import { isDeloadWeek } from './deload.js';
import { coverStyle } from './images.js';
import { exAnatomy } from '../extras/anatomy.js';
import { html, raw } from '../core/html.js';
/* la cabecera: «‹ Atrás» y «Editar» (o «Listo» al editar) */
const overviewHead = editing => html`<div class="hd"><button data-a="overviewBack">‹ Atrás</button><button data-a="overviewEdit">${editing ? 'Listo' : 'Editar'}</button></div>`;
/* la foto del día con su nombre (al editar, un campo) y sus cifras: ejercicios, series y minutos */
const overviewHero = (d, editing) => {
  const sets = d.ex.reduce((s, e) => s + e.s, 0);
  const name = editing ? html`<input value="${d.n}" maxlength="60" data-c="setDayName" aria-label="Nombre del día" class="m-6-0">` : html`<h2>${d.n}</h2>`;
  return html`<div class="cd hero" data-style="${coverStyle(d.n, d)}"><small>Overview</small>${name}<div class="st"><div><b>${d.ex.length}</b><small>Ejercicios</small></div><div><b>${raw(sets)}</b><small>Series</small></div><div><b>${dayMinutes(d)}</b><small>Minutos</small></div></div></div>`;
};
/* en una semana de descarga, qué cambia al empezar */
const DELOAD_NOTE = '<div class="cd m-12-0-0"><b>Semana de descarga</b><div class="mu fs-13 mt-4">Al empezar el entreno, el peso baja al 65 % y cada serie lleva 2 repeticiones menos, con las mismas series.</div></div>';
/* los botones de un ejercicio al editar: una serie menos o más, descanso, rango, enlazar con el anterior, cambiar y quitar */
const overviewEditButtons = (d, e, i) => {
  const link = i ? html`<button data-a="overviewLink" data-i="${i}">${e.b != null && d.ex[i - 1].b == e.b ? 'Separar' : 'Enlazar'}</button>` : '';
  return html`<div class="d-flex gap-6 wrap mt-6"><button data-a="planSetMinus" data-i="${i}" aria-label="${'Una serie menos, ' + e.n}" class="tz">−</button><button data-a="planSetPlus" data-i="${i}" aria-label="${'Una serie más, ' + e.n}" class="tz">+</button>${restSelect(e)}${rangeSelect(e, i)}${link}<button data-a="openSwap" data-i="${i}">Cambiar</button><button data-a="removePlanExercise" data-i="${i}">Quitar</button></div>`;
};
/* un ejercicio: su anatomía, su nombre y cómo se hace (series, objetivo, descanso y, si tiene, tempo y RIR) */
const overviewExercise = (d, i, editing) => {
  const e = d.ex[i];
  const tempo = unitOf(e) ? '' : html`<br>Tempo ${raw(tempoOf(e))} · RIR ${rirOf(e)}`;
  const details = html`${raw(e.s)} series · ${raw(targetText(e))} · Descanso ${raw(fmtMinSec(inSuperset(i) ? 10 : restOf(e)))}${tempo}`;
  return html`<div class="ovx"><div class="th">${exAnatomy(e.n, 64)}</div><div class="fx-1 minw-0"><b>${e.n}</b><div class="mu fs-13">${details}</div>${editing ? overviewEditButtons(d, e, i) : ''}</div></div>`;
};
/* un bloque del día (serie A, B…), con su tipo si junta varios ejercicios, y sus ejercicios */
const overviewBlock = (d, k, n, editing) => {
  const kind = k.x.length > 1 ? html`<b class="c-wnx">${k.x.length == 2 ? 'Superserie' : k.x.length == 3 ? 'Triserie' : 'Circuito'}</b>` : '';
  return html`<div class="row mt-14"><b class="mu">SERIE ${raw(String.fromCharCode(65 + n))}</b>${kind}</div>${k.x.map(i => overviewExercise(d, i, editing))}`;
};
/** El overview del día elegido: su foto y cifras, sus bloques y ejercicios y, al editar, cambiarlos. */
export function overviewPage() {
  const d = S.plan[S.selectedDay];
  const editing = overviewMode == 2;
  const add = editing ? '<button data-a="openPicker" class="w-full m-12-0">+ Añadir ejercicio</button>' : '';
  /* sin ejercicios no hay entreno que empezar: se dice cómo añadirlos */
  const start = editing ? '' : d.ex.length ? '<button class="sb bg-tx c-bg bd-0 p-16 fs-16 r-16" data-a="startWorkout">Empezar entreno</button>' : '<p class="mu ta-c">Este día no tiene ejercicios. Pulsa «Editar» para añadir alguno.</p>';
  return html`${overviewHead(editing)}${overviewHero(d, editing)}${raw(isDeloadWeek(S.week) ? DELOAD_NOTE : '')}${dayBlocks(d).map((k, n) => overviewBlock(d, k, n, editing))}${raw(add)}<div class="h-80"></div>${raw(start)}`;
}
A.openOverview = () => {
  setOverviewMode(1);
  R();
  scrollTo(0, 0);
};
const toggleOverviewEdit = () => {
  setOverviewMode(overviewMode == 2 ? 1 : 2);
  R();
};
A.overviewLink = i => {
  linkPrev(S.plan[S.selectedDay].ex, i);
  saveState();
  R();
};
A.overviewEdit = () => {
  if (overviewMode == 1) {
    setOverviewSnapshot(JSON.stringify(S.plan[S.selectedDay]));
    toggleOverviewEdit();
    return;
  }
  if (JSON.stringify(S.plan[S.selectedDay]) != overviewSnapshot)
    dialog('¿Guardar los cambios?', 'Se aplicarán a este día de tu programa.', [['Descartar', 'overviewDiscard', ''], ['Guardar', 'overviewSave', 'pr']]);
  else
    toggleOverviewEdit();
};
A.overviewSave = () => {
  saveState();
  toggleOverviewEdit();
};
A.overviewDiscard = () => {
  S.plan[S.selectedDay] = JSON.parse(overviewSnapshot);
  saveState();
  toggleOverviewEdit();
};
A.overviewBack = () => {
  if (overviewMode == 2)
    A.overviewEdit();
  else {
    setOverviewMode(0);
    R();
  }
};
