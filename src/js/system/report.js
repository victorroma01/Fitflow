/* ═══ system/report ═══
   Fallos y sugerencias (F-27). «Informar de un fallo» (Ajustes, o «Nuevo» en Perfil → Fallos y sugerencias) envía un aviso de
   uno de dos tipos, fallo o sugerencia de mejora, a Firestore (reports/{uid}-{ms}), con datos técnicos si se deja marcada la
   casilla (versión, navegador y últimos errores; nada personal) y que se pueden ver antes de enviar.
   El admin los ve en Perfil → Administración (account/reports), con su estado (pendiente, vista o arreglada), y los contesta.
   Cada usuario ve los suyos en Perfil → Fallos y sugerencias, con su estado (pendiente, vista o contestada) y la respuesta.
   Sin conexión, el aviso se guarda en el móvil y se envía solo tras la siguiente sincronización (cloud/sync: afterSync); su id
   va puesto desde el principio, así nunca llega dos veces.
   Estado: S.reports = [{ id, k: 'f' | 's', a: área del fallo, t: texto, dx: datos técnicos (hasta enviarlo), ca: cuándo, s: 1 si
   ya se envió, st: 'p' | 'v' | 'a', rp: respuesta, ra: cuándo se contestó, sn: 1 si la respuesta ya se vio }], los más nuevos
   primero (los 30 últimos).
   Define: REPORT_KINDS, REPORT_AREAS, REPORT_MAX, REPORT_KEEP, REFRESH_EVERY, reportKind, reportArea, reportBack, refreshedAt, reportTech, reportKindChips, reportAreaChips, reportTextField, reportTechField, reportPage, reportStatus, reportDoc, sendReport, flushReports, refreshReports, reportsUnseen, reportsLine, reportListPage, reportListSync  · acciones/registros: 7
*/
import { $, APPV, dayKey, fmtDateShort } from '../core/util.js';
import { toast } from '../core/toast.js';
import { logError } from '../core/errors.js';
import { A, U } from '../core/registry.js';
import { S, saveState } from '../core/state.js';
import { fullPage, pgHead, sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { account, acctName } from '../cloud/session.js';
import { batchGet, commitWrites, setWrite } from '../cloud/firestore.js';
import { afterSync } from '../cloud/hooks.js';
import { diagnosticsText } from './diagnostics.js';
import { html, raw } from '../core/html.js';
/** Los dos tipos de aviso: [código, nombre]. */
export const REPORT_KINDS = [['f', 'Fallo'], ['s', 'Sugerencia de mejora']];
/** Dónde está el fallo (opcional; las reglas admiten hasta 60 caracteres). */
const REPORT_AREAS = ['No arranca o se cierra', 'Se han perdido datos', 'Algo se ve mal', 'Un botón no hace nada', 'Un cálculo no cuadra', 'Entreno o temporizador', 'Nutrición o alimentos', 'Otro'];
export const REPORT_MAX = 1500;
const REPORT_KEEP = 30;
/* los estados se vuelven a consultar como mucho cada 6 horas (o al abrir la lista) */
const REFRESH_EVERY = 6 * 36e5;
let reportKind = '';
let reportArea = -1;
/* adónde vuelve «←» del formulario: Ajustes o la lista de Perfil */
let reportBack = 'openSettings';
let refreshedAt = 0;
/* datos técnicos del aviso: los del Diagnóstico, con solo los 5 últimos errores */
const reportTech = () => {
  try {
    const L = diagnosticsText().split('\n');
    const head = L.filter(l => !l.startsWith('· '));
    const errs = L.filter(l => l.startsWith('· ')).slice(0, 5);
    return head.concat(errs).join('\n').slice(0, 1400);
  }
  catch (e) {
    logError('informe: datos técnicos', e);
    return 'Sin datos técnicos';
  }
};
/* el tipo: fallo o sugerencia */
const reportKindChips = () => html`<label>Tipo</label><div class="rpk" role="radiogroup" aria-label="Tipo">${REPORT_KINDS.map(k => html`<button class="chip${reportKind == k[0] ? ' on' : ''}" data-a="reportChooseKind" data-v="${k[0]}" role="radio" aria-checked="${reportKind == k[0] ? 'true' : 'false'}">${k[1]}</button>`)}</div>`;
/* en un fallo, dónde ha pasado (opcional) */
const reportAreaChips = () => reportKind == 'f' ? html`<label>Dónde (si lo sabes)</label><div class="rpt" role="radiogroup" aria-label="Dónde">${REPORT_AREAS.map((t, i) => html`<button class="chip${i == reportArea ? ' on' : ''}" data-a="reportChooseArea" data-i="${i}" role="radio" aria-checked="${i == reportArea ? 'true' : 'false'}">${t}</button>`)}</div>` : '';
/* el texto, con su contador */
const reportTextField = () => html`<label for="rpx">${reportKind == 's' ? 'Tu idea' : 'Qué ha pasado'}</label><textarea id="rpx" rows="6" maxlength="${REPORT_MAX}" placeholder="${reportKind == 's' ? 'Qué mejorarías y para qué te serviría' : 'Qué estabas haciendo, qué esperabas y qué ocurrió'}" data-u="reportText"></textarea><small id="rpn" class="mu" style="display:block;text-align:right;margin-top:4px">0 / ${REPORT_MAX}</small>`;
/* adjuntar los datos técnicos (en un fallo, marcado), con lo que se adjunta a la vista */
const reportTechField = () => html`<label class="srk"><input type="checkbox" id="rpd"${reportKind == 's' ? '' : ' checked'}> Adjuntar datos técnicos (versión, navegador y últimos errores; nada personal)</label><details class="cd" style="margin-top:6px"><summary>Ver los datos técnicos</summary><pre class="rpv">${reportTech()}</pre></details>`;
/* «Informar de un fallo» */
const reportPage = () => html`<div id="rpp">${pgHead('Informar de un fallo', reportBack)}<p class="mu" style="margin:-6px 0 14px">Cuéntanos qué ha fallado o qué mejorarías. Te contestamos aquí: verás el estado y la respuesta en Perfil → Fallos y sugerencias.</p>${reportKindChips()}${reportAreaChips()}${reportTextField()}${reportTechField()}<div style="height:110px"></div><div class="sb"><button class="pr" data-a="reportSend" style="width:100%;padding:15px;border-radius:16px;font-size:16px">Enviar</button></div></div>`;
/** Estado de un aviso para quien lo envió: [texto, clase]. */
const reportStatus = x => !x.s ? ['Sin enviar', 'off'] : x.rp ? ['Contestada', 'ok'] : x.st == 'v' || x.st == 'a' ? ['Vista', 'seen'] : ['Pendiente', 'wait'];
/* el documento de Firestore de un aviso (las reglas exigen esta forma, el usuario de la cuenta y el id uid-ms) */
const reportDoc = x => ({ uid: account.uid, u: acctName(), k: x.k, a: x.a, t: x.t, dx: x.dx || '', v: APPV, ca: x.ca, st: 'p', m: x.ca });
const sendReport = async (x) => {
  try {
    await commitWrites([setWrite('reports/' + x.id, reportDoc(x), { exists: false })]);
  }
  catch (e) {
    /* ya llegó (desde este móvil o desde otro con la misma cuenta) */
    if (e.code != 'ALREADY_EXISTS')
      throw e;
  }
  x.s = 1;
  x.st = 'p';
  delete x.dx;
};
/* tras sincronizar: se envía lo que quedó sin conexión */
const flushReports = async () => {
  const L = (S.reports || []).filter(x => !x.s);
  if (!L.length || !account)
    return;
  let n = 0;
  for (const x of L)
    try {
      await sendReport(x);
      n++;
    }
    catch (e) {
      if (e.code == 'NETWORK')
        break;
      logError('enviar aviso', e);
    }
  if (n) {
    saveState();
    R();
  }
};
/** Pregunta a la nube cómo van los avisos enviados que no están cerrados (arreglados y contestados). */
export const refreshReports = async (force) => {
  const L = (S.reports || []).filter(x => x.s && !(x.st == 'a' && x.rp));
  if (!L.length || !account || !force && Date.now() - refreshedAt < REFRESH_EVERY)
    return;
  refreshedAt = Date.now();
  try {
    const docs = await batchGet(L.map(x => 'reports/' + x.id));
    let ch = 0;
    for (const x of L) {
      const d = docs['reports/' + x.id];
      if (!d)
        continue;
      const o = d.data;
      const st = ['p', 'v', 'a'].includes(o.st) ? o.st : 'p';
      const rp = typeof o.rp == 'string' ? o.rp.slice(0, REPORT_MAX) : '';
      if (st != x.st || rp != (x.rp || '')) {
        if (rp != (x.rp || ''))
          x.sn = 0;
        x.st = st;
        if (rp) {
          x.rp = rp;
          x.ra = +o.ra || Date.now();
        }
        else {
          delete x.rp;
          delete x.ra;
        }
        ch = 1;
      }
    }
    if (ch) {
      saveState();
      R();
      reportListSync();
    }
  }
  catch (e) {
    if (e.code != 'NETWORK')
      logError('estado de los avisos', e);
  }
};
afterSync.push(flushReports, () => refreshReports(0));
/** Respuestas que aún no se han visto. */
export const reportsUnseen = () => (S.reports || []).filter(x => x.rp && !x.sn).length;
/** Línea de la fila de Perfil. */
export const reportsLine = () => {
  const L = S.reports || [];
  const nw = reportsUnseen();
  const off = L.filter(x => !x.s).length;
  const open = L.filter(x => x.s && !x.rp).length;
  return nw ? nw + (nw == 1 ? ' respuesta nueva' : ' respuestas nuevas') : off ? off + ' sin enviar: se envía al volver la red' : L.length ? open ? open + (open == 1 ? ' pendiente de respuesta' : ' pendientes de respuesta') : 'Todos contestados' : 'Avisa de un fallo o propón una mejora';
};
/** Perfil → Fallos y sugerencias: los avisos propios con su estado y la respuesta. */
const reportListPage = () => {
  const L = S.reports || [];
  const items = L.map(x => {
    const [sl, sc] = reportStatus(x);
    const kd = (REPORT_KINDS.find(k => k[0] == x.k) || REPORT_KINDS[0])[1];
    return html`<div class="cd rpi"><div class="row"><span class="rpkd">${kd}${x.a ? ' · ' + x.a : ''}</span><span class="rps ${sc}">${sl}</span></div><small class="mu">${fmtDateShort(dayKey(new Date(+x.ca)), { day: 'numeric', month: 'long', year: 'numeric' })}</small><p class="rptx">${x.t}</p>${x.rp ? html`<div class="rpr${x.sn ? '' : ' nw'}"><b>Respuesta${x.ra ? ' · ' + fmtDateShort(dayKey(new Date(+x.ra))) : ''}</b><p>${x.rp}</p></div>` : ''}</div>`;
  }).join('');
  return html`<div id="rpl">${pgHead('Fallos y sugerencias')}<p class="mu" style="margin:-6px 0 12px">Lo que nos has enviado, con su estado: pendiente, vista o contestada.</p><button class="pr" data-a="reportNew" style="width:100%;margin-bottom:12px">Nuevo aviso</button>${raw(items || '<p class="mu">Aún no has enviado ninguno.</p>')}</div>`;
};
/* con la lista abierta, se pinta de nuevo al llegar estados nuevos; las respuestas a la vista quedan vistas */
const reportListSync = () => {
  if (!$('#rpl'))
    return;
  sheet(reportListPage());
  if (reportsUnseen()) {
    (S.reports || []).forEach(x => {
      if (x.rp)
        x.sn = 1;
    });
    saveState();
  }
};
/* — manejadores de esta función (registros A / C / U) — */
A.openReport = () => {
  reportKind = '';
  reportArea = -1;
  reportBack = $('#rpl') ? 'openMyReports' : 'openSettings';
  fullPage(reportPage());
};
A.reportNew = () => A.openReport();
A.reportChooseKind = (i, b) => {
  const t = ($('#rpx') || {}).value || '';
  reportKind = b.dataset.v == 's' ? 's' : 'f';
  sheet(reportPage());
  const x = $('#rpx');
  if (x) {
    x.value = t;
    U.reportText(t);
  }
};
A.reportChooseArea = i => {
  reportArea = reportArea == i ? -1 : i;
  document.querySelectorAll('.rpt button').forEach(b => {
    const on = +b.dataset.i == reportArea;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
};
U.reportText = v => {
  const e = $('#rpn');
  if (e)
    e.textContent = String(v).length + ' / ' + REPORT_MAX;
};
A.reportSend = async () => {
  const x = $('#rpx');
  const t = String((x || {}).value || '').trim().slice(0, REPORT_MAX);
  if (!reportKind) {
    toast('Elige si es un fallo o una sugerencia');
    return;
  }
  if (t.length < 10) {
    toast('Explícalo un poco más (al menos 10 letras)');
    if (x)
      x.focus();
    return;
  }
  if (!account) {
    toast('Entra en tu cuenta para enviarlo');
    return;
  }
  const d = $('#rpd');
  const ca = Date.now();
  const it = { id: account.uid + '-' + ca, k: reportKind, a: reportKind == 'f' && reportArea >= 0 ? REPORT_AREAS[reportArea] : '', t, ca, s: 0 };
  if (d && d.checked)
    it.dx = reportTech();
  S.reports = [it].concat(S.reports || []).slice(0, REPORT_KEEP);
  saveState();
  try {
    await sendReport(it);
    saveState();
    toast('Enviado. Te contestaremos en Perfil → Fallos y sugerencias');
  }
  catch (e) {
    if (e.code != 'NETWORK')
      logError('enviar aviso', e);
    toast(e.code == 'NETWORK' ? 'Sin conexión: se enviará solo al volver la red' : 'No se ha podido enviar ahora; se reintentará solo');
  }
  fullPage(reportListPage());
  R();
};
A.openMyReports = () => {
  fullPage(reportListPage());
  reportListSync();
  refreshReports(1);
};
