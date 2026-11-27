/* ═══ data/catalog ═══
   Las tarjetas de los grupos en la librería de ejercicios (library/catalog), con el diseño que aprobó el propietario
   (StrataFit_Catalogo). Cada grupo de la librería (data/library: GROUPS, su identificador de siempre, que no cambia) con el
   id que le da el paquete a sus imágenes: su ilustración (src/img/catalog/<id>.webp) y su icono rojo (<id>-icono.webp), con
   sus tamaños, para que la página les guarde el sitio antes de cargarlas. Las dos de cada grupo las prepara
   tools/catalogo.py y el build las pasa a data/media (MEDIA.cat y MEDIA.catIcon). Funcional y Cardio son las anchas: en la
   última fila, dos que la llenan. «Mis ejercicios» (Propio), los creados por el usuario, no tiene tarjeta del paquete: va
   con la misma tarjeta, sin ilustración (library/catalog). El número de ejercicios de cada una es el de la librería, no el de
   las referencias del paquete (551 en total, contando ejercicios que se juntaron en la revisión de la librería).
   Define: CATALOG
*/
/** grupo → [id de sus imágenes, ancho y alto de su ilustración, ancho de su icono (de 54 de alto), 1 si es de las anchas] */
export const CATALOG = {
  'Pecho': ['chest', 339, 192, 53],
  'Espalda': ['back', 337, 191, 56],
  'Hombros': ['shoulders', 338, 192, 53],
  'Bíceps': ['biceps', 339, 164, 54],
  'Tríceps': ['triceps', 337, 164, 36],
  'Antebrazos': ['forearms', 338, 164, 52],
  'Abdomen': ['abs', 339, 146, 50],
  'Cuádriceps': ['quadriceps', 337, 146, 40],
  'Isquios y glúteos': ['hamstrings_glutes', 338, 146, 54],
  'Gemelos': ['calves', 339, 146, 37],
  'CrossFit': ['crossfit', 337, 146, 40],
  'Hyrox': ['hyrox', 338, 146, 45],
  'Funcional': ['functional', 518, 159, 51, 1],
  'Cardio': ['cardio', 517, 159, 69, 1]
};
