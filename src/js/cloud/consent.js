/* ═══ cloud/consent ═══
   Aceptación de las condiciones de uso y consentimiento para tratar los datos de salud (los dos, obligatorios para usar la
   app): qué versión de cada texto está vigente y la constancia de lo que la cuenta ha aceptado.
   La constancia es lo mínimo: de las condiciones (t), la versión aceptada y cuándo; del consentimiento (h), la versión, cuándo y
   su estado (st: 1 dado, 0 retirado; retirado, `at` es cuándo se retiró y `ga` cuándo se había dado). Va con la sesión en este
   dispositivo (account.cs: se sabe sin conexión) y en el perfil de la cuenta en la nube (users/{uid}.cs), que es la constancia
   que queda: la escribe syncConsent, en una escritura aparte, y la junta con la de otros dispositivos (vale lo último de cada
   una). Sin las dos al día, la app solo enseña la pantalla que las pide (account/login) y no sincroniza nada (cloud/sync).
   Los textos (data/legal) pueden cambiar de versión sin pedir otra aceptación: solo se pide de nuevo si la versión aceptada
   deja de estar entre las que valen (`valid`).
   Define: LEGAL, versionAfter, accepted, mark, consentOf, consentOk, consentGone, consentPending, consentGiven, consentWithdrawn, newer, sameConsent, syncConsent
*/
import { logError } from '../core/errors.js';
import { account, acctSave } from './session.js';
import { commitWrites, setWrite } from './firestore.js';
/** Los textos legales vigentes: su versión, su fecha de vigencia (AAAA-MM-DD) y las versiones cuya aceptación sigue valiendo.
    terms: Aviso legal y condiciones de uso; privacy: Política de privacidad; health: el consentimiento informado para tratar
    los datos de salud (la segunda casilla y su texto entero, data/legal: consent). */
export const LEGAL = {
  terms: { v: '1.0', date: '2026-11-25', valid: ['1.0'] },
  privacy: { v: '1.0', date: '2026-11-25' },
  health: { v: '1.0', date: '2026-11-25', valid: ['1.0'] }
};
/** ¿Va la versión `v` después de la `ref`? Por números: «1.10» va después de «1.9».
    @param {string} v
    @param {string} ref */
const versionAfter = (v, ref) => {
  const a = String(v).split('.').map(Number);
  const b = String(ref).split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d)
      return d > 0;
  }
  return false;
};
/* ¿vale haber aceptado la versión `v` de un texto? Sí, si es una de las que valen o es posterior a la de esta app: se aceptó
   en otro dispositivo con una app más nueva, y pedirlo aquí otra vez sería volver a aceptar el texto anterior (y, con la
   fecha más reciente, quitarle el sitio al nuevo en el perfil) */
const accepted = (v, text) => text.valid.includes(v) || versionAfter(v, text.v);
/* una marca de la constancia, con la forma que admiten las reglas de Firestore, o null si no la tiene */
const mark = m => m && typeof m == 'object' && typeof m.v == 'string' && m.v && m.v.length <= 12 && Number.isInteger(m.at) && m.at > 0 ? m : null;
/** La constancia `c` (la de la sesión o la del perfil de la nube), solo con lo que vale: { t, h } o null si no hay nada.
    @param {any} c
    @returns {Consent | null} */
export const consentOf = c => {
  const t = mark(c && c.t);
  const h = mark(c && c.h);
  /** @type {Consent} */
  const out = {};
  if (t)
    out.t = { v: t.v, at: t.at };
  if (h)
    out.h = h.st === 0 ? { v: h.v, at: h.at, st: 0, ...(Number.isInteger(h.ga) ? { ga: h.ga } : {}) } : { v: h.v, at: h.at, st: 1 };
  return t || h ? out : null;
};
/** ¿Tiene la cuenta `a` aceptadas las condiciones vigentes y dado el consentimiento vigente?
    @param {Account | null} [a] */
export const consentOk = (a = account) => {
  const c = consentOf(a && a.cs);
  return !!(c && c.t && accepted(c.t.v, LEGAL.terms) && c.h && c.h.st === 1 && accepted(c.h.v, LEGAL.health));
};
/** ¿Consta que la cuenta `a` ha retirado el consentimiento?
    @param {Account | null} [a] */
export const consentGone = (a = account) => {
  const c = consentOf(a && a.cs);
  return !!(c && c.h && c.h.st === 0);
};
/** Con sesión, ¿falta la aceptación o el consentimiento? Entonces la app no se abre: solo la pantalla que los pide. */
export const consentPending = () => !!account && !consentOk(account);
/** La constancia de aceptar ahora las condiciones y dar el consentimiento.
    @returns {Consent} */
export const consentGiven = () => {
  const at = Date.now();
  return { t: { v: LEGAL.terms.v, at }, h: { v: LEGAL.health.v, at, st: 1 } };
};
/** La constancia `c` con el consentimiento retirado ahora (la aceptación de las condiciones no cambia).
    @param {any} c
    @returns {Consent} */
export const consentWithdrawn = c => {
  const was = consentOf(c) || {};
  const h = was.h;
  return { ...was, h: { v: h ? h.v : LEGAL.health.v, at: Date.now(), st: 0, ...(h && h.st === 1 ? { ga: h.at } : h && h.ga ? { ga: h.ga } : {}) } };
};
/* de dos marcas de lo mismo, la más reciente */
const newer = (a, b) => !a ? b : !b ? a : b.at > a.at ? b : a;
const sameConsent = (a, b) => JSON.stringify(a || null) == JSON.stringify(b || null);
/** Junta la constancia de este dispositivo con la del perfil de la nube (`remote`: su campo cs, o nada): de las condiciones y
    del consentimiento vale lo último. Lo que resulta se guarda con la sesión y, si la nube no lo tiene, se escribe en el perfil
    (`path`), en una escritura aparte: si las reglas publicadas aún no lo admiten (una app publicada antes que ellas) o no hay
    red, se queda pendiente (account.csu) y se reintenta en la siguiente sincronización. Devuelve si, con todo, la cuenta
    tiene la aceptación y el consentimiento al día.
    @param {string} path la ruta del perfil de la cuenta
    @param {any} remote
    @param {boolean} [exists] si el perfil existe ya en la nube (si no, no hay dónde escribirla todavía) */
export const syncConsent = async (path, remote, exists = true) => {
  const a = /** @type {Account} */ (account);
  const here = consentOf(a.cs);
  const there = consentOf(remote);
  /** @type {Consent} */
  const both = {};
  const t = newer(here && here.t, there && there.t);
  const h = newer(here && here.h, there && there.h);
  if (t)
    both.t = t;
  if (h)
    both.h = h;
  const merged = t || h ? both : null;
  let unsent = merged && !sameConsent(merged, there) ? 1 : 0;
  if (unsent && exists)
    try {
      await commitWrites([setWrite(path, { cs: merged }, null, ['cs'])]);
      unsent = 0;
    }
    catch (e) {
      if (e.code != 'PERMISSION_DENIED' && e.code != 'NETWORK')
        logError('perfil: constancia de la aceptación', e);
    }
  if (account && account.uid == a.uid && (!sameConsent(merged, here) || (account.csu || 0) != unsent))
    acctSave({ ...account, cs: merged || undefined, csu: unsent || undefined });
  return consentOk();
};
