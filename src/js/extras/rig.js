/* ═══ extras/rig ═══
   El modelo articulado de las figuras de ejercicio: dada una postura, dónde va cada pieza del cuerpo. Son funciones sin
   estado ni pantalla (se prueban sueltas, tests/rig.test.mjs); quien pinta y mueve es extras/figure.
   Hay dos modelos. El de perfil ('S') es un dibujo propio (data/figure): tronco, cabeza, cadera, muslo, pierna, pie,
   brazo, antebrazo y mano, cada pieza con su silueta y sus músculos, que giran sobre sus articulaciones. El frontal ('F')
   es la figura del mapa muscular (data/anatomy) con los brazos recortados por el hombro, para los ejercicios que solo se
   entienden de frente (elevaciones laterales).
   Una postura de perfil se escribe con ángulos en grados, como los diría un entrenador (0 = de pie y recto):
     lean  inclinación del tronco (hacia delante +; −90 = tumbado boca arriba)      neck  cuello (barbilla al pecho +)
     hip   flexión de cadera     knee  flexión de rodilla     ft  ángulo del pie con el suelo (0 = apoyado)
     sh    brazo hacia delante   el    flexión de codo        wr  muñeca
   o diciendo dónde van el puño o el tobillo, y el modelo calcula el codo o la rodilla:
     grip  [x, y] del puño, en coordenadas del tronco en reposo (va con el tronco)   foot  [x, y] del tobillo en la imagen
     kU, kF  escorzo del brazo y del antebrazo (1 = se ve entero; menos, apunta hacia quien mira)
     fa    con grip, ángulo del antebrazo con el tronco (90 = hacia delante): el codo va bajo el puño y kU sale solo
     eb, kb  hacia qué lado doblan el codo y la rodilla (1 o −1)
   at dice qué queda quieto, 'ankle' (el tobillo, en su sitio de reposo) o 'hip' (la cadera, en x, y).
   far: { … } cambia lo anterior para el brazo y la pierna del lado de atrás; sin él, hacen lo mismo que los de delante.
   Define: RAD, rot, place, norm, angle, limb, mix, ease, FAR_SHIFT, MIN_FORESHORTEN, sub, J, sidePose, f1, move, SIDE_ORDER, sideLayers, FRONT_ARM, frontLayers, poseAt, rigLayers, rigFrame, framePoints, rigBox, SIDE_REGIONS, sideRegions
*/
import { FG_J, FG_P } from '../data/figure.js';
const RAD = Math.PI / 180;
const rot = (p, a) => {
  const c = Math.cos(a * RAD);
  const s = Math.sin(a * RAD);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
};
/** Dónde queda el punto p (en reposo) de una pieza colocada: t = { r: pivote en reposo, w: pivote en la imagen, a: giro, k: escorzo }. */
const place = (t, p) => {
  const q = rot([p[0] - t.r[0], (p[1] - t.r[1]) * (t.k || 1)], t.a);
  return [t.w[0] + q[0], t.w[1] + q[1]];
};
const norm = a => ((a + 180) % 360 + 360) % 360 - 180;
const angle = v => Math.atan2(v[1], v[0]) / RAD;
/** Dos huesos de a hasta c: los giros que llevan los vectores de reposo d1 y d2 a pasar por la articulación del medio. */
const limb = (a, c, d1, d2, bend) => {
  const l1 = Math.hypot(d1[0], d1[1]);
  const l2 = Math.hypot(d2[0], d2[1]);
  let dx = c[0] - a[0];
  let dy = c[1] - a[1];
  const far = Math.hypot(dx, dy) || 1e-6;
  const d = Math.min(l1 + l2 - .01, Math.max(Math.abs(l1 - l2) + .01, far));
  dx /= far;
  dy /= far;
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const off = Math.sqrt(Math.max(0, l1 * l1 - along * along)) * bend;
  const b = [a[0] + dx * along - dy * off, a[1] + dy * along + dx * off];
  const end = [a[0] + dx * d, a[1] + dy * d];
  return [norm(angle([b[0] - a[0], b[1] - a[1]]) - angle(d1)), norm(angle([end[0] - b[0], end[1] - b[1]]) - angle(d2))];
};
/** Postura intermedia entre a y b (t de 0 a 1): los números y los puntos se reparten; lo demás es lo de a. */
const mix = (a, b, t) => {
  const o = {};
  Object.keys(a).forEach(k => {
    const x = a[k];
    const y = k in b ? b[k] : x;
    o[k] = typeof x == 'number' ? x + (y - x) * t : Array.isArray(x) ? x.map((v, i) => v + (y[i] - v) * t) : x && typeof x == 'object' ? mix(x, y, t) : x;
  });
  return o;
};
/** Arranque y frenada suaves (t de 0 a 1). */
export const ease = t => t * t * (3 - 2 * t);
/* el brazo y la pierna del lado de atrás se pintan un poco más arriba y más allá, para que se vean */
const FAR_SHIFT = [3, -3.5];
/* lo más corto que se llega a ver el brazo cuando apunta hacia quien mira */
const MIN_FORESHORTEN = .3;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const J = FG_J;
/** Las piezas de una postura de perfil: { T, HD, HP, TH, SH, FT, UA, FA, HA, y las del lado de atrás con x delante } y g, G: los puños. */
const sidePose = p => {
  const lean = p.lean || 0;
  const leg = (q, hip) => {
    let aT;
    let aS;
    if (q.foot)
      [aT, aS] = limb(hip, q.foot, sub(J.knee, J.hip), sub(J.ankle, J.knee), q.kb || 1);
    else {
      aT = lean - (q.hip || 0);
      aS = aT + (q.knee || 0);
    }
    const TH = { r: J.hip, w: hip, a: aT };
    const SH = { r: J.knee, w: place(TH, J.knee), a: aS };
    return { TH, SH, FT: { r: J.ankle, w: place(SH, J.ankle), a: q.ft || 0 } };
  };
  /* la cadera: en su sitio, o donde la deje el tobillo quieto */
  let hip = [p.x == null ? J.hip[0] : p.x, p.y == null ? J.hip[1] : p.y];
  if (p.at != 'hip') {
    const a = leg(p, [0, 0]).FT.w;
    hip = [(p.x == null ? J.ankle[0] : p.x) - a[0], (p.y == null ? J.ankle[1] : p.y) - a[1]];
  }
  const T = { r: J.hip, w: hip, a: lean };
  const arm = q => {
    const sh = place(T, J.sh);
    const rest = J.el[1] - J.sh[1];
    let kU = q.kU || 1;
    const kF = q.kF || 1;
    let aU;
    let aF;
    if (q.grip) {
      const g = place(T, q.grip);
      const d2 = [J.grip[0] - J.el[0], (J.grip[1] - J.el[1]) * kF];
      /* con fa, el antebrazo lleva ese ángulo con el tronco (90 = hacia delante): el codo cae bajo el puño y el brazo
         se ve tan corto como haga falta, que es lo que pasa cuando el codo apunta hacia quien mira */
      const e = q.fa == null ? null : sub(g, rot(d2, lean - q.fa));
      const len = e ? Math.hypot(e[0] - sh[0], e[1] - sh[1]) : 0;
      if (e && len <= rest && len >= rest * MIN_FORESHORTEN) {
        kU = len / rest;
        aU = norm(angle(sub(e, sh)) - 90);
        aF = norm(lean - q.fa);
      }
      else {
        if (e)
          kU = len > rest ? 1 : MIN_FORESHORTEN;
        [aU, aF] = limb(sh, g, [0, rest * kU], d2, q.eb || 1);
      }
    }
    else {
      aU = lean - (q.sh || 0);
      aF = aU - (q.el || 0);
    }
    const UA = { r: J.sh, w: sh, a: aU, k: kU };
    const FA = { r: J.el, w: place(UA, J.el), a: aF, k: kF };
    return { UA, FA, HA: { r: J.wr, w: place(FA, J.wr), a: aF - (q.wr || 0) } };
  };
  const o = { T, HD: { r: J.neck, w: place(T, J.neck), a: lean + (p.neck || 0) }, HP: T };
  Object.assign(o, leg(p, hip), arm(p));
  const q = p.far ? Object.assign({}, p, p.far) : p;
  const shift = t => Object.assign({}, t, { w: [t.w[0] + FAR_SHIFT[0], t.w[1] + FAR_SHIFT[1]] });
  const l = leg(q, hip);
  const a = arm(q);
  ['TH', 'SH', 'FT'].forEach(k => {
    o['x' + k] = shift(l[k]);
  });
  ['UA', 'FA', 'HA'].forEach(k => {
    o['x' + k] = shift(a[k]);
  });
  o.g = place(o.HA, J.grip);
  o.G = place(o.xHA, J.grip);
  return o;
};
const f1 = n => {
  const s = (Math.round(n * 10) / 10).toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
};
const move = t => 'translate(' + f1(t.w[0]) + ' ' + f1(t.w[1]) + ') rotate(' + f1(t.a) + ')' + (t.k && t.k != 1 ? ' scale(1 ' + (Math.round(t.k * 1e3) / 1e3) + ')' : '') + ' translate(' + f1(-t.r[0]) + ' ' + f1(-t.r[1]) + ')';
/* orden de pintado del perfil, de atrás adelante: las piezas (con x, las del lado de atrás) y el material; plate y bar son lo
   que va en el puño de atrás y en el de delante (el disco y la punta de la barra, o las dos mancuernas) */
const SIDE_ORDER = ['plate', 'xFT', 'xSH', 'xTH', 'bench', 'xFA', 'xUA', 'xHA', 'T', 'HD', 'FT', 'SH', 'TH', 'HP', 'FA', 'UA', 'HA', 'bar'];
/** Capas de una figura de perfil en la postura p: [{ k: capa, t: transformación o '' }], en el orden de pintado. */
const sideLayers = (def, p) => {
  const o = sidePose(p);
  const has = k => (def.props || []).some(x => x[0] == k);
  return SIDE_ORDER.filter(k => k == 'plate' || k == 'bar' ? has('bar') || has('db') : k == 'bench' ? has('bench') : true).map(k => ({
    k,
    t: k == 'plate' ? 'translate(' + f1(o.G[0]) + ' ' + f1(o.G[1]) + ')' : k == 'bar' ? 'translate(' + f1(o.g[0]) + ' ' + f1(o.g[1]) + ')' : k == 'bench' ? '' : move(o[k]),
  }));
};
/* el brazo de la figura frontal: gira sobre el hombro; lo que queda a un lado de esta línea es brazo */
export const FRONT_ARM = { pivot: [50.5, 81], cut: [[0, 40], [56, 40], [56, 70], [54.5, 90], [52, 100], [51.5, 116], [53, 134], [55, 152], [55, 170], [50, 200], [45, 222], [40, 258], [0, 258]], hand: [24.5, 233], regions: ['TR', 'BI', 'BR', 'BQ', 'AN', 'DA', 'DL'] };
/** Capas de una figura frontal: el cuerpo y los dos brazos, abiertos p.arm grados. */
const frontLayers = (def, p) => {
  const a = p.arm || 0;
  const [x, y] = FRONT_ARM.pivot;
  return [{ k: 'B', t: '' }, { k: 'A0', t: 'rotate(' + f1(a) + ' ' + x + ' ' + y + ')' }, { k: 'A1', t: 'rotate(' + f1(-a) + ' ' + (200 - x) + ' ' + y + ')' }];
};
/** La postura de la figura en el momento t (0 = inicio, 1 = final). */
const poseAt = (def, t) => mix(def.a, Object.assign({}, def.a, def.b), t);
/** Capas de la figura en el momento t. */
export const rigLayers = (def, t) => def.v == 'F' ? frontLayers(def, poseAt(def, t)) : sideLayers(def, poseAt(def, t));
/** Solo las transformaciones, en el mismo orden que rigLayers (para mover una figura ya pintada). */
export const rigFrame = (def, t) => rigLayers(def, t).map(l => l.t);
/* puntos que marcan lo que ocupa la figura en una postura: [parte, punto, margen]. Las partes son lo que se mueve junto:
   la cabeza, el cuerpo, cada brazo (con la barra) y cada pierna, y el banco */
const framePoints = (def, p) => {
  const prop = k => (def.props || []).find(x => x[0] == k);
  if (def.v == 'F') {
    const h = rot(sub(FRONT_ARM.hand, FRONT_ARM.pivot), p.arm || 0);
    const m = prop('db') ? 13 : 16;
    return [['head', [100, 8], 0], ['head', [58, 70], 0], ['head', [142, 70], 0], ['body', [100, 190], 0], ['body', [64, 400], 0], ['body', [136, 400], 0], ['arm', [FRONT_ARM.pivot[0] + h[0], FRONT_ARM.pivot[1] + h[1]], m], ['arm', [200 - FRONT_ARM.pivot[0] - h[0], FRONT_ARM.pivot[1] + h[1]], m]];
  }
  const o = sidePose(p);
  const ps = [[102, 6], [84, 26], [122, 30]].map(q => ['head', place(o.HD, q), 1]);
  [[127, 96], [74, 96], [69.5, 207], [122, 180]].forEach(q => ps.push(['body', place(o.T, q), 1]));
  [['', o.UA, o.g], ['x', o.xUA, o.G]].forEach(([x, u, g]) => {
    ps.push([x + 'arm', u.w, 16], [x + 'arm', place(u, J.el), 12], [x + 'arm', g, 10]);
  });
  [['', o.TH, o.FT], ['x', o.xTH, o.xFT]].forEach(([x, t, f]) => {
    ps.push([x + 'leg', place(t, J.knee), 16], [x + 'leg', place(f, [137, 402]), 0], [x + 'leg', place(f, [83, 402]), 0]);
  });
  if (prop('bar'))
    ps.push(['xarm', o.G, prop('bar')[1] + 1]);
  if (prop('db'))
    ps.push(['arm', o.g, 13], ['xarm', o.G, 13]);
  if (prop('bench'))
    ps.push(['bench', [prop('bench')[1], prop('bench')[3]], 0], ['bench', [prop('bench')[2], 402], 0]);
  return ps;
};
/** Caja [x, y, ancho, alto] que ocupa la figura en los momentos ts, con margen. Con focus, solo la cabeza y lo que se mueve
    en el ejercicio (los brazos y la barra en un press o un curl): es el encuadre de la miniatura. Si se mueve el cuerpo
    entero, como en una sentadilla, no se recorta nada. */
export const rigBox = (def, ts, focus) => {
  const at = t => framePoints(def, poseAt(def, t));
  const end = at(1);
  const moves = new Set(at(0).filter((q, i) => Math.hypot(q[1][0] - end[i][1][0], q[1][1] - end[i][1][1]) >= 3).map(q => q[0]));
  const crop = focus && !moves.has('body');
  let x0 = 1e9;
  let y0 = 1e9;
  let x1 = -1e9;
  let y1 = -1e9;
  ts.forEach(t => {
    at(t).forEach(([k, q, m]) => {
      if (crop && k != 'head' && !moves.has(k))
        return;
      x0 = Math.min(x0, q[0] - m);
      y0 = Math.min(y0, q[1] - m);
      x1 = Math.max(x1, q[0] + m);
      y1 = Math.max(y1, q[1] + m);
    });
  });
  const m = crop ? 12 : 6;
  return [x0 - m, y0 - m, x1 - x0 + 2 * m, y1 - y0 + 2 * m + (crop ? 0 : 4)];
};
/* músculo (código de data/library) → regiones del modelo de perfil */
const SIDE_REGIONS = { ps: ['PS'], pi: ['PI'], pe: ['PS', 'PI'], dA: ['DA'], dL: ['DL'], dP: ['DP'], tr: ['TR'], bi: ['BI'], br: ['BR'], bq: ['BQ'], an: ['AN'], da: ['LA'], rm: ['TM'], ro: ['TM'], ts: ['TS'], tm: ['TM'], er: ['ER'], cu: ['CU'], is: ['IS'], gl: ['GL'], gm: ['GM'], ge: ['GE'], so: ['SO'], ta: ['TA'], ab: ['AB'], ob: ['OB'], tv: ['OB'], co: ['AB', 'OB', 'ER'], fc: ['FC'], sa: ['SA'], ag: ['BQ', 'AN'] };
/** Regiones del modelo de perfil que corresponden a unos músculos. */
export const sideRegions = codes => {
  const o = [];
  (codes || []).forEach(c => {
    const ks = c == 'fu' ? Object.keys(FG_P).reduce((all, k) => all.concat(Object.keys(FG_P[k][2])), []).filter(k => !['KN', 'NK'].includes(k)) : SIDE_REGIONS[c] || [];
    ks.forEach(k => {
      if (!o.includes(k))
        o.push(k);
    });
  });
  return o;
};
