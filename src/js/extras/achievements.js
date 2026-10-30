/* ═══ extras/achievements ═══
   Logros.
   Define: achStats, ACHIEVEMENTS, checkAchievements, achProgress, achievementsPage  · acciones/registros: 1
*/
import { dayKey, fmtDateShort, round1, roundInt } from '../core/util.js';
import { toast } from '../core/toast.js';
import { logError } from '../core/errors.js';
import { A } from '../core/registry.js';
import { S, saveState } from '../core/state.js';
import { icon } from '../core/icons.js';
import { fullPage, pgHead } from '../core/ui.js';
import { weekStats } from '../dashboard/home.js';
import { cardioLogs } from './cardio.js';
import { measureList, photoCount } from './measures.js';
import { html, raw } from '../core/html.js';
function achStats() {
  const L = (S.logs || []).filter(l => l && typeof l.d == 'string');
  const cd = cardioLogs();
  let best = 0;
  try {
    best = weekStats().best;
  }
  catch (e) {
    logError('logros: racha semanal', e);
  }
  return { n: L.length, vol: L.reduce((s, l) => s + (+l.v || 0), 0), st: best, pr: +S.pc || 0, km: cd.reduce((s, l) => s + (+l.c.km || 0), 0), cs: cd.length, wod: L.filter(l => l.k == 'w').length,
    nd: Object.keys(S.meals || {}).filter(k => {
      const m = S.meals[k];
      return m && typeof m == 'object' && Object.values(m).some(a => Array.isArray(a) && a.length);
    }).length,
    ms: measureList().length, ph: photoCount, wl: Array.isArray(S.wl) ? S.wl.length : 0, bk: S.bkd ? 1 : 0 };
}
export const ACHIEVEMENTS = [
  ['e1', 'Primer paso', 'Registra tu primer entreno', 'n', 1], ['e2', 'Constancia', '10 entrenos registrados', 'n', 10], ['e3', 'En forma', '50 entrenos registrados', 'n', 50], ['e4', 'Centenario', '100 entrenos registrados', 'n', 100], ['e5', 'Leyenda', '250 entrenos registrados', 'n', 250],
  ['v1', 'Diez toneladas', 'Mueve 10 toneladas en total', 'vol', 1e4], ['v2', 'Cien toneladas', 'Mueve 100 toneladas en total', 'vol', 1e5], ['v3', 'Quinientas toneladas', 'Mueve 500 toneladas en total', 'vol', 5e5], ['v4', 'Mil toneladas', 'Mueve 1000 toneladas en total', 'vol', 1e6],
  ['s1', 'Racha de un mes', '4 semanas seguidas cumpliendo tu objetivo', 'st', 4], ['s2', 'Racha de un trimestre', '12 semanas seguidas', 'st', 12], ['s3', 'Medio año sin fallar', '26 semanas seguidas', 'st', 26],
  ['p1', 'Primer récord', 'Supera tu mejor marca en un ejercicio', 'pr', 1], ['p2', 'Rompe marcas', '10 récords personales', 'pr', 10], ['p3', 'Imparable', '25 récords personales', 'pr', 25],
  ['c1', 'A moverse', 'Registra una sesión de cardio', 'cs', 1], ['c2', '50 kilómetros', '50 km de cardio en total', 'km', 50], ['c3', '200 kilómetros', '200 km de cardio en total', 'km', 200],
  ['w1', 'Primer WOD', 'Termina un WOD con el temporizador', 'wod', 1], ['w2', 'Veterano del WOD', '10 WOD registrados', 'wod', 10],
  ['n1', 'Diario de comidas', 'Anota comidas durante 7 días', 'nd', 7], ['n2', 'Un mes de registro', 'Anota comidas durante 30 días', 'nd', 30],
  ['m1', 'Primera medición', 'Guarda tus medidas corporales', 'ms', 1], ['f1', 'Primera foto', 'Guarda una foto de progreso', 'ph', 1], ['f2', 'Antes y después', 'Ten al menos 2 fotos de progreso', 'ph', 2],
  ['b1', 'Peso al día', '10 registros de peso corporal', 'wl', 10], ['k1', 'Datos a salvo', 'Guarda una copia de seguridad', 'bk', 1]
];
export function checkAchievements() {
  try {
    const st = achStats();
    const first = !S.ach || typeof S.ach != 'object' || Array.isArray(S.ach);
    const a = first ? {} : S.ach;
    const nw = [];
    ACHIEVEMENTS.forEach(x => {
      if (a[x[0]])
        return;
      if (st[x[3]] >= x[4]) {
        a[x[0]] = first ? '-' : dayKey(new Date);
        if (!first)
          nw.push(x);
      }
    });
    if (first || nw.length) {
      S.ach = a;
      saveState();
    }
    if (nw.length)
      setTimeout(() => toast(nw.length == 1 ? 'Logro: ' + nw[0][1] : 'Logros: ' + nw.slice(0, 2).map(x => x[1]).join(' y ') + (nw.length > 2 ? ' y ' + (nw.length - 2) + ' más' : '')), 1900);
  }
  catch (e) {
    logError('comprobar logros', e);
  }
}
function achProgress(x, st) {
  const v = st[x[3]];
  const t = x[4];
  return x[3] == 'vol' ? roundInt(v / 1000) + ' / ' + roundInt(t / 1000) + ' t' : x[3] == 'km' ? round1(v) + ' / ' + t + ' km' : Math.min(roundInt(v), t) + ' / ' + t;
}
function achievementsPage() {
  const st = achStats();
  const a = S.ach || {};
  const dn = ACHIEVEMENTS.filter(x => a[x[0]]);
  const pd = ACHIEVEMENTS.filter(x => !a[x[0]]);
  const row = (x, on) => html`<div class="f2ac${on ? ' on' : ''}"><span class="f2ai">${icon('trf', 22)}</span><span style="min-width:0"><b>${raw(x[1])}</b><br><small>${raw(x[2])}</small>${on ? '' : html`<div class="bar"><i style="width:${Math.min(100, Math.round(st[x[3]] / x[4] * 100))}%;background:var(--a2)"></i></div>`}</span><small style="white-space:nowrap">${raw(on ? (a[x[0]] && a[x[0]] != '-' ? fmtDateShort(a[x[0]], { day: 'numeric', month: 'short', year: '2-digit' }) : 'Conseguido') : achProgress(x, st))}</small></div>`;
  return html`${pgHead('Logros')}<div class="cd" style="text-align:center"><b style="font-size:32px">${dn.length} de ${ACHIEVEMENTS.length}</b><br><small>logros conseguidos</small><div class="bar" style="margin-top:10px"><i style="width:${Math.round(dn.length / ACHIEVEMENTS.length * 100)}%;background:var(--a2)"></i></div></div>${pd.length ? html`<div class="ph">Por conseguir</div>${raw(pd.map(x => row(x, 0)).join(''))}` : ''}${dn.length ? html`<div class="ph">Conseguidos</div>${raw(dn.map(x => row(x, 1)).join(''))}` : ''}<div style="height:30px"></div>`;
}
A.f2lg = () => {
  checkAchievements();
  fullPage(achievementsPage());
};
