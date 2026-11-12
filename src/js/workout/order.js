/* ═══ workout/order ═══
   Orden en que se hacen las series del entreno en curso (W.sets): ejercicio a ejercicio y, en una superserie o triserie, por
   rondas (F-12): la serie 1 de cada ejercicio del bloque, después la 2, y así. Las filas extra de una serie (drop set,
   rest-pause) van pegadas a ella. Lo usan la serie actual, «siguiente», «anterior» y el descanso tras cada serie.
   Define: setUnits, setOrder, currentSet, roundOf, blockOf
*/
import { S, W } from '../core/state.js';
import { dayBlocks } from './day.js';
/** Filas del ejercicio `i` agrupadas por serie: [[fila, extras…], …]. */
const setUnits = i => {
  const u = [];
  (W.sets[i] || []).forEach((s, j) => {
    if (s.t && u.length)
      u[u.length - 1].push(j);
    else
      u.push([j]);
  });
  return u;
};
/** Todas las filas del entreno como [ejercicio, fila], en el orden en que se hacen. */
export const setOrder = () => {
  const o = [];
  dayBlocks(S.plan[S.selectedDay]).forEach(bk => {
    const units = bk.x.map(setUnits);
    const n = Math.max(0, ...units.map(u => u.length));
    for (let r = 0; r < n; r++)
      bk.x.forEach((i, k) => (units[k][r] || []).forEach(j => o.push([i, j])));
  });
  return o;
};
/** Serie que toca: la primera sin hacer en ese orden ([ejercicio, fila]), o null si están todas. */
export const currentSet = () => setOrder().find(([i, j]) => !W.sets[i][j].ok) || null;
/** Ronda (número de serie, desde 0) de la fila `j` del ejercicio `i`. */
export const roundOf = (i, j) => setUnits(i).findIndex(u => u.includes(j));
/** Ejercicios del bloque (superserie o triserie) del ejercicio `i`; solo él si va suelto. */
export const blockOf = i => (dayBlocks(S.plan[S.selectedDay]).find(bk => bk.x.includes(i)) || { x: [i] }).x;
