/* StrataFit · «Desplegar reglas» (GitHub Actions: al fusionar en main un cambio de las reglas, o a mano desde main).
     node tools/admin/reglas.mjs
   Publica firestore.rules con la API de reglas de Firebase (firebase-admin) y deja sin índices los campos de texto grandes
   (fieldOverrides de firestore.indexes.json) con la API de administración de Firestore. Sin firebase-tools: antes de
   desplegar, comprueba qué APIs tiene activas el proyecto, y la cuenta de servicio no tiene permiso para eso (403 de
   serviceusage). Las reglas son imprescindibles: si fallan, el flujo falla. Los índices, no: sin esas exenciones todo funciona
   igual (Firestore solo indexa el principio de un texto largo), así que un fallo ahí se avisa sin parar el flujo. */
import { readFileSync } from 'node:fs';
import { getSecurityRules } from 'firebase-admin/security-rules';
import { connect, fail, PROJECT } from './firebase.mjs';

const read = f => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const { app } = connect();

let rs;
try {
  rs = await getSecurityRules(app).releaseFirestoreRulesetFromSource(read('firestore.rules'));
}
catch (e) {
  fail('No se han podido desplegar las reglas de Firestore: ' + (e && e.code ? e.code + ': ' : '') + (e && e.message || String(e)));
}
console.log('Reglas de Firestore desplegadas (' + rs.name.split('/').pop() + ', ' + rs.createTime + ').');

const token = (await app.options.credential.getAccessToken()).access_token;
const { fieldOverrides = [] } = JSON.parse(read('firestore.indexes.json'));
for (const f of fieldOverrides) {
  const what = f.collectionGroup + '.' + f.fieldPath;
  const url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/collectionGroups/' +
    encodeURIComponent(f.collectionGroup) + '/fields/' + encodeURIComponent(f.fieldPath) + '?updateMask=indexConfig';
  try {
    const r = await fetch(url, { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ indexConfig: { indexes: f.indexes || [] } }) });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(r.status + (j.error && j.error.message ? ': ' + j.error.message : ''));
    }
    console.log('Índices de ' + what + ': ' + ((f.indexes || []).length ? 'los de firestore.indexes.json' : 'ninguno') + '.');
  }
  catch (e) {
    console.log((process.env.GITHUB_ACTIONS ? '::warning::' : 'AVISO: ') + 'No se han podido cambiar los índices de ' + what + ' (' + (e && e.message || e) + '). Sin ese cambio todo funciona igual.');
  }
}
