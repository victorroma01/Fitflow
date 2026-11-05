/* ═══ cloud/config ═══
   Proyecto de Firebase y direcciones de sus servicios. La configuración web de Firebase no es secreta: va en el código de
   cualquier app web (la protegen las reglas de Firestore y la restricción de la clave a la web de la app). La app habla con
   Firebase por su API REST, sin SDK: Authentication (identitytoolkit y securetoken) y Firestore.
   `python3 build.py --emulador` cambia estas direcciones por las del emulador de Firebase en este ordenador (pruebas con
   el emulador: tests/cloud.py) y el proyecto por uno «demo-», que no existe en la nube.
   Define: FIREBASE, AUTH_URL, TOKEN_URL, FIRESTORE_URL, TECH_DOMAIN
*/
export const FIREBASE = { apiKey: 'AIzaSyC_KSQkQPwNjw7dDMRZ9ALzpZ3ikTUw4P4', projectId: 'stratafit-960ec' };
export const AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/';
export const TOKEN_URL = 'https://securetoken.googleapis.com/v1/token';
export const FIRESTORE_URL = 'https://firestore.googleapis.com/v1/';
/** Dominio del correo técnico de cada cuenta (usuario@stratafit.app): el usuario nunca lo ve y nunca se le envía nada. */
export const TECH_DOMAIN = 'stratafit.app';
