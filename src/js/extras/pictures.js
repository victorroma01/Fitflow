/* ═══ extras/pictures ═══
   La imagen de un ejercicio: el modelo 3D haciéndolo (los de la librería) o, en uno propio, que no tiene figura, sus
   músculos en el mapa (extras/anatomy). Aquí está lo que se puede hacer sin el motor 3D: el motor (extras/motor3d) y lo que
   dibuja con él (extras/figure3d) solo se descargan cuando hace falta dibujar una figura (core/lazy, loadFigures).
   - Miniaturas (exPicture, exPictureLater): la figura quieta, como imagen. Cada una se dibuja una vez y se guarda en la
     memoria y en el móvil (IndexedDB, base «fffig»), así que la siguiente vez se enseña al momento, sin el motor. Son
     dibujos de la librería, iguales para cualquiera (no son datos de nadie), y solo se rehacen cuando una versión cambia las
     figuras (data/figstamp). Mientras se
     busca o se dibuja, su sitio es un hueco del mismo tamaño (svg[data-pic]), que se cambia por la imagen en cuanto está.
   - Dibujarlas no estorba: las que se ven (el día, el entreno, la ficha, las primeras filas de una lista) se dibujan ya, de
     dos en dos y con un respiro entre una y otra; las demás (el resto de una lista abierta, las del plan tras instalar o
     actualizar), de una en una y solo mientras no se toca la pantalla ni se mueve la figura grande.
   - Figura grande de la hoja «Cómo se hace» (exMotion): aquí se pone su sitio, de proporción fija para que nada salte al
     llegar el dibujo, y extras/figure3d la dibuja y la mueve en cuanto aparece en la hoja.
   Define: RETRY, RETRY_MAX, figuresAt, retryAt, retryWait, retryTimer, engineResting, figures, thumbSize, thumbPx, figDb, STAMP_KEY, storeAt, storeReady, ready, failed, thumbImg, thumbHole, holesOf, fillHole, fillName, toLook, looked, looking, lookUp, soonLine, laterLine, lined, ahead, AT_ONCE, drawing, CALM, movedAt, calmTimer, isCalm, breathe, keep, drawThumb, pump, lineUp, want, warmUp, exHasFigure, exPicture, LATER_MARGIN, laterWatchers, laterWatched, nearView, watchLater, exPictureLater, exMotion, askedStages, stagesIn, wake
*/
import { idbStore } from '../core/idb.js';
import { logError } from '../core/errors.js';
import { loadFigures } from '../core/lazy.js';
import { html } from '../core/html.js';
import { FIG_POSES } from '../data/figposes.js';
import { FIG_STAMP } from '../data/figstamp.js';
import { S } from '../core/state.js';
import { exAnatomy } from './anatomy.js';
import { liveName } from '../library/model.js';
/* el motor y lo que dibuja con él (extras/figure3d), cargados una vez. Si la descarga falla (sin conexión y sin el código
   guardado aún, o con una versión que ya no está en el servidor), no se pide otra vez enseguida: lo pediría cada miniatura
   de la cola, y son tres archivos cada vez. Se deja pasar RETRY ms, el doble tras cada fallo seguido (hasta RETRY_MAX), y
   entonces sigue la cola (wake); al volver la conexión, o si el usuario abre una figura grande, ya. Mientras tanto, las
   miniaturas se quedan en su hueco y en su cola. Se apunta el primer fallo de cada racha, no cada intento. */
const RETRY = 4000;
const RETRY_MAX = 300000;
let figuresAt = null;
let retryAt = 0;
let retryWait = RETRY;
let retryTimer = 0;
/* ¿se está dejando pasar el rato tras un fallo? */
const engineResting = () => !figuresAt && performance.now() < retryAt;
const figures = () => figuresAt || (figuresAt = loadFigures().then(fig => {
  retryWait = RETRY;
  return fig;
}, e => {
  figuresAt = null;
  if (retryWait == RETRY)
    logError('motor de las figuras', e);
  retryAt = performance.now() + retryWait;
  clearTimeout(retryTimer);
  retryTimer = setTimeout(wake, retryWait + 20);
  retryWait = Math.min(RETRY_MAX, retryWait * 2);
  throw e;
}));
/* el tamaño de las miniaturas en píxeles de la pantalla: la mayor (72 px, la de la ficha) en un móvil de densidad 3, o lo
   que pida la pantalla si es menos. Una para todas: las demás (48 y 64 px) se enseñan reducidas */
let thumbSize = 0;
const thumbPx = () => thumbSize || (thumbSize = Math.round(72 * Math.min(3, Math.max(1, window.devicePixelRatio || 1))));
/* lo guardado en el móvil: por cada ejercicio (la clave es su nombre), su miniatura { t: tipo de imagen, d: sus bytes } (los
   bytes y no un Blob: Safari ha fallado al guardar Blobs en IndexedDB); y una fila (STAMP_KEY) con la huella de las figuras
   (data/figstamp) y el tamaño con que se dibujaron */
const figDb = idbStore('fffig', { mini: null });
const STAMP_KEY = '\0de';
/* la primera vez que hace falta: si lo guardado es de otras figuras (o de otro tamaño), se vacía. Da si lo guardado
   se puede usar (no, sin IndexedDB o si falla: las miniaturas se quedan solo en la memoria) */
let storeAt = null;
const storeReady = () => storeAt || (storeAt = !window.indexedDB ? Promise.resolve(false) : figDb('mini', 'readonly', st => st.get(STAMP_KEY))
  .then(v => v === FIG_STAMP + ' ' + thumbPx() || figDb('mini', 'readwrite', st => [st.clear(), st.put(FIG_STAMP + ' ' + thumbPx(), STAMP_KEY)]).then(() => true))
  .catch(e => {
  logError('miniaturas guardadas', e);
  return false;
}));
/* las miniaturas listas (nombre → dirección de su imagen) y las que no se han podido dibujar */
const ready = new Map();
const failed = new Set();
/** La miniatura lista, como imagen de s×s px. */
const thumbImg = (u, s) => html`<img src="${u}" width="${s}" height="${s}" alt="" draggable="false">`;
/** El hueco de una miniatura que aún no está. */
const thumbHole = (n, s) => html`<svg width="${s}" height="${s}" data-pic="${n}" aria-hidden="true" focusable="false"></svg>`;
/* los huecos que esperan la miniatura de n (en cualquier sitio de la página) */
const holesOf = n => [...document.querySelectorAll('svg[data-pic]')].filter(h => h.dataset.pic == n);
/* pone su miniatura en un hueco, si ya está; si no se pudo dibujar, el hueco deja de serlo y lleva sus músculos */
const fillHole = hole => {
  const n = hole.dataset.pic;
  if (ready.has(n))
    hole.outerHTML = thumbImg(ready.get(n), +hole.getAttribute('width'));
  else if (failed.has(n))
    hole.outerHTML = exAnatomy(n, +hole.getAttribute('width'));
};
const fillName = n => holesOf(n).forEach(fillHole);
/* ── buscar en lo guardado ───────────────────────────────────────────────────────────
   Una miniatura pedida se busca primero en el móvil; todas las pedidas a la vez (una pantalla, una lista) se leen juntas.
   Solo se lee lo que se pide: abrir la app no trae todas las guardadas. */
/* las que faltan por buscar (nombre → con cuánta prisa se pidió) y las ya buscadas que no estaban */
const toLook = new Map();
const looked = new Set();
let looking = false;
const lookUp = () => {
  if (looking || !toLook.size)
    return;
  looking = true;
  const asked = [...toLook];
  toLook.clear();
  storeReady().then(ok => ok ? figDb('mini', 'readonly', st => asked.map(([n]) => st.get(n))) : []).catch(e => {
    logError('leer miniaturas', e);
    return [];
  }).then(rows => {
    asked.forEach(([n, hurry], i) => {
      const r = rows[i];
      looked.add(n);
      if (r && r.d && !ready.has(n))
        ready.set(n, URL.createObjectURL(new Blob([r.d], { type: r.t })));
      if (ready.has(n))
        fillName(n);
      else
        lineUp(n, hurry);
    });
    looking = false;
    lookUp();
    pump();
  });
};
/* ── dibujar las que faltan ──────────────────────────────────────────────────────────── */
/* las que hay que dibujar: con prisa (las que se ven) y sin ella; de cada una, en cuál de las dos está (1 o 0); y las del
   plan, que se dibujan aunque no las espere ningún hueco (warmUp) */
const soonLine = [];
const laterLine = [];
const lined = new Map();
const ahead = new Set();
/* cuántas con prisa se dibujan a la vez: mientras una se guarda como imagen (lo hace el navegador aparte), se dibuja la
   siguiente. Las de sin prisa van de una en una */
const AT_ONCE = 2;
let drawing = 0;
/* las de sin prisa esperan a que la pantalla lleve este rato sin tocarse (ms) y a que no haya una figura moviéndose (la de
   la hoja «Cómo se hace»): dibujar una ocupa unos milisegundos (decenas, en un móvil lento) en los que la app no atiende, y
   deslizando una lista, marcando una serie o viendo el gesto se notaría */
const CALM = 600;
let movedAt = -CALM;
let calmTimer = 0;
for (const type of ['pointerdown', 'touchstart', 'touchmove', 'wheel', 'scroll', 'keydown'])
  window.addEventListener(type, () => {
    movedAt = performance.now();
  }, { capture: true, passive: true });
const isCalm = () => document.visibilityState == 'visible' && performance.now() - movedAt >= CALM && !document.querySelector('svg[data-f3]');
/* un respiro para la página entre una miniatura y la siguiente */
const breathe = () => new Promise(res => typeof requestIdleCallback == 'function' ? requestIdleCallback(() => res(), { timeout: 150 }) : setTimeout(res, 16));
/* guarda una miniatura en el móvil; si no cabe o no se puede, no pasa nada: se dibujará otra vez */
const keep = (n, blob) => storeReady().then(ok => ok && blob.arrayBuffer().then(d => figDb('mini', 'readwrite', st => st.put({ t: blob.type, d }, n)))).catch(() => {
});
/* dibuja una miniatura y la pone en sus huecos. Si lo que falla es cargar el motor (sin conexión la primera vez), no se da
   por perdida: vuelve a su cola (hurry, como en lineUp) y se dibujará cuando el motor llegue (figures) */
const drawThumb = (n, hurry) => {
  drawing++;
  figures().then(fig => fig.thumb(n, thumbPx()).then(out => {
    ready.set(n, URL.createObjectURL(out.blob));
    if (out.keep)
      keep(n, out.blob);
  }, e => {
    failed.add(n);
    logError('miniatura de ' + n, e);
  }).then(() => {
    ahead.delete(n);
    fillName(n);
  }), () => lineUp(n, hurry)).then(breathe).then(() => {
    drawing--;
    pump();
  });
};
/* la siguiente: una con prisa o, si no queda ninguna ni se está dibujando otra, una de sin prisa con la pantalla tranquila.
   Solo se dibuja la que alguien sigue esperando (un hueco en la página) o es del plan */
const pump = () => {
  /* sin el motor (su descarga ha fallado) no se dibuja: la cola sigue cuando toque pedirlo otra vez (figures, wake) */
  if (engineResting())
    return;
  while (drawing < AT_ONCE) {
    let n = soonLine.shift();
    const soon = n !== undefined;
    if (!soon) {
      if (drawing || !laterLine.length)
        return;
      if (!isCalm()) {
        clearTimeout(calmTimer);
        calmTimer = setTimeout(pump, CALM);
        return;
      }
      n = laterLine.shift();
    }
    lined.delete(n);
    if (ready.has(n) || failed.has(n) || !ahead.has(n) && !holesOf(n).length)
      fillName(n);
    else
      drawThumb(n, soon ? 2 : 0);
  }
};
/* apunta una miniatura para dibujarla: hurry 0, sin prisa; 1, con prisa; 2, la primera (su fila se acerca a lo que se ve) */
const lineUp = (n, hurry) => {
  const at = lined.get(n);
  if (at === 1 && hurry < 2 || at === 0 && !hurry)
    return;
  if (at !== undefined)
    (at ? soonLine : laterLine).splice((at ? soonLine : laterLine).indexOf(n), 1);
  lined.set(n, hurry ? 1 : 0);
  if (hurry > 1)
    soonLine.unshift(n);
  else
    (hurry ? soonLine : laterLine).push(n);
};
/* pide la miniatura de n: se busca en lo guardado y, si no está, se dibuja */
const want = (n, hurry) => {
  if (ready.has(n) || failed.has(n))
    return;
  if (looked.has(n)) {
    lineUp(n, hurry);
    pump();
  }
  else {
    toLook.set(n, Math.max(hurry, toLook.get(n) || 0));
    lookUp();
  }
};
/* un rato después de abrir la app: las miniaturas de los ejercicios del plan que aún no estén (tras instalar o actualizar
   la app), sin prisa, para que el día y el entreno las tengan al momento */
const warmUp = () => {
  for (const d of S.plan || [])
    for (const e of d && d.ex || [])
      if (e && exHasFigure(e.n)) {
        ahead.add(liveName(e.n));
        want(liveName(e.n), 0);
      }
};
/** Si un ejercicio tiene figura (los de la librería; uno propio, no). Uno que ya no está en la librería porque era el mismo que
    otro (data/aliases: EX_RETIRED), y que puede seguir en un plan o en un entreno guardado, lleva la del que queda. */
export const exHasFigure = n => Object.prototype.hasOwnProperty.call(FIG_POSES, liveName(n));
/** La imagen pequeña de un ejercicio (s×s px): el modelo haciéndolo; en uno propio, que no tiene figura, sus músculos en el
    mapa. Si la miniatura aún no está, su hueco, que se llena en cuanto se encuentra o se dibuja. */
export const exPicture = (n, s) => {
  const m = liveName(n);
  if (!exHasFigure(m) || failed.has(m))
    return exAnatomy(n, s);
  if (ready.has(m))
    return thumbImg(ready.get(m), s);
  want(m, 1);
  return thumbHole(m, s);
};
/* ── las filas que aún no se ven ─────────────────────────────────────────────────────
   Una lista larga (un grupo de la librería, el buscador, «Añadir ejercicio», Swap) pide con prisa las miniaturas de sus
   primeras filas, las que se ven. Las demás llevan un hueco (exPictureLater) que se llena al momento si la miniatura ya
   estaba guardada; si no, se dibuja sin prisa, de arriba abajo, y pasa delante de todas en cuanto su fila se acerca a lo que
   se ve (quien vigila la página que se desliza avisa: IntersectionObserver). Al cerrar la lista se deja de dibujar lo que
   ya nadie espera. */
/* cuánto antes de verse se pide con prisa la miniatura de una fila, por arriba y por abajo */
const LATER_MARGIN = '700px 0px';
/* quien vigila las filas de cada página que se desliza (el .sheet de la hoja; fuera de una hoja, la ventana) y las filas que
   ya vigila */
const laterWatchers = new WeakMap();
const laterWatched = new WeakSet();
/* una fila se acerca: sus huecos piden su miniatura, la primera */
const nearView = row => (row.matches('svg[data-pic]') ? [row] : [...row.querySelectorAll('svg[data-pic]')]).forEach(hole => {
  fillHole(hole);
  if (hole.isConnected && hole.dataset.pic)
    want(hole.dataset.pic, 2);
});
/* con huecos nuevos en root: se piden sin prisa y se vigila su fila */
const watchLater = root => {
  root.querySelectorAll('svg[data-pic]').forEach(hole => {
    const row = hole.closest('.item-split') || hole;
    if (laterWatched.has(row))
      return;
    laterWatched.add(row);
    fillHole(hole);
    if (!hole.isConnected)
      return;
    want(hole.dataset.pic, 0);
    if (typeof IntersectionObserver == 'undefined') {
      nearView(row);
      return;
    }
    const page = hole.closest('.sheet') || document.documentElement;
    let watcher = laterWatchers.get(page);
    if (!watcher) {
      watcher = new IntersectionObserver((entries, w) => entries.forEach(en => {
        if (!en.isIntersecting)
          return;
        w.unobserve(en.target);
        nearView(en.target);
      }), { root: page == document.documentElement ? null : page, rootMargin: LATER_MARGIN });
      laterWatchers.set(page, watcher);
    }
    watcher.observe(row);
  });
};
/** El sitio de la imagen pequeña de un ejercicio en una fila que aún no se ve: la miniatura, si ya está; si no, un hueco que
    se llena solo. */
export const exPictureLater = (n, s) => {
  const m = liveName(n);
  return !exHasFigure(m) || failed.has(m) ? exAnatomy(n, s) : ready.has(m) ? thumbImg(ready.get(m), s) : thumbHole(m, s);
};
/** La figura grande de un ejercicio, que se mueve con el gesto; still (con «Reducir animaciones»), sus posturas quietas.
    '' si no tiene figura. Es su sitio, de proporción fija: la figura la pone extras/figure3d al aparecer en la hoja. */
export const exMotion = (n, still) => !exHasFigure(n) ? '' : still ? html`<div class="figure-stage" data-f3s="${liveName(n)}"></div>` : html`
  <div class="figure-stage">
    <svg data-f3="${liveName(n)}" viewBox="0 0 400 300" role="img" aria-label="El movimiento, del inicio al final"></svg>
  </div>`;
/* las figuras grandes que haya en root y no estén aún en marcha: se carga el motor y se ponen. Si el motor no se pudo
   descargar y aún no toca pedirlo otra vez, una figura recién abierta lo pide ya, una sola vez (la ha abierto el usuario):
   cada cambio en la hoja pasa por aquí, y no puede ser otra petición */
const askedStages = new WeakSet();
const stagesIn = root => {
  const stage = root.querySelector('[data-f3]:not([data-on]),[data-f3s]:not([data-on])');
  if (!stage)
    return;
  if (engineResting()) {
    if (askedStages.has(stage))
      return;
    retryAt = 0;
  }
  askedStages.add(stage);
  figures().then(fig => fig.stages(root), () => null).catch(e => logError('figura grande', e));
};
/* pasado el rato tras un fallo del motor, o al volver la conexión: sigue la cola de miniaturas y, si hay una figura grande
   esperando en la hoja, se pone */
const wake = () => {
  pump();
  const sh = document.getElementById('sh');
  if (sh)
    stagesIn(sh);
};
window.addEventListener('online', () => {
  if (!engineResting())
    return;
  retryAt = 0;
  wake();
});
/* las listas largas y las figuras grandes van en la hoja (#sh): cada vez que se pinta algo en ella, se miran sus huecos y
   sus figuras (no lo que cambia dentro de una figura grande ya puesta, que es cada fotograma de su movimiento) */
if (document.getElementById('sh') && typeof MutationObserver != 'undefined')
  new MutationObserver(records => {
    if (records.every(r => r.target instanceof Element && r.target.closest('[data-on]')))
      return;
    const sh = document.getElementById('sh');
    watchLater(sh);
    stagesIn(sh);
  }).observe(document.getElementById('sh'), { childList: true, subtree: true });
setTimeout(warmUp, 4000);
