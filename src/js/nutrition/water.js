/* ═══ nutrition/water ═══
   Registro de agua diaria.
   Define: waterGoal, waterCard, nutritionTab  · acciones/registros: 1
*/
import { dayKey } from '../core/util.js';
import { A } from '../core/registry.js';
import { S, saveState, nutriDate } from '../core/state.js';
import { R } from '../core/render.js';
import { nutritionBase } from './home.js';
import { html } from '../core/html.js';
const waterGoal = () => {
  const w = +S.biometrics.w;
  return w ? Math.max(2000, Math.round(35 * w / 250) * 250) : 2500;
};
function waterCard() {
  const k = dayKey(nutriDate());
  const v = (S.water || {})[k] || 0;
  const g = waterGoal();
  return html`<div class="cd"><div class="row"><b>Agua</b><b>${v / 1000} / ${g / 1000} L</b></div><div class="bar h-10 m-10-0"><i class="bg-a2" data-style="width:${Math.min(100, v / g * 100)}%"></i></div><div class="g2 cols-3"><button data-a="addWater" data-i="-250">−250 ml</button><button data-a="addWater" data-i="250">+250 ml</button><button data-a="addWater" data-i="500">+500 ml</button></div></div>`;
}
A.addWater = i => {
  S.water = S.water || {};
  const k = dayKey(nutriDate());
  S.water[k] = Math.max(0, (S.water[k] || 0) + i);
  saveState('core');
  R();
};
export function nutritionTab() {
  return nutritionBase(waterCard());
}
