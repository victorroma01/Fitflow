/* ═══ core/platform ═══
   En qué sistema corre la app, según lo que dice el navegador: iPhone o iPad ('ios'), Android ('android') u otro ('otro').
   No es un dato de la persona: solo sirve para lo que cambia de un sistema a otro (el «atrás» del sistema, core/back).
   Define: deviceOS
*/
/** 'ios' | 'android' | 'otro'. Un iPad se presenta como un Mac: se le distingue por la pantalla táctil. */
export const deviceOS = () => {
  const ua = navigator.userAgent || '';
  if (/iP(hone|ad|od)/.test(ua) || /Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    return 'ios';
  return /Android/.test(ua) ? 'android' : 'otro';
};
