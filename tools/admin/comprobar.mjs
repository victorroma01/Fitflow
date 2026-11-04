/* StrataFit · «Comprobar Firebase» (GitHub Actions): que el secreto, Authentication y Firestore están bien configurados,
   sin cambiar nada. Escribe una tabla en el resumen del flujo y termina con error si falla algo imprescindible.
     node tools/admin/comprobar.mjs
   Comprueba: el secreto FIREBASE_SERVICE_ACCOUNT (y que es de stratafit-960ec), Authentication (cuántas cuentas hay y si
   el acceso con correo y contraseña está activo), que existe la base de datos de Firestore y en qué ubicación, y que la
   cuenta de servicio puede desplegar las reglas. */
import { appendFileSync } from 'node:fs';
import { connect, PROJECT } from './firebase.mjs';

const rows = [];
let bad = 0;
const row = (what, ok, detail, must = true) => {
  rows.push('| ' + what + ' | ' + (ok ? 'Correcto' : must ? '**Falla**' : 'Aviso') + ' | ' + String(detail).replace(/\|/g, '/') + ' |');
  if (!ok && must)
    bad++;
};
const why = e => (e && (e.code || e.status) ? (e.code || e.status) + ': ' : '') + String(e && e.message || e).split('\n')[0].slice(0, 160);

const { app, auth, db } = connect();
row('Secreto FIREBASE_SERVICE_ACCOUNT', true, 'cuenta de servicio de ' + PROJECT);

try {
  let n = 0;
  let page;
  do {
    page = await auth.listUsers(1000, page && page.pageToken);
    n += page.users.length;
  } while (page.pageToken);
  row('Authentication', true, n + (n == 1 ? ' cuenta' : ' cuentas'));
}
catch (e) {
  row('Authentication', false, why(e));
}

/* API de administración de Google con el token de la cuenta de servicio */
const token = (await app.options.credential.getAccessToken()).access_token;
const google = async url => {
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok)
    throw Object.assign(new Error(j.error && j.error.message || 'HTTP ' + r.status), { status: r.status });
  return j;
};

try {
  const c = await google('https://identitytoolkit.googleapis.com/admin/v2/projects/' + PROJECT + '/config');
  const em = c.signIn && c.signIn.email || {};
  const on = !!em.enabled && em.passwordRequired !== false;
  row('Acceso con correo y contraseña', on, on ? 'activado' : 'desactivado: Authentication → Método de acceso → Correo electrónico/contraseña');
}
catch (e) {
  row('Acceso con correo y contraseña', false, 'no se pudo leer (' + why(e) + ')', false);
}

try {
  const d = await google('https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)');
  row('Firestore', true, 'base de datos (default) en ' + d.locationId + (d.locationId == 'europe-southwest1' ? ' (Madrid)' : ''));
}
catch (e) {
  try {
    await db.doc('_comprobacion/ping').get();
    row('Firestore', true, 'base de datos (default); ubicación sin comprobar (' + why(e) + ')');
  }
  catch (x) {
    row('Firestore', false, why(x));
  }
}

try {
  const r = await google('https://firebaserules.googleapis.com/v1/projects/' + PROJECT + '/releases');
  const fs = (r.releases || []).find(x => /cloud\.firestore/.test(x.name));
  row('Reglas de Firestore', true, fs ? 'desplegadas el ' + String(fs.updateTime || fs.createTime).slice(0, 10) : 'aún sin desplegar (se despliegan al fusionar en main)');
}
catch (e) {
  row('Reglas de Firestore', false, 'la cuenta de servicio no puede leerlas (' + why(e) + ')', false);
}

const out = ['## Comprobación de Firebase (' + PROJECT + ')', '', '| Qué | Resultado | Detalle |', '| --- | --- | --- |', ...rows, ''].join('\n');
console.log(out);
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, out + '\n');
process.exit(bad ? 1 : 0);
