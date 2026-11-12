/* ═══ account/account ═══
   La cuenta en Ajustes: usuario, tipo de cuenta y estado de la sincronización, cambiar la contraseña y «Cerrar sesión»
   (F-29), que antes intenta subir lo pendiente y luego borra del móvil los datos de la cuenta.
   Define: syncShort, infoRow, accountPage, pwMsg, passwordPage  · acciones/registros: 4
*/
import { $ } from '../core/util.js';
import { Store } from '../core/store.js';
import { lockSaves, reloadApp } from '../core/persist.js';
import { A } from '../core/registry.js';
import { toast } from '../core/toast.js';
import { confirmDialog } from '../core/ui.js';
import { plural } from '../system/backup.js';
import { account, acctDrop, acctName, acctSave, isAdmin, wipeAccountData } from '../cloud/session.js';
import { authMessage, changePassword, passProblem, signIn } from '../cloud/auth.js';
import { pendingDocs, stopSync, syncLine, syncNow, syncState } from '../cloud/sync.js';
import { html, raw } from '../core/html.js';
/** Estado de la sincronización en una palabra (valor de la fila de Ajustes). */
export const syncShort = () => account && (account.x || syncState().st == 'dead') ? 'Vuelve a entrar' : { run: 'Sincronizando…', off: 'Sin conexión', wait: 'Tras el entreno', err: 'Reintentando' }[syncState().st] || 'Al día';
const infoRow = (l, v) => html`<div class="it cols-auto-1fr gap-12"><span>${raw(l)}</span><b class="ta-r ow-anywhere">${v}</b></div>`;
/** Página «Cuenta» de Ajustes. */
export const accountPage = () => html`<div class="cd acl">${raw(infoRow('Usuario', acctName()))}${raw(infoRow('Tipo de cuenta', isAdmin() ? 'Administrador' : 'Usuario'))}${raw(infoRow('Sincronización', syncLine()))}</div>${account && account.x ? html`<button class="pr w-full m-4-0-8" data-a="reloginShow">Volver a entrar</button>` : html`<button data-a="accountSyncNow" class="w-full m-4-0-8">Sincronizar ahora</button>`}<button data-a="openSettingsPage" data-v="clave" class="w-full">Cambiar contraseña</button><p class="mu fs-13 m-14-2">Tus datos se guardan en este móvil y en tu cuenta. Sin conexión todo sigue funcionando: lo que hagas se sube solo al volver la red.</p>`;
/* el último aviso de «Cambiar contraseña» (la página se vuelve a pintar con cada R(): así no se pierde) */
let pwMsg = '';
/** Página «Cambiar contraseña». */
export const passwordPage = () => html`<label for="acp0">Contraseña actual</label><input id="acp0" type="password" autocomplete="current-password" maxlength="100"><label for="acp1">Contraseña nueva</label><input id="acp1" type="password" autocomplete="new-password" maxlength="100"><label for="acp2">Repite la nueva</label><input id="acp2" type="password" autocomplete="new-password" maxlength="100" data-enter="accountChangePassword"><p id="ace" class="lge" role="alert">${pwMsg}</p><button class="pr w-full mt-8" data-a="accountChangePassword">Cambiar contraseña</button><p class="mu fs-13 m-12-2">De 8 caracteres o más. Al cambiarla se cierra la sesión en tus otros móviles: allí tendrás que volver a entrar.</p>`;
/* — manejadores de esta función (registros A / C / U) — */
A.accountSyncNow = async () => {
  if (account && account.x) {
    A.reloginShow();
    return;
  }
  toast('Sincronizando…');
  await syncNow();
  toast(syncState().st == 'ok' ? 'Todo al día' : 'No se pudo: ' + syncLine());
};
A.accountChangePassword = async () => {
  const v = id => ($('#' + id) || {}).value || '';
  const out = t => {
    pwMsg = t;
    const e = $('#ace');
    if (e)
      e.textContent = t;
  };
  const pr = !v('acp0') ? 'Escribe tu contraseña actual.' : passProblem(v('acp1')) || (v('acp1') !== v('acp2') ? 'Las dos contraseñas nuevas no coinciden.' : '');
  if (pr) {
    out(pr);
    return;
  }
  out('Cambiando…');
  try {
    /* primero se comprueba la actual: con el móvil desbloqueado, otra persona no podría cambiarla */
    const s = await signIn(account.u, v('acp0'));
    if (s.uid !== account.uid) {
      out('La cuenta no coincide con la de este móvil.');
      return;
    }
    acctSave({ ...s, u: account.u });
    await changePassword(v('acp1'));
  }
  catch (e) {
    out(['INVALID_LOGIN_CREDENTIALS', 'INVALID_PASSWORD'].includes(e.code) ? 'La contraseña actual no es correcta.' : authMessage(e));
    return;
  }
  pwMsg = '';
  toast('Contraseña cambiada');
  A.openSettings();
};
A.signOut = async () => {
  if (account && !account.x && pendingDocs()) {
    toast('Subiendo tus cambios…');
    await syncNow();
  }
  const n = pendingDocs();
  const t = n ? 'Hay cambios sin subir' : '¿Cerrar sesión?';
  const p = n ? 'No se han podido subir a tu cuenta (' + plural(n, 'parte', 'partes') + ')' + (account && account.x ? ' porque la sesión ha caducado: vuelve a entrar primero' : ': prueba con conexión') + '. Si cierras la sesión ahora, se perderán.' : 'Tus datos están en tu cuenta. Se borran de este móvil hasta que vuelvas a entrar.';
  confirmDialog(t, p, 'signOutConfirmed', n ? 'Cerrar igualmente' : 'Cerrar sesión');
};
A.signOutConfirmed = () => {
  stopSync();
  lockSaves();
  wipeAccountData();
  acctDrop();
  try {
    Store.del(Store.K.own);
  }
  catch (e) {
    /* sin dueño guardado: al entrar se borra igual lo que hubiera */
  }
  reloadApp();
};
