/* ═══ library/howto ═══
   Consejo y ejecución de cada ejercicio (F-13, F-14), del catálogo data/exinfo (T-05), que se descarga la primera vez que
   hace falta (core/lazy). Los dos textos son propios de cada ejercicio y no se repiten (tests/exinfo.test.mjs).
   - Tips (en el entreno) y «Consejo» (en la ficha de la librería): el consejo del ejercicio.
   - Cómo se hace: solo al tocar la imagen del ejercicio (la miniatura del entreno o la imagen de la ficha), en su hoja.
   Los ejercicios propios no están en el catálogo: su consejo es el de su grupo muscular y no tienen hoja de ejecución.
   Define: GROUP_TIPS, info, setExInfo, withExInfo, exTip, exHow, exImage, howSheet  · acciones/registros: 1
*/
import { X } from '../core/util.js';
import { logError } from '../core/errors.js';
import { A } from '../core/registry.js';
import { toast } from '../core/toast.js';
import { loadExInfo } from '../core/lazy.js';
import { groupOf } from '../data/library.js';
import { sheet, sheetToTop } from '../core/ui.js';
import { exAll } from './model.js';
import { exHero } from './photo.js';
import { exAnatomy } from '../extras/anatomy.js';
import { html, raw } from '../core/html.js';
/* consejo de los ejercicios propios (no están en el catálogo), según su grupo */
const GROUP_TIPS = { Pecho: 'Junta las escápulas y baja hasta notar el estiramiento del pecho.', Espalda: 'Inicia el gesto llevando los codos atrás, sin tirar con los bíceps.', Hombros: 'Evita encoger los hombros y mantén el core apretado.', 'Bíceps': 'Codos pegados al cuerpo y sin balanceo.', 'Tríceps': 'Codos fijos y extensión completa.', Antebrazos: 'Agarre firme y recorrido completo.', Abdomen: 'Redondea la columna y exhala al contraer.', 'Cuádriceps': 'Rodillas alineadas con las puntas de los pies.', 'Isquios y glúteos': 'Cadera atrás y aprieta el glúteo arriba.', Gemelos: 'Pausa de 1 s arriba y estiramiento completo abajo.', CrossFit: 'Prioriza la técnica antes que la velocidad.', Hyrox: 'Gestiona el ritmo: sal al 80 % de tu esfuerzo.', Funcional: 'Controla el movimiento y activa el core.', Cardio: 'Mantén un ritmo constante y respira por el ritmo, no por la prisa.', Propio: 'Muévete con control y en todo el recorrido que tu técnica permita.' };
/** Catálogo cargado: nombre → { t: consejo, h: cómo se hace } (null hasta que llega data/exinfo). */
let info = null;
/** Lo llama data/exinfo al cargarse: una línea por ejercicio, «Nombre|consejo|cómo se hace». */
export const setExInfo = src => {
  info = new Map(src.trim().split('\n').map(l => {
    const [n, t, h] = l.split('|');
    return [n, { t, h }];
  }));
};
/** Ejecuta `f` con el catálogo cargado (la primera vez lo descarga; sin conexión, avisa). */
export const withExInfo = f => {
  if (info)
    return f();
  loadExInfo().then(f).catch(e => {
    logError('cargar el catálogo de ejercicios', e);
    toast('No se ha podido cargar. Comprueba la conexión e inténtalo de nuevo.');
  });
};
/** Consejo del ejercicio (o el de su grupo si no está en el catálogo, como los propios); '' si el catálogo aún no ha llegado. */
export const exTip = n => {
  if (!info)
    return '';
  const x = info.get(n);
  if (x)
    return x.t;
  const e = exAll().find(y => y.n == n);
  return GROUP_TIPS[e ? groupOf(e) : 'Propio'] || GROUP_TIPS.Propio;
};
const exHow = n => (info && info.get(n) || {}).h || '';
/** Imagen del ejercicio que se puede tocar para ver cómo se hace: la foto si la hay; si no, la figura anatómica. */
const exImage = n => exHero(n) || html`<div class="hwa">${raw(exAnatomy(n, 132))}</div>`;
/** Hoja de la ejecución; `back`, la vuelta a la ficha de la librería (si se abrió desde ella); si no, un enlace a la ficha. */
const howSheet = (n, back) => html`${raw(back || '')}${raw(exImage(n))}<h3 class="hwt">${n}</h3><div class="ph">Cómo se hace</div><p class="hwp">${exHow(n) || 'Es un ejercicio tuyo: muévete con control, en todo el recorrido que tu técnica permita.'}</p>${raw(back || !exAll().some(e => e.n == n) ? '' : html`<button data-a="exerciseDetailByName" data-n="${n}" style="width:100%;margin-top:6px">Ver la ficha del ejercicio</button>`)}`;
/* — manejadores de esta función (registros A / C / U) — */
/* al tocar la imagen del ejercicio (F-14): su ejecución; desde la ficha de la librería, con vuelta a la ficha (data-i) */
A.exerciseHowTo = (i, b) => {
  const n = b.dataset.n;
  const back = b.dataset.i != null && b.dataset.i !== '' ? '<div class="row"><button data-a="exerciseDetail" data-i="' + X(b.dataset.i) + '" aria-label="Volver a la ficha" style="border:0;background:none;font-size:24px;padding:6px 10px">←</button></div>' : '';
  withExInfo(() => {
    sheet(howSheet(n, back));
    sheetToTop();
  });
};
