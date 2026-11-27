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
// el dominio del correo técnico de las cuentas (cloud/config: TECH_DOMAIN) y el de antes de la V1.0.32, que las reglas siguen
// admitiendo mientras las cuentas se pasan al de ahora (tools/admin/dominio.mjs)
const NEW = '@stratafit-960ec.firebaseapp.com';
const OLD = '@stratafit.app';

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

let ana, bea, adm, ext, old;
before(async () => {
  await call(FS + '/emulator/v1/projects/' + P + '/databases/(default)/documents', { method: 'DELETE' });
  await call(AUTH + '/emulator/v1/projects/' + P + '/accounts', { method: 'DELETE' });
  ana = await account('ana_1' + NEW);
  bea = await account('bea' + NEW);
  adm = await account('victoradmin_' + NEW);
  ext = await account('alguien@gmail.com');
  old = await account('vieja_1' + OLD);
  const r = await call(AUTH + '/identitytoolkit.googleapis.com/v1/projects/' + P + '/accounts:update', { method: 'POST', token: 'owner', body: { localId: adm.uid, customAttributes: JSON.stringify({ role: 'admin' }) } });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  adm.t = (await account('victoradmin_' + NEW, 'contraseña-1', false)).t;
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
  // M6: color propio, reducir animaciones, pestaña al abrir y recorrido visto (cloud/sync, PREF_KEYS)
  const pr = p => set('users/' + ana.uid, { pr: p, m: Date.now() }, ana.t, { mask: ['pr', 'm'] });
  assert.ok(allowed(await pr({ theme: 'dark', acc: -1, acx: '#ff2d55', rm: 1, st0: 2, tour: 1 })), 'las preferencias nuevas');
  assert.ok(denied(await pr({ acx: 'rojo' })), 'color propio que no es #rrggbb');
  assert.ok(denied(await pr({ acx: '#ff2d55' + 'x'.repeat(500) })), 'color propio con texto de más');
  assert.ok(denied(await pr({ st0: 7 })), 'pestaña que no existe');
  assert.ok(denied(await pr({ tour: 'sí' })), 'recorrido visto con otro valor');
  assert.ok(denied(await pr({ rm: 5 })), 'reducir animaciones con otro valor');
  // V1.0.1 (T-28): el sistema del último móvil, solo uno de los tres valores
  assert.ok(allowed(await set('users/' + ana.uid, { os: 'ios' }, ana.t, { mask: ['os'] })), 'sistema del móvil');
  assert.ok(allowed(await set('users/' + ana.uid, { os: 'android' }, ana.t, { mask: ['os'] })), 'otro sistema');
  assert.ok(denied(await set('users/' + ana.uid, { os: 'windows' }, ana.t, { mask: ['os'] })), 'sistema desconocido');
  assert.ok(denied(await set('users/' + ana.uid, { os: 'ios' }, bea.t, { mask: ['os'] })), 'el sistema de otra cuenta');
  assert.ok(denied(await set('users/' + ana.uid, { ro: 'admin', m: Date.now() }, ana.t, { mask: ['ro', 'm'] })), 'rol');
  assert.ok(denied(await set('users/' + ana.uid, { mc: true, m: Date.now() }, ana.t, { mask: ['mc', 'm'] })), 'mc a true');
  assert.ok(allowed(await ownerSet('users/' + ana.uid, { u: 'Ana_1', sx: 'M', pr: { theme: 'light' }, ca: 1, m: 2, mc: true })), 'GitHub Actions pone mc');
  assert.ok(allowed(await set('users/' + ana.uid, { pr: { theme: 'dark' }, m: Date.now() }, ana.t, { mask: ['pr', 'm'] })), 'con mc puesto, el resto se cambia igual');
  assert.ok(allowed(await set('users/' + ana.uid, { mc: false, m: Date.now() }, ana.t, { mask: ['mc', 'm'] })), 'quitarlo tras cambiar la contraseña');
  assert.ok(denied(await del('users/' + ana.uid, bea.t)), 'el perfil de otra cuenta no se borra');
});

test('perfil: la constancia de lo aceptado (condiciones y consentimiento), con su forma; con el perfil, la lee el admin', async () => {
  // V1.0.4 (cloud/consent): t, las condiciones de uso; h, el consentimiento para los datos de salud. De cada una, la versión
  // del texto, cuándo y, en el consentimiento, su estado (1 dado, 0 retirado) y, retirado, cuándo se había dado
  const cs = c => set('users/' + ana.uid, { cs: c }, ana.t, { mask: ['cs'] });
  const now = Date.now();
  assert.ok(allowed(await cs({ t: { v: '1.0', at: now }, h: { v: '1.0', at: now, st: 1 } })), 'aceptar y consentir');
  assert.ok(allowed(await cs({ t: { v: '1.0', at: now }, h: { v: '1.0', at: now + 5, st: 0, ga: now } })), 'retirar el consentimiento');
  assert.ok(allowed(await cs({ t: { v: '1.0', at: now } })), 'solo las condiciones');
  assert.ok(denied(await cs({ t: { v: '1.0', at: now }, x: { v: '1.0', at: now } })), 'otra cosa aceptada');
  assert.ok(denied(await cs({ t: { v: '1.0', at: now, ip: '1.2.3.4' } })), 'un dato de más en una marca');
  assert.ok(denied(await cs({ t: { v: 10, at: now } })), 'versión que no es texto');
  assert.ok(denied(await cs({ t: { v: '', at: now } })), 'versión vacía');
  assert.ok(denied(await cs({ t: { v: 'x'.repeat(13), at: now } })), 'versión larguísima');
  assert.ok(denied(await cs({ t: { v: '1.0', at: 'hoy' } })), 'momento que no es un número');
  assert.ok(denied(await cs({ t: { v: '1.0' } })), 'sin momento');
  assert.ok(denied(await cs({ h: { v: '1.0', at: now, st: 2 } })), 'estado desconocido');
  assert.ok(denied(await cs({ h: { v: '1.0', at: now, st: 0, ga: 'ayer' } })), 'cuándo se dio, que no es un número');
  assert.ok(denied(await cs('aceptado')), 'que no es un mapa');
  assert.ok(denied(await set('users/' + ana.uid, { cs: { t: { v: '1.0', at: now } } }, bea.t, { mask: ['cs'] })), 'la de otra cuenta');
  assert.ok(denied(await set('users/' + ana.uid, { cs: { t: { v: '1.0', at: now } } }, adm.t, { mask: ['cs'] })), 'ni el admin la de otra cuenta');
  assert.ok(allowed(await cs({ t: { v: '1.0', at: now }, h: { v: '1.0', at: now, st: 1 } })));
  const seen = await get('users/' + ana.uid, adm.t);
  assert.ok(allowed(seen), 'el admin lee el perfil');
  assert.equal(seen.j.fields.cs.mapValue.fields.h.mapValue.fields.st.integerValue, '1', 'con lo aceptado');
  assert.ok(allowed(await set('users/' + ana.uid, { sx: 'F', m: Date.now() }, ana.t, { mask: ['sx', 'm'] })), 'con ella puesta, el resto del perfil se cambia igual');
  // al crear el perfil no va: la app lo crea primero y la anota después, en una escritura aparte (cloud/consent: syncConsent)
  assert.ok(denied(await set('users/' + old.uid, { u: 'Vieja_1', ca: now, m: now, cs: { t: { v: '1.0', at: now } } }, old.t, { pre: { exists: false } })), 'al crear el perfil');
  assert.equal((await get('users/' + old.uid, old.t)).status, 404, 'y el perfil no se ha creado');
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

test('copia de seguridad en la nube: meta y trozos c0…c23, solo de su dueño y con su forma', async () => {
  const u = 'users/' + ana.uid + '/backup/';
  const meta = { at: Date.now(), v: '1.0.0', n: 2, z: true, sz: 10, h: 'abc123', lg: 4, md: 9 };
  assert.ok(allowed(await commit(ana.t, [
    { update: { name: ROOT + '/' + u + 'c0', fields: fields({ j: 'H4sI', i: 0 }) } },
    { update: { name: ROOT + '/' + u + 'c1', fields: fields({ j: 'AAAA', i: 1 }) } },
    { update: { name: ROOT + '/' + u + 'meta', fields: fields(meta) } }
  ])), 'la copia entera en una escritura');
  assert.ok(allowed(await get(u + 'meta', ana.t)));
  assert.ok(allowed(await get(u + 'c1', ana.t)));
  assert.ok(denied(await get(u + 'meta', bea.t)), 'otra cuenta no la lee');
  assert.ok(denied(await get(u + 'meta', adm.t)), 'el admin tampoco');
  assert.ok(denied(await set(u + 'c0', { j: 'x', i: 0 }, bea.t)), 'otra cuenta no la escribe');
  assert.ok(denied(await set(u + 'meta', Object.assign({}, meta, { n: 25 }), ana.t)), 'más de 24 trozos');
  assert.ok(denied(await set(u + 'meta', Object.assign({}, meta, { email: 'a@b.c' }), ana.t)), 'campo de más');
  assert.ok(denied(await set(u + 'c24', { j: 'x', i: 24 }, ana.t)), 'el trozo 24 no existe');
  assert.ok(denied(await set(u + 'otra', { j: 'x', i: 0 }, ana.t)), 'otro documento');
  assert.ok(denied(await set(u + 'c2', { j: 'x'.repeat(300001), i: 2 }, ana.t)), 'trozo de más de 300.000');
  assert.ok(allowed(await del(u + 'c1', ana.t)), 'su dueño borra lo que sobra');
});

const report = (who, user, extra = {}) => {
  const ca = Date.now();
  return [who.uid + '-' + ca, Object.assign({ uid: who.uid, u: user, k: 'f', a: 'Algo se ve mal', t: 'Al abrir Nutrición no sale nada', dx: 'Versión 1.0.0', v: '1.0.0', ca, st: 'p', m: ca }, extra)];
};
test('fallos y sugerencias: cada cuenta crea los suyos, pendientes y con su usuario', async () => {
  const [id, d] = report(ana, 'Ana_1');
  assert.ok(allowed(await set('reports/' + id, d, ana.t, { pre: { exists: false } })));
  const [id2, d2] = report(ana, 'Ana_1', { k: 's', a: '', dx: '' });
  assert.ok(allowed(await set('reports/' + id2, d2, ana.t, { pre: { exists: false } })), 'una sugerencia');
  const [idp, dp] = report(ana, 'Ana_1', { k: 'p', a: '', dx: '', ca: d2.ca + 1, m: d2.ca + 1 });
  assert.ok(allowed(await set('reports/' + ana.uid + '-' + dp.ca, dp, ana.t, { pre: { exists: false } })), 'una consulta de privacidad (V1.0.4): ' + idp);
  const [id3, d3] = report(ana, 'bea');
  assert.ok(denied(await set('reports/' + id3, d3, ana.t)), 'con el usuario de otra cuenta');
  const [, d4] = report(ana, 'Ana_1');
  assert.ok(denied(await set('reports/' + bea.uid + '-' + d4.ca, d4, ana.t)), 'con el id de otra cuenta');
  const [id5, d5] = report(ana, 'Ana_1', { st: 'a' });
  assert.ok(denied(await set('reports/' + id5, d5, ana.t)), 'ya arreglado');
  const [id6, d6] = report(ana, 'Ana_1', { rp: 'Solucionado' });
  assert.ok(denied(await set('reports/' + id6, d6, ana.t)), 'con respuesta');
  const [id7, d7] = report(ana, 'Ana_1', { k: 'x' });
  assert.ok(denied(await set('reports/' + id7, d7, ana.t)), 'tipo desconocido');
  const [id8, d8] = report(ana, 'Ana_1', { t: 'corto' });
  assert.ok(denied(await set('reports/' + id8, d8, ana.t)), 'texto de menos de 10');
  const [id9, d9] = report(ana, 'Ana_1', { t: 'x'.repeat(1501) });
  assert.ok(denied(await set('reports/' + id9, d9, ana.t)), 'texto de más de 1500');
  const [id10, d10] = report(ana, 'Ana_1', { tel: '600' });
  assert.ok(denied(await set('reports/' + id10, d10, ana.t)), 'campo de más');
  const [id11, d11] = report(ext, 'alguien');
  assert.ok(denied(await set('reports/' + id11, d11, ext.t)), 'cuenta sin correo técnico');
});

test('fallos y sugerencias: cada uno lee los suyos; el admin, todos, y solo cambia el estado y la respuesta', async () => {
  const [id, d] = report(bea, 'bea');
  assert.ok(allowed(await set('reports/' + id, d, bea.t, { pre: { exists: false } })));
  assert.ok(allowed(await get('reports/' + id, bea.t)), 'quien lo envió');
  assert.ok(denied(await get('reports/' + id, ana.t)), 'otra cuenta');
  assert.equal((await get('reports/' + bea.uid + '-1', bea.t)).status, 404, 'uno que no existe: no encontrado, no denegado (la app pregunta por los suyos)');
  assert.ok(denied(await get('reports', bea.t)), 'un usuario no lista los de todos');
  assert.ok(allowed(await get('reports', adm.t)), 'el admin los lista');
  assert.ok(allowed(await get('reports/' + id, adm.t)));
  assert.ok(denied(await set('reports/' + id, { st: 'a', m: Date.now() }, bea.t, { mask: ['st', 'm'] })), 'el usuario no cambia el estado');
  assert.ok(denied(await set('reports/' + id, { t: 'Ya no pasa nada raro', m: Date.now() }, bea.t, { mask: ['t', 'm'] })), 'ni el texto');
  assert.ok(allowed(await set('reports/' + id, { st: 'v', sa: Date.now(), m: Date.now() }, adm.t, { mask: ['st', 'sa', 'm'], pre: { exists: true } })), 'visto');
  assert.ok(allowed(await set('reports/' + id, { st: 'a', rp: 'Arreglado en la 1.0.1', ra: Date.now(), m: Date.now() }, adm.t, { mask: ['st', 'rp', 'ra', 'm'] })), 'arreglado y contestado');
  assert.ok(denied(await set('reports/' + id, { st: 'x', m: Date.now() }, adm.t, { mask: ['st', 'm'] })), 'estado desconocido');
  assert.ok(denied(await set('reports/' + id, { t: 'Otra cosa distinta', m: Date.now() }, adm.t, { mask: ['t', 'm'] })), 'el admin no cambia el texto');
  assert.ok(denied(await set('reports/' + id, { rp: 'x'.repeat(1501), m: Date.now() }, adm.t, { mask: ['rp', 'm'] })), 'respuesta de más de 1500');
  assert.ok(denied(await del('reports/' + id, ana.t)), 'otra cuenta no lo borra');
  assert.ok(allowed(await del('reports/' + id, adm.t)), 'el admin, sí');
});

// los avisos de una cuenta, pedidos como los pide la app al eliminarla (cloud/firestore: queryDocs)
const reportsOf = (uid, token) => call(DOCS + ':runQuery', { method: 'POST', token, body: { structuredQuery: { from: [{ collectionId: 'reports' }], where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: uid } } }, limit: 500 } } });
// (una consulta denegada puede llegar como error HTTP o, al ir por partes, como un error dentro de la respuesta)
const refused = r => denied(r) || Array.isArray(r.j) && r.j.some(x => x && x.error);
const found = r => (Array.isArray(r.j) ? r.j : []).filter(x => x && x.document).map(x => x.document.name.split('/').pop());
test('«Eliminar cuenta»: cada cuenta encuentra y borra sus avisos, y solo los suyos', async () => {
  const [a1, d1] = report(ana, 'Ana_1', { ca: Date.now() + 50, m: Date.now() + 50 });
  const ida = ana.uid + '-' + d1.ca;
  assert.ok(allowed(await set('reports/' + ida, d1, ana.t, { pre: { exists: false } })), a1);
  const [idb, db] = report(bea, 'bea');
  assert.ok(allowed(await set('reports/' + idb, db, bea.t, { pre: { exists: false } })));
  const mine = await reportsOf(ana.uid, ana.t);
  assert.ok(allowed(mine) && !refused(mine), 'pedir los propios: ' + JSON.stringify(mine.j).slice(0, 200));
  assert.ok(found(mine).includes(ida) && found(mine).every(x => x.startsWith(ana.uid + '-')), 'salen los suyos y ninguno de otra cuenta: ' + found(mine));
  assert.ok(refused(await reportsOf(bea.uid, ana.t)), 'pedir los de otra cuenta');
  assert.ok(refused(await call(DOCS + ':runQuery', { method: 'POST', token: ana.t, body: { structuredQuery: { from: [{ collectionId: 'reports' }], limit: 500 } } })), 'pedirlos todos');
  assert.ok(refused(await reportsOf(ana.uid)), 'sin sesión');
  const all = await reportsOf(bea.uid, adm.t);
  assert.ok(allowed(all) && !refused(all) && found(all).includes(idb), 'el admin, los de cualquiera');
  assert.ok(denied(await del('reports/' + idb, ana.t)), 'no borra el de otra cuenta');
  for (const id of found(mine))
    assert.ok(allowed(await del('reports/' + id, ana.t)), 'borra cada uno de los suyos');
  assert.deepEqual(found(await reportsOf(ana.uid, ana.t)), [], 'y no le queda ninguno');
  assert.ok(allowed(await get('reports/' + idb, bea.t)), 'el de la otra cuenta sigue');
});

test('una cuenta que sigue con el dominio anterior entra en lo suyo como antes, y solo en lo suyo', async () => {
  const now = Date.now();
  assert.ok(denied(await set('users/' + old.uid, { u: 'Otra', ca: now, m: now }, old.t, { pre: { exists: false } })), 'con otro usuario');
  assert.ok(denied(await set('users/' + old.uid, { u: 'Ana_1', ca: now, m: now }, old.t, { pre: { exists: false } })), 'con el usuario de una cuenta del dominio de ahora');
  assert.ok(allowed(await set('users/' + old.uid, { u: 'Vieja_1', sx: 'F', pr: {}, ca: now, m: now }, old.t, { pre: { exists: false } })), 'su perfil, con su usuario');
  assert.ok(allowed(await get('users/' + old.uid, old.t)));
  const core = 'users/' + old.uid + '/data/core';
  assert.ok(allowed(await set(core, part('{"plan":[]}'), old.t)));
  assert.ok(allowed(await get(core, old.t)));
  assert.ok(denied(await get('users/' + ana.uid, old.t)), 'el perfil de otra cuenta, no');
  assert.ok(denied(await get(core, ana.t)), 'ni otra cuenta lo suyo');
  assert.ok(allowed(await get('users/' + old.uid, adm.t)), 'el admin ve su perfil, como el de todas');
  const [id, d] = report(old, 'Vieja_1');
  assert.ok(allowed(await set('reports/' + id, d, old.t, { pre: { exists: false } })), 'un aviso con su usuario');
  const [id2, d2] = report(old, 'Ana_1');
  assert.ok(denied(await set('reports/' + id2, d2, old.t)), 'un aviso con el usuario de otra cuenta');
});

test('al pasarla al dominio de ahora (mismo identificador, otro correo) sigue con lo suyo', async () => {
  // lo que hace tools/admin/dominio.mjs con cada cuenta
  const r = await call(AUTH + '/identitytoolkit.googleapis.com/v1/projects/' + P + '/accounts:update', { method: 'POST', token: 'owner', body: { localId: old.uid, email: 'vieja_1' + NEW } });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  const now = await account('vieja_1' + NEW, 'contraseña-1', false);
  assert.equal(now.uid, old.uid, 'la misma cuenta, con la misma contraseña');
  const core = 'users/' + old.uid + '/data/core';
  assert.ok(allowed(await get(core, now.t)), 'lee lo que escribió con el dominio anterior');
  assert.ok(allowed(await set(core, part('{"plan":[1]}'), now.t)), 'y lo cambia');
  assert.ok(allowed(await set('users/' + old.uid, { sx: 'M', m: Date.now() }, now.t, { mask: ['sx', 'm'] })), 'su perfil, que se creó con el dominio anterior');
  const [id, d] = report(now, 'Vieja_1');
  assert.ok(allowed(await set('reports/' + id, d, now.t, { pre: { exists: false } })), 'un aviso con su usuario');
});

test('un correo que solo se parece al técnico no entra en nada', async () => {
  for (const email of ['ana_1' + NEW + '.otro.com', 'ana_1@otro-proyecto.firebaseapp.com', 'ana_1@firebaseapp.com', 'ana_1' + OLD + '.es', 'ana_1@stratafit-960ecxfirebaseappxcom.com',
    'zz-prueba-del-dominio-1a2b3c4d' + NEW, 'ab' + NEW]) {
    const x = await account(email);
    const name = email.split('@')[0];
    assert.ok(denied(await set('users/' + x.uid, { u: name, ca: 1, m: 1 }, x.t, { pre: { exists: false } })), email + ': perfil');
    assert.ok(denied(await get('users/' + x.uid, x.t)), email + ': leer');
    assert.ok(denied(await set('users/' + x.uid + '/data/core', part('{}'), x.t)), email + ': datos');
    const [id, d] = report(x, name);
    assert.ok(denied(await set('reports/' + id, d, x.t)), email + ': aviso');
  }
});

// (la última: borra el perfil de una de las cuentas de las pruebas)
test('«Eliminar cuenta»: cada cuenta lista y borra sus documentos y, al final, su perfil; nadie los de otra', async () => {
  const u = 'users/' + ana.uid;
  assert.ok(allowed(await set(u + '/logs/2026', part('[]'), ana.t)));
  for (const c of ['data', 'logs', 'hist', 'meals', 'private', 'backup']) {
    assert.ok(allowed(await get(u + '/' + c, ana.t)), 'lista lo suyo: ' + c);
    assert.ok(denied(await get(u + '/' + c, bea.t)), 'otra cuenta no lo lista: ' + c);
    assert.ok(denied(await get(u + '/' + c, adm.t)), 'ni el admin: ' + c);
  }
  const names = async c => ((await get(u + '/' + c, ana.t)).j.documents || []).map(d => d.name.split('/documents/')[1]);
  const mine = (await Promise.all(['data', 'logs', 'hist', 'meals', 'private', 'backup'].map(names))).flat();
  assert.ok(mine.includes(u + '/data/core') && mine.includes(u + '/data/index') && mine.includes(u + '/logs/2026') && mine.includes(u + '/private/avatar') && mine.includes(u + '/backup/meta'), String(mine));
  assert.ok(denied(await commit(bea.t, mine.map(p => ({ delete: ROOT + '/' + p })))), 'otra cuenta no los borra');
  assert.ok(allowed(await commit(ana.t, mine.map(p => ({ delete: ROOT + '/' + p })))), 'todos los suyos, en una sola escritura');
  for (const c of ['data', 'logs', 'hist', 'meals', 'private', 'backup'])
    assert.deepEqual(await names(c), [], 'no queda nada en ' + c);
  assert.ok(denied(await del(u, bea.t)), 'el perfil: otra cuenta, no');
  assert.ok(denied(await del(u, adm.t)), 'ni el admin, desde la app');
  assert.ok(denied(await del(u)), 'ni sin sesión');
  assert.ok(allowed(await del(u, ana.t)), 'la propia, sí');
  assert.equal((await get(u, ana.t)).status, 404, 'ya no está');
  assert.ok(allowed(await del(u, ana.t)), 'repetirlo no falla: si la eliminación se quedó a medias, se vuelve a pedir');
  assert.ok(allowed(await get('users/' + bea.uid, bea.t)), 'el de la otra cuenta sigue');
});
