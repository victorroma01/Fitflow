/* StrataFit · «Restablecer contraseña» (GitHub Actions → Restablecer contraseña → Run workflow).
     node tools/admin/contrasena.mjs <usuario>
   Pone a la cuenta una contraseña temporal, cierra sus sesiones abiertas y marca en su perfil que debe cambiarla al entrar
   (users/{uid}.mc). La contraseña solo se guarda en adminInbox, que solo lee el admin (Perfil → Administración), durante
   24 horas: no sale en el registro de GitHub, que es público. Borra también las que ya caducaron. */
import { randomInt } from 'node:crypto';
import { connect, fail, findUser } from './firebase.mjs';

const user = process.argv[2];
if (!user)
  fail('Uso: node tools/admin/contrasena.mjs <usuario>');
const { auth, db } = connect();
const rec = await findUser(auth, user);
/* 12 caracteres sin los que se confunden (0/O, 1/l/I): unos 70 bits */
const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const temp = Array.from({ length: 12 }, () => ABC[randomInt(ABC.length)]).join('');
await auth.updateUser(rec.uid, { password: temp });
await auth.revokeRefreshTokens(rec.uid);
const now = Date.now();
const prof = db.doc('users/' + rec.uid);
const snap = await prof.get();
const name = snap.exists && typeof snap.get('u') === 'string' ? snap.get('u') : String(user).trim();
await prof.set(snap.exists ? { mc: true, m: now } : { u: name, ca: now, m: now, mc: true }, { merge: true });
await db.collection('adminInbox').add({ u: name, p: temp, t: now, exp: now + 24 * 3600e3 });
const old = await db.collection('adminInbox').where('exp', '<', now).get();
await Promise.all(old.docs.map(d => d.ref.delete()));
console.log('Contraseña temporal creada para «' + name + '». La ves en la app, en Perfil → Administración, durante 24 horas.');
console.log('Al entrar con ella, tendrá que elegir una nueva. Sus sesiones abiertas se han cerrado.');
if (old.size)
  console.log('Borradas ' + old.size + ' contraseñas temporales caducadas.');
