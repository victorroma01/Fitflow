/* ═══ nutrition/templates ═══
   Plantillas de comidas, tipo de día (entreno o descanso, según la rutina) y hábitos.
   Define: nutriDayKey, planDayOf, dayInfo, dayType, templateCard, habitGrams, habitsCard  · acciones/registros: 7
*/
import { $, dayKey, roundInt } from '../core/util.js';
import { toast } from '../core/toast.js';
import { A } from '../core/registry.js';
import { addState, S, saveState, setAddState, nutriDate } from '../core/state.js';
import { sheet } from '../core/ui.js';
import { HELP, helpDot } from '../core/help.js';
import { R } from '../core/render.js';
import { addSheet } from './add.js';
import { planIndex, weekOffset } from '../workout/week.js';
import { html, raw } from '../core/html.js';
import { mealItems, dayTotals } from '../core/calc.js';
const nutriDayKey = () => dayKey(nutriDate());
/** Día del plan que toca en la fecha `k` (AAAA-MM-DD): la semana de entreno va de lunes a domingo y, en un ciclo que no es
    de 7 días (workout/week), las semanas de antes o de después siguen el ciclo desde la semana actual. */
const planDayOf = k => {
  const t = new Date(k + 'T12:00:00');
  const i = (t.getDay() + 6) % 7;
  const pl = S.plan || [];
  return { i, d: pl.length ? pl[planIndex(i, S.week + weekOffset(t), pl)] || null : null };
};
/** Tipo de día ('t' entreno, 'r' descanso) y por qué, sin elegirlo a mano:
    · con un entreno registrado ese día, entreno (aunque la rutina dijera descanso);
    · un día que ya ha terminado sin entreno registrado, descanso;
    · hoy y los días que vienen, lo que diga la rutina. */
export const dayInfo = k => {
  const { i, d } = planDayOf(k);
  const planT = !!(d && Array.isArray(d.ex) && d.ex.length);
  const dn = 'Día ' + (i + 1) + (d && d.n ? ' · ' + d.n : '');
  if ((S.logs || []).some(l => l && l.d == k))
    return { t: 't', why: planT ? 'Entreno registrado este día (' + dn + ').' : 'Entreno registrado este día, aunque tu rutina marcaba descanso.' };
  const today = dayKey(new Date());
  if (k < today)
    return { t: 'r', why: planT ? 'Tocaba entreno (' + dn + '), pero no se registró: cuenta como descanso.' : 'Descanso según tu rutina.' };
  if (planT)
    return { t: 't', why: dn + ' de tu rutina.' + (k == today ? ' Si el día termina sin entreno registrado, contará como descanso.' : '') };
  return { t: 'r', why: 'Descanso según tu rutina.' + (k == today ? ' Si entrenas, contará como día de entreno.' : '') };
};
export const dayType = k => dayInfo(k).t;
/* ayudas de los botones de plantilla (el «?» de cada uno; core/ui) */
HELP.tpa = 'Rellena las comidas vacías de este día con tu plantilla del mismo tipo de día (entreno o descanso). Lo que ya hayas anotado no se toca.';
HELP.tps = 'Guarda las comidas de este día como plantilla de su tipo (entreno o descanso). Otro día del mismo tipo las repites con un toque en «Aplicar plantilla».';
export const templateCard = k => {
  const { t, why } = dayInfo(k);
  const tp = (S.mealTemplates || {})[t];
  const nm = t == 't' ? 'entreno' : 'descanso';
  const has = tp && Object.keys(tp).some(i => Array.isArray(tp[i]) && tp[i].length);
  let kc = '';
  if (has)
    kc = roundInt(dayTotals(tp)[0]);
  return html`<details class="cd"><summary>Plantillas · día de ${raw(nm)}</summary><p class="mu tpw">${why}</p><div class="g2 mt-10"><div class="hqw"><button data-a="templateApply">Aplicar plantilla</button>${helpDot('tpa', 'Qué hace «Aplicar plantilla»')}</div><div class="hqw"><button data-a="templateSave">Guardar día como plantilla</button>${helpDot('tps', 'Qué hace «Guardar día como plantilla»')}</div></div><small class="mu d-block mt-8">${raw(has ? 'Plantilla de ' + nm + ' guardada · ' + kc + ' kcal. Solo se rellenan las comidas vacías.' : 'Todavía no tienes plantilla de día de ' + nm + '. Rellena el día y pulsa Guardar.')}</small></details>`;
};
A.templateSave = () => {
  const k = nutriDayKey();
  const t = dayType(k);
  const m = S.meals[k] || {};
  const o = {};
  let n = 0;
  for (let i = 0; i < S.nutritionGoals.n; i++) {
    const l = mealItems(m, i).map(x => ({ ...x }));
    if (l.length) {
      o[i] = l;
      n++;
    }
  }
  if (!n) {
    toast('Añade alimentos al día antes de guardarlo');
    return;
  }
  S.mealTemplates = S.mealTemplates || {};
  /* si ya había una plantilla de este tipo de día, la nueva la sustituye: se puede deshacer */
  const before = S.mealTemplates[t];
  S.mealTemplates[t] = o;
  saveState();
  R();
  toast('Plantilla de ' + (t == 't' ? 'entreno' : 'descanso') + ' guardada', before && (() => {
    S.mealTemplates[t] = before;
    saveState();
    R();
  }));
};
A.templateApply = () => {
  const k = nutriDayKey();
  const t = dayType(k);
  const tp = (S.mealTemplates || {})[t];
  if (!tp) {
    toast('No hay plantilla guardada para este tipo de día');
    return;
  }
  const m = (S.meals[k] = S.meals[k] || {});
  let n = 0;
  for (let i = 0; i < S.nutritionGoals.n; i++) {
    if (!mealItems(m, i).length && Array.isArray(tp[i]) && tp[i].length) {
      m[i] = tp[i].filter(x => x && typeof x.n == 'string').map(x => ({ ...x }));
      n++;
    }
  }
  if (!n) {
    toast('Todas las comidas ya tienen alimentos');
    return;
  }
  saveState();
  R();
  toast('Plantilla aplicada a ' + n + (n == 1 ? ' comida' : ' comidas'));
};
/* gramos de un habitual: los guardados (S.frequentFoods, que puede venir de una copia antigua o tocada) solo si son un número válido */
const habitGrams = f => Math.min(5000, Math.max(0, Math.round(+(f && f.g) || 0))) || 100;
export const habitsCard = m => {
  const l = Object.keys(S.frequentFoods || {}).map(n => [n, S.frequentFoods[n]]).filter(x => x[1] && x[1].c > 0 && Array.isArray(x[1].b)).sort((a, b) => b[1].c - a[1].c || (b[1].t || 0) - (a[1].t || 0)).slice(0, 8);
  const yk = dayKey(nutriDate(-1));
  const ys = (S.meals[yk] || {})[m] || [];
  if (!l.length && !ys.length)
    return '';
  return html`<div class="mu fs-12 m-2-0-6">Habituales · un toque los añade</div><div class="hab">${raw(ys.length ? '<button class="chip" data-a="copyYesterday">Repetir comida de ayer</button>' : '')}${l.map(x => html`<button class="chip" data-a="frequentAdd" data-n="${x[0]}">${x[0]} · ${habitGrams(x[1])} g</button>`)}</div>`;
};
A.frequentAdd = (i, b) => {
  const n = b.dataset.n;
  const f = (S.frequentFoods || {})[n];
  if (!f || !addState || !Array.isArray(f.b))
    return;
  const k = nutriDayKey();
  (S.meals[k] = S.meals[k] || {});
  (S.meals[k][addState.m] = S.meals[k][addState.m] || []).push({ n, g: habitGrams(f), b: [0, 1, 2, 3, 4, 5].map(j => +f.b[j] || 0) });
  f.c = (+f.c || 0) + 1;
  f.t = Date.now();
  saveState();
  sheet();
  R();
  toast('Añadido: ' + n);
};
A.copyYesterday = () => {
  if (!addState)
    return;
  const yk = dayKey(nutriDate(-1));
  const ys = (S.meals[yk] || {})[addState.m] || [];
  if (!ys.length)
    return;
  const k = nutriDayKey();
  (S.meals[k] = S.meals[k] || {});
  (S.meals[k][addState.m] = S.meals[k][addState.m] || []).push(...ys.map(x => ({ ...x })));
  saveState();
  sheet();
  R();
  toast('Comida de ayer añadida');
};
/* — manejadores de esta función (registros A / C / U) — */
A.saveDishAsk = (i, b) => {
  setAddState({ m: i });
  sheet(html`<h3>Guardar plato en la librería</h3><input id="pn" maxlength="80" aria-label="Nombre del plato" value="${b.dataset.n}"><button class="pr w-full mt-10" data-a="saveDish">Guardar</button>`);
};
A.saveDish = () => {
  const k = dayKey(nutriDate());
  const it = ((S.meals[k] || {})[addState.m] || []).map(x => ({ ...x }));
  const n = $('#pn').value.trim() || 'Plato';
  if (it.length) {
    S.savedDishes = S.savedDishes.filter(p => p.n != n).concat({ n, it });
    saveState();
  }
  sheet();
};
/* borrar un plato guardado no pregunta: se puede deshacer */
A.libraryDishDelete = i => {
  if (!S.savedDishes[i])
    return;
  const [dish] = S.savedDishes.splice(i, 1);
  saveState();
  sheet(addSheet());
  toast('Plato «' + dish.n + '» borrado', () => {
    S.savedDishes.splice(i, 0, dish);
    saveState();
    if ($('#sh .sp'))
      sheet(addSheet());
  });
};
