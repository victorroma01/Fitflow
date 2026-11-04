// Prueba de las reglas de seguridad de Firestore (firestore.rules) con el emulador de Firebase. En la CI (pruebas.yml):
//   npx firebase emulators:exec --only auth,firestore --project demo-stratafit "node --test tests/rules.test.mjs"
// Habla con el emulador por la misma API REST que la app (cloud/firestore); «Bearer owner» es el acceso de administrador del
// emulador, que no pasa por las reglas (como la cuenta de servicio en GitHub Actions).
import { before, test } from 'node:test';
import assert from 'node:assert/strict';

const P = 'demo-stratafit';
const AUTH = 'http://127.0.0.1:9099';
const FS = 'http://127.0.0.1:8080';
const ROOT = 'projects/' + P + '/databases/(default)/documents';
const DOCS = FS + '/v1/' + ROOT;

const call = async (url, { method = 'GET', body, token } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token)
    headers.Authorization = 'Bearer ' + token;
  const r = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  let j = {};
  try {
    j = t ? JSON.parse(t) : {};
  }
  catch (e) {
    j = { raw: t };
  }
  return { status: r.status, j };
};
const account = async (email, password = 'contraseña-1', up = true) => {
  const r = await call(AUTH + '/identitytoolkit.googleapis.com/v1/accounts:' + (up ? 'signUp' : 'signInWithPassword') + '?key=x', { method: 'POST', body: { email, password, returnSecureToken: true } });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  return { uid: r.j.localId, t: r.j.idToken };
};
const enc = v => typeof v == 'string' ? { stringValue: v } : typeof v == 'boolean' ? { booleanValue: v } : Number.isInteger(v) ? { integerValue: String(v) } : typeof v == 'number' ? { doubleValue: v } : v && typeof v == 'object' ? { mapValue: { fields: fields(v) } } : { nullValue: null };
const fields = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, enc(v)]));
const get = (path, token) => call(DOCS + '/' + path, { token });
const commit = (token, writes) => call(DOCS + ':commit', { method: 'POST', token, body: { writes } });
const set = (path, data, token, o = {}) => commit(token, [Object.assign({ update: { name: ROOT + '/' + path, fields: fields(data) } }, o.pre ? { currentDocument: o.pre } : {}, o.mask ? { updateMask: { fieldPaths: o.mask } } : {})]);
const del = (path, token) => commit(token, [{ delete: ROOT + '/' + path }]);
const ownerSet = (path, data) => call(DOCS + '/' + path, { method: 'PATCH', token: 'owner', body: { fields: fields(data) } });
const part = (j, extra = {}) => Object.assign({ j, m: Date.now(), r: 'v1', v: 1, d: 'movil1' }, extra);
const allowed = r => r.status == 200;
const denied = r => r.status == 403 || r.status == 401;

let ana, bea, adm, ext;
before(async () => {
  await call(FS + '/emulator/v1/projects/' + P + '/databases/(default)/documents', { method: 'DELETE' });
  await call(AUTH + '/emulator/v1/projects/' + P + '/accounts', { method: 'DELETE' });
  ana = await account('ana_1@stratafit.app');
  bea = await account('bea@stratafit.app');
  adm = await account('victoradmin_@stratafit.app');
  ext = await account('alguien@gmail.com');
  const r = await call(AUTH + '/identitytoolkit.googleapis.com/v1/projects/' + P + '/accounts:update', { method: 'POST', token: 'owner', body: { localId: adm.uid, customAttributes: JSON.stringify({ role: 'admin' }) } });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  adm.t = (await account('victoradmin_@stratafit.app', 'contraseña-1', false)).t;
});

test('perfil: se crea con el usuario de la propia cuenta y nada más', async () => {
  const now = Date.now();
  assert.ok(denied(await set('users/' + ana.uid, { u: 'Otra', ca: now, m: now }, ana.t, { pre: { exists: false } })), 'otro usuario');
  assert.ok(denied(await set('users/' + ana.uid, { u: 'Ana_1', email: 'x@y.z', ca: now, m: now }, ana.t, { pre: { exists: false } })), 'campo de más');
  assert.ok(denied(await set('users/' + bea.uid, { u: 'Ana_1', ca: now, m: now }, ana.t, { pre: { exists: false } })), 'el de otra cuenta');
  assert.ok(allowed(await set('users/' + ana.uid, { u: 'Ana_1', sx: 'F', pr: { theme: 'dark', acc: 2 }, ca: now, m: now }, ana.t, { pre: { exists: false } })));
  assert.ok(allowed(await set('users/' + bea.uid, { u: 'bea', sx: '', pr: {}, ca: now, m: now }, bea.t, { pre: { exists: false } })));
});

test('perfil: lo leen su dueño y el admin (también la lista); nadie más', async () => {
  assert.ok(allowed(await get('users/' + ana.uid, ana.t)));
  assert.ok(denied(await get('users/' + ana.uid, bea.t)));
  assert.ok(allowed(await get('users/' + ana.uid, adm.t)));
  assert.ok(allowed(await get('users', adm.t)), 'el admin lista las cuentas');
  assert.ok(denied(await get('users', ana.t)), 'un usuario no lista las cuentas');
});

test('perfil: sexo y preferencias, sí; cambiar el usuario o ponerse «debe cambiar la contraseña», no', async () => {
  assert.ok(allowed(await set('users/' + ana.uid, { sx: 'M', pr: { theme: 'light' }, m: Date.now() }, ana.t, { mask: ['sx', 'pr', 'm'] })));
  assert.ok(denied(await set('users/' + ana.uid, { u: 'Otra', m: Date.now() }, ana.t, { mask: ['u', 'm'] })), 'usuario');
  assert.ok(denied(await set('users/' + ana.uid, { sx: 'X', m: Date.now() }, ana.t, { mask: ['sx', 'm'] })), 'sexo desconocido');
  assert.ok(denied(await set('users/' + ana.uid, { pr: { email: 'a@b.c' }, m: Date.now() }, ana.t, { mask: ['pr', 'm'] })), 'preferencia desconocida');
  assert.ok(denied(await set('users/' + ana.uid, { ro: 'admin', m: Date.now() }, ana.t, { mask: ['ro', 'm'] })), 'rol');
  assert.ok(denied(await set('users/' + ana.uid, { mc: true, m: Date.now() }, ana.t, { mask: ['mc', 'm'] })), 'mc a true');
  assert.ok(allowed(await ownerSet('users/' + ana.uid, { u: 'Ana_1', sx: 'M', pr: { theme: 'light' }, ca: 1, m: 2, mc: true })), 'GitHub Actions pone mc');
  assert.ok(allowed(await set('users/' + ana.uid, { pr: { theme: 'dark' }, m: Date.now() }, ana.t, { mask: ['pr', 'm'] })), 'con mc puesto, el resto se cambia igual');
  assert.ok(allowed(await set('users/' + ana.uid, { mc: false, m: Date.now() }, ana.t, { mask: ['mc', 'm'] })), 'quitarlo tras cambiar la contraseña');
  assert.ok(denied(await del('users/' + ana.uid, ana.t)), 'el perfil no se borra desde la app');
});

test('partes del estado: cada cuenta las suyas, con la forma de la app', async () => {
  const core = 'users/' + ana.uid + '/data/core';
  assert.ok(allowed(await set(core, part('{"plan":[]}'), ana.t)));
  assert.ok(allowed(await get(core, ana.t)));
  assert.ok(denied(await get(core, bea.t)), 'otra cuenta no lo lee');
  assert.ok(denied(await get(core, adm.t)), 'el admin tampoco: nunca ve los datos');
  assert.ok(denied(await set(core, part('{}'), bea.t)), 'otra cuenta no lo escribe');
  assert.ok(denied(await set(core, part('{}', { x: 1 }), ana.t)), 'campo de más');
  assert.ok(denied(await set(core, Object.assign(part('{}'), { j: 5 }), ana.t)), 'j no es texto');
  assert.ok(denied(await set(core, part('x'.repeat(1000001)), ana.t)), 'más de 1 MB');
  assert.ok(denied(await set('users/' + ana.uid + '/data/otra', part('{}'), ana.t)), 'otro documento en data');
  assert.ok(allowed(await set('users/' + ana.uid + '/data/index', { p: { core: 'v1', 'logs:2026': 'v2' }, m: Date.now(), d: 'movil1' }, ana.t)));
  assert.ok(denied(await set('users/' + ana.uid + '/data/index', { p: {}, m: Date.now(), d: 'movil1', j: 'x' }, ana.t)), 'índice con campo de más');
});

test('entrenos, historial y comidas: solo documentos por año o por mes', async () => {
  const u = 'users/' + ana.uid + '/';
  assert.ok(allowed(await set(u + 'logs/2026', part('[]'), ana.t)));
  assert.ok(allowed(await set(u + 'hist/otros', part('{}'), ana.t)));
  assert.ok(allowed(await set(u + 'meals/2026-11', part('{}'), ana.t)));
  assert.ok(denied(await set(u + 'logs/abc', part('[]'), ana.t)));
  assert.ok(denied(await set(u + 'meals/2026', part('{}'), ana.t)));
  assert.ok(denied(await set(u + 'otra/2026', part('{}'), ana.t)), 'otra colección');
  assert.ok(denied(await get(u + 'logs/2026', bea.t)));
  assert.ok(denied(await del(u + 'logs/2026', bea.t)), 'otra cuenta no borra');
  assert.ok(allowed(await del(u + 'logs/2026', ana.t)), 'la propia, sí');
});

test('foto de perfil: solo private/avatar, de 150 KB como mucho, y solo la ve su dueño', async () => {
  const u = 'users/' + ana.uid + '/private/';
  assert.ok(allowed(await set(u + 'avatar', part(JSON.stringify({ img: 'data:image/jpeg;base64,AAAA', pc: 1 })), ana.t)));
  assert.ok(denied(await get(u + 'avatar', adm.t)), 'el admin no la ve');
  assert.ok(denied(await set(u + 'otra', part('{}'), ana.t)));
  assert.ok(denied(await set(u + 'avatar', part('x'.repeat(150001)), ana.t)));
});

test('adminInbox: solo el admin la lee y la borra; desde la app no se crea', async () => {
  assert.ok(allowed(await ownerSet('adminInbox/r1', { u: 'Ana_1', p: 'Temporal-1', t: 1, exp: Date.now() + 864e5 })), 'GitHub Actions la crea');
  assert.ok(allowed(await get('adminInbox', adm.t)));
  assert.ok(denied(await get('adminInbox/r1', ana.t)));
  assert.ok(denied(await get('adminInbox', ana.t)));
  assert.ok(denied(await set('adminInbox/r2', { u: 'x', p: 'y', exp: 1 }, adm.t)), 'ni el admin la crea desde la app');
  assert.ok(allowed(await del('adminInbox/r1', adm.t)));
});

test('cuentas sin correo técnico y peticiones sin sesión: nada', async () => {
  assert.ok(denied(await set('users/' + ext.uid, { u: 'alguien', ca: 1, m: 1 }, ext.t, { pre: { exists: false } })));
  assert.ok(denied(await get('users/' + ext.uid, ext.t)));
  assert.ok(denied(await set('users/' + ext.uid + '/data/core', part('{}'), ext.t)));
  assert.ok(denied(await get('users/' + ana.uid)));
  assert.ok(denied(await get('adminInbox')));
});

test('informes (llegan en M5): aún denegados', async () => {
  assert.ok(denied(await set('reports/x1', { t: 'fallo' }, ana.t)));
  assert.ok(denied(await get('reports/x1', adm.t)));
});
