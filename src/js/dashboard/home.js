/* ═══ dashboard/home ═══
   Pestaña Dashboard: tarjetas de resumen.
   Define: statCell, kcalToday, volumeBars, dashboardBase, recordsCard, weekStats, weekCard, dashboardTab
*/
import { dayKey, roundInt } from '../core/util.js';
import { S } from '../core/state.js';
import { icon } from '../core/icons.js';
import { bestOf } from '../workout/finish.js';
import { calendarPage } from './history.js';
import { progressCard, recordsTimeline } from './progress.js';
import { toDisplayWeight, volumeText, weightUnit } from '../profile/units.js';
import { weighBanner } from './reminder.js';
import { stagnationCard } from '../extras/stagnation.js';
import { cardioCard } from '../extras/cardio.js';
import { html, raw } from '../core/html.js';
import { sessionsPerWeek, trainingDays } from '../workout/week.js';
import { countBetween, dayTotals, weekMonday } from '../core/calc.js';
import { nutritionRecentCard } from '../nutrition/week.js';
/* una cifra del resumen: el número, grande, y qué es */
const statCell = (value, label) => html`<div class="cd"><b class="fs-26">${value}</b><br><small>${raw(label)}</small></div>`;
/* las kcal de hoy */
const kcalToday = now => roundInt(dayTotals(S.meals[dayKey(now)])[0]);
/* el volumen de los 8 últimos entrenos (sin cardio), en columnas */
const volumeBars = logs => {
  const last = logs.filter(l => !l.k).slice(-8);
  const mx = Math.max(1, ...last.map(l => l.v));
  const bars = last.length ? last.map(l => html`<div class="fx-1 bg-ac r-4" data-style="height:${Math.max(6, l.v / mx * 100)}%"></div>`).join('') : '<small>Completa un entreno para ver tu progreso.</small>';
  return html`<div class="cd"><b>Volumen por sesión</b><div class="d-flex ai-end gap-6 h-90 mt-8">${raw(bars)}</div></div>`;
};
function dashboardBase() {
  const lg = S.logs;
  const now = new Date();
  /* hoy y los seis días de antes, por fecha (restando horas, de madrugada entraba un octavo día) */
  const from = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 12));
  const wkc = countBetween(lg, from, dayKey(now));
  const vol = lg.reduce((s, l) => s + l.v, 0);
  const head = html`<div class="hd"><h1>Dashboard</h1><button data-a="openWeight" aria-label="Evolución del peso" class="p-8-12">${icon('dash', 24)}</button></div>`;
  const stats = html`<div class="g2 mt-12">${statCell(lg.length, 'Entrenos totales')}${statCell(raw(wkc), 'Últimos 7 días')}${statCell(raw(volumeText(vol)), 'Volumen total')}${statCell(kcalToday(now), 'kcal hoy')}</div>`;
  return html`${head}${raw(weighBanner())}${stats}${volumeBars(lg)}<div class="cd">${calendarPage()}</div>`;
}
const recordsCard = () => {
  const ks = new Set(Object.keys(S.records || {}).concat(Object.keys(S.exerciseHistory || {})));
  const l = [...ks].map(n => [n, bestOf(n)]).filter(x => x[1]).sort((a, b) => b[1].e - a[1].e).slice(0, 6);
  return html`<div class="cd"><b>Récords personales</b>${raw(l.length ? l.map(x => html`<div class="it cols-1fr-auto"><span>${x[0]}<br><small>${raw(x[1].d)}</small></span><span class="ta-r"><b>${toDisplayWeight(x[1].w)} ${weightUnit()} × ${raw(x[1].r)}</b><br><small>1RM est. ${roundInt(toDisplayWeight(x[1].e))} ${weightUnit()}</small></span></div>`).join('') : '<p class="mu m-8-0-0">Aquí aparecerán tus mejores marcas cuando registres pesos.</p>')}</div>`;
};
export const weekStats = () => {
  const now = new Date();
  const m0 = weekMonday(now);
  const cnt = {};
  const day = {};
  (S.logs || []).forEach(l => {
    if (!l || typeof l.d != 'string')
      return;
    const t = new Date(l.d + 'T12:00:00');
    if (isNaN(t))
      return;
    const k = dayKey(weekMonday(t));
    cnt[k] = (cnt[k] || 0) + 1;
    day[l.d] = 1;
  });
  /* meta de esta semana: sus entrenos del plan; para la racha, los de la semana con menos (en un ciclo cambian: workout/week) */
  const g = Math.max(1, trainingDays(S.week, S.plan || []).length);
  const lo = Math.max(1, sessionsPerWeek(S.plan || [])[0]);
  const t = lo >= 4 ? lo - 1 : lo;
  const at = k => new Date(m0.getFullYear(), m0.getMonth(), m0.getDate() - 7 * k);
  const wk = k => cnt[dayKey(at(k))] || 0;
  let st = wk(0) >= t ? 1 : 0;
  let k = 1;
  while (k < 600 && wk(k) >= t) {
    st++;
    k++;
  }
  let best = 0;
  let run = 0;
  const ks = Object.keys(cnt).sort();
  if (ks.length) {
    const n = Math.min(600, Math.max(0, Math.round((m0 - new Date(ks[0] + 'T12:00:00')) / 6048e5)));
    for (let i = n; i >= 0; i--) {
      if (wk(i) >= t) {
        run++;
        best = Math.max(best, run);
      }
      else if (i > 0)
        run = 0;
    }
  }
  const dots = [...Array(7)].map((_, i) => {
    const d = new Date(m0.getFullYear(), m0.getMonth(), m0.getDate() + i);
    return { l: 'LMXJVSD'[i], on: !!day[dayKey(d)], td: dayKey(d) == dayKey(now), fu: d > now && dayKey(d) != dayKey(now) };
  });
  return { c: wk(0), g, t, st, best: Math.max(best, st), dots, any: !!ks.length };
};
const weekCard = () => {
  const s = weekStats();
  return html`<div class="cd wkc"><div class="row"><b>Esta semana</b><small>${raw(s.c)} de ${s.g}${s.g == 1 ? ' entreno' : ' entrenos'}</small></div><div class="wkd">${s.dots.map(d => html`<span class="${d.on ? 'on ' : ''}${d.td ? 'td ' : ''}${d.fu ? 'fu' : ''}"><i></i>${raw(d.l)}</span>`)}</div><div class="wks"><div><b>${s.st}</b><small>${s.st == 1 ? 'semana de racha' : 'semanas de racha'}</small></div><div><b>${s.best}</b><small>mejor racha</small></div></div><small class="mu wkn">${raw(s.any ? 'La semana cuenta con ' + s.t + ' o más entrenos.' : 'Completa tu primer entreno para empezar la racha.')}</small></div>`;
};
export function dashboardTab() {
  const h = dashboardBase() + recordsCard();
  const m = '<div class="cd"><b>Volumen por sesión</b>';
  return (h.indexOf(m) >= 0 ? h.replace(m, weekCard() + m) : h + weekCard()) + stagnationCard() + cardioCard() + nutritionRecentCard() + progressCard() + recordsTimeline();
}
