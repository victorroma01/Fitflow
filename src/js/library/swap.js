/* ═══ library/swap ═══
   Cambiar un ejercicio por otro (swap) y deshacer.
   Define: swapExercise, swapState, swapCandidates, swapTiers, swapBody, swapScope  · acciones/registros: 6
*/
import { $ } from '../core/util.js';
import { A, U } from '../core/registry.js';
import { groupOf } from '../data/library.js';
import { S, saveState, W } from '../core/state.js';
import { sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { exAll, exCellHtml, exOrder, exSearchText, overlapCount } from './model.js';
import { equipDropdown, equipIn, equipMatch, filterOpen } from './filters.js';
import { fixUnits } from '../workout/targets.js';
import { prefillSets } from '../workout/progression.js';
import { html, raw } from '../core/html.js';
const swapExercise = (i, b) => {
  const nn = b.dataset.n;
  const d = S.plan[S.sel].ex;
  const old = d[i].n;
  const ch = e => {
    e.o = e.o || e.n;
    e.n = nn;
  };
  if (b.dataset.v == '1')
    S.plan.forEach(dy => dy.ex.forEach(e => {
      if (e.n == old)
        ch(e);
    }));
  else
    ch(d[i]);
  if (W && W.x[i])
    W.x[i].forEach(s => {
      if (!s.ok)
        s.w = S.last[nn] || '';
    });
  saveState();
  sheet();
  R();
};
A.zun = i => {
  const e = S.plan[S.sel].ex[i];
  const o = e.o;
  const c = e.n;
  if (!o)
    return;
  S.plan.forEach(dy => dy.ex.forEach(x => {
    if (x.o == o && x.n == c) {
      x.n = o;
      delete x.o;
      if (x.ou) {
        if (x.ou.u)
          x.u = x.ou.u;
        else
          delete x.u;
        if (x.ou.rg)
          x.rg = x.ou.rg;
        else
          delete x.rg;
        delete x.ou;
      }
    }
  }));
  W.x[i].forEach(s => {
    if (!s.ok)
      s.w = S.last[o] || '';
  });
  prefillSets(S.plan[S.sel].ex[i], W.x[i]);
  saveState();
  R();
};
export let swapState = { i: 0, q: '', eq: [], all: 0 };
const swapCandidates = c => {
  const inDay = new Set(S.plan[S.sel].ex.map(x => x.n));
  const q = swapState.q.trim();
  return exAll().filter(e => e.n != c.n && !inDay.has(e.n) && (!q || exSearchText(e).includes(q)));
};
const swapTiers = (c, l) => {
  const cp = c.p || [];
  const cs = c.s || [];
  const cg = groupOf(c);
  const t0 = [];
  const t1 = [];
  const t2 = [];
  const t3 = [];
  l.forEach(e => {
    const sc = 2 * overlapCount(cp, e.p || []) + overlapCount(cp, e.s || []) + overlapCount(cs, e.p || []);
    const g = groupOf(e);
    if (g == cg && c.t && c.t != 'Otros' && e.t == c.t)
      t0.push([sc, e]);
    else if (g == cg)
      (overlapCount(cp, e.p || []) ? t1 : t2).push([sc, e]);
    else if (e.c == c.c && sc > 0 && overlapCount(cp.concat(cs), e.p || []) > 0)
      t3.push([sc, e]);
  });
  const so = a => a.sort((x, y) => y[0] - x[0] || exOrder(x[1]) - exOrder(y[1])).map(x => x[1]);
  return [['Mismo enfoque', so(t0)], ['Mismo grupo muscular', so(t1).concat(so(t2))], ['Músculos relacionados', so(t3).slice(0, swapState.q ? 40 : 10)]];
};
export const swapBody = () => {
  const cur = S.plan[S.sel].ex[swapState.i];
  const c = exAll().find(x => x.n == cur.n) || { n: cur.n, p: [], s: [] };
  const cand = swapCandidates(c);
  const eqs = equipIn(cand);
  const l = cand.filter(e => equipMatch(swapState.eq, e));
  const T = swapTiers(c, l);
  let h = equipDropdown('sw', swapState.eq, eqs, cand);
  T.forEach(t => {
    if (!t[1].length)
      return;
    h += html`<div class="ph">${raw(t[0])} · ${t[1].length}</div>${t[1].slice(0, swapState.q ? 60 : t[0] == 'Mismo enfoque' ? 30 : 14).map(e => html`<div class="it exr" data-a="zsd" data-i="${swapState.i}" data-n="${e.n}" style="cursor:pointer"><span class="exc">${exCellHtml(e)}</span><small class="mu">Elegir ›</small></div>`)}`;
  });
  return h || '<p class="mu">No hay alternativas con esos filtros.</p>';
};
const swapScope = () => ['Este día', 'Todo el programa'].map((x, i) => html`<button class="chip${!!swapState.all == !!i ? ' on' : ''}" data-a="swsc" data-i="${i}">${raw(x)}</button>`).join('');
A.zsw = i => {
  swapState = { i, q: '', eq: [], all: 0 };
  filterOpen.sw = 0;
  const e = S.plan[S.sel].ex[i];
  sheet(html`<h3>Swap</h3><p class="mu" style="margin:-4px 0 8px">Sustituir «${e.n}» por otra opción. Primero verás las más parecidas.</p><div id="swh">${raw(swapScope())}</div><input placeholder="Buscar alternativa" data-u="sws" style="margin-top:8px"><div id="swb">${raw(swapBody())}</div>`);
};
A.swsc = i => {
  swapState.all = i;
  $('#swh').innerHTML = swapScope();
};
A.sweq = (i, b) => {
  swapState.eq = b.dataset.v;
  $('#swb').innerHTML = swapBody();
};
U.sws = v => {
  swapState.q = v.toLowerCase();
  $('#swb').innerHTML = swapBody();
};
A.zsd = (i, b) => {
  const nn = b.dataset.n;
  b.dataset.v = swapState.all ? '1' : '0';
  swapExercise(i, b);
  fixUnits(nn);
  if (W && W.x[i])
    prefillSets(S.plan[S.sel].ex[i], W.x[i]);
  R();
};
