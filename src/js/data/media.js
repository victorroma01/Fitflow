/* ═══ data/media ═══
   Fotos de la app (portadas de día y fotos de ejercicio). Este archivo es solo el molde: build.py lo sustituye por el
   generado desde src/img/ — en el paquete instalable las fotos son archivos (img/…) que el service worker guarda para
   usarlas sin conexión; en el archivo único van incrustadas en base64. Ver src/img/day/order.txt y src/img/ex/map.txt.
   Define: MEDIA
*/
export const MEDIA = { day: {}, ex: {}, exFor: {}, exAlias: {} };
