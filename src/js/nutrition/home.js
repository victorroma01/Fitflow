/* ═══ nutrition/home ═══
   Pestaña Nutrición: el día (con su tipo, entreno o descanso), resumen de macros y comidas con sus botones.
   Define: MACRO_CLASSES, nutritionDayHead, nutritionTotals, macroBar, mealItemRow, mealButtons, mealCard, mealName, nutritionBase  · acciones/registros: 2
*/
import { clampNum, dayKey, round1, roundInt } from '../core/util.js';
import { A, C } from '../core/registry.js';
import { MEAL_NAMES, MEAL_SPLITS } from '../data/foods.js';
import { nutriDayOffset, S, saveState, setNutriDayOffset, nutriDate } from '../core/state.js';
import { mealsPart } from '../core/persist.js';
import { icon } from '../core/icons.js';
import { R } from '../core/render.js';
import { goalTargets } from './diet.js';
import { dayType, templateCard } from './templates.js';
import { html, raw } from '../core/html.js';
import { itemMacros, mealItems, sumMacros } from '../core/calc.js';
/* las clases del color de cada macro: el texto (c-ctx…: más oscuro en el tema claro) y la barra, con el de siempre */
const MACRO_CLASSES = { c: ['c-ctx', 'bg-c'], p: ['c-ptx', 'bg-p'], g: ['c-gtx', 'bg-g'] };
/* la cabecera del día: «‹ día ›», si es de entreno o de descanso y «Mi nutrición» */
const nutritionDayHead = (dt, t) => {
  const day = nutriDayOffset ? dt.toLocaleDateString('es', { day: 'numeric', month: 'short' }) : 'Hoy';
  return html`<div class="hd"><button data-a="nutritionDay" data-i="-1" aria-label="Día anterior">‹</button><h1>${raw(day)}</h1><button data-a="nutritionDay" data-i="1" aria-label="Día siguiente">›</button></div><div class="ndy"><span class="ndt">${icon(t == 't' ? 'workout' : 'moon', 16)}${raw(t == 't' ? 'Día de entreno' : 'Día de descanso')}</span><button class="nmb" data-a="openMyNutrition" aria-label="Mi nutrición: objetivo de kcal y macros">${icon('fk', 22)}</button></div>`;
};
/* lo comido frente al objetivo (los tres macros y las kcal), fijo arriba al desplazar */
const nutritionTotals = (tt, tg) => html`<div class="cd pos-sticky top-6 z-3"><div class="mac">${macroBar('Hidratos', tt[1], tg[1], 'c')}${macroBar('Proteínas', tt[2], tg[2], 'p')}${macroBar('Grasas', tt[3], tg[3], 'g')}</div><div class="bar mt-8"><i class="bg-ac" data-style="width:${Math.min(100, tt[0] / tg[0] * 100 || 0)}%"></i></div><div class="ta-c"><b>${roundInt(tt[0])} / ${roundInt(tg[0])} kcal</b></div></div>`;
function macroBar(l, v, t, m) {
  const [text, bar] = MACRO_CLASSES[m];
  return html`<div><span class="${text}">${raw(l)}</span><div class="bar"><i class="${bar}" data-style="width:${Math.min(100, v / t * 100 || 0)}%"></i></div><b>${roundInt(v)} / ${roundInt(t)} g</b></div>`;
}
/* un alimento anotado: sus valores, sus gramos (que se pueden cambiar) y «✕» */
const mealItemRow = (it, i, j) => {
  const v = itemMacros(it);
  return html`<div class="it"><div>${it.n}<br><small>${roundInt(v[0])} kcal · C ${round1(v[1])} P ${round1(v[2])} G ${round1(v[3])}</small></div><input type="number" inputmode="decimal" min="0" max="5000" value="${it.g}" data-c="setItemGrams" data-i="${i}" data-j="${j}" aria-label="${'Gramos de ' + it.n}"><button data-a="removeMealItem" data-i="${i}" data-j="${j}" aria-label="${'Quitar ' + it.n}" class="p-2-6">✕</button></div>`;
};
/* los botones de una comida: añadir, guardarla como plato, buscar en internet y escanear */
const mealButtons = (i, nm) => html`<div class="mlb"><button class="mlp mli" data-a="openAddFood" data-i="${i}" aria-label="${'Añadir alimento, ' + nm}">${icon('plus', 20)}</button><button class="mlp mli" data-a="saveDishAsk" data-i="${i}" data-n="${nm}" aria-label="${'Guardar ' + nm + ' como plato'}">${icon('bkm', 18)}</button><button class="mlp" data-a="openFoodSearch" data-i="${i}" aria-label="${'Buscar alimento en internet, ' + nm}">${icon('srch', 17)}<span>Buscar</span></button><button class="mlp" data-a="openMealScanner" data-i="${i}" aria-label="${'Escanear código de barras, ' + nm}">${icon('bar', 17)}<span>Scan</span></button></div>`;
/* la tarjeta de la comida `i`: sus alimentos, lo que suma (`v`) frente a su objetivo (`goal`: [kcal, C, P, G]; null en una
   comida de fuera del reparto del día, que no tiene) y sus botones */
const mealCard = (m, i, nm, v, goal) => {
  const of = x => goal ? ' / ' + roundInt(goal[x]) : '';
  const note = goal ? 'Objetivo ' + roundInt(goal[0]) + ' kcal' : 'Fuera de tus comidas del día';
  return html`<div class="cd"><div class="row"><b>${raw(nm)}</b><small>${note}</small></div>${mealItems(m, i).map((it, j) => mealItemRow(it, i, j))}<div class="mac m-8-0"><b class="c-ctx">${roundInt(v[1])}${of(1)} C</b><b class="c-ptx">${roundInt(v[2])}${of(2)} P</b><b class="c-gtx">${roundInt(v[3])}${of(3)} G</b></div>${mealButtons(i, nm)}</div>`;
};
/** Nombre de la comida `i` de `n` comidas al día (Desayuno, Comida, Cena…). */
export const mealName = (i, n) => (n <= 5 ? MEAL_NAMES[[0, 1, 2, 3, 4].filter(x => n == 3 ? [0, 2, 4].includes(x) : n == 4 ? [0, 2, 3, 4].includes(x) : n == 2 ? [0, 4].includes(x) : 1)[i]] : MEAL_NAMES[i]) || 'Comida ' + (i + 1);
/** Pestaña Nutrición; `water` es la tarjeta del agua (nutrition/water), que va tras el resumen. */
export function nutritionBase(water) {
  const dt = nutriDate();
  const k = dayKey(dt);
  const n = S.nutritionGoals;
  const m = S.meals[k] || {};
  const tg = goalTargets();
  const w = MEAL_SPLITS[n.n] || Array(n.n).fill(1 / n.n);
  /* las comidas del día y, detrás, las que tengan alimentos fuera de ellas (anotados cuando había más comidas al día): se
     siguen viendo y contando; si no, el total de aquí no cuadraría con lo anotado ni con el del Dashboard */
  const extra = Object.keys(m).map(Number).filter(i => i % 1 == 0 && i >= n.n && mealItems(m, i).length).sort((x, y) => x - y);
  const mt = [...Array.from({ length: n.n }, (_, i) => i), ...extra].map(i => sumMacros(mealItems(m, i).map(itemMacros)));
  const tt = sumMacros(mt);
  const t = dayType(k);
  let h = html`${nutritionDayHead(dt, t)}${nutritionTotals(tt, tg)}${raw(water || '')}${templateCard(k)}`;
  for (let i = 0; i < n.n; i++)
    h += mealCard(m, i, mealName(i, n.n), mt[i], tg.map(v => v * w[i]));
  extra.forEach((i, x) => h += mealCard(m, i, 'Comida ' + (i + 1), mt[n.n + x], null));
  return h;
}
/* — manejadores de esta función (registros A / C / U) — */
A.nutritionDay = i => {
  setNutriDayOffset(nutriDayOffset + i);
  R();
};
C.setItemGrams = (e, i, j) => {
  const k = dayKey(nutriDate());
  const it = ((S.meals[k] || {})[i] || [])[j];
  if (!it)
    return;
  /* gramos entre 0 y 5 kg: un número negativo o disparatado descuadraría los totales del día */
  it.g = clampNum(String(e.value).replace(',', '.'), 0, 5000, 0);
  saveState(mealsPart(k));
  R();
};
