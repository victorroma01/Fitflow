/* ═══ extras/stagnation ═══
   Detección de estancamiento.
   Define: stagnation, stagnationCard, STAGNATION_TIPS, bestSetText  · acciones/registros: 2
*/
import { fmtDateShort, round1 } from '../core/util.js';
import { bestSet, measuredInReps } from '../core/calc.js';
import { A } from '../core/registry.js';
import { S, saveState } from '../core/state.js';
import { sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { isDeloadWeek } from '../workout/deload.js';
import { toDisplayWeight, weightUnit } from '../profile/units.js';
import { html, raw } from '../core/html.js';
function stagnation() {
  const out = [];
  if (typeof isDeloadWeek == 'function' && isDeloadWeek(S.week))
    return out;
  const h = S.exerciseHistory || {};
  const inPlan = new Set((S.plan || []).flatMap(d => (d.ex || []).map(e => e.n)));
  const now = Date.now();
  const hide = S.stagnationDismissed || {};
  Object.keys(h).forEach(n => {
    if (!inPlan.has(n) || !measuredInReps(n))
      return;
    if (hide[n] && now - hide[n] < 14 * 864e5)
      return;
    const L = Array.isArray(h[n]) ? h[n] : [];
    /* la mejor serie de cada sesión por 1RM estimado (core/calc: las mismas series que cuentan para los récords) */
    const ses = L.slice(0, 12).map(x => {
      const b = bestSet(x);
      return { d: x && x.d, e: b ? b.e : 0, b: b ? [b.r, b.w] : null };
    }).filter(s => s.e > 0);
    if (ses.length < 4)
      return;
    const mx = Math.max(...ses.map(s => s.e));
    let bi = 0;
    while (bi < ses.length && ses[bi].e < mx * .995)
      bi++;
    if (bi < 3)
      return;
    const d0 = new Date(ses[0].d + 'T12:00:00');
    const d1 = new Date(ses[bi].d + 'T12:00:00');
    if (isNaN(d0) || isNaN(d1))
      return;
    if (now - d0 > 35 * 864e5)
      return;
    if ((d0 - d1) / 864e5 < 14)
      return;
    out.push({ n, k: bi, mx, d: ses[bi].d, b: ses[bi].b, ses: ses.slice(0, 4) });
  });
  return out.sort((a, b) => b.k - a.k).slice(0, 3);
}
export function stagnationCard() {
  try {
    const L = stagnation();
    if (!L.length)
      return '';
    return html`<div class="cd"><div class="row"><b>Posible estancamiento</b><small>${L.length}${L.length == 1 ? ' ejercicio' : ' ejercicios'}</small></div><div class="mu fs-13 m-4-0-6">No superas tu mejor marca desde hace varias sesiones.</div>${L.map((x, i) => html`<div class="it exr cur-pointer" data-a="stagnationInfo" data-i="${i}" role="button" tabindex="0"><span><b>${x.n}</b><br><small>Sin récord en ${raw(x.k)} sesiones</small></span><span class="mu as-c">›</span></div>`)}</div>`;
  }
  catch (e) {
    return '';
  }
}
/* qué probar para volver a progresar */
const STAGNATION_TIPS = ['Cambia el rango de repeticiones durante 3 o 4 semanas, por ejemplo de 8-12 a 4-6 con más peso.', 'Añade una serie a este ejercicio o descansa un poco más entre series.', 'Revisa el sueño y la comida: dormir poco o comer en déficit frena la fuerza.', 'Prueba una variante del ejercicio (opción Swap) durante un bloque.', 'Una semana de descarga (peso al 65 % y 2 repeticiones menos) suele desbloquear el progreso.'];
/* la mejor serie de una sesión: «60 kg × 8» */
const bestSetText = b => b ? toDisplayWeight(b[1]) + ' ' + weightUnit() + ' × ' + b[0] : '';
A.stagnationInfo = i => {
  const x = stagnation()[i];
  if (!x)
    return;
  const since = html`<p class="mu m-0-0-10">Tu mejor marca estimada fue el ${raw(fmtDateShort(x.d, { day: 'numeric', month: 'long' }))}${raw(x.b ? ': ' + bestSetText(x.b) : '')} (1RM estimado ${round1(toDisplayWeight(x.mx))} ${weightUnit()}). Desde entonces llevas ${raw(x.k)} sesiones sin superarla.</p>`;
  const sessions = html`<div class="cd m-0-0-10"><small class="mu">Últimas sesiones</small>${x.ses.map(s => html`<div class="it cols-1fr-auto"><span>${raw(fmtDateShort(s.d, { day: 'numeric', month: 'short' }))}</span><b>${raw(bestSetText(s.b))}</b></div>`)}</div>`;
  const tips = html`<b>Qué probar</b><div class="mu fs-14 d-grid gap-7 m-6-0-12">${STAGNATION_TIPS.map(t => html`<div>· ${t}</div>`)}</div>`;
  sheet(html`<h3>${x.n}</h3>${since}${sessions}${tips}<div class="g2"><button data-a="stagnationDismiss" data-i="${i}">Ocultar 2 semanas</button><button class="pr" data-a="deloadOnFromSheet">Activar descarga</button></div>`);
};
A.stagnationDismiss = i => {
  const x = stagnation()[i];
  if (x) {
    S.stagnationDismissed = S.stagnationDismissed || {};
    S.stagnationDismissed[x.n] = Date.now();
    saveState();
  }
  sheet();
  R();
};
