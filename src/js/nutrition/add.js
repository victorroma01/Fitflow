/* ═══ nutrition/add ═══
   Añadir alimentos y comidas al día: lista por grupos, librería de platos, alimento nuevo y búsqueda en internet.
   «Mis alimentos» (S.myFoods): los creados a mano y, desde la V1.0.1 (F-44), los buscados o escaneados en Open Food Facts, que se
   guardan solos al añadirlos a una comida (sin repetirse) con su Nutri-Score (F-43). Cualquiera se puede borrar.
   Define: ownFoods, allFoods, NUTRI_SCORE, nutriScore, nutriScoreBadge, nutriScoreRow, saveOwnFood, foldText, groupNames, groupOfFood, foodList, addSheetBase, typedGrams, addMealItem, addSheet, onlineSheet, ownFoodDel  · acciones/registros: 15
*/
import { $, clampNum, dayKey, round1, roundInt, typedNum, X } from '../core/util.js';
import { toast } from '../core/toast.js';
import { A, U } from '../core/registry.js';
import { FOOD_GROUPS, FOODS_SRC } from '../data/foods.js';
import { addState, S, saveState, setAddState, nutriDate } from '../core/state.js';
import { mealsPart } from '../core/parts.js';
import { icon } from '../core/icons.js';
import { confirmDialog, sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { habitsCard } from './templates.js';
import { html, raw } from '../core/html.js';
import { itemMacros, sumMacros } from '../core/calc.js';
/* alimentos de la lista y los propios (solo los que tienen nombre y sus valores: unos datos dañados no rompen la lista) */
const ownFoods = () => (S.myFoods || []).filter(f => f && typeof f.n == 'string' && f.n && Array.isArray(f.b));
const allFoods = () => FOODS_SRC.concat(ownFoods());
/* Nutri-Score (F-43): la letra de la A a la E que da Open Food Facts → la clase de su color (css/98-nutrition) */
const NUTRI_SCORE = { a: 'ns-a', b: 'ns-b', c: 'ns-c', d: 'ns-d', e: 'ns-e' };
/** La letra del Nutri-Score ('a'…'e') si v lo es; si no, ''. */
export const nutriScore = v => typeof v == 'string' && Object.prototype.hasOwnProperty.call(NUTRI_SCORE, v) ? v : '';
/** La letra del Nutri-Score, pequeña (en las listas), o '' si no la hay. */
export const nutriScoreBadge = v => nutriScore(v) ? html`<i class="nsb ${NUTRI_SCORE[v]}" role="img" aria-label="${'Nutri-Score ' + v.toUpperCase()}">${v.toUpperCase()}</i>` : '';
/** El Nutri-Score con sus cinco letras y la del alimento destacada, o '' si no lo tiene. */
const nutriScoreRow = v => nutriScore(v) ? html`<div class="nsr" role="img" aria-label="${'Nutri-Score ' + v.toUpperCase()}"><span>Nutri-Score</span>${Object.keys(NUTRI_SCORE).map(x => html`<i class="${NUTRI_SCORE[x]}${x == v ? ' on' : ''}">${x.toUpperCase()}</i>`)}</div>` : '';
/* Guarda en «Mis alimentos» un alimento de Open Food Facts (F-44): sin repetirlo (mismo código de barras o mismo nombre); si
   ya estaba, se pone al día con lo último que dio Open Food Facts */
const saveOwnFood = f => {
  const o = { n: f.n, b: f.b.slice() };
  if (nutriScore(f.ns))
    o.ns = f.ns;
  if (f.ean)
    o.ean = f.ean;
  S.myFoods = S.myFoods || [];
  const i = S.myFoods.findIndex(x => x && (o.ean && x.ean == o.ean || x.n == o.n));
  if (i >= 0)
    S.myFoods[i] = { ...S.myFoods[i], ...o };
  else
    S.myFoods.push(o);
};
/** Texto en minúsculas y sin tildes, para buscar. */
const foldText = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
/* grupos de la hoja «Añadir»: los de data/foods y, si hay, los alimentos creados a mano */
const groupNames = () => FOOD_GROUPS.concat(S.myFoods.length ? ['Mis alimentos'] : []);
const groupOfFood = f => f.g >= 0 ? f.g : FOOD_GROUPS.length;
/** Lista de alimentos de la hoja «Añadir»: con texto en `q`, los que tienen todas sus palabras (sin tildes) y primero los que
    empiezan por la primera; sin texto, los del grupo elegido (o todos), por orden alfabético. */
function foodList(q) {
  const e = $('#rs');
  if (!e)
    return;
  const raw0 = String(q || '').trim();
  const k = foldText(raw0);
  const ws = k.split(/\s+/).filter(Boolean);
  const cat = addState && addState.cat >= 0 ? addState.cat : -1;
  let L = allFoods().map((f, i) => ({ f, i, n: foldText(f.n) }));
  if (ws.length) {
    L = L.filter(o => ws.every(w => o.n.includes(w)));
    L.sort((a, b) => (b.n.startsWith(ws[0]) ? 1 : 0) - (a.n.startsWith(ws[0]) ? 1 : 0) || a.n.localeCompare(b.n, 'es'));
  }
  else {
    if (cat >= 0)
      L = L.filter(o => groupOfFood(o.f) == cat);
    L.sort((a, b) => a.n.localeCompare(b.n, 'es'));
  }
  document.querySelectorAll('.fgc button').forEach(b => {
    b.classList.toggle('on', !ws.length && +b.dataset.i == cat);
    b.disabled = !!ws.length;
  });
  const own = FOODS_SRC.length;
  e.innerHTML = L.slice(0, ws.length ? 80 : 1000).map(o => html`<div class="it${o.i >= own ? ' itc' : ''}" data-a="pickFood" data-i="${o.i}" role="button" tabindex="0"><span>${o.f.n}${raw(nutriScoreBadge(o.f.ns))}</span><small>${o.f.b[0]} kcal/100 g</small>${o.i >= own ? html`<button class="cfx" data-a="ownFoodDeleteAsk" data-i="${o.i - own}" aria-label="${'Borrar ' + o.f.n + ' de Mis alimentos'}">✕</button>` : ''}</div>`).join('') + (ws.length && !L.length ? html`<p class="mu fs-13 m-10-2">No está en la lista. Búscalo en internet o créalo en «Nuevo».</p><button data-a="searchListOnline" class="w-full">${icon('srch', 16)} Buscar «${raw0.slice(0, 40)}» en internet</button>` : '');
}
function addSheetBase() {
  const a = addState;
  const tabs = html`<div class="mb-8">${['Alimentos', 'Librería', 'Nuevo'].map((x, i) => html`<button class="chip ${a.tab == i ? 'on' : ''}" data-a="addTab" data-i="${i}">${raw(x)}</button>`)}</div>`;
  if (a.pick) {
    const f = a.pick;
    return html`${tabs}<h3>${f.n}</h3>${raw(nutriScoreRow(f.ns))}<label for="gr">Gramos</label><input id="gr" type="number" value="100" data-u="foodGrams"><p id="pv" class="mu"></p><button class="pr w-full" data-a="addFood">Añadir</button>`;
  }
  /* sin título a la vista: el nombre de la hoja para los lectores de pantalla (core/ui, I-06) */
  const h = html`<h3 class="vh">Añadir alimento</h3>${tabs}`;
  if (a.tab == 0)
    return h + habitsCard(a.m) + html`<input placeholder="Buscar alimento" aria-label="Buscar alimento" data-u="foodSearch"><div class="fgc" role="group" aria-label="Grupos de alimentos">${[-1].concat(groupNames().map((x, i) => i)).map(i => html`<button class="chip${(a.cat >= 0 ? a.cat : -1) == i ? ' on' : ''}" data-a="foodGroup" data-i="${i}">${i < 0 ? 'Todos' : groupNames()[i]}</button>`)}</div><div id="rs"></div>`;
  if (a.tab == 1)
    return h + (S.savedDishes.length ? S.savedDishes.map((p, i) => html`<div class="it cols-1fr-auto-auto"><span>${p.n}<br><small>${roundInt(sumMacros(p.it.map(itemMacros))[0])} kcal</small></span><button data-a="addLibraryDish" data-i="${i}">Añadir</button><button data-a="libraryDishDelete" data-i="${i}" aria-label="${'Borrar ' + p.n}" class="p-6">✕</button></div>`).join('') : '<p class="mu">Aún no hay platos. Pulsa el icono de guardar de una comida para guardarla como plato.</p>');
  return html`${raw(h)}<label for="n0">Nombre</label><input id="n0" maxlength="80">${[['Kcal', 'k'], ['Hidratos g', 'c'], ['Proteínas g', 'p'], ['Grasas g', 'f'], ['Fibra g', 'fi'], ['Sal g', 's']].map(x => html`<label for="n_${x[1]}">${raw(x[0])} (por 100 g)</label><input type="number" id="n_${x[1]}">`)}<button class="pr w-full mt-10" data-a="newFoodSave">Guardar alimento</button>`;
}
A.addLibraryDish = i => {
  const k = dayKey(nutriDate());
  (S.meals[k] = S.meals[k] || {});
  (S.meals[k][addState.m] = S.meals[k][addState.m] || []).push(...S.savedDishes[i].it.map(x => ({ ...x })));
  saveState(mealsPart(k));
  sheet();
  R();
};
/** Los gramos escritos al añadir un alimento: entre 0,1 g y 5 kg (como al cambiarlos después: C.setItemGrams); si no, 100. Un
    número negativo o disparatado descuadraría los totales del día. */
const typedGrams = e => clampNum(e ? typedNum(e.value) : NaN, 0.1, 5000, 100);
const addMealItem = () => {
  const g = typedGrams($('#gr'));
  const k = dayKey(nutriDate());
  (S.meals[k] = S.meals[k] || {});
  (S.meals[k][addState.m] = S.meals[k][addState.m] || []).push({ n: addState.pick.n, g, b: addState.pick.b });
  saveState(mealsPart(k));
  sheet();
  R();
};
A.addFood = () => {
  const f = addState && addState.pick;
  const e = $('#gr');
  const g = typedGrams(e);
  /* lo buscado o escaneado en Open Food Facts pasa a «Mis alimentos» (F-44) */
  if (f && f.off)
    saveOwnFood(f);
  addMealItem();
  if (f && f.n && f.n != '__proto__' && Array.isArray(f.b)) {
    S.frequentFoods = S.frequentFoods || {};
    const q = S.frequentFoods[f.n] || { c: 0 };
    S.frequentFoods[f.n] = { c: (q.c || 0) + 1, g, b: f.b, t: Date.now() };
    saveState('core');
  }
};
export const addSheet = () => addSheetBase();
/** Hoja «Buscar alimento» de una comida: busca en Open Food Facts (extras/foods-online, que se carga al usarlo). */
const onlineSheet = q => html`<h3>Buscar alimento</h3><p class="mu m-n4-0-10 fs-13">Por nombre o marca, en Open Food Facts. Solo se envía el texto que buscas.</p><div class="g2 cols-1fr-auto"><input id="f2q" type="search" enterkeyhint="search" autocomplete="off" placeholder="Por ejemplo: yogur proteico" aria-label="Alimento o marca" value="${q || ''}" data-enter="searchFoodOnline"><button class="pr" data-a="searchFoodOnline">Buscar</button></div><div id="rs"></div>`;
/* — manejadores de esta función (registros A / C / U) — */
A.openAddFood = i => {
  setAddState({ m: i, tab: 0 });
  sheet(addSheet());
  foodList('');
};
/* botones de cada comida: «Buscar» (en internet) y «Scan» (código de barras) para esa comida */
A.openFoodSearch = i => {
  setAddState({ m: i, tab: 0 });
  sheet(onlineSheet(''));
  const e = $('#f2q');
  if (e)
    e.focus();
};
A.openMealScanner = i => {
  setAddState({ m: i, tab: 0 });
  A.openScanner();
};
/* desde «Añadir», sin resultados en la lista: la misma búsqueda en internet */
A.searchListOnline = () => {
  const q = String(($('input[data-u="foodSearch"]') || {}).value || '').trim();
  sheet(onlineSheet(q));
  A.searchFoodOnline();
};
A.foodGroup = i => {
  addState.cat = i;
  foodList('');
};
A.addTab = i => {
  addState.tab = i;
  addState.pick = null;
  sheet(addSheet());
  foodList('');
};
A.pickFood = i => {
  addState.pick = allFoods()[i];
  sheet(addSheet());
  U.foodGrams(100);
};
A.newFoodSave = () => {
  /* por 100 g: de 0 a 900 kcal (la grasa pura) y de 0 a 100 g de cada cosa; fuera de eso no es un alimento */
  const v = id => clampNum(typedNum($('#n_' + id).value), 0, id == 'k' ? 900 : 100, 0);
  const n = $('#n0').value.trim().slice(0, 80);
  if (!n)
    return;
  S.myFoods.push({ n, b: [v('k'), v('c'), v('p'), v('f'), v('fi'), v('s')] });
  saveState('core');
  addState.tab = 0;
  sheet(addSheet());
  foodList('');
};
/* «✕» de un alimento propio: se borra de «Mis alimentos», tras confirmarlo (lo ya comido no cambia) */
let ownFoodDel = -1;
A.ownFoodDeleteAsk = i => {
  const f = ownFoods()[i];
  if (!f)
    return;
  ownFoodDel = i;
  confirmDialog('¿Borrar de Mis alimentos?', '«' + X(f.n) + '» deja de salir en la lista. Lo que ya anotaste en tus comidas no cambia.', 'ownFoodDelete', 'Borrar');
};
A.ownFoodDelete = () => {
  const f = ownFoods()[ownFoodDel];
  ownFoodDel = -1;
  if (!f)
    return;
  S.myFoods = S.myFoods.filter(x => x !== f);
  saveState('core');
  if (addState && addState.cat >= groupNames().length)
    addState.cat = -1;
  foodList(String(($('input[data-u="foodSearch"]') || {}).value || ''));
};
/* quitar un alimento de una comida no pregunta: se puede deshacer */
A.removeMealItem = (i, b) => {
  const k = dayKey(nutriDate());
  const j = +b.dataset.j;
  const meal = S.meals[k] && S.meals[k][i];
  if (!meal || !meal[j])
    return;
  const [it] = meal.splice(j, 1);
  saveState(mealsPart(k));
  R();
  toast('«' + it.n + '» quitado', () => {
    ((S.meals[k] = S.meals[k] || {})[i] = S.meals[k][i] || []).splice(j, 0, it);
    saveState(mealsPart(k));
    R();
  });
};
U.foodGrams = v => {
  const e = $('#pv');
  if (e && addState.pick) {
    const t = addState.pick.b.map(x => x * v / 100);
    e.textContent = roundInt(t[0]) + ' kcal · C ' + round1(t[1]) + ' · P ' + round1(t[2]) + ' · G ' + round1(t[3]) + ' · Fibra ' + round1(t[4]) + ' · Sal ' + round1(t[5]);
  }
};
U.foodSearch = foodList;
