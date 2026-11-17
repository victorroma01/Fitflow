/* ═══ data/photos ═══
   Fotos: portadas de los días (DAY_PHOTOS; las de mujer, DAY_PHOTOS_F) con sus reglas de asignación por el nombre del día
   (DAY_PHOTO_RULES) y por el ejercicio (EXERCISE_PHOTO_RULES), el logo (BRAND_LOGOS) y el fondo del inicio de sesión
   (LOGIN_PHOTO). Vienen de data/media. Qué portada lleva cada día lo decide workout/images.
   Define: DAY_PHOTOS, DAY_PHOTOS_F, PHOTO_ALIAS_F, BRAND_LOGOS, LOGIN_PHOTO, DAY_PHOTO_RULES, EXERCISE_PHOTO_RULES
*/
import { MEDIA } from './media.js';
/** clave de portada → URL de la foto (pecho, espalda… descanso): las de hombre y las que no llevan a nadie (cardio, core…) */
export const DAY_PHOTOS = MEDIA.day;
/** las de mujer (la modelo), con las mismas claves; la que no tiene la suya usa la de PHOTO_ALIAS_F o, si no, la de DAY_PHOTOS */
export const DAY_PHOTOS_F = MEDIA.dayF;
/** mientras no haya foto de mujer de una portada, la que la sustituye: la de competición, la del trineo */
export const PHOTO_ALIAS_F = { competencia: 'trineo' };
/** el logo: { claro, oscuro } → URL (core/brand) */
export const BRAND_LOGOS = MEDIA.brand;
/** el fondo del inicio de sesión → URL (account/login): un gimnasio visto desde arriba, en gris y desenfocado */
export const LOGIN_PHOTO = MEDIA.login;
/** La portada de un día por su nombre: la primera regla que encaja. Primero lo de CrossFit, Hyrox y funcional (la simulación
    de una carrera, el SkiErg, el trineo…), que puede nombrar también un grupo («Sled pull»), y la carrera; después los grupos.
    Un día que no encaja con ninguna lleva la de sus ejercicios (workout/images). */
export const DAY_PHOTO_RULES = [[/descanso/i, 'descanso'], [/^(core|abs\b|abdom)/i, 'core'], [/simulaci|competici|competencia/i, 'competencia'], [/ski ?erg|^remo\b|erg[oó]metro/i, 'skierg'], [/trineo|sled/i, 'trineo'], [/wall ?balls?/i, 'wallballs'], [/snatch|arrancada|halterofilia|ol[ií]mpic/i, 'snatch'], [/thruster/i, 'thrusters'], [/box ?jumps?|burpee/i, 'boxjumps'], [/granjero|farmer|funcional/i, 'granjero'], [/hyrox/i, 'trineo'], [/wod|crossfit|metcon|amrap|emom|for time|tabata/i, 'thrusters'], [/carrera|rodaje|intervalos|zona 2|cardio|cuestas/i, 'cardio'], [/pecho|push/i, 'pecho'], [/espalda|pull|jal/i, 'espalda'], [/hombro/i, 'hombros'], [/brazo|b[ií]ceps|tr[ií]ceps/i, 'brazos'], [/legs|inferior|gl[uú]teo|isquio/i, 'legs'], [/pierna/i, 'piernas'], [/torso|superior/i, 'torso']];
/** La portada de un ejercicio de CrossFit, Hyrox, funcional o cardio por su nombre, si tiene una suya: el SkiErg y el remo
    (el de ergómetro, no el de espalda), el trineo, los wall balls, los levantamientos olímpicos, el thruster, los saltos al
    cajón y los burpees, y las cargas. */
export const EXERCISE_PHOTO_RULES = [[/ski ?erg|^remo (\d|erg|zona)/i, 'skierg'], [/sled|trineo/i, 'trineo'], [/wall ?balls?/i, 'wallballs'], [/snatch|clean|jerk|arrancada|cargada|envi[oó]n/i, 'snatch'], [/thruster/i, 'thrusters'], [/box (jump|step)|burpee|caj[oó]n/i, 'boxjumps'], [/farmer|granjero|carry/i, 'granjero']];
