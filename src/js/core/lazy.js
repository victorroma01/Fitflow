/* ═══ core/lazy ═══
   Carga diferida: lo poco usado (temporizador WOD, exportar a CSV, escáner y búsqueda en Open Food Facts, análisis mensual
   y PDF) va en archivos aparte que se descargan la primera vez que se abren (el service worker los guarda para usarlos sin
   conexión).
   Hasta entonces, los botones que lo abren tienen aquí un manejador provisional: carga el módulo, que registra los de
   verdad, y repite la acción. En el archivo único todo va dentro y carga al instante. Si la descarga tarda, se dice
   «Cargando…»; si falla, se avisa y la siguiente vez se vuelve a pedir (lazyLoad).
   Define: SLOW_LOAD, loadedModules, failedUrls, failedUrl, lazyLoad, lazyAction, pdfMaker, setPdfMaker, loadPdf, loadExInfo
*/
import { logError } from './errors.js';
import { toast } from './toast.js';
import { A } from './registry.js';
/* milisegundos de espera antes de decir «Cargando…» */
const SLOW_LOAD = 500;
/* módulos ya cargados y direcciones de los que fallaron al descargarse, por nombre */
const loadedModules = new Map();
const failedUrls = new Map();
/* la dirección del archivo que no se pudo descargar: viene en el mensaje del error («Failed to fetch dynamically imported
   module: https://…/wod-XXXX.js») */
const failedUrl = e => (/(https?:\/\/[^\s'"]+\.js)/.exec(e && e.message || '') || [])[1] || '';
/** Carga el módulo diferido `key` con `load` (un import()). Chrome recuerda el fallo de un import() y no vuelve a pedir ese
    archivo mientras la página siga abierta, así que «inténtalo de nuevo» no serviría: si la vez anterior falló la descarga,
    se pide con otra dirección (el mismo archivo, con ?r=…). */
const lazyLoad = (key, load) => {
  if (loadedModules.has(key))
    return Promise.resolve(loadedModules.get(key));
  const again = failedUrls.get(key);
  return (again ? import(again + '?r=' + Date.now()) : load()).then(m => {
    loadedModules.set(key, m);
    return m;
  }, e => {
    const u = failedUrl(e).split('?')[0];
    if (u)
      failedUrls.set(key, u);
    throw e;
  });
};
/** Registra en A las acciones `names` del módulo `key`, que carga `load()` la primera vez que se usa una de ellas. */
const lazyAction = (key, load, names) => names.forEach(n => {
  const stub = (...args) => {
    /* si tarda (la primera vez, con poca cobertura), se dice que está cargando: si no, el botón parece no hacer nada */
    const slow = setTimeout(() => toast('Cargando…'), SLOW_LOAD);
    return lazyLoad(key, load).then(() => {
      clearTimeout(slow);
      if (A[n] === stub)
        throw new Error('el módulo no registra la acción ' + n);
      return A[n](...args);
    }).catch(e => {
      clearTimeout(slow);
      logError('abrir ' + n, e);
      toast('No se ha podido abrir. Comprueba la conexión e inténtalo de nuevo.');
    });
  };
  A[n] = stub;
});
lazyAction('wod', () => import('../extras/wod.js'), ['openWod']);
lazyAction('csv', () => import('../extras/csv.js'), ['openCsvExport']);
lazyAction('foods', () => import('../extras/foods-online.js'), ['searchFoodOnline', 'openScanner']);
lazyAction('analysis', () => import('../profile/analysis.js'), ['openAnalysis']);
/* lo que crea los PDF: system/pdf lo deja aquí al cargarse */
let pdfMaker = null;
/** system/pdf se apunta aquí al cargarse. */
export const setPdfMaker = f => {
  pdfMaker = f;
};
/** La función que crea un PDF (system/pdf, pdfDoc), que se descarga al pedir el primero (análisis mensual). */
export const loadPdf = () => lazyLoad('pdf', () => import('../system/pdf.js')).then(() => pdfMaker);
/** Catálogo de consejos y ejecución de los ejercicios (data/exinfo, unos 200 KB): se descarga la primera vez que hace falta. */
export const loadExInfo = () => lazyLoad('exinfo', () => import('../data/exinfo.js'));
