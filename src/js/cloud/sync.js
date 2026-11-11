/* ═══ cloud/sync ═══
   Sincronización con Firebase (offline-first): el móvil manda y Firestore es la copia de referencia y el punto de encuentro
   entre dispositivos. Cada parte del estado que se guarda (core/persist) se avisa aquí (Store.remote) y, unos segundos
   después y si hay red, se sincroniza:
     1. el perfil (users/{uid}: usuario, sexo y preferencias, que el admin ve);
     2. el índice (users/{uid}/data/index: la versión de cada documento) dice qué ha cambiado en la nube desde la última vez;
        lo cambiado se baja y se junta con lo local (cloud/merge), sin esperas por medio: nada cambia S mientras tanto;
     3. lo que cambió en el móvil se sube en una sola escritura con el índice, con la condición de que el índice no haya
        cambiado entretanto; si cambió (otro dispositivo subió algo), se vuelve al paso 2.
   Documentos: data/core (el núcleo de S sin lo que es del dispositivo), logs/{año}, hist/{año}, meals/{año-mes} y
   private/avatar (la foto, solo con consentimiento). Cada uno guarda su contenido como texto JSON (`j`): Firestore no admite
   listas dentro de listas, y el historial las tiene.
   Lo de cada documento en la última sincronización se recuerda por huellas (clave `sync` de Store), no por copias: así se sabe
   qué cambió en cada lado sin duplicar los datos en el móvil.
   Define: PREF_KEYS, LOCAL_ONLY, newMeta, readMeta, meta, saveMeta, status, quiet, applying, lastPrefs, profileAt, timer, fails, tokenFresh, running, again, syncState, deadShown, setStatus, syncLine, yearOf, monthOf, docPath, indexPath, profilePath, prefsLocal, coreOf, localDocs, okType, applyDoc, afterApply, applyPrefs, syncProfile, syncDeviceOS, pull, push, syncRound, syncNow, syncSoon, retryLater, adapter, startSync, stopSync, firstSync, pendingDocs, wipeCloudData
*/
import { $, newId } from '../core/util.js';
import { deviceOS } from '../core/platform.js';
import { Store } from '../core/store.js';
import { logError } from '../core/errors.js';
import { partKey } from '../core/persist.js';
import { applyTheme, flushState, S, W } from '../core/state.js';
import { R } from '../core/render.js';
import { dialog } from '../core/ui.js';
import { logIds, repairState } from '../core/repair.js';
import { applyAccent } from '../profile/appearance.js';
import { account, acctSave, isAdmin } from './session.js';
import { netError } from './net.js';
import { idToken } from './auth.js';
import { batchGet, commitWrites, delWrite, getDoc, setWrite } from './firestore.js';
import { hashMap, hashOf, KINDS, merge3, sameHashes } from './merge.js';
import { afterSync } from './hooks.js';
/** Preferencias de la cuenta (van en el perfil, users/{uid}): tema, color (y el propio), estilo Cristal, animaciones, unidades,
  sonido y vibración, la pestaña al abrir la app y si ya se vio el recorrido (system/tour). Las mismas que deja firestore.rules. */
const PREF_KEYS = ['theme', 'acc', 'acx', 'gm', 'gl', 'gk', 'rm', 'un', 'snd', 'snt', 'vol', 'vib', 'awk', 'st0', 'tour'];
/** Claves de S que no van en data/core: lo que es de este dispositivo (pestaña, día elegido, rango de la gráfica, día del plan
  apartado durante un workout, fecha de la última copia en archivo, aviso descartado, globo del icono: system/phone), lo que va
  en su propio documento y las preferencias. */
const LOCAL_ONLY = new Set(['tab', 'sel', 'sl', 'rg', 'pbk', 'bkd', 'nbk', 'bdg', 'pf', 'logs', 'hist', 'meals', ...PREF_KEYS]);
const newMeta = fresh => ({ dev: newId(), base: {}, lt: {}, pt: 0, fresh: fresh ? 1 : 0, last: 0 });
/** { dev: id del dispositivo, base: { documento: { r: versión, h: huellas } }, lt: último cambio local de cada tipo (ms), pt: de
  las preferencias, fresh: 1 tras entrar (en un conflicto gana la nube), last: última sincronización completa (ms) } */
const readMeta = () => {
  try {
    const m = JSON.parse(Store.get(Store.K.sync));
    if (m && typeof m == 'object' && m.base && typeof m.base == 'object' && typeof m.dev == 'string')
      return Object.assign(newMeta(0), m, { lt: m.lt && typeof m.lt == 'object' ? m.lt : {} });
  }
  catch (e) {
    /* sin datos de sincronización: se empieza de cero */
  }
  return newMeta(0);
};
let meta = readMeta();
const saveMeta = () => {
  try {
    Store.set(Store.K.sync, JSON.stringify(meta));
  }
  catch (e) {
    logError('guardar el estado de la sincronización', e);
  }
};
/** st: idle, run, ok, off (sin conexión), err (code), wait (entreno en curso), dead (hay que volver a entrar). */
let status = { st: 'idle', t: 0, code: '' };
/* 1 mientras entra la cuenta (account/login): se sincroniza sin pintar la app */
let quiet = 0;
/* 1 mientras se aplica lo que llega de la nube: esos guardados no son cambios locales */
let applying = 0;
let lastPrefs = '';
/* cuándo se leyó el perfil por última vez: sin cambios en las preferencias, se vuelve a leer cada 10 minutos */
let profileAt = 0;
let timer = 0;
let fails = 0;
/* 1 tras renovar el token en esta apertura: así un rol nuevo (Asignar rol, en GitHub) vale al volver a abrir la app */
let tokenFresh = 0;
let running = null;
let again = false;
export const syncState = () => status;
/* 1 cuando ya se avisó en esta apertura de que la sesión caducó */
let deadShown = 0;
const setStatus = (st, code) => {
  status = { st, t: Date.now(), code: code || '' };
  if (quiet)
    return;
  if ($('#ajs'))
    R();
  if (st == 'dead' && !deadShown) {
    deadShown = 1;
    dialog('Tu sesión ha caducado', 'Vuelve a entrar para subir tus datos a la nube. Mientras, todo se sigue guardando en este móvil.', [['Más tarde', 'doNothing', ''], ['Entrar', 'reloginShow', 'pr']]);
  }
};
/** Estado de la sincronización en una línea (Ajustes y Diagnóstico). */
export const syncLine = () => {
  if (!account)
    return 'sin cuenta';
  if (account.x || status.st == 'dead')
    return 'la sesión ha caducado: vuelve a entrar';
  const t = meta.last ? new Date(meta.last).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  return { run: 'sincronizando…', off: 'sin conexión; se sube al volver la red', wait: 'al terminar el entreno', err: 'no se pudo (' + status.code + '); se reintenta sola' }[status.st] || (t ? 'al día · ' + t : 'pendiente');
};
const yearOf = d => typeof d == 'string' && /^\d{4}-/.test(d) ? d.slice(0, 4) : 'otros';
const monthOf = d => /^\d{4}-\d\d-\d\d$/.test(d) ? d.slice(0, 7) : 'otros';
/** Ruta en Firestore de cada documento: 'core', 'avatar', 'logs:2026', 'hist:2026', 'meals:2026-11'. */
const docPath = id => {
  const [k, x] = id.split(':');
  const u = 'users/' + account.uid;
  return k == 'core' ? u + '/data/core' : k == 'avatar' ? u + '/private/avatar' : u + '/' + k + '/' + x;
};
const indexPath = () => 'users/' + account.uid + '/data/index';
const profilePath = () => 'users/' + account.uid;
/** Preferencias y sexo de este móvil, como van en el perfil. */
const prefsLocal = () => {
  const o = {};
  for (const k of PREF_KEYS)
    if (S[k] !== undefined && S[k] !== null)
      o[k] = S[k];
  o.sx = S.bio && (S.bio.sex == 'M' || S.bio.sex == 'F') ? S.bio.sex : '';
  return o;
};
const coreOf = () => {
  const o = {};
  for (const k of Object.keys(S))
    if (!LOCAL_ONLY.has(k) && S[k] !== undefined)
      o[k] = S[k];
  return o;
};
/** Contenido local de cada documento: { id: valor }. */
const localDocs = () => {
  logIds();
  const out = { core: coreOf() };
  if (S.pf && +S.pf.pc > 0 && S.pf.img)
    out.avatar = { img: S.pf.img, pc: S.pf.pc };
  for (const l of S.logs || []) {
    const id = 'logs:' + yearOf(l.d);
    (out[id] = out[id] || []).push(l);
  }
  const hist = S.hist || {};
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
const okType = (id, v) => {
  const k = id.split(':')[0];
  const O = x => x && typeof x == 'object' && !Array.isArray(x);
  return k == 'logs' ? Array.isArray(v) && v.every(l => O(l) && typeof l.id == 'string') : k == 'hist' ? O(v) && Object.values(v).every(Array.isArray) : k == 'meals' ? O(v) && Object.values(v).every(O) : O(v);
};
/** Pone en S el resultado de la fusión de un documento. */
const applyDoc = (id, v) => {
  const [k, x] = id.split(':');
  if (k == 'core') {
    for (const key of Object.keys(S))
      if (!LOCAL_ONLY.has(key) && !(key in v))
        delete S[key];
    for (const key of Object.keys(v))
      if (!LOCAL_ONLY.has(key))
        S[key] = v[key];
  }
  else if (k == 'avatar') {
    if (typeof v.img == 'string' && v.img) {
      S.pf.img = v.img;
      S.pf.pc = +v.pc || Date.now();
    }
    else {
      delete S.pf.img;
      delete S.pf.pc;
    }
  }
  else if (k == 'logs')
    S.logs = S.logs.filter(l => yearOf(l.d) != x).concat(v).sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
  else if (k == 'hist') {
    S.hist = S.hist || {};
    for (const ex of Object.keys(S.hist)) {
      S.hist[ex] = S.hist[ex].filter(e => yearOf(e.d) != x);
      if (!S.hist[ex].length && !v[ex])
        delete S.hist[ex];
    }
    for (const ex of Object.keys(v))
      S.hist[ex] = (S.hist[ex] || []).concat(v[ex]).sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : 0);
  }
  else if (k == 'meals') {
    S.meals = S.meals || {};
    for (const d of Object.keys(S.meals))
      if (monthOf(d) == x)
        delete S.meals[d];
    Object.assign(S.meals, v);
  }
};
/* tras aplicar lo de la nube: estado válido, guardado (sin contarlo como cambio local), tema y color, y la app pintada */
const afterApply = () => {
  applying = 1;
  try {
    repairState();
    flushState();
    applyTheme();
    applyAccent();
  }
  finally {
    applying = 0;
  }
  lastPrefs = hashOf(prefsLocal());
  if (!quiet)
    try {
      R();
    }
    catch (e) {
      logError('pintar tras sincronizar', e);
    }
};
const applyPrefs = p => {
  for (const k of PREF_KEYS)
    if (k in p)
      S[k] = p[k];
    else
      delete S[k];
  if (p.sx == 'M' || p.sx == 'F')
    S.bio.sex = p.sx;
};
/* paso 1: el perfil. Si no existe (cuenta recién creada), se crea con el usuario; las preferencias se juntan como el núcleo */
const syncProfile = async () => {
  if (meta.base.profile && Date.now() - profileAt < 6e5 && sameHashes(hashMap(new Map(Object.entries(prefsLocal()))), meta.base.profile.h))
    return;
  const d = await getDoc(profilePath());
  const rd = d ? d.data : null;
  const remote = {};
  if (rd) {
    const pr = rd.pr && typeof rd.pr == 'object' ? rd.pr : {};
    for (const k of PREF_KEYS)
      if (pr[k] !== undefined && pr[k] !== null)
        remote[k] = pr[k];
    remote.sx = rd.sx == 'M' || rd.sx == 'F' ? rd.sx : '';
  }
  const L = new Map(Object.entries(prefsLocal()));
  const Rm = new Map(Object.entries(remote));
  const M = merge3(L, Rm, meta.base.profile ? meta.base.profile.h : null, KINDS.core.both, !meta.fresh && meta.pt > (rd ? +rd.m || 0 : 0));
  const merged = Object.fromEntries(M);
  const pr = {};
  for (const k of PREF_KEYS)
    if (k in merged)
      pr[k] = merged[k];
  if (!sameHashes(hashMap(M), hashMap(L))) {
    applyPrefs(merged);
    afterApply();
  }
  if (!rd)
    await commitWrites([setWrite(profilePath(), { u: account.u, sx: merged.sx || '', pr, ca: Date.now(), m: Date.now() }, { exists: false })]);
  else if (!sameHashes(hashMap(M), hashMap(Rm)))
    await commitWrites([setWrite(profilePath(), { sx: merged.sx || '', pr, m: Date.now() }, null, ['sx', 'pr', 'm'])]);
  meta.base.profile = { h: hashMap(M) };
  profileAt = Date.now();
  /* el usuario tal como se registró (con sus mayúsculas), aunque se entre escribiéndolo de otra forma */
  if (rd && typeof rd.u == 'string' && rd.u != account.u && rd.u.toLowerCase() == account.u.toLowerCase())
    acctSave({ ...account, u: rd.u });
  await syncDeviceOS(rd);
};
/* El sistema del último móvil que abrió la app (T-28), solo para contar en Administración cuántos usan iPhone y cuántos
   Android. Va en una escritura aparte: si las reglas aún no lo admiten (una app publicada antes que ellas), solo falla esto y
   se reintenta en la siguiente sincronización, sin parar el resto ni llenar el registro de errores. */
const syncDeviceOS = async (rd) => {
  const os = deviceOS();
  if (rd && rd.os === os)
    return;
  try {
    await commitWrites([setWrite(profilePath(), { os }, null, ['os'])]);
  }
  catch (e) {
    if (e.code != 'PERMISSION_DENIED')
      logError('perfil: sistema del móvil', e);
  }
};
/* paso 2: bajar y juntar lo que cambió en la nube. 'wait' si hay un entreno en curso (se deja para cuando acabe) */
const pull = async (idx) => {
  const rv = idx && idx.data.p && typeof idx.data.p == 'object' ? idx.data.p : {};
  const ids = [...new Set([...Object.keys(rv), ...Object.keys(meta.base).filter(k => k != 'profile')])];
  const changed = ids.filter(id => KINDS[id.split(':')[0]] && String(rv[id] || '') !== String((meta.base[id] || {}).r || ''));
  if (!changed.length)
    return true;
  if (W)
    return 'wait';
  const got = await batchGet(changed.filter(id => rv[id]).map(docPath));
  if (W)
    return 'wait';
  /* desde aquí, sin esperas: lo local no puede cambiar mientras se junta */
  const local = localDocs();
  let touched = 0;
  for (const id of changed) {
    const kind = KINDS[id.split(':')[0]];
    const d = rv[id] ? got[docPath(id)] : null;
    if (rv[id] && !d)
      continue;
    let val = {};
    if (d) {
      try {
        val = JSON.parse(d.data.j);
      }
      catch (e) {
        val = undefined;
      }
      if (val === undefined || !okType(id, val)) {
        logError('sincronizar: documento ilegible', new Error(id));
        continue;
      }
    }
    const Rm = kind.split(val);
    const L = kind.split(local[id]);
    const b = meta.base[id];
    const M = merge3(L, Rm, b ? b.h : null, kind.both, !meta.fresh && (meta.lt[id.split(':')[0]] || 0) > (d ? +d.data.m || 0 : 0));
    if (!sameHashes(hashMap(M), hashMap(L))) {
      applyDoc(id, kind.join(M));
      touched = 1;
    }
    if (d)
      meta.base[id] = { r: String(rv[id]), h: hashMap(Rm) };
    else
      delete meta.base[id];
  }
  if (touched)
    afterApply();
  saveMeta();
  return true;
};
/* paso 3: subir lo cambiado en el móvil, con el índice, todo o nada. false si el índice cambió entretanto */
const push = async (idx) => {
  const local = localDocs();
  const rv = { ...(idx && idx.data.p && typeof idx.data.p == 'object' ? idx.data.p : {}) };
  const ops = [];
  for (const id of new Set([...Object.keys(local), ...Object.keys(meta.base).filter(k => k != 'profile')])) {
    const kind = KINDS[id.split(':')[0]];
    if (!kind)
      continue;
    const m = kind.split(local[id]);
    const h = hashMap(m);
    const b = meta.base[id];
    if (b ? sameHashes(h, b.h) : !m.size)
      continue;
    if (!m.size) {
      ops.push({ id, size: 200 });
      continue;
    }
    const j = JSON.stringify(local[id]);
    /* un documento de Firestore admite 1 MB: uno más grande se queda en el móvil (no debería pasar: un año de entrenos ocupa
       unos 100 KB) */
    if (j.length > 9e5) {
      logError('sincronizar: documento demasiado grande', new Error(id + ' · ' + j.length));
      continue;
    }
    ops.push({ id, j, h, r: newId(), size: j.length });
  }
  if (!ops.length)
    return true;
  let pre = idx ? { updateTime: idx.ut } : { exists: false };
  let chunk = [];
  let size = 0;
  const send = async () => {
    const now = Date.now();
    for (const o of chunk)
      if (o.j)
        rv[o.id] = o.r;
      else
        delete rv[o.id];
    const writes = chunk.map(o => o.j ? setWrite(docPath(o.id), { j: o.j, m: now, r: o.r, v: 1, d: meta.dev }) : delWrite(docPath(o.id)));
    writes.push(setWrite(indexPath(), { p: rv, m: now, d: meta.dev }, pre));
    const res = await commitWrites(writes);
    pre = { updateTime: res[res.length - 1] };
    for (const o of chunk)
      if (o.j)
        meta.base[o.id] = { r: o.r, h: o.h };
      else
        delete meta.base[o.id];
    saveMeta();
    chunk = [];
    size = 0;
  };
  try {
    for (const o of ops) {
      if (chunk.length && (size + o.size > 3e6 || chunk.length >= 300))
        await send();
      chunk.push(o);
      size += o.size;
    }
    await send();
  }
  catch (e) {
    if (['FAILED_PRECONDITION', 'ALREADY_EXISTS', 'NOT_FOUND', 'ABORTED'].includes(e.code))
      return false;
    throw e;
  }
  return true;
};
const syncRound = async () => {
  if (!account)
    return;
  if (account.x) {
    setStatus('dead');
    return;
  }
  setStatus('run');
  try {
    if (!tokenFresh) {
      const was = isAdmin();
      await idToken(true);
      tokenFresh = 1;
      if (isAdmin() != was && !quiet)
        R();
    }
    await syncProfile();
    for (let i = 0; i < 4; i++) {
      const idx = await getDoc(indexPath());
      if (await pull(idx) == 'wait') {
        setStatus('wait');
        retryLater(6e4);
        return;
      }
      if (await push(idx)) {
        meta.last = Date.now();
        meta.fresh = 0;
        fails = 0;
        saveMeta();
        setStatus('ok');
        if (!quiet)
          afterSync.forEach(f => f());
        return;
      }
    }
    throw netError('CONFLICT');
  }
  catch (e) {
    saveMeta();
    if (e.code == 'SESSION') {
      setStatus('dead');
      return;
    }
    if (e.code == 'NO_SESSION')
      return;
    fails++;
    if (e.code != 'NETWORK')
      logError('sincronizar', e);
    setStatus(e.code == 'NETWORK' ? 'off' : 'err', e.code);
    retryLater(Math.min(6e5, 15e3 * 2 ** Math.min(fails, 6)));
  }
};
/** Sincroniza ya (si ya está en marcha, otra vuelta al terminar). Nunca lanza: el resultado queda en syncState(). */
export const syncNow = () => {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        await syncRound();
      } while (again);
    }
    finally {
      running = null;
    }
  })();
  return running;
};
const syncSoon = ms => {
  clearTimeout(timer);
  timer = setTimeout(syncNow, ms);
};
const retryLater = ms => syncSoon(ms);
/* aviso de Store (core/store) por cada clave que se escribe: solo cuentan las partes del estado */
const adapter = {
  changed(k) {
    if (applying || !account || account.x)
      return;
    const kind = k == Store.K.app ? 'core' : k == partKey('logs') ? 'logs' : k == partKey('hist') ? 'hist' : k.startsWith(partKey('meals:')) ? 'meals' : '';
    if (!kind)
      return;
    const now = Date.now();
    meta.lt[kind] = now;
    if (kind == 'core') {
      meta.lt.avatar = now;
      const h = hashOf(prefsLocal());
      if (h !== lastPrefs) {
        lastPrefs = h;
        meta.pt = now;
      }
    }
    syncSoon(4e3);
  }
};
/** Arranque con sesión (core/boot): escucha los cambios y la red, y sincroniza enseguida. */
export const startSync = () => {
  lastPrefs = hashOf(prefsLocal());
  Store.remote = adapter;
  window.addEventListener('online', () => syncSoon(800));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState == 'visible' && Date.now() - (meta.last || 0) > 6e4) {
      profileAt = 0;
      syncSoon(600);
    }
  });
  syncSoon(1500);
};
/** Deja de sincronizar (al cerrar sesión). */
export const stopSync = () => {
  Store.remote = null;
  clearTimeout(timer);
};
/** Primera sincronización tras entrar (account/login), con los datos del móvil ya borrados: baja todo lo de la cuenta (o,
  si es nueva, crea su perfil y sube el estado inicial) sin pintar la app. true si terminó bien. */
export const firstSync = async () => {
  meta = newMeta(1);
  saveMeta();
  quiet = 1;
  try {
    await syncNow();
  }
  finally {
    quiet = 0;
  }
  return status.st == 'ok';
};
/** Documentos con cambios del móvil aún sin subir. */
export const pendingDocs = () => {
  const local = localDocs();
  let n = 0;
  for (const id of new Set([...Object.keys(local), ...Object.keys(meta.base).filter(k => k != 'profile')])) {
    const kind = KINDS[id.split(':')[0]];
    if (!kind)
      continue;
    const m = kind.split(local[id]);
    const b = meta.base[id];
    if (b ? !sameHashes(hashMap(m), b.h) : m.size)
      n++;
  }
  return n;
};
/** Borra de la nube todos los datos de la cuenta (no la cuenta ni su perfil): «Borrar todos los datos» en Ajustes. */
export const wipeCloudData = async () => {
  const idx = await getDoc(indexPath());
  const ids = Object.keys(idx && idx.data.p && typeof idx.data.p == 'object' ? idx.data.p : {}).filter(id => KINDS[id.split(':')[0]] && id != 'avatar');
  const writes = ids.map(id => delWrite(docPath(id))).concat([delWrite(docPath('avatar')), delWrite(indexPath())]);
  for (let i = 0; i < writes.length; i += 400)
    await commitWrites(writes.slice(i, i + 400));
  meta = newMeta(0);
  saveMeta();
};
