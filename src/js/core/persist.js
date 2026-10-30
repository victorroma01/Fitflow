/* ═══ core/persist ═══
   Guardado del estado S en el dispositivo, por partes.
   El núcleo de S (ajustes, plan, programas, peso…) va en la clave `ff`, y las colecciones que más crecen van aparte:
   `ff:logs` (entrenos), `ff:hist` (historial por ejercicio) y las comidas, una clave por mes (`ff:meals:2026-10`).
   En el núcleo, cada colección apartada queda con el nombre de su clave ("logs": "ff:logs"), así se sabe qué hay que
   leer y el orden de las claves de S se conserva.
   Cada guardado escribe solo las claves que han cambiado, y todos los saveState() de una misma acción se agrupan en
   uno solo al terminar la acción (queueMicrotask: siempre antes de que la página pueda recargarse o cerrarse).
   Los datos de la 1.20 y anteriores (todo S en `ff`) se leen igual y pasan a partes en el primer guardado; si no hay
   espacio para hacerlo, se sigue guardando entero, como antes, y se reintenta en el próximo arranque.
   Define: STATE_PARTS, partKey, stateRecovered, savedFormat, savedText, saveQueued, saveLocked, partsFailed, lastKey, splitState, readPart, loadSavedState, writeKeys, writeWhole, flushState, saveState, replaceSavedState, lockSaves, clearSavedState
*/
/** Colecciones de S que se guardan en su propia clave (las comidas, además, una clave por mes). */
const STATE_PARTS = ['logs', 'hist', 'meals'];
/** Clave de una parte: partKey('logs') → 'ff:logs'; partKey('') es el prefijo común. */
const partKey = k => Store.K.app + ':' + k;
/** Al arrancar: 1 si el núcleo estaba dañado (se empezó de cero, conservando las partes legibles), 2 si solo lo estaba
  alguna parte. Lo dañado queda apartado en Store.K.bad y core/boot avisa. */
let stateRecovered = 0;
/** Cómo está guardado S ahora: '' nada (o un núcleo dañado), 'whole' entero en `ff` (1.20 y anteriores), 'parts' por partes. */
let savedFormat = '';
/** Texto escrito en cada clave del estado según la última lectura o escritura (null: la clave existe, contenido sin leer). */
const savedText = new Map();
let saveQueued = 0;
/** 1 tras restaurar una copia o borrarlo todo: nada de lo pendiente debe pisar lo escrito antes de recargar. */
let saveLocked = 0;
/** 1 si en esta sesión no hubo espacio para pasar a partes: se guarda entero, como la 1.20. */
let partsFailed = 0;
/** Clave que se estaba escribiendo (para el registro de errores si falla). */
let lastKey = '';
/** El objeto `s` dividido en claves de Store: { clave: texto JSON }. El núcleo lleva la marca _parts. */
const splitState = s => {
  const out = {};
  const core = {};
  for (const k in s) {
    const v = s[k];
    if (!STATE_PARTS.includes(k) || !v || typeof v != 'object' || (k == 'logs') != Array.isArray(v)) {
      core[k] = v;
      continue;
    }
    core[k] = partKey(k);
    if (k != 'meals') {
      out[partKey(k)] = JSON.stringify(v);
      continue;
    }
    const months = {};
    for (const d in v) {
      const m = /^\d{4}-\d\d-\d\d$/.test(d) ? d.slice(0, 7) : 'otros';
      (months[m] = months[m] || {})[d] = v[d];
    }
    for (const m in months)
      out[partKey('meals:' + m)] = JSON.stringify(months[m]);
  }
  core._parts = 1;
  out[Store.K.app] = JSON.stringify(core);
  return out;
};
/** Texto de una parte → su valor (lista para `logs`, objeto para el resto), o undefined si falta o está dañada. */
const readPart = (k, raw) => {
  try {
    const v = JSON.parse(raw);
    if (v && typeof v == 'object' && (k == 'logs') == Array.isArray(v))
      return v;
  }
  catch (e) {
    /* dañada: quien llama la aparta */
  }
  return undefined;
};
/** Estado guardado ({} si no hay nada). Si el núcleo está dañado, se aparta en Store.K.bad y se empieza de cero
  conservando las partes que se puedan leer; si lo está una parte, se aparta esa parte y se deja vacía. */
const loadSavedState = () => {
  let raw;
  try {
    raw = Store.get(Store.K.app);
    for (const k of Store.keys(partKey('')))
      savedText.set(k, null);
  }
  catch (e) {
    logError('leer estado', e);
    return {};
  }
  const bad = {};
  let core = null;
  if (raw != null) {
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
  if (core && !core._parts) {
    savedFormat = 'whole';
    return core;
  }
  if (!core && !salvage)
    return {};
  if (core) {
    savedFormat = 'parts';
    delete core._parts;
  }
  else
    core = {};
  const keys = [...savedText.keys()];
  for (const k of STATE_PARTS) {
    const shards = k == 'meals' ? keys.filter(x => x.startsWith(partKey('meals:'))).sort() : [partKey(k)];
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
  const badKeys = Object.keys(bad);
  if (badKeys.length) {
    stateRecovered = salvage ? 1 : 2;
    try {
      Store.set(Store.K.bad, JSON.stringify({ t: Date.now(), k: badKeys.join(), raw: badKeys.length == 1 ? String(bad[badKeys[0]]) : JSON.stringify(bad) }));
    }
    catch (x) {
      logError('apartar estado dañado', x);
    }
  }
  return core;
};
/** Deja guardado exactamente `next`: escribe las claves que cambian, borra las partes que sobran y escribe el núcleo al
  final (si algo falla a medias, el núcleo anterior sigue apuntando a partes completas). Lanza el error de Store. */
const writeKeys = next => {
  const core = Store.K.app;
  for (const k in next)
    if (k != core && savedText.get(k) !== next[k]) {
      lastKey = k;
      Store.set(k, next[k]);
      savedText.set(k, next[k]);
    }
  for (const k of [...savedText.keys()])
    if (k != core && !(k in next)) {
      lastKey = k;
      Store.del(k);
      savedText.delete(k);
    }
  if (savedText.get(core) !== next[core]) {
    lastKey = core;
    Store.set(core, next[core]);
    savedText.set(core, next[core]);
  }
};
/** Guarda `s` entero en `ff`, como la 1.20. Antes borra las partes, que en este formato no se leen. Lanza el error de Store. */
const writeWhole = s => {
  for (const k of [...savedText.keys()])
    if (k != Store.K.app) {
      lastKey = k;
      Store.del(k);
      savedText.delete(k);
    }
  const t = JSON.stringify(s);
  lastKey = Store.K.app;
  if (savedText.get(Store.K.app) !== t) {
    Store.set(Store.K.app, t);
    savedText.set(Store.K.app, t);
  }
  savedFormat = 'whole';
};
/** Escribe ya los cambios de S (saveState lo hace solo al terminar la acción). Devuelve false si no se pudo guardar. */
const flushState = () => {
  saveQueued = 0;
  if (saveLocked)
    return true;
  let next;
  try {
    next = splitState(S);
  }
  catch (e) {
    saveFailed(Store.K.app, e);
    return false;
  }
  if (savedFormat != 'parts' && !partsFailed)
    try {
      writeKeys(next);
      savedFormat = 'parts';
      return true;
    }
    catch (e) {
      partsFailed = 1;
      logError('pasar a guardado por partes (' + lastKey + ')', e);
    }
  try {
    if (savedFormat == 'parts')
      writeKeys(next);
    else
      writeWhole(S);
    return true;
  }
  catch (e) {
    saveFailed(lastKey, e);
    return false;
  }
};
/** Guarda S. Se puede llamar muchas veces seguidas: se escribe una sola vez, al terminar la acción en curso. */
const saveState = () => {
  if (saveQueued)
    return;
  saveQueued = 1;
  queueMicrotask(flushState);
};
/** Sustituye todo el estado guardado por `s` (restaurar una copia de seguridad). Si falla, lanza el error: quien llama
  deshace con flushState(), que vuelve a escribir S. Si va bien, quien llama bloquea los guardados y recarga. */
const replaceSavedState = s => {
  if (!partsFailed)
    try {
      writeKeys(splitState(s));
      savedFormat = 'parts';
      return;
    }
    catch (e) {
      if (savedFormat == 'parts')
        throw e;
      partsFailed = 1;
      logError('pasar a guardado por partes (' + lastKey + ')', e);
    }
  writeWhole(s);
};
/** Bloquea los guardados hasta recargar la página. */
const lockSaves = () => {
  saveLocked = 1;
};
/** Borra el estado guardado (núcleo y partes) y bloquea los guardados hasta recargar. */
const clearSavedState = () => {
  lockSaves();
  Store.del(Store.K.app);
  for (const k of Store.keys(partKey('')))
    Store.del(k);
  savedText.clear();
};
