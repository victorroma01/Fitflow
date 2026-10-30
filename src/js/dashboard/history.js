/* ═══ dashboard/history ═══
   Registro de entrenos y calendario.
   Define: calendarPage, logsPage, logIndex, logText, logRight  · acciones/registros: 4
*/
import { $, dayKey, round1, roundInt, X } from '../core/util.js';
import { A } from '../core/registry.js';
import { calMonthOffset, S, saveState, setCalMonthOffset } from '../core/state.js';
import { confirmDialog, fullPage, pgHead, sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { toDisplayWeight, volumeText, weightUnit } from '../profile/units.js';
import { html, raw } from '../core/html.js';
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
  return html`<div class="row"><button data-a="cm" data-i="-1">‹</button><b>${raw(d.toLocaleDateString('es', { month: 'long', year: 'numeric' }))}</b><button data-a="cm" data-i="1">›</button></div><div class="cal" style="margin-top:8px">${'LMXJVSD'.split('').map(x => html`<small>${raw(x)}</small>`)}${raw(c)}</div>`;
}
const logsPage = () => {
  const L = S.logs.map((l, i) => ({ l, i })).reverse();
  const tv = S.logs.reduce((s, l) => s + l.v, 0);
  const tm = S.logs.reduce((s, l) => s + (+l.m || 0), 0);
  let h = html`${pgHead('Registros')}<div class="g2" style="grid-template-columns:repeat(3,1fr);gap:8px"><div class="cd" style="margin:0;text-align:center;padding:12px 6px"><b style="font-size:22px">${S.logs.length}</b><br><small>Entrenos</small></div><div class="cd" style="margin:0;text-align:center;padding:12px 6px"><b style="font-size:22px">${raw(volumeText(tv, 1))}</b><br><small>Volumen</small></div><div class="cd" style="margin:0;text-align:center;padding:12px 6px"><b style="font-size:22px">${round1(tm / 60)} h</b><br><small>Tiempo</small></div></div>`;
  let last = '';
  if (!L.length)
    return html`${raw(h)}<p class="mu" style="margin-top:18px">Aún no hay entrenos guardados. Se registran al pulsar Log out.</p>`;
  L.forEach(o => {
    const d = new Date(o.l.d + 'T00:00:00');
    const m = d.toLocaleDateString('es', { month: 'long', year: 'numeric' });
    if (m != last) {
      last = m;
      h += html`<div class="ph">${m}</div>`;
    }
    h += html`<div class="it exr" data-a="lgx" data-i="${raw(o.i)}" style="cursor:pointer"><span><b>${o.l.n}</b><br><small>${raw(d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }))}${raw(logText(o.l))}</small></span><b>${raw(logRight(o.l))}</b></div>`;
  });
  return html`${raw(h)}<p class="mu" style="font-size:12px;margin-top:14px">Toca un registro para borrarlo.</p>`;
};
A.lg = () => fullPage(logsPage());
A.lgx = i => {
  logIndex = i;
  const l = S.logs[i];
  if (l)
    confirmDialog('¿Borrar este registro?', l.n + ' · ' + l.d, 'lgd', 'Borrar');
};
let logIndex = -1;
A.lgd = () => {
  if (S.logs[logIndex]) {
    S.logs.splice(logIndex, 1);
    saveState();
  }
  logIndex = -1;
  sheet(logsPage());
  R();
};
A.cl2 = () => fullPage(html`${pgHead('Calendario')}<div class="cd" id="cl">${calendarPage()}</div><p class="mu" style="font-size:13px">Los días marcados son los que registraste un entreno.</p>`);
function logText(l) {
  return l.k == 'c' && l.x ? ' · ' + X(l.x) : l.k == 'w' && l.x ? ' · ' + X(l.x) + (l.nt ? ' · ' + X(l.nt) : '') : ' · ' + l.s + ' series · ' + l.m + ' min';
}
function logRight(l) {
  return l.k == 'c' ? (l.c && +l.c.km > 0 ? round1(+l.c.km) + ' km' : l.m + ' min') : l.k == 'w' ? 'WOD' : roundInt(toDisplayWeight(l.v)) + ' ' + weightUnit();
}
/* — manejadores de esta función (registros A / C / U) — */
A.cm = i => {
  setCalMonthOffset(calMonthOffset + i);
  const el = $('#cl');
  /* página Calendario: solo se repinta el mes; en la tarjeta del Dashboard se repinta la pestaña */
  if (el)
    el.innerHTML = calendarPage();
  else
    R();
};
