/* StrataFit · «Limpieza de cuentas» (GitHub Actions → Limpieza de cuentas; sola, una vez al mes).
     node tools/admin/limpieza.mjs <simulacro|aplicar>
   Hace lo que la Política de privacidad de la app dice que se hace solo (tools/admin/inactivas.mjs tiene las reglas y las
   cautelas):
   · elimina, con todos sus datos, las cuentas que llevan dos años sin actividad (nunca las de administrador);
   · borra los datos que quedan en Firestore de cuentas que ya no existen (eliminadas desde la app o desde la consola);
   · borra las contraseñas temporales caducadas.
   «simulacro» solo cuenta lo que se borraría. «aplicar» lo borra; es lo que hace la pasada mensual. Si sale algo fuera de lo
   normal (demasiadas cuentas, ninguna cuenta en Authentication) no borra nada y falla, para mirarlo a mano.
   El registro de GitHub es público: aquí no se escribe ningún usuario ni correo, solo recuentos y, si algo no se pudo borrar,
   su identificador de Firebase.
   Con el emulador de Firebase (las pruebas de la CI), LIMPIEZA_AHORA (ms) hace la pasada como si fuera ese momento: así se
   prueba que una cuenta sin actividad se elimina, sin esperar dos años. */
import { appendFileSync } from 'node:fs';
import { MODES, sweep } from './inactivas.mjs';
import { connect, EMULATOR, fail } from './firebase.mjs';

const mode = process.argv[2];
if (!MODES.includes(mode))
  fail('Uso: node tools/admin/limpieza.mjs <' + MODES.join('|') + '>');
const { auth, db } = connect();
const now = EMULATOR && +process.env.LIMPIEZA_AHORA > 0 ? +process.env.LIMPIEZA_AHORA : Date.now();
const ms = t => Date.parse(t || '') || 0;
/* los avisos de una cuenta (reports: su campo uid) */
const reportsOf = uid => db.collection('reports').where('uid', '==', uid).get();
/* borra documentos de 400 en 400 */
const drop = async (docs) => {
  for (let i = 0; i < docs.length; i += 400) {
    const b = db.batch();
    docs.slice(i, i + 400).forEach(d => b.delete(d.ref));
    await b.commit();
  }
};
const io = {
  async accounts() {
    const out = [];
    let page;
    do {
      page = await auth.listUsers(1000, page && page.pageToken);
      out.push(...page.users.map(u => ({
        uid: u.uid,
        created: ms(u.metadata && u.metadata.creationTime),
        lastSignIn: ms(u.metadata && u.metadata.lastSignInTime),
        lastRefresh: ms(u.metadata && u.metadata.lastRefreshTime),
        admin: !!(u.customClaims && u.customClaims.role === 'admin')
      })));
    } while (page.pageToken);
    return out;
  },
  async exists(uid) {
    try {
      await auth.getUser(uid);
      return true;
    }
    catch (e) {
      if (e && e.code === 'auth/user-not-found')
        return false;
      throw e;
    }
  },
  /* el perfil y el índice se escriben en cada sincronización: su fecha es la de Firestore, no la del móvil */
  async lastWrite(uid) {
    const snaps = await db.getAll(db.doc('users/' + uid), db.doc('users/' + uid + '/data/index'));
    return Math.max(0, ...snaps.filter(s => s.exists && s.updateTime).map(s => s.updateTime.toMillis()));
  },
  /* (listDocuments da también los perfiles que ya no existen pero aún tienen documentos colgando) */
  async dataOwners() {
    const profiles = await db.collection('users').listDocuments();
    const reports = await db.collection('reports').select('uid').get();
    return profiles.map(d => d.id).concat(reports.docs.map(d => d.get('uid')).filter(u => typeof u == 'string' && u));
  },
  async deleteData(uid) {
    await db.recursiveDelete(db.doc('users/' + uid));
    await drop((await reportsOf(uid)).docs);
  },
  deleteAccount: uid => auth.deleteUser(uid),
  async inbox(at, apply) {
    const old = await db.collection('adminInbox').where('exp', '<', at).get();
    if (apply)
      await drop(old.docs);
    return old.size;
  }
};
const r = await sweep(io, { mode, now });
const out = ['## Limpieza de cuentas · ' + (mode == 'simulacro' ? 'simulacro (no borra nada)' : mode), '', '| Qué | Resultado |', '| --- | --- |',
  ...r.rows.map(x => '| ' + x[0] + ' | ' + x[1] + ' |'), '', ...r.notes.map(n => n + '\n')].join('\n');
console.log(out);
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, out + '\n');
if (!r.ok)
  fail(mode == 'simulacro' ? 'El simulacro avisa de algo: mira el resumen. No se ha borrado nada.' : 'La limpieza no ha terminado bien: mira el resumen.');
