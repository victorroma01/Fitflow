/* StrataFit · «Pasar las cuentas al dominio nuevo» (GitHub Actions → Pasar las cuentas al dominio nuevo → Run workflow).
     node tools/admin/dominio.mjs <simulacro|aplicar>
   Cada cuenta tiene en Firebase un correo técnico, usuario@dominio, que nadie ve. Hasta la V1.0.31 el dominio era
   stratafit.app; desde la V1.0.32 es el del propio proyecto, stratafit-960ec.firebaseapp.com. Esto pasa las cuentas que
   quedan con el anterior: el mismo identificador, la misma contraseña, el mismo rol y los mismos datos; solo cambia el correo.
   · simulacro: comprueba que las reglas publicadas ya aceptan el dominio nuevo, hace un ensayo con una cuenta de prueba (la
     crea, la pasa y la borra) y cuenta cuántas pasaría. No cambia ninguna cuenta de verdad.
   · aplicar: lo mismo y, si todo va bien, las pasa. Firebase cierra entonces las sesiones abiertas: en cada móvil hay que
     volver a entrar una vez, con el usuario y la contraseña de siempre, y lo que haya en el móvil se conserva.
   Se puede lanzar las veces que haga falta: las cuentas ya pasadas no se tocan.
   El registro de GitHub es público: aquí no se escribe ningún usuario ni correo, solo recuentos (tools/admin/cuentas.mjs). */
import { appendFileSync } from 'node:fs';
import { moveAccounts } from './cuentas.mjs';
import { connect, fail, liveRules } from './firebase.mjs';

const mode = process.argv[2];
if (!['simulacro', 'aplicar'].includes(mode))
  fail('Uso: node tools/admin/dominio.mjs <simulacro|aplicar>');
const { app, auth } = connect();
let rules = '';
try {
  const live = await liveRules(app);
  rules = live ? live.source : '';
}
catch (e) {
  fail('No se han podido leer las reglas de Firestore publicadas (' + (e && (e.code || e.status) || 'error') + '): no se pasa ninguna cuenta sin saber que aceptan el dominio nuevo.');
}
const r = await moveAccounts(auth, { apply: mode == 'aplicar', rules });
const out = ['## Pasar las cuentas al dominio nuevo · ' + (mode == 'aplicar' ? 'aplicar' : 'simulacro (no cambia ninguna cuenta)'), '', '| Qué | Resultado |', '| --- | --- |',
  ...r.rows.map(x => '| ' + x[0] + ' | ' + x[1] + ' |'), '', ...r.notes.map(n => n + '\n')].join('\n');
console.log(out);
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, out + '\n');
if (!r.ok)
  fail(mode == 'aplicar' ? 'No se han pasado todas las cuentas: mira el resumen.' : 'El simulacro no ha ido bien: mira el resumen. No se ha cambiado ninguna cuenta.');
