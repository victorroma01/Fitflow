/* ═══ cloud/config ═══
   Proyecto de Firebase y direcciones de sus servicios. La configuración web de Firebase no es secreta: va en el código de
   cualquier app web (la protegen las reglas de Firestore y la restricción de la clave a la web de la app). La app habla con
   Firebase por su API REST, sin SDK: Authentication (identitytoolkit y securetoken) y Firestore.
   `python3 build.py --emulador` cambia estas direcciones por las del emulador de Firebase en este ordenador (pruebas con
   el emulador: tests/cloud.py) y el proyecto por uno «demo-», que no existe en la nube.
   Define: FIREBASE, AUTH_URL, TOKEN_URL, FIRESTORE_URL, APP_CHECK, TECH_DOMAIN, OLD_TECH_DOMAIN
*/
export const FIREBASE = { apiKey: 'AIzaSyC_KSQkQPwNjw7dDMRZ9ALzpZ3ikTUw4P4', projectId: 'stratafit-960ec' };
export const AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/';
export const TOKEN_URL = 'https://securetoken.googleapis.com/v1/token';
export const FIRESTORE_URL = 'https://firestore.googleapis.com/v1/';
/** App Check (I-05, cloud/appcheck): la clave de sitio de reCAPTCHA Enterprise y el id de la app web de Firebase, que da la
  consola al registrarla (no son secretos). Vacíos, App Check no se usa; los pasos para activarlo, en docs/tecnica/backend.md. */
export const APP_CHECK = { siteKey: '6LdyESMuAAAAAPZHnsGj9BY4yc_sJHy27mDbMk50', appId: '1:433927515134:web:6c856611dfc43eabf16eaf' };
/** Dominio del correo técnico de cada cuenta (usuario@stratafit-960ec.firebaseapp.com): el del propio proyecto de Firebase,
  que es de la app y donde no hay buzones. El usuario nunca lo ve y nunca se le envía nada. */
export const TECH_DOMAIN = 'stratafit-960ec.firebaseapp.com';
/** El dominio de las cuentas hasta la V1.0.31. Mientras se pasan al de ahora (tools/admin/dominio.mjs), una cuenta que aún
  no se ha pasado entra con él (cloud/auth: signIn). */
export const OLD_TECH_DOMAIN = 'stratafit.app';
