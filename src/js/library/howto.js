/* ═══ library/howto ═══
   Consejo y ejecución de cada ejercicio (F-13, F-14), del catálogo data/exinfo (T-05), que se descarga la primera vez que
   hace falta (core/lazy). Los dos textos son propios de cada ejercicio y no se repiten (tests/exinfo.test.mjs).
   - Tips (en el entreno) y «Consejo» (en la ficha de la librería): el consejo del ejercicio.
   - Cómo se hace: solo al tocar la imagen del ejercicio (la miniatura del entreno o la imagen de la ficha), en su hoja:
     arriba, la imagen en grande (el modelo 3D haciendo el ejercicio: extras/pictures pone su sitio y extras/figure3d la
     dibuja; uno propio, sus músculos); debajo, a la izquierda, sus músculos en pequeño, con el nombre; y después, el texto.
   Los ejercicios propios no están en el catálogo: su consejo es el de su grupo muscular y no tienen hoja de ejecución.
   Define: GROUP_TIPS, info, setExInfo, withExInfo, exTip, exHow, stillFigures, howHead, howSheet  · acciones/registros: 1
*/
import { logError } from '../core/errors.js';
import { A } from '../core/registry.js';
import { toast } from '../core/toast.js';
import { loadExInfo } from '../core/lazy.js';
import { groupOf } from '../data/library.js';
import { sheet, sheetToTop } from '../core/ui.js';
import { S } from '../core/state.js';
import { exAll, exByName, exMuscles, liveName } from './model.js';
import { exAnatomy, exMusclesSmall } from '../extras/anatomy.js';
import { exMotion } from '../extras/pictures.js';
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
  const x = info.get(liveName(n));
  if (x)
    return x.t;
  const e = exByName(n);
  return GROUP_TIPS[e ? groupOf(e) : 'Propio'] || GROUP_TIPS.Propio;
};
const exHow = n => (info && info.get(liveName(n)) || {}).h || '';
/* ¿las figuras, quietas? Con «Reducir animaciones» de Ajustes o si el móvil pide menos movimiento */
const stillFigures = () => !!S.reduceMotion || typeof matchMedia == 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/* bajo la imagen grande: a la izquierda, los músculos en pequeño (de frente y de espaldas); a su lado, el nombre y cuáles son */
const howHead = n => {
  const e = exByName(n);
  const small = exMusclesSmall(n);
  const line = (k, label, cls) => e && exMuscles(e, k).length ? html`
    <p class="howto-muscles"><i class="${cls}"></i><b>${label}</b> ${exMuscles(e, k).join(', ')}</p>` : '';
  return small ? html`
    <div class="howto-head">
      ${small}
      <div class="fx-1 minw-0">
        <h3 class="howto-title">${n}</h3>
        ${line('p', 'Principal', 'bg-grad-red')}
        ${line('s', 'Secundario', 'bg-grad-amber')}
      </div>
    </div>
  ` : html`<h3 class="howto-title">${n}</h3>`;
};
/** Hoja de la ejecución; `back`, la vuelta a la ficha de la librería (si se abrió desde ella); si no, un enlace a la ficha.
    La imagen grande es el modelo haciendo el ejercicio; en un ejercicio propio, que no tiene postura, sus músculos. */
const howSheet = (n, back) => {
  const top = exMotion(n, stillFigures());
  return html`
    ${raw(back || '')}
    ${raw(top || html`<div class="howto-anatomy">${raw(exAnatomy(n, 132))}</div>`)}
    ${top ? howHead(n) : html`<h3 class="howto-title">${n}</h3>`}
    <div class="section-label">Cómo se hace</div>
    <p class="howto-text">${exHow(n) || 'Es un ejercicio tuyo: muévete con control, en todo el recorrido que tu técnica permita.'}</p>
    ${raw(back || !exAll().some(e => e.n == n) ? '' : html`
      <button data-a="exerciseDetailByName" data-n="${n}" class="w-full mt-6">Ver la ficha del ejercicio</button>`)}`;
};
/* — manejadores de esta función (registros A / C / U) — */
/* al tocar la imagen del ejercicio (F-14): su ejecución; desde la ficha de la librería, con vuelta a la ficha (data-i) */
A.exerciseHowTo = (i, b) => {
  const n = b.dataset.n;
  const back = b.dataset.i != null && b.dataset.i !== '' ? html`
    <div class="row">
      <button data-a="exerciseDetail" data-i="${b.dataset.i}" aria-label="Volver a la ficha" class="bd-0 bg-none fs-24 p-6-10">←</button>
    </div>` : '';
  withExInfo(() => {
    sheet(howSheet(n, back));
    sheetToTop();
  });
};
