// Prueba, sin navegador ni Firebase, de la limpieza periódica de cuentas (tools/admin/inactivas.mjs, que es lo que hace
// «Limpieza de cuentas» en GitHub Actions), con un Firebase de mentira:
//   node --test tests/limpieza.test.mjs
// Qué se elimina (las cuentas con dos años sin actividad, los datos de cuentas que ya no existen y las contraseñas temporales
// caducadas), qué no se toca nunca (un administrador, una cuenta sin fechas, una con datos escritos después, los datos de una
// cuenta que sí existe) y las cautelas (el simulacro no borra; con demasiadas cuentas, o sin ninguna, no se borra nada).
// El script de verdad, con firebase-admin y el emulador de Firebase, se prueba en la CI (tests/cloud.py con SF_CLOUD=emulador).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INACTIVE_YEARS, lastSeen, MAX_ACCOUNTS, MAX_LEFTOVERS, MODES, sweep, yearsBefore } from '../tools/admin/inactivas.mjs';

const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const DAY = 864e5;
const NOW = Date.UTC(2029, 0, 15, 4, 17);
const CUT = yearsBefore(NOW, INACTIVE_YEARS);
const fbError = code => Object.assign(new Error('mensaje de Firebase, que puede nombrar a ana@example.com'), { code });

/** Firebase de mentira. `accounts`: [{ uid, created, lastSignIn, lastRefresh, admin, email }]; `data`: { uid: última escritura
    (ms) } de lo que hay en users/…; `reports`: uids con avisos; `inbox`: caducidades (ms) de las contraseñas temporales.
    `opts.failAccount` / `opts.failData`: uid con el que falla eliminar la cuenta o borrar sus datos; `opts.born`: uids de
    cuentas que existen pero no salían en la lista (recién creadas). */
const fake = ({ accounts = [], data = {}, reports = [], inbox = [] } = {}, opts = {}) => {
  const st = { accounts: accounts.map(a => ({ ...a })), data: { ...data }, reports: reports.slice(), inbox: inbox.slice(), calls: [] };
  const io = {
    async accounts() {
      st.calls.push('accounts');
      return st.accounts.filter(a => !(opts.born || []).includes(a.uid)).map(({ email, ...a }) => a);
    },
    async exists(uid) {
      st.calls.push('exists ' + uid);
      return st.accounts.some(a => a.uid == uid);
    },
    async lastWrite(uid) {
      return st.data[uid] || 0;
    },
    async dataOwners() {
      return Object.keys(st.data).concat(st.reports);
    },
    async deleteData(uid) {
      st.calls.push('data ' + uid);
      if (opts.failData == uid)
        throw fbError('permission-denied');
      delete st.data[uid];
      st.reports = st.reports.filter(u => u != uid);
    },
    async deleteAccount(uid) {
      st.calls.push('account ' + uid);
      if (opts.failAccount == uid)
        throw fbError('auth/internal-error');
      st.accounts = st.accounts.filter(a => a.uid != uid);
    },
    async inbox(now, apply) {
      const old = st.inbox.filter(t => t < now);
      if (apply)
        st.inbox = st.inbox.filter(t => t >= now);
      return old.length;
    }
  };
  return { io, st };
};
const acct = (uid, last, more = {}) => ({ uid, created: last - 30 * DAY, lastSignIn: last, lastRefresh: last, admin: false, email: uid + '@example.com', ...more });
const row = (r, what) => (r.rows.find(x => x[0] == what) || [])[1];
const text = r => JSON.stringify([r.rows, r.notes]);

/* una nube corriente: dos cuentas en uso, dos sin actividad, un administrador dormido, restos y contraseñas temporales */
const usual = () => ({
  accounts: [acct('activa', NOW - 3 * DAY), acct('justa', CUT + DAY), acct('dormida', CUT - DAY), acct('vieja', CUT - 400 * DAY),
    acct('admin', CUT - 400 * DAY, { admin: true })],
  data: { activa: NOW - 3 * DAY, justa: CUT + DAY, dormida: CUT - 2 * DAY, vieja: CUT - 400 * DAY, admin: CUT - 400 * DAY, fantasma: NOW - 40 * DAY },
  reports: ['activa', 'vieja', 'fantasma', 'otro-fantasma'],
  inbox: [NOW - DAY, NOW - 100 * DAY, NOW + DAY / 2]
});

test('dos años por el calendario, también desde un 29 de febrero', () => {
  assert.equal(INACTIVE_YEARS, 2);
  assert.equal(new Date(yearsBefore(Date.UTC(2029, 0, 15, 4, 17), 2)).toISOString(), '2027-01-15T04:17:00.000Z');
  assert.equal(new Date(yearsBefore(Date.UTC(2028, 1, 29), 2)).toISOString(), '2026-03-01T00:00:00.000Z');
  assert.deepEqual(MODES, ['simulacro', 'aplicar']);
});

test('lo último que se sabe de una cuenta: lo más reciente de crearse, entrar y renovar la sesión', () => {
  assert.equal(lastSeen({ created: 5, lastSignIn: 9, lastRefresh: 7 }), 9);
  assert.equal(lastSeen({ created: 5, lastSignIn: 0, lastRefresh: 12 }), 12);
  assert.equal(lastSeen({ created: 5 }), 5);
  assert.equal(lastSeen({}), 0);
});

test('el simulacro cuenta y no borra nada', async () => {
  const { io, st } = fake(usual());
  const r = await sweep(io, { mode: 'simulacro', now: NOW });
  assert.equal(r.ok, true);
  assert.equal(row(r, 'Cuentas'), 5);
  assert.equal(row(r, 'Sin actividad desde hace 2 años'), 2);
  assert.equal(row(r, 'De administrador sin actividad (no se eliminan)'), 1);
  assert.equal(row(r, 'Datos de cuentas que ya no existen'), 2);
  assert.equal(row(r, 'Contraseñas temporales caducadas'), 2);
  assert.deepEqual(r.gone, { accounts: 0, leftovers: 0, inbox: 2 });
  assert.equal(st.accounts.length, 5);
  assert.equal(Object.keys(st.data).length, 6);
  assert.equal(st.inbox.length, 3);
  assert.ok(!st.calls.some(c => /^(data|account) /.test(c)), 'ningún borrado');
  assert.match(r.notes.join(' '), /Con «aplicar» se eliminarían 2 cuentas sin actividad, los restos de 2 y 2 contraseñas/);
});

test('aplicar: fuera las cuentas sin actividad con sus datos y avisos, los restos y las contraseñas caducadas', async () => {
  const { io, st } = fake(usual());
  const r = await sweep(io, { mode: 'aplicar', now: NOW });
  assert.equal(r.ok, true, text(r));
  assert.deepEqual(st.accounts.map(a => a.uid), ['activa', 'justa', 'admin']);
  assert.deepEqual(Object.keys(st.data).sort(), ['activa', 'admin', 'justa']);
  assert.deepEqual(st.reports, ['activa']);
  assert.deepEqual(st.inbox, [NOW + DAY / 2]);
  assert.deepEqual(r.gone, { accounts: 2, leftovers: 2, inbox: 2 });
  assert.equal(row(r, 'Cuentas eliminadas ahora'), 2);
  assert.equal(row(r, 'Restos borrados ahora'), 2);
  /* de cada cuenta, primero sus datos y después la cuenta: si falla a medias, no queda una cuenta sin dueño de sus datos */
  for (const uid of ['dormida', 'vieja'])
    assert.ok(st.calls.indexOf('data ' + uid) >= 0 && st.calls.indexOf('data ' + uid) < st.calls.indexOf('account ' + uid), uid);
  /* una segunda pasada no encuentra nada */
  const again = await sweep(io, { mode: 'aplicar', now: NOW });
  assert.deepEqual(again.gone, { accounts: 0, leftovers: 0, inbox: 0 });
  assert.equal(again.ok, true);
});

test('el límite es justo dos años: un día menos no se elimina', async () => {
  const { io, st } = fake({ accounts: [acct('a', CUT), acct('b', CUT - 1)], data: { a: 1, b: 1 } });
  await sweep(io, { mode: 'aplicar', now: NOW });
  assert.deepEqual(st.accounts.map(a => a.uid), ['a']);
});

test('una cuenta que solo se creó y no volvió a entrar cuenta desde que se creó', async () => {
  const young = { uid: 'nueva', created: CUT + DAY, lastSignIn: 0, lastRefresh: 0, admin: false };
  const old = { uid: 'antigua', created: CUT - DAY, lastSignIn: 0, lastRefresh: 0, admin: false };
  const { io, st } = fake({ accounts: [young, old] });
  await sweep(io, { mode: 'aplicar', now: NOW });
  assert.deepEqual(st.accounts.map(a => a.uid), ['nueva']);
});

test('nunca: un administrador, una cuenta sin ninguna fecha, una con datos escritos después', async () => {
  const { io, st } = fake({
    accounts: [acct('admin', CUT - 900 * DAY, { admin: true }), { uid: 'sin-fechas', created: 0, lastSignIn: 0, lastRefresh: 0, admin: false },
      acct('escribe', CUT - 30 * DAY)],
    data: { admin: 1, 'sin-fechas': 1, escribe: CUT + 5 * DAY }
  });
  const r = await sweep(io, { mode: 'aplicar', now: NOW });
  assert.equal(st.accounts.length, 3);
  assert.equal(Object.keys(st.data).length, 3);
  assert.equal(row(r, 'Sin ninguna fecha conocida (no se eliminan)'), 1);
  assert.equal(row(r, 'Sin entrar en 2 años pero con datos escritos después (no se eliminan)'), 1);
  assert.equal(row(r, 'De administrador sin actividad (no se eliminan)'), 1);
  assert.equal(r.gone.accounts, 0);
});

test('los datos de una cuenta que sí existe no son restos, aunque no saliera en la lista', async () => {
  const { io, st } = fake({ accounts: [acct('a', NOW - DAY), acct('recien', NOW)], data: { a: NOW, recien: NOW, ido: NOW - DAY }, reports: ['recien'] }, { born: ['recien'] });
  const r = await sweep(io, { mode: 'aplicar', now: NOW });
  assert.deepEqual(Object.keys(st.data).sort(), ['a', 'recien']);
  assert.deepEqual(st.reports, ['recien']);
  assert.equal(row(r, 'De ellos, de cuentas que sí existen (no se tocan)'), 1);
  assert.equal(r.gone.leftovers, 1);
  assert.ok(st.calls.includes('exists recien') && st.calls.includes('exists ido'), 'se pregunta por cada una antes de borrar');
});

test('demasiadas cuentas sin actividad: no se elimina ninguna, y falla', async () => {
  const many = Array.from({ length: MAX_ACCOUNTS + 1 }, (_, i) => acct('u' + i, CUT - DAY));
  const { io, st } = fake({ accounts: many.concat([acct('activa', NOW)]), data: { fantasma: 1 }, inbox: [NOW - DAY] });
  const r = await sweep(io, { mode: 'aplicar', now: NOW });
  assert.equal(r.ok, false);
  assert.equal(st.accounts.length, MAX_ACCOUNTS + 2);
  assert.match(r.notes.join(' '), /no se ha eliminado ninguna/);
  /* lo demás, que no depende de las fechas, sí se limpia */
  assert.deepEqual(r.gone, { accounts: 0, leftovers: 1, inbox: 1 });
  /* justo en el tope, sí */
  const b = fake({ accounts: many.slice(1) });
  assert.equal((await sweep(b.io, { mode: 'aplicar', now: NOW })).gone.accounts, MAX_ACCOUNTS);
});

test('demasiados restos: no se borra ninguno, y falla', async () => {
  const data = Object.fromEntries(Array.from({ length: MAX_LEFTOVERS + 1 }, (_, i) => ['ido' + i, 1]));
  const { io, st } = fake({ accounts: [acct('a', NOW)], data });
  const r = await sweep(io, { mode: 'aplicar', now: NOW });
  assert.equal(r.ok, false);
  assert.equal(Object.keys(st.data).length, MAX_LEFTOVERS + 1);
  assert.equal(r.gone.leftovers, 0);
});

test('si Authentication no devuelve ninguna cuenta, no se borra ningún dato', async () => {
  const { io, st } = fake({ accounts: [], data: { a: 1, b: 2 }, reports: ['a'] });
  const r = await sweep(io, { mode: 'aplicar', now: NOW });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(st.data), ['a', 'b']);
  assert.deepEqual(st.reports, ['a']);
  assert.match(r.notes.join(' '), /no se borra nada/);
  /* sin cuentas y sin datos (un proyecto recién creado) no hay nada que decir */
  assert.equal((await sweep(fake().io, { mode: 'aplicar', now: NOW })).ok, true);
});

test('lo que no se puede borrar se dice con su identificador, sin usuarios, y el resto sigue', async () => {
  const a = fake(usual(), { failAccount: 'dormida' });
  const r = await sweep(a.io, { mode: 'aplicar', now: NOW });
  assert.equal(r.ok, false);
  assert.deepEqual(a.st.accounts.map(x => x.uid), ['activa', 'justa', 'dormida', 'admin']);
  assert.equal(r.gone.accounts, 1);
  assert.match(r.notes.join(' '), /dormida \(auth\/internal-error\)/);
  const b = fake(usual(), { failData: 'vieja' });
  const r2 = await sweep(b.io, { mode: 'aplicar', now: NOW });
  assert.equal(r2.ok, false);
  assert.ok(b.st.accounts.some(x => x.uid == 'vieja'), 'sin borrar sus datos no se elimina la cuenta');
  assert.match(r2.notes.join(' '), /vieja \(permission-denied\)/);
  for (const out of [text(r), text(r2)])
    assert.ok(!/@|example\.com|mensaje de Firebase/.test(out), 'ni correos ni mensajes de Firebase: ' + out);
});

test('el script de verdad da a la limpieza todo lo que usa', () => {
  const used = new Set([...read('tools/admin/inactivas.mjs').matchAll(/\bio\.(\w+)\(/g)].map(m => m[1]));
  const cli = read('tools/admin/limpieza.mjs');
  assert.deepEqual([...used].sort(), ['accounts', 'dataOwners', 'deleteAccount', 'deleteData', 'exists', 'inbox', 'lastWrite']);
  for (const k of used)
    assert.match(cli, new RegExp('\\n  (async )?' + k + '[(:]'), 'falta ' + k);
  /* la fecha de prueba solo vale con el emulador */
  assert.match(cli, /EMULATOR && \+process\.env\.LIMPIEZA_AHORA/);
});

test('la tarea de GitHub: sola una vez al mes aplicando, a mano con simulacro por defecto, solo desde main y sin usuarios', () => {
  const y = read('.github/workflows/admin-limpieza.yml');
  assert.match(y, /schedule:\n\s+- cron: '\d+ \d+ \d+ \* \*'/);
  assert.match(y, /default: simulacro/);
  assert.equal((y.match(/inputs\.modo \|\| 'aplicar'/g) || []).length, 2);
  assert.match(y, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(y, /group: admin-firebase/);
  assert.match(y, /FIREBASE_SERVICE_ACCOUNT: \$\{\{ secrets\.FIREBASE_SERVICE_ACCOUNT \}\}/);
  assert.match(y, /run: node tools\/admin\/limpieza\.mjs "\$MODO"/);
  assert.ok(!/\$\{\{ inputs\.modo[^}]*\}\}"?\s*$/m.test(y.split('run:').pop()), 'el modo no va pegado en el código del paso');
});
