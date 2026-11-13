/* ═══ nutrition/week ═══
   La semana en Nutrición (seguimiento semanal): las kcal de cada día frente al objetivo, la media de kcal y de proteína de los
   días anotados y cuántos quedaron en objetivo. Las cuentas son las de core/calc (nutritionPeriod), las mismas reglas que el
   análisis mensual: un día cuenta como anotado con más de 50 kcal y está en objetivo a ±10 % de las kcal. Es la semana del
   día que se está viendo; al tocar un día se va a él. Las medias no cuentan hoy, que aún no ha terminado.
   Define: DAY_LETTERS, DAY_NAMES, dayNumber, weekDayColumn, weekFigures, nutritionWeekCard  · acciones/registros: 1
*/
import { dayKey, fmtDateShort, roundInt } from '../core/util.js';
import { nutritionPeriod, weekKeys } from '../core/calc.js';
import { A } from '../core/registry.js';
import { nutriDate, S, setNutriDayOffset } from '../core/state.js';
import { R } from '../core/render.js';
import { html } from '../core/html.js';
const DAY_LETTERS = 'LMXJVSD';
const DAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
/* el número de un día (clave AAAA-MM-DD) contando días enteros: para restar dos fechas sin que cuente el cambio de hora */
const dayNumber = k => {
  const [y, m, d] = k.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 864e5;
};
/* la columna de un día: su barra (hasta `top` kcal), su letra y, para quien no ve, lo que dice. `d` es el día de
   nutritionPeriod; `seen`, la clave del día que se está viendo, y `today`, la de hoy (que aún no ha terminado) */
const weekDayColumn = (d, i, top, seen, today) => {
  const kcal = roundInt(d.v[0]);
  /* en objetivo, anotado fuera de objetivo o sin anotar (las clases, enteras: nwd ok · nwd on · nwd) */
  const cls = (d.ok ? 'nwd ok' : d.on ? 'nwd on' : 'nwd') + (d.k == seen ? ' sel' : '');
  const what = !d.on ? 'sin anotar' : d.k == today ? kcal + ' kcal por ahora' : kcal + ' kcal, ' + (d.ok ? 'en objetivo' : 'fuera de objetivo');
  const said = DAY_NAMES[i] + ' ' + (+d.k.slice(8)) + (d.k == today ? ' (hoy)' : '') + ': ' + what;
  return html`<button class="${cls}" data-a="nutritionGoDay" data-v="${d.k}" aria-label="${said}" aria-current="${d.k == seen ? 'date' : 'false'}"><span class="nwt"><i data-style="height:${d.on ? Math.max(4, Math.min(100, d.v[0] / top * 100)) : 0}%"></i></span><small>${DAY_LETTERS[i]}</small></button>`;
};
/* las tres cifras de la semana: kcal y proteína de media (de los días anotados) frente al objetivo, y días en objetivo */
const weekFigures = (p, kcalGoal, proteinGoal) => html`<div class="nws"><div><b>${roundInt(p.avg[0])}</b><small>kcal de media</small><small>Objetivo ${roundInt(kcalGoal)}</small></div><div><b>${roundInt(p.avg[2])} g</b><small>proteína de media</small><small>Objetivo ${roundInt(proteinGoal)} g</small></div><div><b>${p.ok} de ${p.logged}</b><small>${p.logged == 1 ? 'día' : 'días'} en objetivo</small><small>±10 % de las kcal</small></div></div>`;
/** La tarjeta de la semana del día que se ve en Nutrición. Las barras son los siete días; las cifras, solo de los días ya
  terminados: hoy, a medio anotar, bajaría la media sin motivo. */
export const nutritionWeekCard = () => {
  const seen = dayKey(nutriDate());
  const today = dayKey(new Date());
  const keys = weekKeys(nutriDate());
  const n = S.nutritionGoals;
  const kcalGoal = +n.k || 0;
  const week = nutritionPeriod(S.meals, keys, kcalGoal);
  const done = keys.filter(k => k < today);
  const p = nutritionPeriod(S.meals, done, kcalGoal);
  /* la barra más alta: el día que más, o el objetivo y un cuarto más, para que la línea del objetivo quede a la vista */
  const top = Math.max(kcalGoal * 1.25, ...week.days.map(d => d.v[0]), 1);
  const current = keys.includes(today);
  const title = current ? 'Esta semana' : 'Semana del ' + fmtDateShort(keys[0]);
  const logged = p.logged + ' de ' + done.length + (done.length == 1 ? ' día anotado' : ' días anotados');
  const note = !done.length ? (current ? 'Empieza hoy' : 'Aún no ha llegado') : current ? 'Hasta ayer, ' + logged : logged;
  const empty = !done.length ? 'Las medias de la semana salen con los días ya terminados. La línea es tu objetivo de kcal.' : 'Sin comidas anotadas en los días terminados de esta semana. La línea es tu objetivo de kcal.';
  return html`<div class="cd nwk"><div class="row"><b>${title}</b><small>${note}</small></div><div class="nwb">${week.days.map((d, i) => weekDayColumn(d, i, top, seen, today))}<span class="nwl" aria-hidden="true"><i data-style="bottom:${kcalGoal / top * 100}%"></i></span></div>${p.logged ? weekFigures(p, kcalGoal, kcalGoal * (+n.p || 0) / 400) : html`<p class="mu fs-13 m-0">${empty}</p>`}</div>`;
};
/* — manejadores de esta función (registros A / C / U) — */
/* al tocar un día de la semana, Nutrición pasa a ese día (y sube arriba, donde están sus comidas) */
A.nutritionGoDay = (i, b) => {
  const k = b && b.dataset.v;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(k || ''))
    return;
  setNutriDayOffset(dayNumber(k) - dayNumber(dayKey(new Date())));
  R();
  scrollTo(0, 0);
};
