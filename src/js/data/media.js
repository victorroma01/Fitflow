/* ═══ data/media ═══
   Fotos de la app (portadas de día) y el logo (claro y oscuro: src/img/brand, que genera tools/marca.py).
   Este archivo es solo el molde: build.py lo sustituye por el
   generado desde src/img/ — en el paquete instalable las fotos son archivos (img/…) que el service worker guarda para
   usarlas sin conexión; en el archivo único van incrustadas en base64. Ver src/img/day/order.txt.
   Define: MEDIA
*/
export const MEDIA = { day: {}, brand: {} };
