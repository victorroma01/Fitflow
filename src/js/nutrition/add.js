/* ═══ nutrition/add ═══
   Añadir alimentos y comidas al día.
   Define: allFoods, foldText, foodList, addSheetBase, addMealItem, addSheet  · acciones/registros: 2
*/
import { $, dayKey, round1, roundInt } from '../core/util.js';
import { logError } from '../core/errors.js';
import { A, U } from '../core/registry.js';
import { FOODS_SRC } from '../data/foods.js';
import { addState, nutriDayOffset, S, saveState, setAddState } from '../core/state.js';
import { icon } from '../core/icons.js';
import { sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { itemMacros, sumMacros } from './home.js';
import { habitsCard } from './templates.js';
import { html, raw } from '../core/html.js';
export const allFoods = () => FOODS_SRC.concat(S.cf);
/** Texto en minúsculas y sin tildes, para buscar. */
export const foldText = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
/** Lista de alimentos de la hoja «Añadir» que coinciden con la búsqueda `q` (todas las palabras, sin tildes). */
export function foodList(q) {
  const e = $('#rs');
  if (!e)
    return;
  const k = foldText(String(q || '').trim());
  const ws = k.split(/\s+/).filter(Boolean);
  const L = allFoods().map((f, i) => ({ f, i, n: foldText(f.n) })).filter(o => !ws.length || ws.every(w => o.n.includes(w)));
  L.sort((a, b) => (ws.length && b.n.startsWith(ws[0]) ? 1 : 0) - (ws.length && a.n.startsWith(ws[0]) ? 1 : 0));
  e.innerHTML = L.slice(0, ws.length ? 60 : 30).map(o => html`<div class="it" style="grid-template-columns:1fr auto" data-a="pk" data-i="${o.i}" role="button" tabindex="0"><span>${o.f.n}</span><small>${o.f.b[0]} kcal/100 g</small></div>`).join('') + (ws.length && !L.length ? '<p class="mu" style="font-size:13px;margin:10px 2px">No está en tu lista. Prueba «Buscar en internet» o créalo en «Nuevo».</p>' : '');
}
function addSheetBase() {
  const a = addState;
  let h = html`<div style="margin-bottom:8px">${['Alimentos', 'Librería', 'Nuevo'].map((x, i) => html`<button class="chip ${a.tab == i ? 'on' : ''}" data-a="at" data-i="${i}">${raw(x)}</button>`)}</div>`;
  if (a.pick) {
    const f = a.pick;
    return html`${raw(h)}<h3>${f.n}</h3><label for="gr">Gramos</label><input id="gr" type="number" value="100" data-u="gr"><p id="pv" class="mu"></p><button class="pr" data-a="fa" style="width:100%">Añadir</button>`;
  }
  if (a.tab == 0)
    return h + habitsCard(a.m) + '<input placeholder="Buscar alimento" aria-label="Buscar alimento" data-u="fs"><div id="rs"></div>';
  if (a.tab == 1)
    return h + (S.lib.length ? S.lib.map((p, i) => html`<div class="it" style="grid-template-columns:1fr auto auto"><span>${p.n}<br><small>${roundInt(sumMacros(p.it.map(itemMacros))[0])} kcal</small></span><button data-a="la" data-i="${i}">Añadir</button><button data-a="lx" data-i="${i}" aria-label="${'Borrar ' + p.n}" style="padding:6px">✕</button></div>`).join('') : '<p class="mu">Aún no hay platos. Pulsa ★ Guardar plato en una comida.</p>');
  return html`${raw(h)}<label for="n0">Nombre</label><input id="n0">${[['Kcal', 'k'], ['Hidratos g', 'c'], ['Proteínas g', 'p'], ['Grasas g', 'f'], ['Fibra g', 'fi'], ['Sal g', 's']].map(x => html`<label for="n_${x[1]}">${raw(x[0])} (por 100 g)</label><input type="number" id="n_${x[1]}">`)}<button class="pr" data-a="nf" style="width:100%;margin-top:10px">Guardar alimento</button>`;
}
A.la = i => {
  const k = dayKey(new Date(Date.now() + nutriDayOffset * 864e5));
  (S.meals[k] = S.meals[k] || {});
  (S.meals[k][addState.m] = S.meals[k][addState.m] || []).push(...S.lib[i].it.map(x => ({ ...x })));
  saveState();
  sheet();
  R();
};
const addMealItem = () => {
  const g = +$('#gr').value || 100;
  const k = dayKey(new Date(Date.now() + nutriDayOffset * 864e5));
  (S.meals[k] = S.meals[k] || {});
  (S.meals[k][addState.m] = S.meals[k][addState.m] || []).push({ n: addState.pick.n, g, b: addState.pick.b });
  saveState();
  sheet();
  R();
};
A.fa = () => {
  const f = addState && addState.pick;
  const e = $('#gr');
  const g = e ? (+e.value || 100) : 100;
  addMealItem();
  if (f && f.n && f.n != '__proto__' && Array.isArray(f.b)) {
    S.fq = S.fq || {};
    const q = S.fq[f.n] || { c: 0 };
    S.fq[f.n] = { c: (q.c || 0) + 1, g, b: f.b, t: Date.now() };
    saveState();
  }
};
export function addSheet() {
  const h = addSheetBase();
  try {
    if (addState && !addState.pick && addState.tab == 0) {
      const m = 'data-u="fs">';
      const k = h.indexOf(m);
      if (k >= 0)
        return html`${raw(h.slice(0, k + m.length))}<div class="g2" style="margin:8px 0 2px"><button data-a="f2os">${icon('globe', 16)} Buscar online</button><button data-a="f2sc">${icon('scan', 16)} Escanear código</button></div><small class="mu" style="display:block;margin:0 2px 6px;font-size:11px">Open Food Facts: solo se envía el texto o el código que buscas.</small>${raw(h.slice(k + m.length))}`;
    }
  }
  catch (e) {
    logError('hoja de añadir alimento', e);
  }
  return h;
}
/* — manejadores de esta función (registros A / C / U) — */
A.add = i => {
  setAddState({ m: i, tab: 0 });
  sheet(addSheet());
  foodList('');
};
A.at = i => {
  addState.tab = i;
  addState.pick = null;
  sheet(addSheet());
  foodList('');
};
A.pk = i => {
  addState.pick = allFoods()[i];
  sheet(addSheet());
  U.gr(100);
};
A.nf = () => {
  const v = id => +$('#n_' + id).value || 0;
  const n = $('#n0').value.trim();
  if (!n)
    return;
  S.cf.push({ n, b: [v('k'), v('c'), v('p'), v('f'), v('fi'), v('s')] });
  saveState();
  addState.tab = 0;
  sheet(addSheet());
  foodList('');
};
A.xi = (i, b) => {
  S.meals[dayKey(new Date(Date.now() + nutriDayOffset * 864e5))][i].splice(+b.dataset.j, 1);
  saveState();
  R();
};
U.gr = v => {
  const e = $('#pv');
  if (e && addState.pick) {
    const t = addState.pick.b.map(x => x * v / 100);
    e.textContent = roundInt(t[0]) + ' kcal · C ' + round1(t[1]) + ' · P ' + round1(t[2]) + ' · G ' + round1(t[3]) + ' · Fibra ' + round1(t[4]) + ' · Sal ' + round1(t[5]);
  }
};
U.fs = foodList;
