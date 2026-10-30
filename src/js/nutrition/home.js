/* ═══ nutrition/home ═══
   Pestaña Nutrición: el día (con su tipo, entreno o descanso), resumen de macros y comidas con sus botones.
   Define: itemMacros, sumMacros, macroBar, mealName, nutritionBase
*/
import { clampNum, dayKey, round1, roundInt } from '../core/util.js';
import { A, C } from '../core/registry.js';
import { MEAL_NAMES, MEAL_SPLITS } from '../data/foods.js';
import { nutriDayOffset, S, saveState, setNutriDayOffset } from '../core/state.js';
import { icon } from '../core/icons.js';
import { R } from '../core/render.js';
import { goalTargets } from './diet.js';
import { dayType, templateCard } from './templates.js';
import { html, raw } from '../core/html.js';
/** Valores de un alimento anotado según sus gramos: siempre 6 números (kcal, hidratos, proteínas, grasas, fibra, sal), aunque
    los datos vengan dañados o de una copia manipulada; un alimento roto no puede impedir que se pinte Nutrición. */
export const itemMacros = it => {
  const b = it && Array.isArray(it.b) ? it.b : [];
  const g = it ? +it.g || 0 : 0;
  return [0, 1, 2, 3, 4, 5].map(i => (+b[i] || 0) * g / 100);
};
/** Lista de alimentos de la comida `i` de un día (solo los que tienen nombre). */
export const mealItems = (m, i) => (m && Array.isArray(m[i]) ? m[i] : []).filter(it => it && typeof it.n == 'string');
export const sumMacros = a => a.reduce((s, t) => s.map((v, i) => v + t[i]), [0, 0, 0, 0, 0, 0]);
function macroBar(l, v, t, c) {
  return html`<div><span style="color:var(${c})">${raw(l)}</span><div class="bar"><i style="width:${Math.min(100, v / t * 100 || 0)}%;background:var(${c})"></i></div><b>${roundInt(v)} / ${roundInt(t)} g</b></div>`;
}
/** Nombre de la comida `i` de `n` comidas al día (Desayuno, Comida, Cena…). */
export const mealName = (i, n) => (n <= 5 ? MEAL_NAMES[[0, 1, 2, 3, 4].filter(x => n == 3 ? [0, 2, 4].includes(x) : n == 4 ? [0, 2, 3, 4].includes(x) : n == 2 ? [0, 4].includes(x) : 1)[i]] : MEAL_NAMES[i]) || 'Comida ' + (i + 1);
/** Pestaña Nutrición; `water` es la tarjeta del agua (nutrition/water), que va tras el resumen. */
export function nutritionBase(water) {
  const dt = new Date(Date.now() + nutriDayOffset * 864e5);
  const k = dayKey(dt);
  const n = S.nu;
  const m = S.meals[k] || {};
  const tg = goalTargets();
  const w = MEAL_SPLITS[n.n] || Array(n.n).fill(1 / n.n);
  const all = [];
  const mt = Array.from({ length: n.n }, (_, i) => {
    const v = sumMacros(mealItems(m, i).map(itemMacros));
    all.push(v);
    return v;
  });
  const tt = sumMacros(mt);
  const t = dayType(k);
  let h = html`<div class="hd"><button data-a="nd" data-i="-1" aria-label="Día anterior">‹</button><h1>${raw(nutriDayOffset ? dt.toLocaleDateString('es', { day: 'numeric', month: 'short' }) : 'Hoy')}</h1><button data-a="nd" data-i="1" aria-label="Día siguiente">›</button></div><div class="ndy"><span class="ndt">${icon(t == 't' ? 'workout' : 'moon', 16)}${raw(t == 't' ? 'Día de entreno' : 'Día de descanso')}</span><button class="nmb" data-a="nmy" aria-label="Mi nutrición: objetivo de kcal y macros">${icon('fk', 22)}</button></div><div class="cd" style="position:sticky;top:6px;z-index:3"><div class="mac">${macroBar('Hidratos', tt[1], tg[1], '--c')}${macroBar('Proteínas', tt[2], tg[2], '--p')}${macroBar('Grasas', tt[3], tg[3], '--g')}</div><div class="bar" style="margin-top:8px"><i style="width:${Math.min(100, tt[0] / tg[0] * 100)}%;background:var(--ac)"></i></div><div style="text-align:center"><b>${roundInt(tt[0])} / ${roundInt(tg[0])} kcal</b></div></div>${raw(water || '')}${templateCard(k)}`;
  for (let i = 0; i < n.n; i++) {
    const nm = mealName(i, n.n);
    const v0 = all[i];
    h += html`<div class="cd"><div class="row"><b>${raw(nm)}</b><small>Objetivo ${roundInt(tg[0] * w[i])} kcal</small></div>${mealItems(m, i).map((it, j) => {
      const v = itemMacros(it);
      return html`<div class="it"><div>${it.n}<br><small>${roundInt(v[0])} kcal · C ${round1(v[1])} P ${round1(v[2])} G ${round1(v[3])}</small></div><input type="number" inputmode="decimal" value="${it.g}" data-c="ig" data-i="${i}" data-j="${j}" aria-label="${'Gramos de ' + it.n}"><button data-a="xi" data-i="${i}" data-j="${j}" aria-label="${'Quitar ' + it.n}" style="padding:2px 6px">✕</button></div>`;
    })}<div class="mac" style="margin:8px 0"><b style="color:var(--c)">${roundInt(v0[1])} / ${roundInt(tg[1] * w[i])} C</b><b style="color:var(--p)">${roundInt(v0[2])} / ${roundInt(tg[2] * w[i])} P</b><b style="color:var(--g)">${roundInt(v0[3])} / ${roundInt(tg[3] * w[i])} G</b></div><div class="mlb"><button class="mlp mli" data-a="add" data-i="${i}" aria-label="${'Añadir alimento, ' + nm}">${icon('plus', 20)}</button><button class="mlp mli" data-a="sd" data-i="${i}" data-n="${nm}" aria-label="${'Guardar ' + nm + ' como plato'}">${icon('bkm', 18)}</button><button class="mlp" data-a="nfs" data-i="${i}" aria-label="${'Buscar alimento en internet, ' + nm}">${icon('srch', 17)}<span>Buscar</span></button><button class="mlp" data-a="nsc" data-i="${i}" aria-label="${'Escanear código de barras, ' + nm}">${icon('bar', 17)}<span>Scan</span></button></div></div>`;
  }
  return h;
}
/* — manejadores de esta función (registros A / C / U) — */
A.nd = i => {
  setNutriDayOffset(nutriDayOffset + i);
  R();
};
C.ig = (e, i, j) => {
  const it = ((S.meals[dayKey(new Date(Date.now() + nutriDayOffset * 864e5))] || {})[i] || [])[j];
  if (!it)
    return;
  /* gramos entre 0 y 5 kg: un número negativo o disparatado descuadraría los totales del día */
  it.g = clampNum(String(e.value).replace(',', '.'), 0, 5000, 0);
  saveState();
  R();
};
