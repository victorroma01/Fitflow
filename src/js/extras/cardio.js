/* ═══ extras/cardio ═══
   Registro de cardio.
   Define: CARDIO_TYPES, cardioState, cardioLabel, cardioPace, paceLabel, cardioSheet, readCardio, cardioLogs, cardioCard  · acciones/registros: 4
*/
import { clampInt, clampNum, dayKey, fmtClock, round1 } from '../core/util.js';
import { toast } from '../core/toast.js';
import { A, U } from '../core/registry.js';
import { S, saveState } from '../core/state.js';
import { sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { weekMonday } from '../dashboard/home.js';
import { checkAchievements } from './achievements.js';
import { html, raw } from '../core/html.js';
const CARDIO_TYPES = [['run', 'Carrera'], ['walk', 'Caminata'], ['bike', 'Bici'], ['row', 'Remo'], ['swim', 'Natación'], ['ell', 'Elíptica'], ['oth', 'Otro']];
let cardioState = { t: 'run' };
export const cardioLabel = t => (CARDIO_TYPES.find(x => x[0] == t) || CARDIO_TYPES[6])[1];
export function cardioPace(t, km, sec) {
  if (!(km > 0 && sec > 0))
    return '';
  if (t == 'bike' || t == 'ell' || t == 'oth')
    return round1(km / (sec / 3600)) + ' km/h';
  if (t == 'row')
    return fmtClock(sec / (km * 2)) + ' /500 m';
  if (t == 'swim')
    return fmtClock(sec / (km * 10)) + ' /100 m';
  return fmtClock(sec / km) + ' /km';
}
const paceLabel = t => t == 'bike' || t == 'ell' || t == 'oth' ? 'Velocidad media' : 'Ritmo';
function cardioSheet() {
  const t = cardioState.t;
  const td = dayKey(new Date);
  return html`<h3>Registrar cardio</h3><div>${CARDIO_TYPES.map(x => html`<button class="chip ${t == x[0] ? 'on' : ''}" data-a="cdt" data-v="${raw(x[0])}">${raw(x[1])}</button>`)}</div><label>Fecha</label><input id="f2cdd" type="date" value="${raw(td)}" max="${raw(td)}"><div class="g2"><div><label>Distancia (km, opcional)</label><input id="f2cdk" type="number" inputmode="decimal" step="0.01" min="0" max="1000" placeholder="0" data-u="cdp"></div><div><label>Tiempo (min y s)</label><div class="g2" style="gap:6px"><input id="f2cdm" type="number" inputmode="numeric" min="0" max="999" placeholder="min" data-u="cdp"><input id="f2cds" type="number" inputmode="numeric" min="0" max="59" placeholder="s" data-u="cdp"></div></div></div><div class="cd" style="margin:12px 0 0;text-align:center"><small id="f2cdl" class="mu">${paceLabel(t)}</small><br><b id="f2cdr" style="font-size:22px">—</b></div><button class="pr" data-a="cdsv" style="width:100%;margin-top:12px">Guardar</button>`;
}
function readCardio() {
  const g = id => document.getElementById(id);
  const km = clampNum(g('f2cdk') && g('f2cdk').value, 0, 1000, 0);
  const mn = clampInt(g('f2cdm') && g('f2cdm').value, 0, 999, 0);
  const sc = clampInt(g('f2cds') && g('f2cds').value, 0, 59, 0);
  return { km: Math.round(km * 100) / 100, sec: mn * 60 + sc, d: (g('f2cdd') || {}).value || dayKey(new Date) };
}
U.cdp = () => {
  const r = readCardio();
  const e = document.getElementById('f2cdr');
  if (e)
    e.textContent = cardioPace(cardioState.t, r.km, r.sec) || '—';
};
A.cardio = () => {
  cardioState = { t: cardioState.t || 'run' };
  sheet(cardioSheet());
};
A.cdt = (i, b) => {
  const r = readCardio();
  cardioState.t = b.dataset.v;
  sheet(cardioSheet());
  const g = id => document.getElementById(id);
  if (r.km)
    g('f2cdk').value = r.km;
  if (r.sec) {
    g('f2cdm').value = Math.floor(r.sec / 60);
    g('f2cds').value = r.sec % 60;
  }
  if (r.d)
    g('f2cdd').value = r.d;
  U.cdp();
};
A.cdsv = () => {
  const r = readCardio();
  if (r.sec < 60) {
    toast('Indica al menos 1 minuto');
    return;
  }
  const d = /^\d{4}-\d{2}-\d{2}$/.test(r.d) && r.d <= dayKey(new Date) ? r.d : dayKey(new Date);
  const pc = cardioPace(cardioState.t, r.km, r.sec);
  const x = (r.km ? round1(r.km) + ' km · ' : '') + fmtClock(r.sec) + (pc ? ' · ' + pc : '');
  S.logs.push({ d, n: 'Cardio · ' + cardioLabel(cardioState.t), v: 0, s: 0, m: Math.max(1, Math.round(r.sec / 60)), q: 0, k: 'c', x, c: { t: cardioState.t, km: r.km, sec: r.sec } });
  S.logs.sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
  saveState();
  sheet();
  toast('Cardio guardado');
  checkAchievements();
  R();
};
export function cardioLogs() {
  return (S.logs || []).filter(l => l && l.k == 'c' && l.c && typeof l.c == 'object' && typeof l.d == 'string');
}
export function cardioCard() {
  try {
    const L = cardioLogs();
    if (!L.length)
      return '';
    const m0 = weekMonday(new Date());
    const wk = k => dayKey(new Date(m0.getFullYear(), m0.getMonth(), m0.getDate() - 7 * k));
    const W4 = [3, 2, 1, 0].map(k => {
      const key = wk(k);
      const a = L.filter(l => dayKey(weekMonday(new Date(l.d + 'T12:00:00'))) == key);
      return { k, n: a.length, km: a.reduce((s, l) => s + (+l.c.km || 0), 0), sec: a.reduce((s, l) => s + (+l.c.sec || 0), 0) };
    });
    const cur = W4[3];
    const mx = Math.max(1, ...W4.map(w => w.km || w.sec / 600));
    const tot = L.reduce((s, l) => s + (+l.c.km || 0), 0);
    return html`<div class="cd"><div class="row"><b>Cardio</b><small>${round1(tot)} km en total</small></div><div class="f2cs"><div><b>${round1(cur.km)}</b><small>km esta semana</small></div><div><b>${raw(fmtClock(cur.sec))}</b><small>tiempo</small></div><div><b>${raw(cur.n)}</b><small>${cur.n == 1 ? 'sesión' : 'sesiones'}</small></div></div><div class="f2bars">${W4.map(w => html`<div><i style="height:${Math.max(4, Math.round((w.km || w.sec / 600) / mx * 56))}px"></i><small>${raw(w.k ? '−' + w.k + ' sem' : 'Ahora')}</small></div>`)}</div></div>`;
  }
  catch (e) {
    return '';
  }
}
