/* ═══ extras/figure3d ═══
   Las figuras 3D de los ejercicios, dibujadas con el motor (extras/motor3d). Este módulo y el motor se descargan la primera
   vez que hace falta una figura (core/lazy, loadFigures) y extras/pictures le pide lo que necesita:
   - thumbBlob: la miniatura de un ejercicio como imagen, la figura quieta en su momento (stillAt), sin el rayado de los
     músculos (en pequeño no se distingue) y encuadrada en lo que ocupa. Se pinta en un lienzo y se guarda en WebP (en PNG
     donde no hay WebP); si el navegador no deja leer el lienzo, la imagen es el propio dibujo (y no se guarda).
   - startStages: la figura grande de la hoja «Cómo se hace». La que se mueve sigue el reloj de su gesto (el de su familia o
     el de ida y vuelta del motor), encuadrada en lo que ocupa el gesto entero; solo se dibuja mientras se ve, y si dibujarla
     cuesta, menos veces por segundo. Quieta («Reducir animaciones»): la postura de inicio y la final, una junto a otra, o una
     sola si el gesto es un ciclo (correr, remar) o se mantiene (una plancha).
   El motor recibe el mapa muscular de la app y los músculos de cada ejercicio de la librería, como las páginas de revisión.
   Define: F3, startFigures, figs, exOf, moments, fit, boxText, uid, STAGE, MOMENTS, raster, LIGHTEN, thumbBlob, play, stills, startStages
*/
import { AN_H, AN_PA, AN_R, AN_S } from '../data/anatomy.js';
import { FIG_POSES } from '../data/figposes.js';
import { MUSCLE_REGIONS } from './anatomy.js';
import { exByName } from '../library/model.js';
import { html, raw } from '../core/html.js';
/** @type {Fig3D} */
let F3 = null;
/** Arranca el motor (una vez) con el mapa muscular y pone sus degradados en la página, para las figuras grandes.
    @param {(map: object, regions: object) => Fig3D} motor */
export const startFigures = motor => {
  if (F3)
    return;
  F3 = motor({ R: AN_R, S: AN_S, H: AN_H, PA: AN_PA }, MUSCLE_REGIONS);
  document.body.insertAdjacentHTML('afterbegin', html`
    <svg width="0" height="0" class="pos-abs" aria-hidden="true" focusable="false"><defs>${raw(F3.DEFS)}</defs></svg>`);
};
/* el ejercicio del motor de cada nombre (null si no tiene figura): se hace una vez */
/** @type {Map<string, Fig3DExercise | null>} */
const figs = new Map();
const exOf = n => {
  if (!figs.has(n)) {
    const e = exByName(n);
    figs.set(n, FIG_POSES[n] && e ? F3.make(n, FIG_POSES[n], e.p || [], e.s || []) : null);
  }
  return figs.get(n);
};
/** Los momentos quietos de un gesto: el de la miniatura (thumb) y los de la figura grande quieta (stills, con su rótulo).
    En un gesto de ida y vuelta, la postura final (la de un curl arriba, la de una sentadilla abajo) y, quietas, la de inicio
    y la final. En uno con su propio reloj (un ciclo, uno que alterna los lados, una secuencia), las posturas más distintas
    entre sí, hasta tres y por orden: se mira el gesto en 24 momentos y se toma el principio, la postura más lejos de él (la
    de la miniatura: el otro paso al correr, el brazo arriba en un curl alterno, la barra arriba en un clean & jerk) y, si la
    hay, otra bien lejos de las dos. Si casi no se mueve (una plancha), una sola. La familia puede decir el de la miniatura
    (still). Se calcula una vez por ejercicio.
    @returns {{ thumb: number, stills: [number, string, string][] }} */
const moments = ex => {
  if (ex.moments)
    return ex.moments;
  /** @type {{ thumb: number, stills: [number, string, string][] }} */
  let out;
  if (!ex.beat)
    out = { thumb: 1, stills: [[0, 'Inicio', 'Postura de inicio'], [1, 'Final', 'Postura final']] };
  else {
    const ts = Array.from({ length: 24 }, (_, i) => i / 24);
    /* cada postura, por sus rodillas, tobillos, codos y muñecas */
    const pts = ts.map(t => {
      const { J } = F3.pose(ex.at(t));
      return [J.L.knee, J.R.knee, J.L.ankle, J.R.ankle, J.L.el, J.R.el, J.L.wr, J.R.wr];
    });
    const dist = (a, b) => Math.max(...pts[a].map((p, k) => Math.hypot(p[0] - pts[b][k][0], p[1] - pts[b][k][1], p[2] - pts[b][k][2])));
    const pick = [0];
    /* la postura más lejos de las que ya hay, y cuánto */
    const farthest = () => {
      let best = -1;
      let at = 0;
      ts.forEach((_, i) => {
        const m = Math.min(...pick.map(j => dist(i, j)));
        if (m > best) {
          best = m;
          at = i;
        }
      });
      return [at, best];
    };
    const [second, spread] = farthest();
    if (spread < 20)
      out = { thumb: .25, stills: [[.25, '', 'La postura del ejercicio']] };
    else {
      pick.push(second);
      const [third, gap] = farthest();
      if (gap > .5 * spread)
        pick.push(third);
      pick.sort((a, b) => a - b);
      out = { thumb: ts[second], stills: pick.map((i, k) => /** @type {[number, string, string]} */ ([ts[i], '', 'Postura ' + (k + 1) + ' de ' + pick.length])) };
    }
  }
  if (ex.still != null)
    out.thumb = ex.still;
  return ex.moments = out;
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
/* los momentos con que se encuadra el gesto entero */
const MOMENTS = Array.from({ length: 13 }, (_, i) => i / 12);
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
/** La miniatura del ejercicio n, de px×px píxeles: lo que se ve entero, con un margen pequeño.
    @returns {Promise<{ blob: Blob, keep: boolean }>} */
export const thumbBlob = (n, px) => {
  const ex = exOf(n);
  if (!ex)
    return Promise.reject(new Error('sin figura: ' + n));
  const body = F3.draw(ex, moments(ex).thumb, F3.camera(ex.yaw, ex.pitch), 'm', true);
  const box = F3.bounds(body);
  if (!box)
    return Promise.reject(new Error('figura vacía: ' + n));
  return raster(`<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${boxText(fit(box, 1, .04))}"><defs>${F3.DEFS}${LIGHTEN}</defs><g filter="url(#lt)">${body}</g></svg>`, px);
};
/* la figura grande que se mueve: el gesto, en bucle, mientras se vea */
const play = svg => {
  svg.setAttribute('data-on', '1');
  const ex = exOf(svg.dataset.f3);
  if (!ex)
    return;
  const cam = F3.camera(ex.yaw, ex.pitch);
  svg.setAttribute('viewBox', boxText(fit(F3.frameBox(ex, cam, MOMENTS), STAGE)));
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
        svg.innerHTML = F3.draw(ex, t, cam, pre);
        /* si un dibujo cuesta más de medio fotograma, se espera otro tanto antes del siguiente */
        next = now + Math.max(0, 2 * (performance.now() - a) - 16);
        svg.classList.add('on');
      }
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
/* la figura grande quieta: sus posturas (moments), una junto a otra, con su rótulo si lo tienen */
const stills = box => {
  box.setAttribute('data-on', '1');
  const ex = exOf(box.dataset.f3s);
  if (!ex)
    return;
  const cam = F3.camera(ex.yaw, ex.pitch);
  const stops = moments(ex).stills;
  /* el mismo encuadre para todas: el de todas las posturas, con la proporción de cada una en su sitio */
  const vb = boxText(fit(F3.frameBox(ex, cam, stops.map(s => s[0])), stops.length > 1 ? (STAGE - .08) / stops.length : STAGE));
  const one = ([t, , label]) => html`
    <svg viewBox="${vb}" role="img" aria-label="${label}">${raw(F3.draw(ex, t, cam, 'f' + (++uid) + '_'))}</svg>`;
  if (stops.length > 1) {
    box.classList.add('two');
    box.innerHTML = stops.map(s => html`
      <figure>${raw(one(s))}${raw(s[1] ? html`<figcaption>${s[1]}</figcaption>` : '')}</figure>`).join('');
  }
  else
    box.innerHTML = one(stops[0]);
  box.classList.add('on');
};
/** Pone en marcha las figuras grandes de root que aún no lo estén. */
export const startStages = root => {
  root.querySelectorAll('svg[data-f3]:not([data-on])').forEach(play);
  root.querySelectorAll('[data-f3s]:not([data-on])').forEach(stills);
};
