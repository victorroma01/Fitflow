/* ═══ routines/ondemand ═══
   Entrenos a la carta (V1.0.4): la última tarjeta de Workout abre la lista de las rutinas sueltas de data/ondemand. Cada una
   se ve antes de empezar (sus bloques A, B…, con las series, las repeticiones de cada serie, el tempo y la variante de cada
   posición) y se empieza sin tocar el programa: su día se pone sobre el del plan mientras dura el entreno, como un workout
   personalizado (routines/builder: planBackup), y al guardarlo o descartarlo vuelve el del plan. Queda en Registros con su
   nombre y no completa el día del plan (workout/finish).
   El día que se entrena (onDemandDay) lleva en cada ejercicio sus repeticiones de cada serie (rs: un número o AMRAP), su
   rango (rg: de la menor a la mayor, para la progresión), su tempo («Libre» si la rutina no lo da) y su variante (nt); en
   cada bloque, el mismo número de bloque (b). Los descansos son los de la app (workout/rest): la rutina no los da. Su
   portada, la de su primer grupo (workout/images); la de cuerpo completo, la de funcional.
   Define: onDemandDay, odCover, odCard, odListPage, odExercise, odBlock, odPreviewPage  · acciones/registros: 3
*/
import { A } from '../core/registry.js';
import { S, saveState, W } from '../core/state.js';
import { restorePlanBackup } from './builder.js';
import { fullPage, pgHead, sheet } from '../core/ui.js';
import { html, raw } from '../core/html.js';
import { ONDEMAND } from '../data/ondemand.js';
import { levelTag } from '../programs/levels.js';
import { coverStyle, groupImage } from '../workout/images.js';
import { AMRAP, dayMinutes, targetText, tempoOf } from '../workout/targets.js';
import { blockKind, dayBlocks } from '../workout/day.js';
import { exPicture } from '../extras/pictures.js';
/* el día que se entrena con la rutina `r` de data/ondemand (como uno del plan) */
const onDemandDay = r => {
  /** @type {PlanExercise[]} */
  const ex = [];
  r.bl.forEach((b, j) => b.forEach(([n, reps, t, nt]) => {
    const rs = reps.split('/').map(x => x == AMRAP ? AMRAP : +x);
    const nums = /** @type {number[]} */ (rs.filter(x => x != AMRAP));
    /** @type {PlanExercise} */
    const e = { n, s: rs.length, rs, t: t || 'Libre' };
    if (nums.length)
      e.rg = [Math.min(...nums), Math.max(...nums)];
    if (nt)
      e.nt = nt;
    if (b.length > 1)
      e.b = j + 1;
    ex.push(e);
  }));
  return { n: r.n, ex, cu: 1, img: odCover(r), od: r.k };
};
/* la portada: la de su primer grupo; la de cuerpo completo (que no es un grupo de la librería), la de funcional */
const odCover = r => groupImage(r.g[0]) || 'funcional';
/* una rutina en la lista: su portada, su nivel (si lo tiene), su nombre, su subtítulo, sus grupos y sus cifras */
const odCard = (r, i) => {
  const d = onDemandDay(r);
  const sets = d.ex.reduce((s, e) => s + e.s, 0);
  return html`
    <div class="card hero od-card" data-a="onDemandShow" data-i="${i}" role="button" tabindex="0" data-style="${coverStyle(d.n, d)}">
      ${r.lv ? html`<span class="od-level">${levelTag(r.lv)}</span>` : ''}
      <b>${r.n}</b>
      ${r.t ? html`<small>${r.t}</small>` : ''}
      <small>${r.g.join(' · ')}</small>
      <small>${raw(d.ex.length)} ejercicios · ${raw(sets)} series · ${raw(dayMinutes(d))} min</small>
    </div>`;
};
const odListPage = () => html`
  ${pgHead('Entrenos a la carta')}
  <p class="muted m-n6-0-10">Elige tu sesión y empieza a entrenar</p>
  ${ONDEMAND.map(odCard)}
  <div class="h-30"></div>`;
/* un ejercicio en la vista previa: su figura, su nombre, su variante y sus series, repeticiones y tempo (si lo da) */
const odExercise = (d, i) => {
  const e = d.ex[i];
  const tempo = e.t == 'Libre' ? '' : html` · Tempo ${raw(tempoOf(e))}`;
  return html`
    <div class="exercise-row">
      <div class="thumb">${exPicture(e.n, 64)}</div>
      <div class="fx-1 minw-0">
        <b>${e.n}</b>
        ${e.nt ? html`<div class="ex-variant">${e.nt}</div>` : ''}
        <div class="muted fs-13">${raw(e.s)} series · ${raw(targetText(e))}${tempo}</div>
      </div>
    </div>`;
};
/* un bloque (serie A, B…), con su tipo si junta varios ejercicios, como en el Overview */
const odBlock = (d, k, n) => html`
  <div class="row mt-14">
    <b class="muted">SERIE ${raw(String.fromCharCode(65 + n))}</b>
    ${k.x.length > 1 ? html`<b class="c-wnx">${blockKind(k.x.length)}</b>` : ''}
  </div>
  ${k.x.map(i => odExercise(d, i))}`;
/* la vista previa de una rutina: su portada con sus cifras, su nivel y sus grupos, su descripción, sus bloques y «Empezar» */
const odPreviewPage = i => {
  const r = ONDEMAND[i];
  const d = onDemandDay(r);
  const sets = d.ex.reduce((s, e) => s + e.s, 0);
  return html`
    ${pgHead(r.n, 'openOnDemand')}
    ${r.t ? html`<p class="muted m-n6-0-10">${r.t}</p>` : ''}
    <div class="card hero od-hero" data-style="${coverStyle(d.n, d)}">
      <div class="stats">
        <div><b>${d.ex.length}</b><small>Ejercicios</small></div>
        <div><b>${raw(sets)}</b><small>Series</small></div>
        <div><b>${dayMinutes(d)}</b><small>Minutos</small></div>
      </div>
    </div>
    <div class="od-meta">${r.lv ? levelTag(r.lv) : ''}<span>${r.g.join(' · ')}</span></div>
    ${r.d ? html`<p class="muted fs-14">${r.d}</p>` : ''}
    ${dayBlocks(d).map((k, n) => odBlock(d, k, n))}
    <div class="h-84"></div>
    <button class="sticky-btn bg-tx c-bg bd-0 p-16 fs-16 r-16" data-a="onDemandStart" data-i="${i}">Empezar entreno</button>`;
};
/* — manejadores de esta función (registros A / C / U) — */
A.openOnDemand = () => fullPage(odListPage());
A.onDemandShow = i => {
  if (ONDEMAND[i])
    fullPage(odPreviewPage(i));
};
/* empezar: el día de la rutina sobre el del plan mientras dura el entreno (al guardarlo o descartarlo, vuelve el del plan) */
A.onDemandStart = i => {
  const r = ONDEMAND[i];
  if (!r || W)
    return;
  /* (si quedara puesto otro día sobre el del plan, primero vuelve el del plan: es el que se guarda para después) */
  restorePlanBackup();
  if (!S.plan[S.selectedDay])
    return;
  S.planBackup = { sel: S.selectedDay, day: S.plan[S.selectedDay] };
  S.plan[S.selectedDay] = onDemandDay(r);
  saveState();
  sheet();
  A.startWorkout();
};
