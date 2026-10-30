/* ═══ core/errors ═══
   Registro de errores en el dispositivo: guarda los últimos 30 (cuándo, dónde, qué y en qué versión) para el informe
   de diagnóstico de Perfil. Nada sale del móvil salvo que el usuario copie el informe.
   Define: ERROR_LIMIT, logError, errorLog, clearErrorLog
*/
import { APPV } from './util.js';
import { Store } from './store.js';
const ERROR_LIMIT = 30;
/** Anota un error. Nunca lanza: registrar no debe romper nada. */
export const logError = (where, e) => {
  try {
    const l = errorLog();
    const msg = e && (e.message || e.name) ? (e.name && e.name != 'Error' ? e.name + ': ' : '') + (e.message || '') : String(e);
    l.push({ t: Date.now(), w: String(where).slice(0, 60), m: msg.slice(0, 300), s: e && e.stack ? String(e.stack).split('\n').slice(0, 4).join(' | ').slice(0, 500) : '', v: APPV });
    Store.set(Store.K.err, JSON.stringify(l.slice(-ERROR_LIMIT)));
  }
  catch (x) {
    /* registrar nunca debe romper nada (p. ej. almacenamiento lleno) */
  }
};
/** Errores guardados, del más antiguo al más reciente. */
export const errorLog = () => {
  try {
    const l = JSON.parse(Store.get(Store.K.err) || '[]');
    return Array.isArray(l) ? l : [];
  }
  catch (e) {
    return [];
  }
};
export const clearErrorLog = () => {
  try {
    Store.del(Store.K.err);
  }
  catch (e) {
    /* sin acceso al almacenamiento: no hay nada que borrar */
  }
};
window.addEventListener('error', e => logError('global', e.error || e.message));
window.addEventListener('unhandledrejection', e => logError('promesa', e.reason));
