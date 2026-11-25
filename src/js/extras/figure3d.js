/* ═══ extras/figure3d ═══
   Las figuras 3D de los ejercicios, dibujadas con el motor (extras/motor3d). Este módulo, el motor y los encuadres ya
   calculados (data/figboxes) se descargan la primera vez que hace falta una figura (core/lazy, loadFigures); al cargarse,
   arranca el motor con el mapa muscular de la app y deja en core/lazy lo que extras/pictures le pide:
   - thumb: la miniatura de un ejercicio como imagen, la figura quieta en su momento, sin el rayado de los músculos (en
     pequeño no se distingue), con los tonos oscuros aclarados y encuadrada en lo que ocupa. Se pinta en un lienzo y se guarda
     en WebP (en PNG donde no hay WebP); si el navegador no deja leer el lienzo, la imagen es el propio dibujo (y no se guarda).
   - stages: la figura grande de la hoja «Cómo se hace». La que se mueve sigue el reloj de su gesto (el de su familia o el de
     ida y vuelta del motor), encuadrada en lo que ocupa el gesto entero; solo se dibuja mientras se ve, y nunca ocupa más de
     la mitad del tiempo en dibujar: si un dibujo cuesta, se hacen menos por segundo y, en un móvil lento, sin el rayado de
     los músculos. Quieta («Reducir animaciones»): la
     postura de inicio y la final, una junto a otra, o las más distintas de un gesto con su propio reloj (una sola si se
     mantiene, como una plancha).
   El momento de cada figura quieta y lo que ocupa cada una vienen ya calculados (tools/figboxes.js): aquí no se dibuja nada
   para medirlo. El motor hace cada ejercicio con sus músculos de la librería, como en las páginas de revisión.
   Define: F3, figs, exOf, fit, boxText, uid, STAGE, raster, LIGHTEN, defsById, defsFor, thumb, SLOW_FRAME, EARLY, WARM_UP, SAMPLE, frameCosts, plain, middle, frameCost, play, STILL_LABELS, stills, stages
*/
import { say } from '../core/i18n.js';
import { AN_H, AN_PA, AN_R, AN_S } from '../data/anatomy.js';
import { FIG_POSES } from '../data/figposes.js';
import { FIG_BOXES } from '../data/figboxes.js';
import { MUSCLE_REGIONS } from './anatomy.js';
import { motor3d } from './motor3d.js';
import { exByName } from '../library/model.js';
import { setFigureTools } from '../core/lazy.js';
import { html, raw } from '../core/html.js';
/* el motor, arrancado con el mapa muscular; sus degradados van en la página, para las figuras grandes */
const F3 = motor3d({ R: AN_R, S: AN_S, H: AN_H, PA: AN_PA }, MUSCLE_REGIONS);
document.body.insertAdjacentHTML('afterbegin', html`
  <svg width="0" height="0" class="pos-abs" aria-hidden="true" focusable="false"><defs>${raw(F3.DEFS)}</defs></svg>`);
/* el ejercicio del motor de cada nombre (null si no tiene figura): se hace una vez (ocupa unos 7 KB) */
/** @type {Map<string, Fig3DExercise | null>} */
const figs = new Map();
const exOf = n => {
  if (!figs.has(n)) {
    const e = exByName(n);
    figs.set(n, FIG_POSES[n] && FIG_BOXES[n] && e ? F3.make(n, FIG_POSES[n], e.p || [], e.s || []) : null);
  }
  return figs.get(n);
};
/** El recuadro b, agrandado un margin (de lo más largo) por cada lado y luego lo justo para que su ancho sea ratio veces su
    alto. */
const fit = (b, ratio, margin = .05) => {
  const k = margin * Math.max(b[2], b[3]);
  let [x, y, w, h] = [b[0] - k, b[1] - k, b[2] + 2 * k, b[3] + 2 * k];
  if (w / h < ratio) {
    x -= (h * ratio - w) / 2;
    w = h * ratio;
  }
  else {
    y -= (w / ratio - h) / 2;
    h = w / ratio;
  }
  return [x, y, w, h];
};
const boxText = b => b.map(v => Math.round(v * 10) / 10).join(' ');
/* cada figura grande lleva su propio prefijo en lo que define (degradados de la cabeza, rayados): dos en la página no se
   pisan */
let uid = 0;
/* la proporción de la figura grande (ancho entre alto), la de su sitio en la hoja (css/96-exercise-figures) */
const STAGE = 4 / 3;
/** Un dibujo (un <svg> completo, con sus degradados) como imagen de px×px: WebP (o PNG), o, si el navegador no deja leer el
    lienzo, el propio dibujo. keep: si vale la pena guardarla (la del lienzo; el dibujo pesa demasiado).
    @returns {Promise<{ blob: Blob, keep: boolean }>} */
const raster = (svg, px) => new Promise((res, rej) => {
  const drawing = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(drawing);
  const img = new Image();
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = px;
      c.height = px;
      c.getContext('2d').drawImage(img, 0, 0, px, px);
      URL.revokeObjectURL(url);
      c.toBlob(b => res(b ? { blob: b, keep: true } : { blob: drawing, keep: false }), 'image/webp', .85);
    }
    catch (e) {
      URL.revokeObjectURL(url);
      res({ blob: drawing, keep: false });
    }
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    rej(new Error('no se ha podido leer el dibujo de la figura'));
  };
  img.src = url;
});
/* en pequeño, la figura con los tonos oscuros aclarados (como un pictograma): oscura sobre el fondo oscuro de las
   miniaturas apenas se distinguía. Los colores de lo que trabaja casi no cambian */
const LIGHTEN = '<filter id="lt" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="gamma" exponent=".55"/><feFuncG type="gamma" exponent=".55"/><feFuncB type="gamma" exponent=".55"/></feComponentTransfer></filter>';
/* los degradados del motor, uno a uno: una miniatura es un dibujo suelto y lleva solo los que usa (leerla cuesta menos) */
const defsById = new Map((F3.DEFS.match(/<(radialGradient|linearGradient|pattern|mask|filter|clipPath)\b[^>]*\sid="[^"]+"[\s\S]*?<\/\1>/g) || []).map(d => /** @type {[string, string]} */ ([/\sid="([^"]+)"/.exec(d)[1], d])));
const defsFor = body => [...new Set([...body.matchAll(/url\(#([^)]+)\)/g)].map(m => m[1]))].map(id => defsById.get(id) || '').join('');
/** La miniatura del ejercicio n, de px×px píxeles: lo que se ve entero, con un margen pequeño.
    @returns {Promise<{ blob: Blob, keep: boolean }>} */
const thumb = (n, px) => {
  const ex = exOf(n);
  if (!ex)
    return Promise.reject(new Error('sin figura: ' + n));
  const box = FIG_BOXES[n];
  const body = F3.draw(ex, box[4], F3.camera(ex.yaw, ex.pitch), 'm', true);
  return raster(`<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${boxText(fit(box.slice(5, 9), 1, .04))}"><defs>${defsFor(body)}${LIGHTEN}</defs><g filter="url(#lt)">${body}</g></svg>`, px);
};
/* En un móvil lento, la figura que se mueve va sin el rayado de los músculos: a su tamaño apenas se nota y es un cuarto
   menos de trabajo en cada fotograma. Lento es que dibujar un fotograma le cueste más de SLOW_FRAME ms, con lo que no
   llegaría a 60 por segundo (ver play). Se mide una vez, con la primera figura: los WARM_UP primeros fotogramas no cuentan
   (el navegador aún está afinando el código y tardan el doble) y se mira la mediana de los SAMPLE siguientes. Si es tan
   lento que ya los primeros (EARLY) cuestan más del doble, no se espera a más */
const SLOW_FRAME = 9;
const EARLY = 12;
const WARM_UP = 30;
const SAMPLE = 40;
/** @type {number[] | null} */
let frameCosts = [];
let plain = false;
const middle = a => [...a].sort((x, y) => x - y)[a.length >> 1];
/** Apunta lo que ha costado un fotograma y, cuando hay bastantes, decide si el móvil es lento (plain) */
const frameCost = ms => {
  if (!frameCosts)
    return;
  const k = frameCosts.push(ms);
  plain = k == EARLY ? middle(frameCosts.slice(2)) > 2 * SLOW_FRAME : k == WARM_UP + SAMPLE && middle(frameCosts.slice(WARM_UP)) > SLOW_FRAME;
  if (plain || k == WARM_UP + SAMPLE)
    frameCosts = null;
};
/* la figura grande que se mueve: el gesto, en bucle, mientras se vea */
const play = svg => {
  svg.setAttribute('data-on', '1');
  const ex = exOf(svg.dataset.f3);
  if (!ex)
    return;
  const cam = F3.camera(ex.yaw, ex.pitch);
  svg.setAttribute('viewBox', boxText(fit(FIG_BOXES[svg.dataset.f3].slice(0, 4), STAGE)));
  const pre = 'f' + (++uid) + '_';
  const clock = ms => ex.beat ? ex.beat(ms) : F3.beat(ms, ex.up, false, ex.pause, ex.rest);
  let t0 = 0;
  let last = -1;
  let next = 0;
  let seen = true;
  const io = typeof IntersectionObserver == 'function' ? new IntersectionObserver(es => {
    seen = es[es.length - 1].isIntersecting;
  }) : null;
  if (io)
    io.observe(svg);
  const step = now => {
    if (!svg.isConnected) {
      if (io)
        io.disconnect();
      return;
    }
    t0 = t0 || now;
    if (seen && now >= next) {
      const t = clock(now - t0);
      if (t !== last) {
        const a = performance.now();
        last = t;
        svg.innerHTML = F3.draw(ex, t, cam, pre, plain);
        const cost = performance.now() - a;
        /* dibujar no ocupa más de la mitad del tiempo: tras un dibujo se espera, al menos, lo que ha costado (y el
           navegador aún tiene que pintarlo). En un móvil rápido son 60 por segundo; en uno lento, los que pueda */
        next = now + 2 * cost;
        frameCost(cost);
        svg.classList.add('on');
      }
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
/* los rótulos de las dos posturas de un gesto de ida y vuelta */
const STILL_LABELS = [['Inicio', 'Postura de inicio'], ['Final', 'Postura final']];
/* la figura grande quieta: sus posturas, una junto a otra; las de un gesto de ida y vuelta, con su rótulo */
const stills = box => {
  box.setAttribute('data-on', '1');
  const n = box.dataset.f3s;
  const ex = exOf(n);
  if (!ex)
    return;
  const cam = F3.camera(ex.yaw, ex.pitch);
  const b = FIG_BOXES[n];
  const stops = b.slice(13);
  /* el mismo encuadre para todas: el de todas las posturas, con la proporción de cada una en su sitio */
  const vb = boxText(fit(b.slice(9, 13), stops.length > 1 ? (STAGE - .08) / stops.length : STAGE));
  const one = (t, k) => {
    const label = ex.beat ? stops.length > 1 ? say `Postura ${k + 1} de ${stops.length}` : 'La postura del ejercicio' : STILL_LABELS[k][1];
    return html`<svg viewBox="${vb}" role="img" aria-label="${label}">${raw(F3.draw(ex, t, cam, 'f' + (++uid) + '_'))}</svg>`;
  };
  if (stops.length > 1) {
    box.classList.add('two');
    box.innerHTML = stops.map((t, k) => html`
      <figure>${raw(one(t, k))}${raw(ex.beat ? '' : html`<figcaption>${STILL_LABELS[k][0]}</figcaption>`)}</figure>`).join('');
  }
  else
    box.innerHTML = one(stops[0], 0);
  box.classList.add('on');
};
/** Pone en marcha las figuras grandes de root que aún no lo estén. */
const stages = root => {
  root.querySelectorAll('svg[data-f3]:not([data-on])').forEach(play);
  root.querySelectorAll('[data-f3s]:not([data-on])').forEach(stills);
};
setFigureTools(thumb, stages);
