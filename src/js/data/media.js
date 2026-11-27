/* ═══ data/media ═══
   Fotos de la app (portadas de día: las de hombre y, en dayF, las de mujer que haya, tools/portadas.py; y sus otras versiones,
   en dayMore y dayMoreF, tools/variantes.py), el logo (claro y
   oscuro: src/img/brand, que genera tools/marca.py), el fondo del inicio de sesión (src/img/login, que prepara
   tools/fondo.py), en equip, los iconos del equipamiento (src/img/equipment: data/equipment) y, en cat, la ilustración de cada
   tarjeta de la librería (src/img/catalog: data/catalog).
   Este archivo es solo el molde: build.py lo sustituye por el
   generado desde src/img/ — en el paquete instalable las fotos son archivos (img/…) que el service worker guarda para
   usarlas sin conexión; en el archivo único van incrustadas en base64. Ver src/img/day/order.txt.
   Define: MEDIA
*/
export const MEDIA = { day: {}, dayF: {}, dayMore: {}, dayMoreF: {}, brand: {}, login: '', equip: {}, cat: {} };
