/* ═══ workout/week ═══
   Semana de entrenamiento: qué día del plan toca en cada uno de los 7 días de la semana (F-03, F-04).
   - Un plan de 7 días es la semana tal cual: el día 1 del plan es el primero de la semana.
   - Un ciclo de otra longitud (Push Pull Leg de 10 días, Full Body de 6) no se corta al acabar la semana: la semana 2
     empieza donde acabó la 1, y así hasta que el ciclo vuelve a cuadrar con la semana.
   S.selectedWeekday es el día elegido de la semana (0-6) y S.selectedDay, el día del plan que le toca: el resto de la app usa S.plan[S.selectedDay].
   Lo marcado como hecho va por semana y día de la semana (S.doneDays['semana-día']).
   Define: planIndex, isCycle, WEEK, trainingDays, gcd, sessionsPerWeek, perWeekText, syncSel, advanceDay, monday, weekOffset
*/
import { S } from '../core/state.js';
/** Índice en `pl` del día `j` (0-6) de la semana `wk`. */
export const planIndex = (j, wk = S.week, pl = S.plan) => pl.length == 7 ? j : ((Math.max(1, wk) - 1) * 7 + j) % pl.length;
/** ¿El plan es un ciclo de otra longitud que la semana? */
export const isCycle = (pl = S.plan) => pl.length != 7;
const WEEK = [0, 1, 2, 3, 4, 5, 6];
/** Días de entreno (0-6) de la semana `wk`. */
export const trainingDays = (wk = S.week, pl = S.plan) => pl.length ? WEEK.filter(j => pl[planIndex(j, wk, pl)].ex.length) : [];
const gcd = (a, b) => b ? gcd(b, a % b) : a;
/** Entrenos por semana: [el mínimo, el máximo] entre las semanas que tarda el ciclo en volver a cuadrar con la semana. */
export const sessionsPerWeek = (pl = S.plan) => {
  if (!pl.length)
    return [0, 0];
  const n = pl.length / gcd(pl.length, 7);
  let lo = 7;
  let hi = 0;
  for (let w = 1; w <= n; w++) {
    const c = trainingDays(w, pl).length;
    lo = Math.min(lo, c);
    hi = Math.max(hi, c);
  }
  return [lo, hi];
};
/** «4 entrenos por semana» o, en un ciclo que cambia de una semana a otra, «4-5 entrenos por semana». */
export const perWeekText = (pl = S.plan) => {
  const [a, b] = sessionsPerWeek(pl);
  return (a == b ? a : a + '-' + b) + (b == 1 ? ' entreno' : ' entrenos') + ' por semana';
};
/** Pone en S.selectedDay el día del plan que toca en el día elegido de la semana (tras cambiar de día, de semana o de plan). */
export const syncSel = () => {
  if (!(S.selectedWeekday >= 0 && S.selectedWeekday < 7))
    S.selectedWeekday = 0;
  S.selectedDay = planIndex(S.selectedWeekday);
};
/** Tras completar el día elegido (con un entreno guardado o con «Completar descanso»; F-41): pasa al siguiente que esté sin
    completar y, tras el último de la semana, a la semana siguiente. Un día de descanso no se salta: la app se queda en él hasta
    que se marque como completado. */
export const advanceDay = () => {
  for (let n = 0; n < 14; n++) {
    if (S.selectedWeekday >= 6) {
      S.week++;
      S.selectedWeekday = 0;
    }
    else
      S.selectedWeekday++;
    if (!S.doneDays[S.week + '-' + S.selectedWeekday])
      break;
  }
  syncSel();
};
const monday = d => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - (x.getDay() + 6) % 7);
  return x;
};
/** Semanas de calendario entre la de hoy y la de la fecha `t` (negativo si es de una semana anterior). */
export const weekOffset = t => Math.round((monday(t) - monday(new Date())) / 6048e5);
