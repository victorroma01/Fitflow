/* ═══ workout/targets ═══
   Unidades, repeticiones objetivo, duración y volumen semanal.
   Define: repClass, unitFromName, unitOf, targetRange, UNIT_HEADS, targetText, unitHead, rirOf, tempoOf, lastHistory, weightStep, roundHalf, fixUnits, newPlanEx, … (+7)  · acciones/registros: 1
*/
import { fmtMinSec, X } from '../core/util.js';
import { C } from '../core/registry.js';
import { groupOf } from '../data/library.js';
import { S, saveState } from '../core/state.js';
import { R } from '../core/render.js';
import { exAll } from '../library/model.js';
import { inSuperset } from './day.js';
import { COMPOUND_RE, restOf } from './rest.js';
import { warmupHtml } from './warmup.js';
const repClass = n => /sentadilla|press banca|peso muerto|press militar|remo con barra|dominadas|fondos|hip thrust|prensa/i.test(n) ? 8 : /curl|extensi|elevaciones|aperturas|pájaros|gemelo|patada|abducci|face pull|crunch|encogimientos|muñeca/i.test(n) ? 12 : 10;
export const unitFromName = n => {
  const m = String(n).match(/(\d+(?:[.,]\d+)?)\s*(km|m)\b/i);
  if (m) {
    const v = +m[1].replace(',', '.') * (m[2].toLowerCase() == 'km' ? 1000 : 1);
    return { u: 'm', rg: [v, v] };
  }
  if (/^(Carrera continua|Rodaje|Trote|Bicicleta|Cinta|Elíptica|Caminata|Remo continuo|Natación)/i.test(n)) {
    const z = /largo/i.test(n) ? 60 : /zona 2|suave/i.test(n) ? 45 : /Tabata|intervalos/i.test(n) ? 20 : 30;
    return { u: 'min', rg: [z, z] };
  }
  if (/Plancha|Hollow hold|Dead hang|Wall sit|Farmers hold/i.test(n))
    return { u: 's', rg: [40, 40] };
  return null;
};
export const unitOf = e => {
  if (e.u)
    return e.u;
  if (e.rg)
    return '';
  const d = unitFromName(e.n);
  return d ? d.u : '';
};
export const targetRange = e => {
  if (e.rg)
    return e.rg;
  const d = unitFromName(e.n);
  if (d)
    return d.rg;
  const t = repClass(e.n);
  return t == 8 ? [6, 10] : t == 12 ? [10, 15] : [8, 12];
};
const UNIT_HEADS = { m: 'Dist.', s: 'Seg', min: 'Min', cal: 'Cal', km: 'Km' };
export const targetText = e => {
  const U = unitOf(e);
  const r = targetRange(e);
  return (r[0] == r[1] ? r[0] : r[0] + '-' + r[1]) + (U ? ' ' + U : ' reps');
};
export const unitHead = e => unitOf(e) ? UNIT_HEADS[unitOf(e)] || 'Reps' : 'Reps';
export const rirOf = e => COMPOUND_RE.test(e.n) ? '1-2' : /Elevaciones|Aperturas|Cruce|Pájaros|Face pull|Extensi|Curl|Patada|Gemelo|Encogim|Crunch/i.test(e.n) ? '0-1' : '1-2';
export const tempoOf = e => {
  if (e.t)
    return e.t;
  if (unitOf(e))
    return '';
  const n = e.n;
  if (/swing|thruster|wall ball|burpee|box jump|snatch|clean|push press|salto/i.test(n))
    return '1/0/X/0';
  if (/Gemelo|Elevaciones laterales|Cruce|Aperturas|Pájaros|Face pull/i.test(n))
    return '2/2/2/0';
  if (COMPOUND_RE.test(n) && !/Hip thrust/i.test(n))
    return '3/0/1/0';
  return '2/0/2/0';
};
export const lastHistory = e => ((S.hist || {})[e.n] || [])[0];
export const weightStep = e => /Sentadilla|Peso muerto|Prensa|Hip thrust|Hack/i.test(e.n) ? 5 : 2.5;
export const roundHalf = x => Math.round(x * 2) / 2;
export const fixUnits = nn => {
  const nd = unitFromName(nn);
  S.plan.forEach(dy => dy.ex.forEach(e => {
    if (!e.o || e.n != nn)
      return;
    if (!e.ou)
      e.ou = { u: e.u, rg: e.rg };
    if (nd) {
      if (e.u != nd.u || nd.u == 'm') {
        e.u = nd.u;
        e.rg = nd.rg;
      }
    }
    else if (e.u) {
      delete e.u;
      delete e.rg;
    }
  }));
  saveState();
};
export const newPlanEx = n => {
  const u = unitFromName(n);
  const o = { n, s: u ? (u.u == 'min' ? 1 : 3) : 3 };
  if (u) {
    o.u = u.u;
    o.rg = u.rg;
  }
  else
    o.rg = targetRange({ n });
  return o;
};
export const dayMinutes = d => {
  if (!d.ex.length)
    return 0;
  let t = 300;
  d.ex.forEach((e, i) => {
    const U = unitOf(e);
    const r = targetRange(e);
    const v = (r[0] + r[1]) / 2;
    const w = U ? (U == 'm' ? (v <= 100 ? 45 : v / 3) : U == 's' ? v : U == 'min' ? v * 60 : v * 3) : v * 3 + 12;
    t += e.s * (w + (inSuperset(i) ? 10 : restOf(e)));
  });
  return Math.max(5, Math.round(t / 300) * 5);
};
const weeklySets = pl => {
  const o = {};
  pl.forEach(d => d.ex.forEach(e => {
    if (unitOf(e))
      return;
    const x = exAll().find(y => y.n == e.n);
    const g = x ? groupOf(x) : 'Otros';
    o[g] = (o[g] || 0) + e.s;
  }));
  return Object.entries(o).sort((a, b) => b[1] - a[1]);
};
export const weeklySetsCard = pl => '<div class="cd" style="margin:8px 0"><b>Series directas por semana</b><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">' + weeklySets(pl).map(o => '<span style="padding:4px 10px;border-radius:12px;background:rgba(128,128,128,.18);font-size:12px">' + X(o[0]) + ' · ' + o[1] + '</span>').join('') + '</div></div>';
export const usesWeight = e => !unitOf(e) || /Sled|Farmers|Sandbag|Carry|chaleco|con peso|con balón|arrastre|Lunges/i.test(e.n);
export const targetLine = (e, i) => {
  const U = unitOf(e);
  const p = [];
  if (e.s > 1)
    p.push('Descanso ' + fmtMinSec(inSuperset(i) ? 10 : restOf(e)));
  if (!U)
    p.push('Tempo ' + tempoOf(e));
  return '<div class="mu">Objetivo: ' + e.s + ' × ' + targetText(e) + (U ? '' : ' · RIR ' + rirOf(e)) + '</div>' + (p.length ? '<div class="mu">' + p.join(' · ') + '</div>' : '') + warmupHtml(e, i);
};
const RANGE_OPTIONS = ['3-5', '5-8', '6-10', '8-10', '8-12', '10-12', '10-15', '12-15', '15-20'];
export const rangeSelect = (e, i) => {
  if (unitOf(e))
    return '';
  const c = targetRange(e).join('-');
  return '<select data-c="rg" data-i="' + i + '" style="width:auto;padding:5px 10px;font-size:13px">' + (RANGE_OPTIONS.includes(c) ? RANGE_OPTIONS : RANGE_OPTIONS.concat([c])).map(v => '<option value="' + v + '"' + (v == c ? ' selected' : '') + '>' + v + ' reps</option>').join('') + '</select>';
};
C.rg = (e, i) => {
  const x = S.plan[S.sel].ex[i];
  if (!x)
    return;
  const r = e.value.split('-').map(Number);
  if (r.length < 2)
    r.push(r[0]);
  x.rg = r;
  saveState();
  R();
};
