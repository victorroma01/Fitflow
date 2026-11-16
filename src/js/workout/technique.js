/* ═══ workout/technique ═══
   Técnicas de intensidad en el entreno (F-02; data/techniques): la técnica de cada serie, la fila extra del drop set o del
   rest-pause tras la última serie y el descanso que toca después de cada serie. En la semana de descarga no se aplican.
   Las filas del entreno (W.sets) llevan k (código de la técnica, si no es una serie normal) y t (1 drop set, 2 rest-pause).
   La etiqueta de cada fila (setLabel; I-25, I-27): WKT en las series de trabajo (normales, de pirámide y la principal de un
   drop set o un rest-pause), DS o RP en la fila extra que va debajo y su abreviatura en el resto de técnicas (CL, MYO, PAR…).
   Lo guardado no cambia: la serie principal de un drop set sigue llevando k = 'DS'.
   Define: LAST_SET, setTech, techLabel, WORK_SET, setLabel, setTechnique, dropWeight, withTechnique, restAfterSet
*/
import { S, W } from '../core/state.js';
import { TECHNIQUES } from '../data/techniques.js';
import { usesLb } from '../profile/units.js';
import { dropSetWeight } from '../core/calc.js';
import { blockOf, roundOf, setOrder } from './order.js';
import { restAt } from './rest.js';
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
/* las series que se ven como de trabajo (WKT): normales, de pirámide y la principal de un drop set o un rest-pause */
const WORK_SET = new Set(['WRK', 'PIR', 'DS', 'RP']);
/** Etiqueta de la fila s del entreno: 'WKT', 'DS' o 'RP' (filas extra) o la abreviatura de su técnica. */
export const setLabel = s => s.t == 1 ? 'DS' : s.t == 2 ? 'RP' : !s.k || WORK_SET.has(s.k) || !TECHNIQUES[s.k] ? 'WKT' : s.k;
/** La técnica que explica la ventana al tocar la etiqueta de la fila s: la pirámide en sus series, el drop set y el rest-pause
    en sus filas extra, la de la etiqueta en las demás técnicas y, si no, la serie normal. */
export const setTechnique = s => {
  const l = setLabel(s);
  return l != 'WKT' ? l : s.k == 'PIR' ? 'PIR' : 'WRK';
};
/** Peso del drop set: un 25 % menos (la técnica pide bajar un 20-30 %), redondeado a lo que se puede cargar (core/calc). */
export const dropWeight = w => dropSetWeight(w, usesLb());
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
    a.push({ r: l.r, w: +l.w > 0 ? dropWeight(l.w) : '', ws: 1, ok: 0, t: 1, k: 'DS' });
  else if (l && l.k == 'RP')
    a.push({ r: Math.max(2, Math.round(l.r / 3)), w: l.w, ws: 1, ok: 0, t: 2, k: 'RP' });
  return a;
};
/** Segundos de descanso tras la serie `j` del ejercicio `i` del entreno en curso: ninguno antes del drop set, 20 s antes del
    bloque de rest-pause, 15 s entre las mini series de myo-reps y, en una superserie o triserie, 10 s hasta el siguiente
    ejercicio de la ronda y el descanso de la ronda al acabarla (F-12); si no, el del ejercicio. */
export const restAfterSet = (i, j) => {
  const d = S.plan[S.selectedDay];
  const e = d.ex[i];
  const nx = W && W.sets[i] && W.sets[i][j + 1];
  if (nx && nx.t == 1)
    return 0;
  if (nx && nx.t == 2)
    return 20;
  if (nx && e.tk == 'MYO' && !W.deload)
    return 15;
  const bk = blockOf(i);
  if (bk.length < 2)
    return restAt(d, i);
  const o = setOrder();
  const n = o[o.findIndex(x => x[0] == i && x[1] == j) + 1];
  if (n && n[0] != i && bk.includes(n[0]) && roundOf(n[0], n[1]) == roundOf(i, j))
    return 10;
  return restAt(d, bk[bk.length - 1]);
};
