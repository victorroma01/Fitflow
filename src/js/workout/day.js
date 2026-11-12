/* ═══ workout/day ═══
   Pestaña Workout: vista del día, tempos, superseries y atajos.
   Define: planEx, workoutDayBase, TEMPOS, shortSelect, exToolsHtml, blockBadge, linkPrev, woShortcuts, inSuperset, dayBlocks, withWeekBar, woExtra, noProgramView, workoutTab  · acciones/registros: 13
*/
import { A, C } from '../core/registry.js';
import { PROGRAM_NAMES } from '../data/library.js';
import { overviewMode, S, saveState, setWeekView, W, weekView } from '../core/state.js';
import { icon } from '../core/icons.js';
import { linkRow, sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { resumeBanner } from './resume.js';
import { restSelect } from './rest.js';
import { dayMinutes, rangeSelect, tempoOf, unitOf } from './targets.js';
import { deloadCard, isDeloadWeek } from './deload.js';
import { coverStyle } from './images.js';
import { exTip, withExInfo } from '../library/howto.js';
import { advanceDay, planIndex, syncSel, trainingDays } from './week.js';
import { levelPill } from '../programs/levels.js';
import { rotationCard } from '../programs/rotation.js';
import { isFreshInstall, restoreBanner } from '../system/backup.js';
import { html, raw } from '../core/html.js';
const planEx = (i) => S.plan[S.selectedDay].ex[i];
function workoutDayBase() {
  /* con un entreno en curso no se toca el día: es el de la sesión */
  if (!W)
    syncSel();
  const d = S.plan[S.selectedDay];
  const k = S.week + '-' + S.selectedWeekday;
  const rest = !d.ex.length;
  const ns = d.ex.reduce((s, e) => s + e.s, 0);
  let h = html`<div class="hd"><div>${levelPill()}<h1>${S.ownProgramIndex >= 0 && S.ownPrograms[S.ownProgramIndex] ? S.ownPrograms[S.ownProgramIndex].n : PROGRAM_NAMES[S.program]}</h1></div><button data-a="openMenu" aria-label="Menú" class="fs-26 p-6-14">☰</button></div><div class="wk mt-12"><button data-a="changeWeek" data-i="-1" aria-label="Semana anterior">‹</button><b${raw(isDeloadWeek(S.week) ? ' class="wkdl"' : '')}>Semana ${raw(S.week)}${isDeloadWeek(S.week) ? ' · descarga' : ''}</b><button data-a="changeWeek" data-i="1" aria-label="Semana siguiente">›</button></div><div class="dys">${[0, 1, 2, 3, 4, 5, 6].map(j => html`<button class="dy ${j == S.selectedWeekday ? 'on' : ''}" data-a="selectDay" data-i="${j}">DÍA<br>${raw(S.doneDays[S.week + '-' + j] ? '✓' : !S.plan[planIndex(j)].ex.length ? '☾' : j + 1)}</button>`)}</div>`;
  if (weekView && !rest)
    return html`${raw(h)}<div class="cd"><label>Nombre del día</label><input value="${d.n}" maxlength="60" data-c="setDayName" aria-label="Nombre del día">${d.ex.map((e, i) => html`<div class="it cols-1fr-auto-24"><span>${blockBadge(d.ex, i)}${e.n}<br>${restSelect(e)}${rangeSelect(e, i)}${i ? html` <button data-a="linkToPrevious" data-i="${i}" class="p-5-9 fs-12">${e.b && d.ex[i - 1].b == e.b ? 'Separar' : 'Unir al anterior'}</button>` : ''}</span><span><button data-a="planSetMinus" data-i="${i}" aria-label="${'Una serie menos, ' + e.n}">−</button> ${raw(e.s)} <button data-a="planSetPlus" data-i="${i}" aria-label="${'Una serie más, ' + e.n}">+</button></span><button data-a="removePlanExercise" data-i="${i}" aria-label="${'Quitar ' + e.n}" class="p-2-6">✕</button></div>`)}</div><button data-a="openPicker" class="w-full">+ Añadir ejercicio</button><button class="pr w-full mt-8" data-a="toggleWeekView">Listo</button>`;
  if (rest)
    return html`${raw(h)}<div class="cd hero ta-c p-50-14" data-style="${coverStyle('Descanso')}"><div class="fs-44">☾</div><h2>Día de descanso</h2><p class="mu">Hoy toca recuperar.</p><button class="pr" data-a="completeRestDay">${S.doneDays[k] ? 'Descanso completado ✓' : 'Completar descanso'}</button></div><button data-a="openPicker" class="w-full">+ Convertir en día de entreno</button>`;
  return html`${raw(h)}<div class="cd hero" data-style="${coverStyle(d.n, d)}"><h2>${d.n}</h2><div class="st"><div><b>${d.ex.length}</b><small>Ejercicios</small></div><div><b>${raw(ns)}</b><small>Series</small></div><div><b>${dayMinutes(d)}</b><small>Minutos</small></div></div><div class="g2"><button data-a="openOverview">Overview</button><button class="pr" data-a="startWorkout">${S.doneDays[k] ? 'Repetir' : 'Empezar'} día ${raw(S.selectedWeekday + 1)}</button></div></div>`;
}
const TEMPOS = [['2/0/2/0', 'Estándar'], ['3/0/1/0', 'Excéntrico controlado'], ['3/0/3/0', 'Lento y controlado'], ['4/1/1/0', 'Excéntrico lento con pausa'], ['3/1/X/0', 'Pausa abajo y subida explosiva'], ['1/0/X/0', 'Explosivo'], ['2/2/2/0', 'Pausa en la contracción'], ['5/0/1/0', 'Excéntrico muy lento'], ['1/1/1/1', 'Pausa en ambos extremos'], ['Libre', 'Sin tempo fijo']];
/** Desplegable corto (F-09): enseña solo su nombre («Tempo», «Descanso»), porque el valor ya está en el objetivo de arriba;
    al tocarlo se abre la lista de siempre (el select va encima, transparente). */
const shortSelect = (l, sel) => html`<label class="psel"><span>${l}</span>${icon('chev', 14)}${raw(sel)}</label>`;
export function exToolsHtml(e, i) {
  const o = W.openPanels;
  const t = tempoOf(e) || '2/0/2/0';
  /* en una superserie solo el último ejercicio tiene descanso que elegir (el de la ronda): entre ejercicios son 10 s fijos */
  const rs = inSuperset(i) ? '' : shortSelect('Descanso', restSelect(e, 1));
  return html`<div class="xtl"><button class="chip ic${o[i + 't'] ? ' on' : ''}" data-a="toggleExerciseTip" data-i="${i}" data-v="t" aria-label="${'Tips, ' + e.n}" aria-pressed="${o[i + 't'] ? 'true' : 'false'}">${icon('info', 18)}</button><button class="chip${o[i + 'n'] ? ' on' : ''} m-0" data-a="toggleExerciseTip" data-i="${i}" data-v="n">Notas</button>${unitOf(e) ? '' : raw(shortSelect('Tempo', html`<select data-c="setPlanTempo" data-i="${i}" aria-label="${'Tempo, ' + e.n}">${TEMPOS.map(m => html`<option value="${m[0]}"${m[0] == t ? ' selected' : ''}>${raw(m[0])} · ${raw(m[1])}</option>`)}</select>`))}${raw(rs)}</div>${o[i + 't'] ? html`<div class="mu tip">${exTip(e.n) || 'Cargando…'}</div>` : ''}${o[i + 'n'] ? html`<textarea rows="3" maxlength="2000" data-c="setExerciseNote" data-i="${i}" aria-label="${'Notas, ' + e.n}" placeholder="Anota lo que quieras sobre este ejercicio" class="mb-8">${S.exerciseNotes[e.n] || ''}</textarea>` : ''}`;
}
A.toggleExerciseTip = (i, b) => {
  const k = i + b.dataset.v;
  W.openPanels[k] = !W.openPanels[k];
  R();
  /* el consejo del ejercicio (F-13) llega con el catálogo, que se descarga la primera vez */
  if (W.openPanels[k] && b.dataset.v == 't')
    withExInfo(R);
};
/** Etiqueta del ejercicio `i` dentro de su bloque (el de los ejercicios seguidos que van unidos: dayBlocks). */
export const blockBadge = (a, i) => {
  if (a[i].b == null)
    return '';
  const x = dayBlocks({ ex: a }).find(k => k.x.includes(i)).x;
  const m = x.length;
  const k = x.indexOf(i) + 1;
  return m < 2 ? '' : html`<small class="c-wnx fw-700">${m > 3 ? 'CIRCUITO' : m > 2 ? 'TRISERIE' : 'SUPERSERIE'} · ${raw(k)}/${raw(m)}${k < m ? ' · 10 s hasta el siguiente' : ' · descanso de la ronda'}</small><br>`;
};
/** «Unir al anterior» y «Separar» (en la semana y en el Overview). Une el ejercicio `i` de la lista `a` al bloque del
    anterior, con los que vayan unidos a él detrás, o, si ya va unido al anterior, parte el bloque por ahí. Un bloque que
    se queda con un solo ejercicio deja de serlo. */
export const linkPrev = (a, i) => {
  const e = a[i];
  const p = a[i - 1];
  if (!e || !p)
    return;
  const old = e.b;
  const tail = b => {
    for (let j = i; j < a.length && (j == i || (old != null && a[j].b == old)); j++)
      a[j].b = b;
  };
  if (old != null && p.b == old) {
    tail('b' + Date.now());
    /* entre los ejercicios de un bloque no se descansa: si quedó guardado un descanso de 10 s, vuelve el normal */
    e.r = e.r == 10 ? 90 : e.r;
    p.r = p.r == 10 ? 90 : p.r;
  }
  else {
    if (p.b == null)
      p.b = 'b' + Date.now();
    tail(p.b);
  }
  dayBlocks({ ex: a }).forEach(k => {
    if (k.x.length == 1)
      delete a[k.x[0]].b;
  });
};
A.linkToPrevious = i => {
  linkPrev(S.plan[S.selectedDay].ex, i);
  saveState('core');
  R();
};
const woShortcuts = () => html`<button class="cd w-full ta-l d-flex gap-14 ai-c" data-a="openLibrary">${icon('lib', 34)}<span><b class="fs-17">Librería de ejercicios</b><br><small>Explora por grupo muscular</small></span></button><button class="cd w-full ta-l d-flex gap-14 ai-c" data-a="routineEditorBack">${icon('prog', 34)}<span><b class="fs-17">Workout personalizado</b><br><small>Bloques sueltos, superseries y triseries</small></span></button>`;
export const inSuperset = i => {
  const x = S.plan[S.selectedDay].ex;
  const e = x[i];
  const n = x[i + 1];
  return e.b != null && n && n.b == e.b;
};
export const dayBlocks = d => {
  const o = [];
  d.ex.forEach((e, i) => {
    const l = o[o.length - 1];
    if (l && e.b != null && l.b == e.b)
      l.x.push(i);
    else
      o.push({ b: e.b, x: [i] });
  });
  return o;
};
const withWeekBar = h => {
  const tr = trainingDays();
  const dn = tr.filter(j => S.doneDays[S.week + '-' + j]).length;
  return h.replace('</button></div><div class="cd hero"', html`</button></div><div class="m-0-2-10"><div class="row"><small>Esta semana</small><small><b>${raw(dn)} de ${raw(tr.length)} entrenos</b></small></div><div class="bar h-5"><i class="bg-a2" data-style="width:${tr.length ? dn / tr.length * 100 : 0}%"></i></div></div><div class="cd hero"`);
};
const woExtra = () => linkRow('timer', 'Temporizador WOD', 'AMRAP, EMOM, Tabata y For time', 'openWod') + linkRow('pulse', 'Registrar cardio', 'Carrera, bici, remo… con ritmo y resumen semanal', 'openCardio');
/* Sin programa elegido (una cuenta nueva; I-24): detrás, un día de ejemplo difuminado, que no se puede tocar ni lo leen los
   lectores de pantalla; delante, la tarjeta para elegir uno. Debajo, lo que se puede usar sin programa. */
const noProgramView = () => {
  const demo = html`<div class="dys">${[0, 1, 2, 3, 4, 5, 6].map(j => html`<button class="dy${j ? '' : ' on'}" tabindex="-1">DÍA<br>${raw(j == 2 || j == 6 ? '☾' : j + 1)}</button>`)}</div><div class="cd hero" data-style="${coverStyle('Pecho')}"><h2>Pecho</h2><div class="st"><div><b>6</b><small>Ejercicios</small></div><div><b>22</b><small>Series</small></div><div><b>75</b><small>Minutos</small></div></div><div class="g2"><button tabindex="-1">Overview</button><button class="pr" tabindex="-1">Empezar día 1</button></div></div>`;
  return html`<div class="hd"><div><h1>Workout</h1></div><button data-a="openMenu" aria-label="Menú" class="fs-26 p-6-14">☰</button></div><div class="npw"><div class="npd" aria-hidden="true" inert>${raw(demo)}</div><div class="cd npc"><b>Elige tu programa</b><p class="mu">Aún no tienes un programa de entrenamiento. Elige uno de los predefinidos, con los recomendados para ti arriba, o crea el tuyo.</p><button class="pr" data-a="openPrograms">Seleccionar programa</button></div></div>${raw(woShortcuts())}${raw(woExtra())}`;
};
export function workoutTab() {
  if (S.noProgram && !W && !overviewMode)
    return resumeBanner() + (isFreshInstall() ? restoreBanner() : '') + noProgramView();
  let h = workoutDayBase();
  if (!weekView) {
    h += woShortcuts();
    h = resumeBanner() + h;
    h = withWeekBar(h);
    h = h.replace('<div class="cd hero"', () => html`${raw(deloadCard())}${raw(rotationCard())}<div class="cd hero"`);
  }
  if (isFreshInstall() && !W)
    h = restoreBanner() + h;
  if (weekView || W || overviewMode)
    return h;
  return h + woExtra();
}
/* — manejadores de esta función (registros A / C / U) — */
A.selectDay = i => {
  S.selectedWeekday = i;
  syncSel();
  setWeekView(0);
  R();
};
A.changeWeek = i => {
  S.week = Math.max(1, S.week + i);
  syncSel();
  saveState('core');
  R();
};
A.toggleWeekView = () => {
  setWeekView(!weekView);
  R();
};
/* «Completar descanso»: el día queda completado y se pasa al siguiente (F-41) */
A.completeRestDay = () => {
  S.doneDays[S.week + '-' + S.selectedWeekday] = 1;
  advanceDay();
  saveState('core');
  R();
};
A.planSetMinus = i => {
  const e = planEx(i);
  e.s = Math.max(1, e.s - 1);
  saveState('core');
  R();
};
A.planSetPlus = i => {
  planEx(i).s++;
  saveState('core');
  R();
};
A.removePlanExercise = i => {
  S.plan[S.selectedDay].ex.splice(i, 1);
  saveState('core');
  R();
};
A.resetWeek = () => {
  Object.keys(S.doneDays).forEach(k => k.startsWith(S.week + '-') && delete S.doneDays[k]);
  saveState('core');
  sheet();
  R();
};
C.setPlanTempo = (e, i) => {
  S.plan[S.selectedDay].ex[i].t = e.value;
  saveState('core');
  R();
};
C.setExerciseNote = (e, i) => {
  S.exerciseNotes[S.plan[S.selectedDay].ex[i].n] = e.value;
  saveState('core');
};
C.setDayName = e => {
  S.plan[S.selectedDay].n = e.value;
  saveState('core');
};
