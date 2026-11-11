/* ═══ workout/resume ═══
   Reanudar un entreno interrumpido (estado en curso guardado).
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
export const WIP_KEY = Store.K.wip;
export let pendingResume = null;
/** Cambia `pendingResume` desde otros módulos (un módulo no puede asignar una variable importada). */
export const setPendingResume = v => {
  pendingResume = v;
};
export const saveSession = () => {
  try {
    if (W)
      Store.set(WIP_KEY, JSON.stringify({ W, d: S.plan[S.sel], sel: S.sel, sl: S.sl, wk: S.wk, pb: !!S.pbk, t: Date.now() }));
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
  S.sel = z.sel;
  S.sl = z.sl >= 0 && z.sl < 7 ? z.sl : z.sel % 7;
  S.wk = z.wk;
  if (z.pb) {
    S.pbk = { sel: z.sel, day: S.plan[z.sel] };
    S.plan[z.sel] = z.d;
  }
  setW(z.W);
  W.t0 += Date.now() - z.t;
  W.re = 0;
  W.p = 0;
  W.lb = 0;
  W.ri = null;
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
  return html`<div class="cd" style="border-color:var(--a2)"><small style="color:var(--at);font-weight:700;letter-spacing:.1em">ENTRENO EN CURSO</small><div style="font-size:19px;font-weight:700;margin:4px 0 2px">${t.d.n}</div><div class="mu" style="margin-bottom:12px">${raw(o)} de ${raw(n)} series completadas</div><div class="g2"><button data-a="resumeDiscardAsk">Descartar</button><button class="pr" data-a="resumeWorkout">Reanudar</button></div></div>`;
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
