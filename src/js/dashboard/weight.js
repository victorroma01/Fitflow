/* ═══ dashboard/weight ═══
   Peso corporal y gráfica; debajo de «Registrar peso», el recordatorio de pesaje (dashboard/reminder).
   Define: weekKey, bmiLabel, weightEntry, weightChart, weightSummary, weightPage  · acciones/registros: 4
*/
import { $, dayKey, roundInt } from '../core/util.js';
import { A } from '../core/registry.js';
import { S, saveState, setWeightView } from '../core/state.js';
import { R } from '../core/render.js';
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
const weightEntry = () => html`<div class="cd"><div class="g2"><input id="wv" type="number" inputmode="decimal" placeholder="Peso (kg)" aria-label="Peso"><input id="wd" type="date" value="${dayKey(new Date)}" aria-label="Fecha"></div><button class="pr" data-a="weightAdd" style="width:100%;margin-top:8px">Registrar peso</button></div>`;
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
  const chart = values.length ? html`<svg viewBox="0 0 320 160" width="100%" style="margin-top:10px"><polyline fill="none" stroke="var(--a2)" stroke-width="2.5" stroke-linejoin="round" points="${points.map(p => p.join(',')).join(' ')}"/>${points.map((p, i) => html`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="var(--a1)"/><text x="${p[0]}" y="${p[1] - 8}" font-size="9" text-anchor="middle" fill="var(--mu)">${raw(values[i])}</text>`)}<text x="4" y="154" font-size="9" fill="var(--mu)">${raw(periods[0])}</text><text x="316" y="154" font-size="9" text-anchor="end" fill="var(--mu)">${raw(periods[periods.length - 1])}</text></svg>` : '<p class="mu">Registra tu peso para ver la gráfica.</p>';
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
  return html`<div class="cd"><b>Actual: ${raw(current)} kg</b><div class="g2" style="margin-top:8px"><div><small>Máx. ganado</small><br><b style="color:var(--erx)">+${Math.max(0, Math.max(...all) - first).toFixed(1)} kg</b></div><div><small>Máx. perdido</small><br><b style="color:var(--okx)">−${Math.max(0, first - Math.min(...all)).toFixed(1)} kg</b></div></div>${raw(bmiNote)}</div>`;
};
/** «Evolución del peso» (Dashboard): registrar, el recordatorio de pesaje, la gráfica y el resumen. */
export function weightPage() {
  const log = (S.weightLog || []).slice().sort((a, b) => a.d < b.d ? -1 : 1);
  return html`<div class="hd"><button data-a="weightBack">‹ Atrás</button><h1>Evolución del peso</h1></div>${weightEntry()}${raw(reminderCard())}${weightChart(log, S.weightRange || 0)}${log.length ? weightSummary(log) : ''}`;
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
  saveState();
  R();
};
A.weightAdd = () => {
  const w = +$('#wv').value;
  const d = $('#wd').value;
  if (!w || !d)
    return;
  S.weightLog = (S.weightLog || []).filter(p => p.d != d).concat({ d, w });
  S.biometrics.w = S.weightLog.slice().sort((a, b) => a.d < b.d ? -1 : 1).pop().w;
  applyDiet();
  saveState();
  R();
};
