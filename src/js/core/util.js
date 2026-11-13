/* ═══ core/util ═══
   Utilidades puras (no importa nada): versión, selector $, escape HTML X, redondeos, fechas (dayKey) y formatos.
   Define: APPV, FFDEP, $, X, safeImage, round1, roundInt, fmtMinSec, dayKey, est1RM, fmtDuration, clampInt, typedNum, typedName, clampNum, fmtClock, dateFormats, fmtDate, fmtDateShort, newId
*/
window.__ffs = 1;
/** Versión de la app (se muestra en Perfil y va en las copias de seguridad y en el registro de errores). */
export const APPV = '1.0.3';
export const FFDEP = 0; /* 1 en el paquete instalable (dist/app): lo fija build.py; 0 en el archivo único */
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
/** Una fecha (un Date válido) en español, con las opciones de Intl.DateTimeFormat: lo mismo que d.toLocaleDateString('es', o),
    sin crear el formato cada vez. */
export const fmtDate = (d, o) => {
  const k = JSON.stringify(o);
  let f = dateFormats.get(k);
  if (!f)
    dateFormats.set(k, f = new Intl.DateTimeFormat('es', o));
  return f.format(d);
};
/** Un día dado por su clave (AAAA-MM-DD), en español: «12 nov» o con las opciones `o`. Si la clave no es una fecha, tal cual. */
export const fmtDateShort = (d, o) => {
  const t = new Date(d + 'T12:00:00');
  return isNaN(t) ? String(d || '') : fmtDate(t, o || { day: 'numeric', month: 'short' });
};
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
