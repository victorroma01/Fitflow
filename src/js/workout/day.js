/* ═══ workout/day ═══
   Pestaña Workout: vista del día, tempos, superseries y atajos.
   Define: planEx, planSetButton, weekdayButton, weekHeader, dayEditRow, dayEditCard, restDayCard, trainingDayCard, workoutDayBase, TEMPOS, shortSelect, tempoSelect, exToolsHtml, blockBadge, linkPrev, woShortcuts, inSuperset, dayBlocks, withWeekBar, woExtra, noProgramView, workoutTab  · acciones/registros: 13
*/
import { typedName } from '../core/util.js';
import { A, C } from '../core/registry.js';
import { toast } from '../core/toast.js';
import { overviewMode, S, saveState, setWeekView, W, weekView } from '../core/state.js';
import { icon } from '../core/icons.js';
import { linkRow, sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { resumeBanner } from './resume.js';
import { restSelect } from './rest.js';
import { dayMinutes, MAX_SETS, rangeSelect, tempoOf, unitOf } from './targets.js';
import { deloadCard, isDeloadWeek } from './deload.js';
import { coverStyle } from './images.js';
import { exTip, withExInfo } from '../library/howto.js';
import { advanceDay, planIndex, syncSel, trainingDays } from './week.js';
import { levelPill, programName } from '../programs/levels.js';
import { rotationCard } from '../programs/rotation.js';
import { isFreshInstall, restoreBanner } from '../system/backup.js';
import { html, raw } from '../core/html.js';
const planEx = (i) => S.plan[S.selectedDay].ex[i];
/** El botón de una serie menos (by = -1) o una más (by = 1) de un ejercicio del plan (al editar la semana y en Overview). */
export const planSetButton = (e, i, by) => html`<button data-a="${by < 0 ? 'planSetMinus' : 'planSetPlus'}" data-i="${i}" aria-label="${(by < 0 ? 'Una serie menos, ' : 'Una serie más, ') + e.n}" class="tz">${by < 0 ? '−' : '+'}</button>`;
/* el botón de un día de la semana: hecho (✓), de descanso (☾) o su número */
const weekdayButton = j => html`<button class="dy ${j == S.selectedWeekday ? 'on' : ''}" data-a="selectDay" data-i="${j}">DÍA<br>${raw(S.doneDays[S.week + '-' + j] ? '✓' : !S.plan[planIndex(j)].ex.length ? '☾' : j + 1)}</button>`;
/* la cabecera de la pestaña: el nivel, el programa y el menú; la semana, con sus flechas; y los siete días */
const weekHeader = () => {
  const deload = isDeloadWeek(S.week);
  const top = html`<div class="hd"><div>${levelPill()}<h1>${programName()}</h1></div><button data-a="openMenu" aria-label="Menú" class="fs-26 p-6-14">☰</button></div>`;
  const week = html`<div class="wk mt-12"><button data-a="changeWeek" data-i="-1" aria-label="Semana anterior" class="tz">‹</button><b${raw(deload ? ' class="wkdl"' : '')}>Semana ${raw(S.week)}${deload ? ' · descarga' : ''}</b><button data-a="changeWeek" data-i="1" aria-label="Semana siguiente" class="tz">›</button></div>`;
  return html`${top}${week}<div class="dys">${[0, 1, 2, 3, 4, 5, 6].map(weekdayButton)}</div>`;
};
/* un ejercicio del día al editar la semana: su bloque y su nombre; el descanso, el rango y «Unir al anterior»; las series, con
   − y +; y la ✕ que lo quita */
const dayEditRow = (d, e, i) => {
  const link = i ? html` <button data-a="linkToPrevious" data-i="${i}" class="p-5-9 fs-12">${e.b && d.ex[i - 1].b == e.b ? 'Separar' : 'Unir al anterior'}</button>` : '';
  const sets = html`<span>${planSetButton(e, i, -1)} ${raw(e.s)} ${planSetButton(e, i, 1)}</span>`;
  return html`<div class="it cols-1fr-auto-24"><span>${blockBadge(d.ex, i)}${e.n}<br>${restSelect(e)}${rangeSelect(e, i)}${link}</span>${sets}<button data-a="removePlanExercise" data-i="${i}" aria-label="${'Quitar ' + e.n}" class="p-2-6">✕</button></div>`;
};
/* el día al editar la semana: su nombre y sus ejercicios, «+ Añadir ejercicio» y «Listo» */
const dayEditCard = d => html`<div class="cd"><label>Nombre del día</label><input value="${d.n}" maxlength="60" data-c="setDayName" aria-label="Nombre del día">${d.ex.map((e, i) => dayEditRow(d, e, i))}</div><button data-a="openPicker" class="w-full">+ Añadir ejercicio</button><button class="pr w-full mt-8" data-a="toggleWeekView">Listo</button>`;
/* un día sin ejercicios: descanso, con su botón para completarlo (`done`: ya está completado) */
const restDayCard = done => html`<div class="cd hero ta-c p-50-14" data-style="${coverStyle('Descanso')}"><div class="fs-44">☾</div><h2>Día de descanso</h2><p class="mu">Hoy toca recuperar.</p><button class="pr" data-a="completeRestDay">${done ? 'Descanso completado ✓' : 'Completar descanso'}</button></div><button data-a="openPicker" class="w-full">+ Convertir en día de entreno</button>`;
/* un día de entreno: su portada, con los ejercicios, las series y los minutos, Overview y «Empezar» (o «Repetir», si ya está hecho) */
const trainingDayCard = (d, done) => {
  const sets = d.ex.reduce((s, e) => s + e.s, 0);
  const stats = html`<div class="st"><div><b>${d.ex.length}</b><small>Ejercicios</small></div><div><b>${raw(sets)}</b><small>Series</small></div><div><b>${dayMinutes(d)}</b><small>Minutos</small></div></div>`;
  return html`<div class="cd hero" data-style="${coverStyle(d.n, d)}"><h2>${d.n}</h2>${stats}<div class="g2"><button data-a="openOverview">Overview</button><button class="pr" data-a="startWorkout">${done ? 'Repetir' : 'Empezar'} día ${raw(S.selectedWeekday + 1)}</button></div></div>`;
};
function workoutDayBase() {
  /* con un entreno en curso no se toca el día: es el de la sesión */
  if (!W)
    syncSel();
  const d = S.plan[S.selectedDay];
  const done = S.doneDays[S.week + '-' + S.selectedWeekday];
  if (!d.ex.length)
    return html`${weekHeader()}${restDayCard(done)}`;
  return html`${weekHeader()}${weekView ? dayEditCard(d) : trainingDayCard(d, done)}`;
}
const TEMPOS = [['2/0/2/0', 'Estándar'], ['3/0/1/0', 'Excéntrico controlado'], ['3/0/3/0', 'Lento y controlado'], ['4/1/1/0', 'Excéntrico lento con pausa'], ['3/1/X/0', 'Pausa abajo y subida explosiva'], ['1/0/X/0', 'Explosivo'], ['2/2/2/0', 'Pausa en la contracción'], ['5/0/1/0', 'Excéntrico muy lento'], ['1/1/1/1', 'Pausa en ambos extremos'], ['Libre', 'Sin tempo fijo']];
/** Desplegable corto (F-09): enseña solo su nombre («Tempo», «Descanso»), porque el valor ya está en el objetivo de arriba;
    al tocarlo se abre la lista de siempre (el select va encima, transparente). */
const shortSelect = (l, sel) => html`<label class="psel"><span>${l}</span>${icon('chev', 14)}${raw(sel)}</label>`;
/* el desplegable con el tempo de un ejercicio del día */
const tempoSelect = (e, i) => {
  const t = tempoOf(e) || '2/0/2/0';
  return html`<select data-c="setPlanTempo" data-i="${i}" aria-label="${'Tempo, ' + e.n}">${TEMPOS.map(m => html`<option value="${m[0]}"${m[0] == t ? ' selected' : ''}>${raw(m[0])} · ${raw(m[1])}</option>`)}</select>`;
};
/** Lo que lleva un ejercicio durante el entreno bajo sus series: los botones de Tips y Notas, el tempo y el descanso, y,
    abiertos, el consejo y las notas. */
export function exToolsHtml(e, i) {
  const tipOn = W.openPanels[i + 't'];
  const notesOn = W.openPanels[i + 'n'];
  const tipButton = html`<button class="chip ic${tipOn ? ' on' : ''}" data-a="toggleExerciseTip" data-i="${i}" data-v="t" aria-label="${'Tips, ' + e.n}" aria-pressed="${tipOn ? 'true' : 'false'}">${icon('info', 18)}</button>`;
  const notesButton = html`<button class="chip${notesOn ? ' on' : ''} m-0" data-a="toggleExerciseTip" data-i="${i}" data-v="n">Notas</button>`;
  /* lo que se mide en tiempo o en distancia no lleva tempo */
  const tempo = unitOf(e) ? '' : shortSelect('Tempo', tempoSelect(e, i));
  /* en una superserie solo el último ejercicio tiene descanso que elegir (el de la ronda): entre ejercicios son 10 s fijos */
  const rest = inSuperset(i) ? '' : shortSelect('Descanso', restSelect(e, 1));
  const tip = tipOn ? html`<div class="mu tip">${exTip(e.n) || 'Cargando…'}</div>` : '';
  const notes = notesOn ? html`<textarea rows="3" maxlength="2000" data-c="setExerciseNote" data-i="${i}" aria-label="${'Notas, ' + e.n}" placeholder="Anota lo que quieras sobre este ejercicio" class="mb-8">${S.exerciseNotes[e.n] || ''}</textarea>` : '';
  return html`<div class="xtl">${tipButton}${notesButton}${tempo}${rest}</div>${tip}${notes}`;
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
  const e = planEx(i);
  e.s = Math.min(MAX_SETS, e.s + 1);
  saveState('core');
  R();
};
/* quitar un ejercicio del día no pregunta: se puede deshacer (vuelve a su sitio, con sus series, descanso y bloque) */
A.removePlanExercise = i => {
  const d = S.plan[S.selectedDay];
  if (!d.ex[i])
    return;
  const [e] = d.ex.splice(i, 1);
  saveState('core');
  R();
  toast('«' + e.n + '» quitado del día', () => {
    d.ex.splice(i, 0, e);
    saveState('core');
    R();
  });
};
/* «Reiniciar semana» quita las marcas de hecho de la semana (los entrenos guardados no se tocan). No pregunta: se puede deshacer */
A.resetWeek = () => {
  const marks = Object.keys(S.doneDays).filter(k => k.startsWith(S.week + '-'));
  const before = marks.map(k => [k, S.doneDays[k]]);
  marks.forEach(k => delete S.doneDays[k]);
  saveState('core');
  sheet();
  R();
  toast(before.length ? 'Semana reiniciada' : 'La semana ya estaba sin días hechos', before.length ? () => {
    before.forEach(([k, v]) => S.doneDays[k] = v);
    saveState('core');
    R();
  } : null);
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
/* el nombre del día no se queda vacío: si se borra, vuelve el que tenía */
C.setDayName = e => {
  const d = S.plan[S.selectedDay];
  d.n = typedName(e.value, d.n || 'Entreno');
  e.value = d.n;
  saveState('core');
};
