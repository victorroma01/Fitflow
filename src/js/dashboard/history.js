/* ═══ dashboard/history ═══
   Registro de entrenos y calendario.
   Define: MONTH_YEAR, WEEKDAY_DAY, calendarPage, LOGS_STEP, logsShown, logsList, logRows, logsPage, watchLogsEnd, logSeries, dropSeries, logIndex, logText, logRight  · acciones/registros: 6
*/
import { say } from '../core/i18n.js';
import { $, DAY_LETTERS, dayKey, fmtDate, fmtDateShort, round1, roundInt, X } from '../core/util.js';
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
  return html`
    <div class="row">
      <button data-a="calendarMonth" data-i="-1" aria-label="Mes anterior" class="touch-target">‹</button>
      <b>${fmtDate(d, MONTH_YEAR)}</b>
      <button data-a="calendarMonth" data-i="1" aria-label="Mes siguiente" class="touch-target">›</button>
    </div>
    <div class="calendar mt-8">${DAY_LETTERS.split('').map(x => html`<small>${raw(x)}</small>`)}${raw(c)}</div>`;
}
/* Registros pinta los entrenos por tandas: LOGS_STEP al abrirla y otros tantos al llegar al final (o al tocar «Ver más
   registros»), para que abrirla no tarde más cuantos más entrenos haya. logsShown: los que están pintados (al borrar uno, la
   página se vuelve a pintar hasta ahí, sin perder el sitio); logsList: el orden de la página, para pintar la tanda siguiente. */
const LOGS_STEP = 60;
let logsShown = LOGS_STEP;
let logsList = [];
/* las filas de los entrenos de L de la posición a a la b, con el mes encima del primero de cada mes */
const logRows = (L, a, b) => {
  let h = '';
  let last = a ? fmtDateShort(L[a - 1].l.d, MONTH_YEAR) : '';
  for (let k = a; k < b; k++) {
    const o = L[k];
    const m = fmtDateShort(o.l.d, MONTH_YEAR);
    if (m != last) {
      last = m;
      h += html`<div class="section-label">${m}</div>`;
    }
    h += html`
      <div class="item item-split cur-pointer" data-a="logDeleteAsk" data-i="${o.i}" role="button" tabindex="0">
        <span><b>${o.l.n}</b><br><small>${fmtDateShort(o.l.d, WEEKDAY_DAY)}${raw(logText(o.l))}</small></span>
        <b>${raw(logRight(o.l))}</b>
      </div>`;
  }
  return h;
};
const logsPage = () => {
  /* del día más reciente al más antiguo y, dentro de un día, el último que se guardó primero: un cardio se puede apuntar con
     la fecha de otro día, y no por guardarse el último es el más reciente */
  const L = S.logs.map((l, i) => ({ l, i })).reverse().sort((a, b) => a.l.d < b.l.d ? 1 : a.l.d > b.l.d ? -1 : 0);
  const tv = S.logs.reduce((s, l) => s + l.v, 0);
  const tm = S.logs.reduce((s, l) => s + (+l.m || 0), 0);
  let h = html`
    ${pgHead('Registros')}
    <div class="grid-2 cols-3 gap-8">
      <div class="card m-0 ta-c p-12-6"><b class="fs-22">${S.logs.length}</b><br><small>Entrenos</small></div>
      <div class="card m-0 ta-c p-12-6"><b class="fs-22">${raw(volumeText(tv, 1))}</b><br><small>Volumen</small></div>
      <div class="card m-0 ta-c p-12-6"><b class="fs-22">${round1(tm / 60)} h</b><br><small>Tiempo</small></div>
    </div>`;
  logsList = L;
  if (!L.length)
    return html`${raw(h)}<p class="muted mt-18">Aún no hay entrenos guardados. Se registran al pulsar «Guardar entreno».</p>`;
  const n = Math.min(L.length, Math.max(LOGS_STEP, logsShown));
  logsShown = n;
  h += logRows(L, 0, n);
  if (n < L.length)
    h += html`<button class="w-full mt-8" data-a="logsMore" id="logs-more">Ver más registros</button>`;
  return html`${raw(h)}<p class="muted fs-12 mt-14">Toca un registro para borrarlo.</p>`;
};
/* al acercarse al final de lo pintado (600 px antes), la tanda siguiente sola; sin IntersectionObserver, con el botón */
const watchLogsEnd = () => {
  const b = $('#logs-more');
  if (!b || typeof IntersectionObserver != 'function')
    return;
  const io = new IntersectionObserver(es => {
    if (!b.isConnected)
      return io.disconnect();
    if (!es[es.length - 1].isIntersecting)
      return;
    A.logsMore();
    /* si el botón sigue a la vista (una tanda corta), volver a mirarlo da otro aviso; si ya no está, se acabó */
    io.unobserve(b);
    if (b.isConnected)
      io.observe(b);
    else
      io.disconnect();
  }, { root: b.closest('.sheet'), rootMargin: '0px 0px 600px 0px' });
  io.observe(b);
};
A.openLogs = () => {
  logsShown = LOGS_STEP;
  fullPage(logsPage());
  watchLogsEnd();
};
/* la tanda siguiente de Registros, antes del botón; si los entrenos han cambiado mientras (una sincronización), la página
   entera otra vez, hasta donde se había llegado y una tanda más */
A.logsMore = () => {
  const b = $('#logs-more');
  if (!b)
    return;
  const L = logsList;
  const a = logsShown;
  const to = Math.min(L.length, a + LOGS_STEP);
  if (L.length != S.logs.length || L.some(o => S.logs[o.i] !== o.l)) {
    logsShown = to;
    sheet(logsPage());
    watchLogsEnd();
    return;
  }
  const focused = document.activeElement == b;
  b.insertAdjacentHTML('beforebegin', logRows(L, a, to));
  logsShown = to;
  if (to < L.length)
    return;
  b.remove();
  if (focused) {
    const row = document.querySelectorAll('#sh [data-a=logDeleteAsk]')[a];
    if (row instanceof HTMLElement)
      row.focus();
  }
};
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
  const also = !series ? ' Sus series se quedan en el historial: ese día hay otro entreno y no se sabe de cuál son.' : n ? say ` También se borran sus series (${n}${n == 1 ? ' ejercicio' : ' ejercicios'}): los récords y las gráficas se recalculan.` : '';
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
  watchLogsEnd();
  R();
};
A.openCalendar = () => fullPage(html`
  ${pgHead('Calendario')}
  <div class="card" id="cl">${calendarPage()}</div>
  <p class="muted fs-13">Los días marcados son los que registraste un entreno.</p>`);
function logText(l) {
  return l.k == 'c' && l.x ? ' · ' + X(l.x) : l.k == 'w' && l.x ? ' · ' + X(l.x) + (l.nt ? ' · ' + X(l.nt) : '') : say ` · ${l.s} series · ${l.m} min`;
}
function logRight(l) {
  return l.k == 'c' ? (l.c && +l.c.km > 0 ? say `${round1(+l.c.km)} km` : say `${l.m} min`) : l.k == 'w' ? 'WOD' : roundInt(toDisplayWeight(l.v)) + ' ' + weightUnit();
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
