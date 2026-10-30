/* ═══ system/updates ═══
   Actualización de la app, modo sin conexión y service worker.
   Define: ICON_SVG, swState, offlineText, offlineNote, updatesOn, updateReady, updateCheckedAt, showUpdateBanner, updateBannerSync  · acciones/registros: 2
*/
const ICON_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1024 1024\"><defs> <radialGradient id=\"b1\" cx=\"22%\" cy=\"18%\" r=\"62%\"><stop offset=\"0\" stop-color=\"#8b55ff\"/><stop offset=\"1\" stop-color=\"#8b55ff\" stop-opacity=\"0\"/></radialGradient> <radialGradient id=\"b2\" cx=\"88%\" cy=\"28%\" r=\"60%\"><stop offset=\"0\" stop-color=\"#3f7bff\"/><stop offset=\"1\" stop-color=\"#3f7bff\" stop-opacity=\"0\"/></radialGradient> <radialGradient id=\"b3\" cx=\"62%\" cy=\"98%\" r=\"68%\"><stop offset=\"0\" stop-color=\"#f0507f\"/><stop offset=\"1\" stop-color=\"#f0507f\" stop-opacity=\"0\"/></radialGradient> <linearGradient id=\"gs\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#fff\" stop-opacity=\".30\"/><stop offset=\"1\" stop-color=\"#fff\" stop-opacity=\".06\"/></linearGradient> <linearGradient id=\"ge\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#fff\" stop-opacity=\".85\"/><stop offset=\".5\" stop-color=\"#fff\" stop-opacity=\".1\"/><stop offset=\"1\" stop-color=\"#fff\" stop-opacity=\".35\"/></linearGradient> <linearGradient id=\"wh\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#ffffff\"/><stop offset=\"1\" stop-color=\"#ddd0ff\"/></linearGradient><filter id=\"sh\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"170%\"><feDropShadow dx=\"0\" dy=\"22\" stdDeviation=\"26\" flood-color=\"#1a0a55\" flood-opacity=\".45\"/></filter> <filter id=\"sh2\" x=\"-20%\" y=\"-30%\" width=\"140%\" height=\"180%\"><feDropShadow dx=\"0\" dy=\"12\" stdDeviation=\"12\" flood-color=\"#2a1180\" flood-opacity=\".55\"/></filter></defs> <rect width=\"1024\" height=\"1024\" fill=\"#140f3a\"/><rect width=\"1024\" height=\"1024\" fill=\"url(#b1)\"/><rect width=\"1024\" height=\"1024\" fill=\"url(#b2)\"/><rect width=\"1024\" height=\"1024\" fill=\"url(#b3)\" opacity=\".9\"/> <g filter=\"url(#sh)\"><circle cx=\"512\" cy=\"512\" r=\"318\" fill=\"url(#gs)\"/></g> <circle cx=\"512\" cy=\"512\" r=\"318\" fill=\"none\" stroke=\"url(#ge)\" stroke-width=\"5\"/> <g filter=\"url(#sh2)\"><rect x=\"362.0\" y=\"498.0\" width=\"300.0\" height=\"28.0\" rx=\"14.0\" fill=\"url(#wh)\"/><rect x=\"343.0\" y=\"405.0\" width=\"38.0\" height=\"214.0\" rx=\"19.0\" fill=\"url(#wh)\"/><rect x=\"643.0\" y=\"405.0\" width=\"38.0\" height=\"214.0\" rx=\"19.0\" fill=\"url(#wh)\"/><rect x=\"295.0\" y=\"442.0\" width=\"34.0\" height=\"140.0\" rx=\"17.0\" fill=\"url(#wh)\"/><rect x=\"695.0\" y=\"442.0\" width=\"34.0\" height=\"140.0\" rx=\"17.0\" fill=\"url(#wh)\"/></g></svg>";
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
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ICON_SVG);
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
const offlineText = () => {
  const on = typeof navigator != 'undefined' && navigator.serviceWorker && navigator.serviceWorker.controller;
  return swState < 0 ? 'Uso sin conexión: no disponible en este entorno. Tus datos sí quedan guardados en el dispositivo, pero la app necesita internet para abrirse.' : on ? 'Uso sin conexión: activo. Si pierdes la cobertura, StrataFit se abre con la última versión que cargaste.' : 'Uso sin conexión: se prepara tras cargar la app una vez con conexión y volver a abrirla.';
};
const offlineNote = () => '<small class="mu" style="display:block;margin-top:10px">' + offlineText() + '</small>' + (isStandalone() ? '' : '<small class="mu" style="display:block;margin-top:4px">Para tenerla como app: Compartir, Añadir a pantalla de inicio.</small>');
let updatesOn = FFDEP;
let updateReady = 0;
let updateCheckedAt = 0;
const showUpdateBanner = () => {
  if (!updateReady || W || document.getElementById('upd'))
    return;
  const d = document.createElement('div');
  d.id = 'upd';
  d.setAttribute('role', 'status');
  d.innerHTML = '<span>Nueva versión disponible</span><button data-a="upx">Luego</button><button data-a="upr">Actualizar</button>';
  document.body.appendChild(d);
};
A.upr = () => {
  try {
    location.reload();
  }
  catch (e) {
    /* recargar puede no estar permitido en algunas vistas */
  }
};
A.upx = () => {
  updateReady = 0;
  const d = document.getElementById('upd');
  if (d)
    d.remove();
};
try {
  if (updatesOn && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data && e.data.t === 'upd') {
        updateReady = 1;
        showUpdateBanner();
      }
    });
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
const updateBannerSync = () => {
  if (!updateReady)
    return;
  if (W) {
    const d = document.getElementById('upd');
    if (d)
      d.remove();
  }
  else
    showUpdateBanner();
};
