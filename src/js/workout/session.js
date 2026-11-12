/* ═══ workout/session ═══
   Sesión activa: series, siguiente, pausa, esfuerzo (RPE), descanso y flechas.
   Define: foldPassed, sessionHeader, setRow, restRunning, exerciseHead, exerciseTools2, exerciseSection, sessionFooter, sessionView, scrollToCurrent, nextSet, restEnded, setToggle, setName, setNo, foldButton, foldSummary, anLiveOn, exThumb, restPill, rpeRow, avgEffort, nextUpBar, blockArrowLive, setLabelButton, blockHeader  · acciones/registros: 18
*/
import { $, clampNum, fmtDuration, fmtMinSec, round1, roundInt, typedNum, X } from '../core/util.js';
import { toast } from '../core/toast.js';
import { A, C } from '../core/registry.js';
import { S, setOverviewMode, setW, W } from '../core/state.js';
import { icon } from '../core/icons.js';
import { dialog, sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { exBadge } from '../library/photo.js';
import { restorePlanBackup } from '../routines/builder.js';
import { blockBadge, dayBlocks, exToolsHtml } from './day.js';
import { targetLine, targetText, unitHead, unitName, unitOf, usesWeight } from './targets.js';
import { lastTimeLine, prefillSets, setText, suggestAfter } from './progression.js';
import { usesBarbell } from './plates.js';
import { deloadStrip, isDeloadWeek } from './deload.js';
import { dropWeight, restAfterSet, setLabel, setTechnique, withTechnique } from './technique.js';
import { currentSet, setOrder } from './order.js';
import { TECHNIQUES } from '../data/techniques.js';
import { progressBody } from '../dashboard/progress.js';
import { fromDisplayWeight, toDisplayWeight, weightUnit } from '../profile/units.js';
import { buzz } from '../profile/feedback.js';
import { exAnatomy } from '../extras/anatomy.js';
import { rpeOn } from './rpe.js';
import { html, raw } from '../core/html.js';
/* al pasar a otro ejercicio, el que toca se despliega y el anterior, si ya está completo, se pliega */
const foldPassed = current => {
  if (!current || W.lastCurrent === current[0])
    return;
  const previous = W.lastCurrent;
  W.lastCurrent = current[0];
  W.folded = W.folded || {};
  delete W.folded[current[0]];
  if (previous != null && previous !== current[0] && W.sets[previous] && W.sets[previous].length && W.sets[previous].every(s => s.ok))
    W.folded[previous] = 1;
};
/* la cabecera que se queda arriba: cronómetro, serie en curso y descanso (o pausa), la barra de progreso y lo que viene */
const sessionHeader = (day, current, done, total) => {
  const elapsed = roundInt(((W.pausedAt || Date.now()) - W.startedAt) / 1000);
  return html`<div class="wsk"><div class="hd"><b class="fs-22" id="tm">${raw(fmtDuration(elapsed))}</b><span>Serie ${Math.min(done + 1, total)}/${total}</span><span class="mu minw-60 ta-r">${W.pausedAt ? 'En pausa' : restPill()}</span></div><div class="bar h-5 m-10-0"><i class="bg-a2" data-style="width:${done / total * 100}%"></i></div>${raw(nextUpBar(day, current))}</div>`;
};
/* la fila de una serie: número, etiqueta de la técnica, repeticiones, peso (o un guion si el ejercicio no lleva), descanso y «hecha» */
const setRow = (exercise, exIndex, set, setIndex, isCurrent) => {
  const name = setName(setIndex, set, exercise);
  const weightInput = html`<input type="number" inputmode="decimal" data-c="setWeight" data-i="${exIndex}" data-j="${setIndex}" value="${set.w ? toDisplayWeight(set.w) : ''}" placeholder="${weightUnit()}"${raw(set.ws && !set.ok ? (W.deload ? ' class="dlv"' : ' class="sug"') : '')} aria-label="${'Peso' + (set.ws && !set.ok ? ' sugerido' : '') + ', ' + name}">`;
  const rest = restAfterSet(exIndex, setIndex);
  return html`<div class="r2${isCurrent ? ' cur' : ''}"><span>${raw(setNo(W.sets[exIndex], setIndex))}</span>${raw(setLabelButton(set))}<input type="number" inputmode="decimal" data-c="setReps" data-i="${exIndex}" data-j="${setIndex}" value="${set.r}"${raw(W.deload && !set.ok ? ' class="dlv"' : '')} aria-label="${unitName(exercise) + ', ' + name}">${raw(!usesWeight(exercise) ? '<span class="mu ta-c">–</span>' : weightInput)}<span class="fs-13">${raw(rest ? fmtMinSec(rest) : '–')}</span><button class="ck ${set.ok ? 'on' : ''}" data-a="toggleSetDone" data-i="${exIndex}" data-j="${setIndex}" aria-label="${'Hecha, ' + name}" aria-pressed="${set.ok ? 'true' : 'false'}">✓</button></div>`;
};
/* el descanso en marcha, bajo la serie que lo lanzó: −15 s, la cuenta atrás con «Saltar» y +15 s */
const restRunning = (exIndex, setIndex) => W.restEndsAt && W.restAfter && W.restAfter[0] == exIndex && W.restAfter[1] == setIndex ? html`<div class="rr"><button data-a="adjustRest" data-i="-15">−15s</button><span>Descanso<br><b id="rt">${raw(fmtMinSec(Math.max(0, Math.ceil((W.restEndsAt - Date.now()) / 1000))))}</b><br><small data-a="adjustRest" data-i="0" role="button" tabindex="0" class="cur-pointer td-u">Saltar</small></span><button data-a="adjustRest" data-i="15">+15s</button></div>` : '';
/* la cabecera de un ejercicio: foto o figura, nombre, objetivo, la última vez y, si se cambió con Swap, desde cuál */
const exerciseHead = (exercise, exIndex) => html`<div class="xh">${exThumb(exercise.n, exIndex)}<div class="minw-0"><b class="fs-18">${exercise.n}</b>${targetLine(exercise, exIndex)}${lastTimeLine(exercise, exIndex)}${exercise.o ? html`<div class="mu fs-12">Cambiado desde: ${exercise.o} · <u data-a="swapUndo" data-i="${exIndex}" role="button" tabindex="0" class="cur-pointer">Deshacer</u></div>` : ''}</div>${foldButton(exIndex)}</div>`;
/* la segunda fila de herramientas: Historial, Swap y, con barra, Discos */
const exerciseTools2 = (exercise, exIndex) => html`<div class="xtl"><button class="chip" data-a="exerciseHistory" data-i="${exIndex}">Historial</button><button class="chip" data-a="openSwap" data-i="${exIndex}">${icon('swp', 15)} Swap</button>${usesBarbell(exercise.n) ? html`<button class="chip ic" data-a="openPlates" data-i="${exIndex}" aria-label="${'Discos, ' + exercise.n}">${icon('plate', 18)}</button>` : ''}</div>`;
/* un ejercicio del entreno: su bloque (superserie…), cabecera, herramientas, las series con su descanso y RPE, y ± serie.
   blockOf[i] = [bloque, si es el primero del bloque] */
const exerciseSection = (day, blocks, blockOf, exercise, exIndex, current) => {
  const sets = W.sets[exIndex];
  const rows = sets.map((set, setIndex) => html`${setRow(exercise, exIndex, set, setIndex, current && current[0] == exIndex && current[1] == setIndex)}${restRunning(exIndex, setIndex)}${rpeRow(exIndex, setIndex, set)}`);
  return html`<div class="xs${W.folded && W.folded[exIndex] ? ' fd' : ''}${sets.length && sets.every(s => s.ok) ? ' dn' : ''}" id="ex${exIndex}">${blockOf[exIndex][1] ? blockHeader(blocks, blockOf[exIndex][0], current) : ''}${blockBadge(day.ex, exIndex)}${exerciseHead(exercise, exIndex)}${foldSummary(exercise, exIndex)}${exToolsHtml(exercise, exIndex)}${exerciseTools2(exercise, exIndex)}<div class="thd"><span>Set</span><span></span><span>${raw(unitHead(exercise))}</span><span>${usesWeight(exercise) ? 'Peso' : ''}</span><span>Desc.</span><span>Log</span></div>${rows}<div class="g2 mt-8"><button data-a="removeSet" data-i="${exIndex}">− Serie</button><button data-a="addSet" data-i="${exIndex}">+ Serie</button></div></div>`;
};
/* al final, «Salir y descartar» y «Log out»; abajo, pegada al borde, la barra de serie anterior, pausa y siguiente */
const sessionFooter = () => html`<div class="g2 m-16-0-84"><button data-a="discardAsk" class="bg-xd4d4da c-x111 bd-0 p-15 r-16 fs-15">Salir y descartar</button><button data-a="finishAsk" class="bg-xfff c-x111 bd-0 p-15 r-16 fs-16 fw-700">Log out</button></div><div class="pb"><button data-a="previousSet" aria-label="Serie anterior">${icon('prv', 26)}</button><button data-a="togglePause" aria-label="${W.pausedAt ? 'Reanudar' : 'Pausar'}">${icon(W.pausedAt ? 'ply' : 'pau', 30)}</button><button data-a="goToNextSet" aria-label="Siguiente serie">${icon('nxt', 26)}</button></div>`;
/** La pantalla del entreno en curso. */
export function sessionView() {
  const day = S.plan[S.selectedDay];
  const blocks = dayBlocks(day);
  const blockOf = {};
  blocks.forEach((block, b) => block.x.forEach(i => blockOf[i] = [b, block.x[0] == i]));
  let total = 0;
  let done = 0;
  W.sets.forEach(sets => sets.forEach(set => {
    total++;
    if (set.ok)
      done++;
  }));
  /* la serie que toca, en el orden del entreno (por rondas en las superseries: workout/order) */
  const current = currentSet();
  foldPassed(current);
  return html`${sessionHeader(day, current, done, total)}${raw(W.deload ? deloadStrip() : '')}${day.ex.map((exercise, exIndex) => exerciseSection(day, blocks, blockOf, exercise, exIndex, current))}${sessionFooter()}`;
}
A.exerciseHistory = i => {
  const E = S.plan[S.selectedDay].ex[i];
  const n = E.n;
  const h = (S.exerciseHistory || {})[n] || [];
  const all = h.flatMap(x => x.s);
  const bw = all.length ? Math.max(...all.map(s => s[1])) : 0;
  const rm = all.length ? Math.max(...all.map(s => s[1] * (1 + s[0] / 30))) : 0;
  sheet(html`<h3>${n}</h3>${raw(h.length ? (bw && !unitOf(E) ? html`<div class="g2"><div class="cd"><small>Mejor peso</small><br><b class="fs-20">${toDisplayWeight(bw)} ${weightUnit()}</b></div><div class="cd"><small>1RM estimado</small><br><b class="fs-20">${round1(toDisplayWeight(rm))} ${weightUnit()}</b></div></div>` : '') + (h.length > 1 && !unitOf(E) ? html`<div class="pgs">${raw(progressBody(n))}</div>` : '') + h.slice(0, 12).map(x => html`<div class="it cols-1fr"><b>${raw(x.d)}</b><small>${raw(x.s.map(s => setText(E, s)).join(' · '))}</small></div>`).join('') : '<p class="mu">Aún no hay registros de este ejercicio. Se guardan al pulsar Log out.</p>')}`);
};
A.togglePause = () => {
  if (W.pausedAt) {
    const g = Date.now() - W.pausedAt;
    W.startedAt += g;
    if (W.restEndsAt)
      W.restEndsAt += g;
    W.pausedAt = 0;
  }
  else
    W.pausedAt = Date.now();
  R();
};
const scrollToCurrent = () => {
  const e = $('.r2.cur');
  e && e.scrollIntoView({ behavior: 'smooth', block: 'center' });
};
const nextSet = () => {
  const c = currentSet();
  if (!c) {
    A.finishAsk();
    return;
  }
  const i = c[0];
  const j = c[1];
  W.sets[i][j].ok = 1;
  W.lastBeep = 0;
  W.restAfter = [i, j];
  W.sets[i][j].ws = 0;
  const rs = restAfterSet(i, j);
  W.restEndsAt = rs ? Date.now() + rs * 1000 : 0;
  const nx = currentSet();
  if (!nx) {
    W.restEndsAt = 0;
    R();
    A.finishAsk();
    return;
  }
  R();
  /* si toca otro ejercicio (superserie, o el siguiente), se pasa a él al acabar el descanso: restEnded */
  if (!W.restEndsAt || nx[0] == i)
    scrollToCurrent();
};
/** Al acabar o saltar el descanso: si la serie que toca es la que sigue en el orden y es de otro ejercicio, se va a ella
    (F-12). Si se marcó una serie saltándose otras, no se vuelve atrás a la que quedó pendiente. */
export const restEnded = () => {
  const c = W && W.restAfter && currentSet();
  if (!c || c[0] == W.restAfter[0])
    return;
  const o = setOrder();
  const at = p => o.findIndex(x => x[0] == p[0] && x[1] == p[1]);
  if (at(c) > at(W.restAfter))
    scrollToCurrent();
};
A.previousSet = () => {
  let r = null;
  setOrder().forEach(([i, j]) => {
    if (W.sets[i][j].ok)
      r = [i, j];
  });
  if (!r)
    return;
  W.sets[r[0]][r[1]].ok = 0;
  W.restEndsAt = 0;
  W.restAfter = null;
  R();
  scrollToCurrent();
};
A.discardWorkout = () => {
  sheet();
  setW(null);
  R();
  restorePlanBackup();
  R();
};
const setToggle = (i, b) => {
  const s = W.sets[i][+b.dataset.j];
  s.ok = !s.ok;
  if (s.ok)
    s.ws = 0;
  W.lastBeep = 0;
  W.restAfter = [i, +b.dataset.j];
  const rs = s.ok ? restAfterSet(i, +b.dataset.j) : 0;
  W.restEndsAt = rs ? Date.now() + rs * 1000 : 0;
  R();
};
/** Cómo se llama una fila de series para los lectores de pantalla: «serie 2, Press banca» (o «drop set, …»). */
const setName = (j, s, e) => (s.t == 1 ? 'drop set' : s.t == 2 ? 'rest-pause' : 'serie ' + (j + 1) + (k => k == 'WRK' ? '' : ', ' + TECHNIQUES[k][0].toLowerCase())(setTechnique(s))) + ', ' + e.n;
/** Número que se ve a la izquierda de la fila: el de la serie (sin contar las filas extra), D en el drop set y + en el bloque
    de rest-pause. */
const setNo = (a, j) => a[j].t == 1 ? 'D' : a[j].t == 2 ? '+' : a.slice(0, j + 1).filter(x => !x.t).length;
const foldButton = i => html`<button class="fdb" data-a="toggleFold" data-i="${i}" aria-label="Plegar o desplegar ejercicio">${icon('chev', 20)}</button>`;
const foldSummary = (e, i) => {
  const a = W.sets[i] || [];
  const ok = a.filter(s => s.ok).length;
  return html`<div class="xsm" data-a="toggleFold" data-i="${i}" role="button" tabindex="0"><span><b>${raw(ok)}/${a.length}</b> series</span><span>${raw(targetText(e))}</span></div>`;
};
A.toggleFold = (i, b) => {
  const k = +b.dataset.i;
  W.folded = W.folded || {};
  if (W.folded[k])
    delete W.folded[k];
  else
    W.folded[k] = 1;
  R();
};
const anLiveOn = i => {
  try {
    const c = currentSet();
    return !!(c && c[0] == i && !W.pausedAt && !W.restEndsAt);
  }
  catch (e) {
    return false;
  }
};
const exThumb = (n, i) => {
  const on = anLiveOn(i);
  const s = exAnatomy(n, 64);
  /* al tocar la imagen, cómo se hace el ejercicio (F-14: library/howto) */
  const at = ' data-a="exerciseHowTo" data-n="' + X(n) + '" role="button" tabindex="0" aria-label="Cómo se hace: ' + X(n) + '"';
  return html`<div class="th${raw(on ? ' live' : '')}"${raw(at)}>${raw(s)}${raw(exBadge(n))}</div>`;
};
const restPill = () => W && W.restEndsAt ? html`<button class="wsr" data-a="scrollToRest" aria-label="Ir al descanso">Descanso <b id="rt2">${raw(fmtMinSec(Math.max(0, Math.ceil((W.restEndsAt - Date.now()) / 1000))))}</b></button>` : '';
A.scrollToRest = () => {
  const r = document.querySelector('.rr');
  if (r)
    r.scrollIntoView({ block: 'center', behavior: 'smooth' });
};
A.toggleSetDone = (i, b) => {
  W.lastBeep = 0;
  setToggle(i, b);
  const e = S.plan[S.selectedDay].ex[i];
  const s = W.sets[i][+b.dataset.j];
  if (s && s.ok) {
    buzz(30);
    const h = (S.exerciseHistory || {})[e.n] || [];
    const bw = Math.max(0, ...h.flatMap(x => x.s.map(y => y[1])));
    if (s.w > 0 && bw > 0 && s.w > bw)
      toast('Nuevo récord en ' + e.n + ': ' + toDisplayWeight(s.w) + ' ' + weightUnit());
    /* era la última que faltaba: en vez del descanso, la ventana de guardar el entreno, como con «Siguiente serie» (I-28) */
    if (W.sets.every(a => a.every(x => x.ok))) {
      W.restEndsAt = 0;
      R();
      A.finishAsk();
      return;
    }
  }
  if (S.autoRest === 0 && W && W.restEndsAt && W.sets[i][+b.dataset.j].ok) {
    W.restEndsAt = 0;
    R();
    restEnded();
  }
};
A.goToNextSet = () => {
  W.lastBeep = 0;
  nextSet();
  /* sin descanso automático, se pasa enseguida a la serie que toca */
  if (S.autoRest === 0 && W && W.restEndsAt) {
    W.restEndsAt = 0;
    R();
    restEnded();
  }
};
A.startWorkout = () => {
  setOverviewMode(0);
  const d = S.plan[S.selectedDay];
  setW({ startedAt: Date.now(), restEndsAt: 0, openPanels: {}, sets: d.ex.map(e => Array.from({ length: e.s }, () => ({ r: 10, w: S.lastWeights[e.n] || '', ok: 0 }))) });
  /* semana de descarga (F-18): mismas series con el 65 % del peso, 2 repeticiones menos y sin técnicas de intensidad */
  if (isDeloadWeek(S.week))
    W.deload = 1;
  R();
  scrollTo(0, 0);
  W.sets.forEach((a, i) => {
    prefillSets(d.ex[i], a);
    if (!W.deload) {
      withTechnique(d.ex[i], a);
      prefillSets(d.ex[i], a);
    }
  });
  R();
};
const rpeRow = (i, j, s) => {
  if (!W || W.pausedAt || !s.ok || !W.restAfter || W.restAfter[0] != i || W.restAfter[1] != j)
    return '';
  const e = S.plan[S.selectedDay].ex[i];
  if (!e || unitOf(e))
    return '';
  /* el esfuerzo, solo si se activó en Ajustes avanzados (F-42); «+ Drop set», siempre que haya peso */
  const rpe = rpeOn() ? html`<span>RPE</span>${[6, 7, 8, 9, 10].map(v => html`<button class="chip${s.q == v ? ' on' : ''}" data-a="setRpe" data-i="${i}" data-j="${j}" data-v="${v}">${v}</button>`)}` : '';
  const drop = usesWeight(e) && (+s.w || 0) > 0 ? html`<button class="chip" data-a="addDropSet" data-i="${i}" data-j="${j}">+ Drop set</button>` : '';
  return rpe || drop ? html`<div class="rpe">${raw(rpe)}${raw(drop)}</div>` : '';
};
A.setRpe = (i, b) => {
  const s = W.sets[i] && W.sets[i][+b.dataset.j];
  if (!s)
    return;
  const v = +b.dataset.v;
  s.q = s.q == v ? 0 : v;
  R();
};
A.addDropSet = (i, b) => {
  const j = +b.dataset.j;
  const a = W.sets[i];
  const s = a && a[j];
  if (!s)
    return;
  const w = +s.w || 0;
  if (!(w > 0))
    return;
  a.splice(j + 1, 0, { r: s.r, w: dropWeight(w), ws: 1, ok: 0, t: 1, k: 'DS' });
  W.restEndsAt = 0;
  W.restAfter = null;
  R();
};
export const avgEffort = () => {
  const q = [];
  W.sets.forEach(a => a.forEach(s => {
    if (s.ok && +s.q > 0)
      q.push(+s.q);
  }));
  return q.length >= 3 ? Math.round(q.reduce((a, b) => a + b, 0) / q.length * 10) / 10 : 0;
};
const nextUpBar = (d, cur) => {
  if (!cur)
    return '<div class="wsn done"><span>Entreno completado</span></div>';
  const e = d.ex[cur[0]];
  const a = W.sets[cur[0]];
  const n = a.filter(s => s.ok).length;
  return html`<button class="wsn" data-a="scrollToCurrentSet" aria-label="Ir al ejercicio actual"><span>${e.n}</span><small>Serie ${Math.min(n + 1, a.length)}/${a.length}</small></button>`;
};
A.scrollToCurrentSet = () => {
  const c = currentSet();
  if (!c)
    return;
  const el = document.getElementById('ex' + c[0]);
  const h = document.querySelector('.wsk');
  if (!el)
    return;
  const top = el.getBoundingClientRect().top + window.scrollY - (h ? h.offsetHeight : 90) - 8;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
};
const blockArrowLive = (L, n, cur) => {
  try {
    return !!(cur && W && !W.pausedAt && !W.restEndsAt && L[n] && L[n].x.includes(cur[0]));
  }
  catch (e) {
    return false;
  }
};
/* la etiqueta de una serie (WKT, DS, RP, CL…), que al tocarla explica su técnica (F-11); en color, si no es una serie normal */
const setLabelButton = s => {
  const k = setTechnique(s);
  return html`<button class="wk2${k != 'WRK' ? ' tq' : ''}" data-a="techniqueInfo" data-v="${k}" aria-label="${'Técnica: ' + TECHNIQUES[k][0]}">${setLabel(s)}</button>`;
};
const blockHeader = (L, n, cur) => html`<div class="sl">SERIE ${raw(String.fromCharCode(65 + n))} <span class="arw${blockArrowLive(L, n, cur) ? ' live' : ''}" aria-hidden="true"><span>›</span><span>›</span><span>›</span></span></div>`;
/* — manejadores de esta función (registros A / C / U) — */
/* etiqueta de técnica de una serie (F-11): qué técnica es, cómo se ejecuta y qué hace la app con ella */
A.techniqueInfo = (i, b) => {
  const t = TECHNIQUES[b.dataset.v];
  /* tras el nombre, la etiqueta que se ha tocado (WKT en una serie de pirámide) */
  if (t)
    dialog(html`${t[0]} <span class="mu">· ${(b.textContent || '').trim() || b.dataset.v}</span>`, html`${t[1]}${raw(t[2] ? html`<br><br><b>En el entreno:</b> ${t[2]}` : '')}`, [['Entendido', 'doNothing', 'pr']]);
};
A.addSet = i => {
  const a = W.sets[i];
  /* una serie más como la última normal (sin copiar el drop set ni el rest-pause, ni su técnica si es solo de la última) */
  const m = a.filter(x => !x.t).pop() || a[a.length - 1];
  const k = m.k && !['DS', 'RP', 'PAR'].includes(m.k) ? m.k : '';
  a.push(k ? { r: m.r, w: m.w, ws: 1, ok: 0, k } : { r: m.r, w: m.w, ws: 1, ok: 0 });
  R();
};
A.removeSet = i => {
  W.sets[i].length > 1 && W.sets[i].pop();
  R();
};
A.adjustRest = i => {
  W.restEndsAt = i ? W.restEndsAt + i * 1e3 : 0;
  W.lastBeep = 0;
  R();
  if (!i)
    restEnded();
};
/* lo anotado en una serie nunca es negativo ni disparatado (hasta 100.000: los metros de una distancia), ni el peso pasa de
   2.000 en la unidad elegida: descuadraría el volumen, los récords y la progresión */
C.setReps = (e, i, j) => W.sets[i][j].r = clampNum(typedNum(e.value), 0, 1e5, 0);
/* el peso escrito pasa como sugerido a las series siguientes (F-10) */
C.setWeight = (e, i, j) => {
  const a = W.sets[i];
  a[j].w = fromDisplayWeight(clampNum(typedNum(e.value), 0, 2000, 0));
  a[j].ws = 0;
  suggestAfter(S.plan[S.selectedDay].ex[i], a, j);
  R();
};
