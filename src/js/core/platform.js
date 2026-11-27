/* ═══ core/platform ═══
   En qué sistema corre la app, según lo que dice el navegador: iPhone o iPad ('ios'), Android ('android') u otro ('otro'), y si
   el dispositivo está sin conexión. No es un dato de la persona: solo sirve para lo que cambia de un sistema a otro (el «atrás»
   del sistema, core/back), para no esperar a la red cuando no la hay y para Diagnóstico. En una app nativa, esto lo dice su
   propio sistema (docs/tecnica/movil.md).
   Define: deviceOS, isOffline, userAgent
*/
/** 'ios' | 'android' | 'otro'. Un iPad se presenta como un Mac: se le distingue por la pantalla táctil. */
export const deviceOS = () => {
  const ua = navigator.userAgent || '';
  if (/iP(hone|ad|od)/.test(ua) || /Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    return 'ios';
  return /Android/.test(ua) ? 'android' : 'otro';
};
/** Si el dispositivo dice que no tiene conexión (si no lo sabe, no lo está). */
export const isOffline = () => typeof navigator != 'undefined' && navigator.onLine === false;
/** Cómo se presenta el navegador (para Diagnóstico). */
export const userAgent = () => navigator.userAgent;
