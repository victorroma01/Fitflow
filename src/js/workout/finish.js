/* ═══ workout/finish ═══
   Fin del entreno: récords, historial, registro del día e instantánea.
   Define: newRecords, historyRow, doneSets, logWorkout, saveHistory, bestOf, saveRecords, lastSummary, setLastSummary, workoutSnapshot  · acciones/registros: 3
*/
import { dayKey, roundInt } from '../core/util.js';
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
import { bestLift, elapsedMs, liftScore, measuredInReps, sessionVolume } from '../core/calc.js';
export let newRecords = [];
/* la fila del historial de una serie hecha: repeticiones, peso, RPE, fila extra (1 drop set, 2 rest-pause) y, si no es una
   serie normal, su técnica */
const historyRow = s => s.k ? [s.r, s.w || 0, s.q || 0, s.t || 0, s.k] : [s.r, s.w || 0, s.q || 0, s.t || 0];
/** Las series hechas del entreno en curso, por ejercicio y en el orden del día: [{ n: nombre, rows: filas del historial,
    reps: si se mide en repeticiones }]. Una serie hecha antes de cambiar el ejercicio por otro (Swap) cuenta para el que era
    (su nombre va en la serie: s.n), no para el nuevo. */
const doneSets = () => {
  const d = S.plan[S.selectedDay];
  const out = [];
  W.sets.forEach((a, i) => {
    const e = d.ex[i];
    const groups = new Map();
    a.forEach(s => {
      if (!s.ok || !e)
        return;
      const n = s.n || e.n;
      if (!groups.has(n))
        groups.set(n, { n, rows: [], reps: n == e.n ? !unitOf(e) : measuredInReps(n) });
      groups.get(n).rows.push(historyRow(s));
    });
    out.push(...groups.values());
  });
  return out;
};
/* `stamp`: la marca del entreno (cuándo se guardó), que llevan también sus series en el historial */
const logWorkout = stamp => {
  const d = S.plan[S.selectedDay];
  /* el volumen: repeticiones × peso de las series hechas (los ejercicios que se miden en tiempo o distancia no cuentan) */
  const { v, n } = sessionVolume(W.sets, d.ex.map(e => !unitOf(e)));
  doneSets().forEach(g => g.rows.forEach(r => {
    if (r[1])
      S.lastWeights[g.n] = r[1];
  }));
  if (n) {
    /* la duración, sin las pausas: tampoco la que esté en marcha al guardar */
    S.logs.push({ d: dayKey(new Date), n: d.n, v, s: n, m: roundInt(elapsedMs(W.startedAt, W.pausedAt, Date.now()) / 6e4), q: avgEffort(), dl: W.deload ? 1 : 0, t: stamp });
    S.doneDays[S.week + '-' + S.selectedWeekday] = 1;
  }
  setW(null);
  saveState();
  R();
};
const saveHistory = stamp => {
  const dt = dayKey(new Date);
  const done = doneSets();
  S.exerciseHistory = S.exerciseHistory || {};
  /* récords de peso: el ejercicio en que hoy se ha levantado más que nunca (los cuenta el logro y los enseña el resumen) */
  newRecords = [];
  done.forEach(g => {
    const h = S.exerciseHistory[g.n] || [];
    const before = Math.max(0, ...h.flatMap(x => x.s.map(y => +y[1] || 0)));
    const today = Math.max(0, ...g.rows.map(r => +r[1] || 0));
    if (before > 0 && today > before && !newRecords.includes(g.n))
      newRecords.push(g.n);
  });
  /* todo el historial: va también a la nube, un documento por año (cloud/sync), y un año ocupa poco. Cada entrada lleva la
     marca de su entreno (t): al borrar el registro del entreno, se borran con él sus series (dashboard/history) */
  done.forEach(g => (S.exerciseHistory[g.n] = S.exerciseHistory[g.n] || []).unshift({ d: dt, s: g.rows, t: stamp }));
};
A.finishAsk = () => confirmDialog('¿Guardar el entreno?', 'Se registrarán las series completadas en tu historial.', 'finishSave', 'Guardar y salir');
A.discardAsk = () => confirmDialog('¿Salir sin guardar?', 'Se perderán las series de este entreno.', 'discardWorkout', 'Salir y descartar');
/** La mejor marca del ejercicio `n` por 1RM estimado, entre la guardada y su historial (core/calc: bestLift); null si no tiene
    o si se mide en tiempo o distancia (ahí no hay 1RM que estimar). */
export const bestOf = n => measuredInReps(n) ? bestLift((S.records || {})[n], (S.exerciseHistory || {})[n]) : null;
/* la mejor marca de cada ejercicio (por 1RM estimado), si alguna serie de hoy la supera: las series que cuentan son las de
   core/calc (liftScore) */
const saveRecords = () => {
  try {
    if (W) {
      S.records = S.records || {};
      doneSets().forEach(g => {
        if (!g.reps)
          return;
        g.rows.forEach(r => {
          const e = liftScore(r);
          const c = S.records[g.n];
          if (e > 0 && (!c || e > c.e))
            S.records[g.n] = { w: +r[1], r: +r[0], e, d: dayKey(new Date) };
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
/* lo que enseña el resumen del entreno: cada ejercicio con sus series hechas (filas del historial) y los entrenos anteriores
   de este día */
const workoutSnapshot = () => {
  let sn = null;
  try {
    if (W) {
      const d = S.plan[S.selectedDay];
      sn = { n: d.n, dt: dayKey(new Date), ex: doneSets().map(g => ({ n: g.n, u: !g.reps, sets: g.rows })), pv: null, old: [] };
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
  const one = S.planBackup;
  const k = S.week + '-' + S.selectedWeekday;
  const had = S.doneDays[k];
  const n1 = S.logs.length;
  sheet();
  const stamp = Date.now();
  saveHistory(stamp);
  logWorkout(stamp);
  if (one && !had)
    delete S.doneDays[k];
  /* el día del plan queda completado: se pasa al siguiente (F-41). Un workout propio lanzado sobre el día no lo completa */
  if (S.doneDays[k] && !one)
    advanceDay();
  if (S.logs.length > n1)
    setTimeout(showSummary, 50);
  restorePlanBackup();
  saveState();
  R();
  if (S.logs.length > n0) {
    try {
      S.recordCount = (S.recordCount || 0) + (Array.isArray(newRecords) ? newRecords.length : 0);
    }
    catch (e) {
      logError('contar récords', e);
    }
  }
};
