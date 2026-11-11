/* ═══ workout/overview ═══
   Resumen y edición del día de entreno.
   Define: overviewPage, toggleOverviewEdit  · acciones/registros: 6
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
export function overviewPage() {
  const d = S.plan[S.selectedDay];
  const E = overviewMode == 2;
  const ns = d.ex.reduce((s, e) => s + e.s, 0);
  return html`<div class="hd"><button data-a="overviewBack">‹ Atrás</button><button data-a="overviewEdit">${E ? 'Listo' : 'Editar'}</button></div><div class="cd hero" style="${coverStyle(d.n, d)}"><small>Overview</small>${E ? html`<input value="${d.n}" data-c="setDayName" aria-label="Nombre del día" style="margin:6px 0">` : html`<h2>${d.n}</h2>`}<div class="st"><div><b>${d.ex.length}</b><small>Ejercicios</small></div><div><b>${raw(ns)}</b><small>Series</small></div><div><b>${dayMinutes(d)}</b><small>Minutos</small></div></div></div>${raw(isDeloadWeek(S.week) ? '<div class="cd" style="margin:12px 0 0"><b>Semana de descarga</b><div class="mu" style="font-size:13px;margin-top:4px">Al empezar el entreno, el peso baja al 65 % y cada serie lleva 2 repeticiones menos, con las mismas series.</div></div>' : '')}${dayBlocks(d).map((k, n) => html`<div class="row" style="margin-top:14px"><b class="mu">SERIE ${raw(String.fromCharCode(65 + n))}</b>${k.x.length > 1 ? html`<b style="color:var(--wnx)">${k.x.length == 2 ? 'Superserie' : k.x.length == 3 ? 'Triserie' : 'Circuito'}</b>` : ''}</div>${k.x.map(i => {
    const e = d.ex[i];
    return html`<div class="ovx"><div class="th">${exAnatomy(e.n, 64)}</div><div style="flex:1;min-width:0"><b>${e.n}</b><div class="mu" style="font-size:13px">${raw(e.s)} series · ${raw(targetText(e))} · Descanso ${raw(fmtMinSec(inSuperset(i) ? 10 : restOf(e)))}${unitOf(e) ? '' : html`<br>Tempo ${raw(tempoOf(e))} · RIR ${rirOf(e)}`}</div>${E ? html`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button data-a="planSetMinus" data-i="${i}" aria-label="${'Una serie menos, ' + e.n}">−</button><button data-a="planSetPlus" data-i="${i}" aria-label="${'Una serie más, ' + e.n}">+</button>${restSelect(e)}${rangeSelect(e, i)}${i ? html`<button data-a="overviewLink" data-i="${i}">${e.b != null && d.ex[i - 1].b == e.b ? 'Separar' : 'Enlazar'}</button>` : ''}<button data-a="openSwap" data-i="${i}">Cambiar</button><button data-a="removePlanExercise" data-i="${i}">Quitar</button></div>` : ''}</div></div>`;
  })}`)}${raw(E ? '<button data-a="openPicker" style="width:100%;margin:12px 0">+ Añadir ejercicio</button>' : '')}<div style="height:80px"></div>${raw(E ? '' : '<button class="sb" data-a="startWorkout" style="background:var(--tx);color:var(--bg);border:0;padding:16px;font-size:16px;border-radius:16px">Empezar entreno</button>')}`;
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
