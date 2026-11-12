/* ═══ core/calc ═══
   Los cálculos de la app, sin estado ni pantalla: cada función recibe los datos y devuelve números, así que se prueban sueltas
   (tests/calc.test.mjs, sin navegador) y valen igual para una pantalla, el análisis mensual o una estadística nueva.
   Nutrición: lo que suma un alimento, una comida, un día o una semana, y los objetivos de kcal y macros a partir del gasto
   (Mifflin-St Jeor). Entreno: el volumen de una sesión y la mejor marca. Calendario: el lunes de una semana y los días de un
   periodo. Solo importa core/util (fechas y 1RM), que tampoco tiene estado.
   Define: itemMacros, sumMacros, mealItems, dayItems, dayTotals, macroTargets, BIO_RANGES, ACTIVITY_FACTORS, energyNeeds, dietPlan, LOGGED_KCAL, GOAL_MARGIN, nutritionPeriod, sessionVolume, bestLift, weekMonday, countBetween
*/
import { est1RM } from './util.js';
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
/** La mejor marca de un ejercicio por 1RM estimado: la guardada (`record`: { w, r, e, d }) o una mejor de su historial
    ([{ d, s: [[repeticiones, peso, …]] }]); null si no hay ninguna con peso. */
export const bestLift = (record, history) => {
  let b = record || null;
  (history || []).forEach(x => x.s.forEach(q => {
    const r = +q[0];
    const w = +q[1];
    if (w > 0 && (!b || est1RM(w, r) > b.e + 1e-6))
      b = { w, r, e: est1RM(w, r), d: x.d };
  }));
  return b;
};
/* ── calendario ────────────────────────────────────────────────────────────────────────────────────────────────────── */
/** El lunes (a las 00:00) de la semana de `d`. */
export const weekMonday = d => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
/** Cuántos registros ([{ d }]) tienen la fecha entre `from` y `to` (claves AAAA-MM-DD, las dos incluidas). */
export const countBetween = (list, from, to) => list.filter(l => l && l.d >= from && l.d <= to).length;
