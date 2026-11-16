/* ═══ extras/rig ═══
   El modelo articulado de las figuras de ejercicio: dada una postura, dónde va cada pieza del cuerpo y cada pieza del
   material. Son funciones sin estado ni pantalla (se prueban sueltas, tests/rig.test.mjs); quien pinta y mueve es
   extras/figure, y las posturas de cada ejercicio están en extras/moves y data/figposes.
   Hay dos modelos. El de perfil ('S') es un dibujo propio (data/figure): tórax, pelvis, cabeza, cadera, muslo, pierna,
   pie, brazo, antebrazo y mano, cada pieza con su silueta y sus músculos, que giran sobre sus articulaciones. El frontal
   ('F') es la figura del mapa muscular (data/anatomy) recortada en cuerpo, brazo, antebrazo, muslo y pierna, para lo que
   solo se entiende de frente (elevaciones laterales, cruces de polea, abductores); con 'B' es la misma, de espaldas (para
   ver el deltoides posterior).

   Una postura de perfil se escribe con ángulos en grados, como los diría un entrenador (0 = de pie y recto):
     lean   inclinación de la pelvis y el tronco (hacia delante +; −90 = tumbado boca arriba; 90 = boca abajo)
     waist  flexión de la cintura (el tórax respecto a la pelvis)        neck  cuello (barbilla al pecho +)
     hip    flexión de cadera      knee  flexión de rodilla      ft  ángulo del pie con el suelo (0 = apoyado)
     ank    en vez de ft: flexión del tobillo, cuando el pie va con la pierna (una extensión de cuádriceps)
     sh     brazo hacia delante    el    flexión de codo         wr  muñeca      ha  en vez de wr: ángulo de la mano
     shy, shx  el hombro sube (encogimientos) o va hacia delante
   o diciendo dónde van la mano o el tobillo, y el modelo calcula el codo o la rodilla:
     grip   [x, y] del puño, en coordenadas del tórax en reposo (va con él)     gw  [x, y] del puño en la imagen
     gl     [x, y, largo, ángulo]: el puño en el extremo de una palanca que gira sobre (x, y) en la imagen. Al repartir
            el gesto cambia el ángulo y no el largo: el puño va por un arco y la palanca de la máquina no se estira
     palm   [x, y] de la muñeca en la imagen, con la mano abierta apoyada (flexiones, planchas)
     fa     con grip, gw, gl o palm: ángulo del antebrazo con el tórax (90 = hacia delante). El codo va bajo el puño y el
            brazo se ve tan corto como haga falta, que es lo que pasa cuando el codo apunta hacia quien mira
     foot   [x, y] del tobillo en la imagen
     kU, kF, kT, kS  escorzo del brazo, el antebrazo, el muslo y la pierna (1 = se ven enteros)
     eb, kb  −1 y 1: el codo o la rodilla doblan al revés de lo natural. Solo hace falta cuando el brazo está girado
            hacia quien mira y de perfil se ve así (las manos en una barra tras la nuca)
   at dice qué queda quieto, en x, y (si no se dan, su sitio de reposo): 'ankle' (lo normal: los pies no se mueven), 'toe'
   (la punta del pie), 'knee' (de rodillas), 'hip' (sentado o tumbado), 'grip' (colgado de una barra o apoyado en ella) o
   'pin' (un punto del tórax, pin: [x, y], como la espalda apoyada en un banco).
   far: { … } cambia lo anterior para el brazo y la pierna del lado de atrás; sin él, hacen lo mismo que los de delante.

   Una postura de frente lleva, para los dos lados o, con r: { … }, distinto para el derecho de la imagen:
     arm, elb  apertura del brazo y giro del antebrazo      leg, knee  apertura de la pierna y giro de la pierna
     kU, kF, kT, kS  escorzos      shy  el hombro sube      rot, x, y  giro y sitio del cuerpo entero (tumbado de lado)

   Una figura es { v, a, b, m, props, … }: va de la postura a a la b (de b solo se escribe lo que cambia) pasando, si
   la lleva, por la intermedia m a medio camino. m es un tiempo del ejercicio (un burpee: de pie, en cuclillas, en
   plancha) salvo que la figura diga via: entonces solo guía el camino (el pie que da un paso va por el aire) y ni se
   enseña quieta ni alarga el compás. Con cycle: ms, el gesto es medio ciclo (media zancada, media vuelta de pedales)
   que se repite sin parar ni volver atrás, cada vez con los lados cambiados: el momento t va entonces de 0 a 2.

   El material de una figura es una lista de piezas [tipo, hueco, …]. El hueco dice dónde se pinta: 'b' detrás de todo,
   'm' entre el lado de atrás y el cuerpo (bancos, asientos) o 'f' delante. Tipos:
     L d ancho tono · P d tono · R x y ancho alto giro tono · C x y radio tono · S x y ancho alto
                        trazo, relleno, almohadilla, círculo y placas de pesas, fijos en la imagen
     on pieza prim      una de las anteriores unida a una pieza del cuerpo, en sus coordenadas de reposo (un respaldo
                        que va con el tórax, el rodillo sobre la pierna)
     link a b ancho tono remate   una barra recta de a hasta b (un cable de polea, la palanca de una máquina, una goma);
                        a y b son 'g' o 'G' (los puños), [x, y] (fijo) o [pieza, x, y]
     aim a b prim       una pieza rígida con el origen en a y el eje x apuntando a b (un neumático que se voltea)
     slide [dx, dy] prim  una de las fijas que se desliza (dx, dy) a lo largo del gesto, a velocidad constante (los
                        peldaños de una escaladora, que en un ciclo vuelven a empezar)
     bar radio · db modo · kb modo · ball radio · bag · disc   lo que se lleva en las manos
   Define: RAD, rot, place, norm, angle, limb, mix, ease, sub, J, FAR_SHIFT, MIN_FORESHORTEN, ELBOW_MIN, FLOOR, f1, move, sidePose, FRONT, frontPose, spot, at, held, propLayers, SIDE_BODY, FRONT_BODY, SIDE_KEYS, otherSide, rigPose, solve, rigLayers, rigFrame, pathPoints, framePoints, rigBox, poseSpot, SIDE_REGIONS, sideRegions
*/
import { FG_J, FG_P } from '../data/figure.js';
/** Un grado, en radianes. */
export const RAD = Math.PI / 180;
const rot = (p, a) => {
  const c = Math.cos(a * RAD);
  const s = Math.sin(a * RAD);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
};
/** Dónde queda el punto p (en reposo) de una pieza colocada: t = { r: pivote en reposo, w: pivote en la imagen, a: giro,
    k: escorzo a lo largo de la pieza, ax: hacia dónde apunta la pieza en reposo (0 = hacia abajo) }. */
const place = (t, p) => {
  let q = [p[0] - t.r[0], p[1] - t.r[1]];
  if (t.k && t.k != 1) {
    q = rot(q, -(t.ax || 0));
    q = rot([q[0], q[1] * t.k], t.ax || 0);
  }
  q = rot(q, t.a);
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
    o[k] = typeof x == 'number' && typeof y == 'number' ? x + (y - x) * t : Array.isArray(x) && Array.isArray(y) ? x.map((v, i) => v + (y[i] - v) * t) : x && y && typeof x == 'object' && !Array.isArray(x) ? mix(x, y, t) : x;
  });
  return o;
};
/** Arranque y frenada suaves (t de 0 a 1). */
export const ease = t => t * t * (3 - 2 * t);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const J = FG_J;
/* el brazo y la pierna del lado de atrás se pintan un poco más arriba y más allá, para que se vean */
const FAR_SHIFT = [3, -3.5];
/* lo más corto que se llega a ver el brazo cuando apunta hacia quien mira */
const MIN_FORESHORTEN = .3;
/* lo más que se cierra un codo: el ángulo que queda entre el brazo y el antebrazo no baja de esto (grados) */
const ELBOW_MIN = 30;
/* la altura del suelo */
const FLOOR = 402;
const f1 = n => {
  const s = (Math.round(n * 10) / 10).toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
};
/** La transformación SVG que coloca una pieza. */
const move = t => {
  const squash = t.k && t.k != 1 ? (t.ax ? ' rotate(' + f1(t.ax) + ')' : '') + ' scale(1 ' + (Math.round(t.k * 1e3) / 1e3) + ')' + (t.ax ? ' rotate(' + f1(-t.ax) + ')' : '') : '';
  return (t.root || '') + 'translate(' + f1(t.w[0]) + ' ' + f1(t.w[1]) + ') rotate(' + f1(t.a) + ')' + squash + ' translate(' + f1(-t.r[0]) + ' ' + f1(-t.r[1]) + ')';
};
/** Las piezas de una postura de perfil: { PV, TX, HD, HP, TH, SH, FT, UA, FA, HA, las del lado de atrás con x delante } y los
    puños, g y G. */
const sidePose = p => {
  const lean = p.lean || 0;
  const aX = lean + (p.waist || 0);
  const trunk = hip => {
    const PV = { r: J.hip, w: hip, a: lean };
    return { PV, TX: { r: J.waist, w: place(PV, J.waist), a: aX } };
  };
  const leg = (q, hip) => {
    const kT = q.kT || 1;
    const kS = q.kS || 1;
    let aT;
    let aS;
    if (q.foot)
      [aT, aS] = limb(hip, q.foot, [J.knee[0] - J.hip[0], (J.knee[1] - J.hip[1]) * kT], [J.ankle[0] - J.knee[0], (J.ankle[1] - J.knee[1]) * kS], q.kb || -1);
    else {
      aT = lean - (q.hip || 0);
      aS = aT + (q.knee || 0);
    }
    const TH = { r: J.hip, w: hip, a: aT, k: kT };
    const SH = { r: J.knee, w: place(TH, J.knee), a: aS, k: kS };
    return { TH, SH, FT: { r: J.ankle, w: place(SH, J.ankle), a: q.ank == null ? q.ft || 0 : aS - q.ank } };
  };
  const arm = (q, TX) => {
    const sh = place(TX, [J.sh[0] + (q.shx || 0), J.sh[1] - (q.shy || 0)]);
    const rest = J.el[1] - J.sh[1];
    let kU = q.kU || 1;
    let kF = q.kF || 1;
    let aU;
    let aF;
    const goal = q.palm || q.gw || (q.gl ? [q.gl[0] + q.gl[2] * Math.cos(q.gl[3] * RAD), q.gl[1] + q.gl[2] * Math.sin(q.gl[3] * RAD)] : q.grip ? place(TX, q.grip) : null);
    /* el codo, si lo fija el ángulo del antebrazo (fa) */
    let e = null;
    if (goal) {
      /* del codo al puño o, con la mano apoyada, a la muñeca */
      const end = q.palm ? J.wr : J.grip;
      let d2 = [end[0] - J.el[0], (end[1] - J.el[1]) * kF];
      e = q.fa == null ? null : sub(goal, rot(d2, aX - q.fa));
      const len = e ? Math.hypot(e[0] - sh[0], e[1] - sh[1]) : 0;
      if (e && len <= rest) {
        /* el brazo se ve tan corto como haga falta; si el codo pasa casi por delante del hombro, no menos del mínimo */
        kU = Math.max(MIN_FORESHORTEN, len / rest);
        aU = norm(angle(sub(e, sh)) - 90);
        aF = norm(aX - q.fa);
      }
      else {
        e = null;
        /* la mano, tan cerca del hombro que el codo tendría que cerrarse más de lo que da de sí: el brazo y el antebrazo
           se ven en escorzo, con el codo hacia quien mira, lo justo para que el codo quede en su tope */
        const reach = Math.hypot(goal[0] - sh[0], goal[1] - sh[1]);
        const l1 = rest * kU;
        const l2 = Math.hypot(d2[0], d2[1]);
        const least = Math.sqrt(l1 * l1 + l2 * l2 - 2 * l1 * l2 * Math.cos(ELBOW_MIN * RAD));
        if (reach < least) {
          const f = Math.max(MIN_FORESHORTEN, reach / least);
          kU *= f;
          kF *= f;
          d2 = [d2[0], (end[1] - J.el[1]) * kF];
        }
        [aU, aF] = limb(sh, goal, [0, rest * kU], d2, q.eb || 1);
      }
    }
    else {
      aU = aX - (q.sh || 0);
      aF = aU - (q.el || 0);
    }
    const UA = { r: J.sh, w: sh, a: aU, k: kU };
    const FA = { r: J.el, w: e || place(UA, J.el), a: aF, k: kF };
    /* la mano va con el escorzo del antebrazo: así el puño queda justo donde se le pide */
    return { UA, FA, HA: { r: J.wr, w: place(FA, J.wr), a: q.ha != null ? q.ha : q.palm ? -90 : aF - (q.wr || 0), k: kF } };
  };
  /* la cadera: en su sitio o donde la deje lo que queda quieto */
  const fixed = p.at || 'ankle';
  let hip;
  if (fixed == 'hip')
    hip = [p.x == null ? J.hip[0] : p.x, p.y == null ? J.hip[1] : p.y];
  else {
    const z = trunk([0, 0]);
    let o;
    let d;
    if (fixed == 'pin') {
      o = place(z.TX, p.pin);
      d = p.pin;
    }
    else if (fixed == 'grip') {
      o = place(arm(p, z.TX).HA, J.grip);
      d = J.grip;
    }
    else {
      const l = leg(p, [0, 0]);
      o = fixed == 'knee' ? place(l.TH, J.knee) : fixed == 'toe' ? place(l.FT, J.toe) : l.FT.w;
      d = fixed == 'knee' ? [J.knee[0], FLOOR - 14] : fixed == 'toe' ? J.toe : J.ankle;
    }
    hip = [(p.x == null ? d[0] : p.x) - o[0], (p.y == null ? d[1] : p.y) - o[1]];
  }
  const { PV, TX } = trunk(hip);
  const o = { PV, TX, HP: PV, HD: { r: J.neck, w: place(TX, J.neck), a: aX + (p.neck || 0) } };
  Object.assign(o, leg(p, hip), arm(p, TX));
  const q = p.far ? Object.assign({}, p, p.far) : p;
  const shift = t => Object.assign({}, t, { w: [t.w[0] + FAR_SHIFT[0], t.w[1] + FAR_SHIFT[1]] });
  const l = leg(q, hip);
  const a = arm(q, TX);
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
/* la figura frontal, recortada: articulaciones del lado izquierdo de la imagen (el derecho es su reflejo), el contorno de
   cada pieza y las regiones del mapa muscular que van con ella. U brazo, F antebrazo y mano, T muslo, S pierna y pie, B el resto */
export const FRONT = {
  sh: [50.5, 81],
  el: [39.5, 151],
  hand: [24.5, 233],
  hip: [80, 197],
  knee: [79, 298],
  foot: [76, 394],
  cut: {
    U: [[0, 40], [56, 40], [56, 70], [54.5, 90], [52, 100], [51.5, 116], [53, 134], [55, 152], [55, 153.5], [0, 153.5]],
    F: [[0, 149], [55.2, 149], [55, 170], [52.3, 186], [50, 200], [45, 222], [40, 258], [0, 258]],
    T: [[100.4, 212], [66, 186], [52.3, 186], [50, 200], [45, 222], [40, 258], [40, 300.5], [100.4, 300.5]],
    S: [[40, 296], [100.4, 296], [100.4, 410], [40, 410]],
    B: [[56, 0], [144, 0], [144, 70], [145.5, 90], [148, 100], [148.5, 116], [147, 134], [145, 152], [145, 170], [147.7, 186], [134, 186], [100, 212], [66, 186], [52.3, 186], [55, 170], [55, 152], [53, 134], [51.5, 116], [52, 100], [54.5, 90], [56, 70]],
  },
  regions: { U: ['TR', 'BI', 'BR', 'DA', 'DL'], F: ['BQ', 'AN'], T: ['CU', 'AD', 'KN'], S: ['TA', 'GE', 'SO'] },
  /* y las de la figura de espaldas ('B'), que lleva el mismo recorte */
  back: { U: ['TR', 'DP'], F: ['BQ', 'AN'], T: ['IS', 'AD'], S: ['GE', 'SO'] },
};
/** Las piezas de una postura de frente: { B, U0, F0, T0, S0, U1, F1, T1, S1 } y las manos, g (izquierda de la imagen) y G. */
const frontPose = p => {
  const root = p.rot || p.x || p.y ? 'translate(' + f1(p.x || 0) + ' ' + f1(p.y || 0) + ') rotate(' + f1(p.rot || 0) + ' 100 205) ' : '';
  /* hacia dónde apunta en reposo la pieza que va de a hasta b */
  const axis = (a, b) => Math.atan2(a[0] - b[0], b[1] - a[1]) / RAD;
  const o = { B: { r: [0, 0], w: [0, 0], a: 0, root } };
  [0, 1].forEach(i => {
    const q = i && p.r ? Object.assign({}, p, p.r) : p;
    const m = i ? -1 : 1;
    const P = pt => i ? [200 - pt[0], pt[1]] : pt;
    const part = (from, to, w, a, k) => ({ r: P(from), w, a: m * a, k: k || 1, ax: m * axis(from, to), root });
    const U = part(FRONT.sh, FRONT.el, [P(FRONT.sh)[0], FRONT.sh[1] - (q.shy || 0)], q.arm || 0, q.kU);
    const T = part(FRONT.hip, FRONT.knee, P(FRONT.hip), q.leg || 0, q.kT);
    o['U' + i] = U;
    o['F' + i] = part(FRONT.el, FRONT.hand, place(U, P(FRONT.el)), (q.arm || 0) + (q.elb || 0), q.kF);
    o['T' + i] = T;
    o['S' + i] = part(FRONT.knee, FRONT.foot, place(T, P(FRONT.knee)), (q.leg || 0) + (q.knee || 0), q.kS);
  });
  /* un punto del cuerpo, con el giro y el sitio del cuerpo entero */
  o.out = q => {
    const c = rot([q[0] - 100, q[1] - 205], p.rot || 0);
    return [c[0] + 100 + (p.x || 0), c[1] + 205 + (p.y || 0)];
  };
  o.g = o.out(place(o.F0, FRONT.hand));
  o.G = o.out(place(o.F1, [200 - FRONT.hand[0], FRONT.hand[1]]));
  return o;
};
/** Un punto del material en la imagen: 'g' o 'G' (los puños), [x, y] (fijo) o [pieza, x, y] (un punto de una pieza del cuerpo). */
const spot = (o, s) => {
  if (s == 'g' || s == 'G')
    return o[s];
  if (s.length == 2)
    return s;
  const q = place(o[s[0]], [s[1], s[2]]);
  return o.out ? o.out(q) : q;
};
const at = q => 'translate(' + f1(q[0]) + ' ' + f1(q[1]) + ')';
/* lo que gira con la mano: en el puño g y con el giro de la mano, sin su escorzo */
const held = (hand, g) => move({ r: J.grip, w: g, a: hand.a });
/** Las capas de la pieza de material número i en una postura: [{ k: nombre, s: hueco, t: transformación o '' }]. */
const propLayers = (pr, i, o) => {
  const k = 'p' + i;
  const [type, slot] = pr;
  if (type == 'bar')
    return [{ k: k + 'b', s: 'b', t: at(o.G) }, { k: k + 'f', s: 'f', t: at(o.g) }];
  if (type == 'db' || type == 'kb') {
    /* modo: 0 las dos de punta, 1 solo la de delante, 2 las dos de lado (giran con la mano), 3 solo la de delante de lado,
       4 una, vertical (copa); la kettlebell: 0 cuelga del puño, 1 sigue al brazo, 2 dos, una en cada mano */
    const turns = type == 'db' ? pr[2] == 2 || pr[2] == 3 : pr[2] == 1;
    const both = type == 'db' ? !pr[2] || pr[2] == 2 : pr[2] == 2;
    const near = { k: k + 'f', s: 'f', t: turns && o.HA ? held(o.HA, o.g) : at(o.g) };
    /* de frente, las dos manos están delante */
    return both ? [{ k: k + 'b', s: o.out ? 'f' : 'b', t: turns && o.xHA ? held(o.xHA, o.G) : at(o.G) }, near] : [near];
  }
  if (type == 'ball' || type == 'bag' || type == 'disc')
    return [{ k: k + 'f', s: slot || 'f', t: type == 'disc' && o.HA ? held(o.HA, o.g) : at(o.g) }];
  if (type == 'on')
    return [{ k, s: slot, t: move(o[pr[2]]) }];
  /* lo que se desliza a lo largo del gesto (los peldaños de una escaladora), a velocidad constante */
  if (type == 'slide')
    return [{ k, s: slot, t: at([pr[2][0] * o.t, pr[2][1] * o.t]) }];
  if (type == 'aim') {
    const a = spot(o, pr[2]);
    return [{ k, s: slot, t: at(a) + ' rotate(' + f1(angle(sub(spot(o, pr[3]), a))) + ')' }];
  }
  if (type == 'link') {
    const a = spot(o, pr[2]);
    const b = spot(o, pr[3]);
    const turn = ' rotate(' + f1(angle(sub(b, a))) + ')';
    const ls = [{ k: k + 'l', s: slot, t: at(a) + turn + ' scale(' + f1(Math.max(.1, Math.hypot(b[0] - a[0], b[1] - a[1]))) + ' 1)' }];
    if (pr[6])
      ls.push({ k: k + 'e', s: slot, t: at(b) + turn });
    return ls;
  }
  return [{ k, s: slot, t: '' }];
};
/* orden de pintado del cuerpo, de atrás adelante: [capa, pieza que la coloca]. De perfil, el lado de atrás va antes del
   material del hueco 'm'; las siluetas del tronco (s) van antes que sus músculos (i), para que no los tapen en la cintura */
const SIDE_BODY = [[['xFT', 'xFT'], ['xSH', 'xSH'], ['xTH', 'xTH'], ['xFA', 'xFA'], ['xUA', 'xUA'], ['xHA', 'xHA']], [['PVs', 'PV'], ['TXs', 'TX'], ['PVi', 'PV'], ['TXi', 'TX'], ['HD', 'HD'], ['FT', 'FT'], ['SH', 'SH'], ['TH', 'TH'], ['HP', 'HP'], ['FA', 'FA'], ['UA', 'UA'], ['HA', 'HA']]];
const FRONT_BODY = [[], [['T0', 'T0'], ['S0', 'S0'], ['T1', 'T1'], ['S1', 'S1'], ['B', 'B'], ['U0', 'U0'], ['F0', 'F0'], ['U1', 'U1'], ['F1', 'F1']]];
/* lo que en una postura de perfil es de un lado del cuerpo (una pierna y un brazo) */
const SIDE_KEYS = ['hip', 'knee', 'ank', 'ft', 'foot', 'kT', 'kS', 'kb', 'sh', 'el', 'wr', 'ha', 'grip', 'gw', 'gl', 'palm', 'fa', 'kU', 'kF', 'eb', 'shy', 'shx'];
/* La misma postura de perfil con los lados cambiados: lo que hacía el de delante lo hace el de atrás, y al revés. Lo que
   un lado no tiene se queda en null, para que no lo herede del otro. */
const otherSide = p => {
  const far = Object.assign({}, p, p.far);
  const q = Object.assign({}, p, { far: {} });
  SIDE_KEYS.forEach(k => {
    q[k] = far[k] == null ? null : far[k];
    q.far[k] = p[k] == null ? null : p[k];
  });
  return q;
};
/** La postura de la figura en el momento t (0 = inicio, 1 = final). Si la figura lleva una postura intermedia (m), el
    gesto pasa por ella a medio camino: de pie → en cuclillas → en plancha, en un burpee. */
const rigPose = (def, t) => {
  /* un ciclo (correr, pedalear) es el mismo medio gesto dos veces, la segunda con los lados cambiados: de 1 a 2 */
  if (def.cycle && t >= 1)
    return otherSide(rigPose(def, t % 2 - 1));
  const end = Object.assign({}, def.a, def.b);
  if (!def.m)
    return mix(def.a, end, t);
  const mid = Object.assign({}, def.a, def.m);
  return t < .5 ? mix(def.a, mid, t * 2) : mix(mid, end, t * 2 - 1);
};
/** Las piezas de la figura en el momento t. */
const solve = (def, t) => def.v == 'S' ? sidePose(rigPose(def, t)) : frontPose(rigPose(def, t));
/** Capas de la figura en el momento t, en el orden de pintado: [{ k: capa, t: transformación o '' }]. */
export const rigLayers = (def, t) => {
  const o = solve(def, t);
  o.t = def.cycle ? t % 1 : t;
  const body = def.v == 'S' ? SIDE_BODY : FRONT_BODY;
  const gear = (def.props || []).reduce((all, pr, i) => all.concat(propLayers(pr, i, o)), []);
  const part = ks => ks.map(([k, piece]) => ({ k, t: move(o[piece]) }));
  const slot = s => gear.filter(l => l.s == s).map(l => ({ k: l.k, t: l.t }));
  return slot('b').concat(part(body[0]), slot('m'), part(body[1]), slot('f'));
};
/** Solo las transformaciones, en el mismo orden que rigLayers (para mover una figura ya pintada). */
export const rigFrame = (def, t) => rigLayers(def, t).map(l => l.t);
/* los puntos por los que pasa un trazo de SVG (M L H V Q T C S, en absoluto o en relativo; de las curvas, también los de
   control): lo que ocupa una pieza del material */
const pathPoints = d => {
  const out = [];
  let x = 0;
  let y = 0;
  String(d).replace(/([a-zA-Z])([^a-zA-Z]*)/g, (all, c, args) => {
    const n = (args.match(/-?\d*\.?\d+/g) || []).map(Number);
    const rel = c == c.toLowerCase();
    const cmd = c.toUpperCase();
    if (cmd == 'H')
      n.forEach(v => out.push([x = rel ? x + v : v, y]));
    else if (cmd == 'V')
      n.forEach(v => out.push([x, y = rel ? y + v : v]));
    else {
      /* cada tramo acaba en su último par de números, y de ahí sale el siguiente */
      const pairs = cmd == 'C' ? 3 : cmd == 'Q' || cmd == 'S' ? 2 : 1;
      for (let i = 0; i + 1 < n.length; i += 2) {
        const p = [rel ? x + n[i] : n[i], rel ? y + n[i + 1] : n[i + 1]];
        out.push(p);
        if ((i / 2) % pairs == pairs - 1)
          [x, y] = p;
      }
    }
    return all;
  });
  return out;
};
/* puntos que marcan lo que ocupa la figura en una postura: [parte, punto, margen]. Las partes son lo que se mueve junto:
   la cabeza, el cuerpo, cada brazo (con lo que lleva) y cada pierna, y el material fijo */
const framePoints = (def, t) => {
  const o = solve(def, t);
  const ps = [];
  /* los puntos del cuerpo de frente van con el giro del cuerpo entero (body) */
  const add = (k, q, m, body) => ps.push([k, o.out && body ? o.out(q) : q, m]);
  if (def.v != 'S') {
    [[100, 8], [58, 70], [142, 70]].forEach(q => add('head', q, 0, 1));
    add('body', [100, 190], 0, 1);
    [0, 1].forEach(i => {
      add('arm' + i, place(o['F' + i], [i ? 200 - FRONT.hand[0] : FRONT.hand[0], FRONT.hand[1]]), 14, 1);
      add('arm' + i, place(o['U' + i], [i ? 200 - FRONT.el[0] : FRONT.el[0], FRONT.el[1]]), 10, 1);
      add('leg' + i, place(o['S' + i], [i ? 200 - FRONT.foot[0] : FRONT.foot[0], FRONT.foot[1] + 6]), 12, 1);
      add('leg' + i, place(o['T' + i], [i ? 200 - FRONT.knee[0] : FRONT.knee[0], FRONT.knee[1]]), 16, 1);
    });
  }
  else {
    /* la cabeza, redonda, ocupa lo mismo mire adonde mire; del tronco, lo que más sobresale por delante y por detrás */
    add('head', place(o.HD, [103, 27]), 21.5);
    [[127, 96], [74, 96], [75, 60], [127, 122]].forEach(q => add('body', place(o.TX, q), 1));
    [[69.5, 190], [72, 222], [112, 226], [124, 165]].forEach(q => add('body', place(o.PV, q), 1));
    [['', o.UA, o.g], ['x', o.xUA, o.G]].forEach(([x, u, g]) => {
      add(x + 'arm', u.w, 16);
      add(x + 'arm', place(u, J.el), 12);
      add(x + 'arm', g, 10);
      /* la mano abierta llega más lejos que el puño: hasta la punta de los dedos */
      if (!def.fist)
        add(x + 'arm', place(o[x + 'HA'], [100, 246]), 4);
    });
    [['', o.TH, o.FT], ['x', o.xTH, o.xFT]].forEach(([x, th, f]) => {
      add(x + 'leg', place(th, J.knee), 16);
      /* el muslo, por delante y por detrás */
      add(x + 'leg', place(th, [121, 236]), 2);
      add(x + 'leg', place(th, [77, 244]), 2);
      add(x + 'leg', place(f, [137, 402]), 0);
      add(x + 'leg', place(f, [83, 402]), 0);
    });
  }
  /* el material: lo que va en las manos cuenta con su brazo; cada una de las demás piezas es una parte suelta (gear + su
     número), fija o unida a una pieza del cuerpo */
  (def.props || []).forEach((pr, i) => {
    const gear = 'gear' + i;
    const prim = (q, to) => {
      const put = (pt, m) => add(gear, to ? place(to, pt) : pt, m, to);
      if (q[0] == 'L' || q[0] == 'P')
        pathPoints(q[2]).forEach(pt => put(pt, q[0] == 'L' ? q[3] / 2 : 0));
      else if (q[0] == 'R') {
        /* las cuatro esquinas de la almohadilla, con su giro */
        const c = Math.cos((q[6] || 0) * RAD);
        const n = Math.sin((q[6] || 0) * RAD);
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([i, j]) => put([q[2] + i * q[4] / 2 * c - j * q[5] / 2 * n, q[3] + i * q[4] / 2 * n + j * q[5] / 2 * c], 1));
      }
      else if (q[0] == 'C')
        put([q[2], q[3]], q[4]);
      else if (q[0] == 'S') {
        put([q[2], q[3]], 0);
        put([q[2] + q[4], q[3] + q[5]], 0);
      }
    };
    const type = pr[0];
    if (type == 'bar')
      add('xarm', o.G, pr[2] + 1);
    else if (type == 'db') {
      add('arm', o.g, 13);
      if (!pr[2] || pr[2] == 2)
        add('xarm', o.G, 13);
    }
    else if (type == 'kb')
      add('arm', [o.g[0], o.g[1] + 14], 16);
    else if (type == 'ball' || type == 'bag' || type == 'disc')
      add('arm', o.g, type == 'ball' ? pr[2] : 16);
    else if (type == 'on')
      prim(pr[3], o[pr[2]]);
    else if (type == 'slide')
      prim(pr[3], { r: [0, 0], w: [pr[2][0] * (def.cycle ? t % 1 : t), pr[2][1] * (def.cycle ? t % 1 : t)], a: 0 });
    else if (type == 'link' || type == 'aim') {
      add(gear, spot(o, pr[2]), type == 'aim' ? pr[5] || 20 : 2);
      add(gear, spot(o, pr[3]), type == 'aim' ? pr[5] || 20 : 2);
    }
    else
      prim(pr);
  });
  return ps;
};
/** Caja [x, y, ancho, alto] que ocupa la figura en los momentos ts, con margen. Con focus, solo la cabeza y lo que se mueve
    en el ejercicio (los brazos y la barra en un press o un curl): es el encuadre de la miniatura. Si se mueve el cuerpo
    entero, como en una sentadilla, no se recorta nada. */
export const rigBox = (def, ts, focus) => {
  const end = framePoints(def, 1);
  const moves = new Set(framePoints(def, 0).filter((q, i) => Math.hypot(q[1][0] - end[i][1][0], q[1][1] - end[i][1][1]) >= 3).map(q => q[0]));
  /* sin recorte si se mueve el cuerpo entero, si no se mueve nada (una postura que se mantiene) o si la figura lo pide */
  const crop = focus && !def.whole && !def.hold && moves.size && !moves.has('body');
  let x0 = 1e9;
  let y0 = 1e9;
  let x1 = -1e9;
  let y1 = -1e9;
  ts.forEach(t => {
    framePoints(def, t).forEach(([k, q, m]) => {
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
/** Dónde queda en la imagen un punto de una pieza del cuerpo ([pieza, x, y]) en una postura de perfil: para colocar el
    material (el banco bajo la espalda, la barra de dominadas en las manos) al escribir una postura. */
export const poseSpot = (p, s) => spot(sidePose(p), s);
/* músculo (código de data/library) → regiones del modelo de perfil */
const SIDE_REGIONS = { ps: ['PS'], pi: ['PI'], pe: ['PS', 'PI'], dA: ['DA'], dL: ['DL'], dP: ['DP'], tr: ['TR'], bi: ['BI'], br: ['BR'], bq: ['BQ'], an: ['AN'], da: ['LA'], rm: ['TM'], ro: ['TM'], ts: ['TS'], tm: ['TM'], er: ['ER1', 'ER2'], cu: ['CU'], is: ['IS'], gl: ['GL'], gm: ['GM'], ge: ['GE'], so: ['SO'], ta: ['TA'], ab: ['AB1', 'AB2'], ob: ['OB'], tv: ['OB'], co: ['AB1', 'AB2', 'OB', 'ER1', 'ER2'], fc: ['FC'], sa: ['SA'], ag: ['BQ', 'AN'] };
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
