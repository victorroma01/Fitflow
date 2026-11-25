/* ═══ core/lazy ═══
   Carga diferida: lo poco usado (temporizador WOD, exportar a CSV, escáner y búsqueda en Open Food Facts, análisis mensual
   y PDF) y lo que pesa (los consejos de los ejercicios y el motor de sus figuras 3D) va en archivos aparte que se descargan
   la primera vez que hacen falta (el service worker los guarda para usarlos sin conexión).
   Hasta entonces, los botones que lo abren tienen aquí un manejador provisional: carga el módulo, que registra los de
   verdad, y repite la acción. En el archivo único todo va dentro y carga al instante. Si la descarga tarda, se dice
   «Cargando…»; si falla, se avisa y la siguiente vez se vuelve a pedir (lazyLoad).
   También el inglés (i18n/en-*.js): solo se descarga con la app en inglés, antes del primer pintado (loadEnglish).
   Define: SLOW_LOAD, loadedModules, failedUrls, failedUrl, importedUrl, lazyLoad, lazyAction, pdfMaker, setPdfMaker, loadPdf, loadExInfo, figureTools, setFigureTools, loadFigures, loadEnglish
*/
import { LANG } from './util.js';
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
/* y si el error no la trae (Safari solo dice «Importing a module script failed.»), la de lo que `load` iba a importar, leída
   de su propio texto («() => import("./wod-XXXX.js")»): los archivos de código van todos en la carpeta del principal */
const importedUrl = load => {
  const spec = /import\(\s*["'`]([^"'`]+\.js)["'`]\s*\)/.exec(String(load));
  const main = /** @type {HTMLScriptElement | null} */ (document.querySelector('script[type=module][src]'));
  try {
    return spec && main ? new URL(spec[1], main.src).href : '';
  }
  catch (e) {
    return '';
  }
};
/** Carga el módulo diferido `key` con `load` (un import()). El navegador recuerda el fallo de un import() y no vuelve a pedir
    ese archivo mientras la página siga abierta, así que «inténtalo de nuevo» no serviría: si la vez anterior falló la
    descarga, se pide con otra dirección (el mismo archivo, con ?r=…). */
const lazyLoad = (key, load) => {
  if (loadedModules.has(key))
    return Promise.resolve(loadedModules.get(key));
  const again = failedUrls.get(key);
  return (again ? import(again + '?r=' + Date.now()) : load()).then(m => {
    loadedModules.set(key, m);
    return m;
  }, e => {
    const u = (failedUrl(e) || importedUrl(load)).split('?')[0];
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
/** Catálogo de consejos y ejecución de los ejercicios (data/exinfo, unos 200 KB; con la app en inglés, el suyo, i18n/en-exinfo):
    se descarga la primera vez que hace falta. */
export const loadExInfo = () => LANG == 'en' ? lazyLoad('en-exinfo', () => import('../i18n/en-exinfo.js')) : lazyLoad('exinfo', () => import('../data/exinfo.js'));
/* lo que dibuja las figuras 3D: extras/figure3d lo deja aquí al cargarse */
let figureTools = null;
/** extras/figure3d se apunta aquí al cargarse, con lo que dibuja la miniatura de un ejercicio (thumb) y lo que pone en marcha
    las figuras grandes de la hoja (stages). */
export const setFigureTools = (thumb, stages) => {
  figureTools = { thumb, stages };
};
/** Las figuras 3D: el motor (extras/motor3d, unos 340 KB), los encuadres ya calculados (data/figboxes) y lo que dibuja con
    ellos (extras/figure3d), que se descargan la primera vez que hace falta dibujar una figura. Da lo que deja
    extras/figure3d: thumb (la miniatura de un ejercicio, como imagen) y stages (las figuras grandes de la hoja). */
export const loadFigures = () => Promise.all([
  lazyLoad('motor3d', () => import('../extras/motor3d.js')),
  lazyLoad('figboxes', () => import('../data/figboxes.js')),
  lazyLoad('figure3d', () => import('../extras/figure3d.js')),
]).then(() => figureTools);
/** El inglés (core/i18n): sus módulos, que se apuntan en el diccionario al cargarse. Los consejos de los ejercicios en inglés
    (i18n/en-exinfo) van aparte, con loadExInfo. */
export const loadEnglish = () => Promise.all([
  lazyLoad('en-ui', () => import('../i18n/en-ui.js')),
  lazyLoad('en-more', () => import('../i18n/en-more.js')),
  lazyLoad('en-library', () => import('../i18n/en-library.js')),
  lazyLoad('en-foods', () => import('../i18n/en-foods.js')),
  lazyLoad('en-programs', () => import('../i18n/en-programs.js')),
]);
