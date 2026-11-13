/* ═══ system/snapshots ═══
   Copias automáticas en este dispositivo (IndexedDB «ffsnap»): como mucho una al día (al abrir la app o al volver a ella otro
   día); se guardan las 7 últimas.
   Sirven para deshacer un error propio (borrar algo, restaurar una copia equivocada). No sustituyen a la copia en
   archivo: si el navegador borra los datos de la app, también se borran estas.
   Define: SNAP_KEEP, snapDb, snapTx, snapList, takeSnapshot, snapDay, dailySnapshot, startSnapshots, snapshotRows, fillSnapshots  · acciones/registros: 1
*/
import { $, APPV, dayKey } from '../core/util.js';
import { toast } from '../core/toast.js';
import { logError } from '../core/errors.js';
import { idbStore } from '../core/idb.js';
import { A } from '../core/registry.js';
import { S } from '../core/state.js';
import { askRestore, backupDate, buildBackup, countOf, plural } from './backup.js';
import { html, raw } from '../core/html.js';
const SNAP_KEEP = 7;
/* la base de las copias (core/idb): un almacén, con una copia por día (la clave es la fecha) */
const snapDb = idbStore('ffsnap', { s: { keyPath: 'd' } });
/** Ejecuta fn(almacén) en una transacción sobre las copias; devuelve el resultado de la petición que fn devuelva. */
export const snapTx = (mode, fn) => snapDb('s', mode, fn);
/** Copias guardadas, de la más reciente a la más antigua. */
export const snapList = () => snapTx('readonly', st => st.getAll()).then(a => (a || []).sort((x, y) => x.d < y.d ? 1 : -1));
/** Guarda la copia de hoy si aún no existe (y si hay algo que guardar) y borra las que sobran. Devuelve 1 si guardó. */
export const takeSnapshot = async () => {
  if (!S.logs.length && !(S.routines || []).length && !(S.ownPrograms || []).length && !countOf(S.meals) && !(S.weightLog || []).length)
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
/* el día de la última copia que se intentó: como mucho, un intento al día */
let snapDay = '';
/* la copia de hoy, si hoy aún no se ha intentado */
const dailySnapshot = () => {
  const d = dayKey(new Date());
  if (snapDay == d)
    return;
  snapDay = d;
  takeSnapshot().catch(e => {
    snapDay = '';
    logError('copia automática', e);
  });
};
/** Al arrancar con sesión (core/boot, tras pintar): la copia de hoy, a los 4 s, y después cada vez que se vuelve a la app otro
    día. Instalada, la app puede seguir abierta de un día para otro: antes, ese día se quedaba sin copia. */
export const startSnapshots = () => {
  setTimeout(dailySnapshot, 4000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState == 'visible')
      dailySnapshot();
  });
};
const snapshotRows = l => l.length ? l.map(x => html`<div class="row p-8-0 bdt-1-solid-ln"><span><b>${backupDate(x.t, 1)}</b><br><small class="mu">${raw(plural(x.n || 0, 'entreno', 'entrenos'))} · versión ${x.v || ''}</small></span><button data-a="snapshotRestore" data-v="${x.d}">Restaurar</button></div>`).join('') : '<p class="mu fs-13 m-8-0-0">Todavía no hay copias automáticas. Se hace una al día cuando abres la app.</p>';
/** Rellena la lista de copias automáticas de la hoja de copia de seguridad (se carga aparte porque IndexedDB es asíncrono). */
export const fillSnapshots = () => snapList().then(l => {
  const e = $('#snapl');
  if (e)
    e.innerHTML = snapshotRows(l);
}).catch(err => {
  const e = $('#snapl');
  if (e)
    e.innerHTML = '<p class="mu fs-13 m-8-0-0">Este navegador no permite guardar copias automáticas.</p>';
  logError('copias automáticas', err);
});
/* — manejadores de esta función (registros A / C / U) — */
A.snapshotRestore = (i, b) => {
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
