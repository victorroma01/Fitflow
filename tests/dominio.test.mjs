// Prueba, sin navegador ni Firebase, del paso de las cuentas al dominio nuevo de su correo técnico (tools/admin/cuentas.mjs,
// que es lo que hace «Pasar las cuentas al dominio nuevo» en GitHub Actions), con una Authentication de mentira:
//   node --test tests/dominio.test.mjs
// La de mentira hace lo que Firebase: al cambiar el correo de una cuenta da por caducadas sus sesiones (pone «válidas desde»
// a ese momento), y una sesión solo se renueva si se abrió después. Según se le pida, deja o no devolver ese dato a su valor
// de antes, que es de lo que depende que nadie note el paso.
// El script de verdad, con firebase-admin y el emulador de Firebase, se prueba en la CI (tests/cloud.py con SF_CLOUD=emulador).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { allAccounts, MODES, moveAccounts, OLD_TECH_DOMAIN, rehearse, rulesAccept, sortAccounts, TECH_DOMAIN } from '../tools/admin/cuentas.mjs';

const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const RULES = read('firestore.rules');
const NEW = '@' + TECH_DOMAIN;
const OLD = '@' + OLD_TECH_DOMAIN;
const fbError = code => Object.assign(new Error('mensaje de Firebase, que puede repetir el correo'), { code });
const utc = s => new Date(s * 1000).toUTCString();

/** Authentication de mentira, con lo que usa el paso de las cuentas (`auth`: lo de firebase-admin; `io`: lo demás).
    `opts.page`: cuántas cuentas da cada página de la lista; `opts.refuse(email)`: código de error con el que rechaza poner ese
    correo; `opts.keep`: no deja borrar cuentas; `opts.restore`: qué hace con un «válidas desde» que se le pide: 'inline' (lo
    respeta también en la petición que cambia el correo), 'after' (solo en una petición aparte) o 'never' (lo ignora);
    `opts.signIn`: código de error al entrar por la API pública; `opts.bound`: una sesión no se renueva si el correo cambió. */
const fake = (emails, opts = {}) => {
  let now = 1800000000;
  const restore = opts.restore || 'inline';
  const users = emails.map((email, i) => ({ uid: 'uid' + i, email, pw: 'hash' + i, role: i == 0 ? 'admin' : '', created: now - 1000 - i, validSince: i % 2 ? now - 500 : 0 }));
  const calls = [];
  const sessions = [];
  let made = 0;
  const taken = (email, but) => users.some(u => u.email == email && u !== but);
  const record = u => ({ uid: u.uid, email: u.email, tokensValidAfterTime: u.validSince ? utc(u.validSince) : undefined, metadata: { creationTime: utc(u.created) } });
  const find = uid => {
    const u = users.find(x => x.uid == uid);
    assert.ok(u, 'no existe ' + uid);
    return u;
  };
  const auth = {
    async listUsers(max, token) {
      calls.push('list');
      const size = opts.page || max;
      const from = +token || 0;
      return { users: users.slice(from, from + size).map(record), pageToken: from + size < users.length ? String(from + size) : undefined };
    },
    async createUser({ email, password }) {
      calls.push('create');
      if (opts.refuse && opts.refuse(email))
        throw fbError(opts.refuse(email));
      if (taken(email))
        throw fbError('auth/email-already-exists');
      const u = { uid: 'prueba' + made++, email, pw: password, role: '', created: now, validSince: 0 };
      users.push(u);
      return { uid: u.uid };
    },
    async getUser(uid) {
      return record(find(uid));
    },
    async getUserByEmail(email) {
      const u = users.find(x => x.email == email);
      if (!u)
        throw fbError('auth/user-not-found');
      return record(u);
    },
    async deleteUser(uid) {
      calls.push('delete ' + uid);
      if (opts.keep)
        throw fbError('auth/internal-error');
      users.splice(users.indexOf(find(uid)), 1);
    }
  };
  const io = {
    async update(uid, fields) {
      calls.push('update ' + uid + ' ' + Object.keys(fields).join('+'));
      const u = find(uid);
      assert.ok(Object.keys(fields).every(k => ['email', 'validSince'].includes(k)), 'solo se cambian el correo y la validez de las sesiones');
      if ('email' in fields) {
        if (opts.refuse && opts.refuse(fields.email))
          throw fbError(opts.refuse(fields.email));
        if (taken(fields.email, u))
          throw fbError('EMAIL_EXISTS');
        u.email = fields.email;
        u.validSince = now;
      }
      if ('validSince' in fields && (restore == 'inline' || (restore == 'after' && !('email' in fields)))) {
        assert.match(fields.validSince, /^\d+$/, 'en segundos, como texto');
        u.validSince = +fields.validSince;
      }
      return {};
    },
    async signIn(email, password) {
      calls.push('signIn');
      if (opts.signIn)
        throw fbError(opts.signIn);
      const u = users.find(x => x.email == email && x.pw == password);
      if (!u)
        throw fbError('INVALID_LOGIN_CREDENTIALS');
      sessions.push({ uid: u.uid, at: now, email });
      return { refreshToken: 'rt' + (sessions.length - 1), localId: u.uid };
    },
    async refresh(token) {
      calls.push('refresh');
      const s = sessions[+token.slice(2)];
      const u = users.find(x => s && x.uid == s.uid);
      if (!u || s.at < (u.validSince || u.created) || (opts.bound && u.email != s.email))
        throw fbError('TOKEN_EXPIRED');
      return { refresh_token: token };
    },
    async pause() {
      now += 3;
    }
  };
  /** Abre una sesión en una cuenta, como un móvil que ya estaba dentro: devuelve si sigue valiendo. */
  const session = uid => {
    const u = find(uid);
    const s = { uid, at: now - 100, email: u.email };
    return () => s.at >= (u.validSince || u.created) && !(opts.bound && u.email != s.email);
  };
  return { users, calls, auth, io, session };
};
const five = () => ['victoradmin_', 'ana_1', 'bea', 'carlos.m', 'dora-7'].map(n => n + OLD);
const text = r => r.rows.map(x => x.join(' | ')).join('\n') + '\n' + r.notes.join('\n');
const row = (r, what) => (r.rows.find(x => x[0] == what) || [])[1];
const run = (f, mode, rules = RULES) => moveAccounts(f.auth, f.io, { mode, rules });
const TEST = 'Ensayo con una cuenta de prueba (se crea, entra, se pasa y se borra)';
const KEPT = 'Las sesiones abiertas se conservan';

test('los dos dominios son los de la app, los de las reglas y los del servidor de prueba', () => {
  const cfg = read('src/js/cloud/config.js');
  assert.equal((cfg.match(/export const TECH_DOMAIN = '([^']+)'/) || [])[1], TECH_DOMAIN, 'cloud/config: TECH_DOMAIN');
  assert.equal((cfg.match(/export const OLD_TECH_DOMAIN = '([^']+)'/) || [])[1], OLD_TECH_DOMAIN, 'cloud/config: OLD_TECH_DOMAIN');
  assert.equal(TECH_DOMAIN, (cfg.match(/projectId: '([^']+)'/) || [])[1] + '.firebaseapp.com', 'el dominio de ahora es el del proyecto de Firebase');
  const esc = d => d.replace(/\./g, '[.]');
  assert.ok(RULES.includes("@(" + esc(TECH_DOMAIN) + '|' + esc(OLD_TECH_DOMAIN) + ")$'"), 'firestore.rules: techUser admite los dos');
  assert.ok(RULES.includes("u.lower() + '" + NEW + "' == request.auth.token.email") && RULES.includes("u.lower() + '" + OLD + "' == request.auth.token.email"), 'firestore.rules: ownName, con los dos');
  const fakefb = read('tests/fakefb.py');
  assert.ok(fakefb.includes("DOMAIN = '" + TECH_DOMAIN + "'") && fakefb.includes("OLD_DOMAIN = '" + OLD_TECH_DOMAIN + "'"), 'tests/fakefb.py');
  // la clave web y el proyecto con los que las herramientas hacen de móvil son los de la app
  const tools = read('tools/admin/firebase.mjs');
  assert.equal((tools.match(/export const API_KEY = '([^']+)'/) || [])[1], (cfg.match(/apiKey: '([^']+)'/) || [])[1], 'tools/admin/firebase.mjs: API_KEY');
  assert.equal((tools.match(/export const PROJECT = '([^']+)'/) || [])[1], (cfg.match(/projectId: '([^']+)'/) || [])[1], 'tools/admin/firebase.mjs: PROJECT');
  assert.ok(read('README.md').includes((tools.match(/export const APP_URL = '([^']+)'/) || [])[1]), 'tools/admin/firebase.mjs: APP_URL es la dirección de la app');
  // y los modos, los que ofrece el flujo de GitHub
  const flow = read('.github/workflows/admin-dominio.yml');
  assert.deepEqual([...flow.matchAll(/^ {10}- (\S+)$/gm)].map(m => m[1]), MODES);
});

test('las reglas de este repositorio aceptan el dominio de ahora; las de antes, no', () => {
  assert.ok(rulesAccept(RULES));
  // las de antes: solo el dominio anterior, en techUser y en la comparación del usuario
  const before = RULES.replace('(stratafit-960ec[.]firebaseapp[.]com|stratafit[.]app)', 'stratafit[.]app').split("u.lower() + '" + NEW + "' == request.auth.token.email").join('false');
  assert.notEqual(before, RULES);
  assert.ok(!rulesAccept(before));
  // (que un comentario nombre el dominio no cuenta: tiene que estar en las dos comprobaciones)
  assert.ok(before.includes(TECH_DOMAIN), 'el comentario de cabecera lo sigue nombrando');
  assert.ok(!rulesAccept(RULES.replace('(stratafit-960ec[.]firebaseapp[.]com|stratafit[.]app)', 'stratafit[.]app')), 'solo en la comparación del usuario');
  assert.ok(!rulesAccept(''), 'sin reglas publicadas');
  // cuando solo quede el dominio de ahora (sin el anterior), siguen valiendo
  assert.ok(rulesAccept(RULES.replace('(stratafit-960ec[.]firebaseapp[.]com|stratafit[.]app)', 'stratafit-960ec[.]firebaseapp[.]com')));
});

test('la lista de cuentas se lee entera, página a página, con la validez de las sesiones de cada una', async () => {
  const f = fake(five(), { page: 2 });
  const all = await allAccounts(f.auth);
  assert.equal(all.length, 5);
  assert.equal(f.calls.filter(c => c == 'list').length, 3);
  // la que dice Firebase o, si no dice ninguna, desde que se creó la cuenta
  assert.deepEqual(all.map(u => u.validSince), f.users.map(u => u.validSince || u.created));
});

test('reparto: las de ahora, las que se pasan, las que chocan y las de otro correo', () => {
  const s = sortAccounts([
    { uid: 'a', email: 'ana_1' + NEW }, { uid: 'b', email: 'bea' + OLD }, { uid: 'c', email: 'ana_1' + OLD },
    { uid: 'd', email: 'alguien@gmail.com' }, { uid: 'e', email: '' }, { uid: 'f', email: 'Dora' + OLD.toUpperCase() },
    { uid: 'g', email: 'x@' + TECH_DOMAIN + '.otro.com' }
  ]);
  assert.deepEqual(s.done.map(u => u.uid), ['a']);
  assert.deepEqual(s.move.map(u => u.uid), ['b', 'f'], 'las del dominio anterior con el usuario libre (sin distinguir mayúsculas)');
  assert.deepEqual(s.clash.map(u => u.uid), ['c'], 'su usuario ya lo tiene otra cuenta en el de ahora');
  assert.deepEqual(s.other.map(u => u.uid), ['d', 'e', 'g'], 'otro correo, sin correo o un dominio que solo se parece');
});

test('simulacro: ensaya con una cuenta de prueba, cuenta, dice si las sesiones se conservan y no cambia ninguna cuenta de verdad', async () => {
  const f = fake(five());
  const snapshot = JSON.stringify(f.users);
  const r = await run(f, 'simulacro');
  assert.ok(r.ok, text(r));
  assert.equal(JSON.stringify(f.users), snapshot, 'las cuentas quedan como estaban');
  assert.equal(row(r, 'Cuentas'), 5);
  assert.equal(row(r, 'Ya en el dominio nuevo'), 0);
  assert.equal(row(r, 'Por pasar'), 5);
  assert.equal(row(r, TEST), 'Correcto');
  assert.match(String(row(r, KEPT)), /^Sí/);
  assert.deepEqual(f.calls.filter(c => !c.startsWith('list')), ['create', 'signIn', 'update prueba0 email+validSince', 'refresh', 'delete prueba0'], 'solo se toca la cuenta de prueba, que entra como un móvil');
  assert.match(text(r), /con «aplicar» se pasan 5\. Las sesiones abiertas se conservan/);
});

test('aplicar: pasa todas, con su mismo identificador, su contraseña y su rol, y sus sesiones siguen valiendo', async () => {
  const f = fake(five());
  const was = f.users.map(u => ({ uid: u.uid, name: u.email.split('@')[0], pw: u.pw, role: u.role, validSince: u.validSince || u.created }));
  const open = f.users.map(u => f.session(u.uid));
  const r = await run(f, 'aplicar');
  assert.ok(r.ok, text(r));
  assert.equal(r.moved, 5);
  assert.equal(row(r, 'Pasadas ahora'), 5);
  assert.equal(row(r, 'Quedan en el dominio anterior'), 0);
  assert.deepEqual(f.users.map(u => ({ uid: u.uid, name: u.email.split('@')[0], pw: u.pw, role: u.role, validSince: u.validSince })), was, 'no cambia nada más que el dominio');
  assert.ok(f.users.every(u => u.email.endsWith(NEW)), 'todas con el dominio de ahora');
  assert.equal(f.users.length, 5, 'y la cuenta de prueba, borrada');
  assert.ok(open.every(alive => alive()), 'las sesiones que estaban abiertas siguen valiendo: nadie tiene que volver a entrar');
  assert.equal(row(r, 'Pasadas, pero con la sesión cerrada'), undefined);
  assert.match(text(r), /nadie tiene que volver a entrar/);
});

test('si Firebase solo deja devolver la validez en una petición aparte, se hace así y las sesiones también se conservan', async () => {
  const f = fake(five(), { restore: 'after' });
  const open = f.users.map(u => f.session(u.uid));
  const r = await run(f, 'aplicar');
  assert.ok(r.ok, text(r));
  assert.equal(r.moved, 5);
  assert.ok(open.every(alive => alive()));
  assert.ok(f.calls.includes('update uid1 email+validSince') && f.calls.includes('update uid1 validSince'), 'primero con el correo y, al ver que no ha valido, aparte');
});

test('si las sesiones no se conservarían, «aplicar» no pasa ninguna cuenta y lo dice', async () => {
  for (const opts of [{ restore: 'never' }, { bound: 1 }]) {
    const f = fake(five(), opts);
    const open = f.users.map(u => f.session(u.uid));
    const dry = await run(f, 'simulacro');
    assert.ok(dry.ok, 'el simulacro va bien: informa');
    assert.match(String(row(dry, KEPT)), /^\*\*No\*\*/, text(dry));
    assert.match(text(dry), /Con «aplicar» no se pasaría ninguna: las sesiones no se conservarían/);
    const r = await run(f, 'aplicar');
    assert.ok(!r.ok);
    assert.equal(r.moved, 0);
    assert.ok(f.users.every(u => u.email.endsWith(OLD)) && f.users.length == 5, 'todas siguen con el dominio anterior');
    assert.ok(open.every(alive => alive()), 'y con sus sesiones');
    assert.match(String(row(r, 'Pasadas ahora')), /^0: no se ha pasado ninguna \(las sesiones no se conservarían\)/);
    assert.match(text(r), /«aplicar-todo»/);
  }
});

test('«aplicar-todo» las pasa aunque haya que volver a entrar, y lo avisa', async () => {
  const f = fake(five(), { restore: 'never' });
  const open = f.users.map(u => f.session(u.uid));
  const r = await run(f, 'aplicar-todo');
  assert.ok(r.ok, text(r));
  assert.equal(r.moved, 5);
  assert.ok(f.users.every(u => u.email.endsWith(NEW)));
  assert.ok(open.every(alive => !alive()), 'las sesiones se cierran: en cada móvil hay que volver a entrar');
  assert.match(text(r), /en cada móvil habrá que volver a entrar una vez/);
  // y si se conservan, «aplicar-todo» también las conserva
  const g = fake(five());
  const alive = g.users.map(u => g.session(u.uid));
  assert.ok((await run(g, 'aplicar-todo')).ok);
  assert.ok(alive.every(a => a()));
});

test('si no se puede entrar por la API pública para probarlo, queda sin comprobar y «aplicar» no pasa ninguna', async () => {
  const f = fake(five(), { signIn: 'PERMISSION_DENIED' });
  const dry = await run(f, 'simulacro');
  assert.ok(dry.ok);
  assert.match(String(row(dry, KEPT)), /^Sin comprobar \(PERMISSION_DENIED\)/);
  const r = await run(f, 'aplicar');
  assert.ok(!r.ok);
  assert.equal(r.moved, 0);
  assert.ok(f.users.every(u => u.email.endsWith(OLD)));
  assert.match(String(row(r, 'Pasadas ahora')), /^0: no se ha pasado ninguna \(no se ha podido comprobar que las sesiones se conserven\)/);
});

test('se puede lanzar otra vez: las ya pasadas no se tocan', async () => {
  const f = fake(five());
  await run(f, 'aplicar');
  f.calls.length = 0;
  const r = await run(f, 'aplicar');
  assert.ok(r.ok, text(r));
  assert.equal(r.moved, 0);
  assert.equal(row(r, 'Ya en el dominio nuevo'), 5);
  assert.deepEqual(f.calls.filter(c => c.startsWith('update')), ['update prueba1 email+validSince'], 'solo la cuenta de prueba (la segunda que se crea)');
  assert.match(text(await run(f, 'simulacro')), /No queda ninguna cuenta por pasar/);
});

test('sin las reglas nuevas publicadas no se pasa ninguna', async () => {
  for (const rules of ['', RULES.split('firebaseapp').join('otra')])
    for (const mode of ['aplicar', 'aplicar-todo']) {
      const f = fake(five());
      const r = await run(f, mode, rules);
      assert.ok(!r.ok);
      assert.equal(r.moved, 0);
      assert.ok(f.users.every(u => u.email.endsWith(OLD)), 'todas siguen con el dominio anterior');
      assert.match(String(row(r, 'Reglas de Firestore publicadas')), /Falla/);
      assert.match(String(row(r, 'Pasadas ahora')), /^0: no se ha pasado ninguna \(falla lo de arriba\)/);
    }
});

test('si Firebase no admite el dominio de ahora, el ensayo lo dice y no se pasa ninguna', async () => {
  const f = fake(five(), { refuse: email => email.endsWith(NEW) ? 'INVALID_EMAIL' : '' });
  const r = await run(f, 'aplicar-todo');
  assert.ok(!r.ok);
  assert.equal(r.moved, 0);
  assert.match(String(row(r, TEST)), /Falla.*no deja pasar una cuenta.*INVALID_EMAIL/);
  assert.equal(row(r, KEPT), undefined, 'de las sesiones no se dice nada: el ensayo no ha llegado');
  assert.ok(f.users.every(u => u.email.endsWith(OLD)) && f.users.length == 5, 'las cuentas, como estaban, y la de prueba, borrada');
  const t = await rehearse(...Object.values((({ auth, io }) => ({ auth, io }))(fake([], { refuse: () => 'auth/operation-not-allowed' }))));
  assert.match(t.problem, /no se ha podido crear la cuenta de prueba \(auth\/operation-not-allowed\)/);
});

test('una cuenta cuyo usuario ya está ocupado en el dominio de ahora no se pasa sola, y se dice cuál por su identificador', async () => {
  const f = fake(['ana_1' + OLD, 'bea' + OLD, 'ana_1' + NEW]);
  const dry = await run(f, 'simulacro');
  assert.ok(dry.ok, 'el simulacro avisa, sin fallar');
  assert.equal(row(dry, 'Con el usuario ya ocupado en el dominio nuevo'), 1);
  const r = await run(f, 'aplicar');
  assert.ok(!r.ok, 'al aplicar, queda una sin pasar');
  assert.equal(r.moved, 1);
  assert.equal(row(r, 'Quedan en el dominio anterior'), 1);
  assert.deepEqual(f.users.map(u => u.email), ['ana_1' + OLD, 'bea' + NEW, 'ana_1' + NEW]);
  assert.match(text(r), /uid0/);
});

test('si una cuenta falla, las demás se pasan y se dice cuál ha fallado', async () => {
  const f = fake(five(), { refuse: email => email == 'bea' + NEW ? 'INTERNAL_ERROR' : '' });
  const r = await run(f, 'aplicar');
  assert.ok(!r.ok);
  assert.equal(r.moved, 4);
  assert.equal(row(r, 'No se han podido pasar'), 1);
  assert.equal(row(r, 'Quedan en el dominio anterior'), 1);
  assert.match(text(r), /uid2 \(INTERNAL_ERROR\)/);
});

test('si la cuenta de prueba no se puede borrar, se dice cuál es para borrarla a mano', async () => {
  const f = fake(five(), { keep: 1 });
  const r = await run(f, 'simulacro');
  assert.ok(!r.ok);
  assert.match(text(r), /La cuenta de prueba no se ha podido borrar.*prueba0/);
});

test('la cuenta de prueba no puede ser la de nadie: su nombre no vale como usuario ni para las reglas', async () => {
  const f = fake([]);
  const made = [];
  const create = f.auth.createUser;
  f.auth.createUser = async o => (made.push(o.email), create(o));
  const t = await rehearse(f.auth, f.io);
  assert.equal(t.problem, '');
  assert.equal(t.sessions, 'kept');
  const name = made[0].split('@')[0];
  assert.ok(name.length > 20, name);
  assert.ok(!/^[a-z0-9._-]{3,20}$/.test(name), 'las reglas (techUser) piden de 3 a 20 caracteres');
  assert.equal(f.users.length, 0, 'y no queda');
});

test('lo que se escribe no lleva usuarios ni correos, solo recuentos e identificadores', async () => {
  const names = ['victoradmin_', 'ana_1', 'bea', 'carlos.m', 'dora-7'];
  for (const mode of MODES)
    for (const opts of [{}, { restore: 'never' }, { signIn: 'PERMISSION_DENIED' }, { refuse: email => email == 'bea' + NEW ? 'INTERNAL_ERROR' : '' }, { keep: 1 }]) {
      const f = fake(names.map(n => n + OLD).concat('ana_1' + NEW, 'zoe.externa@gmail.com'), opts);
      const out = text(await run(f, mode));
      for (const n of names.concat('zoe.externa', 'gmail', OLD_TECH_DOMAIN, TECH_DOMAIN, 'zz-prueba', 'mensaje de Firebase'))
        assert.ok(!out.includes(n), '«' + n + '» en:\n' + out);
    }
});
