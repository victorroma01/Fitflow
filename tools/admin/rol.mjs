/* StrataFit · «Asignar rol» (GitHub Actions → Asignar rol → Run workflow).
     node tools/admin/rol.mjs <usuario> <admin|usuario>
   El rol va en el token de la sesión (custom claim role: 'admin'), así que la app no lo puede cambiar; las reglas de
   Firestore lo exigen para ver Administración. Tiene efecto la próxima vez que la persona abra la app. */
import { connect, fail, findUser } from './firebase.mjs';

const [user, role] = process.argv.slice(2);
if (!user || !['admin', 'usuario'].includes(role))
  fail('Uso: node tools/admin/rol.mjs <usuario> <admin|usuario>');
const { auth } = connect();
const rec = await findUser(auth, user);
await auth.setCustomUserClaims(rec.uid, role === 'admin' ? { role: 'admin' } : null);
console.log('«' + String(user).trim() + '» ahora es ' + (role === 'admin' ? 'administrador' : 'usuario') + '. Tiene efecto la próxima vez que abra la app.');
