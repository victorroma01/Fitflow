/* ═══ account/privacy ═══
   Lo que la cuenta decide sobre sus datos, además de «Borrar todos los datos» (profile/home) y «Cerrar sesión»
   (account/account):
   - Retirar el consentimiento para tratar los datos de salud (Privacidad → Tus datos). Como la app no funciona sin esos datos,
     al retirarlo se borran los registros de la nube y del dispositivo (cloud/erase), se anota la retirada con su fecha
     (cloud/consent) y la app pasa a enseñar solo la pantalla que lo pide de nuevo (account/login). La cuenta sigue.
   - «Eliminar cuenta» (Ajustes → Cuenta, Privacidad y la pantalla de la aceptación): una página que dice qué se borra y pide
     la contraseña; tras confirmarlo, cloud/erase borra todo lo de la cuenta en la nube, comprueba que no queda nada y elimina
     la cuenta; después se borra lo de este dispositivo y la app se abre de nuevo, sin sesión, diciendo que la cuenta ya no
     existe (deletedNotice). Si falla a medias se dice hasta dónde llegó, la cuenta sigue y se puede repetir.
   Define: wipeFailText, deleteBack, deleteMsg, deleteBusy, deletePage, deleteOut, deletedNotice  · acciones/registros: 5
*/
import { say, tr } from '../core/i18n.js';
import { $ } from '../core/util.js';
import { Store } from '../core/store.js';
import { logError } from '../core/errors.js';
import { reloadApp } from '../core/persist.js';
import { A } from '../core/registry.js';
import { toast } from '../core/toast.js';
import { confirmDialog, dialog, fullPage, pgHead } from '../core/ui.js';
import { account, acctDrop, acctSave } from '../cloud/session.js';
import { authMessage } from '../cloud/auth.js';
import { stopSync } from '../cloud/sync.js';
import { consentWithdrawn, syncConsent } from '../cloud/consent.js';
import { eraseAccount, wipeDevice, wipeRecords } from '../cloud/erase.js';
import { html } from '../core/html.js';
/** Lo que se dice cuando los datos de la cuenta no se han podido borrar de la nube (sin eso no se borra nada del dispositivo:
    la próxima sincronización los volvería a bajar). */
export const wipeFailText = e => e.code == 'NETWORK' ? 'Sin conexión: para borrar también los datos de tu cuenta hace falta internet' : say `No se pudieron borrar los datos de tu cuenta (${e.code})`;
/* adónde vuelve «←» de «Eliminar cuenta» ('' la cierra), su último aviso y 1 mientras se elimina */
let deleteBack = '';
let deleteMsg = '';
let deleteBusy = 0;
const deletePage = () => html`
  <div id="dlc">
    ${pgHead('Eliminar cuenta', deleteBack)}
    <p class="m-0-0-10">
      Se borrarán para siempre tu cuenta y todo lo que hay en ella: programas, entrenos, comidas, medidas, peso, foto, la copia de seguridad de la nube, lo que has aceptado y los avisos que nos has enviado. También los datos de este dispositivo.
    </p>
    <p class="muted fs-14 m-0-0-10">
      No se puede deshacer. Si quieres conservar algo, guarda antes una copia en Ajustes → Copia de seguridad: los archivos que hayas exportado siguen donde los guardaste.
    </p>
    <p class="muted fs-14 m-0-0-10">Si tienes la sesión abierta en otros dispositivos, ciérrala también en ellos.</p>
    <label for="dlp">Contraseña de ${account ? account.u : ''}</label>
    <input id="dlp" type="password" autocomplete="current-password" maxlength="100" data-enter="deleteAccountAsk">
    <p id="dle" class="form-error" role="alert">${deleteMsg}</p>
    <button class="w-full danger-btn" data-a="deleteAccountAsk">Eliminar mi cuenta</button>
    <div class="h-40"></div>
  </div>`;
/* un aviso bajo la contraseña (la página puede volver a pintarse: se guarda) */
const deleteOut = t => {
  deleteMsg = t;
  const e = $('#dle');
  if (e)
    e.textContent = tr(t);
};
/** Al abrirse la app justo después de eliminar la cuenta en este dispositivo: lo dice, una vez (core/boot). */
export const deletedNotice = () => {
  try {
    if (Store.get(Store.K.gone) != '1')
      return;
    Store.del(Store.K.gone);
  }
  catch (e) {
    return;
  }
  setTimeout(() => dialog('Cuenta eliminada', 'Tu cuenta y todos sus datos se han borrado. Gracias por haber usado StrataFit.', [['Entendido', 'doNothing', 'primary']]), 300);
};
/* — manejadores de esta función (registros A / C / U) — */
A.consentWithdrawAsk = () => confirmDialog('¿Retirar el consentimiento?', 'StrataFit dejará de tratar tus datos de salud. Como no puede funcionar sin ellos, se borrarán de este dispositivo y de tu cuenta tus programas, entrenos, comidas, medidas y peso, con la foto y la copia de seguridad de la nube. Tu usuario se mantiene y podrás volver a darlo cuando quieras. No se puede deshacer.', 'consentWithdraw', 'Retirar y borrar');
A.consentWithdraw = async () => {
  const a = account;
  if (!a)
    return;
  toast('Borrando…');
  try {
    await wipeRecords();
  }
  catch (e) {
    toast(wipeFailText(e));
    return;
  }
  stopSync();
  acctSave({ ...account, cs: consentWithdrawn(account.cs), csu: 1 });
  /* la retirada, al perfil de la cuenta; si ahora no se puede, sube al volver a abrir la app (account/login) */
  try {
    await syncConsent('users/' + a.uid, null);
  }
  catch (e) {
    logError('retirar el consentimiento: anotarlo', e);
  }
  await wipeDevice();
  reloadApp();
};
A.openDeleteAccount = () => {
  deleteBack = $('#ajs') ? 'settingsBackToAccount' : $('#lgl') ? 'openLegal' : '';
  deleteMsg = '';
  fullPage(deletePage());
};
A.deleteAccountAsk = () => {
  if (deleteBusy)
    return;
  if (!(($('#dlp') || {}).value || '')) {
    deleteOut('Escribe tu contraseña.');
    return;
  }
  confirmDialog('¿Eliminar la cuenta?', 'Tu cuenta y todos sus datos se borrarán para siempre. No se puede deshacer.', 'deleteAccountConfirmed', 'Eliminar cuenta');
};
A.deleteAccountConfirmed = async () => {
  const pw = ($('#dlp') || {}).value || '';
  if (deleteBusy || !account || !pw)
    return;
  deleteBusy = 1;
  /* hasta dónde ha llegado: 0 la contraseña, 1 los datos, 2 la cuenta */
  let stage = -1;
  try {
    await eraseAccount(pw, t => {
      stage++;
      deleteOut(t);
    });
  }
  catch (e) {
    deleteBusy = 0;
    const wrong = ['INVALID_LOGIN_CREDENTIALS', 'INVALID_PASSWORD'].includes(e.code);
    if (stage > 0 || !wrong && e.code != 'NETWORK')
      logError('eliminar la cuenta (paso ' + stage + ')', e);
    deleteOut(stage <= 0 ? wrong ? 'La contraseña no es correcta.' : e.code == 'NETWORK' ? 'Sin conexión. Para eliminar la cuenta hace falta internet.' : authMessage(e)
      : stage == 1 ? say `No se han podido borrar todos tus datos (${e.code}) y la cuenta no se ha eliminado. Inténtalo de nuevo.`
        : e.code == 'ADMIN_ONLY_OPERATION' ? 'Tus datos se han borrado, pero el servidor no deja eliminar la cuenta desde la app. Pídelo en Perfil → Fallos y sugerencias, con el tipo «Privacidad y datos».'
          : say `Tus datos se han borrado, pero la cuenta no se ha podido eliminar (${e.code}). Inténtalo de nuevo.`);
    return;
  }
  /* la cuenta ya no existe: fuera lo de este dispositivo y la sesión, y la app se abre de nuevo */
  await wipeDevice();
  acctDrop();
  for (const k of [Store.K.own, Store.K.lgn])
    try {
      Store.del(k);
    }
    catch (e) {
      /* sin esa clave: nada que borrar */
    }
  try {
    Store.set(Store.K.gone, '1');
  }
  catch (e) {
    /* sin sitio para el aviso: la app se abre igual, sin sesión */
  }
  reloadApp();
};
