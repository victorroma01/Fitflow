/* ═══ workout/plates ═══
   Calculadora de discos.
   Define: plateTotal, plateBar, usesBarbell, plateSizes, barSizes, plateCalc, plateResult, plateSheet  · acciones/registros: 3
*/
import { $ } from '../core/util.js';
import { A, U } from '../core/registry.js';
import { W } from '../core/state.js';
import { sheet } from '../core/ui.js';
import { exAll } from '../library/model.js';
import { toDisplayWeight, usesLb, weightUnit } from '../profile/units.js';
import { html, raw } from '../core/html.js';
export let plateTotal = 60;
/** Cambia `plateTotal` desde otros módulos (un módulo no puede asignar una variable importada). */
export const setPlateTotal = v => {
  plateTotal = v;
};
export let plateBar = 20;
/** Cambia `plateBar` desde otros módulos (un módulo no puede asignar una variable importada). */
export const setPlateBar = v => {
  plateBar = v;
};
export const usesBarbell = n => {
  const e = exAll().find(x => x.n == n);
  return e && e.q ? ['Barra', 'Barra Z'].includes(e.q) && !/Plancha|Giro|Hiperext|Superman|Encog/.test(n) : /barra|banca|sentadilla|peso muerto/i.test(n);
};
const plateSizes = () => usesLb() ? [45, 35, 25, 10, 5, 2.5] : [25, 20, 15, 10, 5, 2.5, 1.25];
const barSizes = () => usesLb() ? [45, 35, 15] : [20, 15, 10];
const plateCalc = (w, b) => {
  let r = (w - b) / 2;
  if (!(r >= 0))
    return null;
  const o = [];
  plateSizes().forEach(q => {
    const n = Math.floor(r / q + 1e-9);
    if (n > 0) {
      o.push([q, n]);
      r -= n * q;
    }
  });
  return { o, rem: Math.round(r * 100) / 100 };
};
const plateResult = () => {
  const c = plateCalc(plateTotal, plateBar);
  const u = weightUnit();
  if (!c)
    return '<p class="mu">El peso total es menor que la barra.</p>';
  return html`${raw(c.o.length ? html`<div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0">${c.o.map(x => html`<span class="tg" style="font-size:16px;padding:9px 14px"><b>${raw(x[1])} ×</b> ${raw(x[0])} ${raw(u)}</span>`)}</div>` : '<p class="mu">Solo la barra.</p>')}<p class="mu">Discos por cada lado con una barra de ${plateBar} ${raw(u)}.${raw(c.rem ? ' Sobran ' + c.rem + ' ' + u + ' por lado: ajusta el peso.' : '')}</p>`;
};
const plateSheet = () => html`<h3>Calculadora de discos</h3><label>Peso total (${weightUnit()})</label><input type="number" inputmode="decimal" data-u="zpw" value="${plateTotal}"><label>Barra</label><div class="g2" style="grid-template-columns:repeat(3,1fr)">${barSizes().map(b => html`<button data-a="zpbar" data-i="${b}" style="${plateBar == b ? 'border-color:var(--a2);color:var(--a1)' : ''}">${b} ${weightUnit()}</button>`)}</div><div id="zpr">${raw(plateResult())}</div>`;
A.zpl = i => {
  const a = W.x[i];
  const q = a.find(x => !x.ok && +x.w > 0) || a.find(x => +x.w > 0);
  plateTotal = q ? toDisplayWeight(q.w) : (usesLb() ? 135 : 60);
  if (!barSizes().includes(plateBar))
    plateBar = barSizes()[0];
  sheet(plateSheet());
};
A.zpbar = i => {
  plateBar = i;
  sheet(plateSheet());
};
U.zpw = v => {
  plateTotal = +v || 0;
  const e = $('#zpr');
  if (e)
    e.innerHTML = plateResult();
};
