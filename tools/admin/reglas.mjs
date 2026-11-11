/* StrataFit · «Desplegar reglas» (GitHub Actions: al fusionar en main un cambio de las reglas, o a mano desde main).
     node tools/admin/reglas.mjs
   Publica firestore.rules con la API de reglas de Firebase (firebase-admin). Sin firebase-tools: antes de desplegar, comprueba
   qué APIs tiene activas el proyecto, y la cuenta de servicio no tiene permiso para eso (403 de serviceusage). Si las reglas no
   se pueden desplegar, el flujo falla.
   Los índices de Firestore no se tocan: son los de serie. Hasta la V1.0.0 se intentaba quitar los de los campos de texto
   grandes, pero la cuenta de servicio no tiene ese permiso y la app funciona igual con ellos (I-16). */
import { readFileSync } from 'node:fs';
import { getSecurityRules } from 'firebase-admin/security-rules';
import { connect, fail } from './firebase.mjs';

const { app } = connect();
let rs;
try {
  rs = await getSecurityRules(app).releaseFirestoreRulesetFromSource(readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'));
}
catch (e) {
  fail('No se han podido desplegar las reglas de Firestore: ' + (e && e.code ? e.code + ': ' : '') + (e && e.message || String(e)));
}
console.log('Reglas de Firestore desplegadas (' + rs.name.split('/').pop() + ', ' + rs.createTime + ').');
