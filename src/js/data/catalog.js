/* ═══ data/catalog ═══
   Las tarjetas de los grupos en la librería de ejercicios (library/catalog), con el diseño que aprobó el propietario
   (StrataFit_Catalogo). Cada grupo de la librería (data/library: GROUPS, su identificador de siempre, que no cambia) con el
   id que le da el paquete a su ilustración (src/img/catalog/<id>.webp), con su tamaño, para que la página le guarde el sitio
   antes de cargarla. La prepara tools/catalogo.py y el build la pasa a data/media (MEDIA.cat). El icono de cada grupo que traía
   el paquete ya no va en la tarjeta: lo quitó el propietario (V1.0.4.1). Funcional y Cardio son las anchas: en la
   última fila, dos que la llenan. «Mis ejercicios» (Propio), los creados por el usuario, no tiene tarjeta del paquete: va
   con la misma tarjeta, sin ilustración (library/catalog). El número de ejercicios de cada una es el de la librería, no el de
   las referencias del paquete (551 en total, contando ejercicios que se juntaron en la revisión de la librería).
   Define: CATALOG
*/
/** grupo → [id de su ilustración, su ancho y su alto, 1 si es de las anchas] */
export const CATALOG = {
  'Pecho': ['chest', 339, 192],
  'Espalda': ['back', 337, 191],
  'Hombros': ['shoulders', 338, 192],
  'Bíceps': ['biceps', 339, 164],
  'Tríceps': ['triceps', 337, 164],
  'Antebrazos': ['forearms', 338, 164],
  'Abdomen': ['abs', 339, 146],
  'Cuádriceps': ['quadriceps', 337, 146],
  'Isquios y glúteos': ['hamstrings_glutes', 338, 146],
  'Gemelos': ['calves', 339, 146],
  'CrossFit': ['crossfit', 337, 146],
  'Hyrox': ['hyrox', 338, 146],
  'Funcional': ['functional', 518, 159, 1],
  'Cardio': ['cardio', 517, 159, 1]
};
