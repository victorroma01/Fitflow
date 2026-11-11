/* ═══ workout/finish ═══
   Fin del entreno: récords, historial, registro del día e instantánea.
   Define: newRecords, logWorkout, saveHistory, bestOf, saveRecords, lastSummary, setLastSummary, workoutSnapshot  · acciones/registros: 3
*/
import { dayKey, est1RM, roundInt } from '../core/util.js';
import { logError } from '../core/errors.js';
import { A } from '../core/registry.js';
import { S, saveState, setW, W } from '../core/state.js';
import { confirmDialog, sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { restorePlanBackup } from '../routines/builder.js';
import { avgEffort } from './session.js';
import { unitOf } from './targets.js';
import { advanceDay } from './week.js';
import { showSummary } from '../extras/summary.js';
export let newRecords = [];
const logWorkout = () => {
  const d = S.plan[S.sel];
  let v = 0;
  let n = 0;
  W.x.forEach((a, i) => a.forEach(s => {
    if (s.ok) {
      n++;
      v += unitOf(d.ex[i]) ? 0 : s.r * s.w;
      if (s.w)
        S.last[d.ex[i].n] = s.w;
    }
  }));
  if (n) {
    S.logs.push({ d: dayKey(new Date), n: d.n, v, s: n, m: roundInt((Date.now() - W.t0) / 6e4), q: avgEffort(), dl: W.dl ? 1 : 0 });
    S.done[S.wk + '-' + S.sl] = 1;
  }
  setW(null);
  saveState();
  R();
};
const saveHistory = () => {
  const d = S.plan[S.sel];
  const dt = dayKey(new Date);
  S.hist = S.hist || {};
  newRecords = [];
  W.x.forEach((a, i) => {
    const n = d.ex[i].n;
    const h = S.hist[n] || [];
    const pb = Math.max(0, ...h.flatMap(x => x.s.map(y => +y[1] || 0)));
    const m = Math.max(0, ...a.filter(q => q.ok).map(q => +q.w || 0));
    if (pb > 0 && m > pb)
      newRecords.push(n);
  });
  W.x.forEach((a, i) => {
    /* cada serie: repeticiones, peso, RPE, fila extra (1 drop set, 2 rest-pause) y técnica si no es una serie normal */
    const l = a.filter(s => s.ok).map(s => s.k ? [s.r, s.w || 0, s.q || 0, s.t || 0, s.k] : [s.r, s.w || 0, s.q || 0, s.t || 0]);
    if (l.length) {
      const n = d.ex[i].n;
      /* todo el historial: va también a la nube, un documento por año (cloud/sync), y un año ocupa poco */
      (S.hist[n] = S.hist[n] || []).unshift({ d: dt, s: l });
    }
  });
};
A.finishAsk = () => confirmDialog('¿Guardar el entreno?', 'Se registrarán las series completadas en tu historial.', 'finishSave', 'Guardar y salir');
A.discardAsk = () => confirmDialog('¿Salir sin guardar?', 'Se perderán las series de este entreno.', 'discardWorkout', 'Salir y descartar');
export const bestOf = n => {
  let b = (S.pr || {})[n] || null;
  ((S.hist || {})[n] || []).forEach(x => x.s.forEach(q => {
    const r = +q[0];
    const w = +q[1];
    if (w > 0 && (!b || est1RM(w, r) > b.e + 1e-6))
      b = { w, r, e: est1RM(w, r), d: x.d };
  }));
  return b;
};
const saveRecords = () => {
  try {
    if (W) {
      const d = S.plan[S.sel];
      S.pr = S.pr || {};
      W.x.forEach((a, i) => {
        const n = d.ex[i].n;
        a.forEach(s => {
          const w = +s.w || 0;
          if (s.ok && w > 0 && !unitOf(d.ex[i])) {
            const e = est1RM(w, +s.r);
            const c = S.pr[n];
            if (!c || e > c.e)
              S.pr[n] = { w, r: +s.r, e, d: dayKey(new Date) };
          }
        });
      });
    }
  }
  catch (x) {
    logError('guardar récords', x);
  }
};
export let lastSummary = null;
/** Cambia `lastSummary` desde otros módulos (un módulo no puede asignar una variable importada). */
export const setLastSummary = v => {
  lastSummary = v;
};
const workoutSnapshot = () => {
  let sn = null;
  try {
    if (W) {
      const d = S.plan[S.sel];
      sn = { n: d.n, dt: dayKey(new Date), ex: d.ex.map((e, i) => {
          const a = (W.x[i] || []).filter(s => s.ok);
          const h = (S.hist || {})[e.n] || [];
          let pw = 0;
          let pe = 0;
          h.forEach(x => (x && Array.isArray(x.s) ? x.s : []).forEach(q => {
            const w = +q[1] || 0;
            const r = +q[0] || 0;
            if (w > 0) {
              pw = Math.max(pw, w);
              pe = Math.max(pe, est1RM(w, r));
            }
          }));
          return { n: e.n, u: !!unitOf(e), sets: a.map(s => [+s.r || 0, +s.w || 0]), pw, pe };
        }).filter(e => e.sets.length), pv: null, old: [] };
      for (let i = S.logs.length - 1; i >= 0; i--) {
        const l = S.logs[i];
        if (l && !l.k && l.n == d.n) {
          if (!sn.pv)
            sn.pv = l;
          sn.old.push(l);
        }
      }
    }
  }
  catch (e) {
    sn = null;
  }
  return sn;
};
A.finishSave = () => {
  lastSummary = workoutSnapshot();
  const n0 = S.logs.length;
  saveRecords();
  const one = S.pbk;
  const k = S.wk + '-' + S.sl;
  const had = S.done[k];
  const n1 = S.logs.length;
  sheet();
  saveHistory();
  logWorkout();
  if (one && !had)
    delete S.done[k];
  /* el día del plan queda completado: se pasa al siguiente (F-41). Un workout propio lanzado sobre el día no lo completa */
  if (S.done[k] && !one)
    advanceDay();
  if (S.logs.length > n1)
    setTimeout(showSummary, 50);
  restorePlanBackup();
  saveState();
  R();
  if (S.logs.length > n0) {
    try {
      S.pc = (S.pc || 0) + (Array.isArray(newRecords) ? newRecords.length : 0);
    }
    catch (e) {
      logError('contar récords', e);
    }
  }
};
