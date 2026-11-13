/* ═══ core/calc ═══
   Los cálculos de la app, sin estado ni pantalla: cada función recibe los datos y devuelve números, así que se prueban sueltas
   (tests/calc.test.mjs, sin navegador) y valen igual para una pantalla, el análisis mensual o una estadística nueva.
   Nutrición: lo que suma un alimento, una comida, un día o una semana, y los objetivos de kcal y macros a partir del gasto
   (Mifflin-St Jeor). Entreno: en qué se mide un ejercicio, el volumen y la duración de una sesión, qué serie cuenta para las
   marcas (1RM estimado), la mejor marca y la progresión (qué peso toca la próxima vez, también en la semana de descarga).
   Calendario: el lunes de una semana y los días de un periodo. Solo importa core/util (fechas y 1RM), que tampoco tiene estado.
   Define: itemMacros, sumMacros, mealItems, dayItems, dayTotals, macroTargets, BIO_RANGES, ACTIVITY_FACTORS, energyNeeds, dietPlan, LOGGED_KCAL, GOAL_MARGIN, nutritionPeriod, unitFromName, measuredInReps, elapsedMs, sessionVolume, MAX_1RM_REPS, liftScore, bestSet, bestLift, LB_PER_KG, kgToLb, lbToKg, stepUpWeight, stepDownWeight, loadable, deloadWeight, dropSetWeight, progressionRule, nextWeight, kmTotal, weekMonday, weekKeys, countBetween
*/
import { dayKey, est1RM } from './util.js';
/* ── nutrición ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
/** Valores de un alimento anotado según sus gramos: siempre 6 números (kcal, hidratos, proteínas, grasas, fibra, sal), aunque
    los datos vengan dañados o de una copia manipulada; un alimento roto no puede impedir que se pinte Nutrición. */
export const itemMacros = it => {
  const b = it && Array.isArray(it.b) ? it.b : [];
  const g = it ? +it.g || 0 : 0;
  return [0, 1, 2, 3, 4, 5].map(i => (+b[i] || 0) * g / 100);
};
/** Suma de varias listas de 6 valores (sin redondear: se redondea solo al enseñar). */
export const sumMacros = a => a.reduce((s, t) => s.map((v, i) => v + t[i]), [0, 0, 0, 0, 0, 0]);
/** Lista de alimentos de la comida `i` de un día (solo los que tienen nombre). */
export const mealItems = (m, i) => (m && Array.isArray(m[i]) ? m[i] : []).filter(it => it && typeof it.n == 'string');
/** Todos los alimentos de un día, de todas sus comidas (también las que ya no están en el reparto del día). */
const dayItems = m => m && typeof m == 'object' ? Object.keys(m).flatMap(i => mealItems(m, i)) : [];
/** Lo que suma un día: [kcal, hidratos, proteínas, grasas, fibra, sal]. */
export const dayTotals = m => sumMacros(dayItems(m).map(itemMacros));
/** Objetivo del día en gramos a partir de las kcal y los porcentajes: [kcal, g de hidratos, g de proteína, g de grasa]
    (4 kcal por gramo de hidratos y de proteína, 9 por gramo de grasa). */
export const macroTargets = n => [n.k, n.k * n.c / 400, n.k * n.p / 400, n.k * n.f / 900];
/** Entre qué valores valen la edad (años), la altura (cm) y el peso (kg): los de la bienvenida (system/welcome). */
export const BIO_RANGES = { age: [14, 99], h: [120, 230], w: [30, 300] };
/** Por cuánto se multiplica el metabolismo basal según la actividad diaria (de baja a muy alta). */
const ACTIVITY_FACTORS = [1.2, 1.375, 1.55, 1.725, 1.9];
/** Gasto diario con los datos biométricos `b` ({ sex, age, h, w, act }): { bm: metabolismo basal (Mifflin-St Jeor), td: con la
    actividad }, o 0 si falta la edad, la altura o el peso, o no son posibles (datos dañados): con ellos saldrían objetivos de
    kcal sin sentido. */
export const energyNeeds = b => {
  const w = +b.w;
  const h = +b.h;
  const a = +b.age;
  const ok = (v, k) => v >= BIO_RANGES[k][0] && v <= BIO_RANGES[k][1];
  if (!ok(w, 'w') || !ok(h, 'h') || !ok(a, 'age'))
    return 0;
  const bm = 10 * w + 6.25 * h - 5 * a + (b.sex == 'F' ? -161 : 5);
  return { bm, td: bm * (ACTIVITY_FACTORS[b.act == null ? 1 : +b.act] || ACTIVITY_FACTORS[1]) };
};
/** Kcal y reparto de macros (en % de las kcal) para un gasto diario `td`, un peso `w` (kg) y un tipo de dieta `d`
    ([nombre, factor sobre el gasto, g de proteína por kg, g de grasa por kg]): { k, c, p, f }, con c + p + f = 100. */
export const dietPlan = (td, w, d) => {
  /* nunca por debajo de 800 kcal (el mínimo que admite también el ajuste a mano) */
  const k = Math.max(800, Math.round(td * d[1]));
  /* la proteína, como mucho el 60 % de las kcal (con mucho peso y poco gasto, los g/kg darían más del 100 %), y la grasa, lo
     que quepa dejando al menos un 10 % a los hidratos */
  const p = Math.min(60, Math.round(d[2] * w * 400 / k));
  const f = Math.max(0, Math.min(Math.round(d[3] * w * 900 / k), 90 - p));
  return { k, c: 100 - p - f, p, f };
};
/** Un día cuenta como anotado con más de estas kcal (un café con leche suelto no es un día de comidas). */
const LOGGED_KCAL = 50;
/** Un día está en objetivo si sus kcal no se alejan del objetivo más de esta parte (±10 %). */
const GOAL_MARGIN = .1;
/** Las comidas de los días `keys` (claves AAAA-MM-DD) frente al objetivo de kcal `kcalGoal`: { days: [{ k, v: totales del día,
    on: si está anotado, ok: si está en objetivo }], logged: días anotados, ok: días en objetivo, avg: media de los días
    anotados ([kcal, hidratos, proteínas, grasas, fibra, sal]) }. Los días sin anotar no bajan la media. */
export const nutritionPeriod = (meals, keys, kcalGoal) => {
  const days = keys.map(k => {
    const v = dayTotals(meals && meals[k]);
    const on = v[0] > LOGGED_KCAL;
    return { k, v, on, ok: on && kcalGoal > 0 && Math.abs(v[0] - kcalGoal) <= kcalGoal * GOAL_MARGIN };
  });
  const on = days.filter(d => d.on);
  return { days, logged: on.length, ok: on.filter(d => d.ok).length, avg: sumMacros(on.map(d => d.v)).map(v => on.length ? v / on.length : 0) };
};
/* ── entreno ───────────────────────────────────────────────────────────────────────────────────────────────────────── */
/** En qué se mide un ejercicio, por su nombre, si no es en repeticiones: { u: 'm' | 'min' | 's', rg: [objetivo, objetivo] }
    («Farmers carry 200 m», «Carrera continua», «Plancha»); null si se mide en repeticiones. */
export const unitFromName = n => {
  const m = String(n).match(/(\d+(?:[.,]\d+)?)\s*(km|m)\b/i);
  if (m) {
    const v = +m[1].replace(',', '.') * (m[2].toLowerCase() == 'km' ? 1000 : 1);
    return { u: 'm', rg: [v, v] };
  }
  if (/^(Carrera continua|Rodaje|Trote|Bicicleta|Cinta|Elíptica|Caminata|Remo continuo|Natación)/i.test(n)) {
    const z = /largo/i.test(n) ? 60 : /zona 2|suave/i.test(n) ? 45 : /Tabata|intervalos/i.test(n) ? 20 : 30;
    return { u: 'min', rg: [z, z] };
  }
  if (/Plancha|Hollow hold|Dead hang|Wall sit|Farmers hold/i.test(n))
    return { u: 's', rg: [40, 40] };
  return null;
};
/** ¿El ejercicio de nombre `n` se mide en repeticiones? Solo esos tienen 1RM estimado, récords y volumen: en «32 kg × 200 m»,
    los 200 no son repeticiones. */
export const measuredInReps = n => !unitFromName(n);
/** Milisegundos que lleva un entreno que empezó en `startedAt`, sin contar las pausas ya terminadas (que adelantan el
    comienzo) ni la que esté en marcha desde `pausedAt` (0 si no hay). */
export const elapsedMs = (startedAt, pausedAt, now) => Math.max(0, (pausedAt || now) - startedAt);
/** Volumen de una sesión: { v: suma de repeticiones × peso (kg) de las series hechas, n: series hechas }. `sets` son las
    series de cada ejercicio ([{ r, w, ok }]) y `weighted[i]` dice si el ejercicio `i` cuenta para el volumen (los que se miden
    en tiempo o distancia, no). */
export const sessionVolume = (sets, weighted) => {
  let v = 0;
  let n = 0;
  sets.forEach((a, i) => a.forEach(s => {
    if (s.ok) {
      n++;
      if (weighted[i])
        v += (+s.r || 0) * (+s.w || 0);
    }
  }));
  return { v, n };
};
/** Repeticiones hasta las que se estima un 1RM: con más, la fórmula de Epley ya no dice nada del máximo. */
const MAX_1RM_REPS = 30;
/** 1RM estimado (Epley) de una serie del historial ([repeticiones, peso, RPE, fila extra, técnica]), o 0 si no cuenta para las
    marcas: sin peso, sin repeticiones o con más de 30, o si es la fila extra de un drop set o un rest-pause. Es la única
    regla de la app para récords, gráficas, estancamiento y análisis. */
export const liftScore = s => {
  if (!Array.isArray(s) || s[3])
    return 0;
  const r = +s[0];
  const w = +s[1];
  return w > 0 && r >= 1 && r <= MAX_1RM_REPS ? est1RM(w, r) : 0;
};
/** La serie con mejor 1RM estimado de una sesión del historial ({ d, s: series }): { w, r, e, d }, o null si ninguna cuenta. */
export const bestSet = x => {
  let b = null;
  (x && Array.isArray(x.s) ? x.s : []).forEach(q => {
    const e = liftScore(q);
    if (e > 0 && (!b || e > b.e + 1e-6))
      b = { w: +q[1], r: +q[0], e, d: x.d };
  });
  return b;
};
/** La mejor marca de un ejercicio por 1RM estimado: la guardada (`record`: { w, r, e, d }) o una mejor de su historial
    ([{ d, s: series }]); null si no hay ninguna. */
export const bestLift = (record, history) => {
  let b = record || null;
  (Array.isArray(history) ? history : []).forEach(x => {
    const s = bestSet(x);
    if (s && (!b || s.e > b.e + 1e-6))
      b = s;
  });
  return b;
};
/* — progresión: qué peso toca la próxima vez — */
const LB_PER_KG = 2.20462;
/** De kg a libras, con un decimal (lo que se enseña), y de libras a kg, con dos (lo que se guarda). */
export const kgToLb = kg => Math.round(kg * LB_PER_KG * 10) / 10;
export const lbToKg = lb => Math.round(lb / LB_PER_KG * 100) / 100;
/** El peso `w` (kg) un escalón más alto: `step` kg (2,5 o, en los básicos de pierna, 5), redondeado a medio kilo; en libras
    (`lb`), 5 o 10 lb, redondeado a 2,5 lb. */
export const stepUpWeight = (w, step, lb) => lb ? lbToKg(Math.round((kgToLb(w) + (step == 5 ? 10 : 5)) / 2.5) * 2.5) : Math.round((w + step) * 2) / 2;
/** El peso `w` (kg) un 8 % más bajo, redondeado a medio kilo (a 5 lb en libras). Con muy poco peso el redondeo no deja
    bajar: entonces se queda como estaba (nunca sale cero ni más que antes). */
const stepDownWeight = (w, lb) => {
  const v = lb ? lbToKg(Math.round(kgToLb(w) * .92 / 5) * 5) : Math.round(w * .92 * 2) / 2;
  return v > 0 && v < w ? v : w;
};
/* un peso `v` en la unidad elegida, redondeado a lo que se puede cargar: de 2,5 en 2,5 kg (de 5 en 5 lb) o, por debajo de
   5 kg (10 lb), de medio en medio kilo (de 2,5 en 2,5 lb), con ese mínimo; devuelve kg */
const loadable = (v, lb) => {
  const [fine, coarse] = lb ? [2.5, 5] : [.5, 2.5];
  const step = v < coarse * 2 ? fine : coarse;
  const r = Math.max(fine, Math.round(v / step) * step);
  return lb ? lbToKg(r) : r;
};
/** Peso de la semana de descarga: el 65 % del normal `w` (kg), redondeado a lo que se puede cargar y nunca por encima del
    normal (con mancuernas ligeras, el redondeo a 2,5 kg lo subía). */
export const deloadWeight = (w, lb) => Math.min(w, loadable((lb ? kgToLb(w) : w) * .65, lb));
/** Peso del drop set: un 25 % menos que `w` (la técnica pide bajar un 20-30 %), redondeado a medio kilo (a 5 lb en libras),
    con un mínimo de 1 kg (5 lb) y nunca por encima del de la serie. */
export const dropSetWeight = (w, lb) => Math.min(w, lb ? lbToKg(Math.max(5, Math.round(kgToLb(w) * .75 / 5) * 5)) : Math.max(1, Math.round(w * .75 * 2) / 2));
/** Qué toca en un ejercicio según las series de su última sesión (`sets`: [repeticiones, peso, RPE, fila extra…]) y su rango
    de repeticiones `[lo, hi]` (doble progresión): si todas llegaron al tope del rango, sube un escalón, salvo con un RPE medio
    de 9,5 o más; si ninguna llegó al mínimo, baja un 8 %; si no, el mismo peso buscando una repetición más. En la semana de
    descarga (`deload`) ni sube ni baja. Las filas extra (drop set, rest-pause) no cuentan.
    Devuelve { lo, hi, w: el mayor peso de esas series, up, dn, nw: lo que toca partiendo de `w`, ra: RPE medio, why: 'rpe',
    'dl' o '', r: repeticiones de la primera serie, even: si todas se hicieron con el mismo peso }, o null si no hay series. */
export const progressionRule = (sets, range, { step, lb, deload }) => {
  const ss = (Array.isArray(sets) ? sets : []).filter(x => Array.isArray(x) && !x[3]);
  if (!ss.length)
    return null;
  const [lo, hi] = range;
  const w = Math.max(...ss.map(x => +x[1] || 0));
  const rp = ss.map(x => +x[2] || 0).filter(x => x > 0);
  const ra = rp.length ? rp.reduce((a, b) => a + b, 0) / rp.length : 0;
  const full = w > 0 && ss.every(x => x[0] >= hi && x[1] > 0);
  const low = !full && w > 0 && ss.every(x => x[0] < lo && x[1] > 0);
  let up = full;
  let dn = low;
  let why = '';
  if (up && ra >= 9.5) {
    up = false;
    why = 'rpe';
  }
  if (deload) {
    up = false;
    dn = false;
    why = 'dl';
  }
  const nw = up ? stepUpWeight(w, step, lb) : dn ? stepDownWeight(w, lb) : w;
  /* con tan poco peso que el redondeo no deja bajar, se mantiene */
  if (dn && !(nw < w))
    dn = false;
  return { lo, hi, w, up, dn, nw, ra, why, r: +ss[0][0] || 0, even: ss.every(x => (+x[1] || 0) == w) };
};
/** El peso que toca en una serie que la última vez se hizo con `base` kg, según la regla `P` de progressionRule: un escalón
    más, un 8 % menos o el mismo. Cada serie parte de su propio peso: si se bajó o se subió de una serie a otra, se respeta. */
export const nextWeight = (P, base, step, lb) => P.up ? stepUpWeight(base, step, lb) : P.dn ? stepDownWeight(base, lb) : base;
/** Suma de distancias en km (cada una, con dos decimales como mucho), redondeada a un decimal. Se suma en centésimas, que son
    enteros: sumando decimales, 217,05 km salían como 217 en vez de 217,1. */
export const kmTotal = list => Math.round(list.reduce((s, km) => s + Math.round((+km || 0) * 100), 0) / 10) / 10;
/* ── calendario ────────────────────────────────────────────────────────────────────────────────────────────────────── */
/** El lunes (a las 00:00) de la semana de `d`. */
export const weekMonday = d => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
/** Las claves (AAAA-MM-DD) de los siete días, de lunes a domingo, de la semana de `d`. Por calendario: el día del cambio de
    hora tiene 23 o 25 h. */
export const weekKeys = d => {
  const m = weekMonday(d);
  return [0, 1, 2, 3, 4, 5, 6].map(i => dayKey(new Date(m.getFullYear(), m.getMonth(), m.getDate() + i, 12)));
};
/** Cuántos registros ([{ d }]) tienen la fecha entre `from` y `to` (claves AAAA-MM-DD, las dos incluidas). */
export const countBetween = (list, from, to) => list.filter(l => l && l.d >= from && l.d <= to).length;
