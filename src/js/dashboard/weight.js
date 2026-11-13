/* ═══ dashboard/weight ═══
   Peso corporal y gráfica; debajo de «Registrar peso», el recordatorio de pesaje (dashboard/reminder).
   Define: weekKey, bmiLabel, weightEntry, weightChart, weightSummary, weightHistory, weightLogSorted, weightPage, weightDeleting  · acciones/registros: 6
*/
import { $, dayKey, fmtDateShort, roundInt, typedNum } from '../core/util.js';
import { toast } from '../core/toast.js';
import { A } from '../core/registry.js';
import { S, saveState, setWeightView } from '../core/state.js';
import { R } from '../core/render.js';
import { confirmDialog } from '../core/ui.js';
import { applyDiet } from '../nutrition/diet.js';
import { reminderCard } from './reminder.js';
import { html, raw } from '../core/html.js';
const weekKey = s => {
  const d = new Date(s + 'T00:00:00');
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return dayKey(d);
};
const bmiLabel = v => v < 18.5 ? 'Delgadez' : v < 25 ? 'Peso correcto' : v < 30 ? 'Sobrepeso moderado' : 'Sobrepeso extremo';
/* registrar un peso: kg y fecha */
const weightEntry = () => html`<div class="cd"><div class="g2"><input id="wv" type="number" inputmode="decimal" min="30" max="300" step="0.1" placeholder="Peso (kg)" aria-label="Peso"><input id="wd" type="date" value="${dayKey(new Date)}" max="${dayKey(new Date)}" aria-label="Fecha"></div><button class="pr w-full mt-8" data-a="weightAdd">Registrar peso</button></div>`;
/* la gráfica: el último peso de cada semana, mes o año (las 12 últimas, o 5 años), con su valor encima de cada punto */
const weightChart = (log, range) => {
  const periodOf = d => range == 2 ? d.slice(0, 4) : range == 1 ? d.slice(0, 7) : weekKey(d);
  const lastOf = {};
  log.forEach(p => lastOf[periodOf(p.d)] = p.w);
  const periods = Object.keys(lastOf).sort().slice(range == 2 ? -5 : -12);
  const values = periods.map(k => lastOf[k]);
  const lo = Math.min(...values) - 1;
  const hi = Math.max(...values) + 1;
  const points = values.map((y, i) => [periods.length > 1 ? 20 + i * 280 / (periods.length - 1) : 160, 130 - (y - lo) / (hi - lo) * 110]);
  const chart = values.length ? html`<svg viewBox="0 0 320 160" width="100%" class="mt-10"><polyline fill="none" stroke="var(--a2)" stroke-width="2.5" stroke-linejoin="round" points="${points.map(p => p.join(',')).join(' ')}"/>${points.map((p, i) => html`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="var(--a1)"/><text x="${p[0]}" y="${p[1] - 8}" font-size="9" text-anchor="middle" fill="var(--mu)">${values[i]}</text>`)}<text x="4" y="154" font-size="9" fill="var(--mu)">${periods[0]}</text><text x="316" y="154" font-size="9" text-anchor="end" fill="var(--mu)">${periods[periods.length - 1]}</text></svg>` : '<p class="mu">Registra tu peso para ver la gráfica.</p>';
  return html`<div class="cd"><div>${['Semanas', 'Meses', 'Años'].map((x, i) => html`<button class="chip${range == i ? ' on' : ''}" data-a="weightRange" data-i="${i}">${raw(x)}</button>`)}</div>${raw(chart)}</div>`;
};
/* el peso actual, lo más ganado y perdido desde el primero y el IMC con su clasificación (OMS), si hay altura */
const weightSummary = log => {
  const height = +S.biometrics.h;
  const current = log[log.length - 1].w;
  const first = log[0].w;
  const all = log.map(p => p.w);
  const bmi = height && current ? current / ((height / 100) ** 2) : 0;
  const bmiNote = bmi ? html`<p><b>IMC ${bmi.toFixed(1)} · ${bmiLabel(bmi)}</b><br><small>Peso saludable para tu altura (OMS): ${roundInt(18.5 * (height / 100) ** 2)}-${roundInt(24.9 * (height / 100) ** 2)} kg. El IMC puede sobrestimar el sobrepeso en personas con mucha masa muscular.</small></p>` : '<p class="mu"><small>Añade tu altura en Perfil para clasificar tu peso según el IMC (OMS).</small></p>';
  return html`<div class="cd"><b>Actual: ${+current} kg</b><div class="g2 mt-8"><div><small>Máx. ganado</small><br><b class="c-erx">+${Math.max(0, Math.max(...all) - first).toFixed(1)} kg</b></div><div><small>Máx. perdido</small><br><b class="c-okx">−${Math.max(0, first - Math.min(...all)).toFixed(1)} kg</b></div></div>${raw(bmiNote)}</div>`;
};
/* el historial de pesajes, del más reciente al más antiguo: al tocar uno se borra (uno mal anotado descuadra la gráfica, el
   IMC y los objetivos de kcal, y no había forma de quitarlo) */
const weightHistory = log => html`<details class="cd"><summary>Historial (${log.length})</summary>${log.slice().reverse().map(p => html`<div class="it exr cur-pointer" data-a="weightDeleteAsk" data-v="${p.d}" role="button" tabindex="0"><span><b>${fmtDateShort(p.d, { day: 'numeric', month: 'long', year: 'numeric' })}</b></span><b>${+p.w} kg</b></div>`)}<p class="mu fs-12 m-8-0-0">Toca un pesaje para borrarlo.</p></details>`;
/* los pesajes, del más antiguo al más reciente */
const weightLogSorted = () => (S.weightLog || []).slice().sort((a, b) => a.d < b.d ? -1 : 1);
/** «Evolución del peso» (Dashboard): registrar, el recordatorio de pesaje, la gráfica, el resumen y el historial. */
export function weightPage() {
  const log = weightLogSorted();
  return html`<div class="hd"><button data-a="weightBack">‹ Atrás</button><h1>Evolución del peso</h1></div>${weightEntry()}${raw(reminderCard())}${weightChart(log, S.weightRange || 0)}${log.length ? html`${weightSummary(log)}${weightHistory(log)}` : ''}`;
}
A.openWeight = () => {
  setWeightView(1);
  R();
};
A.weightBack = () => {
  setWeightView(0);
  R();
};
A.weightRange = i => {
  S.weightRange = i;
  saveState('core');
  R();
};
A.weightAdd = () => {
  const w = Math.round(typedNum($('#wv').value) * 100) / 100;
  const d = $('#wd').value;
  /* un peso imposible o una fecha que aún no ha llegado descuadrarían la gráfica, el IMC y los objetivos de kcal */
  if (!(w >= 30 && w <= 300)) {
    toast('Escribe tu peso en kg (entre 30 y 300)');
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d > dayKey(new Date)) {
    toast('La fecha no puede ser posterior a hoy');
    return;
  }
  S.weightLog = (S.weightLog || []).filter(p => p.d != d).concat({ d, w });
  S.biometrics.w = weightLogSorted().pop().w;
  applyDiet();
  saveState('core');
  R();
};
/* el pesaje que se va a borrar (su fecha), mientras se pregunta */
let weightDeleting = '';
A.weightDeleteAsk = (i, b) => {
  const p = (S.weightLog || []).find(x => x.d == b.dataset.v);
  if (!p)
    return;
  weightDeleting = p.d;
  confirmDialog('¿Borrar este pesaje?', html`${fmtDateShort(p.d, { day: 'numeric', month: 'long', year: 'numeric' })} · ${+p.w} kg`, 'weightDelete', 'Borrar');
};
/* al borrarlo, el peso del perfil (y con él los objetivos calculados) pasa a ser el del último pesaje que quede */
A.weightDelete = () => {
  S.weightLog = (S.weightLog || []).filter(p => p.d != weightDeleting);
  weightDeleting = '';
  const last = weightLogSorted().pop();
  if (last) {
    S.biometrics.w = last.w;
    applyDiet();
  }
  saveState('core');
  R();
};
