/* ═══ cloud/sync ═══
   Sincronización con Firebase (offline-first): el móvil manda y Firestore es la copia de referencia y el punto de encuentro
   entre dispositivos. Cada parte del estado que se guarda (core/persist) se avisa aquí (Store.remote) y, como mucho 30 s
   después del primer cambio sin subir (lo cambiado entretanto va en la misma subida: menos escrituras de Firestore), al pasar
   la app a segundo plano y si hay red, se sincroniza:
     1. el perfil (users/{uid}: usuario, sexo y preferencias, que el admin ve), y con él la constancia de la aceptación de las
        condiciones y del consentimiento (cloud/consent);
     2. el índice (users/{uid}/data/index: la versión de cada documento) dice qué ha cambiado en la nube desde la última vez;
        lo cambiado se baja y se junta con lo local (cloud/merge), sin esperas por medio: nada cambia S mientras tanto;
     3. lo que cambió en el móvil se sube en una sola escritura con el índice, con la condición de que el índice no haya
        cambiado entretanto; si cambió (otro dispositivo subió algo), se vuelve al paso 2.
   Qué va en cada documento (data/core, logs/{año}, hist/{año}, meals/{año-mes} y private/avatar) y cómo vuelve a S lo dice
   cloud/docs. Cada uno guarda su contenido como texto JSON (`j`): Firestore no admite listas dentro de listas, y el historial
   las tiene.
   Lo de cada documento en la última sincronización se recuerda por huellas (clave `sync` de Store), no por copias: así se sabe
   qué cambió en cada lado sin duplicar los datos en el móvil. Lo que se vació al arrancar porque estaba dañado (core/persist)
   no cuenta como borrado: esas huellas se olvidan y se vuelve a bajar de la nube (forgetDamaged).
   Las huellas solo se guardan cuando lo que describen está también guardado en el móvil (saveMeta): si el móvil no puede
   guardar (sin espacio), lo nuevo sube igual a la nube, pero no se apunta; al volver a abrir la app, al móvil le falta y, como
   no consta que lo tuviera, baja de la nube en vez de borrarse de ella. En cuanto el móvil vuelve a poder guardar, se apuntan
   (noteWaiting): lo que guarda entonces incluye lo bajado mientras tanto, y tiene que constar como sincronizado. El orden es
   siempre ese, primero los datos y después las huellas, porque al revés se pierden datos y así, como mucho (si la app se
   cierra entre lo uno y lo otro), algo borrado justo después vuelve a aparecer (docs/tecnica/backend.md). Y si la app está
   abierta en otra pestaña o ventana que ha guardado después (core/persist: instanceStale), esta no sincroniza: subiría lo
   suyo, que ya no es lo último.
   Define: newMeta, readMeta, meta, storeMeta, metaWaiting, saveMeta, status, quiet, applying, lastPrefs, profileAt, timer, fails, tokenFresh, running, again, syncState, syncBusy, deadShown, setStatus, syncLine, afterApply, syncProfile, syncDeviceOS, pull, pruneIndex, lastHashes, unsynced, push, syncRound, noteWaiting, syncNow, CHANGE_WAIT, timerAt, syncSoon, syncAfterChange, retryLater, adapter, forgetDamaged, startSync, stopSync, firstSync, pendingDocs, everSynced, wipeCloudData
*/
import { say } from '../core/i18n.js';
import { $, LOCALE, newId } from '../core/util.js';
import { deviceOS } from '../core/platform.js';
import { Store } from '../core/store.js';
import { logError } from '../core/errors.js';
import { badParts, instanceStale, partsLost, savesBroken, savesDone, staleNow, stateRecovered } from '../core/persist.js';
import { partKey } from '../core/parts.js';
import { applyTheme, flushState, W } from '../core/state.js';
import { R } from '../core/render.js';
import { dialog } from '../core/ui.js';
import { repairState } from '../core/repair.js';
import { applyAccent } from '../profile/appearance.js';
import { account, acctSave, isAdmin } from './session.js';
import { netError } from './net.js';
import { idToken } from './auth.js';
import { batchGet, commitWrites, delWrite, getDoc, setWrite } from './firestore.js';
import { hashMap, hashOf, hashText, KINDS, merge3, sameHashes } from './merge.js';
import { afterSync } from './hooks.js';
import { consentOk, syncConsent } from './consent.js';
import { applyDoc, applyPrefs, docPath, indexPath, localDocs, okType, PREF_KEYS, prefsLocal, profilePath } from './docs.js';
/** @param {any} fresh
    @returns {SyncMeta} */
const newMeta = fresh => ({ dev: newId(), base: {}, lt: {}, pt: 0, fresh: fresh ? 1 : 0, last: 0 });
/** { dev: id del dispositivo, base: { documento: { r: versión, h: huellas } }, lt: último cambio local de cada tipo (ms), pt: de
  las preferencias, fresh: 1 tras entrar (en un conflicto gana la nube), last: última sincronización completa (ms) } */
const readMeta = () => {
  try {
    /* (sin nada guardado, JSON.parse(null) da null) */
    const m = JSON.parse(/** @type {string} */ (Store.get(Store.K.sync)));
    if (m && typeof m == 'object' && m.base && typeof m.base == 'object' && typeof m.dev == 'string')
      return Object.assign(newMeta(0), m, { lt: m.lt && typeof m.lt == 'object' ? m.lt : {} });
  }
  catch (e) {
    /* sin datos de sincronización: se empieza de cero */
  }
  return newMeta(0);
};
let meta = readMeta();
/* false si no se pudo escribir (sin sitio) */
const storeMeta = () => {
  try {
    Store.set(Store.K.sync, JSON.stringify(meta));
    return true;
  }
  catch (e) {
    logError('guardar el estado de la sincronización', e);
    return false;
  }
};
/* 1 si lo sincronizado no se ha podido apuntar, porque el móvil no podía guardar los datos o no había sitio para las huellas:
   se apunta en cuanto se pueda (noteWaiting). Si no, lo que el móvil guarde entonces (lo bajado mientras tanto) quedaría sin
   constar como sincronizado, y al borrarlo después parecería algo que este móvil nunca tuvo: volvería de la nube */
let metaWaiting = 0;
/* guarda lo sincronizado, si lo que describe está guardado en este móvil y esta apertura de la app sigue siendo la última (ver
   arriba). Si no, se queda lo último que se guardó, que sí corresponde a lo que hay en el móvil */
const saveMeta = () => {
  if (savesBroken()) {
    metaWaiting = 1;
    return;
  }
  if (staleNow())
    return;
  metaWaiting = storeMeta() ? 0 : 1;
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
/** @type {Promise<void> | null} */
let running = null;
let again = false;
export const syncState = () => status;
/** ¿Falta la primera sincronización de esta apertura, o hay una en marcha? (lo que sale solo espera: puede traer que ya se vio
    en otro móvil) */
export const syncBusy = () => status.st == 'idle' || status.st == 'run';
/* 1 cuando ya se avisó en esta apertura de que la sesión caducó */
let deadShown = 0;
/** @param {string} st
    @param {string} [code] */
const setStatus = (st, code) => {
  status = { st, t: Date.now(), code: code || '' };
  if (quiet)
    return;
  if ($('#ajs'))
    R();
  if (st == 'dead' && !deadShown) {
    deadShown = 1;
    /* la cuenta ya no existe (se eliminó desde otro dispositivo, o por inactividad): lo que queda aquí se quita cerrando sesión */
    if (account && account.x == 2)
      dialog('Cuenta eliminada', 'Esta cuenta ya no existe: se eliminó desde otro dispositivo o por llevar mucho tiempo sin usarse. Cierra la sesión para borrar también lo que queda en este.', [['Más tarde', 'doNothing', ''], ['Cerrar sesión', 'signOutConfirmed', 'primary']]);
    else
      dialog('Tu sesión ha caducado', 'Vuelve a entrar para subir tus datos a la nube. Mientras, todo se sigue guardando en este móvil.', [['Más tarde', 'doNothing', ''], ['Entrar', 'reloginShow', 'primary']]);
  }
};
/** Estado de la sincronización en una línea (Ajustes y Diagnóstico). */
export const syncLine = () => {
  if (!account)
    return 'sin cuenta';
  if (account.x || status.st == 'dead')
    return 'la sesión ha caducado: vuelve a entrar';
  const t = meta.last ? new Date(meta.last).toLocaleString(LOCALE, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  return { run: 'sincronizando…', off: 'sin conexión; se sube al volver la red', wait: 'al terminar el entreno', err: say `no se pudo (${status.code}); se reintenta sola` }[status.st] || (t ? say `al día · ${t}` : 'pendiente');
};
/* tras aplicar lo de la nube: estado válido, guardado (sin contarlo como cambio local), tema y color, y la app pintada.
   Promesa: se cumple cuando lo aplicado queda escrito en el móvil (o se sabe que no se pudo: savesBroken) */
const afterApply = () => {
  let saved;
  applying = 1;
  try {
    repairState();
    saved = flushState();
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
  return saved;
};
/* paso 1: el perfil. Si no existe (cuenta recién creada), se crea con el usuario; las preferencias se juntan como el núcleo */
const syncProfile = async () => {
  if (meta.base.profile && Date.now() - profileAt < 6e5 && !( /** @type {Account} */(account)).csu && sameHashes(hashMap(new Map(Object.entries(prefsLocal()))), meta.base.profile.h))
    return;
  const d = await getDoc(profilePath());
  const rd = d ? d.data : null;
  /* el perfil ya estaba y no está: la cuenta se ha eliminado (desde otro dispositivo, o por inactividad). No se vuelve a crear */
  if (!rd && meta.base.profile)
    throw netError('GONE');
  /** @type {Record<string, any>} */
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
  /** @type {Record<string, any>} */
  const pr = {};
  for (const k of PREF_KEYS)
    if (k in merged)
      pr[k] = merged[k];
  if (!sameHashes(hashMap(M), hashMap(L))) {
    applyPrefs(merged);
    await afterApply();
  }
  if (!rd)
    await commitWrites([setWrite(profilePath(), { u: /** @type {Account} */ (account).u, sx: merged.sx || '', pr, ca: Date.now(), m: Date.now() }, { exists: false })]);
  else if (!sameHashes(hashMap(M), hashMap(Rm)))
    await commitWrites([setWrite(profilePath(), { sx: merged.sx || '', pr, m: Date.now() }, null, ['sx', 'pr', 'm'])]);
  meta.base.profile = { h: hashMap(M) };
  profileAt = Date.now();
  /* el usuario tal como se registró (con sus mayúsculas), aunque se entre escribiéndolo de otra forma */
  if (rd && typeof rd.u == 'string' && rd.u != /** @type {Account} */ (account).u && rd.u.toLowerCase() == /** @type {Account} */ (account).u.toLowerCase())
    acctSave({ ...account, u: rd.u });
  await syncDeviceOS(rd);
  /* la constancia de la aceptación y del consentimiento (cloud/consent): la de este dispositivo y la del perfil se juntan. Si
     con ello falta algo (se retiró el consentimiento en otro dispositivo), aquí se acaba la vuelta: no se baja ni se sube nada */
  if (!await syncConsent(profilePath(), rd ? rd.cs : null))
    throw netError('CONSENT');
};
/* El sistema del último móvil que abrió la app (T-28), solo para contar en Administración cuántos usan iPhone y cuántos
   Android. Va en una escritura aparte: si las reglas aún no lo admiten (una app publicada antes que ellas), solo falla esto y
   se reintenta en la siguiente sincronización, sin parar el resto ni llenar el registro de errores. */
/** @param {Record<string, any> | null} rd */
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
/** Paso 2: bajar y juntar lo que cambió en la nube. 'wait' si hay un entreno en curso (se deja para cuando acabe).
    @param {RemoteDoc | null} idx el índice, o null si la cuenta aún no tiene */
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
  /* documentos que el índice nombra pero ya no existen (un borrado de la nube que se quedó a medias: I-11) */
  const missing = [];
  for (const id of changed) {
    const kind = KINDS[id.split(':')[0]];
    const d = rv[id] ? got[docPath(id)] : null;
    if (rv[id] && !d) {
      missing.push(id);
      continue;
    }
    /** @type {any} */
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
  /* lo juntado, escrito en el móvil antes de apuntarlo como sincronizado */
  if (touched)
    await afterApply();
  if (missing.length)
    await pruneIndex(/** @type {RemoteDoc} */ (idx), missing);
  saveMeta();
  return true;
};
/* quita del índice los documentos que ya no existen, para no volver a pedirlos en cada sincronización (I-11). Lo de este móvil
   no se toca: si tenía algo de esos documentos, se vuelve a subir (paso 3), como si nunca se hubieran borrado. Si el índice
   cambió entretanto, se deja para la próxima vez */
/** @param {RemoteDoc} idx
    @param {string[]} missing */
const pruneIndex = async (idx, missing) => {
  const p = { ...idx.data.p };
  missing.forEach(id => {
    delete p[id];
    delete meta.base[id];
  });
  try {
    const res = await commitWrites([setWrite(indexPath(), { p, m: Date.now(), d: meta.dev }, { updateTime: idx.ut })]);
    idx.data.p = p;
    idx.ut = res[0];
  }
  catch (e) {
    if (e.code != 'FAILED_PRECONDITION' && e.code != 'ABORTED')
      logError('sincronizar: limpiar el índice', e);
  }
};
/* el texto y la huella de cada elemento la última vez que se miró (documento + clave → { s, h }): si el texto es el mismo, la
   huella también, y no hace falta recorrerlo otra vez (hashText). Con años de datos era casi la mitad de lo que tarda
   unsynced, que se hace en cada sincronización. Solo guarda lo que había la última vez */
let lastHashes = new Map();
/* los documentos con cambios del móvil aún sin subir: [{ id, m: su contenido de ahora por elementos (cloud/merge), h: sus
   huellas }]. Lo son los que no coinciden con lo de la última sincronización y los nuevos que tienen algo */
/** @param {Record<string, any>} local */
const unsynced = local => {
  /** @type {{ id: string, m: Items, h: Hashes }[]} */
  const out = [];
  const seen = new Map();
  for (const id of new Set([...Object.keys(local), ...Object.keys(meta.base).filter(k => k != 'profile')])) {
    const kind = KINDS[id.split(':')[0]];
    if (!kind)
      continue;
    const m = kind.split(local[id]);
    /* lo mismo que hashMap(m) */
    /** @type {Hashes} */
    const h = {};
    for (const [k, v] of m) {
      const s = JSON.stringify(v);
      const key = id + '\n' + k;
      const was = lastHashes.get(key);
      const x = was && was.s === s ? was : { s, h: hashText(s) };
      seen.set(key, x);
      h[k] = x.h;
    }
    const b = meta.base[id];
    if (b ? !sameHashes(h, b.h) : m.size)
      out.push({ id, m, h });
  }
  lastHashes = seen;
  return out;
};
/** Paso 3: subir lo cambiado en el móvil, con el índice, todo o nada. false si el índice cambió entretanto.
    @param {RemoteDoc | null} idx */
const push = async (idx) => {
  const local = localDocs();
  const rv = { ...(idx && idx.data.p && typeof idx.data.p == 'object' ? idx.data.p : {}) };
  const ops = [];
  for (const { id, m, h } of unsynced(local)) {
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
  /** @type {any[]} */
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
    /* lo subido se apunta cuando el móvil ha terminado de escribir lo suyo (y solo si pudo: saveMeta) */
    await savesDone();
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
  /* esta vuelta sube todo lo cambiado hasta ahora: la programada ya no hace falta (lo que cambie a partir de aquí la vuelve a
     programar) */
  clearTimeout(timer);
  timerAt = 0;
  /* sin los datos del móvil (core/persist: partsLost), la nube creería que se borraron: no se sincroniza nada. Tampoco si otra
     apertura de la app ha guardado después (instanceStale): lo de esta ya no es lo último. Ni sin la aceptación de las
     condiciones y el consentimiento para los datos de salud (cloud/consent): sin ellos no se trata nada */
  if (!account || partsLost || staleNow() || !consentOk(account))
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
    const readAt = profileAt;
    await syncProfile();
    /* ¿se ha leído el perfil en esta vuelta? (leído hace poco y sin cambios en las preferencias, no se vuelve a leer) */
    let profileSeen = profileAt != readAt;
    for (let i = 0; i < 4; i++) {
      const idx = await getDoc(indexPath());
      /* el índice ya no está y este dispositivo tenía cosas sincronizadas: los datos de la cuenta se han borrado desde otro
         («Borrar todos los datos», retirar el consentimiento o eliminar la cuenta). Antes de bajar o subir nada se lee el
         perfil, si no se ha leído en esta vuelta: dice si la cuenta sigue y si sigue dando su consentimiento */
      if (!idx && !profileSeen && Object.keys(meta.base).some(k => k != 'profile')) {
        profileAt = 0;
        await syncProfile();
        profileSeen = true;
      }
      if (await pull(idx) == 'wait') {
        setStatus('wait');
        retryLater(6e4);
        return;
      }
      /* lo bajado no se ha podido guardar porque otra apertura de la app guardó antes: la vuelta se deja aquí */
      if (instanceStale)
        return;
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
    /* la cuenta ya no existe: como una sesión que ya no vale, pero diciéndolo (setStatus) */
    if (e.code == 'GONE') {
      stopSync();
      if (account)
        acctSave({ ...account, x: 2 });
      setStatus('dead');
      return;
    }
    /* falta la aceptación o el consentimiento: se deja de sincronizar y sale la pantalla que los pide (core/render) */
    if (e.code == 'CONSENT') {
      stopSync();
      setStatus('idle');
      if (!quiet)
        R();
      return;
    }
    fails++;
    if (e.code != 'NETWORK')
      logError('sincronizar', e);
    setStatus(e.code == 'NETWORK' ? 'off' : 'err', e.code);
    retryLater(Math.min(6e5, 15e3 * 2 ** Math.min(fails, 6)));
  }
};
/* Apunta lo sincronizado que estaba esperando (metaWaiting), cuando es seguro: sin una vuelta en marcha (ella apunta lo suyo
   cuando lo tiene escrito y, al terminar, se vuelve a pasar por aquí), sin guardados fallidos y con todo lo que se ha
   decidido guardar hasta ahora ya escrito. Sin esas tres cosas, las huellas podrían ir por delante de lo guardado. Se llama
   cada vez que un guardado termina bien (adapter.saved) y al acabar cada vuelta */
const noteWaiting = () => {
  if (metaWaiting && !running && !savesBroken())
    savesDone().then(() => {
      if (metaWaiting && !running)
        saveMeta();
    });
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
      noteWaiting();
    }
  })();
  return running;
};
/** Tras un cambio, cuánto se espera como mucho para subirlo (ms): lo que se cambie mientras tanto (otro alimento, otro vaso
  de agua…) va en la misma subida, así que se gastan menos escrituras de Firestore (plan Spark: 20.000 al día para todas las
  cuentas). Al pasar la app a segundo plano no se espera. */
const CHANGE_WAIT = 3e4;
/* cuándo toca la sincronización programada (ms; 0 si no hay ninguna) */
let timerAt = 0;
/** @param {number} ms */
const syncSoon = ms => {
  clearTimeout(timer);
  timerAt = Date.now() + ms;
  timer = setTimeout(() => {
    timerAt = 0;
    syncNow();
  }, ms);
};
/* tras un cambio: como mucho CHANGE_WAIT después del primero que aún no se ha subido (los de después no la retrasan) */
const syncAfterChange = () => {
  if (!timerAt || timerAt - Date.now() > CHANGE_WAIT)
    syncSoon(CHANGE_WAIT);
};
/** @param {number} ms */
const retryLater = ms => syncSoon(ms);
/* avisos de Store (core/store). changed: por cada clave que se escribe (solo cuentan las partes del estado). saved: un
   guardado ha terminado bien y no queda nada sin escribir en el móvil */
/** @type {RemoteAdapter} */
const adapter = {
  saved: noteWaiting,
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
    syncAfterChange();
  }
};
/* datos dañados al arrancar (core/persist): lo que se vació en el móvil no es un borrado, así que esos documentos se olvidan y
   se vuelven a bajar de la nube en vez de borrarlos allí. Con el núcleo dañado, todo, y en un conflicto gana la nube */
const forgetDamaged = () => {
  if (stateRecovered == 1) {
    meta.base = {};
    meta.fresh = 1;
  }
  else
    for (const k of badParts) {
      const kind = k == partKey('logs') ? 'logs:' : k == partKey('hist') ? 'hist:' : k.startsWith(partKey('meals:')) ? 'meals:' + k.slice(partKey('meals:').length) : '';
      for (const id of Object.keys(meta.base))
        if (kind && (kind.endsWith(':') ? id.startsWith(kind) : id == kind))
          delete meta.base[id];
    }
  if (stateRecovered)
    saveMeta();
};
/** Arranque con sesión (core/boot): escucha los cambios y la red, y sincroniza enseguida. */
export const startSync = () => {
  forgetDamaged();
  lastPrefs = hashOf(prefsLocal());
  Store.remote = adapter;
  window.addEventListener('online', () => syncSoon(800));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState == 'visible' && Date.now() - (meta.last || 0) > 6e4) {
      profileAt = 0;
      syncSoon(600);
    }
    /* al irse a segundo plano, lo que esperaba se sube ya: puede que la app no vuelva en un rato (o que el móvil la cierre). En
       la tarea siguiente: si la página se va (al recargarla), la subida no llega a empezar y no se corta a medias */
    else if (document.visibilityState == 'hidden' && timerAt)
      syncSoon(0);
  });
  syncSoon(1500);
};
/** Deja de sincronizar (al cerrar sesión). */
export const stopSync = () => {
  Store.remote = null;
  clearTimeout(timer);
  timerAt = 0;
};
/** Primera sincronización tras entrar (account/login), con los datos del móvil ya borrados: baja todo lo de la cuenta (o,
  si es nueva, crea su perfil y sube el estado inicial) sin pintar la app. true si terminó bien. */
export const firstSync = async () => {
  meta = newMeta(1);
  storeMeta();
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
export const pendingDocs = () => unsynced(localDocs()).length;
/** ¿Ha sincronizado alguna vez este dispositivo con la cuenta? (si no, lo que tiene es el estado de partida: nada suyo) */
export const everSynced = () => +meta.last > 0;
/** Borra de la nube todos los datos de la cuenta (no la cuenta ni su perfil): «Borrar todos los datos» en Ajustes. */
export const wipeCloudData = async () => {
  const idx = await getDoc(indexPath());
  const ids = Object.keys(idx && idx.data.p && typeof idx.data.p == 'object' ? idx.data.p : {}).filter(id => KINDS[id.split(':')[0]] && id != 'avatar');
  const writes = ids.map(id => delWrite(docPath(id))).concat([delWrite(docPath('avatar')), delWrite(indexPath())]);
  for (let i = 0; i < writes.length; i += 400)
    await commitWrites(writes.slice(i, i + 400));
  meta = newMeta(0);
  storeMeta();
};
