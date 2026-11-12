/* ═══ cloud/appcheck ═══
   App Check (I-05): que solo la app publicada pueda usar Authentication y Firestore, para que un programa no cree cuentas sin
   fin ni gaste la cuota. reCAPTCHA Enterprise (invisible, sin preguntas) da un token, App Check lo cambia por el suyo (dura una
   hora, se renueva 5 minutos antes) y cloud/auth y cloud/firestore lo envían en cada petición (cabecera X-Firebase-AppCheck).
   Mientras APP_CHECK (cloud/config) esté vacío, no hace nada: ni carga reCAPTCHA ni envía cabecera, y la CSP no lo admite
   (build.py). Los pasos para activarlo, en docs/tecnica/backend.md. reCAPTCHA pone su sello en la página: lo tapa la regla
   .grecaptcha-badge (css/94-account) y, a cambio, el inicio de sesión y Privacidad lo dicen (appCheckOn).
   Define: EXCHANGE_URL, appCheckOn, token, expires, pending, scriptLoad, loadRecaptcha, freshToken, appCheckToken
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
/* el script de reCAPTCHA Enterprise, una sola vez (si falla, se reintenta en la próxima petición) */
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
  return token || null;
};
/** El token de App Check para una petición a Firebase, o null si App Check no está configurado o no se pudo conseguir (la
  petición va sin él: si Firebase ya lo exige, la rechaza y se reintenta con la sincronización de siempre). */
export const appCheckToken = async () => {
  if (!appCheckOn())
    return null;
  if (token && Date.now() < expires - 3e5)
    return token;
  if (!pending)
    pending = freshToken().catch(e => {
      logError('App Check', e);
      return null;
    }).finally(() => {
      pending = null;
    });
  return pending;
};
