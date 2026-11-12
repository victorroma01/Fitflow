/* ═══ nutrition/diet ═══
   Cálculo de gasto energético (TDEE), tipos de dieta y objetivos de kcal y macros.
   Define: DIET_TYPES, ACTIVITY_FACTORS, ACTIVITY_LEVELS, GOAL_LABELS, GOAL_DIET, BIO_RANGES, tdee, goalTargets, dietIndex, applyDiet, cleanGoals
*/
import { clampInt, roundInt } from '../core/util.js';
import { S } from '../core/state.js';
export const DIET_TYPES = [['Mini cut', .75, 2.4, .8, 'Déficit fuerte y corto (2-4 semanas) con mucha proteína'], ['Recomposición', 1, 2.2, .9, 'Calorías de mantenimiento con proteína alta'], ['Hipocalórica', .85, 2.2, .8, 'Déficit moderado para perder grasa'], ['Mantenimiento', 1, 1.8, 1, 'Peso estable'], ['Hipercalórica', 1.12, 2, 1, 'Superávit para ganar masa']];
const ACTIVITY_FACTORS = [1.2, 1.375, 1.55, 1.725, 1.9];
export const ACTIVITY_LEVELS = [['Baja', 'sedentario, menos de 5.000 pasos'], ['Media', '5.000-8.000 pasos o 1-3 entrenos'], ['Moderada', '8.000-10.000 pasos o 3-5 entrenos'], ['Alta', '10.000-12.000 pasos o 6-7 entrenos'], ['Muy alta', 'más de 12.000 pasos o trabajo físico']];
export const GOAL_LABELS = ['Definir', 'Mantenimiento', 'Volumen', 'Recomposición'];
export const GOAL_DIET = [2, 3, 4, 1];
/** Entre qué valores valen la edad (años), la altura (cm) y el peso (kg): los de la bienvenida (system/welcome). */
export const BIO_RANGES = { age: [14, 99], h: [120, 230], w: [30, 300] };
/** Gasto diario: { bm: metabolismo basal (Mifflin-St Jeor), td: con la actividad }, o 0 si falta la edad, la altura o el peso,
    o no son posibles (datos dañados): con ellos saldrían objetivos de kcal sin sentido. */
export function tdee() {
  const b = S.biometrics;
  const w = +b.w;
  const h = +b.h;
  const a = +b.age;
  const ok = (v, k) => v >= BIO_RANGES[k][0] && v <= BIO_RANGES[k][1];
  if (!ok(w, 'w') || !ok(h, 'h') || !ok(a, 'age'))
    return 0;
  const bm = 10 * w + 6.25 * h - 5 * a + (b.sex == 'F' ? -161 : 5);
  return { bm, td: bm * (ACTIVITY_FACTORS[b.act == null ? 1 : +b.act] || ACTIVITY_FACTORS[1]) };
}
/** Objetivo del día: [kcal, g de hidratos, g de proteína, g de grasa] a partir de S.nutritionGoals. */
export const goalTargets = () => {
  const n = S.nutritionGoals;
  return [n.k, n.k * n.c / 400, n.k * n.p / 400, n.k * n.f / 900];
};
/** Índice del tipo de dieta elegido (Mantenimiento si no hay ninguno). */
export const dietIndex = () => S.nutritionGoals.dt >= 0 && S.nutritionGoals.dt < DIET_TYPES.length ? S.nutritionGoals.dt : 3;
/** Calcula kcal y reparto de macros con el gasto diario (tdee) y el tipo de dieta. Si los objetivos están puestos a mano
    (S.nutritionGoals.man), no los toca salvo que se pida (`force`: «Recalcular con mis datos» o cambiar el objetivo), y entonces vuelven al plan. */
export function applyDiet(force) {
  if (S.nutritionGoals.man && !force)
    return;
  const t = tdee();
  if (!t)
    return;
  const d = DIET_TYPES[dietIndex()];
  const w = +S.biometrics.w;
  /* nunca por debajo de 800 kcal (el mínimo que admite también el ajuste a mano) */
  const k = Math.max(800, roundInt(t.td * d[1]));
  /* la proteína, como mucho el 60 % de las kcal (con mucho peso y poco gasto, los g/kg darían más del 100 %), y la grasa, lo
     que quepa dejando al menos un 10 % a los hidratos */
  const pp = Math.min(60, Math.round(d[2] * w * 400 / k));
  const fp = Math.max(0, Math.min(Math.round(d[3] * w * 900 / k), 90 - pp));
  S.nutritionGoals.k = k;
  S.nutritionGoals.p = pp;
  S.nutritionGoals.f = fp;
  S.nutritionGoals.c = 100 - pp - fp;
  delete S.nutritionGoals.man;
}
/** Deja S.nutritionGoals con valores válidos (al arrancar): kcal entre 800 y 8000, porcentajes de 0 a 100, de 2 a 8 comidas y un
    tipo de dieta conocido. Unos datos dañados o manipulados no pueden dejar objetivos imposibles ni texto donde va un número. */
export const cleanGoals = n => {
  n.k = clampInt(n.k, 800, 8000, 1942);
  const c = clampInt(n.c, 0, 100, -1);
  const p = clampInt(n.p, 0, 100, -1);
  const f = clampInt(n.f, 0, 100, -1);
  if (c < 0 || p < 0 || f < 0) {
    n.c = 50;
    n.p = 20;
    n.f = 30;
  }
  else {
    n.c = c;
    n.p = p;
    n.f = f;
  }
  n.n = clampInt(n.n, 2, 8, 3);
  if (n.dt != null && !(n.dt >= 0 && n.dt < DIET_TYPES.length && n.dt % 1 == 0))
    delete n.dt;
  if (n.man)
    n.man = 1;
  else
    delete n.man;
};
