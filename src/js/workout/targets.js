/* ═══ workout/targets ═══
   Unidades, repeticiones objetivo, duración y volumen semanal.
   Define: repClass, unitOf, targetRange, UNIT_HEADS, AMRAP, setReps, isAmrap, amrapSet, repsText, targetText, unitHead, UNIT_NAMES, unitName, rirOf, tempoOf, MAX_SETS, lastHistory, weightStep, fixUnits, newPlanEx, dayMinutes, weeklySets, weeklySetsCard, usesWeight, pyramidReps, TECH_TAIL, planLine, together, thenDot, targetLine, RANGE_OPTIONS, rangeSelect  · acciones/registros: 1
*/
import { say, tr } from '../core/i18n.js';
import { fmtMinSec } from '../core/util.js';
import { unitFromName } from '../core/calc.js';
import { C } from '../core/registry.js';
import { groupOf } from '../data/library.js';
import { S, saveState, W } from '../core/state.js';
import { R } from '../core/render.js';
import { exByName } from '../library/model.js';
import { inSuperset } from './day.js';
import { blockEnd, COMPOUND_RE, restAt } from './rest.js';
import { warmupHtml } from './warmup.js';
import { html, raw } from '../core/html.js';
import { isCycle } from './week.js';
const repClass = n => /sentadilla|press banca|peso muerto|press militar|remo con barra|dominadas|fondos|hip thrust|prensa/i.test(n) ? 8 : /curl|extensi|elevaciones|aperturas|pájaros|gemelo|patada|abducci|face pull|crunch|encogimientos|muñeca/i.test(n) ? 12 : 10;
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
/** Una serie sin número fijo de repeticiones: las máximas posibles (entrenos a la carta). Se escribe igual en inglés. */
export const AMRAP = 'AMRAP';
/** Las repeticiones de cada una de las series de un ejercicio que las trae de su rutina (rs: entrenos a la carta,
    routines/ondemand), una por serie: un número o AMRAP. null si no las trae, si va en tiempo o distancia o si son todas el
    mismo número: entonces manda su rango (rg), como en cualquier otro ejercicio. */
export const setReps = e => {
  if (!Array.isArray(e.rs) || !e.rs.length || unitOf(e))
    return null;
  const a = Array.from({ length: Math.max(1, e.s) }, (_, j) => e.rs[Math.min(j, e.rs.length - 1)]);
  return a.every(x => x === a[0]) && a[0] != AMRAP ? null : a;
};
/** ¿Es AMRAP la serie `j` del ejercicio `e`? (las que se añaden de más, como la última) */
const isAmrap = (e, j) => !unitOf(e) && Array.isArray(e.rs) && e.rs.length > 0 && e.rs[Math.min(j, e.rs.length - 1)] == AMRAP;
/** ¿Va en AMRAP la fila `s` (la `j`) del ejercicio `e` en el entreno? Las AMRAP de su rutina en un entreno a la carta
    (isAmrap) y, desde la 1.0.4.1, en un programa, las filas extra de una técnica (workout/technique), que llegan al fallo: la
    bajada de un drop set (D) y el bloque de un rest-pause (+). La serie de antes sale con sus repeticiones, como las demás.
    Sin un número: se apuntan las que salgan. En la semana de descarga no hay técnicas, así que ninguna de estas. */
export const amrapSet = (e, s, j) => isAmrap(e, j) || !unitOf(e) && !!s && !!s.t;
/* «12/10/8/6 reps»; si todas son AMRAP, «AMRAP» */
const repsText = p => p.every(x => x == AMRAP) ? AMRAP : p.join('/') + ' reps';
export const targetText = e => {
  const p = setReps(e);
  if (p)
    return repsText(p);
  const U = unitOf(e);
  const r = targetRange(e);
  return (r[0] == r[1] ? r[0] : r[0] + '-' + r[1]) + (U ? ' ' + U : ' reps');
};
export const unitHead = e => unitOf(e) ? UNIT_HEADS[unitOf(e)] || 'Reps' : 'Reps';
/* nombre completo de lo que se anota en cada serie, para los lectores de pantalla (la cabecera de la tabla va abreviada) */
const UNIT_NAMES = { m: 'Metros', s: 'Segundos', min: 'Minutos', cal: 'Calorías', km: 'Kilómetros' };
export const unitName = e => UNIT_NAMES[unitOf(e)] || 'Repeticiones';
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
/** Series que admite un ejercicio, como mucho (en un día del plan y en un workout propio). */
export const MAX_SETS = 20;
export const lastHistory = e => ((S.exerciseHistory || {})[e.n] || [])[0];
export const weightStep = e => /Sentadilla|Peso muerto|Prensa|Hip thrust|Hack/i.test(e.n) ? 5 : 2.5;
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
  /** @type {PlanExercise} */
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
    /* con repeticiones distintas en cada serie, su media; una AMRAP, como las de su rango */
    const p = setReps(e);
    const v = p ? p.reduce((s, x) => s + (x == AMRAP ? (r[0] + r[1]) / 2 : +x), 0) / p.length : (r[0] + r[1]) / 2;
    const w = U ? (U == 'm' ? (v <= 100 ? 45 : v / 3) : U == 's' ? v : U == 'min' ? v * 60 : v * 3) : v * 3 + 12;
    t += e.s * (w + restAt(d, i));
  });
  return Math.max(5, Math.round(t / 300) * 5);
};
const weeklySets = pl => {
  const o = {};
  pl.forEach(d => d.ex.forEach(e => {
    if (unitOf(e))
      return;
    const x = exByName(e.n);
    const g = x ? groupOf(x) : 'Otros';
    o[g] = (o[g] || 0) + e.s;
  }));
  /* en un ciclo de otra longitud que la semana (workout/week), la media por semana */
  const f = pl.length ? 7 / pl.length : 1;
  return Object.entries(o).map(([g, n]) => /** @type {[string, number]} */ ([g, Math.round(n * f)])).sort((a, b) => b[1] - a[1]);
};
export const weeklySetsCard = pl => html`
  <div class="card m-8-0">
    <b>Series directas por semana${isCycle(pl) ? ' (media del ciclo)' : ''}</b>
    <div class="d-flex wrap gap-6 mt-8">
      ${weeklySets(pl).map(o => html`<span class="p-4-10 r-12 bg-gray-18 fs-12">${o[0]} · ${raw(o[1])}</span>`)}
    </div>
  </div>`;
export const usesWeight = e => !unitOf(e) || /Sled|Farmers|Sandbag|Carry|chaleco|con peso|con balón|arrastre|Lunges/i.test(e.n);
/** Repeticiones de cada serie de una pirámide: del tope del rango al mínimo (12, 10, 8, 6 con un rango de 6-12). */
export const pyramidReps = (rg, n) => Array.from({ length: n }, (_, j) => n < 2 ? rg[1] : Math.round(rg[1] - (rg[1] - rg[0]) * j / (n - 1)));
const TECH_TAIL = { DS: ' + drop set', RP: ' + rest-pause', PAR: ' + parciales' };
/** Series y objetivo de un ejercicio del plan con su técnica (F-02): «4 × 12/10/8/6 reps + drop set», «12-15 reps + 3 mini
    series de 3-5», «4 × 5-8 reps en bloques de 2-3»… */
export const planLine = e => {
  const [a, f] = (unitOf(e) ? '' : e.tk || '').split('+');
  if (a == 'PIR')
    return say `${e.s} × ${pyramidReps(targetRange(e), e.s).join('/')} reps${TECH_TAIL[f] || ''}`;
  if (a == 'MYO' && e.s > 1)
    return say `${targetText(e)} + ${e.s - 1} mini series de 3-5`;
  if (a == 'CL')
    return say `${e.s} × ${targetText(e)} en bloques de 2-3`;
  return e.s + ' × ' + targetText(e) + tr(TECH_TAIL[a] || '');
};
/* un dato con su nombre («RIR 1-2», «Descanso 3:00»), que no se parte entre dos líneas. Con dot, lleva pegado el punto que
   lo separa del siguiente: si la línea se parte ahí, el punto se queda al final de la primera y no al principio de la otra */
const together = (t, dot) => html`<span class="ws-nowrap">${t}${dot ? ' ·' : ''}</span>${dot ? ' ' : ''}`;
/* un texto que sí puede partirse, seguido de otro dato: el punto va pegado a su última palabra */
const thenDot = t => {
  const k = t.lastIndexOf(' ') + 1;
  return html`${t.slice(0, k)}${together(t.slice(k), 1)}`;
};
export const targetLine = (e, i) => {
  const U = unitOf(e);
  const dl = !!(W && W.deload);
  /* la segunda línea: el descanso y el tempo, cada uno en una pieza que no se parte. En una superserie, una triserie o un
     circuito el descanso no se dice aquí (son 10 s hasta el siguiente ejercicio y, al acabar la ronda, el suyo): va en cada
     serie, en la columna «Desc.» */
  const p = [];
  if (e.s > 1 && !inSuperset(i) && !blockEnd(S.plan[S.selectedDay], i))
    p.push(say `Descanso ${fmtMinSec(restAt(S.plan[S.selectedDay], i))}`);
  if (!U)
    p.push(say `Tempo ${tempoOf(e)}`);
  /* en la semana de descarga, 2 repeticiones menos (una AMRAP sigue siendo AMRAP), sin técnica y lejos del fallo */
  const [a, b] = targetRange(e).map(x => Math.max(1, x - 2));
  const ps = setReps(e);
  const low = ps ? e.s + ' × ' + repsText(ps.map(x => x == AMRAP ? x : Math.max(1, +x - 2))) : say `${e.s} × ${a == b ? a : a + '-' + b} reps`;
  /* un entreno a la carta no lleva RIR: su rutina no lo da, y una serie AMRAP llega al fallo */
  const od = !!S.plan[S.selectedDay].od;
  const ob = U ? planLine(e) : od ? (dl ? low : planLine(e)) : dl ? html`${thenDot(low)}${together('RIR 3-4')}` : html`
    ${thenDot(planLine(e))}
    ${together('RIR ' + rirOf(e))}`;
  return html`
    <div class="muted">Objetivo: ${ob}</div>
    ${p.length ? html`<div class="muted">${p.map((t, k) => together(t, k < p.length - 1))}</div>` : ''}
    ${raw(warmupHtml(e, i))}`;
};
const RANGE_OPTIONS = ['3-5', '5-8', '6-10', '8-10', '8-12', '10-12', '10-15', '12-15', '15-20'];
export const rangeSelect = (e, i) => {
  if (unitOf(e))
    return '';
  const c = targetRange(e).join('-');
  return html`
    <select data-c="setRepRange" data-i="${i}" aria-label="${say `Repeticiones objetivo, ${e.n}`}" class="w-auto p-5-10 fs-13">
      ${(RANGE_OPTIONS.includes(c) ? RANGE_OPTIONS : RANGE_OPTIONS.concat([c])).map(v => html`<option value="${v}"${v == c ? ' selected' : ''}>${raw(v)} reps</option>`)}
    </select>`;
};
C.setRepRange = (e, i) => {
  const x = S.plan[S.selectedDay].ex[i];
  if (!x)
    return;
  const r = e.value.split('-').map(Number);
  if (r.length < 2)
    r.push(r[0]);
  x.rg = r;
  /* el rango elegido manda sobre las repeticiones de cada serie que traía de su rutina */
  delete x.rs;
  saveState();
  R();
};
