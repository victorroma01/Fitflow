/* StrataFit · la limpieza periódica de cuentas: qué se borra y con qué cautelas.
   Aquí va lo que no necesita firebase-admin: lo usa tools/admin/limpieza.mjs, que le pasa con qué leer y borrar (`io`), y se
   prueba suelto (tests/limpieza.test.mjs) con un Firebase de mentira. Tres cosas, que son las que promete la Política de
   privacidad de la app (data/legal, apartado 15):
   · Cuentas sin actividad: las que llevan dos años sin entrar ni renovar su sesión (lo que hace la app cada vez que se abre
     con conexión) se eliminan con todos sus datos. Nunca la de un administrador, ni una de la que no se sepa ninguna fecha, ni
     una que tenga datos escritos después (aunque Authentication diga que no ha entrado: gana la duda).
   · Restos: datos y avisos que quedan en Firestore de una cuenta que ya no existe (se eliminó desde la app con otro
     dispositivo aún abierto, o desde la consola). Antes de borrar los de una, se pregunta otra vez por ella, una a una.
   · Contraseñas temporales caducadas (adminInbox), que solo se borraban al crear la siguiente.
   Cautelas: en «simulacro» solo cuenta; si Authentication no devuelve ninguna cuenta no se borra nada; y si salen más
   cuentas o más restos de los que caben en una pasada normal (MAX_ACCOUNTS, MAX_LEFTOVERS), no se borra ninguno y falla, para
   mirarlo a mano: eso es un error antes que una limpieza.
   Nada de lo que devuelve lleva usuarios: el registro de GitHub Actions es público. Si hay que señalar una cuenta, va su
   identificador de Firebase (uid), que solo dice algo dentro de la consola del proyecto. */

/** Los modos: el simulacro no borra nada; «aplicar» borra. */
export const MODES = ['simulacro', 'aplicar'];
/** Años sin actividad tras los que una cuenta se elimina. */
export const INACTIVE_YEARS = 2;
/** Lo más que se elimina en una pasada: con más, no se toca nada y se avisa. */
export const MAX_ACCOUNTS = 25;
export const MAX_LEFTOVERS = 50;

/* de un error, solo su código: el mensaje de Firebase puede repetir datos de la cuenta */
const why = e => e && typeof e.code == 'string' && e.code ? e.code : e && e.name || 'error';
/** El momento (ms) `years` años antes de `now`, por el calendario. */
export const yearsBefore = (now, years) => {
  const d = new Date(now);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.getTime();
};
/** Lo último que se sabe de una cuenta (ms): cuándo se creó, cuándo entró por última vez y cuándo renovó su sesión por última
    vez. 0 si no se sabe nada. */
export const lastSeen = a => Math.max(+a.created || 0, +a.lastSignIn || 0, +a.lastRefresh || 0);

/** La limpieza entera. `io`, lo que lee y borra (tools/admin/limpieza.mjs o, en las pruebas, uno de mentira):
      accounts()         → [{ uid, created, lastSignIn, lastRefresh, admin }] (fechas en ms; 0 si no hay)
      exists(uid)        → ¿existe esa cuenta ahora mismo?
      lastWrite(uid)     → cuándo se escribió por última vez algo de esa cuenta en Firestore (ms; 0 si no tiene nada)
      dataOwners()       → uids con datos en Firestore (users/…) o con avisos (reports)
      deleteData(uid)    → borra todo lo de esa cuenta en Firestore (sus documentos y sus avisos)
      deleteAccount(uid) → elimina la cuenta de Authentication
      inbox(now, apply)  → cuántas contraseñas temporales han caducado; con `apply`, además las borra
    `mode`: 'simulacro' o 'aplicar'. `now`: el momento de la pasada (ms). `max`: los topes, { accounts, leftovers }.
    Devuelve { ok, rows: [[qué, resultado]], notes: [texto], gone: { accounts, leftovers, inbox } } para escribirlo. */
export async function sweep(io, { mode, now = Date.now(), max = {} }) {
  const apply = mode == 'aplicar';
  const maxAccounts = max.accounts ?? MAX_ACCOUNTS;
  const maxLeftovers = max.leftovers ?? MAX_LEFTOVERS;
  const rows = [];
  const notes = [];
  const gone = { accounts: 0, leftovers: 0, inbox: 0 };
  const failed = [];
  let ok = true;
  const cutoff = yearsBefore(now, INACTIVE_YEARS);
  const accounts = await io.accounts();
  rows.push(['Cuentas', accounts.length]);

  /* ── cuentas sin actividad ── */
  const idle = [];
  let admins = 0;
  let undated = 0;
  let writing = 0;
  for (const a of accounts) {
    const seen = lastSeen(a);
    if (a.admin)
      admins += seen && seen < cutoff ? 1 : 0;
    else if (!seen)
      undated++;
    else if (seen < cutoff) {
      if (await io.lastWrite(a.uid) >= cutoff)
        writing++;
      else
        idle.push(a.uid);
    }
  }
  rows.push(['Sin actividad desde hace ' + INACTIVE_YEARS + ' años', idle.length]);
  if (admins)
    rows.push(['De administrador sin actividad (no se eliminan)', admins]);
  if (undated) {
    rows.push(['Sin ninguna fecha conocida (no se eliminan)', undated]);
    notes.push('De ' + undated + ' cuentas Authentication no da ni cuándo se crearon: no se tocan. Míralas en la consola de Firebase.');
  }
  if (writing)
    rows.push(['Sin entrar en ' + INACTIVE_YEARS + ' años pero con datos escritos después (no se eliminan)', writing]);
  const tooMany = idle.length > maxAccounts;
  if (tooMany) {
    ok = false;
    notes.push('Salen ' + idle.length + ' cuentas sin actividad, más de las ' + maxAccounts + ' que se eliminan en una pasada: no se ha eliminado ninguna. Si es lo esperado, hay que subir el tope a propósito (tools/admin/inactivas.mjs); si no, algo falla al leer las fechas.');
  }
  else if (apply) {
    for (const uid of idle)
      try {
        await io.deleteData(uid);
        await io.deleteAccount(uid);
        gone.accounts++;
      }
      catch (e) {
        failed.push(uid + ' (' + why(e) + ')');
      }
    rows.push(['Cuentas eliminadas ahora', gone.accounts]);
  }

  /* ── restos: datos de cuentas que ya no existen ── */
  const known = new Set(accounts.map(a => a.uid));
  const owners = [...new Set(await io.dataOwners())];
  const orphans = owners.filter(uid => !known.has(uid));
  if (!accounts.length && owners.length) {
    ok = false;
    rows.push(['Datos de cuentas que ya no existen', 'sin mirar']);
    notes.push('Authentication no devuelve ninguna cuenta y en Firestore hay datos de ' + owners.length + ': no se borra nada. Eso es un fallo al leer las cuentas, no una limpieza.');
  }
  else {
    rows.push(['Datos de cuentas que ya no existen', orphans.length]);
    if (orphans.length > maxLeftovers) {
      ok = false;
      notes.push('Hay datos de ' + orphans.length + ' cuentas que ya no existen, más de los ' + maxLeftovers + ' que se borran en una pasada: no se ha borrado ninguno. Míralo antes en la consola de Firebase.');
    }
    else {
      /* una a una, por si la cuenta se acaba de crear (o la lista de antes vino incompleta) */
      const real = [];
      let alive = 0;
      for (const uid of orphans)
        try {
          if (await io.exists(uid))
            alive++;
          else
            real.push(uid);
        }
        catch (e) {
          failed.push(uid + ' (' + why(e) + ')');
        }
      if (alive)
        rows.push(['De ellos, de cuentas que sí existen (no se tocan)', alive]);
      orphans.length = 0;
      orphans.push(...real);
      if (apply) {
        for (const uid of real)
          try {
            await io.deleteData(uid);
            gone.leftovers++;
          }
          catch (e) {
            failed.push(uid + ' (' + why(e) + ')');
          }
        rows.push(['Restos borrados ahora', gone.leftovers]);
      }
    }
  }

  /* ── contraseñas temporales caducadas ── */
  try {
    gone.inbox = await io.inbox(now, apply);
    rows.push([apply ? 'Contraseñas temporales caducadas, borradas' : 'Contraseñas temporales caducadas', gone.inbox]);
  }
  catch (e) {
    failed.push('contraseñas temporales (' + why(e) + ')');
  }

  if (failed.length) {
    ok = false;
    rows.push(['No se han podido borrar', failed.length]);
    notes.push('No se han podido borrar (identificador y motivo): ' + failed.join(', ') + '. Se puede volver a lanzar: lo ya borrado no estorba.');
  }
  if (!apply && ok)
    notes.push(idle.length || orphans.length || gone.inbox ? 'Con «aplicar» se eliminarían ' + idle.length + ' cuentas sin actividad, los restos de ' + orphans.length + ' y ' + gone.inbox + ' contraseñas temporales caducadas.' : 'No hay nada que limpiar.');
  return { ok, rows, notes, gone };
}
