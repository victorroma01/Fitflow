/* StrataFit · conexión de administrador con Firebase (firebase-admin), para los flujos de GitHub Actions.
   La clave es la cuenta de servicio del proyecto, que solo existe como secreto de GitHub (FIREBASE_SERVICE_ACCOUNT): llega
   en la variable de entorno del mismo nombre, nunca se escribe en el repositorio ni en el registro.
   Con el emulador de Firebase (FIREBASE_AUTH_EMULATOR_HOST y FIRESTORE_EMULATOR_HOST, en las pruebas de la CI) no hace
   falta clave y el proyecto es «demo-stratafit», que no existe en la nube.
   Necesita «npm install --no-save firebase-admin@13» (lo hace cada flujo). */
import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { OLD_TECH_DOMAIN, TECH_DOMAIN } from './cuentas.mjs';

export const PROJECT = 'stratafit-960ec';
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

/** Comprueba un nombre de usuario con las mismas reglas que la app (cloud/auth) y devuelve su correo técnico, con el dominio de
    ahora o con `domain`. */
export function techEmail(user, domain = TECH_DOMAIN) {
  const u = String(user || '').trim();
  if (u.length < 3 || u.length > 20 || !/^[A-Za-z0-9._-]+$/.test(u) || /^\.|\.$|\.\./.test(u))
    fail('«' + u + '» no es un usuario válido: de 3 a 20 caracteres, letras sin tilde, números, punto, guion y guion bajo.');
  return u.toLowerCase() + '@' + domain;
}

/** Cuenta de un usuario, o termina si no existe. La busca con el dominio de ahora y, si no está, con el anterior (una cuenta
    que aún no se ha pasado: tools/admin/dominio.mjs). */
export async function findUser(auth, user) {
  for (const domain of [TECH_DOMAIN, OLD_TECH_DOMAIN])
    try {
      return await auth.getUserByEmail(techEmail(user, domain));
    }
    catch (e) {
      if (!e || e.code !== 'auth/user-not-found')
        throw e;
    }
  return fail('No existe ninguna cuenta con el usuario «' + String(user).trim() + '».');
}

/** Las reglas de Firestore publicadas: { source, when } (null si el proyecto aún no tiene ninguna). Se leen con el token de la
    cuenta de servicio. Con el emulador son las de este repositorio, que es de donde las carga (firebase.json). */
export async function liveRules(app) {
  if (EMULATOR)
    return { source: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'), when: '' };
  const token = (await app.options.credential.getAccessToken()).access_token;
  const google = async url => {
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok)
      throw Object.assign(new Error(j.error && j.error.message || 'HTTP ' + r.status), { status: r.status });
    return j;
  };
  const rel = ((await google('https://firebaserules.googleapis.com/v1/projects/' + PROJECT + '/releases')).releases || []).find(x => /cloud\.firestore/.test(x.name));
  if (!rel)
    return null;
  const rs = await google('https://firebaserules.googleapis.com/v1/' + rel.rulesetName);
  return { source: ((rs.source && rs.source.files) || []).map(f => f.content).join('\n'), when: String(rel.updateTime || rel.createTime).slice(0, 10) };
}
