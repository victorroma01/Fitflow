/* ═══ cloud/docs ═══
   Cómo se reparte S en documentos de Firestore, y cómo vuelve a S lo que llega de ellos. Lo usa cloud/sync, que decide cuándo
   subir y bajar; aquí no hay estado de la sincronización ni se habla con la red.
   Documentos de cada cuenta: el perfil (users/{uid}: usuario, sexo y preferencias, que el admin ve), data/core (el núcleo de S
   sin lo que es del dispositivo ni las preferencias), logs/{año}, hist/{año}, meals/{año-mes} y private/avatar (la foto, solo
   con consentimiento). Cada documento se nombra con un id corto: 'core', 'avatar', 'logs:2026', 'hist:2026', 'meals:2026-11'.
   Define: PREF_KEYS, LOCAL_ONLY, yearOf, monthOf, docPath, indexPath, profilePath, prefsLocal, coreOf, localDocs, okType, applyDoc, applyPrefs
*/
import { profileSex, S } from '../core/state.js';
import { logIds } from '../core/repair.js';
import { stateName, stateToStored } from '../core/schema.js';
import { account } from './session.js';
/** Preferencias de la cuenta (van en el perfil, users/{uid}): tema, color (y el propio), estilo Cristal, animaciones, unidades,
  sonido y vibración, la pestaña al abrir la app y si ya se vio el recorrido (system/tour). Las mismas que deja firestore.rules,
  con las claves guardadas (core/schema). */
export const PREF_KEYS = ['theme', 'acc', 'acx', 'gm', 'gl', 'gk', 'rm', 'un', 'snd', 'snt', 'vol', 'vib', 'awk', 'st0', 'tour'];
/** Claves guardadas de S que no van en data/core: lo que es de este dispositivo (pestaña, día elegido, rango de la gráfica, día del plan
  apartado durante un workout, fecha de la última copia en archivo, aviso descartado, globo del icono: system/phone), lo que va
  en su propio documento y las preferencias. */
const LOCAL_ONLY = new Set(['tab', 'sel', 'sl', 'rg', 'pbk', 'bkd', 'nbk', 'bdg', 'pf', 'logs', 'hist', 'meals', ...PREF_KEYS]);
const yearOf = d => typeof d == 'string' && /^\d{4}-/.test(d) ? d.slice(0, 4) : 'otros';
const monthOf = d => /^\d{4}-\d\d-\d\d$/.test(d) ? d.slice(0, 7) : 'otros';
/** Ruta en Firestore de cada documento: 'core', 'avatar', 'logs:2026', 'hist:2026', 'meals:2026-11'. */
export const docPath = id => {
  const [k, x] = id.split(':');
  const u = 'users/' + account.uid;
  return k == 'core' ? u + '/data/core' : k == 'avatar' ? u + '/private/avatar' : u + '/' + k + '/' + x;
};
export const indexPath = () => 'users/' + account.uid + '/data/index';
export const profilePath = () => 'users/' + account.uid;
/** Preferencias y sexo de este móvil, como van en el perfil. */
export const prefsLocal = () => {
  const o = {};
  for (const k of PREF_KEYS) {
    const v = S[stateName(k)];
    if (v !== undefined && v !== null)
      o[k] = v;
  }
  o.sx = profileSex();
  return o;
};
/** Lo que va en data/core: S con las claves guardadas, sin lo de LOCAL_ONLY. */
const coreOf = () => {
  const s = stateToStored(S);
  const o = {};
  for (const k of Object.keys(s))
    if (!LOCAL_ONLY.has(k) && s[k] !== undefined)
      o[k] = s[k];
  return o;
};
/** Contenido local de cada documento: { id: valor }. */
export const localDocs = () => {
  logIds();
  const out = { core: coreOf() };
  if (S.profile && +S.profile.pc > 0 && S.profile.img)
    out.avatar = { img: S.profile.img, pc: S.profile.pc };
  for (const l of S.logs || []) {
    const id = 'logs:' + yearOf(l.d);
    (out[id] = out[id] || []).push(l);
  }
  const hist = S.exerciseHistory || {};
  for (const ex of Object.keys(hist))
    for (const e of Array.isArray(hist[ex]) ? hist[ex] : []) {
      const id = 'hist:' + yearOf(e.d);
      const o = out[id] = out[id] || {};
      (o[ex] = o[ex] || []).push(e);
    }
  for (const d of Object.keys(S.meals || {})) {
    const id = 'meals:' + monthOf(d);
    (out[id] = out[id] || {})[d] = S.meals[d];
  }
  return out;
};
/** ¿Tiene el contenido que llega de la nube la forma de su tipo? (lo demás lo deja válido core/repair) */
export const okType = (id, v) => {
  const k = id.split(':')[0];
  const O = x => x && typeof x == 'object' && !Array.isArray(x);
  return k == 'logs' ? Array.isArray(v) && v.every(l => O(l) && typeof l.id == 'string') : k == 'hist' ? O(v) && Object.values(v).every(Array.isArray) : k == 'meals' ? O(v) && Object.values(v).every(O) : O(v);
};
/** Pone en S el resultado de la fusión de un documento. */
export const applyDoc = (id, v) => {
  const [k, x] = id.split(':');
  if (k == 'core') {
    for (const key of Object.keys(stateToStored(S)))
      if (!LOCAL_ONLY.has(key) && !(key in v))
        delete S[stateName(key)];
    for (const key of Object.keys(v))
      if (!LOCAL_ONLY.has(key))
        S[stateName(key)] = v[key];
  }
  else if (k == 'avatar') {
    if (typeof v.img == 'string' && v.img) {
      S.profile.img = v.img;
      S.profile.pc = +v.pc || Date.now();
    }
    else {
      delete S.profile.img;
      delete S.profile.pc;
    }
  }
  else if (k == 'logs')
    S.logs = S.logs.filter(l => yearOf(l.d) != x).concat(v).sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
  else if (k == 'hist') {
    S.exerciseHistory = S.exerciseHistory || {};
    for (const ex of Object.keys(S.exerciseHistory)) {
      S.exerciseHistory[ex] = S.exerciseHistory[ex].filter(e => yearOf(e.d) != x);
      if (!S.exerciseHistory[ex].length && !v[ex])
        delete S.exerciseHistory[ex];
    }
    for (const ex of Object.keys(v))
      S.exerciseHistory[ex] = (S.exerciseHistory[ex] || []).concat(v[ex]).sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : 0);
  }
  else if (k == 'meals') {
    S.meals = S.meals || {};
    for (const d of Object.keys(S.meals))
      if (monthOf(d) == x)
        delete S.meals[d];
    Object.assign(S.meals, v);
  }
};
/** Pone en S las preferencias y el sexo que llegan del perfil (lo que no venga, se quita). */
export const applyPrefs = p => {
  for (const k of PREF_KEYS)
    if (k in p)
      S[stateName(k)] = p[k];
    else
      delete S[stateName(k)];
  if (p.sx == 'M' || p.sx == 'F')
    S.biometrics.sex = p.sx;
};
