/* ═══ core/errors ═══
   Registro de errores en el dispositivo: guarda los últimos 30 (cuándo, dónde, qué y en qué versión) para el informe
   de diagnóstico de Perfil. Nada sale del móvil salvo que el usuario copie el informe. Un error inesperado se anota y se
   avisa con un mensaje breve (como mucho, uno cada medio minuto), para que lo que se tocó no parezca que no hace nada.
   Define: ERROR_LIMIT, logError, errorLog, clearErrorLog, errorNotice, setErrorNotice, noticeAt, NOTICE_EVERY
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
/* cómo se avisa al usuario de un error inesperado (lo pone core/boot: este módulo no conoce la pantalla) */
let errorNotice = null;
/** Deja dicho cómo avisar al usuario de un error inesperado de la app. */
export const setErrorNotice = f => {
  errorNotice = f;
};
/* cuándo se avisó por última vez: como mucho, un aviso cada medio minuto */
let noticeAt = 0;
const NOTICE_EVERY = 3e4;
/* un error que nadie ha recogido: se anota y, si es de la app (trae su Error), se avisa: si no, lo que se tocó parece no
   hacer nada. Un mensaje suelto sin Error (de una extensión del navegador, por ejemplo) solo se anota */
window.addEventListener('error', e => {
  logError('global', e.error || e.message);
  if (e.error instanceof Error && errorNotice && Date.now() - noticeAt > NOTICE_EVERY) {
    noticeAt = Date.now();
    try {
      errorNotice();
    }
    catch (x) {
      /* avisar tampoco debe romper nada */
    }
  }
});
window.addEventListener('unhandledrejection', e => logError('promesa', e.reason));
