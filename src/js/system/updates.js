/* ═══ system/updates ═══
   Actualización de la app: service worker, uso sin conexión, Ajustes → Actualizaciones y aviso de versión nueva con sus novedades.
   Define: swState, offlineText, offlineNote, updatesOn, updateReady, updateCheckedAt, updateInfo, isNewerVersion, fetchVersionInfo, releaseNotesHtml, releaseNotePage, updatePopupHtml, showPopup, showUpdatePopup, updateFound, onUpdateFound, whatsNewDue, whatsNewPending, showWhatsNew, updatePopupSync  · acciones/registros: 3
*/
import { APPV, FFDEP, X } from '../core/util.js';
import { toast } from '../core/toast.js';
import { Store } from '../core/store.js';
import { logError } from '../core/errors.js';
import { A } from '../core/registry.js';
import { RELEASE } from '../data/release.js';
import { S, W } from '../core/state.js';
import { isStandalone } from './files.js';
import { BRAND_LOGOS } from '../data/photos.js';
import { html, raw } from '../core/html.js';
let swState = 0;
(function () {
  try {
    if (!FFDEP) { /* archivo único: metas, icono y manifiesto se crean al vuelo (el paquete instalable los lleva fijos en el HTML) */
      const hd = document.head;
      const mk = (t, a) => {
        const e = document.createElement(t);
        Object.keys(a).forEach(k => e.setAttribute(k, a[k]));
        hd.appendChild(e);
        return e;
      };
      mk('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
      mk('meta', { name: 'mobile-web-app-capable', content: 'yes' });
      mk('meta', { name: 'apple-mobile-web-app-title', content: 'StrataFit' });
      const im = new Image();
      im.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = c.height = 180;
          const x = c.getContext('2d');
          x.drawImage(im, 0, 0, 180, 180);
          const ic = c.toDataURL('image/png');
          mk('link', { rel: 'apple-touch-icon', href: ic });
          const mf = { name: 'StrataFit', short_name: 'StrataFit', display: 'standalone', start_url: location.href.split('#')[0], background_color: '#0b0b0d', theme_color: '#0b0b0d', icons: [{ src: ic, sizes: '180x180', type: 'image/png' }] };
          mk('link', { rel: 'manifest', href: URL.createObjectURL(new Blob([JSON.stringify(mf)], { type: 'application/manifest+json' })) });
        }
        catch (e) {
          /* icono generado opcional (solo archivo único) */
        }
      };
      /* el icono de la app (pantalla de inicio): el logo del tema claro (F-40), que en el archivo único va incrustado */
      im.src = BRAND_LOGOS.claro;
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(() => {
        swState = 1;
        if (!FFDEP)
          navigator.serviceWorker.ready.then(() => {
            try {
              fetch(location.href, { cache: 'reload' }).catch(() => {
              });
            }
            catch (e) {
              /* recarga en segundo plano opcional */
            }
          }).catch(() => {
          });
      }).catch(() => {
        swState = -1;
      });
    }
    else
      swState = -1;
  }
  catch (e) {
    swState = -1;
  }
})();
export const offlineText = () => {
  const on = typeof navigator != 'undefined' && navigator.serviceWorker && navigator.serviceWorker.controller;
  return swState < 0 ? 'Uso sin conexión: no disponible en este entorno. Tus datos sí quedan guardados en el dispositivo, pero la app necesita internet para abrirse.' : on ? 'Uso sin conexión: activo. Si pierdes la cobertura, StrataFit se abre con la última versión que cargaste.' : 'Uso sin conexión: se prepara tras cargar la app una vez con conexión y volver a abrirla.';
};
export const offlineNote = () => html`<small class="mu" style="display:block;margin-top:10px">${offlineText()}</small>${raw(isStandalone() ? '' : '<small class="mu" style="display:block;margin-top:4px">Para tenerla como app: Compartir, Añadir a pantalla de inicio.</small>')}`;
export let updatesOn = FFDEP;
let updateReady = 0;
let updateCheckedAt = 0;
/** Versión publicada que se está anunciando (contenido de version.json) o null si no se pudo leer. */
let updateInfo = null;
/** ¿La versión a es posterior a b? Compara número a número: 1.10.0 es posterior a 1.9.3. */
const isNewerVersion = (a, b) => {
  const x = String(a || '').split('.').map(Number);
  const y = String(b || '').split('.').map(Number);
  for (let i = 0; i < 3; i++)
    if ((x[i] || 0) != (y[i] || 0))
      return (x[i] || 0) > (y[i] || 0);
  return false;
};
/** Lee version.json del servidor sin pasar por ninguna caché. Devuelve null si no hay conexión o no es válido. */
const fetchVersionInfo = async () => {
  if (location.protocol == 'file:')
    return null;
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok)
      return null;
    const j = await r.json();
    return j && typeof j.version == 'string' ? j : null;
  }
  catch (e) {
    logError('comprobar versión', e);
    return null;
  }
};
/** Lista de cambios de una o varias versiones (si se saltaron versiones, se enseñan todas las posteriores a la instalada). */
const releaseNotesHtml = (info, current) => {
  const all = info && Array.isArray(info.history) && info.history.length ? info.history : (info ? [info] : []);
  const list = current ? all : all.filter(v => isNewerVersion(v.version, APPV));
  const shown = list.length ? list.slice(0, 4) : (info ? [info] : []);
  const notes = shown.map(v => (shown.length > 1 ? html`<p class="upv">Versión ${v.version}</p>` : '') + (v.sections || []).map(s => html`<p class="ups">${s.title}</p><ul>${(s.items || []).slice(0, 8).map(i => html`<li>${i}</li>`)}</ul>`).join('')).join('');
  return notes || '<ul><li>Mejoras y correcciones.</li></ul>';
};
/** Ajustes → «Ver nota de actualización» (F-28): la nota de la versión instalada, solo la última, con todos sus cambios y,
    debajo, un «Cerrar» pequeño que vuelve a Ajustes. */
export const releaseNotePage = () => {
  const r = RELEASE;
  const d = /^\d{4}-\d\d-\d\d$/.test(r.date || '') ? new Date(r.date + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const body = (r.sections || []).map(s => html`<p class="ups">${s.title}</p><ul>${(s.items || []).map(i => html`<li>${i}</li>`)}</ul>`).join('');
  return html`<div class="cd rnp"><b class="rnv">Versión ${r.version || APPV}</b>${d ? html`<small class="mu">${d}</small>` : ''}${raw(body || '<ul><li>Mejoras y correcciones.</li></ul>')}</div><div class="rnc"><button class="lnk" data-a="zaj">Cerrar</button></div>`;
};
/** Tarjeta negra del aviso: «update» antes de actualizar (botón Actualizar) o «news» tras actualizar (botón Entendido). */
const updatePopupHtml = (info, mode) => {
  const v = info && info.version ? info.version : '';
  return html`<div class="updb" data-a="updLater"></div><div class="updk" role="dialog" aria-modal="true" aria-labelledby="updt"><button class="updx" data-a="updLater" aria-label="Cerrar">×</button><small class="upe">${mode == 'news' ? 'Novedades' : 'Nueva versión disponible'}</small><h3 id="updt">${raw(v ? 'Versión ' + X(v) : 'Versión nueva')}</h3><div class="upn">${raw(releaseNotesHtml(info, mode == 'news'))}</div><button class="upb" data-a="${mode == 'news' ? 'updLater' : 'updApply'}">${mode == 'news' ? 'Entendido' : 'Actualizar'}</button></div>`;
};
const showPopup = (info, mode) => {
  const old = document.getElementById('upd');
  if (old)
    old.remove();
  const d = document.createElement('div');
  d.id = 'upd';
  d.className = mode;
  d.innerHTML = updatePopupHtml(info, mode);
  document.body.appendChild(d);
};
/** Enseña el aviso de versión nueva (nunca en mitad de un entreno: se espera a que termine). */
const showUpdatePopup = () => {
  if (!updateReady || W || document.getElementById('upd'))
    return;
  showPopup(updateInfo, 'update');
  if (updateInfo && updateInfo.version)
    try {
      Store.set(Store.K.seen, updateInfo.version);
    }
    catch (e) {
      logError('anotar novedades vistas', e);
    }
};
/** El service worker ha descargado otra versión: se averigua cuál es y qué cambia, y se avisa si es posterior a esta.
   Si no se puede saber (sin conexión), no se avisa: la versión nueva se abrirá sola la próxima vez. */
let updateFound = 0;
const onUpdateFound = async () => {
  if (updateFound)
    return;
  updateFound = 1;
  const info = await fetchVersionInfo();
  if (!info || !isNewerVersion(info.version, APPV))
    return;
  updateInfo = info;
  updateReady = 1;
  showUpdatePopup();
};
/** ¿Hay que enseñar las novedades de esta versión? Anota la versión abierta; se llama una vez al arrancar (core/boot).
   Solo en la app instalada y solo si se viene de otra versión cuyas novedades no se vieron ya en el aviso previo. */
export const whatsNewDue = () => {
  if (!FFDEP)
    return false;
  let prev = null;
  let seen = null;
  try {
    prev = Store.get(Store.K.ver);
    seen = Store.get(Store.K.seen);
    Store.set(Store.K.ver, APPV);
  }
  catch (e) {
    logError('versión anterior', e);
    return false;
  }
  /* hasta la 1.19.0 no se guardaba la versión: si ya había datos, es una actualización */
  const updated = prev ? prev != APPV : (S.logs.length > 0 || (S.cp || []).length > 0 || (S.cr || []).length > 0);
  /* la versión con la que empezó este móvil, una sola vez: la que ya tenía (o '0', si era anterior a la 1.19.0) o esta, si es nuevo */
  try {
    if (!Store.get(Store.K.inst))
      Store.set(Store.K.inst, prev || (updated ? '0' : APPV));
  }
  catch (e) {
    logError('versión de partida', e);
  }
  return updated && seen != APPV && RELEASE.sections.length > 0;
};
/** 1 si las novedades esperan a que termine el entreno en curso. */
let whatsNewPending = 0;
/** Enseña una vez las novedades de esta versión (botón Entendido). */
export const showWhatsNew = () => {
  if (W) {
    whatsNewPending = 1;
    return;
  }
  whatsNewPending = 0;
  if (document.getElementById('upd'))
    return;
  showPopup(RELEASE, 'news');
  try {
    Store.set(Store.K.seen, APPV);
  }
  catch (e) {
    logError('anotar novedades vistas', e);
  }
};
/* — manejadores de esta función (registros A / C / U) — */
/** Actualizar: descarga ya la versión nueva (el service worker la guarda) y vuelve a abrir la app con ella. */
A.updApply = async (i, b) => {
  if (b) {
    b.disabled = true;
    b.textContent = 'Actualizando…';
  }
  try {
    await Promise.all(['./', 'index.html'].map(u => fetch(u + '?fresh=' + Date.now(), { cache: 'reload' })));
  }
  catch (e) {
    logError('descargar actualización', e);
  }
  try {
    location.reload();
  }
  catch (e) {
    /* recargar puede no estar permitido en algunas vistas */
  }
};
A.updLater = () => {
  updateReady = 0;
  const d = document.getElementById('upd');
  if (d)
    d.remove();
};
/** Ajustes → Actualizaciones: comprueba si hay versión nueva. */
A.updChk = async (i, b) => {
  if (!updatesOn) {
    toast('Las actualizaciones se comprueban en la app instalada');
    return;
  }
  /* en la fila de Ajustes cambia solo el valor de la derecha; en un botón normal, su texto */
  const tx = b && (b.querySelector('.srv') || b);
  const label = tx ? tx.textContent : '';
  if (b) {
    b.disabled = true;
    tx.textContent = 'Comprobando…';
  }
  const info = await fetchVersionInfo();
  if (b) {
    b.disabled = false;
    tx.textContent = label;
  }
  if (!info) {
    toast('No se ha podido comprobar. Revisa la conexión.');
    return;
  }
  if (!isNewerVersion(info.version, APPV)) {
    toast('Tienes la última versión (' + APPV + ')');
    return;
  }
  updateInfo = info;
  updateReady = 1;
  showUpdatePopup();
};
try {
  if (updatesOn && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data && e.data.t === 'upd')
        onUpdateFound();
    });
    /* por si el service worker detectó la versión nueva antes de que esta página escuchara */
    navigator.serviceWorker.ready.then(() => {
      if (navigator.serviceWorker.controller)
        navigator.serviceWorker.controller.postMessage({ t: 'ask' });
    }).catch(e => logError('preguntar por versión nueva', e));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.serviceWorker.controller && Date.now() - updateCheckedAt > 20 * 60 * 1e3) {
        updateCheckedAt = Date.now();
        fetch('./', { cache: 'no-cache' }).catch(() => {
        });
      }
    });
    updateCheckedAt = Date.now();
  }
}
catch (e) {
  logError('aviso de versión nueva', e);
}
/** Lo llama R(): durante un entreno se oculta el aviso; al terminar, vuelve. */
export const updatePopupSync = () => {
  if (whatsNewPending && !W)
    showWhatsNew();
  if (!updateReady)
    return;
  if (W) {
    const d = document.getElementById('upd');
    if (d && d.className == 'update')
      d.remove();
  }
  else
    showUpdatePopup();
};
