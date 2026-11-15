/* ═══ extras/figure ═══
   La figura de un ejercicio: el modelo anatómico haciéndolo (muestra de la V1.1). Pinta lo que calcula extras/rig con las
   piezas de data/figure (perfil) y de data/anatomy (de frente), y los músculos del ejercicio en rojo y naranja, como el
   mapa muscular. Las piezas se definen una vez (<defs>) y cada figura solo las coloca, así que una lista llena de
   miniaturas apenas pesa.
   - figureSvg: la figura quieta, en un momento del gesto (miniaturas).
   - figureStage: la figura grande de la hoja «Cómo se hace», que se mueve entre el inicio y el final (playFigures); con
     «Reducir animaciones» (o si el móvil lo pide), las dos posturas quietas, una junto a otra.
   Define: FIG_FILL, SIL, SIL_FAR, SIL_SMALL, SIL_SMALL_FAR, EDGE_SMALL, RIM, use, hatched, halves, outline, figureDefs, plate, BAR, bench, dumbbell, layer, groups, boxText, fit, figureSvg, FLOOR, figureStage, BEAT, beatAt, playing, playFigures
*/
import { AN_PA, AN_R } from '../data/anatomy.js';
import { FG_P, FG_PA } from '../data/figure.js';
import { ease, FRONT_ARM, rigBox, rigFrame, rigLayers } from './rig.js';
import { $ } from '../core/util.js';
import { html, raw } from '../core/html.js';
/* relleno y borde de un músculo: en reposo, principal y secundario */
const FIG_FILL = [['gNe', '#0a0b10'], ['gRd', '#2a0409'], ['gOr', '#3a1a04']];
const SIL = '#2a2e42';
const SIL_FAR = '#1d2031';
/* en pequeño (miniaturas) la figura es un pictograma: silueta clara, sin los músculos en reposo, y lo que trabaja en color */
const SIL_SMALL = 'url(#gSm)';
const SIL_SMALL_FAR = '#3b4162';
const EDGE_SMALL = ' stroke="#0c0d14" stroke-width="1.1" stroke-linejoin="round"';
/* borde claro de la silueta, para que la figura se distinga del fondo y un brazo de lo que tiene detrás */
const RIM = ' stroke="#646b8f" stroke-opacity=".6" stroke-width=".8" stroke-linejoin="round"';
const use = (id, lvl) => html`<use href="#${id}" fill="url(#${FIG_FILL[lvl][0]})" stroke="${FIG_FILL[lvl][1]}" stroke-width=".7" stroke-linejoin="round"/>`;
const hatched = (id, pa) => html`<path id="fp${id}" d="${pa[0]}"/><g id="fr${id}"><use href="#fp${id}"/><use href="#fp${id}" fill="url(#pa${pa[1] || 35})" stroke="none"/></g>`;
/* las dos mitades (izquierda y derecha de la imagen) del trazado de una región de la figura frontal */
const halves = d => d.split(/(?=M)/);
/* el contorno cerrado que pasa por unos puntos; mirror, su reflejo en el otro lado de la figura */
const outline = (ps, mirror) => 'M' + ps.map(p => (mirror ? 200 - p[0] : p[0]) + ' ' + p[1]).join('L') + 'Z';
/** Las piezas de los dos modelos, para <defs>: se pintan con <use>. Necesita los degradados y tramados de extras/anatomy. */
const figureDefs = () => {
  let h = '<radialGradient id="gSm" cx=".38" cy=".3" r=".9"><stop offset="0" stop-color="#939cc2"/><stop offset=".55" stop-color="#626a90"/><stop offset="1" stop-color="#3d4364"/></radialGradient>';
  /* perfil: silueta fq, músculo fp (con rayado, fr) y pieza entera en reposo, pequeña (fs) y grande (fb) */
  Object.keys(FG_P).forEach(k => {
    const [, sil, m] = FG_P[k];
    h += html`<path id="fq${k}" d="${sil}"/>`;
    Object.keys(m).forEach(c => {
      h += hatched(c, [m[c], FG_PA[c]]);
    });
    h += html`<g id="fs${k}"><use href="#fq${k}" fill="${SIL_SMALL}"${raw(EDGE_SMALL)}/></g><g id="fb${k}"><use href="#fq${k}" fill="${SIL}"${raw(RIM)}/>${Object.keys(m).map(c => use('fr' + c, 0))}</g>`;
  });
  /* de frente: el cuerpo sin los brazos (B) y cada brazo (A0, A1), recortados de la silueta del mapa muscular */
  const arm = FRONT_ARM.regions;
  const body = Object.keys(AN_R.F).filter(k => !arm.includes(k));
  h += html`<clipPath id="fcA0"><path d="${outline(FRONT_ARM.cut)}"/></clipPath><clipPath id="fcA1"><path d="${outline(FRONT_ARM.cut, 1)}"/></clipPath><clipPath id="fcB"><path clip-rule="evenodd" d="M0 0H200V410H0Z${outline(FRONT_ARM.cut)}${outline(FRONT_ARM.cut, 1)}"/></clipPath>`;
  arm.forEach(c => {
    halves(AN_R.F[c]).forEach((d, i) => {
      h += hatched(c + i, [d, AN_PA[c]]);
    });
  });
  h += html`<g id="fsB"><use href="#aS" fill="${SIL_SMALL}"${raw(EDGE_SMALL)} clip-path="url(#fcB)"/><use href="#aH" fill="${SIL_SMALL}"${raw(EDGE_SMALL)}/></g><g id="fbB"><use href="#aS" fill="${SIL}"${raw(RIM)} clip-path="url(#fcB)"/><use href="#aH" fill="${SIL}"${raw(RIM)}/>${body.map(c => use('rF' + c, 0))}</g>`;
  [0, 1].forEach(i => {
    h += html`<g id="fsA${i}"><use href="#aS" fill="${SIL_SMALL}"${raw(EDGE_SMALL)} clip-path="url(#fcA${i})"/></g><g id="fbA${i}"><use href="#aS" fill="${SIL}"${raw(RIM)} clip-path="url(#fcA${i})"/>${arm.map(c => use('fr' + c + i, 0))}</g>`;
  });
  return raw(h);
};
/* el material, en su sitio de reposo o centrado en el puño */
const plate = (r, big) => big ? html`<circle r="${r}" fill="#171a27" stroke="#59607c" stroke-width="1.3"/><circle r="${(r * .6).toFixed(1)}" fill="none" stroke="#3c4159" stroke-width=".9"/><circle r="5" fill="#3c4159"/>` : html`<circle r="${r}" fill="#1b1e2d" stroke="#a9b0cc" stroke-width="2.6"/>`;
const BAR = '<circle r="4.4" fill="#b9bed0" stroke="#0a0b10" stroke-width=".7"/><circle r="1.7" fill="#62687f"/>';
const bench = (x0, x1, top, big) => html`<path d="M${x0 + 26} ${top + 10}V398M${x1 - 30} ${top + 10}V398M${x0 + 12} 399.5H${x0 + 40}M${x1 - 44} 399.5H${x1 - 16}" fill="none" stroke="#4d5370" stroke-width="5" stroke-linecap="round"/><rect x="${x0}" y="${top}" width="${x1 - x0}" height="12" rx="5" fill="${big ? '#343950' : '#4a5070'}" stroke="#7078a0" stroke-width="${big ? '.8' : '1.6'}"/>`;
/* la mancuerna, vista de punta, en la mano del brazo i de la figura frontal: la cabeza de atrás asoma por detrás de la de delante */
const dumbbell = i => {
  const x = i ? 200 - FRONT_ARM.hand[0] : FRONT_ARM.hand[0];
  const y = FRONT_ARM.hand[1];
  const hex = (cx, cy, r) => [30, 90, 150, 210, 270, 330].map(a => (cx + r * Math.cos(a * Math.PI / 180)).toFixed(1) + ' ' + (cy + r * Math.sin(a * Math.PI / 180)).toFixed(1)).join(' ');
  return html`<polygon points="${hex(x + (i ? -3 : 3), y - 3.5, 9)}" fill="#4a506b" stroke="#0a0b10" stroke-width=".8" stroke-linejoin="round"/><polygon points="${hex(x, y, 10)}" fill="#9aa1ba" stroke="#0a0b10" stroke-width=".8" stroke-linejoin="round"/><polygon points="${hex(x, y, 6)}" fill="none" stroke="#5d6480" stroke-width=".8" stroke-linejoin="round"/>`;
};
/** El contenido de una capa: la pieza en reposo y, encima, sus músculos trabajados (P en rojo, S en naranja). */
const layer = (def, k, P, S, big) => {
  const z = big ? 'b' : 's';
  const prop = n => (def.props || []).find(x => x[0] == n);
  if (k == 'plate')
    return plate(prop('bar')[1], big);
  if (k == 'bar')
    return raw(BAR);
  if (k == 'bench')
    return bench(prop('bench')[1], prop('bench')[2], prop('bench')[3], big);
  if (k[0] == 'x')
    return html`<use href="#fq${k == 'xHA' ? 'HG' : k.slice(1)}" fill="${big ? SIL_FAR : SIL_SMALL_FAR}"${raw(big ? RIM : EDGE_SMALL)}/>`;
  const lit = cs => cs.map(c => P.includes(c) ? use((big ? 'fr' : 'fp') + c, 1) : S.includes(c) ? use((big ? 'fr' : 'fp') + c, 2) : '');
  if (def.v == 'F') {
    if (k == 'B')
      return html`<use href="#f${z}B"/>${Object.keys(AN_R.F).filter(c => !FRONT_ARM.regions.includes(c)).map(c => P.includes(c) ? use((big ? 'r' : 'p') + 'F' + c, 1) : S.includes(c) ? use((big ? 'r' : 'p') + 'F' + c, 2) : '')}`;
    const i = k[1];
    return html`<use href="#f${z}${k}"/>${FRONT_ARM.regions.map(c => P.includes(c) ? use((big ? 'fr' : 'fp') + c + i, 1) : S.includes(c) ? use((big ? 'fr' : 'fp') + c + i, 2) : '')}${prop('db') ? dumbbell(+i) : ''}`;
  }
  const piece = k == 'HA' ? 'HG' : k;
  return html`<use href="#f${z}${piece}"/>${lit(Object.keys(FG_P[piece][2]))}`;
};
const groups = (def, P, S, t, big) => rigLayers(def, t).map(l => html`<g${raw(l.t ? ' transform="' + l.t + '"' : '')}>${layer(def, l.k, P, S, big)}</g>`);
const boxText = b => b.map(n => Math.round(n)).join(' ');
/** La caja de b, ampliada desde su centro hasta la proporción ancho/alto pedida (y, como poco, min de lado). */
const fit = (b, ratio, min) => {
  const w = Math.max(b[2], b[3] * ratio, min || 0);
  const h = Math.max(b[3], b[2] / ratio, (min || 0) / ratio);
  return [b[0] - (w - b[2]) / 2, b[1] - (h - b[3]) / 2, w, h];
};
/** Figura quieta de s×s px en el momento def.at del gesto; P y S son las regiones del modelo que trabajan. */
export const figureSvg = (def, P, S, s) => {
  const t = def.at == null ? 1 : def.at;
  return html`<svg viewBox="${boxText(fit(rigBox(def, [t], 1), 1, 170))}" width="${s}" height="${s}" aria-hidden="true" focusable="false">${groups(def, P, S, t, s > 80)}</svg>`;
};
const FLOOR = '<path d="M-999 402.6H1999" stroke="#fff" stroke-opacity=".13" stroke-width="1.2"/>';
/** La figura grande: se mueve del inicio al final y vuelta (playFigures); quieta (still), las dos posturas con su rótulo. */
export const figureStage = (def, P, S, still) => {
  const ends = def.up == 'a' ? [1, 0] : [0, 1];
  if (still) {
    const box = boxText(fit(rigBox(def, [0, 1]), .62));
    return html`<div class="fgs two">${ends.map((t, i) => html`<figure><svg viewBox="${box}" aria-hidden="true" focusable="false">${raw(FLOOR)}${groups(def, P, S, t, 1)}</svg><figcaption>${i ? 'Final' : 'Inicio'}</figcaption></figure>`)}</div>`;
  }
  const all = rigBox(def, [0, .5, 1]);
  return html`<div class="fgs"><svg viewBox="${boxText(fit(all, Math.min(1.3, Math.max(1, all[2] / all[3]))))}" data-fig="${JSON.stringify(def)}" role="img" aria-label="El movimiento, del inicio al final">${raw(FLOOR)}${groups(def, P, S, ends[0], 1)}</svg></div>`;
};
/* un ciclo: esfuerzo, pausa, vuelta más lenta y pausa (ms) */
const BEAT = [1100, 380, 1700, 520];
/** Momento del gesto (0 a 1) a los ms milisegundos de empezar; up dice qué extremo es el final del esfuerzo. */
const beatAt = (ms, up) => {
  let x = ms % (BEAT[0] + BEAT[1] + BEAT[2] + BEAT[3]);
  let t;
  if (x < BEAT[0])
    t = ease(x / BEAT[0]);
  else if ((x -= BEAT[0]) < BEAT[1])
    t = 1;
  else if ((x -= BEAT[1]) < BEAT[2])
    t = 1 - ease(x / BEAT[2]);
  else
    t = 0;
  return up == 'a' ? 1 - t : t;
};
/* las figuras que se están moviendo */
const playing = new Set();
/** Pone en marcha las figuras grandes que haya dentro de root; cada una se para sola cuando deja de estar en la página. */
const playFigures = root => {
  root.querySelectorAll('svg[data-fig]').forEach(svg => {
    if (playing.has(svg))
      return;
    playing.add(svg);
    const def = JSON.parse(svg.dataset.fig);
    const gs = [...svg.children].filter(g => g.tagName == 'g');
    let t0 = 0;
    const step = now => {
      if (!svg.isConnected) {
        playing.delete(svg);
        return;
      }
      t0 = t0 || now;
      rigFrame(def, beatAt(now - t0, def.up)).forEach((t, i) => {
        if (t)
          gs[i].setAttribute('transform', t);
      });
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
};
document.body.insertAdjacentHTML('afterbegin', html`<svg width="0" height="0" class="pos-abs" aria-hidden="true" focusable="false"><defs>${figureDefs()}</defs></svg>`);
/* las figuras grandes van en la hoja (#sh): cada vez que se pinta algo en ella, las que haya se ponen en marcha */
if ($('#sh') && typeof MutationObserver != 'undefined')
  new MutationObserver(() => playFigures($('#sh'))).observe($('#sh'), { childList: true, subtree: true });
