/* ═══ workout/technique ═══
   Técnicas de intensidad en el entreno (F-02; data/techniques): la técnica de cada serie, la fila extra del drop set o del
   rest-pause tras la última serie y el descanso que toca después de cada serie. En la semana de descarga no se aplican.
   Las filas del entreno (W.x) llevan k (abreviatura de la técnica, si no es una serie normal) y t (1 drop set, 2 rest-pause).
   Define: LAST_SET, setTech, techLabel, dropWeight, withTechnique, restAfterSet
*/
import { S, W } from '../core/state.js';
import { fromDisplayWeight, toDisplayWeight, usesLb } from '../profile/units.js';
import { inSuperset } from './day.js';
import { restOf } from './rest.js';
/* técnicas que van solo en la última serie del ejercicio */
const LAST_SET = new Set(['DS', 'RP', 'PAR']);
/** Técnica de la serie `j` de `n` de un ejercicio del plan: su abreviatura, o 'WRK' si es una serie normal. */
const setTech = (e, j, n) => {
  const t = e && e.tk;
  if (!t)
    return 'WRK';
  const [a, f] = t.split('+');
  if (f)
    return j == n - 1 ? f : a;
  return LAST_SET.has(a) ? (j == n - 1 ? a : 'WRK') : a;
};
/** Etiqueta del ejercicio en la vista del programa: su técnica (PIR + DS…) o SS si va en superserie sin técnica. */
export const techLabel = e => e.tk ? e.tk.replace('+', ' + ') : e.b != null ? 'SS' : '';
/** Peso del drop set: un 25 % menos (la técnica pide bajar un 20-30 %), redondeado a lo que se puede cargar. */
export const dropWeight = w => usesLb() ? fromDisplayWeight(Math.max(5, Math.round(toDisplayWeight(w) * .75 / 5) * 5)) : Math.max(1, Math.round(w * .75 * 2) / 2);
/** Pone a cada serie la técnica que le toca y, tras la última, la fila del drop set o del rest-pause. */
export const withTechnique = (e, a) => {
  const n = a.length;
  a.forEach((s, j) => {
    const k = setTech(e, j, n);
    if (k != 'WRK')
      s.k = k;
  });
  const l = a[n - 1];
  if (l && l.k == 'DS')
    a.push({ r: l.r, w: +l.w > 0 ? dropWeight(l.w) : '', ok: 0, t: 1, k: 'DS' });
  else if (l && l.k == 'RP')
    a.push({ r: Math.max(2, Math.round(l.r / 3)), w: l.w, ok: 0, t: 2, k: 'RP' });
  return a;
};
/** Segundos de descanso tras la serie `j` del ejercicio `i` del entreno en curso: ninguno antes del drop set, 20 s antes del
    bloque de rest-pause, 15 s entre las mini series de myo-reps, 10 s dentro de una superserie y, si no, el del ejercicio. */
export const restAfterSet = (i, j) => {
  const e = S.plan[S.sel].ex[i];
  const nx = W && W.x[i] && W.x[i][j + 1];
  if (nx && nx.t == 1)
    return 0;
  if (nx && nx.t == 2)
    return 20;
  if (nx && e.tk == 'MYO' && !W.dl)
    return 15;
  return inSuperset(i) ? 10 : restOf(e);
};
