/* ═══ workout/resume ═══
   Reanudar un entreno interrumpido (estado en curso guardado). Se guarda con las claves cortas de siempre (core/schema):
   { W, d: el día, sel, sl, wk, pb: si era un workout propio sobre el plan, t: cuándo }, y pendingResume lo tiene tal cual.
   Define: WIP_KEY, pendingResume, setPendingResume, saveSession, resumeSync, resumeBanner, dropResume  · acciones/registros: 3
*/
import { Store } from '../core/store.js';
import { logError } from '../core/errors.js';
import { A } from '../core/registry.js';
import { S, saveState, setW, W } from '../core/state.js';
import { confirmDialog, sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { keepAwake } from './wake.js';
import { html, raw } from '../core/html.js';
import { workoutFromStored, workoutToStored } from '../core/schema.js';
export const WIP_KEY = Store.K.wip;
export let pendingResume = null;
/** Cambia `pendingResume` desde otros módulos (un módulo no puede asignar una variable importada). */
export const setPendingResume = v => {
  pendingResume = v;
};
export const saveSession = () => {
  try {
    if (W)
      Store.set(WIP_KEY, JSON.stringify({ W: workoutToStored(W), d: S.plan[S.selectedDay], sel: S.selectedDay, sl: S.selectedWeekday, wk: S.week, pb: !!S.planBackup, t: Date.now() }));
    else if (!pendingResume)
      Store.del(WIP_KEY);
  }
  catch (e) {
    logError('guardar entreno en curso', e);
  }
};
export const resumeSync = () => {
  if (W)
    pendingResume = null;
};
A.resumeWorkout = () => {
  const z = pendingResume;
  pendingResume = null;
  if (!z)
    return;
  S.selectedDay = z.sel;
  S.selectedWeekday = z.sl >= 0 && z.sl < 7 ? z.sl : z.sel % 7;
  S.week = z.wk;
  if (z.pb) {
    S.planBackup = { sel: z.sel, day: S.plan[z.sel] };
    S.plan[z.sel] = z.d;
  }
  setW(workoutFromStored(z.W));
  W.startedAt += Date.now() - z.t;
  W.restEndsAt = 0;
  W.pausedAt = 0;
  W.lastBeep = 0;
  W.restAfter = null;
  saveState();
  /* pantalla encendida según el ajuste, como al empezar (workout/wake) */
  keepAwake();
  R();
  scrollTo(0, 0);
};
A.resumeDiscard = () => {
  sheet();
  pendingResume = null;
  try {
    Store.del(WIP_KEY);
  }
  catch (e) {
    logError('descartar entreno en curso', e);
  }
  R();
};
A.resumeDiscardAsk = () => confirmDialog('¿Descartar el entreno en curso?', 'Se perderán las series de esa sesión.', 'resumeDiscard', 'Descartar');
export const resumeBanner = () => {
  if (!pendingResume || W)
    return '';
  const t = pendingResume;
  const n = t.W.x.reduce((a, b) => a + b.length, 0);
  const o = t.W.x.reduce((a, b) => a + b.filter(x => x.ok).length, 0);
  return html`<div class="cd bdc-a2"><small class="c-at fw-700 ls-0_1em">ENTRENO EN CURSO</small><div class="fs-19 fw-700 m-4-0-2">${t.d.n}</div><div class="mu mb-12">${raw(o)} de ${raw(n)} series completadas</div><div class="g2"><button data-a="resumeDiscardAsk">Descartar</button><button class="pr" data-a="resumeWorkout">Reanudar</button></div></div>`;
};
export const dropResume = () => {
  pendingResume = null;
  try {
    Store.del(WIP_KEY);
  }
  catch (e) {
    logError('descartar entreno en curso', e);
  }
};
