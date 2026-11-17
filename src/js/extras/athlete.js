/* ═══ extras/athlete ═══
   El atleta: la figura con aspecto de persona (piel, pantalón corto, pelo y cara), sobre el mismo esqueleto que el maniquí
   (extras/rig), así que se mueve igual: mismo ritmo, mismo recorrido y la misma barra en las mismas manos. Es un piloto:
   de momento solo lo lleva la figura grande del curl con barra Z (la figura dice athlete); lo demás sigue con el maniquí
   (extras/figure).
   - El brazo es una sola silueta, que se rehace en cada fotograma con la postura (athleteFrame): sale del torso sin junta
     (el deltoides es parte de él: su contorno y la sombra de sus bordes se desvanecen al llegar al hombro) y el codo, al
     doblarse, hace su pliegue por dentro, donde se juntan el bíceps y el antebrazo, y su punta por fuera (el olécranon, que
     va con el antebrazo). El bíceps se hincha al subir. Los músculos del brazo y del antebrazo van recortados a su silueta,
     y la sombra de sus bordes cae también sobre el tronco, que es lo que lo separa de él.
   - Lo demás son las piezas del maniquí (data/figure) con piel: un mismo tono, la sombra de los bordes por dentro, el
     relieve de los músculos en reposo y, encima, en rojo y naranja, lo que trabaja. El pantalón corto tapa la pelvis, la
     cadera y el principio del muslo; el pelo, corto y oscuro.
   Define: AT_SKIN, AT_SKIN_FAR, AT_CONTOUR, AT_SOFT, AT_EDGE, AT_PIECES, AT_ARM, AT_BULGE, AT_ARM_MUSCLES, AT_FORE_MUSCLES, AT_HATCH, atR1, atPt, atCurve, atCross, atBulge, atShade, atArm, athleteDefs, atDefsHtml, atSkin, atMuscle, atRelief, atShorts, atN, atArmHtml, athleteLayer, ATHLETE_STILL, athleteFrame
*/
import { FG_J, FG_P, FG_PA } from '../data/figure.js';
import { rigMove, rigPlace, rigSolve } from './rig.js';
/* la piel [base, luz de los músculos, sombra de los bordes], del lado de delante y del de atrás (más oscuro) */
const AT_SKIN = ['#c98a5f', '#f8cfaa', '#5e2f16'];
const AT_SKIN_FAR = ['#8f5636', '#b0704a', '#3a1a0b'];
/* el contorno: oscuro, fino y translúcido, como el del maniquí pero cálido; y la sombra suave que lo acompaña por dentro */
const AT_CONTOUR = ' fill="none" stroke="#45200d" stroke-opacity=".55" stroke-width=".9" stroke-linejoin="round" stroke-linecap="round"';
const AT_SOFT = ' fill="none" stroke-opacity=".2" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"';
/* los bordes del brazo: [opacidad de la sombra, la del contorno, su color, ancho de la sombra, el del contorno] */
const AT_EDGE = [.26, .8, '#45200d', 7, 1.1];
/* las piezas del maniquí que el atleta pinta con piel */
const AT_PIECES = ['TX', 'PV', 'HP', 'TH', 'SH', 'FT', 'HD', 'HA', 'HG'];
/* El brazo en reposo (colgando, de perfil y mirando a la derecha), por sus bordes, de arriba abajo: la cumbre del hombro
   (cap), el borde de delante (deltoides, bíceps) y el de atrás (deltoides, tríceps) hasta el codo; y los del antebrazo,
   del codo a la muñeca (la mano tapa la muñeca), y la punta del codo (ol, el olécranon, que va con el antebrazo). En cada
   fotograma, estos puntos van con el brazo y el antebrazo de la postura y se cosen en el codo */
const AT_ARM = {
  cap: [[90.6, 66.2], [99, 62.8], [107.6, 65.6]],
  uf: [[112.6, 70], [116, 77], [117, 86], [115.4, 95], [113, 102], [113.6, 110], [114.6, 119], [114, 128], [112, 137], [109.4, 144], [107.6, 148]],
  ub: [[86, 70], [83, 78], [82, 88], [82.8, 97], [82.2, 106], [82.4, 117], [83.6, 128], [85.6, 138], [88, 146]],
  ff: [[108.4, 150.5], [110.6, 156], [111.2, 164], [110.2, 175], [108.2, 187], [106.4, 198], [105.6, 207]],
  fb: [[88.4, 152.5], [87.8, 160], [88.4, 170], [90.4, 183], [92.8, 195], [94.2, 207]],
  ol: [87.6, 148],
};
/* lo que se hincha el bíceps con el codo doblado del todo (en unidades del dibujo, hacia delante), a qué altura y en qué largo */
const AT_BULGE = [3.6, 121, 15];
/* los músculos del brazo, en reposo y con su región del mapa muscular (la que va en rojo o naranja si trabaja): el
   deltoides, el tríceps, el braquial y el bíceps, que se hincha; y los del antebrazo: el braquiorradial y el resto */
const AT_ARM_MUSCLES = {
  DL: [[87.6, 68.4], [99, 64.6], [110.6, 67.6], [115.6, 77], [115.4, 89], [111.4, 99], [104.4, 104.4], [97.6, 103], [91.2, 98.4], [84.8, 88], [84.4, 77]],
  TR: [[84.4, 100], [90.6, 102.4], [95.2, 110], [96.4, 122], [94.6, 134], [90.6, 143], [86.6, 140.4], [83.8, 128], [83.2, 113]],
  BR: [[103.4, 127], [105, 137.6], [107, 145.2], [103.2, 147.8], [99.6, 142], [99.6, 133]],
  BI: [[106.2, 99.6], [112.2, 104.6], [114.3, 113], [114.5, 122], [113.3, 131], [110.6, 139], [107.2, 144.6], [103.6, 140.4], [101.8, 129], [102.6, 114]],
};
const AT_FORE_MUSCLES = {
  BQ: [[104.4, 150.4], [109.8, 155], [110.8, 164], [109.2, 176], [106.2, 188], [103.6, 184], [102.6, 170], [102.4, 158]],
  AN: [[90.2, 155.4], [96.6, 153], [102.4, 158.6], [105.2, 171], [104.8, 186], [103.2, 199], [99.2, 205], [95.2, 199], [92, 186], [89.6, 170]],
};
/* la dirección del rayado de los músculos del brazo (los tramados de extras/anatomy) */
const AT_HATCH = { DL: 90, TR: 90, BR: 90, BI: 90, BQ: 90, AN: 90 };
const atR1 = n => Math.round(n * 10) / 10;
const atPt = p => atR1(p[0]) + ' ' + atR1(p[1]);
/** Curva suave (Catmull-Rom → Bézier) por unos puntos, cerrada o abierta; un punto [x, y, 1] es una esquina. */
const atCurve = (ps, closed) => {
  const n = ps.length;
  const P = i => closed ? ps[(i + n) % n] : ps[Math.max(0, Math.min(n - 1, i))];
  let d = 'M' + atPt(ps[0]);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1);
    const p1 = P(i);
    const p2 = P(i + 1);
    const p3 = P(i + 2);
    const c1 = p1[2] ? p1 : [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = p2[2] ? p2 : [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += 'C' + atPt(c1) + ' ' + atPt(c2) + ' ' + atPt(p2);
  }
  return d + (closed ? 'Z' : '');
};
/** Dónde se cruzan dos líneas quebradas (la primera vez, mirando a desde el final y b desde el principio): [i, j, punto]. */
const atCross = (a, b) => {
  for (let i = a.length - 2; i >= 0; i--)
    for (let j = 0; j < b.length - 1; j++) {
      const [p, q] = [a[i], a[i + 1]];
      const [r, s] = [b[j], b[j + 1]];
      const d = (q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0]);
      if (Math.abs(d) < 1e-9)
        continue;
      const u = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / d;
      const v = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d;
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1)
        return [i, j, [p[0] + u * (q[0] - p[0]), p[1] + u * (q[1] - p[1]), 1]];
    }
  return null;
};
/* un punto del brazo, con el bíceps hinchado lo que toque (flex: de 0, estirado, a 1, doblado del todo); solo lo de delante */
const atBulge = (p, flex) => p[0] > 101 ? [p[0] + AT_BULGE[0] * flex * Math.exp(-(((p[1] - AT_BULGE[1]) / AT_BULGE[2]) ** 2)) * Math.min(1, (p[0] - 101) / 8), p[1]] : p;
/* la sombra de los bordes de una forma, por dentro (recortada a ella), en el tono de sombra s */
const atShade = (href, clip, s) => '<use href="' + href + '"' + AT_SOFT + ' stroke="' + s + '" clip-path="url(#' + clip + ')"/>';
/**
 * El brazo de un lado (x: '' el de delante, 'x' el de atrás) en la postura o: la silueta del brazo con el codo (u), la del
 * antebrazo (f) y sus bordes (e: lo que lleva contorno); dónde van los músculos del brazo y del antebrazo (mu, mf:
 * transformaciones), el bíceps hinchado (bi, en las coordenadas del brazo) y el tronco (t, para la sombra del brazo sobre él).
 */
const atArm = (o, x) => {
  const U = o[x + 'UA'];
  const F = o[x + 'FA'];
  const flex = Math.max(0, Math.min(1, (U.a - F.a) / 140));
  const up = p => rigPlace(U, p);
  const fo = p => rigPlace(F, p);
  const uf = AT_ARM.uf.map(p => up(atBulge(p, flex)));
  const ub = AT_ARM.ub.map(up);
  const ff = AT_ARM.ff.map(fo);
  const fb = AT_ARM.fb.map(fo);
  const cap = AT_ARM.cap.map(up);
  const E = up(FG_J.el);
  /* por dentro, el pliegue: donde el borde del bíceps se cruza con el del antebrazo; si no se cruzan (casi estirado), uno
     sigue al otro */
  const X = atCross(uf, ff);
  const front = X ? uf.slice(0, X[0] + 1).concat([X[2]]) : uf;
  const fore = X ? [X[2]].concat(ff.slice(X[1] + 1)) : ff;
  /* por fuera, el codo: la punta (el olécranon) va con el antebrazo y asoma un poco más cuanto más doblado; del final del
     tríceps a la punta, una curva que sigue la línea del tríceps y rodea la articulación por detrás, y de la punta sale el
     borde de atrás del antebrazo */
  const last = ub[ub.length - 1];
  const T0 = fo(AT_ARM.ol);
  const away = Math.hypot(T0[0] - E[0], T0[1] - E[1]) || 1;
  const T = [T0[0] + (T0[0] - E[0]) / away * 1.2 * flex, T0[1] + (T0[1] - E[1]) / away * 1.2 * flex];
  const unit = (p, q) => {
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    return [(q[0] - p[0]) / d, (q[1] - p[1]) / d];
  };
  const d1 = unit(ub[ub.length - 2], last);
  const d2 = unit(T, fb[1]);
  const L = .45 * Math.hypot(T[0] - last[0], T[1] - last[1]);
  const c1 = [last[0] + d1[0] * L, last[1] + d1[1] * L];
  const c2 = [T[0] - d2[0] * L, T[1] - d2[1] * L];
  const elbow = [.25, .5, .75].map(s => {
    const r = 1 - s;
    return [0, 1].map(i => r * r * r * last[i] + 3 * r * r * s * c1[i] + 3 * r * s * s * c2[i] + s * s * s * T[i]);
  }).concat([T]);
  const joint = [E[0], E[1], 1];
  /* la silueta del brazo con el codo: la cumbre, el borde de delante hasta el pliegue (o hasta el antebrazo, si no lo hay),
     la articulación, la punta del codo y el codo por fuera, y el borde de atrás de vuelta arriba; la del antebrazo: del pliegue a la muñeca, la muñeca y su
     borde de atrás de vuelta a la articulación */
  const u = atCurve(cap.slice(1).concat(front, X ? [] : [ff[0]], [joint], elbow.slice().reverse(), ub.slice().reverse(), cap.slice(0, 1)), true);
  const f = atCurve(fore.concat(fb.slice().reverse(), [T, joint]), true);
  /* los bordes: el de delante desde el deltoides y el de atrás desde la axila con el codo, hasta la muñeca (los dos
     empiezan en el hombro, donde se desvanecen: el hombro sale del torso sin junta) */
  const e = atCurve(front.slice(1).concat(fore), false) + atCurve(ub.concat(elbow, fb), false);
  return { u, f, e, mu: rigMove(U), mf: rigMove(F), t: rigMove(o.TX), bi: atCurve(AT_ARM_MUSCLES.BI.map(p => atBulge(p, flex)), true) };
};
/** Las piezas del atleta, para <defs> (después de las del maniquí, de las que toma las formas): la piel de cada pieza (atP,
    sin color: lo pone quien la usa), su recorte (atC) y sus detalles (atD: la oreja, los dedos); los músculos del brazo
    (atM), el pelo, el pantalón y el relieve. */
export const athleteDefs = () => atDefsHtml || (atDefsHtml = AT_PIECES.map(k => '<path id="atP' + k + '" d="' + FG_P[k][1] + '"/><clipPath id="atC' + k + '"><use href="#atP' + k + '"/></clipPath>' + (FG_P[k][3] ? '<path id="atD' + k + '" d="' + FG_P[k][3] + '"/>' : '')).join('')
  + Object.entries(Object.assign({}, AT_ARM_MUSCLES, AT_FORE_MUSCLES)).map(([c, ps]) => '<path id="atM' + c + '" d="' + atCurve(ps, true) + '"/>').join('')
  + '<radialGradient id="atMu" cx=".42" cy=".36" r=".62"><stop offset="0" stop-color="' + AT_SKIN[1] + '" stop-opacity=".6"/><stop offset=".6" stop-color="' + AT_SKIN[1] + '" stop-opacity=".2"/><stop offset="1" stop-color="' + AT_SKIN[1] + '" stop-opacity="0"/></radialGradient>'
  + '<linearGradient id="atSh" gradientUnits="userSpaceOnUse" x1="70" y1="160" x2="130" y2="250"><stop offset="0" stop-color="#4a4c54"/><stop offset=".5" stop-color="#2f3137"/><stop offset="1" stop-color="#1d1e22"/></linearGradient>'
  + '<linearGradient id="atHa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a322d"/><stop offset="1" stop-color="#151211"/></linearGradient>'
  /* lo que tapa el pantalón: de la cintura abajo en la pelvis y la parte de arriba del muslo */
  + '<clipPath id="atCw"><rect x="0" y="163" width="200" height="80"/></clipPath><clipPath id="atCt"><rect x="0" y="150" width="200" height="98"/></clipPath>'
  /* el pelo, corto: la parte de arriba y de atrás de la cabeza, con la entrada en la frente y la patilla delante de la oreja */
  + '<path id="atHr" d="' + atCurve([[85.4, 19], [89.4, 10.6], [97.4, 5.6], [106.6, 5], [114.4, 7.8], [119, 12.6], [119.4, 16.4], [114.2, 15.2], [109, 16.6], [106.2, 20.6], [105.4, 24.6], [102.2, 22.8], [98.2, 23.6], [95.2, 28], [92.6, 34.4], [89.6, 38.8], [86.6, 34], [84.6, 26.4]], true) + '"/>');
let atDefsHtml = '';
/* la piel de una pieza del maniquí: su silueta en el tono de la piel, la sombra de sus bordes por dentro, su contorno y sus
   detalles */
const atSkin = (k, far) => {
  const s = far ? AT_SKIN_FAR : AT_SKIN;
  return '<use href="#atP' + k + '" fill="' + s[0] + '"/>' + atShade('#atP' + k, 'atC' + k, s[2]) + (k == 'PV' || k == 'HP' ? '' : '<use href="#atP' + k + '"' + AT_CONTOUR + '/>') + (FG_P[k][3] ? '<use href="#atD' + k + '"' + AT_CONTOUR + ' stroke-width=".7"/>' : '');
};
/* un músculo: si trabaja, en rojo (principal) o naranja (secundario) con su rayado; si no, el relieve de la luz de la piel */
const atMuscle = (href, c, work, pa) => work.p.includes(c) ? '<use href="' + href + '" fill="url(#gRd)" stroke="#2a0409" stroke-width=".7" stroke-linejoin="round"/><use href="' + href + '" fill="url(#pa' + (pa || 35) + ')"/>' : work.s.includes(c) ? '<use href="' + href + '" fill="url(#gOr)" stroke="#3a1a04" stroke-width=".7" stroke-linejoin="round"/><use href="' + href + '" fill="url(#pa' + (pa || 35) + ')"/>' : '<use href="' + href + '" fill="url(#atMu)" stroke="#7a4226" stroke-opacity=".16" stroke-width=".6"/>';
/* los músculos de una pieza del maniquí */
const atRelief = (k, work) => Object.keys(FG_P[k][2]).map(c => atMuscle('#fp' + c, c, work, FG_PA[c])).join('');
/* el pantalón corto sobre una pieza (recortado a lo que tapa): de un solo degradado, para que sus piezas no dejen junta; en
   la pelvis, la cinturilla, y en el muslo, el bajo */
const atShorts = (k, clip) => '<use href="#atP' + k + '" fill="url(#atSh)"' + (clip ? ' clip-path="url(#' + clip + ')"' : '') + '/>' + (k == 'PV' ? '<path d="M83.6 168.4Q104 165.2 123.8 168.6" fill="none" stroke="#5d6069" stroke-opacity=".9" stroke-width="1.2" stroke-linecap="round" clip-path="url(#atCPV)"/>' : k == 'TH' ? '<path d="M74 247.4H126" fill="none" stroke="#121316" stroke-opacity=".8" stroke-width="1.6" clip-path="url(#atCTH)"/>' : '');
/* cada brazo pintado lleva sus propios recortes y degradados, porque cambian con la postura: un número para sus ids */
let atN = 0;
/* el brazo entero de un lado: la silueta del brazo con el codo y sus músculos (recortados a ella), la del antebrazo encima
   con los suyos, la sombra de los bordes (por dentro y, el de delante, también sobre el tronco, que lo separa de él) y el
   contorno; la sombra y el contorno se desvanecen hacia el hombro. data-at: lo que cambia en cada fotograma */
const atArmHtml = (o, far, work) => {
  const x = far ? 'x' : '';
  const a = atArm(o, x);
  const s = far ? AT_SKIN_FAR : AT_SKIN;
  const id = 'atK' + (++atN);
  /* el bíceps se rehace en cada fotograma (se hincha): va en su sitio, no en <defs> */
  const bi = work.p.includes('BI') ? ['gRd', '#2a0409'] : work.s.includes('BI') ? ['gOr', '#3a1a04'] : null;
  const biceps = bi ? '<path data-at="bi" d="' + a.bi + '" fill="url(#' + bi[0] + ')" stroke="' + bi[1] + '" stroke-width=".7" stroke-linejoin="round"/><path data-at="bh" d="' + a.bi + '" fill="url(#pa' + AT_HATCH.BI + ')"/>' : '<path data-at="bi" d="' + a.bi + '" fill="url(#atMu)"/>';
  const fade = (k, c, op) => '<linearGradient id="' + id + k + '" data-at="' + x + 'k' + k + '" gradientUnits="userSpaceOnUse" x1="0" y1="86" x2="0" y2="102" gradientTransform="' + a.mu + '"><stop offset="0" stop-color="' + c + '" stop-opacity="0"/><stop offset="1" stop-color="' + c + '" stop-opacity="' + op + '"/></linearGradient>';
  const clip = (k, ds) => '<clipPath id="' + id + k + '">' + ds.map(([n, d]) => '<path data-at="' + x + 'k' + n + '" d="' + d + '"/>').join('') + (k == 'e' && !far ? '<use data-at="kt" href="#atPTX" transform="' + a.t + '"/>' : '') + '</clipPath>';
  const muscles = (k, d, t, cs) => far ? '' : clip(k, [[k, d]]) + '<g clip-path="url(#' + id + k + ')"><g data-at="m' + k + '" transform="' + t + '">' + cs.map(c => atMuscle('#atM' + c, c, work, AT_HATCH[c])).join('') + (k == 'u' ? biceps : '') + '</g></g>';
  return fade('g', s[2], AT_EDGE[0]) + fade('h', AT_EDGE[2], AT_EDGE[1]) + clip('e', [['a', a.u], ['b', a.f]])
    + '<path data-at="' + x + 'u" d="' + a.u + '" fill="' + s[0] + '"/>' + muscles('u', a.u, a.mu, ['DL', 'TR', 'BR'])
    + '<path data-at="' + x + 'f" d="' + a.f + '" fill="' + s[0] + '"/>' + muscles('f', a.f, a.mf, ['BQ', 'AN'])
    + '<path data-at="' + x + 'e" d="' + a.e + '" fill="none" stroke="url(#' + id + 'g)" stroke-width="' + AT_EDGE[3] + '" stroke-linejoin="round" stroke-linecap="round" clip-path="url(#' + id + 'e)"/>'
    + '<path data-at="' + x + 'c" d="' + a.e + '" fill="none" stroke="url(#' + id + 'h)" stroke-width="' + AT_EDGE[4] + '" stroke-linejoin="round" stroke-linecap="round"/>';
};
/**
 * El contenido de la capa k del atleta (las de extras/rig) en la postura o; null si es del material, que pinta extras/figure.
 * work: lo que trabaja ({ p, s }, como en extras/figure); big, en grande (los músculos con su rayado).
 */
export const athleteLayer = (def, k, work, o) => {
  if (k[0] == 'p')
    return null;
  const far = k[0] == 'x';
  const key = far ? k.slice(1) : k;
  const hand = def.fist ? 'HG' : 'HA';
  if (key == 'FA')
    return '';
  if (key == 'UA')
    return atArmHtml(o, far, work);
  if (key == 'HA')
    return atSkin(hand, far);
  if (key == 'HD')
    return atSkin('HD') + '<use href="#atHr" fill="url(#atHa)"/>';
  if (key == 'TXs')
    return atSkin('TX');
  if (key == 'PVs')
    return atSkin('PV') + atShorts('PV', 'atCw');
  if (key == 'TXi')
    return atRelief('TX', work);
  if (key == 'PVi')
    return '';
  if (key == 'HP')
    return atShorts('HP');
  if (key == 'TH')
    return atSkin('TH', far) + (far ? '' : atRelief('TH', work)) + atShorts('TH', 'atCt');
  return atSkin(key, far) + (far ? '' : atRelief(key, work));
};
/** Las capas del atleta que van en la imagen y no con su transformación: el brazo y el antebrazo de los dos lados. */
export const ATHLETE_STILL = ['UA', 'FA', 'xUA', 'xFA'];
/** Lo que cambia en cada fotograma del atleta: [data-at, atributo, valor]. */
export const athleteFrame = (def, t) => {
  const o = rigSolve(def, t);
  const out = [];
  [['', atArm(o, '')], ['x', atArm(o, 'x')]].forEach(([x, a]) => {
    out.push([x + 'u', 'd', a.u], [x + 'f', 'd', a.f], [x + 'e', 'd', a.e], [x + 'c', 'd', a.e], [x + 'ka', 'd', a.u], [x + 'kb', 'd', a.f], [x + 'kg', 'gradientTransform', a.mu], [x + 'kh', 'gradientTransform', a.mu]);
    if (!x)
      out.push(['ku', 'd', a.u], ['kf', 'd', a.f], ['mu', 'transform', a.mu], ['mf', 'transform', a.mf], ['kt', 'transform', a.t], ['bi', 'd', a.bi], ['bh', 'd', a.bi]);
  });
  return out;
};
