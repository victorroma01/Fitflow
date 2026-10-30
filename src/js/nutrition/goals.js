/* ═══ nutrition/goals ═══
   «Mi nutrición» (el icono de cuchillo y tenedor de Nutrición): kcal del día en un anillo con el reparto de macros, peso,
   objetivo (tipo de dieta), actividad y comidas al día; ajustar los objetivos a mano o recalcularlos con tus datos.
   Mientras estén a mano (S.nu.man), cambiar el peso o la actividad no los pisa (nutrition/diet, applyDiet).
   Define: ringSvg, myNutritionPage, manualPage, refreshGoals, manualValues  · acciones/registros: 8
*/
import { $, clampInt, clampNum, roundInt } from '../core/util.js';
import { toast } from '../core/toast.js';
import { A, C, U } from '../core/registry.js';
import { S, saveState } from '../core/state.js';
import { icon } from '../core/icons.js';
import { fullPage, pgHead, sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { ACTIVITY_LEVELS, applyDiet, DIET_TYPES, dietIndex, goalTargets, tdee } from './diet.js';
import { html, raw } from '../core/html.js';
/** Anillo de kcal: un arco por macro (hidratos, proteínas, grasas) proporcional a sus kcal, con su color. */
const ringSvg = n => {
  const r = 52;
  const L = 2 * Math.PI * r;
  const parts = [[n.c, 'var(--c)'], [n.p, 'var(--p)'], [n.f, 'var(--g)']].filter(x => x[0] > 0);
  const tot = parts.reduce((s, x) => s + x[0], 0) || 1;
  const gap = parts.length > 1 ? 16 : 0;
  let at = 0;
  const arcs = parts.map(x => {
    const len = Math.max(.5, x[0] / tot * L - gap);
    const a = html`<circle cx="64" cy="64" r="${r}" fill="none" stroke="${raw(x[1])}" stroke-width="13" stroke-linecap="round" stroke-dasharray="${len.toFixed(2)} ${L.toFixed(2)}" stroke-dashoffset="${(-at - gap / 2).toFixed(2)}"/>`;
    at += x[0] / tot * L;
    return a;
  });
  return html`<svg viewBox="0 0 128 128" width="150" height="150" aria-hidden="true"><g transform="rotate(-90 64 64)">${arcs}</g></svg>`;
};
function myNutritionPage() {
  const n = S.nu;
  const t = tdee();
  const tg = goalTargets();
  const di = dietIndex();
  const act = S.bio.act == null ? 1 : clampInt(S.bio.act, 0, ACTIVITY_LEVELS.length - 1, 1);
  const mode = n.man ? 'A mano' : t ? 'Según tu plan' : 'Por defecto';
  const diff = t ? roundInt(n.k - t.td) : null;
  const mac = (l, pc, g, c) => html`<div class="mnq"><small style="color:var(${raw(c)})">${icon('tgt', 13)}${pc} %</small><b>${roundInt(g)}</b><small>${raw(l)}</small></div>`;
  const sel = (c, label, list, cur) => html`<select data-c="${c}" aria-label="${label}">${list.map((x, i) => html`<option value="${i}"${i == cur ? ' selected' : ''}>${x}</option>`)}</select>`;
  return html`<div id="mny"><div class="row"><button data-a="cl" aria-label="Volver" style="border:0;background:none;font-size:24px;padding:6px 10px">←</button></div><div class="mnh"><h1 class="pgt">Mi nutrición</h1><span class="mnm">${raw(mode)}${icon('fk', 18)}</span></div><div class="mnr"><div class="mnk">${ringSvg(n)}<div class="mnc"><b>${roundInt(n.k)}</b><small>kcal</small></div></div><div class="mnx">${mac('Hidratos', n.c, tg[1], '--c')}${mac('Proteínas', n.p, tg[2], '--p')}${mac('Grasas', n.f, tg[3], '--g')}</div></div><div class="mnl"><label class="mnw"><span>Peso</span><span class="mnv"><input type="number" inputmode="decimal" step="0.1" min="30" max="300" data-c="mnw" value="${S.bio.w || ''}" placeholder="—" aria-label="Peso en kg"> kg</span></label><div class="mnw"><span>Objetivo</span><span class="mnv" aria-hidden="true"><b>${raw(DIET_TYPES[di][0])}</b>${raw(diff == null ? '' : html`<i class="mnd">${diff > 0 ? '+' : diff < 0 ? '−' : '±'}${Math.abs(diff)} kcal</i>`)}${icon('chr', 16)}</span>${sel('mnd', 'Objetivo: tipo de dieta', DIET_TYPES.map(d => d[0]), di)}</div><div class="mnw"><span>Actividad</span><span class="mnv" aria-hidden="true"><b>${raw(ACTIVITY_LEVELS[act][0])}</b>${icon('chr', 16)}</span>${sel('mna', 'Actividad diaria', ACTIVITY_LEVELS.map(a => a[0] + ' · ' + a[1]), act)}</div><div class="mnw"><span>Comidas al día</span><span class="mnv" aria-hidden="true"><b>${n.n}</b>${icon('chr', 16)}</span>${sel('mnn', 'Comidas al día', [2, 3, 4, 5, 6, 7, 8].map(String), n.n - 2)}</div></div><p class="mu mnp">${raw(t ? DIET_TYPES[di][4] + '. Gasto diario estimado: ' + roundInt(t.td) + ' kcal (metabolismo basal ' + roundInt(t.bm) + ' kcal).' : 'Completa edad, altura y peso en Perfil, Datos biométricos, y tus objetivos se calcularán solos.')}</p><div style="height:120px"></div><div class="sb mnb"><button data-a="nmm">Ajustar a mano</button><button class="pr" data-a="nmr">Recalcular con mis datos</button></div></div>`;
}
/** Vuelve a pintar la página abierta («Mi nutrición» o «Ajustar a mano») y la pestaña de detrás. */
const refreshGoals = () => {
  if ($('#mny'))
    sheet(myNutritionPage());
  R();
};
/* ajustar a mano: kcal y porcentajes; la vista previa dice los gramos y si los porcentajes suman 100 */
const manualPage = () => {
  const n = S.nu;
  const f = (id, l, v, mn, mx) => html`<div><label for="${id}">${raw(l)}</label><input id="${id}" type="number" inputmode="numeric" min="${mn}" max="${mx}" value="${v}" data-u="mnp"></div>`;
  return html`<div id="mnm">${pgHead('Ajustar a mano', 'nmy')}<p class="mu" style="margin:-6px 0 12px">Elige tus kcal y el reparto de macros. Mientras estén a mano, cambiar tu peso o tu actividad no los cambia; para volver a tu plan, pulsa «Recalcular con mis datos».</p>${f('mnk', 'Kcal diarias', n.k, 800, 8000)}<div class="g2" style="grid-template-columns:repeat(3,1fr)">${f('mnc0', '% Hidratos', n.c, 0, 100)}${f('mnp0', '% Proteínas', n.p, 0, 100)}${f('mnf0', '% Grasas', n.f, 0, 100)}</div><p id="mnv" class="mu" style="margin:12px 2px"></p><div style="height:90px"></div><div class="sb"><button class="pr" data-a="nms" style="width:100%;padding:14px">Guardar</button></div></div>`;
};
/** Valores del formulario «Ajustar a mano»: [kcal, % hidratos, % proteínas, % grasas] (NaN si no son válidos). */
const manualValues = () => [['mnk', 800, 8000], ['mnc0', 0, 100], ['mnp0', 0, 100], ['mnf0', 0, 100]].map(x => clampInt(($('#' + x[0]) || {}).value, x[1], x[2], NaN));
/* — manejadores de esta función (registros A / C / U) — */
A.nmy = () => fullPage(myNutritionPage());
A.nmm = () => {
  fullPage(manualPage());
  U.mnp();
};
U.mnp = () => {
  const e = $('#mnv');
  if (!e)
    return;
  const [k, c, p, f] = manualValues();
  if ([k, c, p, f].some(isNaN)) {
    e.textContent = 'Kcal entre 800 y 8000 y porcentajes entre 0 y 100.';
    return;
  }
  const s = c + p + f;
  e.textContent = s != 100 ? 'Los porcentajes suman ' + s + ' %: tienen que sumar 100.' : 'Hidratos ' + roundInt(k * c / 400) + ' g · proteínas ' + roundInt(k * p / 400) + ' g · grasas ' + roundInt(k * f / 900) + ' g al día.';
};
A.nms = () => {
  const [k, c, p, f] = manualValues();
  if ([k, c, p, f].some(isNaN) || c + p + f != 100) {
    U.mnp();
    toast('Revisa los valores: kcal entre 800 y 8000 y porcentajes que sumen 100');
    return;
  }
  Object.assign(S.nu, { k, c, p, f, man: 1 });
  saveState();
  fullPage(myNutritionPage());
  R();
  toast('Objetivos guardados a mano');
};
A.nmr = () => {
  if (!tdee()) {
    toast('Completa edad, altura y peso en Perfil para calcularlos');
    return;
  }
  applyDiet(true);
  saveState();
  refreshGoals();
  toast('Objetivos recalculados con tus datos');
};
C.mnw = e => {
  const w = clampNum(String(e.value).replace(',', '.'), 30, 300, NaN);
  if (isNaN(w)) {
    toast('Peso entre 30 y 300 kg');
    return;
  }
  S.bio.w = String(Math.round(w * 10) / 10);
  applyDiet();
  saveState();
  refreshGoals();
};
/* elegir el objetivo es elegir un plan: se recalcula aunque los objetivos estuvieran a mano */
C.mnd = e => {
  S.nu.dt = clampInt(e.value, 0, DIET_TYPES.length - 1, 3);
  applyDiet(true);
  saveState();
  refreshGoals();
};
C.mna = e => {
  S.bio.act = clampInt(e.value, 0, ACTIVITY_LEVELS.length - 1, 1);
  applyDiet();
  saveState();
  refreshGoals();
};
C.mnn = e => {
  S.nu.n = clampInt(+e.value + 2, 2, 8, 3);
  saveState();
  refreshGoals();
};
