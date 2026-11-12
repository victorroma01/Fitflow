/* ═══ workout/rpe ═══
   El esfuerzo de cada serie (RPE, del 6 al 10), opcional (F-42): desactivado al principio en todas las cuentas, se activa en
   Ajustes → Ajustes avanzados (S.logRpe = 1). Al activarlo, una ventana explica con dibujos hechos en la propia app la escala (las
   repeticiones que quedaban en reserva), para qué lo usa la app (la semana de descarga y el análisis mensual) y cómo se marca.
   Sin él, en el entreno solo queda «+ Drop set» bajo la serie recién hecha (workout/session). Lo ya registrado no se borra.
   Define: RPE_SCALE, rpeOn, rpeScaleSvg, rpeExampleHtml, rpeButtons, rpeExplain, rpeSettings  · acciones/registros: 3
*/
import { $ } from '../core/util.js';
import { A, C } from '../core/registry.js';
import { S, saveState } from '../core/state.js';
import { R } from '../core/render.js';
import { html, raw } from '../core/html.js';
import { usesLb } from '../profile/units.js';
/** La escala: [valor, repeticiones en reserva, cómo se siente, color]. */
const RPE_SCALE = [[6, '4 o más', 'Cómoda: te quedaban 4 o más', '#34d399'], [7, '3', 'Exigente: te quedaban 3', '#a3d65c'], [8, '2', 'Dura: te quedaban 2', '#fbbf24'], [9, '1', 'Muy dura: te quedaba 1', '#fb8c3c'], [10, '0', 'Al límite: ni una más', '#ef4444']];
/** ¿Se registra el esfuerzo en el entreno? */
export const rpeOn = () => S.logRpe === 1;
/* dibujo 1: la escala, cada valor con las repeticiones que quedaban en reserva */
const rpeScaleSvg = () => html`<svg class="rpxs" viewBox="0 0 300 92" role="img" aria-label="Escala del RPE: 6, cuatro o más repeticiones en reserva; 7, tres; 8, dos; 9, una; 10, ninguna">${RPE_SCALE.map(([v, rir, , c], k) => html`<g transform="translate(${k * 60},0)"><rect x="3" y="4" width="54" height="40" rx="11" fill="${c}"/><text x="30" y="31" text-anchor="middle" font-size="19" font-weight="800" fill="#10121a">${raw(v)}</text><text x="30" y="64" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">${rir}</text></g>`)}<text x="150" y="86" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">repeticiones que te quedaban</text></svg>`;
/* dibujo 2: una serie de ejemplo recién marcada, con su RPE debajo */
const rpeExampleHtml = () => {
  /* el peso del ejemplo, en la unidad elegida en Ajustes */
  const w = usesLb() ? '135 lb' : '60 kg';
  return html`<div class="rpxe" aria-hidden="true"><div class="rpxr"><b>Serie 2</b><span>10 × ${w}</span><i class="ck on">✓</i></div><div class="rpe"><span>RPE</span>${[6, 7, 8, 9, 10].map(v => html`<i class="chip${v == 8 ? ' on' : ''}">${raw(v)}</i>`)}</div><small>10 repeticiones con ${w} y te quedaban 2: RPE 8</small></div>`;
};
/* los botones de la ventana: «Cancelar» y «Activar», o solo «Entendido» */
const rpeButtons = withOn => {
  const b = withOn ? [['Cancelar', 'doNothing', ''], ['Activar', 'enableRpe', 'pr']] : [['Entendido', 'doNothing', 'pr']];
  return html`<div class="g2 ${withOn ? 'cols-2' : 'cols-1'}">${b.map(x => html`<button class="${x[2]}" data-a="dialogAnswer" data-v="${x[1]}">${raw(x[0])}</button>`)}</div>`;
};
/** La ventana que lo explica. withOn: con «Activar» (al activarlo en Ajustes); si no, solo «Entendido». */
const rpeExplain = withOn => {
  $('#dg').innerHTML = html`<div class="dgb"><div class="dgc rpx" role="dialog" aria-modal="true" aria-labelledby="dgt"><h3 id="dgt">Registrar el esfuerzo (RPE)</h3><p>El RPE es lo dura que ha sido una serie, del 6 al 10, según las repeticiones que te quedaban antes de no poder hacer ni una más.</p>${raw(rpeScaleSvg())}<ul class="rpxl">${RPE_SCALE.map(([v, , t]) => html`<li><b>${raw(v)}</b> ${t}</li>`)}</ul><h4>Cómo se marca</h4><p>Al marcar una serie como hecha, debajo salen los números del 6 al 10: toca el que corresponda. Es opcional en cada serie.</p>${raw(rpeExampleHtml())}<h4>Para qué lo usa la app</h4><p>Con tus RPE, la app ve si vas acumulando fatiga para proponerte la semana de descarga y te enseña tu esfuerzo medio en el análisis mensual.</p>${rpeButtons(withOn)}</div></div>`;
};
/** Ajustes → Ajustes avanzados. */
export const rpeSettings = () => html`<div class="cd"><label class="srk"><input type="checkbox" data-c="toggleRpe"${rpeOn() ? ' checked' : ''}> Registrar el esfuerzo (RPE)</label><small class="mu d-block mt-n4">Tras cada serie, puntúa del 6 al 10 lo dura que ha sido. Con eso la app propone la semana de descarga y completa el análisis mensual.</small><button data-a="explainRpe" class="w-full mt-12">¿Qué es el RPE?</button></div>`;
/* — manejadores de esta función (registros A / C / U) — */
/* activarlo pasa antes por la explicación; desactivarlo, no (lo ya registrado se queda) */
C.toggleRpe = e => {
  if (e.checked) {
    e.checked = false;
    rpeExplain(1);
    return;
  }
  delete S.logRpe;
  saveState();
  R();
};
A.enableRpe = () => {
  S.logRpe = 1;
  saveState();
  R();
};
A.explainRpe = () => rpeExplain(0);
