/* ═══ core/persist ═══
   Guardado del estado S en el dispositivo, por partes: leerlo al arrancar y escribir lo que cambia.
   El núcleo de S (ajustes, plan, programas, peso…) va en localStorage, en la clave `ff`, que se lee sin esperas al arrancar.
   Las colecciones que más crecen (entrenos, historial y comidas) van aparte, cada una en sus claves (core/parts dice cómo se
   reparten). Esas partes viven en IndexedDB (base «ffdata», con core/idb), que admite mucho más que los unos 5 MB de
   localStorage (I-04): core/boot las lee (loadParts) antes de pintar nada. La primera vez pasan allí las que había en
   localStorage; sin IndexedDB, se quedan en localStorage, como antes.
   Si las partes no se pueden leer o falta alguna de las que el núcleo nombra, no se guarda ni se sincroniza nada (partsLost):
   con los datos a medias, la nube creería que se borraron.
   Cada guardado escribe solo las claves que han cambiado, y todos los saveState() de una misma acción se agrupan en uno solo
   al terminar la acción (queueMicrotask). Para saber qué ha cambiado se pasa a texto el núcleo y las partes que la acción dice
   haber tocado (saveState('core'), saveState(mealsPart(día))…; si no dice nada, todas) y, poco después y con la app parada,
   todas, por si acaso (I-10). tests/walk.py, con window.__ffHintCheck (una lista), pide en vez de ese repaso que se compruebe
   cada vez que la acción no tocó otras partes: lo que falte queda anotado en la lista.
   En IndexedDB se escribe en orden, una tanda tras otra: primero las partes nuevas o cambiadas, luego el núcleo y al final se
   borran las que sobran; así el núcleo nunca nombra una parte que no esté guardada. Tampoco si un guardado falla con otros
   decididos detrás, que daban por escrito lo de aquel: esos ya no se escriben, y el siguiente lo mira todo otra vez (writeIdb).
   savesDone() espera a que esté escrito todo lo guardado (reloadApp lo espera antes de recargar la página).
   Cada parte que cambia se avisa enseguida a Store.remote (cloud/sync, que la sube a Firebase).
   Si un guardado falla (sin espacio), se sabe con savesBroken() hasta que uno completo sale bien: mientras tanto cloud/sync
   no apunta lo sincronizado, para que lo subido baje de la nube al volver a abrir la app en vez de darse por borrado.
   Una sola apertura de la app guarda cada vez: si otra pestaña o ventana ha guardado después, esta lo nota (la marca
   Store.K.rev) y ya no guarda ni sincroniza (instanceStale) hasta que core/boot la recarga con lo último. Ver «una sola
   apertura de la app guarda cada vez», más abajo.
   Este módulo no conoce S: core/state le pasa el estado (saveState, flushState). Se guarda con las claves cortas de siempre y
   se lee con los nombres del programa (core/schema).
   Leer y escribir comparten lo que se sabe de cada clave (savedText), dónde están las partes (idb) y si se puede guardar
   (saveLocked): por eso van juntos en este módulo, y lo que no tiene estado, fuera (core/parts y core/idb).
   Define: stateRecovered, partsLost, badParts, savedText, coreAtLoad, queued, queuedParts, saveLocked, lastKey, dropCount, idb, expectedParts, leftovers, lastState, allSaved, unsaved, pendingWrites, inFlight, failGen, savesBroken, knownRev, instanceStale, staleNotice, onInstanceStale, outdated, INSTANCE, BYE_KEY, savedByPredecessor, touchRev, setAside, loadSavedState, dbTx, partsTx, asideSet, asideGet, writing, enqueue, savesDone, reloadApp, readIdbParts, moveToIdb, loadParts, partSizes, saveFailedAt, saveFailed, CHECK_MS, checkTimer, failStreak, checkLater, checkNow, goStale, staleCheck, staleNow, claim, takeOver, pendingChanges, writeLocal, writeIdb, hintCheck, writeSplit, writeState, scheduleWrite, replaceSavedState, lockSaves, dropSavedState, clearSavedState
*/
import { newId } from './util.js';
import { Store } from './store.js';
import { idbStore } from './idb.js';
import { partKey, readPart, splitState, STATE_PARTS } from './parts.js';
import { stateFromStored, stateName, stateToStored } from './schema.js';
import { logError } from './errors.js';
import { toast } from './toast.js';
/** Al arrancar: 1 si el núcleo estaba dañado (se empezó de cero, conservando las partes legibles), 2 si solo lo estaba
  alguna parte. Lo dañado queda apartado en Store.K.bad y core/boot avisa. */
export let stateRecovered = 0;
/** 1 si al arrancar no se pudieron leer las partes de IndexedDB (o falta alguna): no se guarda nada, cloud/sync no empieza y
  core/boot avisa (I-04). */
export let partsLost = 0;
/** Claves de las partes que estaban dañadas al arrancar: cloud/sync vuelve a bajarlas de la nube en vez de borrarlas allí.
    @type {string[]} */
export const badParts = [];
/** Texto escrito en cada clave del estado según la última lectura o escritura (null: la clave existe, contenido sin leer;
  undefined: no se sabe si se escribió, se vuelve a escribir).
    @type {Map<string, string | null | undefined>} */
const savedText = new Map();
/** El núcleo tal como lo leyó esta apertura al arrancar (loadSavedState): lo último que dejó la anterior.
    @type {string | null} */
let coreAtLoad = null;
/** Estado pendiente de escribir al terminar la acción (scheduleWrite), o null.
    @type {Record<string, any> | null} */
let queued = null;
/** Partes (claves de Store) que la acción en curso dice haber tocado, o null: todas.
    @type {Set<string> | null} */
let queuedParts = null;
/** 1 tras restaurar una copia o borrarlo todo (o si no se pudieron leer las partes): nada debe pisar lo que hay. */
let saveLocked = 0;
/** Clave que se estaba escribiendo (para el registro de errores si falla). */
let lastKey = '';
/** Cuántas veces se ha borrado el estado guardado (dropSavedState). Un guardado pedido antes del último borrado ya no escribe
  nada: el que estaba en marcha al cerrar sesión dejaba escrito el núcleo con sus partes ya borradas, y la siguiente apertura
  se quedaba en «No se pudieron leer tus datos», sin poder entrar. */
let dropCount = 0;
/** 1: las partes van en IndexedDB; 0: en localStorage. */
let idb = 0;
/** Partes que el núcleo dice tener en IndexedDB (las lee loadParts), o null si no las tiene allí.
    @type {string[] | null} */
let expectedParts = null;
/** Partes que quedaron en localStorage de antes de pasarlas a IndexedDB: se borran al leer las de IndexedDB.
    @type {string[]} */
let leftovers = [];
/** El último estado guardado (el repaso de después lo vuelve a mirar entero).
    @type {Record<string, any> | null} */
let lastState = null;
/** 1 desde la primera vez que se mira todo: hasta entonces (lo que arregla core/repair al arrancar, por ejemplo) o tras un fallo,
  un guardado que dice sus partes también lo mira todo. */
let allSaved = 0;
/** 1 mientras algo de lo que se decidió guardar no haya quedado escrito en este dispositivo (sin espacio, sobre todo): hasta
  que un guardado completo salga bien, lo que hay en S no es lo que habrá al volver a abrir la app. */
let unsaved = 0;
/** Escrituras en IndexedDB decididas y aún sin terminar. Un guardado completo solo responde de que todo S está escrito si se
  decidió sin otras a medias: las anteriores cuentan como escritas desde que se deciden, aunque luego fallen. */
let pendingWrites = 0;
/** Lo que hay escrito de verdad de cada clave con un guardado en IndexedDB a medias (clave → { v: texto }, o null si no está).
  savedText da por escrito lo que se decide guardar, para que el guardado siguiente compare con eso; si uno falla, savedText
  vuelve a lo de aquí, también en las claves de los guardados decididos después (writeIdb). */
const inFlight = new Map();
/** Cambia con cada guardado fallido en IndexedDB: los que se decidieron antes de saberlo ya no se escriben. */
let failGen = 0;
/** ¿Hay algo de S sin escribir en este dispositivo porque un guardado falló? cloud/sync lo mira para no apuntar como
  sincronizado lo que el móvil no tiene guardado: al volver a abrir la app le faltaría, y la nube lo daría por borrado. */
export const savesBroken = () => !!unsaved;
/* ── una sola apertura de la app guarda cada vez ──
   La app puede estar abierta dos veces sobre lo mismo guardado: dos pestañas del navegador o, en Android, la app instalada y
   una pestaña. Cada una tiene su S en memoria; si las dos guardaran, la segunda pisaría con lo suyo lo que guardó la primera y
   cloud/sync daría por borrado en la nube lo que a esa le faltaba.
   Por eso lo guardado lleva una marca (Store.K.rev) que cambia con cada guardado, y cada apertura recuerda la última que leyó
   o dejó ella (knownRev). Antes de escribir se mira que la marca siga siendo esa (claim): si lo es, nadie más ha guardado
   desde entonces y se deja una nueva, antes de escribir (las demás ya no escriben) y al terminar (la que haya leído a medias
   tampoco); si no lo es, otra ha guardado después: esta se queda atrás (instanceStale) y no vuelve a escribir nada de lo que
   comparten (el estado, lo sincronizado y el entreno en curso) hasta que se recargue. */
/** La marca que había al leer el estado, o la que dejó el último guardado de esta apertura.
    @type {string | null} */
let knownRev = null;
try {
  knownRev = Store.get(Store.K.rev);
}
catch (e) {
  /* sin localStorage no hay nada guardado que cuidar */
}
/** 1 si otra apertura de la app ha guardado después de lo que esta tiene en S: ya no guarda ni sincroniza (cloud/sync) hasta
  que se recargue. */
export let instanceStale = 0;
/** @type {((arriving?: any) => void) | null} */
let staleNotice = null;
/** Qué hacer cuando esta apertura se queda atrás (core/boot: recargarla con lo último). `fn(arriving)`: `arriving`, 1 si se
  ha sabido al volver a ella (hasta entonces no se estaba viendo). Se llama al saberlo y, después, cada vez que algo intenta
  guardar.
    @param {(arriving?: any) => void} fn */
export const onInstanceStale = fn => {
  staleNotice = fn;
};
/* ¿ha guardado otra apertura de la app después de lo que esta sabe? */
const outdated = () => {
  try {
    return Store.get(Store.K.rev) !== knownRev;
  }
  catch (e) {
    return false;
  }
};
/* Quién deja cada marca: la de esta apertura empieza por su identificador (INSTANCE). Sirve para un caso. Al recargar la app,
   la página anterior de la pestaña sigue viva un momento y termina entonces lo que estaba guardando (el repaso de al salir, o
   un guardado a medias): la nueva, que ya había leído, se queda atrás, y con razón, porque lo que leyó puede ser de antes.
   Pero no hay otra ventana abierta: basta con que se recargue sola, sin el aviso (core/boot). Para saberlo, la que se
   cierra deja dicho en la pestaña quién era (BYE_KEY, en sessionStorage: sobrevive a la recarga y no lo ven otras pestañas),
   y la nueva mira si la marca que encuentra es suya (savedByPredecessor). */
const INSTANCE = newId();
const BYE_KEY = 'ffbye';
/** ¿Quien ha guardado después de lo que esta apertura sabe es la página anterior de esta misma pestaña, que se estaba
  cerrando? Vale una vez por cierre: lo que dejó dicho se borra al mirarlo. */
export const savedByPredecessor = () => {
  try {
    const who = sessionStorage.getItem(BYE_KEY);
    sessionStorage.removeItem(BYE_KEY);
    return !!who && String(Store.get(Store.K.rev) || '').startsWith(who + '.');
  }
  catch (e) {
    return false;
  }
};
/* deja una marca nueva, que solo conoce esta apertura: las demás se quedan atrás. Si no cabe ni la marca, sigue la de antes */
const touchRev = () => {
  const r = INSTANCE + '.' + newId();
  try {
    Store.set(Store.K.rev, r, 1);
    knownRev = r;
  }
  catch (e) {
    /* sin sitio: el guardado que viene dirá qué falla */
  }
};
/* aparta en Store.K.bad lo que no se pudo leer ({ clave: texto }) y lo anota para el aviso de core/boot y para cloud/sync */
/** @param {Record<string, any>} bad
    @param {any} salvage */
const setAside = (bad, salvage) => {
  const keys = Object.keys(bad);
  if (!keys.length)
    return;
  stateRecovered = salvage || stateRecovered == 1 ? 1 : 2;
  badParts.push(...keys.filter(k => k != Store.K.app));
  try {
    Store.set(Store.K.bad, JSON.stringify({ t: Date.now(), k: keys.join(), raw: keys.length == 1 ? String(bad[keys[0]]) : JSON.stringify(bad) }));
  }
  catch (x) {
    logError('apartar estado dañado', x);
  }
};
/** Estado guardado, con los nombres del programa ({} si no hay nada). Lee el núcleo y, si están en localStorage, las partes;
  si están en IndexedDB, quedan vacías hasta que las lea loadParts. Si el núcleo está dañado, se aparta en Store.K.bad y se
  empieza de cero conservando las partes que se puedan leer; si lo está una parte, se aparta esa parte y se deja vacía. */
export const loadSavedState = () => {
  let raw;
  let inLocal;
  try {
    raw = Store.get(Store.K.app);
    inLocal = Store.keys(partKey(''));
  }
  catch (e) {
    logError('leer estado', e);
    return {};
  }
  /** @type {Record<string, any>} */
  const bad = {};
  /** @type {any} */
  let core = null;
  if (raw != null) {
    coreAtLoad = raw;
    savedText.set(Store.K.app, raw);
    try {
      core = JSON.parse(raw);
      if (core !== null && (typeof core != 'object' || Array.isArray(core)))
        throw new Error('el estado guardado no es un objeto');
    }
    catch (e) {
      logError('estado dañado', e);
      bad[Store.K.app] = raw;
      core = null;
    }
  }
  const salvage = !!bad[Store.K.app];
  /* todo S en `ff`, sin partes: datos de la serie de prueba (1.20 y anteriores), que no se migran */
  if (core && !core._parts) {
    inLocal.forEach(k => savedText.set(k, null));
    return {};
  }
  /* partes en IndexedDB: las lee loadParts; mientras, vacías. Lo que quede de ellas en localStorage es de antes de pasarlas */
  if (core && core._parts >= 2) {
    expectedParts = Array.isArray(core._pk) ? core._pk.filter((/** @type {any} */ k) => typeof k == 'string') : [];
    leftovers = inLocal;
    delete core._parts;
    delete core._pk;
    for (const k of STATE_PARTS)
      if (core[k] === partKey(k))
        core[k] = k == 'logs' ? [] : {};
    return stateFromStored(core);
  }
  inLocal.forEach(k => savedText.set(k, null));
  /* con el núcleo dañado, también se buscan partes en IndexedDB (loadParts) */
  if (salvage)
    expectedParts = [];
  if (!core && !salvage)
    return {};
  if (core) {
    delete core._parts;
    delete core._pk;
  }
  else
    core = {};
  for (const k of STATE_PARTS) {
    const shards = k == 'meals' ? inLocal.filter(x => x.startsWith(partKey('meals:'))).sort() : [partKey(k)];
    if (salvage ? !shards.some(x => savedText.has(x)) : core[k] !== partKey(k))
      continue;
    const all = {};
    for (const key of shards) {
      let r = null;
      try {
        r = Store.get(key);
      }
      catch (e) {
        logError('leer ' + key, e);
      }
      savedText.set(key, r);
      const v = readPart(k, r);
      if (v === undefined) {
        logError('estado dañado', new Error('no se pudo leer ' + key));
        bad[key] = r;
      }
      else if (k == 'meals')
        Object.assign(all, v);
      else
        core[k] = v;
    }
    if (k == 'meals')
      core.meals = all;
    else if (core[k] === partKey(k))
      core[k] = k == 'logs' ? [] : {};
  }
  setAside(bad, salvage);
  return stateFromStored(core);
};
/* la base de las partes (core/idb): las transacciones sobre el almacén de las partes y el de lo apartado (asideSet) */
const dbTx = idbStore('ffdata', { parts: null, aside: null });
/** @param {IDBTransactionMode} mode
    @param {(st: IDBObjectStore) => any} fn */
const partsTx = (mode, fn) => dbTx('parts', mode, fn);
/** Guarda aparte un texto grande que no es del estado (la copia previa a restaurar: system/backup), en IndexedDB si las partes
  están allí y si no en localStorage. Promesa: false si no cabe.
  @param {string} k
  @param {string} text */
export const asideSet = (k, text) => idb ? dbTx('aside', 'readwrite', st => st.put(text, k)).then(() => true, e => {
  logError('guardar aparte ' + k, e);
  return false;
}) : Promise.resolve().then(() => {
  try {
    Store.set(Store.K.app + 'aside:' + k, text);
    return true;
  }
  catch (e) {
    logError('guardar aparte ' + k, e);
    return false;
  }
});
/** Lo guardado aparte con asideSet (promesa: el texto, o null).
    @param {string} k */
export const asideGet = k => idb ? dbTx('aside', 'readonly', st => st.get(k)).then(v => typeof v == 'string' ? v : null, e => {
  logError('leer lo apartado ' + k, e);
  return null;
}) : Promise.resolve(Store.get(Store.K.app + 'aside:' + k));
/* las escrituras en IndexedDB, una tras otra y en el orden en que se decidieron (también borrarlo todo) */
let writing = Promise.resolve(true);
/** @param {() => Promise<boolean>} job */
const enqueue = job => writing = writing.then(job);
/** Espera a que esté escrito todo lo guardado hasta ahora. */
export const savesDone = () => writing.then(() => undefined);
/** Recarga la página cuando esté escrito lo pendiente (como mucho, 5 s): tras restaurar, entrar, cerrar sesión o actualizar. */
export const reloadApp = () => {
  let gone = 0;
  const go = () => {
    if (!gone) {
      gone = 1;
      location.reload();
    }
  };
  /* el repaso pendiente se hace ya: si no, empezaría al cerrarse la página y terminaría con la nueva ya abierta */
  checkNow();
  savesDone().then(go);
  setTimeout(go, 5000);
};
/* lee las partes de IndexedDB y las pone en s. Con strict, falta una de las que el núcleo nombra = no se pudieron leer.
   Devuelve false si no se pudieron leer */
/** @param {Record<string, any>} s
    @param {any} strict
    @param {any} salvage */
const readIdbParts = async (s, strict, salvage) => {
  /** @type {any[]} */
  let keys;
  /** @type {any[]} */
  let vals;
  try {
    [keys, vals] = await partsTx('readonly', st => [st.getAllKeys(), st.getAll()]);
  }
  catch (e) {
    logError('leer las partes', e);
    return false;
  }
  const got = new Map(keys.map((k, i) => [String(k), vals[i]]));
  const missing = strict ? /** @type {string[]} */ (expectedParts).filter(k => !got.has(k)) : [];
  if (missing.length) {
    logError('leer las partes', new Error('faltan ' + missing.join()));
    return false;
  }
  /** @type {Record<string, any>} */
  const bad = {};
  const meals = {};
  let anyMeals = 0;
  for (const [k, raw] of got) {
    const name = k.startsWith(partKey('')) ? k.slice(partKey('').length) : '';
    const kind = name.startsWith('meals:') ? 'meals' : name;
    if (!STATE_PARTS.includes(kind) || typeof raw != 'string')
      continue;
    savedText.set(k, raw);
    const v = readPart(kind, raw);
    if (v === undefined) {
      logError('estado dañado', new Error('no se pudo leer ' + k));
      bad[k] = raw;
    }
    else if (kind == 'meals') {
      Object.assign(meals, v);
      anyMeals = 1;
    }
    else
      s[stateName(kind)] = v;
  }
  if (anyMeals || !salvage)
    s.meals = Object.assign(salvage && s.meals && typeof s.meals == 'object' ? s.meals : {}, meals);
  setAside(bad, salvage);
  return true;
};
/* las partes pasan a IndexedDB (o, sin datos, se empieza allí): todas, en una transacción que antes vacía el almacén; después,
   el núcleo con la marca nueva y, al final, fuera las de localStorage. Si algo falla, todo sigue en localStorage y se vuelve a
   intentar al abrir otra vez la app */
/** @param {Record<string, any>} s */
const moveToIdb = async (s) => {
  if (!window.indexedDB || saveLocked)
    return;
  const core = Store.K.app;
  const old = [...savedText.keys()].filter(k => k != core);
  const hadCore = savedText.has(core);
  const oldCore = savedText.get(core);
  /* el núcleo, con la marca nueva, solo si había partes que pasar; si no, ya la llevará el próximo guardado */
  const moved = hadCore && old.length > 0;
  idb = 1;
  /** @type {StateSplit} */
  let split;
  try {
    split = splitState(stateToStored(s), null, idb);
    /* con algo ya guardado, pasarlo es escribir: como en cualquier guardado, solo si nadie más ha guardado desde que se leyó */
    if ((hadCore || old.length) && !claim()) {
      idb = 0;
      return;
    }
    await partsTx('readwrite', st => {
      st.clear();
      for (const k of split.keys)
        st.put(split.out[k], k);
    });
    if (moved)
      Store.set(core, split.out[core], 1);
    if (hadCore || old.length)
      claim();
  }
  catch (e) {
    idb = 0;
    logError('pasar las partes a IndexedDB', e);
    return;
  }
  for (const k of old)
    try {
      Store.del(k, 1);
    }
    catch (e) {
      logError('pasar las partes a IndexedDB: borrar ' + k, e);
    }
  savedText.clear();
  for (const k of split.keys)
    savedText.set(k, split.out[k]);
  if (hadCore)
    savedText.set(core, moved ? split.out[core] : oldCore);
  /* lo apartado (asideSet) era de unos datos que ya no están (otra cuenta, o borrados) */
  await dbTx('aside', 'readwrite', st => st.clear()).catch(e => logError('vaciar lo apartado', e));
};
/** Al arrancar (core/boot, antes de nada): lee las partes de IndexedDB y las pone en `s` (el estado S) o, si estaban en
  localStorage, las pasa allí. Nunca falla: si no se pueden leer, partsLost.
    @param {Record<string, any>} s */
export const loadParts = async (s) => {
  if (expectedParts && !stateRecovered) {
    if (!await readIdbParts(s, 1, 0)) {
      partsLost = 1;
      saveLocked = 1;
      return;
    }
    idb = 1;
    for (const k of leftovers)
      try {
        Store.del(k, 1);
      }
      catch (e) {
        logError('borrar partes de antes', e);
      }
    leftovers = [];
    return;
  }
  /* con el núcleo dañado: lo que haya en IndexedDB también se aprovecha */
  if (expectedParts && stateRecovered == 1)
    await readIdbParts(s, 0, 1);
  await moveToIdb(s);
};
/** Lo que ocupa cada parte guardada (caracteres) y dónde están: { where: 'IndexedDB' | 'localStorage', sizes: [[clave, n]] }.
    @returns {{ where: string, sizes: any[][] }} */
export const partSizes = () => ({ where: idb ? 'IndexedDB' : 'localStorage', sizes: [...savedText.entries()].filter(([k]) => k != Store.K.app).map(([k, v]) => [k, typeof v == 'string' ? v.length : 0]) });
let saveFailedAt = 0;
/** Registra un fallo al guardar y avisa (como mucho una vez por minuto).
    @param {string} k
    @param {any} e */
const saveFailed = (k, e) => {
  logError('guardar ' + k, e);
  if (Date.now() - saveFailedAt < 6e4)
    return;
  saveFailedAt = Date.now();
  setTimeout(() => {
    try {
      toast('No se ha podido guardar en este dispositivo. Libera espacio o haz una copia de seguridad.');
    }
    catch (x) {
      /* si aún no hay interfaz no se puede avisar; el error ya quedó registrado */
    }
  }, 0);
};
/* repaso completo poco después de un guardado parcial (o de un fallo), con la app parada: si una acción tocó una parte sin
   decirlo, se guarda igual (I-10). También al salir de la app */
const CHECK_MS = 2000;
let checkTimer = 0;
let failStreak = 0;
const checkLater = (ms = CHECK_MS) => {
  clearTimeout(checkTimer);
  checkTimer = setTimeout(checkNow, ms);
};
const checkNow = () => {
  if (!checkTimer)
    return;
  clearTimeout(checkTimer);
  checkTimer = 0;
  if (lastState && !queued)
    writeState(lastState);
};
/* esta apertura se queda atrás: ya no guarda (writeState) ni tiene nada pendiente de guardar, y se avisa (core/boot) */
/** @param {any} [arriving] */
const goStale = arriving => {
  if (!instanceStale) {
    instanceStale = 1;
    queued = null;
    clearTimeout(checkTimer);
    checkTimer = 0;
  }
  try {
    staleNotice && staleNotice(arriving);
  }
  catch (e) {
    logError('otra apertura de la app', e);
  }
};
/* lo mira ahora; `arriving`: se acaba de volver a esta apertura */
/** @param {any} [arriving] */
const staleCheck = arriving => {
  if (!instanceStale && !saveLocked && outdated())
    goStale(arriving);
};
/** ¿Se ha quedado atrás esta apertura? Lo mira ahora: se pregunta antes de escribir algo que comparten todas las aperturas y
  no pasa por aquí (lo sincronizado, en cloud/sync; el entreno en curso, en workout/resume). */
export const staleNow = () => {
  staleCheck(0);
  return !!instanceStale;
};
/* antes de escribir, y al terminar: si nadie más ha guardado desde lo que esta apertura sabe, deja su marca (true); si no,
   esta se queda atrás y no escribe (false) */
const claim = () => {
  if (instanceStale || outdated()) {
    goStale(0);
    return false;
  }
  touchRev();
  return true;
};
/** Esta apertura pasa a llevar algo que se guarda fuera del estado (el entreno en curso: workout/resume), como si acabara de
  guardar: las demás se quedan atrás. false si la que se ha quedado atrás es esta. */
export const takeOver = claim;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState == 'hidden')
    checkNow();
  else
    staleCheck(1);
});
window.addEventListener('pagehide', () => {
  /* quién se cierra (una que se quedó atrás ya no guarda: no deja nada dicho) */
  if (!instanceStale)
    try {
      sessionStorage.setItem(BYE_KEY, INSTANCE);
    }
    catch (e) {
      /* sin sessionStorage, la página nueva enseñaría el aviso de siempre */
    }
  checkNow();
});
/* lo que guarda otra pestaña o ventana se sabe al momento (el evento storage solo llega a las demás): por su marca o, si es
   una versión anterior de la app, que no la deja, porque cambia el núcleo. Y si el navegador tenía esta parada, al volver */
window.addEventListener('storage', e => {
  if (e.storageArea != localStorage)
    return;
  if (e.key == Store.K.app && !instanceStale && !saveLocked) {
    /* El aviso puede llegar tarde: al recargar, el de lo último que guardó la página anterior le llega a veces a la nueva,
       que ya lo ha leído. Si lo que anuncia es el núcleo que esta apertura leyó al arrancar, o el que ella dejó en su último
       guardado, nadie le ha cambiado nada. Antes se quedaba atrás igual, y salía «La app está abierta en otra ventana»
       con una sola abierta (una de cada varias decenas de recargas) */
    if (e.newValue != null && (e.newValue === coreAtLoad || e.newValue === savedText.get(Store.K.app)))
      return;
    goStale(0);
  }
  else if (e.key == null || e.key == Store.K.rev)
    staleCheck(0);
});
window.addEventListener('pageshow', e => {
  if (e.persisted)
    staleCheck(1);
});
/* lo que hay que escribir para que quede guardado lo que da splitState: { puts: [[clave, texto]] de las partes que cambian,
   dels: claves de las partes que sobran, text: el núcleo si cambia (null si no) } */
/** @param {StateSplit} split */
const pendingChanges = ({ out, keys }) => {
  const core = Store.K.app;
  const has = new Set(keys);
  return {
    puts: keys.filter(k => k in out && savedText.get(k) !== out[k]).map(k => [k, out[k]]),
    dels: [...savedText.keys()].filter(k => k != core && !has.has(k)),
    text: savedText.get(core) !== out[core] ? out[core] : null
  };
};
/* localStorage: se escribe ya, en el orden de siempre (partes, borrados y el núcleo al final). true si todo fue bien */
/** @param {StateSplit} split
    @param {any} report */
const writeLocal = (split, report) => {
  const core = Store.K.app;
  const { puts, dels, text } = pendingChanges(split);
  if (!puts.length && !dels.length && text == null)
    return true;
  if (!claim())
    return false;
  try {
    for (const [k, v] of puts) {
      lastKey = k;
      Store.set(k, v);
      savedText.set(k, v);
    }
    for (const k of dels) {
      lastKey = k;
      Store.del(k);
      savedText.delete(k);
    }
    if (text != null) {
      lastKey = core;
      Store.set(core, text);
      savedText.set(core, text);
    }
    claim();
    return true;
  }
  catch (e) {
    if (report)
      saveFailed(lastKey || core, e);
    return false;
  }
};
/* IndexedDB: lo que cambia se decide y se avisa ya; se escribe en la cola (partes, núcleo, borrados). Promesa: true si fue bien */
/** @param {StateSplit} split
    @param {any} report */
const writeIdb = (split, report) => {
  const core = Store.K.app;
  const { puts, dels, text } = pendingChanges(split);
  if (!puts.length && !dels.length && text == null)
    return Promise.resolve(true);
  if (!claim())
    return Promise.resolve(false);
  /* lo que hay escrito de verdad de cada clave que cambia, por si falla (si ya lo apuntó un guardado anterior que sigue a
     medias, vale lo suyo: lo de ahora es lo que ese dio por escrito) */
  for (const k of [...puts.map(x => x[0]), ...dels, ...text != null ? [core] : []])
    if (!inFlight.has(k))
      inFlight.set(k, savedText.has(k) ? { v: savedText.get(k) } : null);
  /* una clave ha quedado escrita con `v` (o borrada, sin `v`): si es lo que dice savedText, ya no está a medias; si un guardado
     posterior ha decidido otra cosa, esto es lo que hay de verdad hasta que ese se escriba */
  /** @param {string} k
      @param {string} [v] */
  const written = (k, v) => {
    if (v === undefined ? !savedText.has(k) : savedText.get(k) === v)
      inFlight.delete(k);
    else
      inFlight.set(k, v === undefined ? null : { v });
  };
  /* desde ya cuenta como escrito (el siguiente guardado compara con esto) */
  for (const [k, v] of puts) {
    savedText.set(k, v);
    Store.note(k, v);
  }
  for (const k of dels) {
    savedText.delete(k);
    Store.note(k, null);
  }
  if (text != null) {
    savedText.set(core, text);
    Store.note(core, text);
  }
  const drop = dropCount;
  const gen = failGen;
  pendingWrites++;
  const job = async () => {
    /* el estado se borró después de pedir este guardado (se cerró la sesión o entró otra cuenta): ya no hay nada que escribir */
    if (drop != dropCount)
      return true;
    /* un guardado anterior falló después de decidirse este, que daba por escrito lo de aquel: no se escribe (su núcleo
       nombraría partes que no están). Lo suyo ya volvió a contar como estaba, y el siguiente guardado lo mira todo */
    if (gen != failGen)
      return false;
    let step = 'partes';
    try {
      if (puts.length)
        await partsTx('readwrite', st => puts.forEach(([k, v]) => st.put(v, k)));
      /* o se borró mientras se escribían las partes: el borrado, que va detrás de este guardado, se las lleva */
      if (drop != dropCount)
        return true;
      for (const [k, v] of puts)
        written(k, v);
      step = core;
      if (text != null) {
        Store.set(core, text, 1);
        written(core, text);
      }
      /* ya está lo que lee quien abra la app: la marca de que este guardado ha terminado */
      claim();
      step = 'borrar partes';
      if (dels.length) {
        await partsTx('readwrite', st => dels.forEach(k => st.delete(k)));
        if (drop != dropCount)
          return true;
        for (const k of dels)
          written(k);
      }
      failStreak = 0;
      return true;
    }
    catch (e) {
      if (drop != dropCount)
        return true;
      /* todo lo que seguía a medias vuelve a contar como está escrito de verdad: lo de este guardado que no llegó a
         escribirse (cada transacción es todo o nada) y lo de los decididos después, que ya no se escriben (failGen) */
      for (const [k, b] of inFlight)
        if (b)
          savedText.set(k, b.v);
        else
          savedText.delete(k);
      inFlight.clear();
      failGen++;
      if (report)
        saveFailed(step, e);
      allSaved = 0;
      /* se reintenta solo, pero no sin fin (sin espacio seguiría fallando) */
      if (++failStreak <= 3)
        checkLater(5000);
      return false;
    }
  };
  return enqueue(() => job().finally(() => {
    pendingWrites--;
  }));
};
/* las pruebas: ¿cambió alguna parte que la acción no dijo? (se anota en window.__ffHintCheck) */
/** @param {Record<string, any>} s
    @param {Set<string>} parts */
const hintCheck = (s, parts) => {
  try {
    const { out, keys } = splitState(stateToStored(s), null, idb);
    const miss = keys.filter(k => !parts.has(k) && savedText.get(k) !== out[k]);
    if (miss.length)
      /** @type {string[]} */ (window.__ffHintCheck).push(miss.join());
  }
  catch (e) {
    /* solo es una comprobación */
  }
};
/* escribe lo que haya cambiado del estado que da stored() (con las claves guardadas); de las partes, solo las de `want` */
/** @param {() => Record<string, any>} stored
    @param {Set<string> | null} want
    @param {any} report */
const writeSplit = (stored, want, report) => {
  /** @type {StateSplit} */
  let split;
  try {
    split = splitState(stored(), want, idb);
  }
  catch (e) {
    if (report)
      saveFailed(Store.K.app, e);
    return Promise.resolve(false);
  }
  return idb ? writeIdb(split, report) : Promise.resolve(writeLocal(split, report));
};
/** Escribe ya lo que haya cambiado de `s` (el estado S: core/state); de las partes, solo las de `parts` (claves de Store) o, sin
  ellas, todas. Promesa: false si no se pudo guardar.
    @param {Record<string, any>} s
    @param {Set<string> | null} [parts]
    @returns {Promise<boolean>} */
export const writeState = (s, parts) => {
  queued = null;
  queuedParts = null;
  lastState = s;
  /* otra apertura de la app guardó después: esta ya no escribe (pisaría lo de la otra), y se vuelve a avisar. Si aún no lo
     sabe, lo ve al ir a escribir (claim) */
  if (instanceStale) {
    goStale(0);
    return Promise.resolve(false);
  }
  if (saveLocked)
    return Promise.resolve(true);
  if (!allSaved) {
    parts = null;
    allSaved = 1;
  }
  /* un guardado completo, decidido sin otros a medias: si sale bien, todo S está escrito */
  const vouches = !parts && !pendingWrites;
  if (parts && window.__ffHintCheck)
    hintCheck(s, parts);
  else if (parts)
    checkLater();
  else if (checkTimer && !failStreak) {
    clearTimeout(checkTimer);
    checkTimer = 0;
  }
  return writeSplit(() => stateToStored(s), parts || null, 1).then(ok => {
    if (!ok)
      unsaved = 1;
    else {
      if (vouches)
        unsaved = 0;
      /* no queda nada sin escribir: lo que esperaba a eso (lo sincronizado, en cloud/sync) ya puede apuntarse */
      if (!unsaved)
        Store.noteSaved();
    }
    return ok;
  });
};
/** Guarda `s` al terminar la acción en curso: muchas llamadas seguidas se escriben una sola vez (core/state: saveState).
  `parts`: las partes que la acción ha tocado ('core' si ninguna, 'logs', 'hist', mealsPart(día)); sin ellas, todas.
    @param {Record<string, any>} s
    @param {any[]} [parts] */
export const scheduleWrite = (s, parts) => {
  const first = !queued;
  queued = s;
  if (first)
    queuedParts = new Set();
  /* sin partes (o con algo que no lo es, como el evento de quien la usa de manejador), todas */
  if (queuedParts) {
    if (!parts || !parts.length || parts.some(p => typeof p != 'string'))
      queuedParts = null;
    else
      for (const p of parts)
        if (p != 'core')
          queuedParts.add(partKey(p));
  }
  if (first)
    queueMicrotask(() => {
      if (queued)
        writeState(queued, queuedParts);
    });
};
/** Sustituye todo el estado guardado por `s`, con las claves guardadas (restaurar una copia de seguridad), y bloquea los
  guardados hasta recargar. Promesa: true si quedó escrito; si no, false y los guardados vuelven a funcionar (quien llama
  guarda otra vez S: flushState de core/state).
    @param {Record<string, any>} s */
export const replaceSavedState = s => {
  saveLocked = 1;
  queued = null;
  clearTimeout(checkTimer);
  checkTimer = 0;
  return writeSplit(() => s, null, 0).then(ok => {
    if (!ok)
      saveLocked = 0;
    return ok;
  });
};
/** Bloquea los guardados hasta recargar la página. */
export const lockSaves = () => {
  saveLocked = 1;
};
/** Borra el estado guardado (núcleo y partes), sin bloquear los guardados (al entrar con otra cuenta: cloud/session). */
export const dropSavedState = () => {
  dropCount++;
  touchRev();
  Store.del(Store.K.app);
  for (const k of Store.keys(partKey('')))
    Store.del(k);
  savedText.clear();
  inFlight.clear();
  for (const k of Store.keys(Store.K.app + 'aside:'))
    Store.del(k);
  if (idb)
    enqueue(() => Promise.all(['parts', 'aside'].map(n => dbTx(n, 'readwrite', st => st.clear()))).then(() => true, e => {
      logError('borrar las partes', e);
      return false;
    }));
};
/** Borra el estado guardado y bloquea los guardados hasta recargar. */
export const clearSavedState = () => {
  lockSaves();
  dropSavedState();
};
