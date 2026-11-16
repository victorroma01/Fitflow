/* ═══ nutrition/diet ═══
   Cálculo de gasto energético (TDEE), tipos de dieta y objetivos de kcal y macros.
   Define: DIET_TYPES, ACTIVITY_LEVELS, GOAL_LABELS, GOAL_DIET, tdee, goalTargets, dietIndex, applyDiet, cleanGoals
*/
import { clampInt } from '../core/util.js';
import { S } from '../core/state.js';
import { dietPlan, energyNeeds, macroTargets } from '../core/calc.js';
export const DIET_TYPES = [['Mini cut', .75, 2.4, .8, 'Déficit fuerte y corto (2-4 semanas) con mucha proteína'], ['Recomposición', 1, 2.2, .9, 'Calorías de mantenimiento con proteína alta'], ['Hipocalórica', .85, 2.2, .8, 'Déficit moderado para perder grasa'], ['Mantenimiento', 1, 1.8, 1, 'Peso estable'], ['Hipercalórica', 1.12, 2, 1, 'Superávit para ganar masa']];
export const ACTIVITY_LEVELS = [['Baja', 'sedentario, menos de 5.000 pasos'], ['Media', '5.000-8.000 pasos o 1-3 entrenos'], ['Moderada', '8.000-10.000 pasos o 3-5 entrenos'], ['Alta', '10.000-12.000 pasos o 6-7 entrenos'], ['Muy alta', 'más de 12.000 pasos o trabajo físico']];
export const GOAL_LABELS = ['Definir', 'Mantenimiento', 'Volumen', 'Recomposición'];
export const GOAL_DIET = [2, 3, 4, 1];
/** Gasto diario del usuario ({ bm, td }), o 0 si faltan datos biométricos o no son posibles (core/calc: energyNeeds). */
export const tdee = () => energyNeeds(S.biometrics);
/** Objetivo del día: [kcal, g de hidratos, g de proteína, g de grasa] a partir de S.nutritionGoals. */
export const goalTargets = () => macroTargets(S.nutritionGoals);
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
  Object.assign(S.nutritionGoals, dietPlan(t.td, +S.biometrics.w, DIET_TYPES[dietIndex()]));
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
