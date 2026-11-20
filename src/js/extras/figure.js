/* ═══ extras/figure ═══
   La figura de un ejercicio: el modelo haciéndolo, con su material. Pinta lo que calcula extras/rig con las piezas de
   data/figure (perfil) y de data/anatomy (de frente), y los músculos del ejercicio en rojo y naranja, como el mapa
   muscular. Es un maniquí limpio, igual en grande que en pequeño: la silueta clara, con su luz en cada pieza y un borde
   oscuro que la separa de lo que tiene detrás, sin los músculos en reposo; encima, en color, solo lo que trabaja. Así se
   ve de un vistazo qué se mueve y qué trabaja. Las piezas se definen una vez (<defs>, la primera vez que hace falta una
   figura) y cada figura solo las coloca, así que una lista llena de miniaturas apenas pesa.
   - figureStill y figureSvg: la figura quieta, en un momento del gesto (miniaturas).
   - figureStage: la figura grande de la hoja «Cómo se hace», que se mueve entre el inicio y el final (playFigures); con
     «Reducir animaciones» (o si el móvil lo pide), las dos posturas quietas, una junto a otra.
   Define: LIT, SKIN_TONES, SKIN, FRONT_LIGHT, WRIST_Y, EDGE_SIL, EDGE_DETAIL, use, hatched, outline, sideOf, viewParts, figureDefs, defsReady, needDefs, TONES, tone, ink, prim, hex, EDGE, HELD_NEAR, HELD_FAR, ENDS, gear, layer, groups, ONE_USE, flat, boxText, fit, THUMB_AIR, figureStill, figureSvg, STAGE_WIDEST, STAGE_AIR, stageBox, floorOf, figureStage, BEAT, beatAt, flowAt, playing, playFigures
*/
import { AN_PA, AN_R } from '../data/anatomy.js';
import { FG_F, FG_P, FG_PA } from '../data/figure.js';
import { ease, FRONT, rigBox, rigFrame, rigLayers, rigMoments } from './rig.js';
import { $ } from '../core/util.js';
import { html, raw } from '../core/html.js';
/* relleno y borde de los músculos que trabajan: principales y secundarios */
const LIT = [['gRd', '#2a0409'], ['gOr', '#3a1a04']];
/** La luz de la silueta, del punto de luz al borde: gris azulado claro y, si el ejercicio trabaja el cuerpo entero (un
    burpee, un thruster), un rojo apagado: todo trabaja, y lo que más, encima en rojo y naranja. El mapa muscular
    (extras/anatomy) pinta ese cuerpo entero con el mismo rojo. */
export const SKIN_TONES = [['#9ba3c6', '#666e92', '#3d4364'], ['#d9939d', '#a85d6d', '#62303d']];
/* el relleno de la silueta en cada caso [de perfil, el brazo y la pierna de atrás (más oscuros), de frente] */
const SKIN = [['url(#gSm)', '#3b4162', 'url(#gSmF)'], ['url(#gSw)', '#4f2a35', 'url(#gSwF)']];
/* de frente, la luz es una para todo el cuerpo, en unidades del dibujo (la caja de la silueta del mapa muscular, #aS): así
   los discos de las articulaciones llevan la misma que su pieza y no salen como manchas */
const FRONT_LIGHT = ' gradientUnits="userSpaceOnUse" gradientTransform="matrix(162.5 0 0 355 18.75 44)"';
/* de frente, a qué altura se corta el antebrazo de la silueta del mapa muscular: de ahí abajo va la mano de la figura */
const WRIST_Y = 213;
/* el borde de una pieza, oscuro y suave: la separa de lo que tiene detrás sin marcar las juntas como en un muñeco
   articulado (la cadera y la pelvis no lo llevan: son la misma masa que el tronco y el muslo); y el de los detalles de
   dentro (los dedos, la oreja), algo más fino */
const EDGE_SIL = ' stroke="#0c0d14" stroke-opacity=".45" stroke-width=".9" stroke-linejoin="round"';
const EDGE_DETAIL = ' fill="none" stroke="#0c0d14" stroke-opacity=".5" stroke-width=".75" stroke-linecap="round" stroke-linejoin="round"';
const use = (id, lvl) => html`<use href="#${id}" fill="url(#${LIT[lvl][0]})" stroke="${LIT[lvl][1]}" stroke-width=".7" stroke-linejoin="round"/>`;
const hatched = (id, d, pa) => html`<path id="fp${id}" d="${d}"/><g id="fr${id}"><use href="#fp${id}"/><use href="#fp${id}" fill="url(#pa${pa || 35})" stroke="none"/></g>`;
/* el contorno cerrado que pasa por unos puntos; mirror, su reflejo en el otro lado de la figura */
const outline = (ps, mirror) => 'M' + ps.map(p => (mirror ? 200 - p[0] : p[0]) + ' ' + p[1]).join('L') + 'Z';
/* de qué lado de la figura frontal (0 izquierda de la imagen, 1 derecha) queda un trozo de trazado */
const sideOf = d => +(parseFloat(d.slice(1)) > 100);
/* las regiones del mapa muscular que van con cada pieza de la figura de frente ('F') o de espaldas ('B') */
const viewParts = v => v == 'B' ? FRONT.back : FRONT.regions;
/** Las piezas de los dos modelos, para <defs>: se pintan con <use>, que les pone el color de la silueta (SKIN). Necesita
    los degradados y tramados de extras/anatomy. */
const figureDefs = () => {
  /* la luz de la silueta, de perfil (cada pieza la suya) y de frente, y, para el suelo de la figura grande, su raya y la
     luz que cae en él */
  const stops = c => c.map((x, i) => '<stop offset="' + [0, .55, 1][i] + '" stop-color="' + x + '"/>').join('');
  let h = ['gSm', 'gSw'].map((id, i) => '<radialGradient id="' + id + '" cx=".38" cy=".3" r=".9">' + stops(SKIN_TONES[i]) + '</radialGradient><radialGradient id="' + id + 'F" cx=".38" cy=".3" r=".9"' + FRONT_LIGHT + '>' + stops(SKIN_TONES[i]) + '</radialGradient>').join('');
  h += '<linearGradient id="gFl"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><radialGradient id="gPo"><stop offset="0" stop-color="#9ba3c6" stop-opacity=".16"/><stop offset="1" stop-color="#9ba3c6" stop-opacity="0"/></radialGradient>';
  /* perfil: la silueta de cada pieza (fq), con sus detalles si los lleva (la oreja, los dedos), y sus músculos (fp; con su
     rayado, fr) */
  Object.keys(FG_P).forEach(k => {
    const [, sil, m, detail] = FG_P[k];
    const edge = raw(k == 'HP' || k == 'PV' ? '' : EDGE_SIL);
    h += detail ? html`<g id="fq${k}"><path d="${sil}"${edge}/><path d="${detail}"${raw(EDGE_DETAIL)}/></g>` : html`<path id="fq${k}" d="${sil}"${edge}/>`;
    Object.keys(m).forEach(c => {
      h += hatched(c, m[c], FG_PA[c]);
    });
  });
  /* de frente (F) y de espaldas (B), la misma silueta: el cuerpo con la cabeza y sus orejas, que asoman por detrás (fsB),
     y, a cada lado, brazo (U), antebrazo (F), muslo (T) y pierna (S), recortados de la silueta del mapa muscular; bajo el
     antebrazo, el muslo y la pierna, un disco en su articulación tapa el hueco al girar. El antebrazo se corta en la
     muñeca: la mano es la de la figura (FG_F), con su pulgar y sus dedos, y va debajo, así que no se ve la junta. Los
     músculos de cada lado, aparte, en cada vista */
  const disc = { F: [FRONT.el, 7.5], T: [FRONT.hip, 20], S: [FRONT.knee, 14.5] };
  const cut = k => k == 'F' ? FRONT.cut.F.filter(p => p[1] < WRIST_Y).concat([[47, WRIST_Y], [0, WRIST_Y]]) : FRONT.cut[k];
  h += html`<clipPath id="fcB"><path d="${outline(FRONT.cut.B)}"/></clipPath><g id="fsB"><path d="${FG_F.E0}"${raw(EDGE_SIL)}/><path d="${FG_F.E1}"${raw(EDGE_SIL)}/><use href="#aS"${raw(EDGE_SIL)} clip-path="url(#fcB)"/><use href="#aH"${raw(EDGE_SIL)}/></g>`;
  Object.keys(FRONT.regions).forEach(k => {
    [0, 1].forEach(i => {
      const joint = disc[k] ? html`<circle cx="${i ? 200 - disc[k][0][0] : disc[k][0][0]}" cy="${disc[k][0][1]}" r="${disc[k][1]}"/>` : '';
      const hand = k == 'F' ? html`<path d="${FG_F['H' + i]}"${raw(EDGE_SIL)}/><path d="${FG_F['L' + i]}"${raw(EDGE_DETAIL)}/>` : '';
      h += html`<clipPath id="fc${k}${i}"><path d="${outline(cut(k), i)}"/></clipPath><g id="fs${k}${i}">${joint}${hand}<use href="#aS"${raw(EDGE_SIL)} clip-path="url(#fc${k}${i})"/></g>`;
    });
  });
  ['F', 'B'].forEach(v => {
    const parts = viewParts(v);
    Object.keys(parts).reduce((all, k) => all.concat(parts[k]), []).forEach(c => {
      const halves = [[], []];
      AN_R[v][c].split(/(?=M)/).forEach(d => halves[sideOf(d)].push(d));
      halves.forEach((ds, i) => {
        h += hatched(v + c + i, ds.join(''), AN_PA[c]);
      });
    });
  });
  return raw(h);
};
/* las piezas se añaden a la página la primera vez que se pinta una figura */
let defsReady = 0;
const needDefs = () => {
  if (defsReady)
    return;
  defsReady = 1;
  document.body.insertAdjacentHTML('afterbegin', html`<svg width="0" height="0" class="pos-abs" aria-hidden="true" focusable="false"><defs>${figureDefs()}</defs></svg>`);
};
/* tonos del material: [relleno o '', trazo], en grande y en pequeño. 0 armazón, 1 almohadilla, 2 acero, 3 cable, 4 goma
   elástica, 5 disco, 6 cajón y placas, 7 balón */
const TONES = [[['', '#4d5370'], ['', '#727a9e']], [['#343950', '#7078a0'], ['#4a5070', '#8a92b5']], [['#b9bed0', '#0a0b10'], ['#c9cee0', '#0c0d14']], [['', '#8f96b3'], ['', '#aeb5cf']], [['', '#6aa5ff'], ['', '#7db1ff']], [['#171a27', '#59607c'], ['#1b1e2d', '#a9b0cc']], [['#2b2f45', '#59607c'], ['#3a3f5c', '#8a92b5']], [['#3c4159', '#8a92b5'], ['#4a5070', '#a9b0cc']]];
const tone = (n, big) => TONES[n || 0][big ? 0 : 1];
/* el color de una pieza que es una línea (un trazo, un cable, una palanca): el de su tono; el acero (2), que como relleno
   lleva un borde casi negro, va en su color claro: en negro, la barra de un remo en T o de un landmine no se veía */
const ink = (n, big) => tone(n, big)[n == 2 ? 0 : 1];
/** Una pieza fija del material: trazo (L), relleno (P), almohadilla (R), círculo (C) o placas de pesas (S). */
const prim = (q, big) => {
  const t = tone(q[0] == 'L' ? q[4] : q[0] == 'P' ? q[3] : q[0] == 'R' ? q[7] : q[0] == 'C' ? q[5] : 6, big);
  const thin = big ? '.8' : '1.4';
  if (q[0] == 'L')
    return html`<path d="${q[2]}" fill="none" stroke="${ink(q[4], big)}" stroke-width="${q[3]}" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (q[0] == 'P')
    return html`<path d="${q[2]}" fill="${t[0]}" stroke="${t[1]}" stroke-width="${thin}" stroke-linejoin="round"/>`;
  if (q[0] == 'R')
    return html`<rect x="${q[2] - q[4] / 2}" y="${q[3] - q[5] / 2}" width="${q[4]}" height="${q[5]}" rx="${Math.min(q[4], q[5], 12) / 2.4}" fill="${t[0]}" stroke="${t[1]}" stroke-width="${thin}"${raw(q[6] ? ' transform="rotate(' + q[6] + ' ' + q[2] + ' ' + q[3] + ')"' : '')}/>`;
  if (q[0] == 'C')
    return html`<circle cx="${q[2]}" cy="${q[3]}" r="${q[4]}" fill="${t[0] || 'none'}" stroke="${t[1]}" stroke-width="${t[0] ? thin : big ? 1.6 : 2.4}"/>`;
  /* las placas: una caja con sus rayas */
  let lines = '';
  for (let y = q[3] + 6; y < q[3] + q[5] - 2; y += 6)
    lines += 'M' + (q[2] + 2) + ' ' + y + 'H' + (q[2] + q[4] - 2);
  return html`<rect x="${q[2]}" y="${q[3]}" width="${q[4]}" height="${q[5]}" rx="2" fill="${t[0]}" stroke="${t[1]}" stroke-width="${thin}"/><path d="${lines}" stroke="${t[1]}" stroke-width=".7" fill="none"/>`;
};
/* un hexágono de radio r con centro en (cx, cy): la cabeza de una mancuerna vista de punta */
const hex = (cx, cy, r) => [30, 90, 150, 210, 270, 330].map(a => (cx + r * Math.cos(a * Math.PI / 180)).toFixed(1) + ' ' + (cy + r * Math.sin(a * Math.PI / 180)).toFixed(1)).join(' ');
const EDGE = ' stroke="#0a0b10" stroke-width=".8" stroke-linejoin="round"';
/* lo que se lleva en la mano de delante, centrado en el puño (o, si gira con la mano, en su sitio de reposo: 100, 220) */
const HELD_NEAR = {
  bar: () => html`<circle r="4.4" fill="#b9bed0"${raw(EDGE)}/><circle r="1.7" fill="#62687f"/>`,
  db: (pr, big) => pr[2] == 2 || pr[2] == 3 ? html`<path d="M86 220H114" stroke="#b9bed0" stroke-width="3.4" stroke-linecap="round"/><rect x="82" y="212" width="8" height="16" rx="2.5" fill="#9aa1ba"${raw(EDGE)}/><rect x="110" y="212" width="8" height="16" rx="2.5" fill="#9aa1ba"${raw(EDGE)}/>` : pr[2] == 4 ? html`<path d="M0 -13V13" stroke="#b9bed0" stroke-width="3.4" stroke-linecap="round"/><rect x="-9" y="-19" width="18" height="8" rx="2.5" fill="#9aa1ba"${raw(EDGE)}/><rect x="-9" y="11" width="18" height="8" rx="2.5" fill="#9aa1ba"${raw(EDGE)}/>` : html`<polygon points="${hex(0, 0, 10)}" fill="#9aa1ba"${raw(EDGE)}/><polygon points="${hex(0, 0, 6)}" fill="none" stroke="#5d6480" stroke-width=".8" stroke-linejoin="round"/>`,
  kb: pr => pr[2] == 1 ? html`<path d="M94 228Q100 216 106 228" fill="none" stroke="#9aa1ba" stroke-width="3" stroke-linecap="round"/><circle cx="100" cy="240" r="13" fill="#4a506b"${raw(EDGE)}/><circle cx="96" cy="236" r="4" fill="#6b7396" opacity=".7"/>` : html`<path d="M-6 6Q0 -6 6 6" fill="none" stroke="#9aa1ba" stroke-width="3" stroke-linecap="round"/><circle cy="18" r="13" fill="#4a506b"${raw(EDGE)}/><circle cx="-4" cy="14" r="4" fill="#6b7396" opacity=".7"/>`,
  ball: pr => html`<circle r="${pr[2]}" fill="#4a506b"${raw(EDGE)}/><path d="M${-pr[2] * .7} ${-pr[2] * .2}Q0 ${-pr[2] * .75} ${pr[2] * .7} ${-pr[2] * .2}" fill="none" stroke="#8a92b5" stroke-width="1" stroke-linecap="round"/>`,
  bag: () => html`<rect x="-22" y="-10" width="44" height="20" rx="9" fill="#4a506b"${raw(EDGE)}/><path d="M-10 -10V10M10 -10V10" stroke="#8a92b5" stroke-width="1"/>`,
  disc: () => html`<rect x="96.5" y="200" width="7" height="40" rx="3" fill="#59607c"${raw(EDGE)}/>`,
};
/* y en la de atrás, más oscuro: el disco de la barra y la otra mancuerna o kettlebell */
const HELD_FAR = {
  bar: (pr, big) => big ? html`<circle r="${pr[2]}" fill="#171a27" stroke="#59607c" stroke-width="1.3"/><circle r="${(pr[2] * .6).toFixed(1)}" fill="none" stroke="#3c4159" stroke-width=".9"/><circle r="5" fill="#3c4159"/>` : html`<circle r="${pr[2]}" fill="#1b1e2d" stroke="#a9b0cc" stroke-width="2.6"/>`,
  db: pr => pr[2] == 2 ? html`<path d="M86 220H114" stroke="#59607c" stroke-width="3.4" stroke-linecap="round"/><rect x="82" y="212" width="8" height="16" rx="2.5" fill="#4a506b"${raw(EDGE)}/><rect x="110" y="212" width="8" height="16" rx="2.5" fill="#4a506b"${raw(EDGE)}/>` : html`<polygon points="${hex(0, 0, 9)}" fill="#4a506b"${raw(EDGE)}/>`,
  kb: () => html`<circle cy="18" r="12" fill="#353a52"${raw(EDGE)}/>`,
};
/* el remate de un enlace, en su extremo (el eje x sigue al enlace): h asa, r cuerda, b barra de punta, p rodillo, s tobillera */
const ENDS = {
  h: '<path d="M0 0L7 -6V6Z" fill="none" stroke="#b9bed0" stroke-width="1.6" stroke-linejoin="round"/><path d="M7 -7V7" stroke="#b9bed0" stroke-width="3" stroke-linecap="round"/>',
  r: '<path d="M0 0L11 -4M0 0L11 4" fill="none" stroke="#c9cee0" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="-4.4" r="2.6" fill="#59607c"/><circle cx="12" cy="4.4" r="2.6" fill="#59607c"/>',
  b: '<circle r="3.6" fill="#b9bed0" stroke="#0a0b10" stroke-width=".7"/>',
  p: '<circle r="7" fill="#343950" stroke="#7078a0" stroke-width=".9"/>',
  s: '<rect x="-3" y="-8" width="6" height="16" rx="2.5" fill="#59607c" stroke="#0a0b10" stroke-width=".7"/>',
};
/** El contenido de la capa k del material de una figura. */
const gear = (def, k, big) => {
  const pr = def.props[parseInt(k.slice(1), 10)];
  const part = k.replace(/^p\d+/, '');
  if (pr[0] == 'link') {
    if (part == 'e')
      return raw(ENDS[pr[6]]);
    return html`<path d="M0 0H1" stroke="${ink(pr[5], big)}" stroke-width="${big ? pr[4] : Math.max(pr[4], 1.8)}" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
  }
  if (pr[0] == 'on' || pr[0] == 'slide' || pr[0] == 'by')
    return prim(pr[3], big);
  if (pr[0] == 'aim')
    return prim(pr[4], big);
  if (HELD_NEAR[pr[0]])
    return (part == 'b' && def.v == 'S' ? HELD_FAR : HELD_NEAR)[pr[0]](pr, big);
  return prim(pr, big);
};
/** El contenido de una capa: el material, o la pieza del cuerpo con su silueta y, encima, sus músculos que trabajan.
    work: las regiones del modelo que trabajan, { p: principales (rojo), s: secundarios (naranja), all: el cuerpo entero }. */
const layer = (def, k, work, big) => {
  if (k[0] == 'p')
    return gear(def, k, big);
  /* la mano que agarra algo va en puño */
  const hand = (def.props || []).some(pr => HELD_NEAR[pr[0]] || pr[0] == 'link' && (pr[3] == 'g' || pr[3] == 'G')) || def.fist ? 'HG' : 'HA';
  const skin = SKIN[work.all ? 1 : 0];
  if (k[0] == 'x')
    return html`<use href="#fq${k == 'xHA' ? hand : k.slice(1)}" fill="${skin[1]}"/>`;
  /* de las regiones cs, las que trabajan; id da el nombre de cada región en <defs> (en grande, con su rayado) */
  const lit = (cs, id) => html`${cs.map(c => work.p.includes(c) ? use(id(c), 0) : work.s.includes(c) ? use(id(c), 1) : '')}`;
  const own = big ? 'fr' : 'fp';
  if (def.v != 'S') {
    const parts = viewParts(def.v);
    return k == 'B' ? html`<use href="#fsB" fill="${skin[2]}"/>${lit(Object.keys(AN_R[def.v]).filter(c => !Object.keys(parts).some(p => parts[p].includes(c))), c => (big ? 'r' : 'p') + def.v + c)}` : html`<use href="#fs${k}" fill="${skin[2]}"/>${lit(parts[k[0]], c => own + def.v + c + k[1])}`;
  }
  /* el tórax y la pelvis: primero las dos siluetas y después sus músculos */
  if (k == 'TXs' || k == 'PVs')
    return html`<use href="#fq${k.slice(0, 2)}" fill="${skin[0]}"/>`;
  if (k == 'TXi' || k == 'PVi')
    return lit(Object.keys(FG_P[k.slice(0, 2)][2]), c => own + c);
  const base = k == 'HA' ? hand : k;
  return html`<use href="#fq${base}" fill="${skin[0]}"/>${lit(Object.keys(FG_P[base][2]), c => own + c)}`;
};
const groups = (def, work, t, big) => rigLayers(def, t).map(l => html`<g${raw(l.t ? ' transform="' + l.t + '"' : '')}>${layer(def, l.k, work, big)}</g>`);
/* lo mismo, para una figura que no se va a mover, con lo justo: la capa que no pinta nada no sale y la que es una sola pieza
   lleva su sitio en la propia pieza, sin grupo. Una lista con sesenta miniaturas ocupa así un tercio menos */
const ONE_USE = /^<use [^>]*\/>$/;
const flat = (def, work, t, big) => rigLayers(def, t).map(l => {
  const inner = String(layer(def, l.k, work, big));
  if (!inner)
    return '';
  if (!l.t)
    return raw(inner);
  return raw(ONE_USE.test(inner) ? '<use transform="' + l.t + '" ' + inner.slice(5) : '<g transform="' + l.t + '">' + inner + '</g>');
});
const boxText = b => b.map(n => Math.round(n)).join(' ');
/** La caja de b, ampliada desde su centro hasta la proporción ancho/alto pedida (y, como poco, min de lado). */
const fit = (b, ratio, min) => {
  const w = Math.max(b[2], b[3] * ratio, min || 0);
  const h = Math.max(b[3], b[2] / ratio, (min || 0) / ratio);
  return [b[0] - (w - b[2]) / 2, b[1] - (h - b[3]) / 2, w, h];
};
/* el aire alrededor de la figura quieta, en parte de su lado: lo justo para que las esquinas redondeadas de su recuadro no
   corten la cabeza o la barra */
const THUMB_AIR = .06;
/** La figura quieta en el momento def.at del gesto, aún sin tamaño: [encuadre, contenido]. work, lo que trabaja (layer);
    big, para verla en grande (los músculos con su rayado y el material en sus tonos de cerca). Es lo que cuesta calcular,
    y vale para cualquier tamaño. */
export const figureStill = (def, work, big) => {
  needDefs();
  const t = def.at == null ? 1 : def.at;
  const b = fit(def.box || rigBox(def, [t], 1), 1, 170);
  const air = b[2] * THUMB_AIR;
  return [boxText([b[0] - air, b[1] - air, b[2] + 2 * air, b[3] + 2 * air]), flat(def, work, t, big).join('')];
};
/** Esa figura (figureStill) como imagen de s×s px. */
export const figureSvg = (still, s) => html`<svg viewBox="${still[0]}" width="${s}" height="${s}" aria-hidden="true" focusable="false">${raw(still[1])}</svg>`;
/* lo más apaisado que llega a ser el recuadro de la figura grande (ancho entre alto): una plancha o un press tumbado no
   dejan media hoja vacía */
const STAGE_WIDEST = 1.6;
/* el aire que queda alrededor de la figura grande, en unidades del dibujo (a los lados y arriba; abajo, bajo el suelo):
   así no roza el borde ni las esquinas redondeadas del recuadro */
const STAGE_AIR = [14, 10];
/** El recuadro de la figura grande (viewBox): lo que ocupa (b), con su aire y en una proporción entre lo más estrecho y lo
    más apaisado que se permite. */
const stageBox = (b, narrow, wide) => {
  const roomy = [b[0] - STAGE_AIR[0], b[1] - STAGE_AIR[0], b[2] + 2 * STAGE_AIR[0], b[3] + STAGE_AIR[0] + STAGE_AIR[1]];
  return fit(roomy, Math.min(wide, Math.max(narrow, roomy[2] / roomy[3])));
};
/* el suelo, a lo ancho del recuadro b: una raya que se desvanece hacia los lados y, en medio, un poco de luz, como en un
   escenario. Lo que flota (en el agua, en la cinta) no lo lleva */
const floorOf = (def, b) => def.nofloor ? '' : html`<ellipse cx="${Math.round(b[0] + b[2] / 2)}" cy="403" rx="${Math.round(b[2] * .42)}" ry="${Math.round(Math.min(b[2] * .06, 18))}" fill="url(#gPo)"/><rect x="${Math.round(b[0])}" y="402" width="${Math.round(b[2])}" height="1.3" fill="url(#gFl)"/>`;
/** La figura grande: se mueve del inicio al final y vuelta, o sin parar si es un ciclo o un gesto seguido (playFigures);
    quieta (still), las posturas del gesto con su rótulo: inicio y final y, si pasa por una postura intermedia que es un
    tiempo del ejercicio, también esa. Una postura que se mantiene (hold) es una sola figura, quieta. */
export const figureStage = (def, work, still) => {
  needDefs();
  if (still && !def.hold) {
    /* la postura intermedia solo se enseña si es un tiempo del ejercicio, no si está para guiar el camino (via); un salto
       que acaba como empieza (la comba) se enseña en el suelo y en el aire, en el momento de su miniatura */
    const stops = def.hop ? [[0, 'Inicio', 'Postura de inicio'], [def.at, 'Salto', 'En el aire']] : def.m && !def.via ? [[0, 'Inicio', 'Postura de inicio'], [.5, 'Paso', 'Postura intermedia'], [1, 'Final', 'Postura final']] : [[0, 'Inicio', 'Postura de inicio'], [1, 'Final', 'Postura final']];
    /* el encuadre, el de esas posturas: lo que el gesto ocupa entre una y otra (la vuelta de la comba) no se ve */
    const box = stageBox(rigBox(def, stops.map(stop => stop[0])), .55, 1.15);
    return html`<div class="fgs two">${stops.map(([t, name, label]) => html`<figure><svg viewBox="${boxText(box)}" role="img" aria-label="${label}">${floorOf(def, box)}${groups(def, work, t, 1)}</svg><figcaption>${name}</figcaption></figure>`)}</div>`;
  }
  const box = stageBox(rigBox(def, rigMoments(def)), 1, STAGE_WIDEST);
  /* una postura que se mantiene, quieta; las demás, con lo que necesita playFigures para moverlas */
  const moving = def.hold ? '' : html` data-fig="${JSON.stringify(def)}"`;
  return html`<div class="fgs"><svg viewBox="${boxText(box)}"${moving} role="img" aria-label="${def.hold ? 'La postura que se mantiene' : 'El movimiento, del inicio al final'}">${floorOf(def, box)}${groups(def, work, 0, 1)}</svg></div>`;
};
/* lo que dura cada parte del gesto (ms): el esfuerzo, la vuelta (más lenta) y la pausa en cada extremo */
const BEAT = { effort: 1100, release: 1700, hold: 420 };
/** Momento del gesto (0 = inicio, 1 = final) a los ms milisegundos de empezar: va al final, espera, vuelve y espera. El
    esfuerzo es la ida si up es 'b' (un curl) y la vuelta si es 'a' (una sentadilla, que empieza bajando). Con long (un
    gesto que pasa por una postura intermedia), todo dura vez y media. */
const beatAt = (ms, up, long) => {
  const k = long ? 1.5 : 1;
  const go = (up == 'a' ? BEAT.release : BEAT.effort) * k;
  const back = (up == 'a' ? BEAT.effort : BEAT.release) * k;
  let x = ms % (go + back + 2 * BEAT.hold);
  if (x < go)
    return ease(x / go);
  if ((x -= go) < BEAT.hold)
    return 1;
  if ((x -= BEAT.hold) < back)
    return 1 - ease(x / back);
  return 0;
};
/** Momento de un gesto que va y vuelve sin pararse en los extremos (remar, el SkiErg): la ida dura flow[0] ms y la
    vuelta, flow[1]. */
const flowAt = (ms, flow) => {
  const x = ms % (flow[0] + flow[1]);
  return x < flow[0] ? ease(x / flow[0]) : 1 - ease((x - flow[0]) / flow[1]);
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
    let last = -1;
    const step = now => {
      if (!svg.isConnected) {
        playing.delete(svg);
        return;
      }
      t0 = t0 || now;
      /* un ciclo no para ni vuelve atrás: cada cycle ms hace medio gesto, y el siguiente con los lados cambiados */
      const at = def.cycle ? (now - t0) / def.cycle % 2 : def.flow ? flowAt(now - t0, def.flow) : beatAt(now - t0, def.up, def.m && !def.via);
      /* en la pausa de cada extremo la figura no se mueve: no hay nada que calcular ni que tocar en la página */
      if (at !== last) {
        last = at;
        rigFrame(def, at).forEach((t, i) => {
          if (t)
            gs[i].setAttribute('transform', t);
        });
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
};
/* las piezas se preparan en un rato libre tras arrancar, para que la primera lista con figuras no tenga que esperarlas */
if (typeof requestIdleCallback == 'function')
  requestIdleCallback(needDefs, { timeout: 4000 });
else
  setTimeout(needDefs, 1500);
/* las figuras grandes van en la hoja (#sh): cada vez que se pinta algo en ella, las que haya se ponen en marcha */
if ($('#sh') && typeof MutationObserver != 'undefined')
  new MutationObserver(() => playFigures($('#sh'))).observe($('#sh'), { childList: true, subtree: true });
