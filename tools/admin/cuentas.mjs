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
/** Los modos de «Pasar las cuentas al dominio nuevo»: el simulacro no cambia ninguna cuenta; «aplicar» las pasa solo si
    nadie lo va a notar (las sesiones abiertas se conservan); «aplicar-todo», aunque haya que volver a entrar. */
export const MODES = ['simulacro', 'aplicar', 'aplicar-todo'];

const localOf = email => String(email || '').toLowerCase().split('@')[0];
const domainOf = email => String(email || '').toLowerCase().split('@')[1] || '';
/* de un error, solo su código: el mensaje de Authentication puede repetir el correo */
const why = e => e && typeof e.code == 'string' && e.code ? e.code : e && e.name || 'error';
const seconds = t => Math.floor(Date.parse(t || '') / 1000) || 0;
/** Desde cuándo valen las sesiones de una cuenta (segundos): lo que dice Firebase (tokensValidAfterTime) o, si no lo dice,
    desde que se creó. */
const validSinceOf = u => seconds(u.tokensValidAfterTime) || seconds(u.metadata && u.metadata.creationTime);

/** Todas las cuentas del proyecto: [{ uid, email, validSince }]. */
export async function allAccounts(auth) {
  const out = [];
  let page;
  do {
    page = await auth.listUsers(1000, page && page.pageToken);
    out.push(...page.users.map(u => ({ uid: u.uid, email: String(u.email || '').toLowerCase(), validSince: validSinceOf(u) })));
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
    Al cambiar el correo, Firebase da por caducadas las sesiones abiertas: pone «válidas desde» (validSince) a ese momento. Con
    `keep`, ese dato vuelve a su valor de antes (va en la misma petición y, si Firebase no lo respeta ahí, en otra después), así
    que las sesiones que valían siguen valiendo y el móvil no nota nada; se comprueba leyendo la cuenta. Devuelve true si las
    sesiones se han conservado (o false: la cuenta está pasada, pero en sus móviles hay que volver a entrar). */
async function moveOne(auth, io, u, keep) {
  const email = localOf(u.email) + '@' + TECH_DOMAIN;
  if (!keep || !u.validSince) {
    await io.update(u.uid, { email });
    return false;
  }
  await io.update(u.uid, { email, validSince: String(u.validSince) });
  for (let i = 0; i < 2; i++) {
    if (validSinceOf(await auth.getUser(u.uid)) == u.validSince)
      return true;
    if (!i)
      await io.update(u.uid, { validSince: String(u.validSince) });
  }
  return false;
}

/** Ensayo con una cuenta de prueba, que se crea con el dominio anterior, entra como entraría un móvil, se pasa como las de
    verdad y se borra. Dice, sin tocar ninguna cuenta, si Authentication admite el dominio de ahora y si la sesión que tenía
    abierta sigue valiendo después (`sessions`: 'kept', 'lost' o, si no se ha podido mirar, 'unknown'; `reason`: por qué).
    Su nombre tiene más de 20 caracteres: no puede ser el de ningún usuario (la app no los admite tan largos) y las reglas de
    Firestore no la dejan entrar en nada. `problem`: '' si va bien o qué falla; `left`: su uid si no se ha podido borrar. */
export async function rehearse(auth, io) {
  const name = 'zz-prueba-del-dominio-' + randomBytes(4).toString('hex');
  const password = randomBytes(24).toString('base64url');
  const out = { problem: '', left: '', sessions: 'unknown', reason: '' };
  let uid = '';
  try {
    uid = (await auth.createUser({ email: name + '@' + OLD_TECH_DOMAIN, password })).uid;
    let token = '';
    try {
      token = (await io.signIn(name + '@' + OLD_TECH_DOMAIN, password)).refreshToken || '';
      if (!token)
        out.reason = 'sin sesión';
    }
    catch (e) {
      out.reason = why(e);
    }
    const u = { uid, email: name + '@' + OLD_TECH_DOMAIN, validSince: validSinceOf(await auth.getUser(uid)) };
    /* el cambio tiene que caer en un segundo posterior al de la entrada: si no, la sesión valdría de todos modos */
    if (token)
      await io.pause();
    const kept = await moveOne(auth, io, u, true);
    if ((await auth.getUserByEmail(name + '@' + TECH_DOMAIN)).uid !== uid)
      out.problem = 'la cuenta de prueba no aparece con el dominio de ahora';
    else if (!kept) {
      out.sessions = 'lost';
      out.reason = 'Firebase no deja devolver la validez de las sesiones';
    }
    else if (token)
      try {
        await io.refresh(token);
        out.sessions = 'kept';
      }
      catch (e) {
        out.sessions = 'lost';
        out.reason = why(e);
      }
  }
  catch (e) {
    out.problem = (uid ? 'Authentication no deja pasar una cuenta al dominio de ahora' : 'no se ha podido crear la cuenta de prueba') + ' (' + why(e) + ')';
  }
  if (uid)
    try {
      await auth.deleteUser(uid);
    }
    catch (e) {
      out.left = uid;
    }
  return out;
}

/** El paso entero. `mode`: 'simulacro' (ensaya y cuenta; no cambia ninguna cuenta de verdad), 'aplicar' (las pasa solo si el
    ensayo dice que las sesiones abiertas se conservan: nadie lo nota) o 'aplicar-todo' (las pasa aunque haya que volver a entrar
    en cada móvil). `rules`: el texto de las reglas de Firestore publicadas ('' si no hay). `io`: lo que no hace firebase-admin
    (tools/admin/firebase.mjs: authIo). Sin que las reglas acepten el dominio de ahora y sin que el ensayo vaya bien no se pasa
    ninguna: una cuenta pasada antes de tiempo se quedaría sin poder leer sus datos.
    Devuelve { ok, moved, rows: [[qué, resultado]], notes: [texto] } para escribirlo (tools/admin/dominio.mjs). */
export async function moveAccounts(auth, io, { mode, rules }) {
  const apply = mode != 'simulacro';
  const rows = [];
  const notes = [];
  const live = rulesAccept(rules);
  rows.push(['Reglas de Firestore publicadas', live ? 'Correcto: aceptan el dominio nuevo' : '**Falla**: aún no aceptan el dominio nuevo']);
  if (!live)
    notes.push('Las reglas de Firestore publicadas no son las de esta versión. Se despliegan solas al publicar (al fusionar en main): hasta entonces no se pasa ninguna cuenta.');
  const test = await rehearse(auth, io);
  rows.push(['Ensayo con una cuenta de prueba (se crea, entra, se pasa y se borra)', test.problem ? '**Falla**: ' + test.problem : 'Correcto']);
  if (test.left)
    notes.push('La cuenta de prueba no se ha podido borrar. Bórrala en la consola de Firebase (Authentication → Usuarios): es la del identificador ' + test.left + '.');
  const keep = test.sessions == 'kept';
  if (!test.problem)
    rows.push(['Las sesiones abiertas se conservan', keep ? 'Sí: en ningún móvil hay que volver a entrar'
      : test.sessions == 'lost' ? '**No** (' + test.reason + '): en cada móvil habría que volver a entrar una vez'
        : 'Sin comprobar (' + test.reason + '): puede que en cada móvil haya que volver a entrar una vez']);
  const before = sortAccounts(await allAccounts(auth));
  const total = before.done.length + before.move.length + before.clash.length + before.other.length;
  rows.push(['Cuentas', total]);
  rows.push(['Ya en el dominio nuevo', before.done.length]);
  const ready = live && !test.problem;
  const go = apply && ready && (keep || mode == 'aplicar-todo');
  /* por qué «aplicar» no las pasa, cuando no las pasa */
  const doubt = test.sessions == 'lost' ? 'las sesiones no se conservarían' : 'no se ha podido comprobar que las sesiones se conserven';
  let moved = 0;
  const failed = [];
  const closed = [];
  if (!apply)
    rows.push(['Por pasar', before.move.length]);
  else if (go) {
    for (const u of before.move)
      try {
        if (!await moveOne(auth, io, u, keep))
          closed.push(u.uid);
        moved++;
      }
      catch (e) {
        failed.push(u.uid + ' (' + why(e) + ')');
      }
    rows.push(['Pasadas ahora', moved]);
    if (keep && closed.length) {
      rows.push(['Pasadas, pero con la sesión cerrada', closed.length]);
      notes.push('En ' + closed.length + ' de las pasadas no se ha podido conservar la sesión (' + closed.join(', ') + '): en sus móviles hay que volver a entrar una vez, con la contraseña de siempre.');
    }
    if (failed.length) {
      rows.push(['No se han podido pasar', failed.length]);
      notes.push('Cuentas que no se han podido pasar (identificador y motivo): ' + failed.join(', ') + '. Se puede volver a lanzar: las ya pasadas no se tocan.');
    }
  }
  else
    rows.push(['Pasadas ahora', !ready ? '0: no se ha pasado ninguna (falla lo de arriba)' : '0: no se ha pasado ninguna (' + doubt + ')']);
  if (before.clash.length) {
    rows.push(['Con el usuario ya ocupado en el dominio nuevo', before.clash.length]);
    notes.push('Hay ' + before.clash.length + ' del dominio anterior cuyo usuario ya lo tiene otra cuenta en el nuevo (se registró con ese nombre antes de pasarlas): ' + before.clash.map(u => u.uid).join(', ') + '. No se pasan solas: en la consola de Firebase, borra la cuenta que sobre y vuelve a lanzar esto.');
  }
  if (before.other.length)
    rows.push(['Con otro correo (no entran en nada)', before.other.length]);
  let left = before.move.length + before.clash.length;
  if (go) {
    const after = sortAccounts(await allAccounts(auth));
    left = after.move.length + after.clash.length;
    rows.push(['Quedan en el dominio anterior', left]);
  }
  const quiet = 'Las sesiones abiertas se conservan: nadie tiene que volver a entrar ni nota nada.';
  const loud = 'en cada móvil habrá que volver a entrar una vez, con el usuario y la contraseña de siempre; lo que haya en el móvil se conserva y se sube al entrar. Un móvil con una versión anterior a la 1.0.32 tiene que actualizar antes.';
  if (!apply && ready)
    notes.push(!before.move.length ? 'No queda ninguna cuenta por pasar.'
      : keep ? 'Todo listo: con «aplicar» se pasan ' + before.move.length + '. ' + quiet
        : 'Con «aplicar» no se pasaría ninguna: ' + doubt + '. Con «aplicar-todo» se pasarían las ' + before.move.length + ', pero ' + loud);
  if (apply && ready && !go)
    notes.push('No se ha pasado ninguna cuenta: «aplicar» solo las pasa si nadie lo va a notar, y ' + doubt + '. Para pasarlas de todos modos está «aplicar-todo»; entonces, ' + loud);
  if (go && !left && !failed.length)
    notes.push('Todas las cuentas están en el dominio nuevo. ' + (!keep ? 'Ahora, ' + loud : closed.length ? '' : quiet));
  return { ok: ready && !test.left && (!apply || (go && !failed.length && !left)), moved, rows, notes };
}
