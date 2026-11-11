/* ═══ workout/deload ═══
   Semana de descarga (F-18 a F-20): una semana con el 65 % del peso y 2 repeticiones menos, con las mismas series y sin
   técnicas de intensidad (workout/progression y workout/technique la aplican al empezar cada entreno).
   - Cuándo: en los programas predefinidos, según el nivel (cada 6 semanas en principiante, 5 en intermedio y 4 en avanzado);
     en los programas propios, lo que elija el usuario (campo dl del programa: cada 4, 5, 6 u otras N semanas, o 0, nunca).
   - En Workout se avisa en naranja: la semana lleva «· descarga», una tarjeta con «Omitir» y, la primera vez que se abre la
     semana, una hoja con lo que cambia. Omitirla (en cualquier momento) la salta hasta la siguiente del ciclo.
   S.dl: semanas activadas (1) u omitidas (0) a mano · S.dq: semanas en que se dijo «Ahora no» a la sugerencia por esfuerzo ·
   S.dls: última semana de descarga cuya hoja de inicio ya salió.
   Define: DELOAD_DEFAULT, deloadEvery, isDeloadWeek, nextDeload, lastWeek, deloadWeekSync, deloadSuggested, sheetTimer, deloadSheet, deloadCard, deloadStrip, deloadChips  · acciones/registros: 7
*/
import { $ } from '../core/util.js';
import { toast } from '../core/toast.js';
import { A } from '../core/registry.js';
import { S, saveState, W } from '../core/state.js';
import { icon } from '../core/icons.js';
import { dialog, sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { html, raw } from '../core/html.js';
/** Cada cuántas semanas toca la descarga si el programa no dice otra cosa, según el nivel. */
const DELOAD_DEFAULT = { ini: 6, int: 5, ava: 4 };
/** Semanas entre descargas del plan actual (0: nunca). */
const deloadEvery = () => {
  const p = S.cpi >= 0 && S.cp ? S.cp[S.cpi] : null;
  return p && p.dl != null ? +p.dl || 0 : DELOAD_DEFAULT[S.lv] || 5;
};
export const isDeloadWeek = wk => {
  if (S.dl && S.dl[wk] != null)
    return !!S.dl[wk];
  const n = deloadEvery();
  return n > 1 && wk > 1 && wk % n == 0;
};
/** Siguiente semana de descarga después de `wk` (0 si el programa no tiene). */
const nextDeload = wk => {
  const n = deloadEvery();
  if (!(n > 1))
    return 0;
  for (let w = (Math.floor(wk / n) + 1) * n; w < wk + 10 * n; w += n)
    if (isDeloadWeek(w))
      return w;
  return 0;
};
/** Semana del último render: si baja (otro programa, semana reiniciada), se olvida lo elegido a mano en cada semana. */
let lastWeek = 0;
export const deloadWeekSync = () => {
  if (S.wk < lastWeek) {
    S.dl = {};
    S.dq = {};
    S.dls = 0;
  }
  lastWeek = S.wk;
};
const deloadSuggested = () => {
  const l = S.logs.filter(x => !x.k).slice(-2);
  return l.length == 2 && l.every(x => +x.q >= 9);
};
let sheetTimer = 0;
/** Hoja de inicio de la semana de descarga: qué cambia y la opción de omitirla. */
const deloadSheet = () => {
  const n = deloadEvery();
  const sch = !(S.dl && S.dl[S.wk] === 1) && n > 1 && S.wk % n == 0;
  return html`<div class="dlw2"><div class="dli dlbig">${icon('dlw', 30)}</div><h3>Empieza tu semana de descarga</h3><p class="mu">${raw(sch ? 'Es la semana ' + n + ' de tu ciclo. ' : '')}Esta semana entrenas más suave para recuperarte y seguir progresando.</p><div class="dlt"><span>Peso al 65 %</span><span>2 repeticiones menos</span><span>Mismas series</span></div><button class="dlp" data-a="deloadSeen">Entendido</button><button class="dlo" data-a="deloadSkipAsk">Omitir esta descarga</button></div>`;
};
/** Tarjeta naranja de Workout: en la semana de descarga, compacta y con «Omitir»; si no, la sugerencia por esfuerzo alto. */
export const deloadCard = () => {
  if (isDeloadWeek(S.wk)) {
    /* la primera vez que se abre la semana, la hoja de inicio (una vez pintada la pestaña) */
    if (!W && S.dls != S.wk && !sheetTimer)
      sheetTimer = setTimeout(() => {
        sheetTimer = 0;
        /* sin entreno en curso, en Workout y sin otra hoja ni diálogo abiertos */
        if (!W && S.tab == 0 && isDeloadWeek(S.wk) && S.dls != S.wk && !$('#sh .sp') && !$('#dg .dgb')) {
          S.dls = S.wk;
          saveState();
          sheet(deloadSheet());
        }
      }, 400);
    return html`<div class="dl2 dlc2"><button class="dlb" data-a="deloadInfo" aria-label="Semana de descarga: qué cambia"><span class="dli">${icon('dlw', 18)}</span><b>Semana de descarga</b></button><button class="dlo dls" data-a="deloadSkipAsk">Omitir</button></div>`;
  }
  if (S.wk > 1 && deloadSuggested() && !(S.dq && S.dq[S.wk]))
    return '<div class="cd dlc"><b>Esfuerzo muy alto</b><div class="mu" style="font-size:13px;margin-top:4px">Tus dos últimos entrenos han salido con RPE 9 o más. Una semana de descarga ayuda a recuperar y a seguir progresando.</div><div class="g2" style="margin-top:10px"><button data-a="deloadNotNow">Ahora no</button><button class="pr" data-a="deloadOn">Activar descarga</button></div></div>';
  return '';
};
/** Franja del entreno en la semana de descarga. */
export const deloadStrip = () => html`<div class="dlstrip">${icon('dlw', 16)}<span>Semana de descarga · peso al 65 % · 2 repeticiones menos</span></div>`;
/** Elección de la semana de descarga de un programa propio (F-20). `v`: semanas entre descargas (0 nunca; sin valor, según
    el nivel); `k`: a quién se aplica ('d' el programa que se está creando, 'p' el que se está viendo: programs/create). */
export const deloadChips = (v, k) => {
  const ot = v != null && v > 0 && ![4, 5, 6].includes(+v);
  const ch = (x, l) => html`<button class="chip${(x == 'o' ? ot : v != null && +v == +x && !ot) ? ' on' : ''}" data-a="deloadEveryChoose" data-k="${k}" data-v="${x}">${l}</button>`;
  return html`<div class="ph">Semana de descarga</div><div class="cps">${raw(ch(4, 'Cada 4 semanas') + ch(5, 'Cada 5') + ch(6, 'Cada 6') + ch('o', 'Otra') + ch(0, 'Nunca'))}</div>${ot ? html`<div class="dln"><span>Cada</span><input type="number" inputmode="numeric" min="2" max="16" data-c="deloadEveryWeeks" data-k="${k}" value="${raw(v)}" aria-label="Semanas entre descargas"><span>semanas</span></div>` : ''}<p class="mu dlh">Esa semana bajan el peso y las repeticiones, con las mismas series. Si no eliges nada: cada 6 semanas en principiante, 5 en intermedio y 4 en avanzado.</p>`;
};
/* — manejadores de esta función (registros A / C / U) — */
A.deloadOn = () => {
  S.dl = S.dl || {};
  S.dl[S.wk] = 1;
  saveState();
  R();
};
A.deloadNotNow = () => {
  S.dq = S.dq || {};
  S.dq[S.wk] = 1;
  saveState();
  R();
};
A.deloadOnFromSheet = () => {
  A.deloadOn();
  sheet();
  toast('Semana de descarga activada');
};
A.deloadInfo = () => sheet(deloadSheet());
A.deloadSeen = () => {
  S.dls = S.wk;
  saveState();
  sheet();
};
/* omitir la descarga (F-19): esta semana, normal; la siguiente llega cuando vuelva a tocar */
A.deloadSkipAsk = () => {
  const n = nextDeload(S.wk);
  dialog('¿Omitir la semana de descarga?', 'Esta semana entrenarás con tu peso y tus repeticiones normales.' + (n ? ' La próxima descarga llegará en la semana ' + n + '.' : ''), [['Cancelar', 'doNothing', ''], ['Omitir', 'deloadSkip', 'pr dlp']]);
};
A.deloadSkip = () => {
  S.dl = S.dl || {};
  S.dl[S.wk] = 0;
  S.dls = S.wk;
  saveState();
  sheet();
  R();
  const n = nextDeload(S.wk);
  toast('Descarga omitida' + (n ? ' · la próxima, en la semana ' + n : ''));
};
