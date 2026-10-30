/* ═══ system/snapshots ═══
   Copias automáticas en este dispositivo (IndexedDB «ffsnap»): como mucho una al día; se guardan las 7 últimas.
   Sirven para deshacer un error propio (borrar algo, restaurar una copia equivocada). No sustituyen a la copia en
   archivo: si el navegador borra los datos de la app, también se borran estas.
   Define: SNAP_KEEP, snapDbPromise, snapDb, snapTx, snapList, takeSnapshot, snapshotRows, fillSnapshots  · acciones/registros: 1
*/
const SNAP_KEEP = 7;
let snapDbPromise = null;
const snapDb = () => snapDbPromise || (snapDbPromise = new Promise((res, rej) => {
  if (!window.indexedDB)
    return rej(new Error('IndexedDB no disponible'));
  const r = indexedDB.open('ffsnap', 1);
  r.onupgradeneeded = () => {
    if (!r.result.objectStoreNames.contains('s'))
      r.result.createObjectStore('s', { keyPath: 'd' });
  };
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error || new Error('no se pudo abrir ffsnap'));
  r.onblocked = () => rej(new Error('ffsnap bloqueada'));
}).catch(e => {
  snapDbPromise = null;
  throw e;
}));
/** Ejecuta fn(almacén) en una transacción; devuelve el resultado de la petición que fn devuelva. */
const snapTx = (mode, fn) => snapDb().then(db => new Promise((res, rej) => {
  const tx = db.transaction('s', mode);
  let rq;
  tx.oncomplete = () => res(rq ? rq.result : undefined);
  tx.onerror = () => rej(tx.error);
  tx.onabort = () => rej(tx.error);
  rq = fn(tx.objectStore('s'));
}));
/** Copias guardadas, de la más reciente a la más antigua. */
const snapList = () => snapTx('readonly', st => st.getAll()).then(a => (a || []).sort((x, y) => x.d < y.d ? 1 : -1));
/** Guarda la copia de hoy si aún no existe (y si hay algo que guardar) y borra las que sobran. Devuelve 1 si guardó. */
const takeSnapshot = async () => {
  if (!S.logs.length && !(S.cr || []).length && !(S.cp || []).length && !countOf(S.meals) && !(S.wl || []).length)
    return 0;
  const d = dayKey(new Date());
  const all = await snapList();
  if (all.some(x => x.d == d))
    return 0;
  const data = buildBackup();
  await snapTx('readwrite', st => st.put({ d, t: Date.now(), v: APPV, n: S.logs.length, data }));
  const extra = all.slice(SNAP_KEEP - 1);
  if (extra.length)
    await snapTx('readwrite', st => {
      let q;
      extra.forEach(x => {
        q = st.delete(x.d);
      });
      return q;
    });
  return 1;
};
const snapshotRows = l => l.length ? l.map(x => '<div class="row" style="padding:8px 0;border-top:1px solid var(--ln)"><span><b>' + X(backupDate(x.t, 1)) + '</b><br><small class="mu">' + plural(x.n || 0, 'entreno', 'entrenos') + ' · versión ' + X(x.v || '') + '</small></span><button data-a="snapr" data-v="' + X(x.d) + '">Restaurar</button></div>').join('') : '<p class="mu" style="font-size:13px;margin:8px 0 0">Todavía no hay copias automáticas. Se hace una al día cuando abres la app.</p>';
/** Rellena la lista de copias automáticas de la hoja de copia de seguridad (se carga aparte porque IndexedDB es asíncrono). */
const fillSnapshots = () => snapList().then(l => {
  const e = $('#snapl');
  if (e)
    e.innerHTML = snapshotRows(l);
}).catch(err => {
  const e = $('#snapl');
  if (e)
    e.innerHTML = '<p class="mu" style="font-size:13px;margin:8px 0 0">Este navegador no permite guardar copias automáticas.</p>';
  logError('copias automáticas', err);
});
/* — manejadores de esta función (registros A / C / U) — */
A.snapr = (i, b) => {
  const d = b.dataset.v;
  snapTx('readonly', st => st.get(d)).then(x => {
    if (x && x.data)
      askRestore(x.data);
    else
      toast('No se encuentra esa copia');
  }).catch(err => {
    logError('restaurar copia automática', err);
    toast('No se pudo leer la copia');
  });
};
