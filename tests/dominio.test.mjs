// Prueba, sin navegador ni Firebase, del paso de las cuentas al dominio nuevo de su correo técnico (tools/admin/cuentas.mjs,
// que es lo que hace «Pasar las cuentas al dominio nuevo» en GitHub Actions), con una Authentication de mentira:
//   node --test tests/dominio.test.mjs
// El script de verdad, con firebase-admin y el emulador de Firebase, se prueba en la CI (tests/cloud.py con SF_CLOUD=emulador).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { allAccounts, moveAccounts, OLD_TECH_DOMAIN, rehearse, rulesAccept, sortAccounts, TECH_DOMAIN } from '../tools/admin/cuentas.mjs';

const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const RULES = read('firestore.rules');
const NEW = '@' + TECH_DOMAIN;
const OLD = '@' + OLD_TECH_DOMAIN;
const fbError = code => Object.assign(new Error('mensaje de Firebase, que puede repetir el correo'), { code });

/** Authentication de mentira, con lo que usa el paso de las cuentas. `opts.page`: cuántas cuentas da cada página de la lista;
    `opts.refuse(email)`: código de error con el que rechaza poner ese correo; `opts.keep`: no deja borrar cuentas. */
const fakeAuth = (emails, opts = {}) => {
  const users = emails.map((email, i) => ({ uid: 'uid' + i, email, pw: 'hash' + i, role: i == 0 ? 'admin' : '' }));
  const calls = [];
  let made = 0;
  const taken = (email, but) => users.some(u => u.email == email && u !== but);
  return {
    users,
    calls,
    async listUsers(max, token) {
      calls.push('list');
      const size = opts.page || max;
      const from = +token || 0;
      return { users: users.slice(from, from + size).map(u => ({ uid: u.uid, email: u.email })), pageToken: from + size < users.length ? String(from + size) : undefined };
    },
    async createUser({ email, password }) {
      calls.push('create');
      if (opts.refuse && opts.refuse(email))
        throw fbError(opts.refuse(email));
      if (taken(email))
        throw fbError('auth/email-already-exists');
      const u = { uid: 'prueba' + made++, email, pw: password, role: '' };
      users.push(u);
      return { uid: u.uid };
    },
    async updateUser(uid, props) {
      calls.push('update ' + uid);
      const u = users.find(x => x.uid == uid);
      assert.ok(u, 'no existe ' + uid);
      assert.deepEqual(Object.keys(props), ['email'], 'solo se cambia el correo');
      if (opts.refuse && opts.refuse(props.email))
        throw fbError(opts.refuse(props.email));
      if (taken(props.email, u))
        throw fbError('auth/email-already-exists');
      u.email = props.email;
      return { uid };
    },
    async getUserByEmail(email) {
      const u = users.find(x => x.email == email);
      if (!u)
        throw fbError('auth/user-not-found');
      return { uid: u.uid, email: u.email };
    },
    async deleteUser(uid) {
      calls.push('delete ' + uid);
      if (opts.keep)
        throw fbError('auth/internal-error');
      const i = users.findIndex(x => x.uid == uid);
      assert.ok(i >= 0, 'no existe ' + uid);
      users.splice(i, 1);
    }
  };
};
const five = () => ['victoradmin_', 'ana_1', 'bea', 'carlos.m', 'dora-7'].map(n => n + OLD);
const text = r => r.rows.map(x => x.join(' | ')).join('\n') + '\n' + r.notes.join('\n');
const row = (r, what) => (r.rows.find(x => x[0] == what) || [])[1];

test('los dos dominios son los de la app, los de las reglas y los del servidor de prueba', () => {
  const cfg = read('src/js/cloud/config.js');
  assert.equal((cfg.match(/export const TECH_DOMAIN = '([^']+)'/) || [])[1], TECH_DOMAIN, 'cloud/config: TECH_DOMAIN');
  assert.equal((cfg.match(/export const OLD_TECH_DOMAIN = '([^']+)'/) || [])[1], OLD_TECH_DOMAIN, 'cloud/config: OLD_TECH_DOMAIN');
  assert.equal(TECH_DOMAIN, (cfg.match(/projectId: '([^']+)'/) || [])[1] + '.firebaseapp.com', 'el dominio de ahora es el del proyecto de Firebase');
  const esc = d => d.replace(/\./g, '[.]');
  assert.ok(RULES.includes("@(" + esc(TECH_DOMAIN) + '|' + esc(OLD_TECH_DOMAIN) + ")$'"), 'firestore.rules: techUser admite los dos');
  assert.ok(RULES.includes("u.lower() + '" + NEW + "' == request.auth.token.email") && RULES.includes("u.lower() + '" + OLD + "' == request.auth.token.email"), 'firestore.rules: ownName, con los dos');
  const fake = read('tests/fakefb.py');
  assert.ok(fake.includes("DOMAIN = '" + TECH_DOMAIN + "'") && fake.includes("OLD_DOMAIN = '" + OLD_TECH_DOMAIN + "'"), 'tests/fakefb.py');
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

test('la lista de cuentas se lee entera, página a página', async () => {
  const auth = fakeAuth(five(), { page: 2 });
  const all = await allAccounts(auth);
  assert.equal(all.length, 5);
  assert.equal(auth.calls.filter(c => c == 'list').length, 3);
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

test('simulacro: ensaya con una cuenta de prueba, cuenta y no cambia ninguna cuenta de verdad', async () => {
  const auth = fakeAuth(five());
  const snapshot = JSON.stringify(auth.users);
  const r = await moveAccounts(auth, { apply: false, rules: RULES });
  assert.ok(r.ok, text(r));
  assert.equal(JSON.stringify(auth.users), snapshot, 'las cuentas quedan como estaban');
  assert.equal(row(r, 'Cuentas'), 5);
  assert.equal(row(r, 'Ya en el dominio nuevo'), 0);
  assert.equal(row(r, 'Por pasar'), 5);
  assert.equal(row(r, 'Ensayo con una cuenta de prueba (se crea, se pasa y se borra)'), 'Correcto');
  assert.deepEqual(auth.calls.filter(c => !c.startsWith('list')), ['create', 'update prueba0', 'delete prueba0'], 'solo se toca la cuenta de prueba');
  assert.match(text(r), /al lanzarlo con «aplicar» se pasan 5/);
});

test('aplicar: pasa todas, con su mismo identificador, su contraseña y su rol', async () => {
  const auth = fakeAuth(five());
  const was = auth.users.map(u => ({ uid: u.uid, name: u.email.split('@')[0], pw: u.pw, role: u.role }));
  const r = await moveAccounts(auth, { apply: true, rules: RULES });
  assert.ok(r.ok, text(r));
  assert.equal(r.moved, 5);
  assert.equal(row(r, 'Pasadas ahora'), 5);
  assert.equal(row(r, 'Quedan en el dominio anterior'), 0);
  assert.deepEqual(auth.users.map(u => ({ uid: u.uid, name: u.email.split('@')[0], pw: u.pw, role: u.role })), was, 'no cambia nada más que el dominio');
  assert.ok(auth.users.every(u => u.email.endsWith(NEW)), 'todas con el dominio de ahora');
  assert.equal(auth.users.length, 5, 'y la cuenta de prueba, borrada');
});

test('se puede lanzar otra vez: las ya pasadas no se tocan', async () => {
  const auth = fakeAuth(five());
  await moveAccounts(auth, { apply: true, rules: RULES });
  auth.calls.length = 0;
  const r = await moveAccounts(auth, { apply: true, rules: RULES });
  assert.ok(r.ok, text(r));
  assert.equal(r.moved, 0);
  assert.equal(row(r, 'Ya en el dominio nuevo'), 5);
  assert.deepEqual(auth.calls.filter(c => c.startsWith('update')), ['update prueba1'], 'solo la cuenta de prueba (la segunda que se crea)');
  const dry = await moveAccounts(auth, { apply: false, rules: RULES });
  assert.match(text(dry), /No queda ninguna cuenta por pasar/);
});

test('sin las reglas nuevas publicadas no se pasa ninguna', async () => {
  for (const rules of ['', RULES.split('firebaseapp').join('otra')]) {
    const auth = fakeAuth(five());
    const r = await moveAccounts(auth, { apply: true, rules });
    assert.ok(!r.ok);
    assert.equal(r.moved, 0);
    assert.ok(auth.users.every(u => u.email.endsWith(OLD)), 'todas siguen con el dominio anterior');
    assert.match(String(row(r, 'Reglas de Firestore publicadas')), /Falla/);
    assert.match(String(row(r, 'Pasadas ahora')), /^0: no se ha pasado ninguna/);
  }
});

test('si Firebase no admite el dominio de ahora, el ensayo lo dice y no se pasa ninguna', async () => {
  const auth = fakeAuth(five(), { refuse: email => email.endsWith(NEW) ? 'auth/invalid-email' : '' });
  const r = await moveAccounts(auth, { apply: true, rules: RULES });
  assert.ok(!r.ok);
  assert.equal(r.moved, 0);
  assert.match(String(row(r, 'Ensayo con una cuenta de prueba (se crea, se pasa y se borra)')), /Falla.*no deja pasar una cuenta.*auth\/invalid-email/);
  assert.ok(auth.users.every(u => u.email.endsWith(OLD)) && auth.users.length == 5, 'las cuentas, como estaban, y la de prueba, borrada');
  const t = await rehearse(fakeAuth([], { refuse: () => 'auth/operation-not-allowed' }));
  assert.match(t.problem, /no se ha podido crear la cuenta de prueba \(auth\/operation-not-allowed\)/);
});

test('una cuenta cuyo usuario ya está ocupado en el dominio de ahora no se pasa sola, y se dice cuál por su identificador', async () => {
  const auth = fakeAuth(['ana_1' + OLD, 'bea' + OLD, 'ana_1' + NEW]);
  const dry = await moveAccounts(auth, { apply: false, rules: RULES });
  assert.ok(dry.ok, 'el simulacro avisa, sin fallar');
  assert.equal(row(dry, 'Con el usuario ya ocupado en el dominio nuevo'), 1);
  const r = await moveAccounts(auth, { apply: true, rules: RULES });
  assert.ok(!r.ok, 'al aplicar, queda una sin pasar');
  assert.equal(r.moved, 1);
  assert.equal(row(r, 'Quedan en el dominio anterior'), 1);
  assert.deepEqual(auth.users.map(u => u.email), ['ana_1' + OLD, 'bea' + NEW, 'ana_1' + NEW]);
  assert.match(text(r), /uid0/);
});

test('si una cuenta falla, las demás se pasan y se dice cuál ha fallado', async () => {
  const auth = fakeAuth(five(), { refuse: email => email == 'bea' + NEW ? 'auth/internal-error' : '' });
  const r = await moveAccounts(auth, { apply: true, rules: RULES });
  assert.ok(!r.ok);
  assert.equal(r.moved, 4);
  assert.equal(row(r, 'No se han podido pasar'), 1);
  assert.equal(row(r, 'Quedan en el dominio anterior'), 1);
  assert.match(text(r), /uid2 \(auth\/internal-error\)/);
});

test('si la cuenta de prueba no se puede borrar, se dice cuál es para borrarla a mano', async () => {
  const auth = fakeAuth(five(), { keep: 1 });
  const r = await moveAccounts(auth, { apply: false, rules: RULES });
  assert.ok(!r.ok);
  assert.match(text(r), /La cuenta de prueba no se ha podido borrar.*prueba0/);
});

test('la cuenta de prueba no puede ser la de nadie: su nombre no vale como usuario ni para las reglas', async () => {
  const auth = fakeAuth([]);
  const made = [];
  const create = auth.createUser;
  auth.createUser = async o => (made.push(o.email), create(o));
  await rehearse(auth);
  const name = made[0].split('@')[0];
  assert.ok(name.length > 20, name);
  assert.ok(!/^[a-z0-9._-]{3,20}$/.test(name), 'las reglas (techUser) piden de 3 a 20 caracteres');
  assert.equal(auth.users.length, 0, 'y no queda');
});

test('lo que se escribe no lleva usuarios ni correos, solo recuentos e identificadores', async () => {
  const names = ['victoradmin_', 'ana_1', 'bea', 'carlos.m', 'dora-7'];
  for (const apply of [false, true])
    for (const opts of [{}, { refuse: email => email == 'bea' + NEW ? 'auth/internal-error' : '' }, { keep: 1 }]) {
      const auth = fakeAuth(names.map(n => n + OLD).concat('ana_1' + NEW, 'zoe.externa@gmail.com'), opts);
      const out = text(await moveAccounts(auth, { apply, rules: RULES }));
      for (const n of names.concat('zoe.externa', 'gmail', OLD_TECH_DOMAIN, TECH_DOMAIN, 'zz-prueba', 'mensaje de Firebase'))
        assert.ok(!out.includes(n), '«' + n + '» en:\n' + out);
    }
});
