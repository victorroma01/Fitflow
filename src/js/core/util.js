/* ═══ core/util ═══
   Utilidades puras: selector $, escape HTML X, JSON en almacenamiento (storeJson), redondeos, fechas (dayKey) y formatos.
   Define: APPV, FFDEP, $, storeJson, saveFailedAt, saveFailed, X, round1, roundInt, fmtMinSec, dayKey, est1RM, fmtDuration, clampInt, clampNum, fmtClock, fmtDateShort, newId
*/
window.__ffs = 1;
/** Versión de la app (se muestra en Perfil y va en las copias de seguridad y en el registro de errores). */
const APPV = '1.20.0';
const FFDEP = 0; /* 1 en el paquete instalable (dist/app): lo fija build.py; 0 en el archivo único */
const $ = q => document.querySelector(q);
/** Lee (sin v) o guarda (con v) un valor como JSON. Si falla lo registra; si falla al guardar, además avisa (como mucho una vez por minuto). */
const storeJson = (k, v) => {
  try {
    return v === undefined ? JSON.parse(Store.get(k)) : Store.set(k, JSON.stringify(v));
  }
  catch (e) {
    if (v === undefined)
      logError('leer ' + k, e);
    else
      saveFailed(k, e);
    return null;
  }
};
let saveFailedAt = 0;
const saveFailed = (k, e) => {
  logError('guardar ' + k, e);
  if (Date.now() - saveFailedAt < 6e4)
    return;
  saveFailedAt = Date.now();
  setTimeout(() => {
    try {
      toast('No se ha podido guardar en este dispositivo. Libera espacio o haz una copia de seguridad.');
    }
    catch (x) {
      /* si aún no hay interfaz no se puede avisar; el error ya quedó registrado */
    }
  }, 0);
};
const X = s => String(s).replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';');
const round1 = v => Math.round(v * 10) / 10;
const roundInt = v => Math.round(v);
const fmtMinSec = t => Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
const dayKey = d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const est1RM = (w, r) => w * (1 + r / 30);
const fmtDuration = s => {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor(s % 3600 / 60);
  const x = s % 60;
  const p = v => String(v).padStart(2, '0');
  return h ? h + ':' + p(m) + ':' + p(x) : m + ':' + p(x);
};
const clampInt = (v, a, b, d) => {
  v = Math.round(+v);
  return v >= a && v <= b ? v : d;
};
const clampNum = (v, a, b, d) => {
  v = +v;
  return v >= a && v <= b ? v : d;
};
const fmtClock = s => {
  s = Math.max(0, Math.round(s));
  return s >= 3600 ? Math.floor(s / 3600) + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0') : Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};
const fmtDateShort = (d, o) => {
  const t = new Date(d + 'T12:00:00');
  return isNaN(t) ? String(d || '') : t.toLocaleDateString('es', o || { day: 'numeric', month: 'short' });
};
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
