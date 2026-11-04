/* StrataFit · conexión de administrador con Firebase (firebase-admin), para los flujos de GitHub Actions.
   La clave es la cuenta de servicio del proyecto, que solo existe como secreto de GitHub (FIREBASE_SERVICE_ACCOUNT): llega
   en la variable de entorno del mismo nombre, nunca se escribe en el repositorio ni en el registro.
   Con el emulador de Firebase (FIREBASE_AUTH_EMULATOR_HOST y FIRESTORE_EMULATOR_HOST, en las pruebas de la CI) no hace
   falta clave y el proyecto es «demo-stratafit», que no existe en la nube.
   Necesita «npm install --no-save firebase-admin@13» (lo hace cada flujo). */
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const PROJECT = 'stratafit-960ec';
export const TECH_DOMAIN = 'stratafit.app';
export const EMULATOR = !!(process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST);

/** Termina con un mensaje claro (en GitHub Actions, como anotación de error). */
export function fail(msg) {
  console.log((process.env.GITHUB_ACTIONS ? '::error::' : 'ERROR: ') + msg);
  process.exit(1);
}

/** Conexión con el proyecto: { app, auth, db }. */
export function connect() {
  if (EMULATOR) {
    const app = initializeApp({ projectId: 'demo-stratafit' });
    return { app, auth: getAuth(app), db: getFirestore(app) };
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw)
    fail('Falta el secreto FIREBASE_SERVICE_ACCOUNT (GitHub → Settings → Secrets and variables → Actions).');
  let sa;
  try {
    sa = JSON.parse(raw);
  }
  catch (e) {
    fail('El secreto FIREBASE_SERVICE_ACCOUNT no es el archivo JSON de la cuenta de servicio: vuelve a pegarlo entero.');
  }
  if (sa.project_id !== PROJECT)
    fail('La cuenta de servicio es de otro proyecto («' + sa.project_id + '»), no de ' + PROJECT + '.');
  const app = initializeApp({ credential: cert(sa), projectId: PROJECT });
  return { app, auth: getAuth(app), db: getFirestore(app) };
}

/** Comprueba un nombre de usuario con las mismas reglas que la app (cloud/auth) y devuelve su correo técnico. */
export function techEmail(user) {
  const u = String(user || '').trim();
  if (u.length < 3 || u.length > 20 || !/^[A-Za-z0-9._-]+$/.test(u) || /^\.|\.$|\.\./.test(u))
    fail('«' + u + '» no es un usuario válido: de 3 a 20 caracteres, letras sin tilde, números, punto, guion y guion bajo.');
  return u.toLowerCase() + '@' + TECH_DOMAIN;
}

/** Cuenta de un usuario, o termina si no existe. */
export async function findUser(auth, user) {
  const email = techEmail(user);
  try {
    return await auth.getUserByEmail(email);
  }
  catch (e) {
    if (e && e.code === 'auth/user-not-found')
      fail('No existe ninguna cuenta con el usuario «' + String(user).trim() + '».');
    throw e;
  }
}
