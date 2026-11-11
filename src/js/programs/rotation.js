/* ═══ programs/rotation ═══
   Rotación de ejercicios (F-06): pasado un bloque de semanas, los accesorios del plan cambian por otra variante del mismo
   movimiento (data/rotation), con las mismas series, repeticiones, técnica y descanso; los básicos se quedan.
   - Automática con permiso: cada 6 semanas en principiante y cada 5 en intermedio y avanzado, Workout propone la rotación
     (nunca en la semana de descarga). «Ahora no» la aplaza a la semana siguiente.
   - Manual: Menú → «Rotar ejercicios», cuando se quiera.
   Antes de rotar se ve qué cambia. Vale para cualquier plan (predefinido o propio, aunque se haya editado a mano).
   S.rotationWeek: semana de la última rotación (o del inicio del plan) · S.rotationPostponed: semana en que se dijo «Ahora no».
   Define: ROTATE_EVERY, HOME_EQUIP, cycleOf, equipOf, rotatedName, rotationChanges, rotationDue, rotationCard, rotationSheet  · acciones/registros: 3
*/
import { toast } from '../core/toast.js';
import { A } from '../core/registry.js';
import { EXERCISES } from '../data/library.js';
import { ROTATIONS } from '../data/rotation.js';
import { S, saveState, W } from '../core/state.js';
import { sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { isDeloadWeek } from '../workout/deload.js';
import { syncCustomProgram } from './create.js';
import { html, raw } from '../core/html.js';
const ROTATE_EVERY = { ini: 6, int: 5, ava: 5 };
/* material de casa: en un plan sin barras, máquinas ni poleas, solo se rota a otro ejercicio que se haga con lo mismo */
const HOME_EQUIP = new Set(['Mancuernas', 'Banda', 'Peso corporal', 'Kettlebell', 'Otro']);
const cycleOf = {};
ROTATIONS.forEach(c => c.forEach(n => {
  cycleOf[n] = c;
}));
const equipOf = n => (EXERCISES.find(e => e.n == n) || {}).q || 'Otro';
/** Siguiente variante de `n` en su grupo que no esté ya en el día (`day`, nombres) y, si `home`, con material de casa. */
const rotatedName = (n, day, home) => {
  const c = cycleOf[n];
  if (!c)
    return n;
  for (let k = 1; k < c.length; k++) {
    const x = c[(c.indexOf(n) + k) % c.length];
    if (!day.has(x) && (!home || HOME_EQUIP.has(equipOf(x))))
      return x;
  }
  return n;
};
/** Cambios que haría una rotación en el plan: [{ d: día, i: ejercicio, n: nombre nuevo }]. */
const rotationChanges = (pl = S.plan) => {
  const o = [];
  const home = pl.every(d => d.ex.every(e => HOME_EQUIP.has(equipOf(e.n))));
  pl.forEach((d, di) => {
    const day = new Set(d.ex.map(e => e.n));
    d.ex.forEach((e, i) => {
      const n = rotatedName(e.n, day, home);
      if (n != e.n) {
        day.delete(e.n);
        day.add(n);
        o.push({ d: di, i, n });
      }
    });
  });
  return o;
};
/** ¿Toca proponer la rotación esta semana? */
const rotationDue = () => {
  const from = S.rotationWeek > 0 && S.rotationWeek <= S.week ? S.rotationWeek : 1;
  return !W && S.week - from >= (ROTATE_EVERY[S.level] || 5) && S.rotationPostponed != S.week && !isDeloadWeek(S.week) && rotationChanges().length > 0;
};
/** Tarjeta de Workout que propone la rotación cuando toca. */
export const rotationCard = () => rotationDue() ? html`<div class="cd rtc"><b>Toca rotar los ejercicios</b><div class="mu">Llevas ${raw(S.week - (S.rotationWeek > 0 && S.rotationWeek <= S.week ? S.rotationWeek : 1))} semanas con los mismos accesorios. Cambiarlos por otra variante del mismo movimiento sigue estimulando el músculo; los básicos se quedan para que veas tu progreso.</div><div class="g2"><button data-a="rotationNotNow">Ahora no</button><button class="pr" data-a="rotationShow">Ver cambios</button></div></div>` : '';
/** Hoja con lo que cambia al rotar y el botón para hacerlo. */
const rotationSheet = () => {
  const ch = rotationChanges();
  if (!ch.length)
    return html`<h3>Rotar ejercicios</h3><p class="mu">Este plan no tiene ejercicios con otra variante para rotar.</p>`;
  const by = {};
  ch.forEach(c => (by[c.d] = by[c.d] || []).push(c));
  return html`<h3>Rotar ejercicios</h3><p class="mu" style="margin:0 0 10px">${raw(ch.length)} ${ch.length == 1 ? 'accesorio cambia' : 'accesorios cambian'} por otra variante del mismo movimiento, con las mismas series, repeticiones y descanso.</p>${Object.keys(by).map(d => html`<div class="cd rtd"><b>${S.plan[d].n}</b>${by[d].map(c => html`<div class="mu">${S.plan[d].ex[c.i].n} → <b>${c.n}</b></div>`)}</div>`)}<div class="g2" style="margin-top:12px"><button data-a="rotationNotNow">Ahora no</button><button class="pr" data-a="rotationApply">Rotar</button></div>`;
};
/* — manejadores de esta función (registros A / C / U) — */
A.rotationShow = () => sheet(rotationSheet());
A.rotationNotNow = () => {
  S.rotationPostponed = S.week;
  saveState();
  sheet();
  R();
};
A.rotationApply = () => {
  if (W) {
    toast('Termina o descarta el entreno en curso');
    return;
  }
  const ch = rotationChanges();
  ch.forEach(c => {
    const e = S.plan[c.d].ex[c.i];
    e.n = c.n;
    delete e.o;
    delete e.ou;
  });
  S.rotationWeek = S.week;
  delete S.rotationPostponed;
  syncCustomProgram();
  saveState();
  sheet();
  R();
  toast(ch.length ? 'Ejercicios rotados: ' + ch.length + (ch.length == 1 ? ' cambio' : ' cambios') : 'No hay nada que rotar');
};
