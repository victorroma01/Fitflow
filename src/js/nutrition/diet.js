/* ═══ nutrition/diet ═══
   Cálculo de gasto energético (TDEE), tipos de dieta y objetivos de kcal y macros.
   Define: DIET_TYPES, ACTIVITY_FACTORS, ACTIVITY_LEVELS, GOAL_LABELS, GOAL_DIET, tdee, goalTargets, dietIndex, applyDiet, cleanGoals
*/
import { clampInt, roundInt } from '../core/util.js';
import { S } from '../core/state.js';
export const DIET_TYPES = [['Mini cut', .75, 2.4, .8, 'Déficit fuerte y corto (2-4 semanas) con mucha proteína'], ['Recomposición', 1, 2.2, .9, 'Calorías de mantenimiento con proteína alta'], ['Hipocalórica', .85, 2.2, .8, 'Déficit moderado para perder grasa'], ['Mantenimiento', 1, 1.8, 1, 'Peso estable'], ['Hipercalórica', 1.12, 2, 1, 'Superávit para ganar masa']];
const ACTIVITY_FACTORS = [1.2, 1.375, 1.55, 1.725, 1.9];
export const ACTIVITY_LEVELS = [['Baja', 'sedentario, menos de 5.000 pasos'], ['Media', '5.000-8.000 pasos o 1-3 entrenos'], ['Moderada', '8.000-10.000 pasos o 3-5 entrenos'], ['Alta', '10.000-12.000 pasos o 6-7 entrenos'], ['Muy alta', 'más de 12.000 pasos o trabajo físico']];
export const GOAL_LABELS = ['Definir', 'Mantenimiento', 'Volumen', 'Recomposición'];
export const GOAL_DIET = [2, 3, 4, 1];
export function tdee() {
  const b = S.bio;
  const w = +b.w;
  const h = +b.h;
  const a = +b.age;
  if (!w || !h || !a)
    return 0;
  const bm = 10 * w + 6.25 * h - 5 * a + (b.sex == 'F' ? -161 : 5);
  return { bm, td: bm * ACTIVITY_FACTORS[b.act == null ? 1 : +b.act] };
}
/** Objetivo del día: [kcal, g de hidratos, g de proteína, g de grasa] a partir de S.nu. */
export const goalTargets = () => {
  const n = S.nu;
  return [n.k, n.k * n.c / 400, n.k * n.p / 400, n.k * n.f / 900];
};
/** Índice del tipo de dieta elegido (Mantenimiento si no hay ninguno). */
export const dietIndex = () => S.nu.dt >= 0 && S.nu.dt < DIET_TYPES.length ? S.nu.dt : 3;
/** Calcula kcal y reparto de macros con el gasto diario (tdee) y el tipo de dieta. Si los objetivos están puestos a mano
    (S.nu.man), no los toca salvo que se pida (`force`: «Recalcular con mis datos» o cambiar el objetivo), y entonces vuelven al plan. */
export function applyDiet(force) {
  if (S.nu.man && !force)
    return;
  const t = tdee();
  if (!t)
    return;
  const d = DIET_TYPES[dietIndex()];
  const w = +S.bio.w;
  const k = roundInt(t.td * d[1]);
  const pp = Math.round(d[2] * w * 400 / k);
  const fp = Math.min(Math.round(d[3] * w * 900 / k), 90 - pp);
  S.nu.k = k;
  S.nu.p = pp;
  S.nu.f = fp;
  S.nu.c = 100 - pp - fp;
  delete S.nu.man;
}
/** Deja S.nu con valores válidos (al arrancar): kcal entre 800 y 8000, porcentajes de 0 a 100, de 2 a 8 comidas y un
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
