/* ═══ dashboard/history ═══
   Registro de entrenos y calendario.
   Define: MONTH_YEAR, WEEKDAY_DAY, calendarPage, logsPage, logSeries, dropSeries, logIndex, logText, logRight  · acciones/registros: 5
*/
import { $, dayKey, fmtDate, fmtDateShort, round1, roundInt, X } from '../core/util.js';
import { A } from '../core/registry.js';
import { calMonthOffset, S, saveState, setCalMonthOffset } from '../core/state.js';
import { confirmDialog, fullPage, pgHead, sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { toDisplayWeight, volumeText, weightUnit } from '../profile/units.js';
import { html, raw } from '../core/html.js';
import { bestLift } from '../core/calc.js';
/* «noviembre de 2026» y «jue, 12 nov» */
const MONTH_YEAR = { month: 'long', year: 'numeric' };
const WEEKDAY_DAY = { weekday: 'short', day: 'numeric', month: 'short' };
export function calendarPage() {
  const b = new Date();
  const d = new Date(b.getFullYear(), b.getMonth() + calMonthOffset, 1);
  const n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const o = (d.getDay() + 6) % 7;
  const ds = new Set(S.logs.map(l => l.d));
  let c = '';
  for (let i = 0; i < o; i++)
    c += '<i></i>';
  for (let i = 1; i <= n; i++)
    c += html`<i class="${ds.has(dayKey(new Date(d.getFullYear(), d.getMonth(), i))) ? 'on' : ''}">${i}</i>`;
  return html`<div class="row"><button data-a="calendarMonth" data-i="-1" aria-label="Mes anterior" class="tz">‹</button><b>${fmtDate(d, MONTH_YEAR)}</b><button data-a="calendarMonth" data-i="1" aria-label="Mes siguiente" class="tz">›</button></div><div class="cal mt-8">${'LMXJVSD'.split('').map(x => html`<small>${raw(x)}</small>`)}${raw(c)}</div>`;
}
const logsPage = () => {
  const L = S.logs.map((l, i) => ({ l, i })).reverse();
  const tv = S.logs.reduce((s, l) => s + l.v, 0);
  const tm = S.logs.reduce((s, l) => s + (+l.m || 0), 0);
  let h = html`${pgHead('Registros')}<div class="g2 cols-3 gap-8"><div class="cd m-0 ta-c p-12-6"><b class="fs-22">${S.logs.length}</b><br><small>Entrenos</small></div><div class="cd m-0 ta-c p-12-6"><b class="fs-22">${raw(volumeText(tv, 1))}</b><br><small>Volumen</small></div><div class="cd m-0 ta-c p-12-6"><b class="fs-22">${round1(tm / 60)} h</b><br><small>Tiempo</small></div></div>`;
  let last = '';
  if (!L.length)
    return html`${raw(h)}<p class="mu mt-18">Aún no hay entrenos guardados. Se registran al pulsar Log out.</p>`;
  L.forEach(o => {
    const m = fmtDateShort(o.l.d, MONTH_YEAR);
    if (m != last) {
      last = m;
      h += html`<div class="ph">${m}</div>`;
    }
    h += html`<div class="it exr cur-pointer" data-a="logDeleteAsk" data-i="${o.i}" role="button" tabindex="0"><span><b>${o.l.n}</b><br><small>${fmtDateShort(o.l.d, WEEKDAY_DAY)}${raw(logText(o.l))}</small></span><b>${raw(logRight(o.l))}</b></div>`;
  });
  return html`${raw(h)}<p class="mu fs-12 mt-14">Toca un registro para borrarlo.</p>`;
};
A.openLogs = () => fullPage(logsPage());
/** Las series que guardó el entreno `l` en el historial de ejercicios: [[ejercicio, entrada], …]. Las de la V1.0.3 en adelante
    llevan la marca de su entreno (t); las de antes son las de ese día, si ese día no hay otro entreno sin marca (con dos, no se
    puede saber de cuál son: null). El cardio y los WOD no tienen series. */
const logSeries = l => {
  if (!l || l.k)
    return [];
  const H = S.exerciseHistory || {};
  const all = pick => Object.keys(H).flatMap(n => (Array.isArray(H[n]) ? H[n] : []).filter(pick).map(x => [n, x]));
  if (l.t)
    return all(x => x.t === l.t);
  if (S.logs.filter(x => x && !x.k && !x.t && x.d == l.d).length > 1)
    return null;
  return all(x => !x.t && x.d == l.d);
};
/* quita del historial las series de un entreno y pone al día lo que salía de ellas: la mejor marca de cada ejercicio (si era
   de ese día, se busca otra vez en lo que queda) y su último peso */
const dropSeries = (series, day) => {
  const H = S.exerciseHistory;
  new Set(series.map(x => x[0])).forEach(n => {
    const gone = new Set(series.filter(x => x[0] == n).map(x => x[1]));
    const h = H[n].filter(x => !gone.has(x));
    if (h.length)
      H[n] = h;
    else
      delete H[n];
    const r = S.records && S.records[n];
    if (r && r.d == day) {
      const b = bestLift(null, h);
      if (b)
        S.records[n] = b;
      else
        delete S.records[n];
    }
    const withWeight = h.find(x => x.s.some(s => +s[1] > 0));
    if (withWeight)
      S.lastWeights[n] = +withWeight.s.filter(s => +s[1] > 0).pop()[1];
    else
      delete S.lastWeights[n];
  });
};
A.logDeleteAsk = i => {
  logIndex = i;
  const l = S.logs[i];
  if (!l)
    return;
  /* un entreno se borra con sus series: si no, sus pesos seguirían en los récords, las gráficas y la progresión */
  const series = logSeries(l);
  const n = series ? new Set(series.map(x => x[0])).size : 0;
  const also = !series ? ' Sus series se quedan en el historial: ese día hay otro entreno y no se sabe de cuál son.' : n ? ' También se borran sus series (' + n + (n == 1 ? ' ejercicio' : ' ejercicios') + '): los récords y las gráficas se recalculan.' : '';
  confirmDialog('¿Borrar este registro?', html`${l.n} · ${l.d}.${also}`, 'logDelete', 'Borrar');
};
let logIndex = -1;
A.logDelete = () => {
  const l = S.logs[logIndex];
  if (l) {
    dropSeries(logSeries(l) || [], l.d);
    S.logs.splice(logIndex, 1);
    saveState();
  }
  logIndex = -1;
  sheet(logsPage());
  R();
};
A.openCalendar = () => fullPage(html`${pgHead('Calendario')}<div class="cd" id="cl">${calendarPage()}</div><p class="mu fs-13">Los días marcados son los que registraste un entreno.</p>`);
function logText(l) {
  return l.k == 'c' && l.x ? ' · ' + X(l.x) : l.k == 'w' && l.x ? ' · ' + X(l.x) + (l.nt ? ' · ' + X(l.nt) : '') : ' · ' + l.s + ' series · ' + l.m + ' min';
}
function logRight(l) {
  return l.k == 'c' ? (l.c && +l.c.km > 0 ? round1(+l.c.km) + ' km' : l.m + ' min') : l.k == 'w' ? 'WOD' : roundInt(toDisplayWeight(l.v)) + ' ' + weightUnit();
}
/* — manejadores de esta función (registros A / C / U) — */
A.calendarMonth = i => {
  setCalMonthOffset(calMonthOffset + i);
  const el = $('#cl');
  /* página Calendario: solo se repinta el mes; en la tarjeta del Dashboard se repinta la pestaña */
  if (el)
    el.innerHTML = calendarPage();
  else
    R();
};
