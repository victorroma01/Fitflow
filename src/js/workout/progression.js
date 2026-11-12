/* ═══ workout/progression ═══
   Sugerencias de progresión y autorrelleno de series.
   Define: EXTRA_ROW, setText, stepUp, deloadWeight, prefillSets, suggestAfter, progressionOf, suggestionBox, lastTimeLine  · acciones/registros: 1
*/
import { A } from '../core/registry.js';
import { S, W } from '../core/state.js';
import { R } from '../core/render.js';
import { lastHistory, pyramidReps, roundHalf, targetRange, unitOf, weightStep } from './targets.js';
import { dropWeight } from './technique.js';
import { isDeloadWeek } from './deload.js';
import { fromDisplayWeight, toDisplayWeight, usesLb, weightUnit } from '../profile/units.js';
import { html, raw } from '../core/html.js';
/* filas extra de una técnica en el historial (s[3]): 1 drop set, 2 rest-pause */
const EXTRA_ROW = { 1: ' (drop)', 2: ' (rest-pause)' };
export const setText = (e, s) => {
  const U = unitOf(e);
  const w = toDisplayWeight(s[1]);
  const x = (EXTRA_ROW[s[3]] || '') + (+s[2] > 0 ? ' @' + s[2] : '');
  return U ? s[0] + ' ' + U + (s[1] > 0 ? ' · ' + w + ' ' + weightUnit() : '') + x : s[0] + ' × ' + w + ' ' + weightUnit() + x;
};
/** Peso un escalón más alto (2,5 kg, o 5 en los básicos de pierna; 5 o 10 lb). */
const stepUp = (w, e) => usesLb() ? fromDisplayWeight(Math.round((toDisplayWeight(w) + (weightStep(e) == 5 ? 10 : 5)) / 2.5) * 2.5) : roundHalf(w + weightStep(e));
/** Peso de la semana de descarga: el 65 % del normal, redondeado a lo que se puede cargar (2,5 kg o 5 lb). */
const deloadWeight = w => usesLb() ? fromDisplayWeight(Math.max(5, Math.round(toDisplayWeight(w) * .65 / 5) * 5)) : Math.max(1, Math.round(w * .65 / 2.5) * 2.5);
/** Repeticiones y peso de cada serie según la última vez, la progresión, la técnica (pirámide, myo-reps) y la semana de
    descarga (65 % del peso y 2 repeticiones menos, mismas series). Las filas extra (drop set, rest-pause) siguen a su serie. */
export function prefillSets(e, a) {
  const h = lastHistory(e);
  const hs = h ? h.s.filter(x => !x[3]) : [];
  const U = unitOf(e);
  const [lo, hi] = targetRange(e);
  const P = progressionOf(e);
  const dl = !!(W && W.deload);
  const main = a.filter(q => !q.t);
  const t = dl ? '' : (e.tk || '').split('+')[0];
  const pyr = t == 'PIR' && !U ? pyramidReps([lo, hi], main.length) : null;
  /* pirámide: si la última vez salieron todas las repeticiones de cada serie, sube el peso de cada una */
  const up = !!pyr && hs.length >= pyr.length && pyr.every((r, k) => hs[k][0] >= r && hs[k][1] > 0);
  main.forEach((q, j) => {
    if (q.ok)
      return;
    const l = hs.length ? hs[Math.min(j, hs.length - 1)] : null;
    let r = lo;
    let w = q.w;
    if (U) {
      r = hi;
      if (l && l[1] > 0)
        w = l[1];
    }
    else if (pyr) {
      r = pyr[j];
      if (l && l[1] > 0)
        w = up ? stepUp(l[1], e) : l[1];
    }
    else if (P) {
      if (P.nw > 0)
        w = P.nw;
      r = P.up || P.dn ? lo : Math.min(hi, (+l[0] || lo - 1) + 1);
    }
    else if (l && l[1] > 0)
      w = l[1];
    if (t == 'MYO' && j > 0)
      r = 4;
    if (dl) {
      if (!U)
        r = Math.max(1, r - 2);
      if (+w > 0)
        w = deloadWeight(+w);
    }
    q.r = r;
    q.w = w;
    /* lo que propone la app es una sugerencia (F-10): se ve en gris hasta que se escribe o se hace la serie */
    q.ws = +w > 0 ? 1 : 0;
  });
  a.forEach((q, j) => {
    const p = a[j - 1];
    if (!q.t || q.ok || !p)
      return;
    if (q.t == 1) {
      q.r = p.r;
      if (+p.w > 0)
        q.w = dropWeight(+p.w);
    }
    else {
      q.r = Math.max(2, Math.round(p.r / 3));
      q.w = p.w;
    }
    q.ws = +q.w > 0 ? 1 : 0;
  });
}
/** Peso sugerido (F-10): el peso escrito en la fila `j` pasa como sugerencia a las filas siguientes que no estén hechas ni
    escritas a mano. En una pirámide, un escalón más en cada serie; en el drop set, un 25 % menos; en el rest-pause, el mismo.
    Una serie ya hecha o escrita a mano manda en las que vienen detrás. */
export const suggestAfter = (e, a, j) => {
  let m = +a[j].w || 0;
  if (!(m > 0) || a[j].t)
    return;
  const pyr = /^PIR/.test(e.tk || '') && !(W && W.deload);
  for (let k = j + 1; k < a.length; k++) {
    const q = a[k];
    const own = q.ok || (+q.w > 0 && !q.ws);
    if (!q.t) {
      const nw = pyr ? stepUp(m, e) : m;
      m = own ? +q.w || nw : nw;
    }
    if (own)
      continue;
    q.w = q.t == 1 ? dropWeight(m) : m;
    q.ws = 1;
  }
};
function progressionOf(e) {
  const h = lastHistory(e);
  if (!h || !h.s.length || unitOf(e))
    return null;
  const ss = h.s.filter(x => !x[3]);
  if (!ss.length)
    return null;
  const r = targetRange(e);
  const lo = r[0];
  const hi = r[1];
  const w = Math.max(...ss.map(x => +x[1] || 0));
  const rp = ss.map(x => +x[2] || 0).filter(x => x > 0);
  const ra = rp.length ? rp.reduce((a, b) => a + b, 0) / rp.length : 0;
  const full = w > 0 && ss.every(x => x[0] >= hi && x[1] > 0);
  const low = !full && w > 0 && ss.every(x => x[0] < lo && x[1] > 0);
  const dl = W ? !!W.deload : isDeloadWeek(S.week);
  let up = full;
  let dn = low;
  let why = '';
  if (up && ra >= 9.5) {
    up = false;
    why = 'rpe';
  }
  if (dl) {
    up = false;
    dn = false;
    why = 'dl';
  }
  const nw = up ? stepUp(w, e) : !dn ? w : usesLb() ? fromDisplayWeight(Math.round(toDisplayWeight(w) * .92 / 5) * 5) : roundHalf(w * .92);
  return { lo, hi, w, up, dn, nw, ra, why, r: +ss[0][0] || 0 };
}
const suggestionBox = (e, i, P) => {
  if (!W || !W.sets[i])
    return '';
  const u = weightUnit();
  const dif = W.sets[i].some(s => !s.ok && !s.t) && P && W.sets[i].some(s => !s.ok && !s.t && Math.abs((+s.w || 0) - (W.deload ? deloadWeight(P.nw) : P.nw)) > 1e-6);
  const ap = dif ? html`<button class="chip" data-a="applySuggestion" data-i="${i}">Aplicar</button>` : '';
  /* semana de descarga: lo de esta semana y, entre paréntesis, lo normal */
  if (W.deload) {
    if (!P || unitOf(e))
      return html`<div class="sgb dlsg"><span><b>Descarga</b> · peso al 65 % y 2 repeticiones menos en cada serie</span></div>`;
    const r = P.up || P.dn ? P.lo : Math.min(P.hi, (P.r || P.lo - 1) + 1);
    return html`<div class="sgb dlsg"><span><b>Descarga</b> · ${raw(toDisplayWeight(deloadWeight(P.nw)) + ' ' + u + ' × ' + Math.max(1, r - 2))} en cada serie (normal: ${raw(toDisplayWeight(P.nw) + ' ' + u + ' × ' + r)})</span>${ap}</div>`;
  }
  if (!P)
    return '';
  const wv = toDisplayWeight(P.w);
  const nv = toDisplayWeight(P.nw);
  let t;
  if (P.up)
    t = 'sube a ' + nv + ' ' + u + ' (hiciste ' + P.hi + ' reps en todas)';
  else if (P.dn)
    t = 'baja a ' + nv + ' ' + u + ' (no llegaste a ' + P.lo + ' reps)';
  else if (P.why == 'rpe')
    t = 'mantén ' + wv + ' ' + u + ' (RPE ' + (Math.round(P.ra * 10) / 10) + ' la última vez)';
  else
    t = 'mantén ' + wv + ' ' + u + ' y busca 1 rep más hasta ' + P.hi;
  /* pirámide: cada serie lleva su peso (sube en cada una) */
  if (/^PIR/.test(e.tk || ''))
    t = 'pirámide: sube el peso en cada serie' + (W.sets[i].some(s => !s.t && +s.w > 0) ? '' : ' (empieza con uno que te permita 12 repeticiones)');
  return html`<div class="sgb"><span><b>Sugerido</b> · ${raw(t)}</span>${/^PIR/.test(e.tk || '') ? '' : ap}</div>`;
};
A.applySuggestion = i => {
  const e = S.plan[S.selectedDay].ex[i];
  if (!e || !W.sets[i])
    return;
  prefillSets(e, W.sets[i]);
  R();
};
export const lastTimeLine = (e, i) => {
  const h = lastHistory(e);
  if (!h || !h.s.length)
    return '';
  const U = unitOf(e);
  const P = progressionOf(e);
  return html`<div class="mu fs-12">Última vez: ${raw(h.s.map(x => U ? x[0] + ' ' + U : x[0] + '×' + (x[1] ? toDisplayWeight(x[1]) : '–') + (EXTRA_ROW[x[3]] || '')).join(' · '))}</div>${suggestionBox(e, i, P)}`;
};
