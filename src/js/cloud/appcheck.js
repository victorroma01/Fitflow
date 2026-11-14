/* ═══ cloud/appcheck ═══
   App Check (I-05): que solo la app publicada pueda usar Authentication y Firestore, para que un programa no cree cuentas sin
   fin ni gaste la cuota. reCAPTCHA Enterprise (invisible, sin preguntas) da un token, App Check lo cambia por el suyo (dura una
   hora, se renueva 5 minutos antes) y cloud/auth y cloud/firestore lo envían en cada petición (cabecera X-Firebase-AppCheck).
   Mientras APP_CHECK (cloud/config) esté vacío, no hace nada: ni carga reCAPTCHA ni envía cabecera, y la CSP no lo admite
   (build.py). Los pasos para activarlo, en docs/tecnica/backend.md. reCAPTCHA pone su sello en la página: lo tapa la regla
   .grecaptcha-badge (css/94-account) y, a cambio, el inicio de sesión y Privacidad lo dicen (appCheckOn).
   Define: EXCHANGE_URL, appCheckOn, token, expires, pending, TOKEN_WAIT, SCRIPT_WAIT, noWaitUntil, lastFailure, scriptLoad, loadRecaptcha, freshToken, tokenFailed, appCheckToken
*/
import { APP_CHECK, FIREBASE } from './config.js';
import { fetchJson } from './net.js';
import { logError } from '../core/errors.js';
const EXCHANGE_URL = 'https://content-firebaseappcheck.googleapis.com/v1/projects/';
/** ¿Está configurado App Check? */
export const appCheckOn = () => !!(APP_CHECK.siteKey && APP_CHECK.appId);
/* el token de App Check vigente, cuándo caduca (ms) y el que se está pidiendo (uno a la vez) */
let token = '';
let expires = 0;
let pending = null;
/* lo más que una petición a Firebase espera por su token y lo más que se espera a que cargue reCAPTCHA (ms). reCAPTCHA es de
   otro servidor: si tarda o no responde (sin cobertura, un bloqueador), entrar y sincronizar no pueden quedarse esperándolo */
const TOKEN_WAIT = 8e3;
const SCRIPT_WAIT = 15e3;
/* tras una espera agotada, hasta cuándo las peticiones salen sin esperar otra vez (ms) */
let noWaitUntil = 0;
/* el último fallo anotado: el mismo no se anota en cada petición */
let lastFailure = '';
/* el script de reCAPTCHA Enterprise, una sola vez (si falla o no llega a tiempo, se reintenta en la próxima petición) */
let scriptLoad = null;
const loadRecaptcha = () => scriptLoad || (scriptLoad = new Promise((res, rej) => {
  const s = document.createElement('script');
  s.src = 'https://www.google.com/recaptcha/enterprise.js?render=' + encodeURIComponent(APP_CHECK.siteKey);
  s.async = true;
  s.onload = () => {
    const g = window.grecaptcha;
    if (g && g.enterprise)
      g.enterprise.ready(res);
    else
      rej(new Error('reCAPTCHA no está'));
  };
  s.onerror = () => rej(new Error('reCAPTCHA no cargó'));
  setTimeout(() => rej(new Error('reCAPTCHA no respondió')), SCRIPT_WAIT);
  document.head.appendChild(s);
}).catch(e => {
  scriptLoad = null;
  throw e;
}));
/* un token nuevo: el de reCAPTCHA, cambiado por el de App Check */
const freshToken = async () => {
  await loadRecaptcha();
  const r = await window.grecaptcha.enterprise.execute(APP_CHECK.siteKey, { action: 'fire_app_check' });
  const j = await fetchJson(EXCHANGE_URL + FIREBASE.projectId + '/apps/' + APP_CHECK.appId + ':exchangeRecaptchaEnterpriseToken?key=' + FIREBASE.apiKey, { method: 'POST', body: { recaptcha_enterprise_token: r } });
  token = String(j.token || '');
  expires = Date.now() + (parseFloat(j.ttl) || 3600) * 1e3;
  lastFailure = '';
  return token || null;
};
/* un fallo al conseguir el token se anota en Diagnóstico (una clave mal puesta se ve ahí), salvo que sea por no haber
   conexión, que no es un fallo, y sin repetir el mismo en cada petición */
const tokenFailed = e => {
  const m = String(e && e.message || e);
  if (navigator.onLine === false || e && e.code == 'NETWORK' || m == lastFailure)
    return;
  lastFailure = m;
  logError('App Check', e);
};
/** El token de App Check para una petición a Firebase, o null si App Check no está configurado o no se pudo conseguir a
  tiempo (la petición va sin él: si Firebase ya lo exige, la rechaza y se reintenta con la sincronización de siempre). */
export const appCheckToken = async () => {
  if (!appCheckOn())
    return null;
  if (token && Date.now() < expires - 3e5)
    return token;
  if (!pending)
    pending = freshToken().catch(e => {
      tokenFailed(e);
      return null;
    }).finally(() => {
      pending = null;
    });
  if (Date.now() < noWaitUntil)
    return null;
  let late;
  const waited = await Promise.race([pending, new Promise(res => {
      late = setTimeout(res, TOKEN_WAIT, undefined);
    })]);
  clearTimeout(late);
  if (waited === undefined)
    noWaitUntil = Date.now() + 6e4;
  return waited || null;
};
