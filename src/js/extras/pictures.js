/* ═══ extras/pictures ═══
   La imagen de un ejercicio: el modelo 3D haciéndolo (los de la librería) o, en uno propio, que no tiene figura, sus
   músculos en el mapa (extras/anatomy). Aquí está lo que se puede hacer sin el motor 3D: el motor (extras/motor3d) y lo que
   dibuja con él (extras/figure3d) solo se descargan cuando hace falta dibujar una figura (core/lazy, loadFigures).
   - Miniaturas (exPicture, exPictureLater): la figura quieta, como imagen. Cada una se dibuja una vez y se guarda en la
     memoria y en el móvil (IndexedDB, base «fffig»), así que la siguiente vez se enseña al momento, sin el motor. Son
     dibujos de la librería, iguales para cualquiera (no son datos de nadie), y se rehacen al cambiar de versión. Mientras se
     dibuja, su sitio es un hueco del mismo tamaño (svg[data-pic]), que se cambia por la imagen en cuanto está.
   - Figura grande de la hoja «Cómo se hace» (exMotion): aquí se pone su sitio, de proporción fija para que nada salte al
     llegar el dibujo, y extras/figure3d la dibuja y la mueve en cuanto aparece en la hoja.
   Define: figuresAt, figures, px, thumbPx, figDb, ready, failed, savedAt, loadSaved, thumbImg, thumbHole, holesOf, fillHole, fillName, queue, queued, ahead, AT_ONCE, busy, rest, save, draw, pump, want, warmUp, exHasFigure, exPicture, LATER_MARGIN, laterWatchers, laterWatched, nearView, watchLater, exPictureLater, exMotion, stagesIn
*/
import { APPV } from '../core/util.js';
import { idbStore } from '../core/idb.js';
import { logError } from '../core/errors.js';
import { loadFigures } from '../core/lazy.js';
import { html } from '../core/html.js';
import { FIG_POSES } from '../data/figposes.js';
import { S } from '../core/state.js';
import { exAnatomy } from './anatomy.js';
/* el motor y lo que dibuja con él (extras/figure3d), cargados una vez: si la descarga falla, se intenta otra vez la
   siguiente vez que hagan falta */
let figuresAt = null;
const figures = () => figuresAt || (figuresAt = loadFigures().catch(e => {
  figuresAt = null;
  throw e;
}));
/* el tamaño de las miniaturas en píxeles de la pantalla: la mayor (72 px, la de la ficha) en un móvil de densidad 3, o lo
   que pida la pantalla si es menos. Una para todas: las demás (48 y 64 px) se enseñan reducidas */
let px = 0;
const thumbPx = () => px || (px = Math.round(72 * Math.min(3, Math.max(1, window.devicePixelRatio || 1))));
/* lo guardado en el móvil: una fila por ejercicio, { n: nombre, v: versión de la app, px: tamaño, b: la imagen } */
const figDb = idbStore('fffig', { mini: { keyPath: 'n' } });
/* las miniaturas listas (nombre → dirección de su imagen) y las que no se han podido dibujar */
const ready = new Map();
const failed = new Set();
/* lo guardado en el móvil se lee una vez, la primera vez que se pide una miniatura */
let savedAt = null;
const loadSaved = () => savedAt || (savedAt = (!window.indexedDB ? Promise.resolve([]) : figDb('mini', 'readonly', st => st.getAll())).then(rows => {
  const old = [];
  for (const r of rows || []) {
    if (r && r.v == APPV && r.px == thumbPx() && r.b instanceof Blob) {
      if (!ready.has(r.n))
        ready.set(r.n, URL.createObjectURL(r.b));
    }
    else if (r && r.n)
      old.push(r.n);
  }
  /* las de otra versión (u otra pantalla) se borran: se rehacen al pedirlas */
  if (old.length)
    figDb('mini', 'readwrite', st => old.map(k => st.delete(k))).catch(e => logError('miniaturas viejas', e));
}).catch(e => logError('miniaturas guardadas', e)));
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
/* las miniaturas por dibujar, por orden: primero las que se piden con prisa (las filas que se ven); y las del plan, que se
   dibujan aunque no las espere nadie (warmUp) */
const queue = [];
const queued = new Set();
const ahead = new Set();
/* cuántas se dibujan a la vez: mientras una se guarda como imagen (lo hace el navegador aparte), se dibuja la siguiente */
const AT_ONCE = 2;
let busy = 0;
/* un respiro para la página entre una miniatura y la siguiente: dibujar una cuesta unos milisegundos */
const rest = () => new Promise(res => typeof requestIdleCallback == 'function' ? requestIdleCallback(() => res(), { timeout: 150 }) : setTimeout(res, 16));
/* guarda una miniatura en el móvil; si no cabe o no se puede, no pasa nada: se dibujará otra vez */
const save = (n, b) => {
  if (window.indexedDB)
    figDb('mini', 'readwrite', st => st.put({ n, v: APPV, px: thumbPx(), b })).catch(() => {
    });
};
/* dibuja una miniatura y la pone en sus huecos. Si lo que falla es cargar el motor (sin conexión la primera vez), no se da
   por perdida: se volverá a pedir */
const draw = n => {
  busy++;
  figures().then(fig => fig.thumbBlob(n, thumbPx()).then(out => {
    ready.set(n, URL.createObjectURL(out.blob));
    if (out.keep)
      save(n, out.blob);
  }, e => {
    failed.add(n);
    logError('miniatura de ' + n, e);
  }), e => logError('miniaturas', e)).then(() => {
    ahead.delete(n);
    fillName(n);
    busy--;
    return rest();
  }).then(pump);
};
/* las pedidas que alguien sigue esperando (un hueco en la página) o que son del plan, de AT_ONCE en AT_ONCE */
const pump = () => loadSaved().then(() => {
  while (busy < AT_ONCE && queue.length) {
    const n = queue.shift();
    queued.delete(n);
    if (ready.has(n) || failed.has(n) || !ahead.has(n) && !holesOf(n).length)
      fillName(n);
    else
      draw(n);
  }
});
/* pide la miniatura de n; con prisa (soon), delante de las demás */
const want = (n, soon) => {
  if (ready.has(n) || failed.has(n))
    return;
  if (queued.has(n)) {
    if (soon && queue[0] != n) {
      queue.splice(queue.indexOf(n), 1);
      queue.unshift(n);
    }
  }
  else {
    queued.add(n);
    if (soon)
      queue.unshift(n);
    else
      queue.push(n);
  }
  pump();
};
/* un rato después de abrir la app, en un momento libre: las miniaturas de los ejercicios del plan que aún no estén (tras
   instalar o actualizar la app), para que el día y el entreno las tengan al momento */
const warmUp = () => loadSaved().then(() => {
  for (const d of S.plan || [])
    for (const e of d && d.ex || [])
      if (e && exHasFigure(e.n) && !ready.has(e.n) && !failed.has(e.n)) {
        ahead.add(e.n);
        want(e.n);
      }
});
/** Si un ejercicio tiene figura (los de la librería; uno propio, no). */
export const exHasFigure = n => Object.prototype.hasOwnProperty.call(FIG_POSES, n);
/** La imagen pequeña de un ejercicio (s×s px): el modelo haciéndolo; en uno propio, que no tiene figura, sus músculos en el
    mapa. Si la miniatura aún no está, su hueco, que se llena en cuanto se dibuja. */
export const exPicture = (n, s) => {
  if (!exHasFigure(n) || failed.has(n))
    return exAnatomy(n, s);
  if (ready.has(n))
    return thumbImg(ready.get(n), s);
  want(n);
  return thumbHole(n, s);
};
/* ── las filas que aún no se ven ─────────────────────────────────────────────────────
   Una lista larga (un grupo de la librería, el buscador, «Añadir ejercicio», Swap) pide primero las miniaturas de sus
   primeras filas, las que se ven. Las demás llevan un hueco (exPictureLater) que se llena al momento si la miniatura ya
   estaba (guardada en el móvil o dibujada antes); si no, se pide detrás de las otras, de arriba abajo, y pasa delante en
   cuanto su fila se acerca a lo que se ve (quien vigila la página que se desliza avisa: IntersectionObserver). Al cerrar la
   lista se deja de dibujar lo que ya nadie espera. */
/* cuánto antes de verse se pide la miniatura de una fila, por arriba y por abajo */
const LATER_MARGIN = '700px 0px';
/* quien vigila las filas de cada página que se desliza (el .sheet de la hoja; fuera de una hoja, la ventana) y las filas que
   ya vigila */
const laterWatchers = new WeakMap();
const laterWatched = new WeakSet();
/* una fila se acerca: sus huecos piden su miniatura, con prisa */
const nearView = row => (row.matches('svg[data-pic]') ? [row] : [...row.querySelectorAll('svg[data-pic]')]).forEach(hole => {
  fillHole(hole);
  if (hole.isConnected && hole.dataset.pic)
    want(hole.dataset.pic, true);
});
/* con huecos nuevos en root: se llenan los que ya tienen miniatura y se vigila la fila de los demás */
const watchLater = root => {
  const holes = root.querySelectorAll('svg[data-pic]');
  if (!holes.length)
    return;
  loadSaved().then(() => holes.forEach(hole => {
    if (hole.isConnected)
      fillHole(hole);
  }));
  holes.forEach(hole => {
    const row = hole.closest('.item-split') || hole;
    if (laterWatched.has(row))
      return;
    laterWatched.add(row);
    want(hole.dataset.pic);
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
    se llena solo al acercarse. */
export const exPictureLater = (n, s) => exHasFigure(n) && ready.has(n) ? thumbImg(ready.get(n), s) : exHasFigure(n) && !failed.has(n) ? thumbHole(n, s) : exAnatomy(n, s);
/** La figura grande de un ejercicio, que se mueve con el gesto; still (con «Reducir animaciones»), sus posturas quietas.
    '' si no tiene figura. Es su sitio, de proporción fija: la figura la pone extras/figure3d al aparecer en la hoja. */
export const exMotion = (n, still) => !exHasFigure(n) ? '' : still ? html`<div class="fgs" data-f3s="${n}"></div>` : html`
  <div class="fgs"><svg data-f3="${n}" viewBox="0 0 400 300" role="img" aria-label="El movimiento, del inicio al final"></svg></div>`;
/* las figuras grandes que haya en root y no estén aún en marcha: se carga el motor y se ponen */
const stagesIn = root => {
  if (!root.querySelector('[data-f3]:not([data-on]),[data-f3s]:not([data-on])'))
    return;
  figures().then(fig => fig.startStages(root)).catch(e => logError('figura grande', e));
};
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
setTimeout(() => typeof requestIdleCallback == 'function' ? requestIdleCallback(warmUp, { timeout: 4000 }) : warmUp(), 4000);
