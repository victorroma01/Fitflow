/* ═══ nutrition/home ═══
   Pestaña Nutrición: resumen del día y barras de macros.
   Define: itemMacros, sumMacros, macroBar, nutritionBase
*/
import { dayKey, round1, roundInt } from '../core/util.js';
import { A, C } from '../core/registry.js';
import { MEAL_NAMES, MEAL_SPLITS } from '../data/foods.js';
import { nutriDayOffset, S, saveState, setNutriDayOffset } from '../core/state.js';
import { R } from '../core/render.js';
import { dietCard } from './diet.js';
import { templateCard } from './templates.js';
import { html, raw } from '../core/html.js';
export const itemMacros = it => it.b.map(v => v * it.g / 100);
export const sumMacros = a => a.reduce((s, t) => s.map((v, i) => v + t[i]), [0, 0, 0, 0, 0, 0]);
function macroBar(l, v, t, c) {
  return html`<div><span style="color:var(${c})">${raw(l)}</span><div class="bar"><i style="width:${Math.min(100, v / t * 100 || 0)}%;background:var(${c})"></i></div><b>${roundInt(v)} / ${roundInt(t)} g</b></div>`;
}
export function nutritionBase() {
  const dt = new Date(Date.now() + nutriDayOffset * 864e5);
  const k = dayKey(dt);
  const n = S.nu;
  const m = S.meals[k] || {};
  const tg = [n.k, n.k * n.c / 400, n.k * n.p / 400, n.k * n.f / 900];
  const w = MEAL_SPLITS[n.n] || Array(n.n).fill(1 / n.n);
  const all = [];
  const mt = Array.from({ length: n.n }, (_, i) => {
    const v = sumMacros((m[i] || []).map(itemMacros));
    all.push(v);
    return v;
  });
  const tt = sumMacros(mt);
  let h = html`<div class="hd"><button data-a="nd" data-i="-1" aria-label="Día anterior">‹</button><h1>${raw(nutriDayOffset ? dt.toLocaleDateString('es', { day: 'numeric', month: 'short' }) : 'Hoy')}</h1><button data-a="nd" data-i="1" aria-label="Día siguiente">›</button></div><div class="cd" style="position:sticky;top:6px;z-index:3"><div class="mac">${macroBar('Hidratos', tt[1], tg[1], '--c')}${macroBar('Proteínas', tt[2], tg[2], '--p')}${macroBar('Grasas', tt[3], tg[3], '--g')}</div><div class="bar" style="margin-top:8px"><i style="width:${Math.min(100, tt[0] / tg[0] * 100)}%;background:var(--ac)"></i></div><div style="text-align:center"><b>${roundInt(tt[0])} / ${roundInt(tg[0])} kcal</b></div></div>`;
  h += dietCard() + templateCard(k);
  h += html`<details class="cd"><summary>Objetivos y comidas</summary><div class="g2"><div><label>Kcal diarias</label><input type="number" value="${n.k}" data-c="nk" aria-label="Kcal diarias"></div><div><label>Nº de comidas</label><select data-c="nn" aria-label="Número de comidas">${[2, 3, 4, 5, 6, 7, 8].map(x => html`<option ${x == n.n ? 'selected' : ''}>${x}</option>`)}</select></div></div><div class="g2" style="grid-template-columns:repeat(3,1fr)"><div><label>% Hidr.</label><input type="number" value="${n.c}" data-c="np" data-i="0" aria-label="Porcentaje de hidratos"></div><div><label>% Prot.</label><input type="number" value="${n.p}" data-c="np" data-i="1" aria-label="Porcentaje de proteínas"></div><div><label>% Grasas</label><input type="number" value="${n.f}" data-c="np" data-i="2" aria-label="Porcentaje de grasas"></div></div>${raw(n.c + n.p + n.f != 100 ? '<small style="color:var(--c)">Los porcentajes deben sumar 100.</small>' : '<small>Reparto automático entre comidas según el número elegido.</small>')}</details>`;
  for (let i = 0; i < n.n; i++) {
    const nm = n.n <= 5 ? MEAL_NAMES[[0, 1, 2, 3, 4].filter(x => n.n == 3 ? [0, 2, 4].includes(x) : n.n == 4 ? [0, 2, 3, 4].includes(x) : n.n == 2 ? [0, 4].includes(x) : 1)[i]] : MEAL_NAMES[i];
    const t = all[i];
    h += html`<div class="cd"><div class="row"><b>${raw(nm)}</b><small>Objetivo ${roundInt(tg[0] * w[i])} kcal</small></div>${(m[i] || []).map((it, j) => {
      const v = itemMacros(it);
      return html`<div class="it"><div>${it.n}<br><small>${roundInt(v[0])} kcal · C ${round1(v[1])} P ${round1(v[2])} G ${round1(v[3])}</small></div><input type="number" value="${it.g}" data-c="ig" data-i="${i}" data-j="${j}" aria-label="${'Gramos de ' + it.n}"><button data-a="xi" data-i="${i}" data-j="${j}" aria-label="${'Quitar ' + it.n}" style="padding:2px 6px">✕</button></div>`;
    })}<div class="mac" style="margin:8px 0"><b style="color:var(--c)">${roundInt(t[1])} / ${roundInt(tg[1] * w[i])} C</b><b style="color:var(--p)">${roundInt(t[2])} / ${roundInt(tg[2] * w[i])} P</b><b style="color:var(--g)">${roundInt(t[3])} / ${roundInt(tg[3] * w[i])} G</b></div><div class="g2"><button data-a="add" data-i="${i}">+ Alimento</button><button data-a="sd" data-i="${i}" data-n="${nm}">★ Guardar plato</button></div></div>`;
  }
  return h;
}
/* — manejadores de esta función (registros A / C / U) — */
A.nd = i => {
  setNutriDayOffset(nutriDayOffset + i);
  R();
};
C.nk = e => {
  S.nu.k = +e.value || 1942;
  saveState();
  R();
};
C.nn = e => {
  S.nu.n = +e.value;
  saveState();
  R();
};
C.np = (e, i) => {
  S.nu['cpf'[i]] = +e.value || 0;
  saveState();
  R();
};
C.ig = (e, i, j) => {
  S.meals[dayKey(new Date(Date.now() + nutriDayOffset * 864e5))][i][j].g = +e.value || 0;
  saveState();
  R();
};
