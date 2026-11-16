/* StrataFit · el dominio del correo técnico de las cuentas y el paso de las cuentas del anterior al de ahora.
   Aquí va lo que no necesita firebase-admin: lo usan tools/admin/firebase.mjs, comprobar.mjs y dominio.mjs, y se prueba suelto
   (tests/dominio.test.mjs) con una Authentication de mentira.
   Nada de lo que devuelve lleva usuarios ni correos: el registro de GitHub Actions es público. Si hay que señalar una cuenta,
   va su identificador de Firebase (uid), que solo dice algo dentro de la consola del proyecto. */
import { randomBytes } from 'node:crypto';

/** El dominio del correo técnico de las cuentas: el del propio proyecto de Firebase (el mismo que cloud/config). */
export const TECH_DOMAIN = 'stratafit-960ec.firebaseapp.com';
/** El de las cuentas hasta la V1.0.31. */
export const OLD_TECH_DOMAIN = 'stratafit.app';

const localOf = email => String(email || '').toLowerCase().split('@')[0];
const domainOf = email => String(email || '').toLowerCase().split('@')[1] || '';
/* de un error, solo su código: el mensaje de Authentication puede repetir el correo */
const why = e => e && typeof e.code == 'string' && e.code ? e.code : e && e.name || 'error';

/** Todas las cuentas del proyecto: [{ uid, email }]. */
export async function allAccounts(auth) {
  const out = [];
  let page;
  do {
    page = await auth.listUsers(1000, page && page.pageToken);
    out.push(...page.users.map(u => ({ uid: u.uid, email: String(u.email || '').toLowerCase() })));
  } while (page.pageToken);
  return out;
}

/** Reparte las cuentas: `done`, ya en el dominio de ahora; `move`, en el anterior y con su usuario libre en el de ahora;
    `clash`, en el anterior pero con otra cuenta que ya usa ese usuario en el de ahora (no se pueden pasar solas); `other`,
    con cualquier otro correo (no entran en nada: las reglas de Firestore no las admiten). */
export function sortAccounts(users) {
  const done = users.filter(u => domainOf(u.email) == TECH_DOMAIN);
  const taken = new Set(done.map(u => localOf(u.email)));
  const old = users.filter(u => domainOf(u.email) == OLD_TECH_DOMAIN);
  return {
    done,
    move: old.filter(u => !taken.has(localOf(u.email))),
    clash: old.filter(u => taken.has(localOf(u.email))),
    other: users.filter(u => ![TECH_DOMAIN, OLD_TECH_DOMAIN].includes(domainOf(u.email)))
  };
}

/** ¿Aceptan estas reglas de Firestore (su texto) las cuentas con el dominio de ahora? Miran el correo en dos sitios: quién es
    una cuenta de la app (techUser, con una expresión regular) y de quién es un usuario (ownName, con el correo entero). */
export const rulesAccept = source => String(source || '').includes(TECH_DOMAIN.replace(/\./g, '[.]')) && String(source || '').includes("'@" + TECH_DOMAIN + "'");

/** Pasa una cuenta al dominio de ahora: el mismo uid, la misma contraseña y el mismo rol; solo cambia el correo técnico.
    Firebase cierra entonces sus sesiones abiertas: en cada móvil hay que volver a entrar una vez. */
const moveOne = (auth, u) => auth.updateUser(u.uid, { email: localOf(u.email) + '@' + TECH_DOMAIN });

/** Ensayo con una cuenta de prueba, que se crea con el dominio anterior, se pasa como las de verdad y se borra: dice si
    Authentication admite el dominio de ahora sin tocar ninguna cuenta. Su nombre tiene más de 20 caracteres: no puede ser el
    de ningún usuario (la app no los admite tan largos) y las reglas de Firestore no la dejan entrar en nada. Devuelve
    { problem: '' si va bien o qué falla, left: el uid de la cuenta de prueba si no se ha podido borrar }. */
export async function rehearse(auth) {
  const name = 'zz-prueba-del-dominio-' + randomBytes(4).toString('hex');
  let uid = '';
  let problem = '';
  let left = '';
  try {
    uid = (await auth.createUser({ email: name + '@' + OLD_TECH_DOMAIN, password: randomBytes(24).toString('base64url') })).uid;
    await moveOne(auth, { uid, email: name + '@' + OLD_TECH_DOMAIN });
    const now = await auth.getUserByEmail(name + '@' + TECH_DOMAIN);
    if (now.uid !== uid)
      problem = 'la cuenta de prueba no aparece con el dominio de ahora';
  }
  catch (e) {
    problem = (uid ? 'Authentication no deja pasar una cuenta al dominio de ahora' : 'no se ha podido crear la cuenta de prueba') + ' (' + why(e) + ')';
  }
  if (uid)
    try {
      await auth.deleteUser(uid);
    }
    catch (e) {
      left = uid;
    }
  return { problem, left };
}

/** El paso entero. `apply`: false, simulacro (cuenta y ensaya, y no cambia ninguna cuenta de verdad); true, pasa las cuentas.
    `rules`: el texto de las reglas de Firestore publicadas ('' si no hay). Sin que las reglas acepten el dominio de ahora y sin
    que el ensayo vaya bien no se pasa ninguna: una cuenta pasada antes de tiempo se quedaría sin poder leer sus datos.
    Devuelve { ok, moved, rows: [[qué, resultado]], notes: [texto] } para escribirlo (tools/admin/dominio.mjs). */
export async function moveAccounts(auth, { apply, rules }) {
  const rows = [];
  const notes = [];
  const live = rulesAccept(rules);
  rows.push(['Reglas de Firestore publicadas', live ? 'Correcto: aceptan el dominio nuevo' : '**Falla**: aún no aceptan el dominio nuevo']);
  if (!live)
    notes.push('Las reglas de Firestore publicadas no son las de esta versión. Se despliegan solas al publicar (al fusionar en main): hasta entonces no se pasa ninguna cuenta.');
  const test = await rehearse(auth);
  rows.push(['Ensayo con una cuenta de prueba (se crea, se pasa y se borra)', test.problem ? '**Falla**: ' + test.problem : 'Correcto']);
  if (test.left)
    notes.push('La cuenta de prueba no se ha podido borrar. Bórrala en la consola de Firebase (Authentication → Usuarios): es la del identificador ' + test.left + '.');
  const before = sortAccounts(await allAccounts(auth));
  const total = before.done.length + before.move.length + before.clash.length + before.other.length;
  rows.push(['Cuentas', total]);
  rows.push(['Ya en el dominio nuevo', before.done.length]);
  const ready = live && !test.problem;
  let moved = 0;
  const failed = [];
  if (!apply)
    rows.push(['Por pasar', before.move.length]);
  else if (ready) {
    for (const u of before.move)
      try {
        await moveOne(auth, u);
        moved++;
      }
      catch (e) {
        failed.push(u.uid + ' (' + why(e) + ')');
      }
    rows.push(['Pasadas ahora', moved]);
    if (failed.length) {
      rows.push(['No se han podido pasar', failed.length]);
      notes.push('Cuentas que no se han podido pasar (identificador y motivo): ' + failed.join(', ') + '. Se puede volver a lanzar: las ya pasadas no se tocan.');
    }
  }
  else
    rows.push(['Pasadas ahora', '0: no se ha pasado ninguna (falla lo de arriba)']);
  if (before.clash.length) {
    rows.push(['Con el usuario ya ocupado en el dominio nuevo', before.clash.length]);
    notes.push('Hay ' + before.clash.length + ' del dominio anterior cuyo usuario ya lo tiene otra cuenta en el nuevo (alguien se registró con ese nombre antes de pasarlas): ' + before.clash.map(u => u.uid).join(', ') + '. No se pasan solas: en la consola de Firebase, borra la cuenta que sobre y vuelve a lanzar esto.');
  }
  if (before.other.length)
    rows.push(['Con otro correo (no entran en nada)', before.other.length]);
  let left = before.move.length + before.clash.length;
  if (apply && ready) {
    const after = sortAccounts(await allAccounts(auth));
    left = after.move.length + after.clash.length;
    rows.push(['Quedan en el dominio anterior', left]);
  }
  if (!apply && ready)
    notes.push(before.move.length ? 'Todo listo: al lanzarlo con «aplicar» se pasan ' + before.move.length + '. En cada móvil habrá que volver a entrar una vez, con el usuario y la contraseña de siempre.' : 'No queda ninguna cuenta por pasar.');
  if (apply && ready && !left)
    notes.push('Todas las cuentas están en el dominio nuevo. En cada móvil habrá que volver a entrar una vez, con el usuario y la contraseña de siempre; lo que haya en el móvil se conserva y se sube al entrar.');
  return { ok: ready && !test.left && (!apply || (!failed.length && !left)), moved, rows, notes };
}
