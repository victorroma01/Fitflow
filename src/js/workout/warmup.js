/* ═══ workout/warmup ═══
   Series de calentamiento.
   Define: isWarmupLift, warmupHtml  · acciones/registros: 1
*/
import { A } from '../core/registry.js';
import { S, W } from '../core/state.js';
import { R } from '../core/render.js';
import { exAll } from '../library/model.js';
import { COMPOUND_RE } from './rest.js';
import { toDisplayWeight, usesLb, weightUnit } from '../profile/units.js';
import { html } from '../core/html.js';
const isWarmupLift = e => {
  const x = exAll().find(y => y.n == e.n);
  return x && ['Barra', 'Smith'].includes(x.q) && COMPOUND_RE.test(e.n) && !/Hip thrust/i.test(e.n);
};
export const warmupHtml = (e, i) => {
  const d = S.plan[S.selectedDay];
  if (!W || !isWarmupLift(e) || d.ex.findIndex(isWarmupLift) != i || W.sets[i].some(s => s.ok))
    return '';
  const w = +W.sets[i][0].w || 0;
  if (!w)
    return '<div class="mu" style="font-size:12px">Calentamiento: 2-3 series de aproximación al 50 %, 70 % y 85 % de tu peso de trabajo</div>';
  const lb = usesLb();
  const wl = toDisplayWeight(w);
  const bar = lb ? 45 : 20;
  const rd = v => lb ? Math.max(bar, Math.round(v / 5) * 5) : Math.max(bar, Math.round(v / 2.5) * 2.5);
  let st = [];
  if (wl >= bar * 3)
    st.push([bar, 10]);
  st.push([rd(wl * .5), 8], [rd(wl * .7), 5], [rd(wl * .85), 2]);
  st = st.filter((x, k) => !k || x[0] != st[k - 1][0]);
  W.warmupsDone = W.warmupsDone || {};
  return html`<div class="wup"><span>Calentamiento</span>${st.map((x, k) => html`<button class="chip${W.warmupsDone[i + '_' + k] ? ' on' : ''}" data-a="toggleWarmupSet" data-i="${i}" data-k="${k}">${x[1]} × ${x[0]} ${weightUnit()}</button>`)}</div>`;
};
A.toggleWarmupSet = (i, b) => {
  W.warmupsDone = W.warmupsDone || {};
  const k = i + '_' + b.dataset.k;
  if (W.warmupsDone[k])
    delete W.warmupsDone[k];
  else
    W.warmupsDone[k] = 1;
  R();
};
