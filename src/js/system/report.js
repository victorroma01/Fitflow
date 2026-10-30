/* ═══ system/report ═══
   «Informar de un fallo» (Ajustes): se elige el tipo de fallo y se explica con texto libre. La app no tiene servidor: el
   informe se abre ya escrito como incidencia en GitHub (REPORT_URL, sin publicar ningún correo) o se comparte o copia para
   mandarlo por mensaje o correo. No sale nada sin que la persona lo confirme. Los datos técnicos (versión, navegador y
   últimos errores; nada personal) van solo si se deja marcada la casilla, y se pueden ver antes de enviar.
   Define: REPORT_URL, REPORT_TYPES, REPORT_MAX, reportType, reportPage, reportParts, reportText, reportIssueUrl  · acciones/registros: 4
*/
import { $ } from '../core/util.js';
import { toast } from '../core/toast.js';
import { logError } from '../core/errors.js';
import { A, U } from '../core/registry.js';
import { pgHead, sheet } from '../core/ui.js';
import { diagnosticsText } from './diagnostics.js';
import { copyText } from './files.js';
import { html } from '../core/html.js';
/* adónde llegan los informes: incidencias nuevas del repositorio (para usar otro sitio, basta con cambiar esta dirección) */
const REPORT_URL = 'https://github.com/victorroma01/Fitflow/issues/new';
const REPORT_TYPES = ['No arranca o se cierra', 'Se han perdido datos', 'Algo se ve mal', 'Un botón no hace nada', 'Un cálculo no cuadra', 'Entreno o temporizador', 'Nutrición o alimentos', 'Una idea o sugerencia', 'Otro'];
const REPORT_MAX = 1500;
let reportType = -1;
const reportPage = () => html`<div id="rpp">${pgHead('Informar de un fallo', 'zaj')}<p class="mu" style="margin:-6px 0 14px">Cuéntanos qué ha fallado y lo arreglamos. No se envía nada hasta que lo confirmes.</p><label>Tipo de fallo</label><div class="rpt" role="radiogroup" aria-label="Tipo de fallo">${REPORT_TYPES.map((t, i) => html`<button class="chip${i == reportType ? ' on' : ''}" data-a="rpt" data-i="${i}" role="radio" aria-checked="${i == reportType ? 'true' : 'false'}">${t}</button>`)}</div><label for="rpx">Qué ha pasado</label><textarea id="rpx" rows="6" maxlength="${REPORT_MAX}" placeholder="Qué estabas haciendo, qué esperabas y qué ocurrió" data-u="rpx"></textarea><small id="rpn" class="mu" style="display:block;text-align:right;margin-top:4px">0 / ${REPORT_MAX}</small><label class="srk"><input type="checkbox" id="rpd" checked> Adjuntar datos técnicos (versión, navegador y últimos errores; nada personal)</label><details class="cd" style="margin-top:6px"><summary>Ver los datos técnicos</summary><pre class="rpv">${reportTech()}</pre></details><p class="mu" style="font-size:13px;margin:12px 2px">«Enviar» abre GitHub con el informe ya escrito; hace falta una cuenta gratuita. Si no tienes, usa «Compartir» y mándalo por mensaje o correo.</p><div style="height:110px"></div><div class="sb rpb"><button data-a="rpc">Compartir</button><button class="pr" data-a="rps">Enviar</button></div></div>`;
/* datos técnicos del informe: los del Diagnóstico, con solo los 5 últimos errores y cortados para que quepan en una dirección */
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
/** Lo escrito en el formulario: [tipo, texto, datos técnicos o ''] o null si falta algo (y lo dice). */
const reportParts = () => {
  const x = $('#rpx');
  const t = String((x || {}).value || '').trim().slice(0, REPORT_MAX);
  if (!(reportType >= 0 && reportType < REPORT_TYPES.length)) {
    toast('Elige el tipo de fallo');
    return null;
  }
  if (t.length < 10) {
    toast('Explica un poco qué ha pasado (al menos 10 letras)');
    if (x)
      x.focus();
    return null;
  }
  const d = $('#rpd');
  return [REPORT_TYPES[reportType], t, d && d.checked ? reportTech() : ''];
};
/** Texto del informe; con `md`, en Markdown para la incidencia de GitHub. */
const reportText = (p, md) => md ? '**Tipo:** ' + p[0] + '\n\n**Qué ha pasado:**\n\n' + p[1] + (p[2] ? '\n\n<details><summary>Datos técnicos</summary>\n\n```\n' + p[2].split('```').join("'''") + '\n```\n</details>' : '') : 'Informe de fallo de StrataFit\nTipo: ' + p[0] + '\n\n' + p[1] + (p[2] ? '\n\n— Datos técnicos —\n' + p[2] : '');
/** Dirección de la incidencia nueva con título y texto; si no cabe en una dirección (unos 8000 caracteres), recorta los datos técnicos. */
const reportIssueUrl = p => {
  const title = '[' + p[0] + '] ' + p[1].replace(/\s+/g, ' ').slice(0, 70);
  let q = p.slice();
  let u = '';
  for (let n = 0; n < 6; n++) {
    u = REPORT_URL + '?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(reportText(q, 1));
    if (u.length < 7500)
      break;
    q = [q[0], q[1].slice(0, Math.floor(q[1].length * .7)), q[2].slice(0, Math.floor(q[2].length * .5))];
  }
  return u;
};
/* — manejadores de esta función (registros A / C / U) — */
A.rpo = () => {
  reportType = -1;
  sheet(reportPage());
};
A.rpt = i => {
  reportType = i;
  document.querySelectorAll('.rpt button').forEach(b => {
    const on = +b.dataset.i == i;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
};
U.rpx = v => {
  const e = $('#rpn');
  if (e)
    e.textContent = String(v).length + ' / ' + REPORT_MAX;
};
A.rps = () => {
  const p = reportParts();
  if (!p)
    return;
  /* un enlace pulsado (y no window.open) también abre el navegador desde la app instalada en el iPhone */
  try {
    const a = document.createElement('a');
    a.href = reportIssueUrl(p);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast('Se abre GitHub con tu informe: pulsa «Create» para enviarlo');
  }
  catch (e) {
    logError('informe: abrir GitHub', e);
    toast('No se ha podido abrir GitHub: usa «Compartir»');
  }
};
A.rpc = async () => {
  const p = reportParts();
  if (!p)
    return;
  const t = reportText(p, 0);
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Informe de fallo de StrataFit', text: t });
      return;
    }
  }
  catch (e) {
    /* compartir cancelado o no disponible: se copia al portapapeles */
    if (e && e.name == 'AbortError')
      return;
  }
  /* sin «compartir»: al portapapeles (si no hay permiso, con un cuadro de texto oculto que lleva el informe entero) */
  const tmp = document.createElement('textarea');
  tmp.value = t;
  tmp.setAttribute('readonly', '');
  tmp.setAttribute('aria-hidden', 'true');
  tmp.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';
  document.body.appendChild(tmp);
  const ok = await copyText(t, tmp);
  tmp.remove();
  toast(ok ? 'Informe copiado: pégalo en un mensaje o correo' : 'No se ha podido copiar el informe');
};
