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
import { restCall, webSession } from './web.mjs';

export const PROJECT = 'stratafit-960ec';
/** La clave web del proyecto (la de cloud/config; no es secreta) y la dirección de la app publicada, que es desde donde vale:
    para hacer desde aquí lo que hace un móvil (entrar y renovar la sesión), en el ensayo de tools/admin/dominio.mjs. */
export const API_KEY = 'AIzaSyC_KSQkQPwNjw7dDMRZ9ALzpZ3ikTUw4P4';
export const APP_URL = 'https://victorroma01.github.io/Fitflow/';
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

/** Lo que el paso de las cuentas (tools/admin/cuentas.mjs) necesita además de firebase-admin:
    · update(uid, campos): cambiar una cuenta con la API de administración de Authentication (el correo y desde cuándo valen
      sus sesiones, validSince, que firebase-admin no deja poner a un valor elegido);
    · signIn(correo, contraseña) y refresh(token): entrar y renovar la sesión por la API pública, como hace la app en un móvil,
      para el ensayo con la cuenta de prueba;
    · pause(): esperar a que pase el segundo (las sesiones se dan por caducadas con precisión de segundos).
    Los errores llevan en `code` el código de Firebase (TOKEN_EXPIRED, INVALID_EMAIL…) y en `reason` el motivo que dé Google
    (tools/admin/web.mjs), sin el mensaje. Con el emulador, sus direcciones y su acceso de administrador («owner»). */
export async function authIo(app) {
  const host = EMULATOR ? 'http://' + process.env.FIREBASE_AUTH_EMULATOR_HOST + '/' : 'https://';
  const project = EMULATOR ? 'demo-stratafit' : PROJECT;
  const key = EMULATOR ? 'emulador' : API_KEY;
  const admin = EMULATOR ? 'owner' : (await app.options.credential.getAccessToken()).access_token;
  const call = restCall();
  const json = { 'Content-Type': 'application/json' };
  /* entrar y renovar, como un navegador desde la app publicada (tools/admin/web.mjs) */
  const web = webSession({ host, key, appUrl: APP_URL, call });
  return {
    update: (uid, fields) => call(host + 'identitytoolkit.googleapis.com/v1/projects/' + project + '/accounts:update', { ...json, Authorization: 'Bearer ' + admin }, JSON.stringify({ localId: uid, ...fields })),
    signIn: web.signIn,
    refresh: web.refresh,
    pause: () => new Promise(r => setTimeout(r, 2100))
  };
}

