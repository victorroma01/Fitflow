/* ═══ system/diagnostics ═══
   Informe de diagnóstico (Perfil → Ajustes → Diagnóstico): versión, dispositivo, lo que ocupa cada dato y el espacio usado
   (system/space), uso sin conexión, últimos errores y, si los hubo, datos dañados que se apartaron al arrancar. Nada sale del
   móvil salvo que se copie.
   Define: storageUse, badData, diagnosticsText, diagBack, diagnosticsPage  · acciones/registros: 6
*/
import { $, APPV, dayKey, FFDEP } from '../core/util.js';
import { toast } from '../core/toast.js';
import { Store } from '../core/store.js';
import { clearErrorLog, errorLog, logError } from '../core/errors.js';
import { partSizes } from '../core/persist.js';
import { lastSpace, spaceText, spaceUse } from './space.js';
import { syncLine } from '../cloud/sync.js';
import { paintSummary } from '../core/render.js';
import { A } from '../core/registry.js';
import { S } from '../core/state.js';
import { confirmDialog, fullPage, pgHead } from '../core/ui.js';
import { copyText, downloadFile, isStandalone } from './files.js';
import { backupDate } from './backup.js';
import { offlineText } from './updates.js';
import { html } from '../core/html.js';
/** Tamaño aproximado (caracteres) de cada clave de Store y de cada parte del estado (las comidas, sumando los meses), con
    dónde están las partes (core/persist: IndexedDB o localStorage). */
const storageUse = () => {
  const size = k => {
    try {
      return (Store.get(k) || '').length;
    }
    catch (e) {
      return 0; /* clave ilegible: cuenta como vacía */
    }
  };
  const parts = {};
  const { where, sizes } = partSizes();
  for (const [k, n] of sizes)
    parts[k.split(':')[1]] = (parts[k.split(':')[1]] || 0) + n;
  return Object.keys(Store.K).map(k => [k, size(Store.K[k])]).concat(Object.entries(parts).map(([k, n]) => [k + ' (' + where + ')', n]));
};
/** Datos que no se pudieron leer al arrancar ({t, k: claves, raw}) o null. */
const badData = () => {
  try {
    const o = JSON.parse(Store.get(Store.K.bad) || 'null');
    return o && typeof o.raw == 'string' ? o : null;
  }
  catch (e) {
    return null;
  }
};
export const diagnosticsText = () => {
  const errs = errorLog().slice().reverse();
  const bad = badData();
  return ['StrataFit ' + APPV + (FFDEP ? ' · app instalable' : ' · archivo único'), 'Fecha: ' + new Date().toISOString(), 'Navegador: ' + navigator.userAgent, 'Abierta como app: ' + (isStandalone() ? 'sí' : 'no'), offlineText(), 'Almacenamiento: ' + storageUse().filter(x => x[1]).map(x => x[0] + ' ' + Math.ceil(x[1] / 1024) + ' KB').join(', '), 'Espacio usado: ' + (spaceText(lastSpace) || 'midiendo…'), 'Sincronización: ' + syncLine(), 'Tiempo de pintado: ' + (paintSummary() || 'aún sin medidas'), 'Entrenos registrados: ' + S.logs.length, bad ? 'Datos dañados apartados el ' + new Date(bad.t).toISOString().slice(0, 10) + ' (' + Math.ceil(bad.raw.length / 1024) + ' KB)' : 'Sin datos dañados', 'Errores registrados: ' + errs.length].concat(errs.map(e => '· ' + new Date(e.t).toISOString().slice(0, 16).replace('T', ' ') + ' · ' + e.w + ' · ' + e.m + (e.v ? ' · v' + e.v : ''))).join('\n');
};
/* «←» de Diagnóstico: a Ajustes si se abrió desde allí */
let diagBack = 'closeSheet';
const diagnosticsPage = () => {
  const n = errorLog().length;
  const bad = badData();
  return html`${pgHead('Diagnóstico', diagBack)}<p class="mu" style="margin:-6px 0 12px">Si algo falla, copia este informe y envíalo. Solo contiene datos técnicos y los últimos errores; ningún dato tuyo sale del móvil si no lo copias tú.</p><textarea id="diagt" aria-label="Informe de diagnóstico" rows="12" readonly style="font:12px/1.4 ui-monospace,Menlo,monospace">${diagnosticsText()}</textarea><div class="g2" style="margin-top:10px"><button class="pr" data-a="diagnosticsCopy">Copiar informe</button><button data-a="diagnosticsClearErrors"${n ? '' : ' disabled'}>Borrar errores</button></div>${bad ? html`<div class="cd" style="margin-top:14px"><b>Datos que no se pudieron leer</b><div class="mu" style="font-size:13px;margin:4px 0 10px">Al abrir la app el ${backupDate(bad.t, 1)} tus datos estaban dañados y se apartaron aquí para no perderlos. Descárgalos para intentar recuperarlos.</div><div class="g2"><button data-a="diagnosticsDownloadBad">Descargar</button><button data-a="diagnosticsDeleteBadAsk">Eliminar</button></div></div>` : ''}<div style="height:20px"></div>`;
};
/* — manejadores de esta función (registros A / C / U) — */
A.openDiagnostics = () => {
  diagBack = $('#ajs') ? 'openSettings' : 'closeSheet';
  fullPage(diagnosticsPage());
  /* el espacio usado se mide aparte (el navegador tarda un poco en decirlo): al tenerlo, el informe se completa */
  spaceUse().then(() => {
    const t = $('#diagt');
    if (t)
      t.value = diagnosticsText();
  }, e => logError('medir el espacio', e));
};
A.diagnosticsCopy = async () => {
  const ok = await copyText(diagnosticsText(), $('#diagt'));
  toast(ok ? 'Informe copiado' : 'Selecciona el texto y cópialo');
};
A.diagnosticsClearErrors = () => {
  clearErrorLog();
  fullPage(diagnosticsPage());
  toast('Registro de errores borrado');
};
A.diagnosticsDownloadBad = async () => {
  const b = badData();
  if (!b)
    return;
  const r = await downloadFile('stratafit-datos-apartados-' + dayKey(new Date(b.t)) + '.json', b.raw);
  if (r != 'saved')
    toast('No se pudo descargar');
};
A.diagnosticsDeleteBadAsk = () => confirmDialog('Eliminar datos apartados', 'Se borrará la copia de los datos que no se pudieron leer. No afecta a tus datos actuales.', 'diagnosticsDeleteBad', 'Eliminar');
A.diagnosticsDeleteBad = () => {
  try {
    Store.del(Store.K.bad);
  }
  catch (e) {
    logError('borrar datos apartados', e);
  }
  fullPage(diagnosticsPage());
};
