/* StrataFit · «Pasar las cuentas al dominio nuevo» (GitHub Actions → Pasar las cuentas al dominio nuevo → Run workflow).
     node tools/admin/dominio.mjs <simulacro|aplicar|aplicar-todo>
   Cada cuenta tiene en Firebase un correo técnico, usuario@dominio, que nadie ve. Hasta la V1.0.31 el dominio era
   stratafit.app; desde la V1.0.32 es el del propio proyecto, stratafit-960ec.firebaseapp.com. Esto pasa las cuentas que
   quedan con el anterior: el mismo identificador, la misma contraseña, el mismo rol y los mismos datos; solo cambia el correo.
   Firebase da por caducadas las sesiones de una cuenta cuando cambia su correo. Para que nadie lo note, al pasar cada cuenta
   se le devuelve la validez que tenían sus sesiones (tools/admin/cuentas.mjs: moveOne), y antes de tocar ninguna se ensaya con
   una cuenta de prueba, que se crea, entra como un móvil, se pasa y se borra: así se sabe si su sesión sigue valiendo.
   · simulacro: comprueba que las reglas publicadas ya aceptan el dominio nuevo, hace el ensayo y cuenta cuántas pasaría. No
     cambia ninguna cuenta de verdad. Dice si las sesiones abiertas se conservan.
   · aplicar: lo mismo y, solo si las sesiones se conservan (nadie tiene que volver a entrar), las pasa.
   · aplicar-todo: las pasa aunque no se conserven: en cada móvil hay que volver a entrar una vez, con el usuario y la
     contraseña de siempre, y lo que haya en el móvil se conserva.
   Se puede lanzar las veces que haga falta: las cuentas ya pasadas no se tocan.
   El registro de GitHub es público: aquí no se escribe ningún usuario ni correo, solo recuentos (tools/admin/cuentas.mjs). */
import { appendFileSync } from 'node:fs';
import { MODES, moveAccounts } from './cuentas.mjs';
import { authIo, connect, fail, liveRules } from './firebase.mjs';

const mode = process.argv[2];
if (!MODES.includes(mode))
  fail('Uso: node tools/admin/dominio.mjs <' + MODES.join('|') + '>');
const { app, auth } = connect();
let rules = '';
try {
  const live = await liveRules(app);
  rules = live ? live.source : '';
}
catch (e) {
  fail('No se han podido leer las reglas de Firestore publicadas (' + (e && (e.code || e.status) || 'error') + '): no se pasa ninguna cuenta sin saber que aceptan el dominio nuevo.');
}
const r = await moveAccounts(auth, await authIo(app), { mode, rules });
const out = ['## Pasar las cuentas al dominio nuevo · ' + (mode == 'simulacro' ? 'simulacro (no cambia ninguna cuenta)' : mode), '', '| Qué | Resultado |', '| --- | --- |',
  ...r.rows.map(x => '| ' + x[0] + ' | ' + x[1] + ' |'), '', ...r.notes.map(n => n + '\n')].join('\n');
console.log(out);
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, out + '\n');
if (!r.ok)
  fail(mode == 'simulacro' ? 'El simulacro no ha ido bien: mira el resumen. No se ha cambiado ninguna cuenta.' : 'No se han pasado todas las cuentas: mira el resumen.');
