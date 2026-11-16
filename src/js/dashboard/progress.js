/* ═══ dashboard/progress ═══
   Gráficas de progreso por ejercicio.
   Define: progressState, progressExercises, progressSeries, progressFmt, axisLabel, progressChart, progressBody, refreshProgress, progressCard, recordEvents, recordsTimeline  · acciones/registros: 3
*/
import { $, fmtDateShort, round1, roundInt } from '../core/util.js';
import { bestSet, liftScore, measuredInReps } from '../core/calc.js';
import { A, C } from '../core/registry.js';
import { S } from '../core/state.js';
import { segmented } from '../core/ui.js';
import { toDisplayWeight, weightUnit } from '../profile/units.js';
import { html, raw } from '../core/html.js';
let progressState = { n: '', m: 'e', p: -1 };
const progressExercises = () => Object.keys(S.exerciseHistory || {}).filter(n => {
  const h = S.exerciseHistory[n];
  return Array.isArray(h) && h.some(x => x.s.some(y => +y[1] > 0));
}).sort((a, b) => {
  const da = (S.exerciseHistory[a][0] || {}).d || '';
  const db = (S.exerciseHistory[b][0] || {}).d || '';
  return da < db ? 1 : da > db ? -1 : 0;
});
/* los puntos de la gráfica del ejercicio `n`: por sesión, el mejor 1RM estimado ('e'), el peso máximo ('w') o el volumen ('v').
   El 1RM y el volumen son de series en repeticiones (core/calc: liftScore); las filas extra no cuentan para el máximo */
const progressSeries = (n, m) => {
  const h = ((S.exerciseHistory || {})[n] || []).slice().reverse();
  return h.map(x => {
    let v = 0;
    if (m == 'v')
      v = x.s.reduce((a, y) => a + (+y[0] || 0) * (+y[1] || 0), 0);
    else if (m == 'w')
      v = Math.max(0, ...x.s.filter(y => !y[3]).map(y => +y[1] || 0));
    else
      v = Math.max(0, ...x.s.map(liftScore));
    return v > 0 ? { d: x.d, v } : null;
  }).filter(Boolean).slice(-30);
};
const progressFmt = (v, m) => m == 'v' ? roundInt(toDisplayWeight(v)) + ' ' + weightUnit() : (Math.round(toDisplayWeight(v) * 10) / 10) + ' ' + weightUnit();
const axisLabel = v => v >= 10000 ? round1(v / 1000) + 'k' : Math.round(v) + '';
const progressChart = (pts, m, sel, inter) => {
  const W0 = 320;
  const H0 = 150;
  const pl = 38;
  const pr = 12;
  const pt = 12;
  const pb = 24;
  const iw = W0 - pl - pr;
  const ih = H0 - pt - pb;
  const vs = pts.map(p => toDisplayWeight(p.v));
  let lo = Math.min(...vs);
  let hi = Math.max(...vs);
  if (hi - lo < 1e-6) {
    lo = Math.max(0, lo * .9);
    hi = hi * 1.1 + 1;
  }
  else {
    const pd = (hi - lo) * .15;
    lo = Math.max(0, lo - pd);
    hi = hi + pd;
  }
  const t = pts.map(p => new Date(p.d + 'T00:00:00').getTime());
  const t0 = t[0];
  const t1 = t[t.length - 1];
  const xx = i => pts.length < 2 || t1 == t0 ? pl + iw / 2 : pl + (t[i] - t0) / (t1 - t0) * iw;
  const yy = v => pt + ih - (v - lo) / (hi - lo) * ih;
  let b = 0;
  pts.forEach(p => {
    p.pr = m != 'v' && b > 0 && p.v > b + 1e-6;
    if (p.v > b)
      b = p.v;
  });
  const tk = [lo, (lo + hi) / 2, hi];
  let s = html`<svg viewBox="0 0 ${W0} ${H0}" role="img" aria-label="Evolución del ejercicio">`;
  tk.forEach(v => {
    const y = yy(v);
    s += html`<line x1="${pl}" x2="${W0 - pr}" y1="${y}" y2="${y}" stroke="var(--ln)" stroke-width="1"/><text x="${pl - 6}" y="${y + 3.5}" text-anchor="end" class="pga">${raw(axisLabel(v))}</text>`;
  });
  s += html`<text x="${pl}" y="${H0 - 6}" class="pga">${fmtDateShort(pts[0].d)}</text>`;
  if (pts.length > 1)
    s += html`<text x="${W0 - pr}" y="${H0 - 6}" text-anchor="end" class="pga">${fmtDateShort(pts[pts.length - 1].d)}</text>`;
  if (pts.length > 1)
    s += html`<path d="${pts.map((p, i) => (i ? 'L' : 'M') + xx(i).toFixed(1) + ' ' + yy(toDisplayWeight(p.v)).toFixed(1)).join(' ')}" fill="none" stroke="var(--a2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  pts.forEach((p, i) => {
    const cx = xx(i).toFixed(1);
    const cy = yy(toDisplayWeight(p.v)).toFixed(1);
    if (i == sel)
      s += html`<circle cx="${cx}" cy="${cy}" r="9" fill="var(--a2)" opacity=".18"/>`;
    s += html`<circle cx="${cx}" cy="${cy}" r="${i == sel ? 5 : 3.6}" fill="${p.pr ? 'var(--a2)' : 'var(--cd)'}" stroke="${p.pr ? 'var(--cd)' : 'var(--a2)'}" stroke-width="2"/>`;
    if (inter)
      s += html`<circle cx="${cx}" cy="${cy}" r="15" fill="transparent" data-a="progressPeriod" data-i="${i}" class="cur-pointer"/>`;
  });
  return html`${raw(s)}</svg>`;
};
export const progressBody = (stat) => {
  const L = progressExercises();
  if (!L.length)
    return '<p class="mu m-8-0-0">Cuando registres pesos verás aquí la evolución de cada ejercicio.</p>';
  if (!stat && !L.includes(progressState.n))
    progressState.n = L[0];
  const n = stat || progressState.n;
  /* un ejercicio que se mide en tiempo o distancia (un arrastre con peso) no tiene 1RM ni volumen: solo su peso máximo */
  const reps = measuredInReps(n);
  const m = !reps ? 'w' : stat ? 'e' : progressState.m;
  const pts = progressSeries(n, m);
  const ML = { e: '1RM estimado', w: 'Peso máximo', v: 'Volumen' };
  let h = '';
  if (!stat) {
    const metric = reps ? segmented('progressMetric', m, [['e', '1RM'], ['w', 'Peso máx.'], ['v', 'Volumen']]).replace('class="seg"', 'class="seg pgm"') : '<p class="mu fs-13 m-0-0-6">Se mide en tiempo o distancia: se ve el peso máximo de cada sesión.</p>';
    h += html`<select data-c="progressExercise" aria-label="Ejercicio" class="m-10-0-8">${L.map((x, i) => html`<option value="${i}"${x == n ? ' selected' : ''}>${x}</option>`)}</select>${raw(metric)}`;
  }
  if (!pts.length)
    return html`${raw(h)}<p class="mu m-10-0-0">Este ejercicio no tiene pesos registrados.</p>`;
  const sel = stat ? pts.length - 1 : (progressState.p >= 0 && progressState.p < pts.length ? progressState.p : pts.length - 1);
  const p = pts[sel];
  h += html`<div class="pgt2"><span><b>${raw(progressFmt(p.v, m))}</b>${raw(p.pr ? ' <em class="pgr">RÉCORD</em>' : '')}</span><small>${raw(ML[m])} · ${fmtDateShort(p.d)}</small></div>${progressChart(pts, m, sel, !stat)}`;
  if (pts.length > 1) {
    const a = pts[0].v;
    const z = pts[pts.length - 1].v;
    const dl = (z - a) / a * 100;
    h += html`<div class="mu pgsum">De ${raw(progressFmt(a, m))} a ${raw(progressFmt(z, m))} · <b class="${dl >= 0 ? 'c-a1' : 'c-inherit'}">${dl >= 0 ? '+' : ''}${Math.round(dl * 10) / 10} %</b>${raw(m != 'v' ? '<br><span class="fs-11_5">Punto relleno = récord personal</span>' : '')}</div>`;
  }
  else
    h += '<div class="mu pgsum">Con una segunda sesión verás la tendencia.</div>';
  return h;
};
const refreshProgress = () => {
  const e = $('#pgc');
  if (e)
    e.innerHTML = progressBody();
};
A.progressPeriod = i => {
  progressState.p = +i;
  refreshProgress();
};
A.progressMetric = (i, b) => {
  progressState.m = ['e', 'w', 'v'].includes(b.dataset.v) ? b.dataset.v : 'e';
  progressState.p = -1;
  refreshProgress();
};
C.progressExercise = e => {
  const L = progressExercises();
  progressState.n = L[+e.value] || progressState.n;
  progressState.p = -1;
  refreshProgress();
};
export const progressCard = () => html`<div class="cd"><b>Progreso por ejercicio</b><div id="pgc" class="pgs">${raw(progressBody())}</div></div>`;
/* cada vez que una sesión mejoró el 1RM estimado de un ejercicio (de los que se miden en repeticiones), de la más reciente a
   la más antigua */
const recordEvents = () => {
  const ev = [];
  Object.keys(S.exerciseHistory || {}).filter(measuredInReps).forEach(n => {
    let b = 0;
    S.exerciseHistory[n].slice().reverse().forEach(x => {
      const top = bestSet(x);
      if (!top)
        return;
      if (b > 0 && top.e > b + 1e-6)
        ev.push({ d: x.d, n, w: top.w, r: top.r, e: top.e, up: top.e - b });
      if (top.e > b)
        b = top.e;
    });
  });
  return ev.sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : b.e - a.e);
};
export const recordsTimeline = () => {
  const ev = recordEvents().slice(0, 8);
  if (!ev.length)
    return '';
  return html`<div class="cd"><b>Línea de récords</b>${ev.map(o => html`<div class="it cols-1fr-auto"><span>${o.n}<br><small>${fmtDateShort(o.d)}</small></span><span class="ta-r"><b>${toDisplayWeight(o.w)} ${weightUnit()} × ${raw(o.r)}</b><br><small>1RM est. ${Math.round(toDisplayWeight(o.e) * 10) / 10} (+${Math.round(toDisplayWeight(o.up) * 10) / 10})</small></span></div>`)}</div>`;
};
