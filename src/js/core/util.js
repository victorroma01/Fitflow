/* ═══ core/util ═══
   Utilidades puras (no importa nada): versión, idioma de esta apertura, selector $, escape HTML X, redondeos, fechas (dayKey)
   y formatos.
   Define: APPV, FFDEP, LANG_KEY, langChoice, phoneLang, LANG, LOCALE, DAY_LETTERS, $, X, safeImage, round1, roundInt, fmtMinSec, dayKey, est1RM, fmtDuration, clampInt, typedNum, typedName, clampNum, fmtClock, dateFormats, fmtDate, fmtDateShort, newId
*/
window.__ffs = 1;
/** Versión de la app (se muestra en Perfil y va en las copias de seguridad y en el registro de errores). */
export const APPV = '1.0.4.1';
export const FFDEP = 0; /* 1 en el paquete instalable (dist/app): lo fija build.py; 0 en el archivo único */
/** La clave (localStorage) del idioma elegido en Ajustes para este móvil: 'es' o 'en'. Si falta, manda el idioma del móvil. */
export const LANG_KEY = 'fflang';
/** El idioma elegido en este móvil ('es' o 'en'), o '' si no se ha elegido ninguno. */
export const langChoice = () => {
  try {
    const v = window.localStorage.getItem(LANG_KEY);
    return v == 'es' || v == 'en' ? v : '';
  }
  catch (e) {
    return '';
  }
};
/** El idioma del móvil, entre los de la app: el primero de sus idiomas preferidos que sea español o inglés (un móvil en
    catalán con el español de segundo, español; uno en alemán con el inglés de segundo, inglés). Si no hay ninguno, español. */
export const phoneLang = () => {
  const nav = /** @type {any} */ (window.navigator || {});
  for (const l of nav.languages && nav.languages.length ? nav.languages : [nav.language]) {
    const p = String(l || '').slice(0, 2).toLowerCase();
    if (p == 'en' || p == 'es')
      return p;
  }
  return 'es';
};
/** El idioma de la app en esta apertura, 'es' o 'en': se decide al cargar y no cambia (cambiarlo en Ajustes recarga la app). El
    código está en español; en inglés, lo que se enseña pasa por core/i18n. */
export const LANG = langChoice() || phoneLang();
/** La región con la que se escriben las fechas y los números: la del idioma. */
export const LOCALE = LANG == 'en' ? 'en-US' : 'es';
/** La inicial de cada día de la semana, de lunes a domingo. */
export const DAY_LETTERS = LANG == 'en' ? 'MTWTFSS' : 'LMXJVSD';
/** El primer elemento de la página que encaja con el selector `q`, o null. Para el comprobador de tipos vale por cualquier
    elemento (un <input>, un <video>…): quien lo pide sabe cuál es.
    @param {string} q
    @returns {any} */
export const $ = q => document.querySelector(q);
export const X = s => String(s).replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';');
/** La imagen `u` si es una foto incrustada válida (data:image/jpeg, png o webp en base64); si no, ''. Para lo que viene de
    datos guardados o importados (foto de perfil): nunca se inserta en la página nada que no sea una imagen. */
export const safeImage = u => typeof u == 'string' && u.length < 3e6 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u) ? u : '';
export const round1 = v => Math.round(v * 10) / 10;
export const roundInt = v => Math.round(v);
export const fmtMinSec = t => Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
export const dayKey = d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
export const est1RM = (w, r) => w * (1 + r / 30);
export const fmtDuration = s => {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor(s % 3600 / 60);
  const x = s % 60;
  const p = v => String(v).padStart(2, '0');
  return h ? h + ':' + p(m) + ':' + p(x) : m + ':' + p(x);
};
export const clampInt = (v, a, b, d) => {
  v = Math.round(+v);
  return v >= a && v <= b ? v : d;
};
/** Un número escrito por el usuario (admite la coma decimal), o NaN. */
export const typedNum = v => {
  const t = String(v == null ? '' : v).trim().replace(',', '.');
  return t === '' ? NaN : +t;
};
/** Un nombre escrito por el usuario: sin espacios a los lados, de `max` letras como mucho y, si se queda vacío, `fallback`. */
export const typedName = (v, fallback, max = 60) => String(v == null ? '' : v).trim().slice(0, max) || fallback;
export const clampNum = (v, a, b, d) => {
  v = +v;
  return v >= a && v <= b ? v : d;
};
export const fmtClock = s => {
  s = Math.max(0, Math.round(s));
  return s >= 3600 ? Math.floor(s / 3600) + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0') : Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};
/* los formatos de fecha ya creados, por sus opciones: crear uno (lo que hace toLocaleDateString en cada llamada) cuesta decenas
   de veces más que usarlo, y Registros escribe dos fechas por entreno */
const dateFormats = new Map();
/** Una fecha (un Date válido) en el idioma de la app, con las opciones de Intl.DateTimeFormat: lo mismo que
    d.toLocaleDateString(LOCALE, o), sin crear el formato cada vez. */
export const fmtDate = (d, o) => {
  const k = JSON.stringify(o);
  let f = dateFormats.get(k);
  if (!f)
    dateFormats.set(k, f = new Intl.DateTimeFormat(LOCALE, o));
  return f.format(d);
};
/** Un día dado por su clave (AAAA-MM-DD), en el idioma de la app: «12 nov» o con las opciones `o`. Si la clave no es una fecha,
    tal cual. */
export const fmtDateShort = (d, o) => {
  const t = new Date(d + 'T12:00:00');
  return isNaN(t) ? String(d || '') : fmtDate(t, o || { day: 'numeric', month: 'short' });
};
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
