/* ═══ core/lazy ═══
   Carga diferida: lo poco usado (temporizador WOD, exportar a CSV, escáner y búsqueda en Open Food Facts) va en archivos
   aparte que se descargan la primera vez que se abren (el service worker los guarda para usarlos sin conexión).
   Hasta entonces, los botones que lo abren tienen aquí un manejador provisional: carga el módulo, que registra los de
   verdad, y repite la acción. En el archivo único todo va dentro y carga al instante.
   Define: lazyAction
*/
import { logError } from './errors.js';
import { toast } from './toast.js';
import { A } from './registry.js';
/** Registra en A las acciones `names` de un módulo que carga `load()` la primera vez que se usa una de ellas. */
const lazyAction = (load, names) => names.forEach(n => {
  const stub = (...args) => load().then(() => {
    if (A[n] === stub)
      throw new Error('el módulo no registra la acción ' + n);
    return A[n](...args);
  }).catch(e => {
    logError('abrir ' + n, e);
    toast('No se ha podido abrir. Comprueba la conexión e inténtalo de nuevo.');
  });
  A[n] = stub;
});
lazyAction(() => import('../extras/wod.js'), ['wod']);
lazyAction(() => import('../extras/csv.js'), ['f2ex']);
lazyAction(() => import('../extras/foods-online.js'), ['f2os', 'f2sc']);
