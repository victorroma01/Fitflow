/* ═══ account/login ═══
   Inicio de sesión y registro (F-32): usuario y contraseña, sin ningún dato personal (F-35). Ocupa toda la pantalla
   mientras no hay sesión (core/render lo pinta en lugar de la app), siempre en oscuro y sobre la foto de un gimnasio (F-33). También el cambio obligatorio de una contraseña
   temporal (la que crea el admin desde GitHub) y volver a entrar cuando la sesión caduca.
   Tras cinco intentos fallidos, una espera que se dobla en cada fallo (de 5 s a 5 min), además del bloqueo de Firebase.
   Al entrar: si los datos del móvil son de otra cuenta se borran, se bajan los de la cuenta (cloud/sync) y la app se abre
   de nuevo con ellos.
   Para crear la cuenta hay que marcar dos casillas, que salen sin marcar: aceptar las condiciones de uso (con 16 años o más) y
   consentir el tratamiento de los datos de salud (consentChecks); lo aceptado se anota con la cuenta (cloud/consent). Una cuenta
   que no lo tiene (las anteriores a la V1.0.4, o tras retirar el consentimiento) ve, en lugar de la app, la pantalla que lo pide
   (consentView): hasta que acepte, la app no baja, sube ni enseña sus datos, y desde ahí puede exportarlos, borrarlos, eliminar
   la cuenta o cerrar la sesión. El Aviso legal y la Política de privacidad (profile/legal) se abren desde aquí, sin sesión.
   Define: loginState, firstPending, gateChecked, waitLeft, noteFail, BAD_LOGIN, clearFails, loginBusy, loginError, waitTimer, loginField, loginModeTabs, signUpExtra, consentChecks, consentProblem, loginBackdrop, RECAPTCHA_NOTE, loginView, consentView, gateRefresh, passwordView, loginSync, enterAccount, finishLogin, reloginBusy  · acciones/registros: 8
*/
import { say, tr } from '../core/i18n.js';
import { $, APPV } from '../core/util.js';
import { Store } from '../core/store.js';
import { logError } from '../core/errors.js';
import { A, C } from '../core/registry.js';
import { applyTheme, flushState, markNewAccount, resetState } from '../core/state.js';
import { reloadApp } from '../core/persist.js';
import { repairState } from '../core/repair.js';
import { icon } from '../core/icons.js';
import { brandLogo } from '../core/brand.js';
import { LOGIN_PHOTO } from '../data/photos.js';
import { morph } from '../core/morph.js';
import { sheet } from '../core/ui.js';
import { toast } from '../core/toast.js';
import { appCheckOn } from '../cloud/appcheck.js';
import { account, acctSave, wipeAccountData } from '../cloud/session.js';
import { authMessage, changePassword, passProblem, signIn, signUp, userProblem } from '../cloud/auth.js';
import { commitWrites, getDoc, setWrite } from '../cloud/firestore.js';
import { firstSync, forgetSynced, syncNow } from '../cloud/sync.js';
import { consentGiven, consentGone, consentPending, syncConsent } from '../cloud/consent.js';
import { html, raw } from '../core/html.js';
/* m: 'in' entrar | 'up' crear cuenta; busy: texto del botón mientras se espera al servidor; err: el último error; eye: 1 si
   la contraseña se ve; c1 y c2: 1 con la casilla de las condiciones o la del consentimiento marcada */
let loginState = { m: 'in', busy: '', err: '', eye: 0, c1: 0, c2: 0 };
/* 1 si la pantalla de la aceptación sale justo después de entrar, con los datos de la cuenta aún por bajar */
let firstPending = 0;
/* 1 cuando ya se ha mirado, en esta apertura, si la cuenta aceptó en otro dispositivo */
let gateChecked = 0;
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
const loginField = (id, label, o) => html`
  <label for="${id}">${label}</label>
  ${raw(o.pw ? html`
    <div class="password-field">
      <input id="${id}" type="${loginState.eye ? 'text' : 'password'}" autocomplete="${o.ac}" maxlength="100" data-enter="${o.go}">
      <button type="button" class="password-eye" data-a="loginToggleEye"
          aria-label="${loginState.eye ? 'Ocultar la contraseña' : 'Ver la contraseña'}">
        ${icon(loginState.eye ? 'eyeoff' : 'eye', 20)}
      </button>
    </div>
  ` : html`
    <input id="${id}" autocomplete="${o.ac}" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="20" data-enter="${o.go}">`)}`;
/* Entrar o Crear cuenta */
const loginModeTabs = up => html`
  <div class="segmented seg-2" role="tablist" aria-label="Entrar o crear cuenta">
    <button class="${up ? '' : 'on'}" data-a="loginMode" data-v="in" role="tab" aria-selected="${up ? 'false' : 'true'}">Entrar</button>
    <button class="${up ? 'on' : ''}" data-a="loginMode" data-v="up" role="tab" aria-selected="${up ? 'true' : 'false'}">
      Crear cuenta
    </button>
  </div>`;
/* al crear la cuenta: repetir la contraseña y qué se admite */
const signUpExtra = () => html`
  <label for="lgp2">Repite la contraseña</label>
  <input id="lgp2" type="${loginState.eye ? 'text' : 'password'}" autocomplete="new-password" maxlength="100" data-enter="loginSubmit">
  <p class="muted login-hint">
    Usuario de 3 a 20 caracteres: letras sin tilde, números, punto, guion y guion bajo. Contraseña de 8 caracteres o más.
  </p>`;
/** Las dos casillas, sin marcar, de crear la cuenta y de la pantalla de la aceptación: las condiciones de uso (con la edad) y el
    consentimiento expreso para los datos de salud, cada una con su texto a un toque. Su texto es el de la versión vigente del
    consentimiento (cloud/consent, LEGAL.health): si cambia, cambia su versión. */
const consentChecks = () => html`
  <div class="consent-checks">
    <label class="setting-check consent-check">
      <input type="checkbox" id="lgc1" data-c="loginConsent" data-i="1"${raw(loginState.c1 ? ' checked' : '')}>
      <span>
        Tengo 16 años o más y acepto las <button type="button" class="legal-link" data-a="openLegal" data-v="terms">Condiciones de uso</button>
        .
      </span>
    </label>
    <label class="setting-check consent-check">
      <input type="checkbox" id="lgc2" data-c="loginConsent" data-i="2"${raw(loginState.c2 ? ' checked' : '')}>
      <span>
        Consiento expresamente que StrataFit trate los datos relativos a mi salud que decida introducir para gestionar mi seguimiento físico, deportivo y nutricional. Puedo retirar mi consentimiento en cualquier momento desde Privacidad, sin afectar al tratamiento realizado anteriormente.
      </span>
    </label>
    <p class="muted consent-note">
      Consulta nuestra <button type="button" class="legal-link" data-a="openLegal" data-v="privacy">Política de privacidad</button> para conocer cómo tratamos tus datos y cómo puedes ejercer tus derechos.
    </p>
  </div>`;
/* qué casilla falta ('' si están las dos) */
const consentProblem = () => !loginState.c1 ? 'Para seguir, marca que tienes 16 años o más y que aceptas las condiciones de uso.' : !loginState.c2 ? 'Para seguir, marca la casilla del consentimiento para tratar tus datos de salud.' : '';
/** El fondo del inicio de sesión (F-33): la foto de un gimnasio visto desde arriba, ya en gris y desenfocada (data/photos);
  la oscurece css/94-account. Es un adorno: sin texto alternativo. */
const loginBackdrop = () => LOGIN_PHOTO ? html`<img class="login-photo" src="${LOGIN_PHOTO}" alt="" aria-hidden="true">` : '';
/** Lo que pide reCAPTCHA cuando su sello no se ve (cloud/appcheck): decir que se usa. Desde el 2 de abril de 2026, sin nombrar
    las condiciones de Google, como piden sus preguntas frecuentes. Qué hace lo cuenta Privacidad. */
const RECAPTCHA_NOTE = 'Protegido por reCAPTCHA.';
/** Pantalla de inicio de sesión o de registro: al crear cuenta, sin nota (lo que se guarda lo cuenta Privacidad). */
const loginView = () => {
  if (account && account.mc)
    return passwordView();
  if (consentPending())
    return consentView();
  const up = loginState.m == 'up';
  const wait = waitLeft();
  const label = loginState.busy || (wait ? say `Espera ${Math.ceil(wait / 1e3)} s` : up ? 'Crear cuenta' : 'Entrar');
  const form = html`
    ${loginModeTabs(up)}
    ${raw(loginField('lgu', 'Usuario', { ac: 'username', go: 'loginSubmit' }))}
    ${raw(loginField('lgp', 'Contraseña', { pw: 1, ac: up ? 'new-password' : 'current-password', go: 'loginSubmit' }))}
    ${up ? html`${signUpExtra()}${consentChecks()}` : ''}
    <p id="lge" class="form-error" role="alert">${loginState.err}</p>
    <button class="primary login-submit" data-a="loginSubmit"${raw(loginState.busy || wait ? ' disabled' : '')}>${label}</button>`;
  return html`
    <div id="lgw" class="login-page">
      ${loginBackdrop()}
      <div class="login-brand">${brandLogo('login-logo', 1)}</div>
      <p class="login-tagline">Entrenamiento y nutrición</p>
      <div class="card login-card">${form}</div>
      ${up ? '' : html`<p class="muted login-note">¿Has olvidado la contraseña? Pídele al administrador una temporal.</p>`}
      ${appCheckOn() ? html`<p class="muted login-note fs-12">${RECAPTCHA_NOTE}</p>` : ''}
      <div class="login-links">
        <button class="login-link" data-a="openLegal" data-v="privacy">Privacidad</button>
        <button class="login-link" data-a="openLegal" data-v="terms">Aviso legal</button>
      </div>
      <div class="login-version">V${APPV}</div>
    </div>`;
};
/** La pantalla de la aceptación, en lugar de la app, para una cuenta que no tiene aceptadas las condiciones vigentes o no ha dado
    (o ha retirado) el consentimiento: las dos casillas y, para quien no quiera aceptar, lo que puede hacer con sus datos. */
const consentView = () => {
  const gone = consentGone();
  return html`
    <div id="lgw" class="login-page">
      ${loginBackdrop()}
      <div class="login-brand">${brandLogo('login-logo', 1)}</div>
      <div class="card login-card">
        <h2 class="login-title">Condiciones y privacidad</h2>
        <p class="muted m-0-0-6">
          ${gone ? 'Has retirado tu consentimiento y tus registros se han borrado. Para volver a usar StrataFit con esta cuenta tienes que darlo de nuevo.' : 'Para seguir usando StrataFit con tu cuenta, acepta las condiciones y danos tu consentimiento para tratar los datos de salud que guardas. Hasta entonces, la app no usa ni sincroniza tus datos.'}
        </p>
        <p class="muted fs-13 m-0-0-6">Cuenta: <b>${account.u}</b></p>
        ${consentChecks()}
        <p id="lge" class="form-error" role="alert">${loginState.err}</p>
        <button class="primary login-submit" data-a="consentAccept"${raw(loginState.busy ? ' disabled' : '')}>
          ${loginState.busy || 'Aceptar y continuar'}
        </button>
      </div>
      <p class="muted login-note">Si prefieres no aceptar:</p>
      <div class="login-links">
        ${gone ? '' : html`
          <button class="login-link" data-a="gateExport">Exportar una copia</button>
          <button class="login-link" data-a="resetAllAsk">Borrar todos los datos</button>`}
        <button class="login-link" data-a="openDeleteAccount">Eliminar cuenta</button>
        <button class="login-link" data-a="signOut">Cerrar sesión</button>
      </div>
      <div class="login-links">
        <button class="login-link" data-a="openLegal" data-v="privacy">Privacidad</button>
        <button class="login-link" data-a="openLegal" data-v="terms">Aviso legal</button>
      </div>
      <div class="login-version">V${APPV}</div>
    </div>`;
};
/* con la pantalla de la aceptación a la vista: si la cuenta ya aceptó en otro dispositivo, se entra sin pedirlo otra vez (y lo
   aceptado aquí sin conexión, o lo retirado, sube al perfil). Una vez por apertura */
const gateRefresh = async () => {
  if (gateChecked || !account || account.x)
    return;
  gateChecked = 1;
  const a = account;
  try {
    const d = await getDoc('users/' + a.uid);
    if (account && account.uid == a.uid && await syncConsent('users/' + a.uid, d ? d.data.cs : null, !!d) && $('#lgc1'))
      reloadApp();
  }
  catch (e) {
    if (e.code != 'NETWORK' && e.code != 'SESSION')
      logError('aceptación: leer el perfil', e);
  }
};
/** Cambio obligatorio de una contraseña temporal (account.mc: 1 al entrar, 2 al volver a entrar con la sesión caducada). */
const passwordView = () => html`
  <div id="lgw" class="login-page">
    ${loginBackdrop()}
    <div class="login-brand">${brandLogo('login-logo', 1)}</div>
    <div class="card login-card">
      <h2 class="login-title">Elige una contraseña nueva</h2>
      <p class="muted m-0-0-6">Has entrado con una contraseña temporal. Para seguir, elige una nueva que solo sepas tú.</p>
      ${raw(loginField('lgp', 'Contraseña nueva', { pw: 1, ac: 'new-password', go: 'loginCreatePassword' }))}
      <label for="lgp2">Repite la contraseña</label>
      <input id="lgp2" type="${loginState.eye ? 'text' : 'password'}" autocomplete="new-password" maxlength="100"
          data-enter="loginCreatePassword">
      <p id="lge" class="form-error" role="alert">${loginState.err}</p>
      <button class="primary login-submit" data-a="loginCreatePassword"${raw(loginState.busy ? ' disabled' : '')}>
        ${loginState.busy || 'Guardar y entrar'}
      </button>
    </div>
    <div class="login-version">V${APPV}</div>
  </div>`;
/** Pinta el inicio de sesión en #app (desde core/render, en lugar de la app). Si ya estaba, cambia solo lo distinto y
  conserva lo escrito. */
export const loginSync = () => {
  const app = $('#app');
  /* siempre en oscuro, tenga el móvil el tema que tenga: va sobre una foto oscura. Al entrar, la app se abre de nuevo con el
     tema de la cuenta */
  applyTheme('dark');
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
  if (consentPending() && !account.mc && !firstPending)
    gateRefresh();
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
  /* lo que hay ahora en el dispositivo no es de la cuenta: hasta que baje lo suyo, en un conflicto gana la nube. Se apunta ya,
     no al empezar la primera sincronización: antes puede salir la pantalla de la aceptación, y cerrarse la app en ella */
  forgetSynced();
  /* recién creada: sin programa y con la bienvenida por ver (se suben con la primera sincronización) */
  if (fresh)
    markNewAccount();
  if (!fresh)
    try {
      const d = await getDoc('users/' + s.uid);
      /* lo que la cuenta ya tiene aceptado (en este o en otro dispositivo) */
      await syncConsent('users/' + s.uid, d ? d.data.cs : null, !!d);
      if (d && d.data.mc === true) {
        acctSave({ ...account, mc: 1 });
        loginState = { m: 'in', busy: '', err: '', eye: 0, c1: 0, c2: 0 };
        loginSync();
        return;
      }
    }
    catch (e) {
      logError('entrar: leer el perfil', e);
    }
  /* sin la aceptación y el consentimiento no se baja nada: antes, la pantalla que los pide */
  if (consentPending()) {
    firstPending = 1;
    loginState = { m: 'in', busy: '', err: '', eye: 0, c1: 0, c2: 0 };
    loginSync();
    return;
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
  loginState = { m: b.dataset.v == 'up' ? 'up' : 'in', busy: '', err: '', eye: loginState.eye, c1: loginState.c1, c2: loginState.c2 };
  loginSync();
};
/* una de las dos casillas (data-i: 1 las condiciones, 2 el consentimiento) */
C.loginConsent = (e, i) => {
  loginState[i == 2 ? 'c2' : 'c1'] = e.checked ? 1 : 0;
};
/* la pantalla de la aceptación: con las dos casillas marcadas se anota (cloud/consent) y se entra. Recién entrado, bajando
   los datos de la cuenta; si la app ya los tenía (una cuenta de antes de la V1.0.4), abriéndola de nuevo */
A.consentAccept = async () => {
  if (loginState.busy || !account)
    return;
  const pr = consentProblem();
  if (pr) {
    loginError(pr);
    return;
  }
  acctSave({ ...account, cs: consentGiven(), csu: 1 });
  if (firstPending) {
    firstPending = 0;
    await finishLogin();
    return;
  }
  loginBusy('Abriendo…');
  reloadApp();
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
  const pr = userProblem(u) || passProblem(p) || (up && p !== v('lgp2') ? 'Las dos contraseñas no coinciden.' : '') || (up ? consentProblem() : '');
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
  /* la cuenta nueva nace con lo que se acaba de aceptar; sube a su perfil con la primera sincronización */
  await enterAccount(up ? { ...s, cs: consentGiven(), csu: 1 } : s, up);
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
  loginState = { m: 'in', busy: '', err: '', eye: 0, c1: 0, c2: 0 };
  reloadApp();
};
/* sesión caducada (contraseña restablecida, otro dispositivo la cambió…): volver a entrar sin perder lo del móvil */
A.reloginShow = () => sheet(html`
  <h3>Vuelve a entrar</h3>
  <p class="muted m-0-0-10">
    Tu sesión ha caducado, por ejemplo porque se cambió la contraseña. Lo que has hecho sigue en este móvil y se sube al entrar.
  </p>
  <label for="lrp">Contraseña de ${account ? account.u : ''}</label>
  <input id="lrp" type="password" autocomplete="current-password" maxlength="100" data-enter="reloginSubmit">
  <p id="lre" class="form-error" role="alert"></p>
  <button class="primary w-full mt-6" data-a="reloginSubmit">Entrar</button>`);
/* volver a entrar: una petición a la vez y la misma espera tras cinco intentos fallidos que en el inicio de sesión */
let reloginBusy = false;
A.reloginSubmit = async () => {
  if (reloginBusy)
    return;
  const p = ($('#lrp') || {}).value || '';
  const out = t => {
    const e = $('#lre');
    if (e)
      e.textContent = tr(t);
  };
  if (passProblem(p)) {
    out(passProblem(p));
    return;
  }
  if (waitLeft()) {
    out(say `Demasiados intentos. Espera ${Math.ceil(waitLeft() / 1e3)} s antes de volver a probar.`);
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
