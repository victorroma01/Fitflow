/* ═══ cloud/erase ═══
   Borrar de verdad, en la nube y en este dispositivo. Tres alcances:
   - wipeRecords: los registros de la cuenta en la nube (lo que hace cloud/sync: wipeCloudData, con la foto), su copia de
     seguridad y el sexo del perfil. La cuenta sigue: su usuario, sus preferencias, lo que tiene aceptado y los avisos que
     envió. Es la parte de la nube de «Borrar todos los datos» y de retirar el consentimiento.
   - wipeDevice: todo lo de la cuenta en este dispositivo, también las copias automáticas de cada día (system/snapshots) y la
     de antes de restaurar: lo borrado no se puede recuperar desde aquí. Bloquea los guardados hasta recargar.
   - eraseAccount, «Eliminar cuenta»: con la contraseña recién comprobada, borra de la nube todo lo de la cuenta (sus
     documentos, estén o no en el índice; su copia; su foto; sus avisos, y al final su perfil), comprueba que no queda nada y
     solo entonces elimina la cuenta de Authentication. Si algo falla a medias, lanza el error y la cuenta sigue: se puede
     repetir, y lo ya borrado no estorba. Lo que otro dispositivo con la sesión abierta suba después lo quita la limpieza
     periódica (tools/admin/limpieza.mjs), igual que las cuentas sin actividad.
   Define: wipeRecords, wipeDevice, DATA_COLLECTIONS, ownPaths, eraseAccount
*/
import { logError } from '../core/errors.js';
import { lockSaves } from '../core/persist.js';
import { snapTx } from '../system/snapshots.js';
import { account, acctSave, wipeAccountData } from './session.js';
import { netError } from './net.js';
import { deleteAuthAccount, signIn } from './auth.js';
import { commitWrites, delWrite, getDoc, listDocs, queryDocs, setWrite } from './firestore.js';
import { stopSync, wipeCloudData } from './sync.js';
import { wipeCloudBackup } from './backup.js';
import { profilePath } from './docs.js';
/** Borra de la nube los registros de la cuenta, su foto, su copia de seguridad y el sexo del perfil. Lanza un error de
    cloud/net si algo no se pudo borrar (sin conexión: NETWORK). */
export const wipeRecords = async () => {
  await wipeCloudData();
  await wipeCloudBackup();
  try {
    await commitWrites([setWrite(profilePath(), { sx: '', m: Date.now() }, { exists: true }, ['sx', 'm'])]);
  }
  catch (e) {
    /* una cuenta que aún no tiene perfil no tiene sexo que borrar */
    if (e.code != 'NOT_FOUND')
      throw e;
  }
};
/** Borra de este dispositivo todo lo de la cuenta (no la sesión) y bloquea los guardados hasta recargar la página. */
export const wipeDevice = async () => {
  lockSaves();
  try {
    await snapTx('readwrite', st => st.clear());
  }
  catch (e) {
    logError('borrar las copias automáticas', e);
  }
  wipeAccountData();
};
/* las colecciones de cada cuenta, bajo users/{uid} (firestore.rules) */
const DATA_COLLECTIONS = ['data', 'logs', 'hist', 'meals', 'private', 'backup'];
/* todo lo que la cuenta `uid` tiene en la nube, menos su perfil: sus documentos y sus avisos */
const ownPaths = async (uid) => {
  const root = 'users/' + uid;
  const paths = [];
  for (const c of DATA_COLLECTIONS)
    for (const d of await listDocs(root + '/' + c))
      paths.push(root + '/' + c + '/' + d.id);
  for (const d of await queryDocs('reports', 'uid', uid))
    paths.push('reports/' + d.id);
  return paths;
};
/** «Eliminar cuenta». `password`: la de la cuenta, que se comprueba antes de nada; `step(texto)`: por dónde va. Al terminar
    bien, la cuenta ya no existe (falta borrar lo de este dispositivo y la sesión: account/delete). Lanza un error de cloud/net:
    los de Authentication (contraseña que no es, ADMIN_ONLY_OPERATION si el servidor no deja eliminar cuentas…), NETWORK,
    OTHER_ACCOUNT o NOT_ERASED si tras borrar aún queda algo.
    @param {string} password
    @param {(t: string) => void} step */
export const eraseAccount = async (password, step) => {
  const a = account;
  if (!a)
    throw netError('NO_SESSION');
  step('Comprobando la contraseña…');
  const s = await signIn(a.u, password);
  if (s.uid !== a.uid)
    throw netError('OTHER_ACCOUNT');
  acctSave({ ...account, ...s, u: a.u, x: 0 });
  /* nada sube mientras se borra */
  stopSync();
  step('Borrando tus datos…');
  const root = 'users/' + a.uid;
  const paths = await ownPaths(a.uid);
  for (let i = 0; i < paths.length; i += 400)
    await commitWrites(paths.slice(i, i + 400).map(delWrite));
  await commitWrites([delWrite(root)]);
  if ((await ownPaths(a.uid)).length || await getDoc(root))
    throw netError('NOT_ERASED');
  step('Eliminando la cuenta…');
  await deleteAuthAccount();
};
