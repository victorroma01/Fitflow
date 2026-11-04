/* ═══ cloud/session ═══
   La cuenta con la que se ha entrado en este dispositivo: uid de Firebase, nombre de usuario y tokens (clave `acct` de
   Store). Sin sesión, la app solo enseña el inicio de sesión (account/login).
   Los datos del móvil son de una sola cuenta (clave `own`). Al cargar, antes de leer el estado (core/state), si los datos
   guardados son de otra cuenta o de antes de las cuentas, se borran: cada cuenta solo ve lo suyo, y los datos de la serie de
   prueba no se migran.
   Define: account, readAccount, signedIn, acctName, acctClaims, isAdmin, acctSave, acctDrop, ACCOUNT_KEYS, wipeAccountData
*/
import { Store } from '../core/store.js';
import { logError } from '../core/errors.js';
import { dropSavedState } from '../core/persist.js';
/** { uid, u: usuario, it: token de sesión, rt: token de renovación, exp: caducidad del token (ms), x: 1 si la sesión ya no
  vale y hay que volver a entrar } o null. */
export let account = null;
const readAccount = () => {
  try {
    const a = JSON.parse(Store.get(Store.K.acct));
    return a && typeof a.uid == 'string' && a.uid && typeof a.rt == 'string' && typeof a.u == 'string' ? a : null;
  }
  catch (e) {
    return null;
  }
};
account = readAccount();
export const signedIn = () => !!account;
export const acctName = () => account ? account.u : '';
/** Datos del token de sesión (custom claims incluidos): { user_id, email, role… }; {} si no hay o no se puede leer. */
const acctClaims = () => {
  try {
    const p = account.it.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const o = JSON.parse(atob(p));
    return o && typeof o == 'object' ? o : {};
  }
  catch (e) {
    return {};
  }
};
/** ¿Es la cuenta del admin? Lo dice el rol del token (custom claim), que solo se cambia desde GitHub (tools/admin). Las reglas
  de Firestore lo vuelven a comprobar: tocar la app no da acceso a nada. */
export const isAdmin = () => acctClaims().role === 'admin';
/** Guarda la sesión (tras entrar, renovar el token o cambiar la contraseña). */
export const acctSave = a => {
  account = a;
  Store.set(Store.K.acct, JSON.stringify(a));
};
export const acctDrop = () => {
  account = null;
  Store.del(Store.K.acct);
};
/** Claves de Store con datos de la cuenta, además del estado (ff y sus partes). */
const ACCOUNT_KEYS = ['wip', 'pre', 'rs', 'bad', 'sync'];
/** Borra del móvil los datos de la cuenta: estado, entreno en curso, copias previas, lo apartado y la sincronización, y las
  copias automáticas (IndexedDB). No toca la sesión ni lo que es del dispositivo (errores, versión vista). */
export const wipeAccountData = () => {
  try {
    dropSavedState();
  }
  catch (e) {
    logError('borrar datos de la cuenta', e);
  }
  for (const k of ACCOUNT_KEYS.map(x => Store.K[x]))
    try {
      Store.del(k);
    }
    catch (e) {
      logError('borrar datos de la cuenta (' + k + ')', e);
    }
  try {
    indexedDB.deleteDatabase('ffsnap');
  }
  catch (e) {
    logError('borrar copias automáticas', e);
  }
};
/* datos de otra cuenta, o de antes de las cuentas: fuera antes de que core/state los lea */
if (account)
  try {
    if (Store.get(Store.K.own) !== account.uid) {
      wipeAccountData();
      Store.set(Store.K.own, account.uid);
    }
  }
  catch (e) {
    logError('dueño de los datos', e);
  }
