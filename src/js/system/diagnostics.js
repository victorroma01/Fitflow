/* ═══ system/diagnostics ═══
   Informe de diagnóstico (Perfil → Ajustes → Diagnóstico): versión, dispositivo, espacio usado, uso sin conexión,
   últimos errores y, si los hubo, datos dañados que se apartaron al arrancar. Nada sale del móvil salvo que se copie.
   Define: storageUse, badData, diagnosticsText, diagnosticsPage  · acciones/registros: 4
*/
import { $, APPV, dayKey, FFDEP } from '../core/util.js';
import { toast } from '../core/toast.js';
import { Store } from '../core/store.js';
import { clearErrorLog, errorLog, logError } from '../core/errors.js';
import { partKey, partsFailed, savedFormat } from '../core/persist.js';
import { A } from '../core/registry.js';
import { S } from '../core/state.js';
import { confirmDialog, fullPage, pgHead } from '../core/ui.js';
import { copyText, downloadFile, isStandalone } from './files.js';
import { backupDate } from './backup.js';
import { offlineText } from './updates.js';
import { html } from '../core/html.js';
/** Tamaño aproximado (caracteres) de cada clave de Store y de cada parte del estado (las comidas, sumando los meses). */
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
  try {
    for (const k of Store.keys(partKey('')))
      parts[k.split(':')[1]] = (parts[k.split(':')[1]] || 0) + size(k);
  }
  catch (e) {
    logError('medir almacenamiento', e);
  }
  return Object.keys(Store.K).map(k => [k, size(Store.K[k])]).concat(Object.entries(parts));
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
const diagnosticsText = () => {
  const errs = errorLog().slice().reverse();
  const bad = badData();
  return ['StrataFit ' + APPV + (FFDEP ? ' · app instalable' : ' · archivo único'), 'Fecha: ' + new Date().toISOString(), 'Navegador: ' + navigator.userAgent, 'Abierta como app: ' + (isStandalone() ? 'sí' : 'no'), offlineText(), 'Almacenamiento: ' + storageUse().filter(x => x[1]).map(x => x[0] + ' ' + Math.ceil(x[1] / 1024) + ' KB').join(', '), 'Guardado: ' + ({ parts: 'por partes', whole: 'entero' + (partsFailed ? ' (sin espacio para dividirlo)' : '') }[savedFormat] || 'sin datos'), 'Entrenos registrados: ' + S.logs.length, bad ? 'Datos dañados apartados el ' + new Date(bad.t).toISOString().slice(0, 10) + ' (' + Math.ceil(bad.raw.length / 1024) + ' KB)' : 'Sin datos dañados', 'Errores registrados: ' + errs.length].concat(errs.map(e => '· ' + new Date(e.t).toISOString().slice(0, 16).replace('T', ' ') + ' · ' + e.w + ' · ' + e.m + (e.v ? ' · v' + e.v : ''))).join('\n');
};
const diagnosticsPage = () => {
  const n = errorLog().length;
  const bad = badData();
  return html`${pgHead('Diagnóstico')}<p class="mu" style="margin:-6px 0 12px">Si algo falla, copia este informe y envíalo. Solo contiene datos técnicos y los últimos errores; ningún dato tuyo sale del móvil si no lo copias tú.</p><textarea id="diagt" rows="12" readonly style="font:12px/1.4 ui-monospace,Menlo,monospace">${diagnosticsText()}</textarea><div class="g2" style="margin-top:10px"><button class="pr" data-a="diagCopy">Copiar informe</button><button data-a="diagClear"${n ? '' : ' disabled'}>Borrar errores</button></div>${bad ? html`<div class="cd" style="margin-top:14px"><b>Datos que no se pudieron leer</b><div class="mu" style="font-size:13px;margin:4px 0 10px">Al abrir la app el ${backupDate(bad.t, 1)} tus datos estaban dañados y se apartaron aquí para no perderlos. Descárgalos para intentar recuperarlos.</div><div class="g2"><button data-a="diagBad">Descargar</button><button data-a="diagBadDel">Eliminar</button></div></div>` : ''}<div style="height:20px"></div>`;
};
/* — manejadores de esta función (registros A / C / U) — */
A.diag = () => fullPage(diagnosticsPage());
A.diagCopy = async () => {
  const ok = await copyText(diagnosticsText(), $('#diagt'));
  toast(ok ? 'Informe copiado' : 'Selecciona el texto y cópialo');
};
A.diagClear = () => {
  clearErrorLog();
  fullPage(diagnosticsPage());
  toast('Registro de errores borrado');
};
A.diagBad = async () => {
  const b = badData();
  if (!b)
    return;
  const r = await downloadFile('stratafit-datos-apartados-' + dayKey(new Date(b.t)) + '.json', b.raw);
  if (r != 'saved' && r != 'delivered')
    toast('No se pudo descargar');
};
A.diagBadDel = () => confirmDialog('Eliminar datos apartados', 'Se borrará la copia de los datos que no se pudieron leer. No afecta a tus datos actuales.', 'diagBadDel2', 'Eliminar');
A.diagBadDel2 = () => {
  try {
    Store.del(Store.K.bad);
  }
  catch (e) {
    logError('borrar datos apartados', e);
  }
  fullPage(diagnosticsPage());
};
