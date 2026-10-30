/* ═══ data/photos ═══
   Fotos: portadas de los días (DAY_PHOTOS) con sus reglas de asignación por nombre del día (DAY_PHOTO_RULES)
   y fotos de ejercicio (EX_PHOTOS, EX_PHOTO_KEY) con nombres alternativos de búsqueda (EX_ALIASES). Vienen de data/media.
   Define: DAY_PHOTOS, EX_PHOTOS, EX_PHOTO_KEY, EX_ALIASES, DAY_PHOTO_RULES
*/
import { MEDIA } from './media.js';
/** clave de portada → URL de la foto (pecho, espalda… descanso) */
export const DAY_PHOTOS = MEDIA.day;
/** clave de foto de ejercicio → URL */
export const EX_PHOTOS = MEDIA.ex;
/** nombre del ejercicio → clave de su foto */
export const EX_PHOTO_KEY = MEDIA.exFor;
/** nombre del ejercicio → otros nombres con los que se busca */
export const EX_ALIASES = MEDIA.exAlias;
export const DAY_PHOTO_RULES = [[/descanso/i, 'descanso'], [/hyrox|simulaci/i, 'hyrox'], [/wod|crossfit/i, 'crossfit'], [/carrera|intervalos|skierg|zona 2/i, 'cardio'], [/funcional/i, 'funcional'], [/pecho|push/i, 'pecho'], [/espalda|pull|jal/i, 'espalda'], [/hombro/i, 'hombros'], [/brazo|b[ií]ceps|tr[ií]ceps/i, 'brazos'], [/legs|inferior/i, 'legs'], [/pierna/i, 'piernas'], [/torso|superior/i, 'torso']];
DAY_PHOTO_RULES.splice(1, 0, [/^(core|abs\b|abdom)/i, 'core'], [/hyrox|simulaci/i, 'hyrox'], [/wod|crossfit/i, 'crossfit'], [/carrera|rodaje|intervalos|zona 2|cardio|cuestas/i, 'cardio'], [/funcional/i, 'funcional']);
