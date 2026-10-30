/* ═══ workout/images ═══
   Imágenes de portada del día y su selector.
   Define: coverStyle, GROUP_IMAGE, routineImage, IMAGE_LABELS, imagePicker  · acciones/registros: 1
*/
import { A } from '../core/registry.js';
import { DAY_PHOTO_RULES, DAY_PHOTOS } from '../data/photos.js';
import { S, saveState } from '../core/state.js';
import { sheet } from '../core/ui.js';
import { groupOfName } from '../library/model.js';
import { routineEditor, routineState } from '../routines/builder.js';
export const coverStyle = (n, d) => {
  const k = d && d.cu && DAY_PHOTOS[d.img] ? d.img : (DAY_PHOTO_RULES.find(r => r[0].test(n)) || [])[1];
  const u = DAY_PHOTOS[k];
  return u ? 'background:linear-gradient(180deg,#0002,#000b),url(' + u + ') center/cover' : '';
};
const GROUP_IMAGE = { 'Pecho': 'pecho', 'Espalda': 'espalda', 'Hombros': 'hombros', 'Bíceps': 'brazos', 'Tríceps': 'brazos', 'Antebrazos': 'brazos', 'Abdomen': 'torso', 'Cuádriceps': 'piernas', 'Isquios y glúteos': 'legs', 'Gemelos': 'piernas' };
export const routineImage = r => {
  if (r.img && r.img != 'descanso' && DAY_PHOTOS[r.img])
    return r.img;
  const c = {};
  r.bl.forEach(b => b.ex.forEach(n => {
    const k = GROUP_IMAGE[groupOfName(n)] || 'torso';
    c[k] = (c[k] || 0) + 1;
  }));
  const t = Object.keys(c).sort((a, b) => c[b] - c[a])[0];
  return t || (DAY_PHOTO_RULES.find(x => x[0].test(r.n)) || [])[1] || 'torso';
};
const IMAGE_LABELS = { pecho: 'Pecho', espalda: 'Espalda', hombros: 'Hombros', brazos: 'Brazos', piernas: 'Piernas', legs: 'Prensa de piernas', torso: 'Torso', descanso: 'Descanso' };
export const imagePicker = r => {
  const v = routineImage(r);
  return '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:6px 0 4px">' + Object.keys(DAY_PHOTOS).filter(k => k != 'descanso').map(k => '<button data-a="crim" data-v="' + k + '" aria-label="' + IMAGE_LABELS[k] + '" style="padding:0;height:78px;position:relative;overflow:hidden;border-radius:14px;border:2px solid ' + (v == k ? 'var(--a2)' : 'var(--ln)') + '"><img src="' + DAY_PHOTOS[k] + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block' + (v == k ? '' : ';opacity:.55') + '"></button>').join('') + '</div>';
};
A.crim = (i, b) => {
  S.cr[routineState.i].img = b.dataset.v;
  saveState();
  sheet(routineEditor());
};
Object.assign(IMAGE_LABELS, { cardio: 'Cardio', hyrox: 'Hyrox', crossfit: 'CrossFit', core: 'Core', funcional: 'Funcional' });
Object.assign(GROUP_IMAGE, { Abdomen: 'core', CrossFit: 'crossfit', Hyrox: 'hyrox', Funcional: 'funcional', Cardio: 'cardio' });
