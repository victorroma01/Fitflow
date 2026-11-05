/* ═══ cloud/auth ═══
   Cuentas con Firebase Authentication (API REST): registro, entrada, renovación del token de sesión y cambio de contraseña.
   Firebase trabaja con correo y contraseña; aquí el correo es técnico, `usuario@stratafit.app` (T-09): el usuario solo ve
   su nombre de usuario. El token de sesión dura una hora y se renueva solo con el de renovación.
   Define: userProblem, passProblem, techEmail, authCall, sessionFrom, signUp, signIn, refreshing, DEAD_SESSION, idToken, changePassword, AUTH_MESSAGES, authMessage
*/
import { AUTH_URL, FIREBASE, TECH_DOMAIN, TOKEN_URL } from './config.js';
import { fetchJson, netError } from './net.js';
import { account, acctSave } from './session.js';
/** Qué le falta a un nombre de usuario ('' si vale): de 3 a 20 caracteres, letras sin tilde, números, punto, guion y guion
  bajo, sin punto al principio, al final ni dos seguidos (no valdría como correo técnico). */
export const userProblem = u => !u ? 'Escribe tu usuario.' : u.length < 3 || u.length > 20 ? 'El usuario tiene de 3 a 20 caracteres.' : !/^[A-Za-z0-9._-]+$/.test(u) ? 'El usuario solo lleva letras sin tilde, números, punto, guion y guion bajo.' : /^\.|\.$|\.\./.test(u) ? 'El usuario no puede empezar ni acabar en punto, ni llevar dos seguidos.' : '';
export const passProblem = p => !p ? 'Escribe la contraseña.' : p.length < 8 ? 'La contraseña tiene que tener 8 caracteres o más.' : p.length > 100 ? 'La contraseña tiene como mucho 100 caracteres.' : '';
/** Correo técnico de un usuario: sin distinguir mayúsculas, como el propio usuario. */
const techEmail = u => String(u).toLowerCase() + '@' + TECH_DOMAIN;
const authCall = (op, body) => fetchJson(AUTH_URL + 'accounts:' + op + '?key=' + FIREBASE.apiKey, { method: 'POST', body });
/** Respuesta de Authentication → sesión de cloud/session. */
const sessionFrom = (r, u) => ({ uid: r.localId, u, it: r.idToken, rt: r.refreshToken, exp: Date.now() + (+r.expiresIn || 3600) * 1e3 });
/** Crea la cuenta. Devuelve la sesión (sin guardarla); lanza un error de cloud/net (EMAIL_EXISTS si el usuario ya existe). */
export const signUp = async (u, p) => sessionFrom(await authCall('signUp', { email: techEmail(u), password: p, returnSecureToken: true }), u);
/** Entra con usuario y contraseña. Devuelve la sesión (sin guardarla); lanza un error de cloud/net (INVALID_LOGIN_CREDENTIALS…). */
export const signIn = async (u, p) => sessionFrom(await authCall('signInWithPassword', { email: techEmail(u), password: p, returnSecureToken: true }), u);
/* una sola renovación a la vez, aunque la pidan varias peticiones */
let refreshing = null;
/** Códigos con los que la sesión ya no vale (contraseña restablecida, cuenta borrada o desactivada): hay que volver a entrar. */
const DEAD_SESSION = ['TOKEN_EXPIRED', 'INVALID_REFRESH_TOKEN', 'USER_DISABLED', 'USER_NOT_FOUND', 'INVALID_ID_TOKEN', 'CREDENTIAL_TOO_OLD_LOGIN_AGAIN'];
/** Token de sesión vigente: lo renueva si le quedan menos de 5 minutos (o con `force`). Si la sesión ya no vale, la marca
  (x: 1) y lanza un error de cloud/net('SESSION'). */
export const idToken = async (force) => {
  const a = account;
  if (!a)
    throw netError('NO_SESSION');
  if (a.x)
    throw netError('SESSION');
  if (!force && a.exp - Date.now() > 3e5)
    return a.it;
  if (!refreshing)
    refreshing = (async () => {
      try {
        const r = await fetchJson(TOKEN_URL + '?key=' + FIREBASE.apiKey, { method: 'POST', form: { grant_type: 'refresh_token', refresh_token: a.rt } });
        if (account && account.uid == a.uid)
          acctSave({ ...account, it: r.id_token, rt: r.refresh_token, exp: Date.now() + (+r.expires_in || 3600) * 1e3 });
        return r.id_token;
      }
      catch (e) {
        if (DEAD_SESSION.includes(e.code) && account && account.uid == a.uid) {
          acctSave({ ...account, x: 1 });
          throw netError('SESSION');
        }
        throw e;
      }
      finally {
        refreshing = null;
      }
    })();
  return refreshing;
};
/** Cambia la contraseña de la cuenta con la que se ha entrado. Firebase cierra las demás sesiones y devuelve tokens nuevos. */
export const changePassword = async (p) => {
  const r = await authCall('update', { idToken: await idToken(), password: p, returnSecureToken: true });
  acctSave({ ...account, it: r.idToken, rt: r.refreshToken, exp: Date.now() + (+r.expiresIn || 3600) * 1e3, x: 0 });
};
/** Textos para cada código de error de Authentication o de red. */
const AUTH_MESSAGES = {
  NETWORK: 'Sin conexión. Para entrar o crear la cuenta hace falta internet.',
  EMAIL_EXISTS: 'Ese usuario ya existe. Elige otro.',
  INVALID_LOGIN_CREDENTIALS: 'Usuario o contraseña incorrectos.',
  INVALID_PASSWORD: 'Usuario o contraseña incorrectos.',
  EMAIL_NOT_FOUND: 'Usuario o contraseña incorrectos.',
  USER_DISABLED: 'Esta cuenta está desactivada.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
  WEAK_PASSWORD: 'La contraseña tiene que tener 8 caracteres o más.',
  INVALID_EMAIL: 'El usuario solo lleva letras sin tilde, números, punto, guion y guion bajo.',
  OPERATION_NOT_ALLOWED: 'El acceso con usuario y contraseña no está activado en el servidor.',
  SESSION: 'Tu sesión ha caducado: vuelve a entrar.'
};
export const authMessage = e => AUTH_MESSAGES[e && e.code] || 'No se ha podido conectar con el servidor (' + (e && e.code || 'error') + '). Inténtalo de nuevo.';
