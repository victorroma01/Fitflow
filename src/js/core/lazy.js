/* ═══ core/lazy ═══
   Carga diferida: lo poco usado (temporizador WOD, exportar a CSV, escáner y búsqueda en Open Food Facts, análisis mensual
   y PDF) va en archivos aparte que se descargan la primera vez que se abren (el service worker los guarda para usarlos sin
   conexión).
   Hasta entonces, los botones que lo abren tienen aquí un manejador provisional: carga el módulo, que registra los de
   verdad, y repite la acción. En el archivo único todo va dentro y carga al instante.
   Define: lazyAction, pdfMaker, setPdfMaker, loadPdf, loadExInfo
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
lazyAction(() => import('../extras/wod.js'), ['openWod']);
lazyAction(() => import('../extras/csv.js'), ['openCsvExport']);
lazyAction(() => import('../extras/foods-online.js'), ['searchFoodOnline', 'openScanner']);
lazyAction(() => import('../profile/analysis.js'), ['openAnalysis']);
/* lo que crea los PDF: system/pdf lo deja aquí al cargarse */
let pdfMaker = null;
/** system/pdf se apunta aquí al cargarse. */
export const setPdfMaker = f => {
  pdfMaker = f;
};
/** La función que crea un PDF (system/pdf, pdfDoc), que se descarga al pedir el primero (análisis mensual). */
export const loadPdf = () => import('../system/pdf.js').then(() => pdfMaker);
/** Catálogo de consejos y ejecución de los ejercicios (data/exinfo, unos 200 KB): se descarga la primera vez que hace falta. */
export const loadExInfo = () => import('../data/exinfo.js');
