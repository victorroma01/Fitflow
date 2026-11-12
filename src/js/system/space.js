/* ═══ system/space ═══
   Aviso de espacio (I-04): cuánto ocupa lo que la app guarda en el móvil frente a lo que el navegador le deja (localStorage,
   unos 5 MB; IndexedDB y lo demás, según navigator.storage.estimate) y, si lo más lleno pasa del 80 %, un aviso, como mucho
   una vez a la semana, para hacer una copia y liberar espacio antes de que deje de guardarse. Diagnóstico enseña el uso.
   Define: LS_LIMIT, SPACE_WARN, SPACE_EVERY, lastSpace, spaceUse, mb, spaceText, spaceTries, spaceBusy, spaceCheck
*/
import { $ } from '../core/util.js';
import { Store } from '../core/store.js';
import { logError } from '../core/errors.js';
import { W } from '../core/state.js';
import { dialog } from '../core/ui.js';
/** Caracteres que admite localStorage, por lo bajo: unos 5 MB, y cada carácter ocupa 2 bytes (UTF-16). */
const LS_LIMIT = 2.5e6;
/** A partir de qué parte usada se avisa. */
const SPACE_WARN = 0.8;
/** Cada cuánto, como mucho, se vuelve a avisar (ms). */
const SPACE_EVERY = 7 * 864e5;
/** La última medida (spaceUse), para Diagnóstico; null si aún no se ha medido. */
export let lastSpace = null;
/** Lo que ocupa la app: { ls: caracteres en localStorage, usage y quota: bytes de lo demás según el navegador (null si no lo
  dice), ratio: la parte usada (0-1) de lo que esté más lleno }. */
export const spaceUse = async () => {
  let ls = 0;
  try {
    for (const k of Store.keys(''))
      ls += k.length + (Store.get(k) || '').length;
  }
  catch (e) {
    logError('medir el espacio', e);
  }
  let usage = null;
  let quota = null;
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const e = await navigator.storage.estimate();
      if (e && e.quota > 0) {
        usage = e.usage || 0;
        quota = e.quota;
      }
    }
  }
  catch (e) {
    logError('medir el espacio', e);
  }
  lastSpace = { ls, usage, quota, ratio: Math.max(ls / LS_LIMIT, quota ? usage / quota : 0) };
  return lastSpace;
};
const mb = n => (n / 1048576).toLocaleString('es-ES', { maximumFractionDigits: n < 10485760 ? 1 : 0 }) + ' MB';
/** La medida en una línea, para Diagnóstico. */
export const spaceText = u => !u ? '' : 'localStorage ' + mb(u.ls * 2) + ' de unos ' + mb(LS_LIMIT * 2) + ' (' + Math.round(u.ls / LS_LIMIT * 100) + ' %)' + (u.quota ? ' · IndexedDB y caché ' + mb(u.usage) + ' de ' + mb(u.quota) + ' (' + Math.round(u.usage / u.quota * 100) + ' %)' : '');
/* intentos de enseñar el aviso mientras la app está ocupada (cada 30 s) */
let spaceTries = 0;
/* ¿Hay algo delante (un entreno, una ventana, el recorrido…)? */
const spaceBusy = () => !!(W || document.visibilityState == 'hidden' || $('#lgw') || $('#wlc') || $('#tour') || $('#upd') || $('#f2w') || $('#sh').firstChild || $('#dg').firstChild || $('#mn').firstChild);
/** Al arrancar (core/boot): mide y, si queda poco espacio y hace una semana que no se avisa, avisa cuando la app esté libre. */
export const spaceCheck = async () => {
  try {
    if (Date.now() - (+Store.get(Store.K.space) || 0) < SPACE_EVERY)
      return;
    const u = await spaceUse();
    if (u.ratio < SPACE_WARN)
      return;
    if (spaceBusy()) {
      if (++spaceTries <= 20)
        setTimeout(spaceCheck, 30000);
      return;
    }
    Store.set(Store.K.space, String(Date.now()));
    dialog('Queda poco espacio', 'La app ya usa el ' + Math.round(u.ratio * 100) + ' % del espacio que el navegador le deja en este móvil. Si se llena, lo nuevo no se podrá guardar aquí. Haz una copia de seguridad y libera espacio en el móvil.', [['Más tarde', 'doNothing', ''], ['Copia de seguridad', 'openBackup', 'pr']]);
  }
  catch (e) {
    logError('aviso de espacio', e);
  }
};
