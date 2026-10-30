/* ═══ nutrition/diet ═══
   Cálculo de gasto energético (TDEE) y tipos de dieta.
   Define: DIET_TYPES, ACTIVITY_FACTORS, ACTIVITY_LEVELS, GOAL_LABELS, GOAL_DIET, tdee, applyDiet, dietCard
*/
import { roundInt } from '../core/util.js';
import { C } from '../core/registry.js';
import { S, saveState } from '../core/state.js';
import { R } from '../core/render.js';
const DIET_TYPES = [['Mini cut', .75, 2.4, .8, 'Déficit fuerte y corto (2-4 semanas) con mucha proteína'], ['Recomposición', 1, 2.2, .9, 'Calorías de mantenimiento con proteína alta'], ['Hipocalórica', .85, 2.2, .8, 'Déficit moderado para perder grasa'], ['Mantenimiento', 1, 1.8, 1, 'Peso estable'], ['Hipercalórica', 1.12, 2, 1, 'Superávit para ganar masa']];
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
export function applyDiet() {
  const t = tdee();
  if (!t)
    return;
  const d = DIET_TYPES[S.nu.dt == null ? 3 : S.nu.dt];
  const w = +S.bio.w;
  const k = roundInt(t.td * d[1]);
  const pp = Math.round(d[2] * w * 400 / k);
  const fp = Math.min(Math.round(d[3] * w * 900 / k), 90 - pp);
  S.nu.k = k;
  S.nu.p = pp;
  S.nu.f = fp;
  S.nu.c = 100 - pp - fp;
}
export function dietCard() {
  const t = tdee();
  const i = S.nu.dt == null ? 3 : S.nu.dt;
  return '<details class="cd"><summary>Tipo de dieta: ' + DIET_TYPES[i][0] + '</summary><label>Elige tu dieta</label><select data-c="dt">' + DIET_TYPES.map((d, j) => '<option value="' + j + '"' + (j == i ? ' selected' : '') + '>' + d[0] + '</option>').join('') + '</select><p class="mu">' + DIET_TYPES[i][4] + '. Proteína ' + DIET_TYPES[i][2] + ' g/kg, grasas ' + DIET_TYPES[i][3] + ' g/kg e hidratos el resto.</p>' + (t ? '<small>Metabolismo basal ' + roundInt(t.bm) + ' kcal · gasto total ' + roundInt(t.td) + ' kcal · objetivo ' + roundInt(S.nu.k) + ' kcal</small>' : '<small style="color:var(--c)">Completa tus datos biométricos en Perfil para ajustar kcal y macros automáticamente.</small>') + '</details>';
}
/* — manejadores de esta función (registros A / C / U) — */
C.dt = e => {
  S.nu.dt = +e.value;
  applyDiet();
  saveState();
  R();
};
