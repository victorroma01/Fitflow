/* ═══ data/photos ═══
   Fotos: portadas de los días (DAY_PHOTOS) con sus reglas de asignación por nombre del día (DAY_PHOTO_RULES),
   el logo (BRAND_LOGOS) y el fondo del inicio de sesión (LOGIN_PHOTO).
   Vienen de data/media.
   Define: DAY_PHOTOS, BRAND_LOGOS, LOGIN_PHOTO, DAY_PHOTO_RULES
*/
import { MEDIA } from './media.js';
/** clave de portada → URL de la foto (pecho, espalda… descanso) */
export const DAY_PHOTOS = MEDIA.day;
/** el logo: { claro, oscuro } → URL (core/brand) */
export const BRAND_LOGOS = MEDIA.brand;
/** el fondo del inicio de sesión → URL (account/login): un gimnasio visto desde arriba, en gris y desenfocado */
export const LOGIN_PHOTO = MEDIA.login;
export const DAY_PHOTO_RULES = [[/descanso/i, 'descanso'], [/hyrox|simulaci/i, 'hyrox'], [/wod|crossfit/i, 'crossfit'], [/carrera|intervalos|skierg|zona 2/i, 'cardio'], [/funcional/i, 'funcional'], [/pecho|push/i, 'pecho'], [/espalda|pull|jal/i, 'espalda'], [/hombro/i, 'hombros'], [/brazo|b[ií]ceps|tr[ií]ceps/i, 'brazos'], [/legs|inferior/i, 'legs'], [/pierna/i, 'piernas'], [/torso|superior/i, 'torso']];
DAY_PHOTO_RULES.splice(1, 0, [/^(core|abs\b|abdom)/i, 'core'], [/hyrox|simulaci/i, 'hyrox'], [/wod|crossfit/i, 'crossfit'], [/carrera|rodaje|intervalos|zona 2|cardio|cuestas/i, 'cardio'], [/funcional/i, 'funcional']);
