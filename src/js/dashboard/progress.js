/* ═══ dashboard/progress ═══
   Gráficas de progreso por ejercicio.
   Define: progressState, dateShort, progressExercises, progressSeries, progressFmt, axisLabel, progressChart, progressBody, refreshProgress, progressCard, recordEvents, recordsTimeline  · acciones/registros: 3
*/
import { $, est1RM, round1, roundInt, X } from '../core/util.js';
import { A, C } from '../core/registry.js';
import { S } from '../core/state.js';
import { segmented } from '../core/ui.js';
import { toDisplayWeight, weightUnit } from '../profile/units.js';
let progressState = { n: '', m: 'e', p: -1 };
const dateShort = d => new Date(d + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' });
const progressExercises = () => Object.keys(S.hist || {}).filter(n => {
  const h = S.hist[n];
  return Array.isArray(h) && h.some(x => x.s.some(y => +y[1] > 0));
}).sort((a, b) => {
  const da = (S.hist[a][0] || {}).d || '';
  const db = (S.hist[b][0] || {}).d || '';
  return da < db ? 1 : da > db ? -1 : 0;
});
const progressSeries = (n, m) => {
  const h = ((S.hist || {})[n] || []).slice().reverse();
  return h.map(x => {
    const ss = x.s.filter(y => y[3] != 1 && +y[1] > 0);
    let v = 0;
    if (m == 'v')
      v = x.s.reduce((a, y) => a + (+y[0] || 0) * (+y[1] || 0), 0);
    else if (ss.length)
      v = Math.max(...ss.map(y => m == 'w' ? +y[1] : est1RM(+y[1], +y[0])));
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
  let s = '<svg viewBox="0 0 ' + W0 + ' ' + H0 + '" role="img" aria-label="Evolución del ejercicio">';
  tk.forEach(v => {
    const y = yy(v);
    s += '<line x1="' + pl + '" x2="' + (W0 - pr) + '" y1="' + y + '" y2="' + y + '" stroke="var(--ln)" stroke-width="1"/><text x="' + (pl - 6) + '" y="' + (y + 3.5) + '" text-anchor="end" class="pga">' + axisLabel(v) + '</text>';
  });
  s += '<text x="' + pl + '" y="' + (H0 - 6) + '" class="pga">' + dateShort(pts[0].d) + '</text>';
  if (pts.length > 1)
    s += '<text x="' + (W0 - pr) + '" y="' + (H0 - 6) + '" text-anchor="end" class="pga">' + dateShort(pts[pts.length - 1].d) + '</text>';
  if (pts.length > 1)
    s += '<path d="' + pts.map((p, i) => (i ? 'L' : 'M') + xx(i).toFixed(1) + ' ' + yy(toDisplayWeight(p.v)).toFixed(1)).join(' ') + '" fill="none" stroke="var(--a2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  pts.forEach((p, i) => {
    const cx = xx(i).toFixed(1);
    const cy = yy(toDisplayWeight(p.v)).toFixed(1);
    if (i == sel)
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="9" fill="var(--a2)" opacity=".18"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (i == sel ? 5 : 3.6) + '" fill="' + (p.pr ? 'var(--a2)' : 'var(--cd)') + '" stroke="' + (p.pr ? 'var(--cd)' : 'var(--a2)') + '" stroke-width="2"/>';
    if (inter)
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="15" fill="transparent" data-a="pgp" data-i="' + i + '" style="cursor:pointer"/>';
  });
  return s + '</svg>';
};
export const progressBody = (stat) => {
  const L = progressExercises();
  if (!L.length)
    return '<p class="mu" style="margin:8px 0 0">Cuando registres pesos verás aquí la evolución de cada ejercicio.</p>';
  if (!stat && !L.includes(progressState.n))
    progressState.n = L[0];
  const n = stat || progressState.n;
  const m = stat ? 'e' : progressState.m;
  const pts = progressSeries(n, m);
  const ML = { e: '1RM estimado', w: 'Peso máximo', v: 'Volumen' };
  let h = '';
  if (!stat) {
    h += '<select data-c="pgn" aria-label="Ejercicio" style="margin:10px 0 8px">' + L.map((x, i) => '<option value="' + i + '"' + (x == n ? ' selected' : '') + '>' + X(x) + '</option>').join('') + '</select>'
      + segmented('pgm', m, [['e', '1RM'], ['w', 'Peso máx.'], ['v', 'Volumen']]).replace('class="seg"', 'class="seg pgm"');
  }
  if (!pts.length)
    return h + '<p class="mu" style="margin:10px 0 0">Este ejercicio no tiene pesos registrados.</p>';
  const sel = stat ? pts.length - 1 : (progressState.p >= 0 && progressState.p < pts.length ? progressState.p : pts.length - 1);
  const p = pts[sel];
  h += '<div class="pgt2"><span><b>' + progressFmt(p.v, m) + '</b>' + (p.pr ? ' <em class="pgr">RÉCORD</em>' : '') + '</span><small>' + ML[m] + ' · ' + dateShort(p.d) + '</small></div>' + progressChart(pts, m, sel, !stat);
  if (pts.length > 1) {
    const a = pts[0].v;
    const z = pts[pts.length - 1].v;
    const dl = (z - a) / a * 100;
    h += '<div class="mu pgsum">De ' + progressFmt(a, m) + ' a ' + progressFmt(z, m) + ' · <b style="color:' + (dl >= 0 ? 'var(--a1)' : 'inherit') + '">' + (dl >= 0 ? '+' : '') + (Math.round(dl * 10) / 10) + ' %</b>' + (m != 'v' ? '<br><span style="font-size:11.5px">Punto relleno = récord personal</span>' : '') + '</div>';
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
A.pgp = i => {
  progressState.p = +i;
  refreshProgress();
};
A.pgm = (i, b) => {
  progressState.m = ['e', 'w', 'v'].includes(b.dataset.v) ? b.dataset.v : 'e';
  progressState.p = -1;
  refreshProgress();
};
C.pgn = e => {
  const L = progressExercises();
  progressState.n = L[+e.value] || progressState.n;
  progressState.p = -1;
  refreshProgress();
};
export const progressCard = () => '<div class="cd"><b>Progreso por ejercicio</b><div id="pgc" class="pgs">' + progressBody() + '</div></div>';
const recordEvents = () => {
  const ev = [];
  Object.keys(S.hist || {}).forEach(n => {
    let b = 0;
    S.hist[n].slice().reverse().forEach(x => {
      const ss = x.s.filter(y => y[3] != 1 && +y[1] > 0);
      if (!ss.length)
        return;
      const top = ss.reduce((a, y) => est1RM(+y[1], +y[0]) > est1RM(+a[1], +a[0]) ? y : a);
      const m = est1RM(+top[1], +top[0]);
      if (b > 0 && m > b + 1e-6)
        ev.push({ d: x.d, n, w: +top[1], r: +top[0], e: m, up: m - b });
      if (m > b)
        b = m;
    });
  });
  return ev.sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : b.e - a.e);
};
export const recordsTimeline = () => {
  const ev = recordEvents().slice(0, 8);
  if (!ev.length)
    return '';
  return '<div class="cd"><b>Línea de récords</b>' + ev.map(o => '<div class="it" style="grid-template-columns:1fr auto"><span>' + X(o.n) + '<br><small>' + dateShort(o.d) + '</small></span><span style="text-align:right"><b>' + toDisplayWeight(o.w) + ' ' + weightUnit() + ' × ' + o.r + '</b><br><small>1RM est. ' + (Math.round(toDisplayWeight(o.e) * 10) / 10) + ' (+' + (Math.round(toDisplayWeight(o.up) * 10) / 10) + ')</small></span></div>').join('') + '</div>';
};
