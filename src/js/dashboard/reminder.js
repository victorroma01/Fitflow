/* ═══ dashboard/reminder ═══
   Recordatorio de pesaje (F-25, T-13). En Evolución del peso, junto a «Registrar peso», se activa un aviso cada 2 semanas,
   4 semanas, un mes, 5 semanas o el intervalo que se elija. Cuando toca («Día de pesarse»), la app lo dice al abrirse o al volver
   a ella (una vez al día, con «Mañana» para posponerlo) y con una tarjeta arriba del Dashboard hasta que se registra el peso; el
   ciclo empieza de nuevo con cada pesaje. Sin servidor no hay notificaciones con la app cerrada (docs/tecnica/backend.md): para
   eso, «Añadir al calendario» crea un evento que se repite, con su aviso, en el calendario del móvil (archivo .ics).
   Estado: S.wr = { n, u: 'd' | 'w' | 'm' (días, semanas, meses), t: cuándo se activó (ms), sh: último día en que se avisó,
   sn: pospuesto hasta ese día, c: id del evento del calendario }.
   Define: WEIGH_STEPS, WEIGH_UNITS, weighCustom, weighEvery, addStep, lastWeighIn, weighNext, weighDue, weighBanner, reminderCard, checkWeighIn, icsText, weighIcs  · acciones/registros: 7
*/
import { $, dayKey, fmtDateShort, newId } from '../core/util.js';
import { toast } from '../core/toast.js';
import { A, C } from '../core/registry.js';
import { S, saveState, setWeightView, W } from '../core/state.js';
import { icon } from '../core/icons.js';
import { dialog, sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { signedIn } from '../cloud/session.js';
import { downloadFile } from '../system/files.js';
import { html, raw } from '../core/html.js';
/** Intervalos de la lista: [cantidad, unidad, texto]. */
const WEIGH_STEPS = [[2, 'w', '2 semanas'], [4, 'w', '4 semanas'], [1, 'm', '1 mes'], [5, 'w', '5 semanas']];
/** Unidades de «Otro»: [singular, plural, máximo]. */
export const WEIGH_UNITS = { d: ['día', 'días', 90], w: ['semana', 'semanas', 26], m: ['mes', 'meses', 12] };
/* 1 tras tocar «Otro»: se ven la cantidad y la unidad aunque coincidan con uno de la lista */
let weighCustom = 0;
/** Lo que va tras «cada»: «2 semanas», «mes», «10 días». */
const weighEvery = r => r.n == 1 ? WEIGH_UNITS[r.u][0] : r.n + ' ' + WEIGH_UNITS[r.u][1];
/** El día (AAAA-MM-DD) que cae un intervalo `r` después de `d`; un mes después del 31 es el último día del mes siguiente. */
const addStep = (d, r) => {
  const t = new Date(d + 'T12:00:00');
  if (r.u == 'm') {
    const day = t.getDate();
    t.setDate(1);
    t.setMonth(t.getMonth() + r.n);
    t.setDate(Math.min(day, new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()));
  }
  else
    t.setDate(t.getDate() + r.n * (r.u == 'w' ? 7 : 1));
  return dayKey(t);
};
/** Día del último pesaje registrado, o '' si no hay ninguno. */
const lastWeighIn = () => (S.wl || []).reduce((m, p) => p && typeof p.d == 'string' && p.d > m ? p.d : m, '');
/** Día en que toca pesarse (AAAA-MM-DD), o '' sin recordatorio: un intervalo después del último pesaje o, si es posterior, del
    día en que se activó el aviso. */
const weighNext = () => {
  const r = S.wr;
  if (!r)
    return '';
  const on = +r.t > 0 ? dayKey(new Date(+r.t)) : '';
  const base = [lastWeighIn(), on].sort().pop();
  return base ? addStep(base, r) : '';
};
/** ¿Toca pesarse hoy (y no se ha dejado para mañana)? */
export const weighDue = () => {
  const n = weighNext();
  const today = dayKey(new Date());
  return !!n && n <= today && !(S.wr.sn && S.wr.sn > today);
};
/** Tarjeta de arriba del Dashboard mientras toca pesarse. */
export const weighBanner = () => {
  if (!weighDue())
    return '';
  const l = lastWeighIn();
  return html`<div class="cd wrb" role="status"><span class="wri">${icon('scale', 26)}</span><span><b>Día de pesarse</b><small>${l ? 'Último pesaje: ' + fmtDateShort(l) + ' · ' : ''}cada ${weighEvery(S.wr)}</small></span><button class="pr" data-a="wrgo">Registrar</button></div>`;
};
/** Tarjeta del recordatorio en Evolución del peso, debajo de «Registrar peso». */
export const reminderCard = () => {
  const r = S.wr;
  if (!r)
    return html`<div class="cd wrc"><label class="srk"><input type="checkbox" data-c="wron"> Recordatorio de pesaje</label><p class="mu wrt">Te avisamos cuando toque pesarte: cada 2 semanas, 4 semanas, un mes, 5 semanas o cada lo que elijas.</p></div>`;
  const cur = weighCustom ? -1 : WEIGH_STEPS.findIndex(x => x[0] == r.n && x[1] == r.u);
  const nx = weighNext();
  const u = WEIGH_UNITS[r.u];
  const other = cur < 0 ? html`<div class="g2 wro"><input type="number" inputmode="numeric" min="1" max="${u[2]}" value="${r.n}" data-c="wrn" aria-label="Cada cuántos"><select data-c="wru" aria-label="Unidad">${Object.keys(WEIGH_UNITS).map(k => html`<option value="${k}"${k == r.u ? ' selected' : ''}>${WEIGH_UNITS[k][1]}</option>`)}</select></div>` : '';
  return html`<div class="cd wrc"><label class="srk"><input type="checkbox" data-c="wron" checked> Recordatorio de pesaje</label><div class="wrs" role="radiogroup" aria-label="Cada cuánto">${WEIGH_STEPS.map((x, i) => html`<button class="chip${i == cur ? ' on' : ''}" data-a="wriv" data-i="${i}" role="radio" aria-checked="${i == cur ? 'true' : 'false'}">${x[2]}</button>`)}<button class="chip${cur < 0 ? ' on' : ''}" data-a="wriv" data-i="-1" role="radio" aria-checked="${cur < 0 ? 'true' : 'false'}">Otro</button></div>${raw(other)}<p class="wrt">${nx ? html`Próximo aviso: <b>${fmtDateShort(nx, { weekday: 'long', day: 'numeric', month: 'long' })}</b>` : ''} · cada ${weighEvery(r)}</p><button data-a="wrcal" class="wrk">${icon('cal', 18)} Añadir al calendario del móvil</button><small class="mu wrt">Así te avisa también con la app cerrada. Si cambias el intervalo, vuelve a añadirlo.</small></div>`;
};
/** Al abrir la app o volver a ella: si toca pesarse, lo dice una vez al día, nunca en mitad de un entreno ni encima de otra
    ventana (la tarjeta del Dashboard sigue ahí). */
export const checkWeighIn = () => {
  if (!signedIn() || W || !weighDue())
    return;
  const today = dayKey(new Date());
  if (S.wr.sh == today || $('#sh .sp') || $('#dg .dgb') || $('#upd') || $('#f2w'))
    return;
  S.wr.sh = today;
  saveState();
  const l = lastWeighIn();
  dialog('Día de pesarse', html`Toca pesarse: ${l ? 'tu último pesaje fue el ' + fmtDateShort(l, { day: 'numeric', month: 'long' }) : 'aún no has registrado tu peso'}. Pésate a la misma hora, mejor por la mañana y en ayunas, para comparar bien.`, [['Mañana', 'wrlt', ''], ['Registrar peso', 'wrgo', 'pr']]);
};
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState == 'visible')
    setTimeout(checkWeighIn, 1200);
});
/* texto de un campo del calendario: sin saltos de línea y con , ; \ escapados (RFC 5545) */
const icsText = s => String(s).replace(/([\\;,])/g, '\\$1').replace(/\r?\n/g, '\\n');
/** Evento del calendario que se repite cada intervalo, a las 9:00 del día que toca, con su aviso. Siempre con el mismo id
    (S.wr.c): al volver a añadirlo, el calendario lo cambia en lugar de duplicarlo. */
const weighIcs = () => {
  const r = S.wr;
  const d = (weighNext() || dayKey(new Date())).replace(/-/g, '');
  const rule = r.u == 'm' ? 'MONTHLY' : r.u == 'w' ? 'WEEKLY' : 'DAILY';
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//StrataFit//Recordatorio de pesaje//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', 'UID:stratafit-pesaje-' + r.c, 'DTSTAMP:' + now, 'DTSTART:' + d + 'T090000', 'DURATION:PT10M', 'RRULE:FREQ=' + rule + ';INTERVAL=' + r.n, 'SUMMARY:' + icsText('Día de pesarse'), 'DESCRIPTION:' + icsText('Toca pesarse: registra tu peso en StrataFit.'), 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText('Día de pesarse'), 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
};
/* — manejadores de esta función (registros A / C / U) — */
C.wron = e => {
  weighCustom = 0;
  if (e.checked)
    S.wr = { n: 2, u: 'w', t: Date.now() };
  else
    delete S.wr;
  saveState();
  R();
  toast(e.checked ? 'Te avisaremos cada 2 semanas' : 'Recordatorio de pesaje desactivado');
};
A.wriv = i => {
  if (!S.wr)
    return;
  const x = WEIGH_STEPS[i];
  weighCustom = x ? 0 : 1;
  if (x) {
    S.wr.n = x[0];
    S.wr.u = x[1];
  }
  saveState();
  R();
};
C.wrn = e => {
  if (!S.wr)
    return;
  /* fuera del rango, al tope más cercano (500 días son 90) */
  S.wr.n = Math.min(WEIGH_UNITS[S.wr.u][2], Math.max(1, Math.round(+e.value) || 1));
  saveState();
  R();
};
C.wru = e => {
  if (!S.wr || !Object.prototype.hasOwnProperty.call(WEIGH_UNITS, e.value))
    return;
  S.wr.u = e.value;
  S.wr.n = Math.min(S.wr.n, WEIGH_UNITS[e.value][2]);
  saveState();
  R();
};
/* «Mañana»: ni el aviso ni la tarjeta hasta mañana */
A.wrlt = () => {
  if (!S.wr)
    return;
  const t = new Date();
  t.setDate(t.getDate() + 1);
  S.wr.sn = dayKey(t);
  saveState();
  R();
};
/* a Evolución del peso, con el campo del peso listo */
A.wrgo = () => {
  sheet();
  setWeightView(1);
  A.tab(2);
  setTimeout(() => {
    const e = $('#wv');
    e && e.focus();
  }, 60);
};
A.wrcal = async () => {
  if (!S.wr)
    return;
  if (!S.wr.c) {
    S.wr.c = newId();
    saveState();
  }
  const r = await downloadFile('StrataFit-pesaje.ics', weighIcs(), 'text/calendar');
  toast(r == 'saved' || r == 'delivered' ? 'Ábrelo para añadirlo a tu calendario' : r == 'declined' ? 'No se ha guardado' : 'No se ha podido crear el archivo');
};
