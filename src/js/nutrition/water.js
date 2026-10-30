/* ═══ nutrition/water ═══
   Registro de agua diaria.
   Define: waterGoal, waterCard, nutritionTab  · acciones/registros: 1
*/
import { dayKey } from '../core/util.js';
import { A } from '../core/registry.js';
import { nutriDayOffset, S, saveState } from '../core/state.js';
import { R } from '../core/render.js';
import { nutritionBase } from './home.js';
import { html } from '../core/html.js';
const waterGoal = () => {
  const w = +S.bio.w;
  return w ? Math.max(2000, Math.round(35 * w / 250) * 250) : 2500;
};
function waterCard() {
  const k = dayKey(new Date(Date.now() + nutriDayOffset * 864e5));
  const v = (S.wt || {})[k] || 0;
  const g = waterGoal();
  return html`<div class="cd"><div class="row"><b>Agua</b><b>${v / 1000} / ${g / 1000} L</b></div><div class="bar" style="height:10px;margin:10px 0"><i style="width:${Math.min(100, v / g * 100)}%;background:var(--a2)"></i></div><div class="g2" style="grid-template-columns:repeat(3,1fr)"><button data-a="zwt" data-i="-250">−250 ml</button><button data-a="zwt" data-i="250">+250 ml</button><button data-a="zwt" data-i="500">+500 ml</button></div></div>`;
}
A.zwt = i => {
  S.wt = S.wt || {};
  const k = dayKey(new Date(Date.now() + nutriDayOffset * 864e5));
  S.wt[k] = Math.max(0, (S.wt[k] || 0) + i);
  saveState();
  R();
};
export function nutritionTab() {
  return nutritionBase().replace('<details class="cd"><summary>Tipo de dieta', html`${waterCard()}<details class="cd"><summary>Tipo de dieta`);
}
