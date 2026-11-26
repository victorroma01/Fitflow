/* ═══ workout/images ═══
   Portadas de los días y su selector. Un día lleva la portada de su nombre (data/photos: DAY_PHOTO_RULES) o, si el nombre no
   dice nada (un Full Body, un día propio), la de su primer ejercicio (la de su grupo o, en CrossFit, Hyrox, funcional y
   cardio, la del ejercicio si tiene una suya: EXERCISE_PHOTO_RULES) sin repetir la de otro día así de la semana. Un workout
   personalizado, la que se elija o, si no, la de sus ejercicios (la que más se repite). Los
   descansos de una semana con CrossFit, Hyrox o funcional llevan la suya (descanso2). Con el perfil de mujer, todas son las de
   la modelo (DAY_PHOTOS_F; mientras falte alguna, la que la sustituye: PHOTO_ALIAS_F).
   Define: GROUP_IMAGE, REST_IMAGES, CONDITIONING, photoUrl, groupImage, exerciseImage, imageOfExercises, nameImage, unnamedImage, baseImage, dayImage, coverStyle, routineImage, IMAGE_LABELS, IMAGE_LABELS_F, imagePicker  · acciones/registros: 1
*/
import { A } from '../core/registry.js';
import { DAY_PHOTO_RULES, DAY_PHOTOS, DAY_PHOTOS_F, EXERCISE_PHOTO_RULES, PHOTO_ALIAS_F } from '../data/photos.js';
import { profileSex, S, saveState } from '../core/state.js';
import { sheet } from '../core/ui.js';
import { groupOfName } from '../library/model.js';
import { routineEditor, routineState } from '../routines/builder.js';
import { html } from '../core/html.js';
/* la portada de cada grupo de ejercicios */
const GROUP_IMAGE = { 'Pecho': 'pecho', 'Espalda': 'espalda', 'Hombros': 'hombros', 'Bíceps': 'brazos', 'Tríceps': 'brazos', 'Antebrazos': 'brazos', 'Abdomen': 'core', 'Cuádriceps': 'piernas', 'Isquios y glúteos': 'legs', 'Gemelos': 'piernas', 'CrossFit': 'thrusters', 'Hyrox': 'trineo', 'Funcional': 'granjero', 'Cardio': 'cardio' };
/* las portadas de descanso, que no salen en el selector */
const REST_IMAGES = ['descanso', 'descanso2'];
/* las de los días de CrossFit, Hyrox y funcional: con alguno en la semana, los descansos llevan descanso2 */
const CONDITIONING = ['skierg', 'trineo', 'wallballs', 'snatch', 'thrusters', 'boxjumps', 'granjero', 'competencia', 'crossfit', 'hyrox', 'funcional'];
/** La foto de una portada para este perfil: con el de mujer, la de la modelo (o la que la sustituye); si no, la de serie. */
export const photoUrl = k => (profileSex() == 'F' && (DAY_PHOTOS_F[k] || DAY_PHOTOS_F[PHOTO_ALIAS_F[k]])) || DAY_PHOTOS[k] || '';
/** La portada de un grupo de ejercicios ('' si no tiene: routines/ondemand pone entonces la de funcional). */
export const groupImage = g => GROUP_IMAGE[g] || '';
/* la portada de un ejercicio: la de su grupo o, en CrossFit, Hyrox, funcional y cardio, la suya si la tiene */
const exerciseImage = n => {
  const g = groupOfName(n);
  const own = ['CrossFit', 'Hyrox', 'Funcional', 'Cardio'].includes(g) && (EXERCISE_PHOTO_RULES.find(r => r[0].test(n)) || [])[1];
  return own || GROUP_IMAGE[g] || 'torso';
};
/* la portada de unos ejercicios: la que más se repite (con empate, la del primero); '' si no hay ninguno */
const imageOfExercises = names => {
  const c = new Map();
  names.forEach(n => {
    const k = exerciseImage(n);
    c.set(k, (c.get(k) || 0) + 1);
  });
  let best = '';
  c.forEach((v, k) => {
    if (!best || v > c.get(best))
      best = k;
  });
  return best;
};
/* la portada que da el nombre de un día ('' si no encaja con ninguna regla) */
const nameImage = n => (DAY_PHOTO_RULES.find(r => r[0].test(n || '')) || [])[1] || '';
/* la de un día cuyo nombre no dice nada (un Full Body, un día propio): la de su primer ejercicio, que suele ser el principal,
   salvo que ya la lleve otro día así de la semana; entonces, la del siguiente que no se repita (A y C del Full Body empiezan
   los dos por pierna). Los días se reparten por orden alfabético: cada uno lleva siempre la misma, empiece la semana por
   donde empiece el ciclo */
const unnamedImage = d => {
  const days = new Map([[d.n, d]]);
  (S.plan || []).forEach(x => {
    if (x && !days.has(x.n) && !x.cu && x.ex && x.ex.length && !nameImage(x.n))
      days.set(x.n, x);
  });
  const taken = new Set();
  let mine = '';
  [...days.keys()].sort((a, b) => String(a).localeCompare(String(b), 'es')).forEach(n => {
    const own = days.get(n).ex.map(e => exerciseImage(e.n));
    const k = own.find(x => !taken.has(x)) || own[0];
    taken.add(k);
    if (n == d.n)
      mine = k;
  });
  return mine;
};
/* la portada de un día sin decidir aún qué descanso: la elegida (personalizado), la de su nombre o la de sus ejercicios */
const baseImage = (n, d) => d && d.cu && DAY_PHOTOS[d.img] ? d.img : nameImage(n) || (d && d.ex && d.ex.length ? unnamedImage(d) : '');
/** La portada de un día (`n`, su nombre; `d`, el día con sus ejercicios). Un descanso, en una semana con CrossFit, Hyrox o
    funcional, lleva la suya. */
export const dayImage = (n, d) => {
  const k = baseImage(n, d);
  return k == 'descanso' && (S.plan || []).some(x => x && CONDITIONING.includes(baseImage(x.n, x))) ? 'descanso2' : k;
};
/** El fondo de la tarjeta del día: su portada, oscurecida lo justo para que su texto blanco se lea (AA) sobre cualquiera
    (tests/covers.py). Con el 13 % de antes arriba, el nombre del día no llegaba sobre la de espalda ni sobre las más claras.
    La del día que se entrena (`tall`: workout/day, más alta) apenas se oscurece: lo que va encima lleva su propia sombra, que
    mide lo que el texto (css/79-workout-hub), y en medio, sin texto, se ve la foto. */
export const coverStyle = (n, d, tall) => {
  const u = photoUrl(dayImage(n, d));
  return u ? 'background:linear-gradient(180deg,' + (tall ? '#0002,#0002' : '#0007,#000b') + '),url(' + u + ') center/cover' : '';
};
/** La portada de un workout personalizado: la elegida o, si no eligió ninguna, la de sus ejercicios. */
export const routineImage = r => {
  if (r.img && !REST_IMAGES.includes(r.img) && DAY_PHOTOS[r.img])
    return r.img;
  return imageOfExercises([].concat(...r.bl.map(b => b.ex))) || (DAY_PHOTO_RULES.find(x => x[0].test(r.n)) || [])[1] || 'torso';
};
/* el nombre de cada portada en el selector (para el lector de pantalla); con el perfil de mujer, las que muestran otro ejercicio */
const IMAGE_LABELS = { pecho: 'Pecho', espalda: 'Espalda', hombros: 'Hombros', brazos: 'Brazos', piernas: 'Piernas', legs: 'Prensa de piernas', torso: 'Torso', skierg: 'SkiErg y remo', trineo: 'Trineo', wallballs: 'Wall balls', snatch: 'Arrancada', thrusters: 'Thrusters', boxjumps: 'Box jumps y burpees', granjero: 'Carga de granjero', competencia: 'Competición', crossfit: 'CrossFit', hyrox: 'Hyrox', cardio: 'Cardio', core: 'Core', funcional: 'Funcional' };
const IMAGE_LABELS_F = { legs: 'Hip thrust' };
export const imagePicker = r => {
  const v = routineImage(r);
  const label = k => (profileSex() == 'F' && IMAGE_LABELS_F[k]) || IMAGE_LABELS[k] || k;
  return html`
    <div class="d-grid cols-4 gap-8 m-6-0-4">
      ${Object.keys(DAY_PHOTOS).filter(k => !REST_IMAGES.includes(k)).map(k => html`
        <button data-a="routineSetImage" data-v="${k}" aria-label="${label(k)}"
            class="p-0 h-78 pos-rel ov-hidden r-14 ${v == k ? 'bd-2-solid-a2' : 'bd-2-solid-ln'}">
          <img src="${photoUrl(k)}" alt="" class="w-full h-full of-cover d-block${v == k ? '' : ' op-0_55'}">
        </button>`)}
    </div>`;
};
A.routineSetImage = (i, b) => {
  S.routines[routineState.i].img = b.dataset.v;
  saveState();
  sheet(routineEditor());
};
