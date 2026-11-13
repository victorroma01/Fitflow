/* ═══ workout/resume ═══
   Reanudar un entreno interrumpido (estado en curso guardado). Se guarda con las claves cortas de siempre (core/schema):
   { W, d: el día, sel, sl, wk, pb: si era un workout propio sobre el plan, t: cuándo }, y pendingResume lo tiene tal cual.
   Define: WIP_KEY, pendingResume, setPendingResume, saveSession, resumeSync, sameExercises, resumeBanner, dropResume  · acciones/registros: 3
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
/** ¿El día del plan `c` tiene los mismos ejercicios, en el mismo orden, que el día `d` con el que se empezó un entreno? */
const sameExercises = (c, d) => !!c && !!d && Array.isArray(c.ex) && c.ex.length == d.ex.length && c.ex.every((x, i) => x.n == d.ex[i].n);
A.resumeWorkout = () => {
  const z = pendingResume;
  pendingResume = null;
  if (!z)
    return;
  /* si ese día ya no existe en el plan (llegó otro programa de la nube), el entreno sigue sobre el día que se está viendo */
  const sel = S.plan[z.sel] ? z.sel : S.selectedDay;
  S.selectedDay = sel;
  S.selectedWeekday = z.sl >= 0 && z.sl < 7 ? z.sl : sel % 7;
  S.week = z.wk;
  /* el entreno sigue con los ejercicios con los que se empezó. Si era un workout propio, o el día del plan ha cambiado desde
     entonces (se editó, se rotó o llegó otro de la nube), ese día se pone mientras dura el entreno y después vuelve el del
     plan: con otros ejercicios, las series hechas irían al ejercicio que no es */
  if (z.pb || !sameExercises(S.plan[sel], z.d)) {
    S.planBackup = { sel, day: S.plan[sel] };
    S.plan[sel] = z.d;
  }
  setW(workoutFromStored(z.W));
  /* el tiempo con la app cerrada no cuenta; ni el de la pausa en la que estaba, si la había */
  W.startedAt += Date.now() - (W.pausedAt > 0 && W.pausedAt < z.t ? W.pausedAt : z.t);
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
