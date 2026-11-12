/* ═══ account/login ═══
   Inicio de sesión y registro (F-32): usuario y contraseña, sin ningún dato personal (F-35). Ocupa toda la pantalla
   mientras no hay sesión (core/render lo pinta en lugar de la app). También el cambio obligatorio de una contraseña
   temporal (la que crea el admin desde GitHub) y volver a entrar cuando la sesión caduca.
   Tras cinco intentos fallidos, una espera que se dobla en cada fallo (de 5 s a 5 min), además del bloqueo de Firebase.
   Al entrar: si los datos del móvil son de otra cuenta se borran, se bajan los de la cuenta (cloud/sync) y la app se abre
   de nuevo con ellos.
   Define: loginState, waitLeft, noteFail, BAD_LOGIN, clearFails, loginBusy, loginError, waitTimer, loginField, loginModeTabs, signUpExtra, loginView, passwordView, loginSync, enterAccount, finishLogin, reloginBusy  · acciones/registros: 7
*/
import { $, APPV } from '../core/util.js';
import { Store } from '../core/store.js';
import { logError } from '../core/errors.js';
import { A } from '../core/registry.js';
import { flushState, markNewAccount, resetState } from '../core/state.js';
import { reloadApp } from '../core/persist.js';
import { repairState } from '../core/repair.js';
import { icon } from '../core/icons.js';
import { brandLogo } from '../core/brand.js';
import { morph } from '../core/morph.js';
import { pgHead, sheet } from '../core/ui.js';
import { toast } from '../core/toast.js';
import { privacyText, RECAPTCHA_TEXT } from '../profile/settings.js';
import { appCheckOn } from '../cloud/appcheck.js';
import { account, acctSave, wipeAccountData } from '../cloud/session.js';
import { authMessage, changePassword, passProblem, signIn, signUp, userProblem } from '../cloud/auth.js';
import { commitWrites, getDoc, setWrite } from '../cloud/firestore.js';
import { firstSync, syncNow } from '../cloud/sync.js';
import { html, raw } from '../core/html.js';
/* m: 'in' entrar | 'up' crear cuenta; busy: texto del botón mientras se espera al servidor; err: el último error; eye: 1 si
   la contraseña se ve */
let loginState = { m: 'in', busy: '', err: '', eye: 0 };
/** Milisegundos que faltan para poder volver a intentarlo (0 si se puede ya). */
const waitLeft = () => {
  try {
    const o = JSON.parse(Store.get(Store.K.lgn));
    if (o && o.n >= 5)
      return Math.max(0, o.t + Math.min(300, 5 * 2 ** (o.n - 5)) * 1e3 - Date.now());
  }
  catch (e) {
    /* sin intentos fallidos guardados */
  }
  return 0;
};
const noteFail = () => {
  let o = null;
  try {
    o = JSON.parse(Store.get(Store.K.lgn));
  }
  catch (e) {
    o = null;
  }
  try {
    Store.set(Store.K.lgn, JSON.stringify({ n: (o && +o.n || 0) + 1, t: Date.now() }));
  }
  catch (e) {
    logError('guardar intento fallido', e);
  }
};
/** Códigos de Authentication de un usuario o una contraseña que no valen: cuentan como intento fallido. */
const BAD_LOGIN = ['INVALID_LOGIN_CREDENTIALS', 'INVALID_PASSWORD', 'EMAIL_NOT_FOUND'];
const clearFails = () => {
  try {
    Store.del(Store.K.lgn);
  }
  catch (e) {
    logError('borrar intentos fallidos', e);
  }
};
const loginBusy = t => {
  loginState.busy = t;
  loginState.err = '';
  loginSync();
};
const loginError = t => {
  loginState.busy = '';
  loginState.err = t;
  loginSync();
  const e = $('#lge');
  e && e.scrollIntoView && e.scrollIntoView({ block: 'nearest' });
};
/* mientras hay que esperar, el botón cuenta los segundos */
let waitTimer = 0;
const loginField = (id, label, o) => html`<label for="${id}">${label}</label>${raw(o.pw ? html`<div class="lgpw"><input id="${id}" type="${loginState.eye ? 'text' : 'password'}" autocomplete="${o.ac}" maxlength="100" data-enter="${o.go}"><button type="button" class="lgey" data-a="loginToggleEye" aria-label="${loginState.eye ? 'Ocultar la contraseña' : 'Ver la contraseña'}">${icon(loginState.eye ? 'eyeoff' : 'eye', 20)}</button></div>` : html`<input id="${id}" autocomplete="${o.ac}" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="20" data-enter="${o.go}">`)}`;
/* Entrar o Crear cuenta */
const loginModeTabs = up => html`<div class="seg s2" role="tablist" aria-label="Entrar o crear cuenta"><button class="${up ? '' : 'on'}" data-a="loginMode" data-v="in" role="tab" aria-selected="${up ? 'false' : 'true'}">Entrar</button><button class="${up ? 'on' : ''}" data-a="loginMode" data-v="up" role="tab" aria-selected="${up ? 'true' : 'false'}">Crear cuenta</button></div>`;
/* al crear la cuenta: repetir la contraseña y qué se admite */
const signUpExtra = () => html`<label for="lgp2">Repite la contraseña</label><input id="lgp2" type="${loginState.eye ? 'text' : 'password'}" autocomplete="new-password" maxlength="100" data-enter="loginSubmit"><p class="mu lgh">Usuario de 3 a 20 caracteres: letras sin tilde, números, punto, guion y guion bajo. Contraseña de 8 caracteres o más.</p>`;
/** Pantalla de inicio de sesión o de registro. */
const loginView = () => {
  if (account && account.mc)
    return passwordView();
  const up = loginState.m == 'up';
  const wait = waitLeft();
  const label = loginState.busy || (wait ? 'Espera ' + Math.ceil(wait / 1e3) + ' s' : up ? 'Crear cuenta' : 'Entrar');
  const note = up ? 'Tus entrenos, comidas y medidas se guardan en tu cuenta para no perderlos y usarlos en varios móviles. No se guarda ningún dato personal: ni nombre, ni correo, ni teléfono.' : '¿Has olvidado la contraseña? Pídele al administrador una temporal.';
  const form = html`${loginModeTabs(up)}${raw(loginField('lgu', 'Usuario', { ac: 'username', go: 'loginSubmit' }))}${raw(loginField('lgp', 'Contraseña', { pw: 1, ac: up ? 'new-password' : 'current-password', go: 'loginSubmit' }))}${up ? signUpExtra() : ''}<p id="lge" class="lge" role="alert">${loginState.err}</p><button class="pr lgb" data-a="loginSubmit"${raw(loginState.busy || wait ? ' disabled' : '')}>${label}</button>`;
  return html`<div id="lgw" class="lgw"><div class="lgbr">${brandLogo('lgl', 1)}</div><p class="lgs">Entrenamiento y nutrición</p><div class="cd lgc">${form}</div><p class="mu lgn">${note}</p>${appCheckOn() ? html`<p class="mu lgn fs-12">${RECAPTCHA_TEXT}</p>` : ''}<button class="lgl" data-a="loginPrivacy">Privacidad</button><div class="lgv">V${APPV}</div></div>`;
};
/** Cambio obligatorio de una contraseña temporal (account.mc: 1 al entrar, 2 al volver a entrar con la sesión caducada). */
const passwordView = () => html`<div id="lgw" class="lgw"><div class="lgbr">${brandLogo('lgl', 1)}</div><div class="cd lgc"><h2 class="lgt">Elige una contraseña nueva</h2><p class="mu m-0-0-6">Has entrado con una contraseña temporal. Para seguir, elige una nueva que solo sepas tú.</p>${raw(loginField('lgp', 'Contraseña nueva', { pw: 1, ac: 'new-password', go: 'loginCreatePassword' }))}<label for="lgp2">Repite la contraseña</label><input id="lgp2" type="${loginState.eye ? 'text' : 'password'}" autocomplete="new-password" maxlength="100" data-enter="loginCreatePassword"><p id="lge" class="lge" role="alert">${loginState.err}</p><button class="pr lgb" data-a="loginCreatePassword"${raw(loginState.busy ? ' disabled' : '')}>${loginState.busy || 'Guardar y entrar'}</button></div><div class="lgv">V${APPV}</div></div>`;
/** Pinta el inicio de sesión en #app (desde core/render, en lugar de la app). Si ya estaba, cambia solo lo distinto y
  conserva lo escrito. */
export const loginSync = () => {
  const app = $('#app');
  if ($('#lgw')) {
    /* lo escrito no va en el HTML (tampoco la contraseña): se guarda antes de pintar y se devuelve a los campos */
    const keep = ['lgu', 'lgp', 'lgp2'].map(id => [id, ($('#' + id) || {}).value]);
    morph(app, loginView());
    for (const [id, v] of keep) {
      const e = $('#' + id);
      if (e && typeof v == 'string')
        e.value = v;
    }
  }
  else
    app.innerHTML = loginView();
  $('nav').style.display = 'none';
  clearInterval(waitTimer);
  if (waitLeft() && !loginState.busy)
    waitTimer = setInterval(() => {
      if (!$('#lgw') || !waitLeft())
        clearInterval(waitTimer);
      if ($('#lgw'))
        loginSync();
    }, 1e3);
};
/* ya con la sesión: datos del móvil de esta cuenta, contraseña temporal y primera sincronización */
const enterAccount = async (s, fresh) => {
  if (Store.get(Store.K.own) !== s.uid) {
    wipeAccountData();
    resetState();
    repairState();
    Store.set(Store.K.own, s.uid);
  }
  acctSave(s);
  /* recién creada: sin programa y con la bienvenida por ver (se suben con la primera sincronización) */
  if (fresh)
    markNewAccount();
  if (!fresh)
    try {
      const d = await getDoc('users/' + s.uid);
      if (d && d.data.mc === true) {
        acctSave({ ...account, mc: 1 });
        loginState = { m: 'in', busy: '', err: '', eye: 0 };
        loginSync();
        return;
      }
    }
    catch (e) {
      logError('entrar: leer el perfil', e);
    }
  await finishLogin();
};
/* baja los datos de la cuenta y abre la app de nuevo con ellos (si no se pudo, la sincronización lo reintenta después) */
const finishLogin = async () => {
  loginBusy('Cargando tus datos…');
  try {
    await firstSync();
  }
  catch (e) {
    logError('entrar: primera sincronización', e);
  }
  flushState();
  reloadApp();
};
/* — manejadores de esta función (registros A / C / U) — */
A.loginMode = (i, b) => {
  loginState = { m: b.dataset.v == 'up' ? 'up' : 'in', busy: '', err: '', eye: loginState.eye };
  loginSync();
};
A.loginToggleEye = () => {
  loginState.eye = loginState.eye ? 0 : 1;
  loginSync();
};
A.loginSubmit = async () => {
  if (loginState.busy)
    return;
  const v = id => ($('#' + id) || {}).value || '';
  const u = v('lgu').trim();
  const p = v('lgp');
  const up = loginState.m == 'up';
  const pr = userProblem(u) || passProblem(p) || (up && p !== v('lgp2') ? 'Las dos contraseñas no coinciden.' : '');
  if (pr) {
    loginError(pr);
    return;
  }
  if (waitLeft()) {
    loginError('Demasiados intentos. Espera un poco antes de volver a probar.');
    return;
  }
  loginBusy(up ? 'Creando la cuenta…' : 'Entrando…');
  let s;
  try {
    s = up ? await signUp(u, p) : await signIn(u, p);
  }
  catch (e) {
    if (BAD_LOGIN.includes(e.code))
      noteFail();
    loginError(authMessage(e));
    return;
  }
  clearFails();
  await enterAccount(s, up);
};
A.loginCreatePassword = async () => {
  if (loginState.busy)
    return;
  const p = ($('#lgp') || {}).value || '';
  const pr = passProblem(p) || (p !== (($('#lgp2') || {}).value || '') ? 'Las dos contraseñas no coinciden.' : '');
  if (pr) {
    loginError(pr);
    return;
  }
  loginBusy('Guardando…');
  try {
    await changePassword(p);
    await commitWrites([setWrite('users/' + account.uid, { mc: false, m: Date.now() }, null, ['mc', 'm'])]);
  }
  catch (e) {
    loginError(authMessage(e));
    return;
  }
  /* mc 2: se volvió a entrar en un móvil que ya tiene los datos de la cuenta (A.reloginSubmit): se sigue sin bajarlos de nuevo */
  const again = account.mc == 2;
  acctSave({ ...account, mc: 0 });
  if (!again) {
    await finishLogin();
    return;
  }
  loginState = { m: 'in', busy: '', err: '', eye: 0 };
  reloadApp();
};
A.loginPrivacy = () => sheet(html`${pgHead('Privacidad')}<div class="srt">${privacyText().map(p => html`<p>${p}</p>`)}</div><div class="h-30"></div>`);
/* sesión caducada (contraseña restablecida, otro dispositivo la cambió…): volver a entrar sin perder lo del móvil */
A.reloginShow = () => sheet(html`<h3>Vuelve a entrar</h3><p class="mu m-0-0-10">Tu sesión ha caducado, por ejemplo porque se cambió la contraseña. Lo que has hecho sigue en este móvil y se sube al entrar.</p><label for="lrp">Contraseña de ${account ? account.u : ''}</label><input id="lrp" type="password" autocomplete="current-password" maxlength="100" data-enter="reloginSubmit"><p id="lre" class="lge" role="alert"></p><button class="pr w-full mt-6" data-a="reloginSubmit">Entrar</button>`);
/* volver a entrar: una petición a la vez y la misma espera tras cinco intentos fallidos que en el inicio de sesión */
let reloginBusy = false;
A.reloginSubmit = async () => {
  if (reloginBusy)
    return;
  const p = ($('#lrp') || {}).value || '';
  const out = t => {
    const e = $('#lre');
    if (e)
      e.textContent = t;
  };
  if (passProblem(p)) {
    out(passProblem(p));
    return;
  }
  if (waitLeft()) {
    out('Demasiados intentos. Espera ' + Math.ceil(waitLeft() / 1e3) + ' s antes de volver a probar.');
    return;
  }
  reloginBusy = true;
  out('Entrando…');
  try {
    const s = await signIn(account.u, p);
    clearFails();
    if (s.uid !== account.uid) {
      out('Esa cuenta ya no es la de este móvil. Cierra la sesión en Ajustes y vuelve a entrar.');
      return;
    }
    acctSave({ ...s, u: account.u });
    const d = await getDoc('users/' + s.uid);
    if (d && d.data.mc === true)
      acctSave({ ...account, mc: 2 });
  }
  catch (e) {
    if (BAD_LOGIN.includes(e.code))
      noteFail();
    out(authMessage(e));
    return;
  }
  finally {
    reloginBusy = false;
  }
  sheet();
  if (account.mc) {
    loginSync();
    return;
  }
  toast('Sesión renovada');
  syncNow();
};
