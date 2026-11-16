/* ═══ core/idb ═══
   IndexedDB con promesas, para lo que la app guarda en el dispositivo fuera de localStorage: las partes del estado
   (core/persist, base «ffdata») y las copias automáticas (system/snapshots, base «ffsnap»).
   idbStore(nombre, almacenes) devuelve tx(almacén, modo, fn), que hace una transacción: fn(almacén) lanza las peticiones y
   devuelve la que interesa (o una lista); la promesa se resuelve con su resultado cuando la transacción termina, es decir,
   con lo escrito ya guardado. La base se abre una vez, la primera que hace falta, creando los almacenes que falten.
   Si la conexión se había perdido (Safari la cierra al volver del fondo), se abre otra y la transacción se repite una vez;
   si lo que falla es el espacio (QuotaExceededError), no se repite.
   Define: idbStore
*/
/** Las transacciones de una base de IndexedDB. `stores`: { nombre del almacén: opciones de createObjectStore, o null }.
    Devuelve tx(almacén, modo, fn): promesa con el resultado de la petición (o de la lista de peticiones) que devuelve fn. */
export const idbStore = (name, stores) => {
  let opening = null;
  /* la base (se abre una vez; si la conexión se pierde, la siguiente transacción abre otra) */
  const open = () => opening || (opening = new Promise((res, rej) => {
    if (!window.indexedDB)
      return rej(new Error('IndexedDB no disponible'));
    const r = indexedDB.open(name, 1);
    r.onupgradeneeded = () => {
      for (const n of Object.keys(stores))
        if (!r.result.objectStoreNames.contains(n))
          r.result.createObjectStore(n, stores[n] || undefined);
    };
    r.onsuccess = () => {
      const db = r.result;
      db.onclose = () => {
        opening = null;
      };
      db.onversionchange = () => {
        db.close();
        opening = null;
      };
      res(db);
    };
    r.onerror = () => rej(r.error || new Error('no se pudo abrir ' + name));
    r.onblocked = () => rej(new Error(name + ' bloqueada'));
  }).catch(e => {
    opening = null;
    throw e;
  }));
  const tx = (store, mode, fn, retry = 1) => open().then(db => new Promise((res, rej) => {
    let t;
    try {
      t = db.transaction(store, mode);
    }
    catch (e) {
      return rej(e);
    }
    let rq;
    t.oncomplete = () => res(Array.isArray(rq) ? rq.map(x => x.result) : rq && rq.result);
    t.onerror = () => rej(t.error || new Error('transacción fallida'));
    t.onabort = () => rej(t.error || new Error('transacción abortada'));
    try {
      rq = fn(t.objectStore(store));
    }
    catch (e) {
      try {
        t.abort();
      }
      catch (x) {
        /* ya terminada */
      }
      return rej(e);
    }
    /* sin esperar a que se vacíe la cola de tareas: así queda escrito aunque se cierre la app justo después */
    if (mode == 'readwrite' && t.commit)
      t.commit();
  })).catch(e => {
    if (!retry || e && e.name == 'QuotaExceededError')
      throw e;
    opening = null;
    return tx(store, mode, fn, 0);
  });
  return tx;
};
