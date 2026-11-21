/* Figura anatómica en 3D para la vista de tres cuartos (prototipo para la revisión), hecha con el dibujo del modelo actual.
   El mapa muscular de frente y el de espaldas se envuelven sobre un cuerpo de cilindros elípticos (tronco, cuello y
   cabeza, brazo, antebrazo, muslo y pierna): cada músculo conserva su forma, solo cambia el ángulo desde el que se ve. En
   cada fotograma se colocan los huesos (cinemática inversa para brazos y piernas), se proyecta todo desde una cámara de tres
   cuartos y se pinta en SVG como ahora: silueta con su borde claro, músculos con su degradado, rayado y borde, y lo que
   trabaja en rojo (principal) y naranja (secundario). Lo que queda de espaldas a la cámara no se pinta; lo que queda en el
   borde se dobla sobre la silueta. Unidades: las del mapa muscular (la figura mide unos 392). */
(function (G) {
  const { cos, sin, PI, hypot, sqrt, max, min, atan2, asin, abs, round } = Math;
  const RAD = d => d * PI / 180;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => hypot(a[0], a[1], a[2]);
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const perp = (v, ax) => norm(sub(v, mul(ax, dot(v, ax))));
  const mix = (a, b, t) => typeof a == 'number' ? a + (b - a) * t : Array.isArray(a) ? a.map((v, i) => mix(v, b[i], t)) : Object.fromEntries(Object.keys(a).map(k => [k, mix(a[k], b[k], t)]));
  const ease = t => t * t * (3 - 2 * t);
  const clamp = (v, a, b) => min(b, max(a, v));
  const lerpTab = (tab, v) => {
    if (v <= tab[0][0]) return tab[0][1];
    for (let i = 1; i < tab.length; i++) if (v <= tab[i][0]) { const [a, ra] = tab[i - 1], [b, rb] = tab[i]; return ra + (rb - ra) * (v - a) / (b - a); }
    return tab[tab.length - 1][1];
  };
  const at = (f, p) => add(add(add(f.o, mul(f.x, p[0])), mul(f.y, p[1])), mul(f.z, p[2]));
  const turn = (f, ax, deg) => {
    const c = cos(RAD(deg)), s = sin(RAD(deg)), g = { o: f.o, x: f.x, y: f.y, z: f.z };
    if (ax == 'x') { g.y = add(mul(f.y, c), mul(f.z, s)); g.z = sub(mul(f.z, c), mul(f.y, s)); }
    if (ax == 'y') { g.z = add(mul(f.z, c), mul(f.x, s)); g.x = sub(mul(f.x, c), mul(f.z, s)); }
    if (ax == 'z') { g.x = add(mul(f.x, c), mul(f.y, s)); g.y = sub(mul(f.y, c), mul(f.x, s)); }
    return g;
  };
  const moved = (f, o) => ({ o, x: f.x, y: f.y, z: f.z });
  const ik = (A, T, l1, l2, pole) => {
    const dir = norm(sub(T, A));
    const L = min(max(len(sub(T, A)), abs(l1 - l2) + .01), l1 + l2 - .01);
    const a = (l1 * l1 - l2 * l2 + L * L) / (2 * L);
    const h = sqrt(max(0, l1 * l1 - a * a));
    return [add(add(A, mul(dir, a)), mul(perp(pole, dir), h)), add(A, mul(dir, L))];
  };
  /* si la mano de un lado va cerrada (agarra algo) o abierta: fist false, las dos abiertas; { L: false }, solo esa */
  const isFist = (q, s) => q.fist !== false && !(q.fist && q.fist[s] === false);
  const limb = (A, E, side, front) => {
    const y = norm(sub(A, E)), z = perp(front, y);
    return { o: A, y, z, x: side == 'L' ? cross(y, z) : cross(z, y) };
  };

  /* ── el cuerpo, en las unidades del mapa (de frente: a la derecha de la imagen, la izquierda de la figura) ── */
  const SK = { sh: [53, 80], el: [39, 151], wr: [30, 212], hip: [80, 205], kn: [78, 294], an: [78, 378] }; // lado izquierdo de la imagen
  const LEN = { upper: 72.4, fore: 61.7, grip: 15, thigh: 89, shin: 84, ankle: 20 };
  const TRUNK_W = [[40, 13], [56, 22], [66, 42], [80, 47], [95, 45], [115, 43], [135, 38.5], [158, 36.5], [180, 38], [195, 41], [212, 41], [228, 34]];
  const TRUNK_D = [[40, 12], [56, 15], [66, 21], [80, 24], [95, 27], [115, 27], [135, 24], [158, 21.5], [180, 22], [195, 25], [212, 26], [228, 21]];
  /* r: el medio ancho del miembro en el mapa a cada distancia de la articulación; c: dónde cae su centro respecto al hueso. El
     brazo del mapa no está centrado en la línea del hombro al codo (queda casi todo hacia fuera): medido sobre el contorno del
     mapa, para que su borde de dentro y el de fuera caigan en los costados del brazo en 3D. Antes se medía desde el hueso y
     el dibujo de delante y el de detrás dejaban sin cubrir casi todo el lado de dentro del brazo, que con los brazos en
     alto se veía como una franja oscura. En el hombro (el deltoides) se mide como antes, desde el hueso, para que el
     deltoides anterior siga delante */
  const LIMB = {
    upper: { P: SK.sh, D: SK.el, r: [[-6, 10.5], [4, 12.5], [14, 12.1], [30, 7.8], [40, 7.2], [76, 7.2]], c: [[14, 0], [30, 5.7], [40, 4.8], [52, 3], [64, 1.1], [76, 0]], cap: 90, dr: 1 },
    fore: { P: SK.el, D: SK.wr, r: [[-8, 7.4], [8, 7.3], [30, 6.6], [52, 6], [64, 6]], c: [[-8, .5], [8, .4], [20, 1], [40, 1.2], [64, 1]], cap: 90, dr: .82 },
    thigh: { P: SK.hip, D: SK.kn, r: [[-6, 19], [8, 21.5], [40, 19.5], [70, 15], [92, 12.5]], dr: 1 },
    shin: { P: SK.kn, D: SK.an, r: [[-8, 13], [16, 16.5], [40, 14], [66, 9.5], [86, 7.5]], dr: .95 },
  };

  /* ── la forma en 3D, más estilizada que el mapa: hombros redondos, pecho con volumen, cintura y cadera más estrechas,
     glúteos atrás, brazos y piernas con su relieve. Cada músculo se coloca con el ancho del mapa (así conserva su sitio
     alrededor del cuerpo) y se apoya en esta forma. ── */
  // tronco: [altura en el mapa, medio ancho, medio fondo, cuánto se adelanta el centro]
  const TRUNK3 = [[56, 14, 12.6, -2.2], [62, 28, 17, -2.8], [70, 43, 22, -2], [79, 47.5, 25.5, -.5], [90, 47.5, 28.5, 2], [100, 47.5, 29.8, 3.6], [112, 47, 29, 3.2], [118, 46, 27.3, 2], [124, 43.5, 25, .3], [136, 37, 23, .3], [148, 32.5, 20.8, 0], [160, 31, 19.8, -.5], [172, 31.5, 20.2, -1], [186, 33, 21.8, -2.5], [198, 34, 24, -5], [206, 34, 25, -5.8], [213, 31.5, 24.5, -6.8], [219, 25.5, 22, -7], [224, 17, 17, -6], [228, 7, 10, -4]];
  const NECK3 = [[40, 11, 12.6, -1.6], [48, 11.4, 12.2, -.8], [56, 12.4, 12.4, -.6], [63, 13.8, 13, -1.2], [70, 16.5, 13.6, -2.2]];
  // brazos y piernas: [distancia desde la articulación de arriba, medio ancho, medio fondo, cuánto se adelanta el centro]
  const LIMB3 = {
    upper: [[-10, 10.5, 10.5, 0], [-3, 16, 15.5, 0], [6, 18, 16.5, .5], [16, 16, 14.5, .5], [27, 12.6, 12.5, .5], [38, 13.2, 15.2, 1.6], [50, 11.5, 13, 1], [60, 9, 9.5, .5], [68, 7.6, 7.8, 0], [76, 7.4, 7.4, 0]],
    fore: [[-8, 7.8, 7.4, 0], [3, 10.8, 9.3, .5], [13, 11, 9, .5], [25, 9.4, 7.5, .3], [38, 7.5, 6, 0], [50, 5.6, 4.6, 0], [60, 4.8, 3.9, 0]],
    thigh: [[-10, 12, 12, 0], [2, 17.5, 17, 0], [12, 19.2, 19, 1.1], [28, 19.2, 20, 2.4], [46, 17.6, 18.6, 2.8], [62, 15.5, 16.2, 2], [74, 13, 13.2, 1.2], [88, 10.5, 11, 0]],
    shin: [[-8, 10, 10.5, 0], [4, 11.5, 12, -1], [14, 15.2, 16.4, -4.2], [26, 14.6, 15.8, -4.2], [40, 11.4, 12.4, -2.4], [54, 8, 8.5, -.5], [70, 6.4, 7, 0], [84, 6.2, 6.6, 0]],
  };
  /* el ángulo de cada punto del dibujo alrededor del cuerpo: el del mapa visto de frente (asin) mezclado con uno que reparte
     el dibujo por igual, para que los costados no queden estirados cuando se miran de lado */
  const WRAP = .6;
  const wrapAngle = k => (1 - WRAP) * asin(clamp(k, -1, 1)) + WRAP * PI / 2 * clamp(k, -1, 1);
  const prof = (tab, v) => {
    if (v <= tab[0][0]) return tab[0].slice(1);
    for (let i = 1; i < tab.length; i++) if (v <= tab[i][0]) { const a = tab[i - 1], b = tab[i], k = (v - a[0]) / (b[0] - a[0]); return [1, 2, 3].map(j => a[j] + (b[j] - a[j]) * k); }
    return tab[tab.length - 1].slice(1);
  };

  /* la cintura se dobla poco a poco: entre estas dos alturas del mapa, cada punto (de la piel o de un músculo) va a medias
     con el tórax y con la pelvis. Antes cada uno iba entero con su hueso, y al inclinar el tronco el contorno hacía un
     escalón en la cintura y los lumbares (del tórax) se metían bajo los glúteos (de la pelvis) */
  const WAIST = [146, 176];
  const waist = my => { const t = clamp((my - WAIST[0]) / (WAIST[1] - WAIST[0]), 0, 1); return t * t * (3 - 2 * t); };

  /* ── el dibujo: cada trozo de cada músculo del mapa, en su hueso ── */
  const SEG = {
    F: { PS: 'thorax', PI: 'thorax', SA: 'thorax', DA2: 'thorax', TS: 'thorax', AB: 'trunk', OB: 'trunk', FC: 'pelvis', NK: 'neck', DA: 'upper', DL: 'upper', BI: 'upper', BR: 'upper', TR: 'upper', BQ: 'fore', AN: 'fore', CU: 'thigh', AD: 'thigh', KN: 'shin', TA: 'shin', GE: 'shin', SO: 'shin' },
    B: { DA: 'thorax', TS: 'thorax', TM1: 'thorax', RO: 'thorax', TM2: 'thorax', IN: 'thorax', RM: 'thorax', ER: 'trunk', GM: 'pelvis', GL: 'pelvis', DP: 'upper', TR: 'upper', AN: 'fore', BQ: 'fore', IS: 'thigh', AD: 'thigh', GE: 'shin', SO: 'shin' },
  };
  const ORIGIN = { thorax: 160, pelvis: 205, head: 27, neck: 60 };
  // un trazado del mapa (solo M, C y Z) en polilíneas, una por trozo
  const pieces = d => {
    const out = [];
    const tok = d.match(/[MCZ]|-?\d*\.?\d+/g);
    let i = 0, cur = null, p0 = null;
    const num = () => +tok[i++];
    while (i < tok.length) {
      const c = tok[i++];
      if (c == 'M') { cur = [[num(), num()]]; p0 = cur[0]; out.push(cur); }
      else if (c == 'C') {
        const a = cur[cur.length - 1], b = [num(), num()], e = [num(), num()], f = [num(), num()];
        for (let k = 1; k <= 3; k++) { const t = k / 3, u = 1 - t; cur.push([u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * e[0] + t * t * t * f[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * e[1] + t * t * t * f[1]]); }
      } else if (c == 'Z') { cur = null; }
    }
    return out;
  };
  const MAP = G.FIG_MAP, REG = G.FIG_REG, GROW = 1.07;
  const PARTS = [];
  /* la base del cuello en el mapa: por encima, el trapecio de detrás se coloca sobre el propio cuello; el de delante se corta
     ahí (en el costado del cuello duplicaba al de detrás y dejaba unas puntas finas junto al esternocleidomastoideo) */
  const NECK_BASE = 57;
  /* el orden de capas es el de la app, salvo los lumbares, que van encima de los glúteos: así acaban entre los dos, sobre el
     sacro, como de verdad (en la app, el glúteo tapa su punta) y no desaparecen al agacharse; y el serrato, encima de los
     oblicuos (los oblicuos llegan ahora hasta el costado y tapaban su última digitación) */
  const LAYER3 = { B: { ER: 3.5 }, F: { SA: 4.5 } };
  const clipBelow = (pts, y0) => {
    const out = [];
    pts.forEach((a, i) => {
      const b = pts[(i + 1) % pts.length], ia = a[1] >= y0, ib = b[1] >= y0;
      if (ia) out.push(a);
      if (ia != ib) { const t = (y0 - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, y0]); }
    });
    return out;
  };
  ['F', 'B'].forEach(view => {
    Object.keys(SEG[view]).forEach(region => {
      pieces(MAP.R[view][region]).forEach(pts => {
        if (view == 'F' && region == 'TS') pts = clipBelow(pts, NECK_BASE);
        const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
        /* cada músculo, un poco más grande desde su centro: entre músculo y músculo, y hasta el borde del cuerpo, queda menos
           cuerpo oscuro (en el mapa ese margen es la silueta de frente; en 3D se veía como franjas oscuras) */
        pts = pts.map(([x, y]) => [cx + (x - cx) * GROW, cy + (y - cy) * GROW]);
        let seg = SEG[view][region];
        if (seg == 'trunk') seg = cy < 158 ? 'thorax' : 'pelvis';
        const left = cx < 100; // a la izquierda de la imagen
        const side = seg == 'thorax' || seg == 'pelvis' || seg == 'head' || seg == 'neck' ? 'C' : (view == 'F') == left ? 'R' : 'L';
        const hemi = view == 'F' ? 1 : -1;
        const pa = MAP.PA[region] || 35;
        const dir = [-sin(RAD(pa)), cos(RAD(pa))];
        // en coordenadas del hueso: a lo largo (s) y hacia fuera (u); en el tronco y la cabeza, altura y lado
        let loc;
        if (side == 'C') {
          const o = ORIGIN[seg];
          loc = p => [view == 'F' ? p[0] - 100 : 100 - p[0], o - p[1], p[1]];
        } else {
          const L = LIMB[seg], P = left ? L.P : [200 - L.P[0], L.P[1]], D = left ? L.D : [200 - L.D[0], L.D[1]];
          const ax = norm([D[0] - P[0], D[1] - P[1], 0]);
          let n = [-ax[1], ax[0]];
          if ((n[0] < 0) != left) n = [-n[0], -n[1]];
          loc = p => [(p[0] - P[0]) * n[0] + (p[1] - P[1]) * n[1], (p[0] - P[0]) * ax[0] + (p[1] - P[1]) * ax[1]];
        }
        PARTS.push({ view, region, seg, side, hemi, pa, layer: (LAYER3[view] || {})[region] ?? Object.keys(MAP.R[view]).indexOf(region), pts: pts.map(loc), hatch: [loc([cx, cy]), loc([cx + dir[0] * 4, cy + dir[1] * 4])] });
      });
    });
  });

  /* ── músculos dibujados directamente en 3D, donde el mapa (pensado para verse de frente y de espaldas) se queda corto.
     Cada uno se da sobre su hueso: [ángulo alrededor en grados (0 delante, 90 hacia fuera o hacia la izquierda de la
     figura), posición a lo largo]. En el cuello, la posición es la altura sobre su base; en el muslo, la distancia desde
     la cadera. Sustituyen a las piezas del mapa que hacen lo mismo (NK y CU), y CU sigue siendo lo que se resalta con
     'cu'. ── */
  const curve = pts => {
    // una curva cerrada suave que pasa por los puntos dados (Catmull-Rom), muestreada a tramos cortos
    const out = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      for (let k = 0; k < 3; k++) {
        const t = k / 3, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    return out;
  };
  const RAW = [
    /* el esternocleidomastoideo: de detrás de la oreja baja en diagonal al esternón, con su cabeza de la clavícula. Una
       banda de ancho parejo (antes se afinaba en punta hacia arriba), con su inserción ancha bajo el cráneo */
    { seg: 'neck', region: 'NK', pts: [[82, 17.8], [93, 18.2], [104, 17.2], [111, 15.3], [104, 12.5], [92, 9], [80, 5.5], [67, 2], [56, -1], [48, -4], [44, -7], [35, -7.5], [28, -6], [24, -3.5], [19, -6], [12, -7.5], [5, -7], [2, -4.5], [7, -1], [18, 3.5], [33, 8], [49, 12], [64, 15], [74, 16.8]], fib: [[74, 12], [56, 6]] },
    /* los cuádriceps: el vasto externo por fuera, el recto femoral en medio y el vasto interno, en gota, encima de la
       rodilla por dentro; sus tendones se juntan sobre la rótula */
    { seg: 'thigh', region: 'CU', pts: [[42, 7], [64, 4], [86, 10], [101, 24], [107, 40], [104, 55], [95, 67], [79, 77], [57, 83], [40, 85], [29, 80], [25, 67], [25, 50], [29, 33], [34, 18]], fib: [[66, 40], [62, 46]] },
    { seg: 'thigh', region: 'CU', pts: [[-5, 3], [6, 3], [14, 11], [20, 25], [22, 42], [19, 58], [13, 70], [5, 78], [-1, 80], [-7, 78], [-14, 69], [-19, 57], [-21, 42], [-19, 25], [-13, 11]], fib: [[0, 40], [0, 46]] },
    { seg: 'thigh', region: 'CU', pts: [[-23, 50], [-35, 49], [-50, 54], [-64, 62], [-73, 72], [-72, 81], [-62, 87], [-46, 89.5], [-30, 88], [-20, 84], [-16, 75], [-18, 62]], fib: [[-46, 66], [-40, 71]] },
  ];
  const RAW_REGIONS = new Set(RAW.map(r => r.region));
  for (let i = PARTS.length - 1; i >= 0; i--) if (PARTS[i].view == 'F' && RAW_REGIONS.has(PARTS[i].region)) PARTS.splice(i, 1);
  RAW.forEach(r => {
    const sides = r.seg == 'neck' ? [['C', 1], ['C', -1]] : [['L', 1], ['R', 1]];
    sides.forEach(([side, k]) => PARTS.push({ view: 'F', region: r.region, seg: r.seg, side, hemi: 1, pa: 0, layer: 99, raw: true,
      pts: curve(r.pts).map(([a, b]) => [k * a, b]), hatch: r.fib.map(([a, b]) => [k * a, b]) }));
  });

  /* un punto del dibujo, sobre su hueso: el ángulo alrededor del eje (0 delante, 90° hacia fuera o hacia la izquierda de la
     figura, 180° detrás), su radio y su altura */
  /* los músculos envuelven algo más su segmento hacia los costados, para que entre los de delante y los de detrás no quede
     tanto cuerpo a la vista (el mapa deja margen hasta la silueta, y en 3D ese margen se veía de lado como una franja
     oscura). Lo del centro casi no se mueve */
  const spread = (th, e, cap = 96) => Math.sign(th) * min(abs(th) * e, RAD(cap));
  /* y lo de delante y lo de detrás se encuentran en el costado: lo que se acerca a él (a menos de SIDE) se lleva hasta él, tanto
     más cuanto más cerca, y lo que se pasaba se queda justo en él. Entre los músculos de delante y los de detrás ya no queda
     una franja de cuerpo oscuro a lo largo del costado, ni se montan unos sobre otros (al girar se turnaban de golpe) */
  const SIDE = RAD(30);
  const toSide = th => {
    const e = PI / 2 - abs(th);
    if (e >= SIDE) return th;
    if (e <= 0) return Math.sign(th) * PI / 2;
    const s = e / SIDE;
    return Math.sign(th) * (PI / 2 - SIDE * s * s * s * (3 - 2 * s));
  };
  const surf = (part, q) => {
    if (part.side == 'C') {
      const [xl, yUp, my] = q;
      if (part.seg == 'neck') {
        const th = wrapAngle(xl / 11);
        const [w, d, zc] = prof(NECK3, my);
        return [part.hemi > 0 ? th : PI - th, w, d, yUp, zc];
      }
      let th = spread(wrapAngle(xl / lerpTab(TRUNK_W, my)), 1.07), y = yUp, m = my;
      /* el glúteo, más envolvente: rodea algo más la cadera por fuera y baja hasta el pliegue con el muslo (antes quedaba
         una franja oscura de cuerpo a su lado y debajo) */
      if (part.hemi < 0 && (part.region == 'GL' || part.region == 'GM')) {
        th = clamp(th * 1.06, -RAD(100), RAD(100));
        if (part.region == 'GL' && my > 212) { m = my + (my - 212) * .22; y = yUp - (m - my); }
      }
      th = toSide(th);
      const [w, d, zc] = prof(TRUNK3, m);
      return [part.hemi > 0 ? th : PI - th, w, d, y, zc];
    }
    let [u, s] = q;
    /* en brazos y piernas, sin pasar de 92°: lo de delante y lo de detrás apenas se solapan en el costado (si se solapan
       mucho, al girar el miembro unos tapan a otros de golpe, como el cuádriceps y los isquiotibiales en la sentadilla) */
    const L = LIMB[part.seg];
    const th = toSide(spread(wrapAngle((u - (L.c ? lerpTab(L.c, s) : 0)) / lerpTab(L.r, s)), 1.12, L.cap || 92));
    // los isquiotibiales empiezan justo bajo el glúteo (en el mapa, un poco más abajo, y en 3D quedaba piel entre los dos)
    if (part.region == 'IS') s -= 10 * clamp((38 - s) / 24, 0, 1);
    const [w, d, zc] = prof(LIMB3[part.seg], s);
    return [part.hemi > 0 ? th : PI - th, w, d, -s, zc];
  };

  /* la cabeza, sin rasgos pero con su forma: el cráneo redondo, la cara debajo de su mitad de delante (frente y pómulos), la
     mandíbula que se estrecha hacia la barbilla y el ángulo de la mandíbula bajo la oreja (elipsoides en el marco de la
     cabeza: [centro, radios]; x hacia la izquierda de la figura, y arriba, z delante). Se envuelven de dos en dos
     (HEAD_PAIRS): así, debajo de la mandíbula y de la barbilla queda el entrante del cuello, en lugar de un huevo. El cuello
     sube algo inclinado hacia delante, como la columna cervical, y la cabeza se endereza encima */
  const HEAD3 = [
    [[0, 7, -1.5], [15, 16.5, 17.5]],    // cráneo
    [[0, -5, 6], [13.2, 9.5, 10]],       // cara: frente y pómulos
    [[0, -14, 4.5], [11, 6, 9.8]],       // mandíbula
    [[0, -19.5, 9.5], [5.5, 3.8, 4.8]],  // barbilla
    [[0, -5, -10], [12, 9, 9]],          // nuca: la base del cráneo, donde entra el cuello por detrás
  ];
  // la mandíbula va con la cara, no con el cráneo ni con la nuca: entre su ángulo y la nuca queda el entrante del cuello, bajo la oreja
  const HEAD_PAIRS = [[0, 1], [1, 2], [2, 3], [1, 3], [0, 4]];
  const NECK_TILT = 10, HEAD_AT = [0, 33, 2];
  /* dónde entra el cuello en la cabeza: para cada ángulo alrededor del cuello (cada 5°, de delante a detrás), la altura a la
     que su superficie se mete en la nuca, la mandíbula o el cráneo. Lo que se dibuja en el cuello acaba ahí, justo debajo
     del cráneo, en lugar de subir y pintarse encima de la cabeza */
  const HEAD_LINE = (() => {
    const c = cos(RAD(NECK_TILT)), sn = sin(RAD(NECK_TILT));
    const inside = p => {
      const d = sub(p, HEAD_AT), h = [d[0], d[1] * c - d[2] * sn, d[1] * sn + d[2] * c];
      return HEAD3.some(([o, r]) => ((h[0] - o[0]) / r[0]) ** 2 + ((h[1] - o[1]) / r[1]) ** 2 + ((h[2] - o[2]) / r[2]) ** 2 <= 1);
    };
    const tab = [];
    for (let a = 0; a <= 180; a += 5) {
      let y = 0;
      while (y < 36) { const [w, d, zc] = prof(NECK3, 60 - y); if (inside([w * sin(RAD(a)), y, zc + d * cos(RAD(a))])) break; y += .25; }
      tab.push(y);
    }
    return tab;
  })();
  const headLine = th => {
    const a = abs(atan2(sin(th), cos(th))) / RAD(5), i = min(35, Math.floor(a)), f = a - i;
    return HEAD_LINE[i] + (HEAD_LINE[i + 1] - HEAD_LINE[i]) * f;
  };

  /* cada punto del dibujo, colocado una vez: su sitio en el hueso y lo que hace falta para saber si mira a la cámara */
  // un punto dado ya en el cuello: [ángulo en grados, altura sobre la base del cuello]
  const onNeck = q => { const [w, d, zc] = prof(NECK3, 60 - q[1]); return [RAD(q[0]), w, d, q[1], zc]; };
  /* los cuádriceps dibujados en 3D: por detrás del costado del muslo (más de 92°) se recogen, para no montarse sobre los
     isquiotibiales (al girar la pierna se turnaban de golpe) */
  const onLimb = (seg, q) => {
    const [w, d, zc] = prof(LIMB3[seg], q[1]);
    let a = abs(q[0]);
    if (seg == 'thigh' && a > 92) a = 92 + (a - 92) * .35;
    return [toSide(RAD(Math.sign(q[0]) * a)), w, d, -q[1], zc];
  };
  /* el trapecio alto sube por detrás del cuello hasta la base del cráneo: los puntos del dibujo de espaldas que quedan por
     encima de la base del cuello se colocan sobre el cuello, que se inclina con su propio marco (antes el tronco subía hasta
     media altura del cuello sin inclinarse con él, y por detrás asomaba un pico). El mapa lo estrecha en punta, porque de
     espaldas el cuello es estrecho; en el cuello se abre alrededor de la nuca, más cuanto más arriba */
  const onNeckFromMap = (part, q) => {
    const [xl, , my] = q;
    const [w, d, zc] = prof(NECK3, my), k = xl / lerpTab(TRUNK_W, my);
    const spread = lerpTab([[38, .3], [46, .58], [57, .94]], my);
    return [PI - wrapAngle(clamp(k / spread, -1, 1)), w, d, 60 - my, zc];
  };
  const placed = (part, q) => {
    const neck = part.side == 'C' && part.seg == 'thorax' && !part.raw && part.hemi < 0 && q[2] < NECK_BASE;
    let [th, w, d, y, zc] = part.raw ? (part.seg == 'neck' ? onNeck(q) : onLimb(part.seg, q)) : neck ? onNeckFromMap(part, q) : surf(part, q);
    // en el cuello, nada pasa de la base del cráneo
    let top = false;
    if (neck || part.seg == 'neck') { const h = headLine(th) - .3; if (y > h) { y = h; top = true; } }
    const sn = sin(th), cs = cos(th);
    // en la cintura, lo que tira hacia la pelvis (0, todo con el tórax; 1, todo con la pelvis)
    const bw = part.side == 'C' && !neck && !part.raw && (part.seg == 'thorax' || part.seg == 'pelvis') ? waist((part.seg == 'thorax' ? 160 : 205) - y) : null;
    return { th, w, d, y, zc, neck, top, bw, lx: w * sn, lz: zc + d * cs, nx: sn / w, nz: cs / d };
  };
  /* cada trozo, con menos puntos: los que casi no se apartan de la recta entre sus vecinos (menos de una décima de unidad del
     mapa) sobran. En pantalla no se nota, y cada fotograma hace y escribe bastante menos */
  const thinOut = pts => {
    for (let pass = 0; pass < 3 && pts.length > 8; pass++) {
      const n = pts.length, out = [];
      let dropped = false;
      for (let i = 0; i < n; i++) {
        const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
        const dx = c[0] - a[0], dy = c[1] - a[1], L = hypot(dx, dy) || 1;
        if (!dropped && abs((b[0] - a[0]) * dy - (b[1] - a[1]) * dx) / L < .1 && out.length + (n - i) > 8) { dropped = true; continue; }
        dropped = false;
        out.push(b);
      }
      if (out.length == n) break;
      pts = out;
    }
    return pts;
  };
  PARTS.forEach(p => { p.pts = thinOut(p.pts); p.sf = p.pts.map(q => placed(p, q)); p.hsf = p.hatch.map(q => placed(p, q)); });

  // el perfil de cada segmento a una altura de su marco: [medio ancho, medio fondo, centro]
  const profAt = (seg, y) => seg == 'neck' ? prof(NECK3, 60 - y) : seg == 'thorax' ? prof(TRUNK3, 160 - y) : seg == 'pelvis' ? prof(TRUNK3, 205 - y) : prof(LIMB3[seg], -y);

  /* ── la postura ── */
  const pose = q => {
    let pelvis = { o: q.root, x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
    pelvis = turn(turn(pelvis, 'y', q.yaw || 0), 'x', q.tilt || 0);
    const thorax = turn(moved(pelvis, at(pelvis, [0, 45, -2])), 'x', q.spine || 0);
    const neck = turn(moved(thorax, at(thorax, [0, 100, -4])), 'x', (q.neck || 0) + NECK_TILT);
    const head = turn(moved(neck, at(neck, HEAD_AT)), 'x', -NECK_TILT);
    const F = { pelvis, thorax, neck, head };
    const J = {};
    ['L', 'R'].forEach((s, i) => {
      const k = i ? -1 : 1;
      const hip = at(pelvis, [k * 20, 0, 0]);
      const fo = q.feet[s];
      const ankle = [k * fo[0], LEN.ankle + (fo[3] || 0), fo[1]];
      const kp = (q.knee[s] || [0, 0, 1]).map((v, j) => j ? v : v * k);
      const knee = ik(hip, ankle, LEN.thigh, LEN.shin, kp);
      /* delante de la pierna (cuádriceps, rótula, tibial): hacia donde sale la rodilla, y con la pierna casi recta, hacia
         donde apunta. Se mezclan poco a poco: antes salía solo de adonde apunta la rodilla, y con el muslo horizontal (abajo
         en la sentadilla) el frente del muslo se daba la vuelta y los cuádriceps acababan mirando al suelo */
      const lax = norm(sub(knee[1], hip));
      const kb = sub(knee[0], add(hip, mul(lax, dot(sub(knee[0], hip), lax))));
      const wl = clamp(len(kb) / 8, 0, 1);
      const legFront = norm(add(mul(norm(kb), wl), mul(perp(kp, lax), 1 - wl)));
      F['thigh' + s] = limb(hip, knee[0], s, legFront);
      F['shin' + s] = limb(knee[0], knee[1], s, legFront);
      const toe = RAD(fo[2] || 0) * k;
      const fz = [sin(toe), 0, cos(toe)];
      F['foot' + s] = { o: knee[1], y: [0, 1, 0], z: fz, x: s == 'L' ? cross([0, 1, 0], fz) : cross(fz, [0, 1, 0]) };
      // la punta del pie hacia abajo (en el aire, de puntillas): fo[4] grados
      if (fo[4]) F['foot' + s] = turn(F['foot' + s], 'x', fo[4]);
      const sh = at(thorax, [k * 47, 80 + (q.shrug || 0), -2 + (q.reach || 0)]);
      const ep = (q.elbow[s] || [0, -1, -1]).map((v, j) => j ? v : v * k);
      /* la muñeca doblada (handDir: de la muñeca al puño): el brazo llega a la muñeca y el puño sale de ella en esa dirección;
         si no, el puño sigue la línea del antebrazo */
      const hd = q.handDir && q.handDir[s] ? norm(q.handDir[s]) : null;
      const el = hd ? ik(sh, sub(q.hands[s], mul(hd, LEN.grip)), LEN.upper, LEN.fore, ep) : ik(sh, q.hands[s], LEN.upper, LEN.fore + LEN.grip, ep);
      const fistC = hd ? add(el[1], mul(hd, LEN.grip)) : el[1];
      // delante del brazo, el bíceps: hacia donde se dobla el codo (o, con el brazo estirado, lo contrario de adonde apunta el codo)
      const axis = norm(sub(el[1], sh));
      const bend = sub(el[0], add(sh, mul(axis, dot(sub(el[0], sh), axis))));
      // mezclado poco a poco (antes cambiaba de golpe al estirar el brazo)
      const wa = clamp(len(bend) / 6, 0, 1);
      const front = norm(add(mul(norm(mul(bend, -1)), wa), mul(perp(mul(ep, -1), axis), 1 - wa)));
      F['upper' + s] = limb(sh, el[0], s, front);
      // hacia dónde va lo que agarra la mano (una barra, un asa): el mismo para las dos, o uno por lado
      const bd = q.barDir ? (Array.isArray(q.barDir) ? q.barDir : q.barDir[s]) : [1, 0, 0];
      const gy = hd ? mul(hd, -1) : norm(sub(el[0], el[1])), gx = perp(bd, gy);
      F['grip' + s] = { o: fistC, y: gy, x: gx, z: cross(gx, gy) };
      /* delante del antebrazo (los flexores): hacia la palma. Con la barra en la mano, la palma mira al lado contrario de los
         nudillos; antes salía del frente del brazo, que con el codo doblado en ángulo recto apunta a lo largo del antebrazo y
         lo dejaba girar sin control */
      const foreFront = !isFist(q, s) ? (q.palm && q.palm[s] ? q.palm[s].map((v, j) => j ? v : v * k) : F['upper' + s].z) : mul(F['grip' + s].z, -1);
      F['fore' + s] = limb(el[0], el[1], s, foreFront);
      F['hand' + s] = moved(F['fore' + s], at(F['fore' + s], [0, -LEN.fore, 0]));
      J[s] = { hip, knee: knee[0], ankle: knee[1], sh, el: el[0], fist: fistC };
    });
    return { F, J };
  };

  /* ── la cámara ── */
  const camera = (yaw, pitch) => {
    const c0 = [sin(RAD(yaw)), 0, cos(RAD(yaw))], r = [cos(RAD(yaw)), 0, -sin(RAD(yaw))];
    const c = add(mul(c0, cos(RAD(pitch))), [0, sin(RAD(pitch)), 0]);
    const u = add(mul(c0, -sin(RAD(pitch))), [0, cos(RAD(pitch)), 0]);
    return { c, r, u, P: p => [dot(p, r), -dot(p, u), dot(p, c)] };
  };
  /* un número en décimas (entero) como texto, sin pasar por la coma flotante: escribir los trazados era lo que más tiempo
     se llevaba de cada fotograma */
  const DEC = ['', '.1', '.2', '.3', '.4', '.5', '.6', '.7', '.8', '.9'];
  const tenth = v => { if (v < 0) { const a = -v, q = (a / 10) | 0; return '-' + q + DEC[a - q * 10]; } const q = (v / 10) | 0; return q + DEC[v - q * 10]; };
  const f1 = v => tenth(round(v * 10));
  /* la envolvente convexa (cadena monótona). Los puntos se ordenan por una clave numérica (x, luego y, luego su sitio) en una
     tabla de números, que el navegador ordena mucho más deprisa que una lista con una función de comparar */
  const HK = new Float64Array(1024);
  const crs = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const hull = pts => {
    const n = pts.length, keys = n <= 1024 ? HK.subarray(0, n) : new Float64Array(n), M = n <= 1024 ? 1024 : n;
    for (let i = 0; i < n; i++) { const p = pts[i]; keys[i] = (round((p[0] + 3000) * 100) * 1e6 + round((p[1] + 3000) * 100)) * M + i; }
    keys.sort();
    const lo = [], up = [];
    for (let i = 0; i < n; i++) { const p = pts[keys[i] % M]; while (lo.length >= 2 && crs(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = n - 1; i >= 0; i--) { const p = pts[keys[i] % M]; while (up.length >= 2 && crs(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    lo.pop(); up.pop();
    return lo.concat(up);
  };
  const smooth = h => {
    const n = h.length;
    if (n < 3) return '';
    const mid = i => [(h[i % n][0] + h[(i + 1) % n][0]) / 2, (h[i % n][1] + h[(i + 1) % n][1]) / 2];
    let d = 'M' + f1(mid(0)[0]) + ' ' + f1(mid(0)[1]);
    for (let i = 1; i <= n; i++) { const c = h[i % n], m = mid(i); d += 'Q' + f1(c[0]) + ' ' + f1(c[1]) + ' ' + f1(m[0]) + ' ' + f1(m[1]); }
    return d + 'Z';
  };
  const line = pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
  /* lo mismo que smooth, con coordenadas relativas y redondeadas a la décima: el dibujo de cada fotograma ocupa bastante
     menos y el navegador lo lee antes */
  const smoothR = h => {
    const n = h.length;
    if (n < 3) return '';
    // en décimas enteras: sumar y restar enteros no deja restos de coma flotante
    const X = new Array(n), Y = new Array(n);
    for (let i = 0; i < n; i++) { X[i] = round(h[i][0] * 10); Y[i] = round(h[i][1] * 10); }
    const num = v => v < 0 ? tenth(v) : ' ' + tenth(v);
    let x = round((X[0] + X[1 % n]) / 2), y = round((Y[0] + Y[1 % n]) / 2), d = 'M' + tenth(x) + num(y) + 'q';
    for (let i = 1; i <= n; i++) {
      const j = i % n, k = (i + 1) % n, mx = round((X[j] + X[k]) / 2), my = round((Y[j] + Y[k]) / 2);
      d += (i > 1 ? num(X[j] - x) : tenth(X[j] - x)) + num(Y[j] - y) + num(mx - x) + num(my - y);
      x = mx; y = my;
    }
    return d + 'z';
  };

  const STYLE = {
    skin: ['#2a2e42', ' stroke="#646b8f" stroke-opacity=".6" stroke-width=".9" stroke-linejoin="round"'],
    rest: ['Ne', '#05060a'], main: ['Rd', '#240307'], second: ['Or', '#331603'],
  };
  /* la luz llega de arriba a la izquierda y algo por delante, como en el dibujo de ahora, sea cual sea el giro */
  const LIGHT = norm([-.45, .6, .66]);
  /* cada color, en cinco tonos según le dé la luz; el degradado tiene su brillo arriba a la izquierda y se oscurece hacia el
     borde contrario, para que cada músculo se vea abombado. Rojo y naranja varían menos, para que se sigan leyendo. */
  const LEVELS = 13, span = (a, b) => Array.from({ length: LEVELS }, (_, i) => a + (b - a) * i / (LEVELS - 1));
  const SHADES = { Ne: span(.46, 1.3), Rd: span(.93, 1.12), Or: span(.93, 1.12) };
  const BASE = { Ne: ['#747ca2', '#4c5374', '#2d3147', '#1b1d30'], Rd: ['#ff958a', '#ee3446', '#bd1a31', '#86101f'], Or: ['#ffe5ad', '#f9a83f', '#dc7d1c', '#ab560b'] };
  const tint = (hex, k) => '#' + [1, 3, 5].map(i => min(255, round(parseInt(hex.slice(i, i + 2), 16) * k)).toString(16).padStart(2, '0')).join('');
  const DEFS = (() => {
    let h = '';
    Object.keys(SHADES).forEach(c => SHADES[c].forEach((k, i) => {
      const [a, b, d, e] = BASE[c].map(x => tint(x, k));
      h += `<radialGradient id="g3${c}${i}" cx=".5" cy=".5" r=".66" fx=".3" fy=".24"><stop offset="0" stop-color="${tint(a, 1.22)}"/><stop offset=".16" stop-color="${a}"/><stop offset=".5" stop-color="${b}"/><stop offset=".84" stop-color="${d}"/><stop offset="1" stop-color="${e}"/></radialGradient>`;
    }));
    h += '<radialGradient id="g3Sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".6" stop-color="#000" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>';
    /* la piel: un degradado de través en cada pieza, del lado de la luz al de la sombra, en 32 direcciones */
    for (let i = 0; i < 32; i++) {
      const a = i / 32 * 2 * PI, x = cos(a) / 2, y = sin(a) / 2, xy = `x1="${(.5 - x).toFixed(3)}" y1="${(.5 - y).toFixed(3)}" x2="${(.5 + x).toFixed(3)}" y2="${(.5 + y).toFixed(3)}"`;
      h += `<linearGradient id="g3Sn${i}" ${xy}><stop offset="0" stop-color="#363c5a"/><stop offset=".45" stop-color="#252940"/><stop offset="1" stop-color="#13141f"/></linearGradient>`;
    }
    /* el rayado de las fibras: líneas en vertical; cada músculo lo gira y lo coloca en su sitio, así va pegado a él */
    h += `<pattern id="h3" width="3.4" height="4" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="4" stroke="#000" stroke-opacity=".33" stroke-width=".55"/></pattern>`;
    return h;
  })();

  /* un brazo o una pierna, con los dos extremos redondeados */
  /* un brazo o una pierna, con los extremos redondos: el perfil, cortado si hace falta en la articulación (from, to: distancia
     desde la articulación de arriba), y en cada extremo medio elipsoide de radio el del perfil allí. Los dos huesos de un codo
     o de una rodilla acaban en el centro de la articulación con la misma bola, así que, doblados, la unión es redonda (antes
     cada uno se pasaba de la articulación en punta y el codo y la rodilla quedaban con bultos y picos) */
  const DOME = [[.5, .87], [.82, .57], [.97, .25]];
  const capped = (tab, from, to, f0 = .95, f1 = .95) => {
    let rows = tab;
    if (from != null) rows = [[from, ...prof(tab, from)], ...rows.filter(r => r[0] > from + .5)];
    if (to != null) rows = [...rows.filter(r => r[0] < to - .5), [to, ...prof(tab, to)]];
    const rs = rows.map(([s, w, d, zc]) => [-s, w, d, zc]);
    const [y0, w0, d0, c0] = rs[0], [y1, w1, d1, c1] = rs[rs.length - 1];
    const L0 = min(w0, d0) * f0, L1 = min(w1, d1) * f1;
    return [...DOME.slice().reverse().map(([a, r]) => [y0 + L0 * a, w0 * r, d0 * r, c0]), ...rs, ...DOME.map(([a, r]) => [y1 - L1 * a, w1 * r, d1 * r, c1])];
  };
  /* los anillos de la silueta de un segmento: [altura, radio a lo ancho, radio a lo hondo] */
  const RINGS = {
    // el tronco, de la base del cuello a la entrepierna, de una pieza: en la cintura, cada anillo va a medias con los dos huesos
    trunk: () => [...new Set([...TRUNK3.map(r => r[0]), 150, 155, 160, 165, 170])].sort((a, b) => a - b).map(my => [160 - my, ...prof(TRUNK3, my), waist(my)]),
    neck: () => NECK3.map(([my, w, d, zc]) => [60 - my, w, d, zc]),
    upper: () => capped(LIMB3.upper, null, LEN.upper),
    fore: () => capped(LIMB3.fore, 0, null),
    thigh: () => capped(LIMB3.thigh, -4, LEN.thigh, .5),
    shin: () => capped(LIMB3.shin, 0, null),
  };
  /* elipsoides de silueta: [centro, radios] en el marco del segmento; los de una misma pieza se envuelven juntos. La cabeza,
     con el cráneo, la cara y la barbilla; el pie, como una zapatilla (talón, empeine, planta y punta); el puño, cerrado
     sobre la barra (su marco: el centro en la barra, y hacia la muñeca, a lo largo de la barra y hacia los nudillos) */
  const BLOBS = {
    hand: [[[0, -9, 1], [5.5, 8, 6.5]], [[0, -19, 2], [4.8, 6, 5.5]]],
    foot: [[[0, -12, -5], [6.5, 7.5, 6.5]], [[0, -3, 0], [6.5, 7, 7]], [[0, -11, 10], [8, 7.5, 9]], [[0, -15, 25], [9, 4.8, 8]], [[0, -16.5, 35], [7.5, 3.4, 6]]],
    fist: [[[0, 3, 0], [8.5, 8, 6.5]], [[-6.5, -5, 2.5], [3.6, 3.6, 3.6]], [[-2.2, -5.5, 2.8], [3.6, 3.6, 3.6]], [[2.2, -5.5, 2.8], [3.6, 3.6, 3.6]], [[6.5, -5, 2.5], [3.6, 3.6, 3.6]], [[0, -3, -4.5], [7, 3.6, 3.4]], [[0, 12, 0], [5.5, 4, 4.5]]],
  };

  /* el marco de la cintura a una altura: a medias (w, de 0 a 1) entre el del tórax y el de la pelvis, con las alturas del hueso
     de la pieza (el tórax empieza 45 más arriba que la pelvis) */
  const blendF = (F, w, key) => {
    const T = F.thorax, P = F.pelvis;
    const oT = key == 'pelvis' ? sub(T.o, mul(T.y, 45)) : T.o, oP = key == 'pelvis' ? P.o : add(P.o, mul(P.y, 45));
    return { o: mix(oT, oP, w), x: mix(T.x, P.x, w), y: mix(T.y, P.y, w), z: mix(T.z, P.z, w) };
  };
  // los ejes de un marco, proyectados: un punto local [a, b, c] cae en o + a·x + b·y + c·z
  const axes = (f, cam) => ({ o: cam.P(f.o), x: cam.P(f.x), y: cam.P(f.y), z: cam.P(f.z) });  // la proyección es lineal: los ejes se proyectan tal cual
  const onto = (A, a, b, c) => [A.o[0] + a * A.x[0] + b * A.y[0] + c * A.z[0], A.o[1] + a * A.x[1] + b * A.y[1] + c * A.z[1], A.o[2] + a * A.x[2] + b * A.y[2] + c * A.z[2]];
  const RING_N = 14, RING_SC = Array.from({ length: RING_N }, (_, i) => [sin(i / RING_N * 2 * PI), cos(i / RING_N * 2 * PI)]);
  const RINGS_PRE = Object.fromEntries(Object.keys(RINGS).map(k => [k, RINGS[k]()]));
  /* el puño, cerrado sobre la barra (en el marco del agarre: x a lo largo de la barra, y hacia la muñeca, z = x × y; la barra
     pasa por el centro). El dorso y la palma con la muñeca; los cuatro dedos, cada uno del nudillo (detrás y por encima de
     la barra) al dedo doblado por delante de ella; y el pulgar, que sale de la base de la palma, rodea la barra por el otro
     lado y cruza por delante de los dedos. Hecho para la mano derecha: en la izquierda, x cambia de signo (el pulgar queda
     siempre hacia el centro del cuerpo) */
  const FIST = {
    // la palma y el dorso, con la base del pulgar (la eminencia tenar), y la muñeca
    body: [[[0, 4.2, .6], [7.6, 6, 4.6]], [[5.4, 4.8, -2.4], [3.2, 4, 3]], [[0, 11.8, .4], [5, 3.8, 4.1]]],
    /* cada dedo: la falange de arriba, del nudillo por encima de la barra, y la del medio, que baja por delante; el
       corazón, algo más largo y el meñique, más corto. Los cuatro se pintan juntos, como una banda que rodea la barra, con
       una raya fina entre dedo y dedo */
    fingers: [[5.6, 2.05, 0], [1.85, 2.15, .5], [-1.9, 2, .2], [-5.4, 1.75, -.6]].map(([x, rx, l]) => [[[x, -4.4 - l * .4, 1.2], [rx, 2.6, 3.4]], [[x, -1.6 + l * .3, -4.6 - l * .3], [rx * .94, 2.9 + l * .4, 2.1]]]),
    // por dónde van las rayas entre los dedos (x) y el camino de cada una alrededor de la barra ([z, y]: del nudillo, por encima, a la punta)
    gaps: [3.72, -.02, -3.66],
    path: [[4.4, -4.4], [3.1, -6.3], [1.2, -6.9], [-1.8, -6.5], [-5.2, -4.9], [-6.5, -2], [-6.2, .6]],
    // el pulgar: sus dos falanges, que cruzan por delante del índice y del corazón, a lo ancho
    thumb: [[[4.6, 1.6, -5.5], [2.7, 2.4, 2.4]], [[1.6, .5, -7], [2.8, 1.9, 1.9]]],
  };
  /* el contorno de un elipsoide visto desde la cámara: una elipse, que se calcula directamente (n puntos sobre ella) en lugar
     de muestrear su superficie y quedarse con la envolvente. A: los ejes del marco ya proyectados; c, r: centro y radios */
  const ellOut = (A, c, r, n) => {
    const o = onto(A, c[0], c[1], c[2]);
    const m0 = [A.x[0] * r[0], A.x[1] * r[0]], m1 = [A.y[0] * r[1], A.y[1] * r[1]], m2 = [A.z[0] * r[2], A.z[1] * r[2]];
    const a = m0[0] * m0[0] + m1[0] * m1[0] + m2[0] * m2[0] + 1e-9, b = m0[0] * m0[1] + m1[0] * m1[1] + m2[0] * m2[1], cc = m0[1] * m0[1] + m1[1] * m1[1] + m2[1] * m2[1];
    const l11 = sqrt(a), l21 = b / l11, l22 = sqrt(max(1e-9, cc - l21 * l21));
    const out = new Array(n);
    for (let i = 0; i < n; i++) { const t = i / n * 2 * PI, ct = cos(t), st = sin(t); out[i] = [o[0] + l11 * ct, o[1] + l21 * ct + l22 * st]; }
    return out;
  };
  // cuántos puntos para el contorno de cada elipsoide, según su tamaño
  const ellN = r => r[0] + r[1] + r[2] > 30 ? 20 : r[0] + r[1] + r[2] > 15 ? 14 : 10;

  /* la unión con la cabeza, difuminada: lo que llega a la cabeza se desvanece en sus últimas FADE unidades, siguiendo un
     arco de radio FADE_R que sube hacia los lados como el borde de la nuca o de la mandíbula (antes acababa en una raya
     oscura y marcada justo debajo del cráneo) */
  const FADE = 6.5, FADE_R = 15;
  /* el músculo llega al borde del cuerpo: lo que queda cerca del borde (a menos de SNAP de él, visto desde la cámara) se lleva
     hacia él, tanto más cuanto más cerca, y lo que está casi en el borde acaba justo en él. Así, donde un músculo llega al
     contorno, el contorno es el suyo (antes quedaba una tira de cuerpo oscuro, con su borde claro, entre el músculo y el
     fondo). Sin saltos: cuanto más lejos, menos se mueve, y a SNAP ya no se mueve */
  const SNAP = RAD(34);
  const snapped = (th, w, d, M) => {
    const tv = atan2(M.cx / w, M.cz / d);
    let ph = th - tv;
    ph = ((ph + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI;
    const e = PI / 2 - abs(ph);
    if (e >= SNAP || e <= 0) return th;
    const s = e / SNAP;
    return tv + Math.sign(ph) * (PI / 2 - SNAP * s * s * s * (3 - 2 * s));
  };
  /* lite: sin el rayado de los músculos (para figuras pequeñas, donde no se distingue y es casi un tercio del dibujo) */
  const draw = (ex, t, cam, pre = 'f', lite = false) => {
    let defs = '', nMask = 0;
    const q = ex.at(t);
    const { F, J } = pose(q);
    /* la luz (de arriba a la izquierda de la cámara), en el mundo. Para brazos y piernas, la misma sin lo que tiene de un lado
       o del otro del cuerpo: les llega de arriba y de delante por igual a los dos, así que el brazo (o la pierna) de un lado
       sale igual de claro que el del otro. Antes el que quedaba de espaldas a la luz salía bastante más oscuro, y además se
       oscurecía todo lo que quedaba detrás del tronco */
    const LW = norm(add(add(mul(cam.r, LIGHT[0]), mul(cam.u, LIGHT[1])), mul(cam.c, LIGHT[2])));
    const sym = X => { X = norm(X); return norm(sub(LW, mul(X, dot(LW, X)))); };
    const LARM = sym(F.thorax.x), LLEG = sym(F.pelvis.x);
    // hacia dónde sube el cuello en la imagen
    const up = [dot(F.neck.y, cam.r), -dot(F.neck.y, cam.u)], ul = hypot(up[0], up[1]) || 1, us = [up[0] / ul, up[1] / ul];
    const lvls = { F: [new Set(), new Set()], B: [new Set(), new Set()] };
    const fill = (codes, k) => (codes || []).forEach(c => ['F', 'B'].forEach(v => {
      const ks = c == 'fu' ? Object.keys(MAP.R[v]).filter(r => !['KN', 'NK'].includes(r)) : ((REG[c] || {})[v] || []);
      ks.forEach(r => lvls[v][k].add(r));
    }));
    fill(ex.P, 0); fill(ex.S, 1);
    const groups = {};
    /* con la cadera poco doblada (de pie, tumbado), cada muslo va en la misma pieza que el tronco: así la cadera y el muslo
       tienen un solo contorno, sin la raya de un calzón, y sus músculos se ordenan juntos. Con la cadera muy doblada (abajo
       en la sentadilla), el muslo va aparte, por detrás de la pelvis. */
    const TRUNK = { pelvis: 1, thorax: 1, neck: 1, head: 1 };
    if (ex.merge !== false) TRUNK.thighL = TRUNK.thighR = 1;
    const group = key => { const k = TRUNK[key] ? 'trunk' : key; return groups[k] || (groups[k] = { key: k, skin: [], mus: [], z: null, f: F[k == 'trunk' ? 'thorax' : /^hand/.test(k) && F['grip' + k.slice(4)] && isFist(q, k.slice(4)) ? 'grip' + k.slice(4) : k] }); };
    const proj = p => cam.P(p);
    // la silueta: cada par de anillos seguidos, su envolvente
    const ringSkin = (key, f, rings) => {
      const g = group(key);
      const A = axes(f, cam);
      const P2 = rings.map(([y, w, d, zc]) => RING_SC.map(([sn, cs]) => onto(A, w * sn, y, (zc || 0) + d * cs)));
      /* los brazos y las piernas acaban en cúpula (tres anillos que se cierran): cada cúpula, con el anillo en el que se
         apoya, es convexa, así que va en una sola envolvente (antes, tres). En el antebrazo y la pierna, la de arriba
         (dentro del codo o de la rodilla) va sin borde */
      const nd = key == 'neck' ? 0 : DOME.length, last = P2.length - 1;
      if (nd) g.skin.push({ h: hull([].concat(...P2.slice(0, nd + 1))), rim: !/^(fore|shin)/.test(key) });
      for (let i = nd; i < last - nd; i++) g.skin.push({ h: hull(P2[i].concat(P2[i + 1])), rim: true });
      if (nd) g.skin.push({ h: hull([].concat(...P2.slice(last - nd))), rim: true });
      if (g.z == null || key == 'thorax') g.z = proj(at(f, [0, (rings[0][0] + rings[rings.length - 1][0]) / 2, 0]))[2];
    };
    const blobSkin = (key, f, blob) => {
      const g = group(key), A = axes(f, cam);
      g.skin.push({ h: hull([].concat(...BLOBS[blob].map(([c, r]) => ellOut(A, c, r, ellN(r))))), rim: true });
      if (g.z == null) g.z = onto(A, ...BLOBS[blob][0][0])[2];
    };
    /* el puño: su silueta (dorso con muñeca, cada dedo y el pulgar) va con la piel; encima, cada pieza con su propio
       contorno oscuro, de atrás adelante, para que se lean los dedos y el pulgar */
    const fistSkin = s => {
      const g = group('hand' + s), A = axes(F['grip' + s], cam), k = s == 'L' ? -1 : 1;
      const out = list => hull([].concat(...list.map(([c, r]) => ellOut(A, [c[0] * k, c[1], c[2]], r, ellN(r)))));
      const depth = list => list.reduce((a, [c]) => a + onto(A, c[0] * k, c[1], c[2])[2], 0) / list.length;
      const body = { h: [out(FIST.body)], z: depth(FIST.body) }, thumb = { h: [out(FIST.thumb)], z: depth(FIST.thumb) };
      const band = { h: FIST.fingers.map(out), z: depth([].concat(...FIST.fingers)) };
      // las rayas entre los dedos: solo lo que mira a la cámara, y apagándose hacia el borde
      const G3 = F['grip' + s], cz = [dot(G3.y, cam.c), dot(G3.z, cam.c)];
      band.lines = FIST.gaps.map(x => {
        let d = '';
        for (let i = 0; i + 1 < FIST.path.length; i++) {
          const [z0, y0] = FIST.path[i], [z1, y1] = FIST.path[i + 1], ny = (y0 + y1) / 2 + 1, nz = (z0 + z1) / 2, nl = hypot(ny, nz);
          const f = (ny * cz[0] + nz * cz[1]) / nl;
          if (f < .15) continue;
          const p = onto(A, x * k, y0, z0), q2 = onto(A, x * k, y1, z1);
          d += `<path d="M${f1(p[0])} ${f1(p[1])}L${f1(q2[0])} ${f1(q2[1])}" stroke-opacity="${(.6 * min(1, (f - .15) / .3)).toFixed(2)}"/>`;
        }
        return d;
      }).join('');
      [body, band, thumb].forEach(p => p.h.forEach(h => g.skin.push({ h, rim: true })));
      g.detail = [body, band, thumb].sort((a, b) => a.z - b.z);
      if (g.z == null) g.z = onto(A, 0, 3, 0)[2];
    };
    // el tronco: cada anillo, con el marco de su altura (en la cintura, a medias entre el tórax y la pelvis)
    const BF = {};
    const trunkSkin = () => {
      const g = group('thorax');
      const P2 = RINGS_PRE.trunk.map(([y, w, d, zc, bw]) => {
        const A = BF[bw] || (BF[bw] = axes(blendF(F, bw, 'thorax'), cam));
        return RING_SC.map(([sn, cs]) => onto(A, w * sn, y, zc + d * cs));
      });
      for (let i = 0; i + 1 < P2.length; i++) g.skin.push({ h: hull(P2[i].concat(P2[i + 1])), rim: true });
      g.z = proj(at(F.thorax, [0, 46, 0]))[2];
    };
    // la cabeza: sus elipsoides, envueltos de dos en dos
    const HA = axes(F.head, cam);
    // cada elipsoide, proyectado y envuelto una vez; cada pareja, la envolvente de las dos envolventes
    const headE = HEAD3.map(([c, r]) => ellOut(HA, c, r, 24));
    const headH = HEAD_PAIRS.map(([a, b]) => hull(headE[a].concat(headE[b])));
    { const g = group('head'); headH.forEach(h => g.skin.push({ h, rim: true })); }
    ringSkin('neck', F.neck, RINGS_PRE.neck);
    trunkSkin();
    ['L', 'R'].forEach(s => {
      ['upper', 'fore', 'thigh', 'shin'].forEach(k => ringSkin(k + s, F[k + s], RINGS_PRE[k]));
      if (!isFist(q, s)) blobSkin('hand' + s, F['hand' + s], 'hand');
      else fistSkin(s);
      blobSkin('foot' + s, F['foot' + s], 'foot');
    });
    // los músculos: envueltos sobre su segmento; lo que mira hacia atrás se dobla sobre el borde, y si no se ve nada, no se pinta
    const AX = {};
    /* la cabeza tapa lo de arriba del cuello que queda detrás de ella vista desde la cámara: la mandíbula, de frente; la
       nuca, por detrás. Cada punto del cuello que la cabeza tapa baja por el cuello hasta donde deja de taparlo, y el
       músculo acaba justo en el contorno de la cabeza (antes subía y se pintaba encima, en punta) */
    const HB = HEAD3.map(([o, r]) => ({ c: onto(HA, o[0], o[1], o[2]), r, d: [HA.x[2] / r[0], HA.y[2] / r[1], HA.z[2] / r[2]] }));
    const hidden = P => HB.some(({ c, r, d }) => {
      const v = [P[0] - c[0], P[1] - c[1], P[2] - c[2]];
      const q0 = (v[0] * HA.x[0] + v[1] * HA.x[1] + v[2] * HA.x[2]) / r[0], q1 = (v[0] * HA.y[0] + v[1] * HA.y[1] + v[2] * HA.y[2]) / r[1], q2 = (v[0] * HA.z[0] + v[1] * HA.z[1] + v[2] * HA.z[2]) / r[2];
      const cc = q0 * q0 + q1 * q1 + q2 * q2 - 1;
      if (cc < 0) return true;
      const b = q0 * d[0] + q1 * d[1] + q2 * d[2], a = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
      return b < 0 && b * b - a * cc >= 0;
    });
    const SH = G.FIG_DEBUG ? (G.FIG_SHADES = []) : null;
    // los marcos de la cintura, por altura (en 64 pasos), para todas las piezas
    const BX = {};
    const frameB = (k, bw) => {
      const q = round(bw * 64), id = k + q;
      if (BX[id]) return BX[id];
      const f = blendF(F, q / 64, k);
      return (BX[id] = { f, fam: 'trunk', cx: dot(cam.c, f.x), cz: dot(cam.c, f.z), A: axes(f, cam) });
    };
    PARTS.forEach((p, pi) => {
      const key = p.side == 'C' ? p.seg : p.seg + p.side;
      // cada punto, en el marco de su hueso (el de la pieza, o el del cuello para el trapecio alto, o el de su altura en la cintura)
      const FR = {};
      const frame = k => FR[k] || (FR[k] = { f: F[k], fam: k == 'pelvis' ? 'trunk' : k == 'thorax' ? 'trunk' : k, cx: dot(cam.c, F[k].x), cz: dot(cam.c, F[k].z), A: AX[k] || (AX[k] = axes(F[k], cam)) });
      const frameOf = pt => pt.neck ? frame('neck') : pt.bw == null || pt.bw == (key == 'pelvis' ? 1 : 0) ? frame(key) : frameB(key, pt.bw);
      const pts = [];
      let seen = 0;
      const nw = [0, 0, 0];
      /* la luz, con lo que se ve de cada músculo: cada punto cuenta según lo que mira a la cámara, y poco a poco (sin saltos)
         deja de contar al irse por detrás. Antes contaban todos, y un músculo visto de refilón (el esternocleidomastoideo
         desde atrás) se pintaba con la luz de su cara escondida, casi negro */
      const nv = [0, 0, 0];
      let vis = 0;
      const n = p.sf.length, fac = new Array(n), Ms = new Array(n), yr = new Array(n), sd = new Array(n);
      // de qué lado del borde queda un punto, visto desde la cámara
      const sideOf = (pt, M) => { let dl = pt.th - atan2(M.cx / pt.w, M.cz / pt.d); dl = ((dl + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI; return dl < 0 ? -1 : 1; };
      for (let i = 0; i < n; i++) {
        const pt = p.sf[i], M = Ms[i] = frameOf(pt), f = M.f, ln = hypot(pt.nx, pt.nz);
        fac[i] = pt.nx * M.cx + pt.nz * M.cz;
        const wv = clamp((fac[i] / ln + .25) / .5, 0, 1) / ln;
        for (let j = 0; j < 3; j++) { const v = f.x[j] * pt.nx + f.z[j] * pt.nz; nw[j] += v; nv[j] += v * wv; }
        if (fac[i] >= 0) { seen++; vis += fac[i] / ln; }
      }
      if (seen < 2) { if (SH) SH[pi] = -1; return; }
      /* lo que apenas asoma no se va a pintar (su opacidad, más abajo, saldría casi nula): no hace falta colocar sus puntos.
         Cuenta, eso sí, para el orden de su lado (como antes) */
      if ((vis / n - .012) / .07 < .03) {
        if (SH) SH[pi] = -1;
        group(key).mus.push({ skip: true, sz: frame(key == 'pelvis' ? 'thorax' : key).A.o[2], view: p.view, face: dot(norm(nw), cam.c), layer: p.layer, pi });
        return;
      }
      /* lo que queda de espaldas se dobla sobre el borde; cada tramo escondido, solo entre las alturas por las que el
         contorno sale y vuelve a entrar en lo que se ve. Antes se doblaba entero, y si lo escondido llegaba más arriba o
         más abajo que lo visible, dejaba una raya oscura a lo largo del borde (por ejemplo, junto al cuello) */
      if (seen && seen < n) {
        const v0 = fac.findIndex(v => v >= 0), cut = (i, k) => p.sf[i].y + (p.sf[k].y - p.sf[i].y) * fac[i] / (fac[i] - fac[k]);
        for (let k = 0; k < n;) {
          if (fac[(v0 + k) % n] >= 0) { k++; continue; }
          let m = k;
          while (m + 1 < n && fac[(v0 + m + 1) % n] < 0) m++;
          const a = (v0 + k - 1 + n) % n, i = (v0 + k) % n, j = (v0 + m) % n, b = (v0 + m + 1) % n;
          let same = Ms[a].fam === Ms[b].fam;
          for (let t = k; t <= m && same; t++) same = Ms[(v0 + t) % n].fam === Ms[a].fam;
          if (same) {
            const y1 = cut(a, i), y2 = cut(b, j), r = [min(y1, y2), max(y1, y2)];
            /* y se dobla hacia el borde por el que sale (la primera mitad del tramo) o por el que vuelve a entrar (la segunda):
               antes cada punto iba al borde más cercano a él, y los que pasaban por detrás justo enfrente saltaban de un
               borde al otro, y el músculo cambiaba de forma de golpe */
            const sa = sideOf(p.sf[a], Ms[a]), sb = sideOf(p.sf[b], Ms[b]), half = (k + m) / 2;
            for (let t = k; t <= m; t++) { yr[(v0 + t) % n] = r; sd[(v0 + t) % n] = t <= half ? sa : sb; }
          }
          k = m + 1;
        }
      }
      const fold = (pt, M, r, side) => {
        // de espaldas: se dobla sobre el borde, por el lado más cercano (o por el que le toca a su tramo)
        let { w, d, zc, y } = pt;
        if (r && (y < r[0] || y > r[1])) { y = clamp(y, r[0], r[1]); [w, d, zc] = profAt(pt.neck ? 'neck' : p.seg, y); }
        const tv = atan2(M.cx / w, M.cz / d);
        const th = tv + (side || sideOf(pt, M)) * PI / 2;
        return onto(M.A, w * sin(th), y, zc + d * cos(th));
      };
      const place = pt => {
        const M = frameOf(pt);
        return pt.nx * M.cx + pt.nz * M.cz >= 0 ? onto(M.A, pt.lx, pt.y, pt.lz) : fold(pt, M);
      };
      const at3 = (pt, i, y) => {
        const M = Ms[i];
        let { w, d, zc } = pt;
        if (y !== pt.y) [w, d, zc] = profAt('neck', y);
        if (fac[i] < 0) return fold(y === pt.y ? pt : { ...pt, w, d, zc, y }, M, yr[i], sd[i]);
        const th = snapped(pt.th, w, d, M);
        return onto(M.A, w * sin(th), y, zc + d * cos(th));
      };
      let J = null;
      for (let i = 0; i < n; i++) {
        const pt = p.sf[i];
        let P = at3(pt, i, pt.y), top = pt.top;
        if ((pt.neck || p.seg == 'neck') && hidden(P)) {
          // lo más alto del cuello, a ese ángulo, que la cabeza deja ver
          let lo = -8, hi = pt.y;
          for (let k = 0; k < 9; k++) { const m = (lo + hi) / 2; if (hidden(at3(pt, i, m))) hi = m; else lo = m; }
          P = at3(pt, i, lo);
          top = true;
        }
        // el punto más bajo (a lo largo del cuello) de los que tocan la cabeza y se ven
        if (top && fac[i] >= 0) { const v = P[0] * us[0] + P[1] * us[1]; if (!J || v < J.v) J = { v, x: P[0], y: P[1] }; }
        pts.push(P);
      }
      // el tórax y la pelvis, como un solo hueso: entre ellos manda el orden de capas (antes se turnaban según cuál quedaba más cerca)
      const A = frame(key == 'pelvis' ? 'thorax' : key).A;
      const nwn = norm(nw), nl = len(nv) > 1e-6 ? norm(nv) : nwn;
      const lit = dot(nl, p.side == 'C' ? LW : p.seg == 'thigh' || p.seg == 'shin' ? LLEG : LARM), face = dot(nwn, cam.c);
      const shade = clamp(Math.floor((lit + .45) / 1.4 * LEVELS), 0, LEVELS - 1);
      if (SH) SH[pi] = shade;
      const zc = pts.reduce((a, b) => a + b[2], 0) / pts.length;
      const lv = lvls[p.view][0].has(p.region) ? 'main' : lvls[p.view][1].has(p.region) ? 'second' : 'rest';
      const h0 = place(p.hsf[0]), h1 = place(p.hsf[1]);
      /* el rayado va en el marco del músculo: con origen en un punto fijo suyo y girado según sus fibras, para que se mueva
         con él (antes estaba quieto en la pantalla y parecía resbalar sobre el cuerpo) */
      const fa = atan2(h1[1] - h0[1], h1[0] - h0[0]) - PI / 2;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, area = 0, per = 0;
      pts.forEach((q, i) => {
        x0 = min(x0, q[0]); x1 = max(x1, q[0]); y0 = min(y0, q[1]); y1 = max(y1, q[1]);
        const r = pts[(i + 1) % n]; area += q[0] * r[1] - r[0] * q[1]; per += hypot(r[0] - q[0], r[1] - q[1]);
      });
      /* un músculo visto de canto queda como una tira muy fina (área entre perímetro, su medio grosor): por debajo de unas
         dos unidades se va desvaneciendo, porque el borde oscuro se come el relleno y en la pantalla queda una raya */
      const thin = clamp((abs(area) / 2 / (per || 1) - .5) / .9, 0, 1);
      group(key).mus.push({ fade: J && [J.x + us[0] * FADE_R, J.y + us[1] * FADE_R], z: zc, face, sz: A.o[2], view: p.view, region: p.region, pi, layer: p.layer, small: hypot(x1 - x0, y1 - y0) < 9, pts, lv, shade, ht: `translate(${f1(h0[0])} ${f1(h0[1])}) rotate(${f1(fa * 180 / PI)})`, seen: seen / p.pts.length, vis: vis / n, thin });
    });
    /* la cabeza, con su volumen: de cara a la cámara va delante del cuello, con su propio contorno (así se ve la mandíbula
       sobre el cuello) y un degradado redondo, con el brillo donde le da la luz al cráneo; de espaldas se funde con el cuello
       (como antes) y solo lleva el brillo del cráneo, que se apaga antes del borde (con sombra en el borde se veía una bola
       dentro de la cabeza). Entre una cosa y otra, poco a poco. De cara, además, la mandíbula da sombra al cuello */
    const headLayer = () => {
      const fc = dot(F.head.z, cam.c), wf = clamp((fc + .12) / .24, 0, 1), wF = wf * wf * (3 - 2 * wf);
      const Lh = [dot(LW, F.head.x), dot(LW, F.head.y), dot(LW, F.head.z)];
      const [cc, rr] = HEAD3[0], k = hypot(Lh[0] * rr[0], Lh[1] * rr[1], Lh[2] * rr[2]);
      const cr = onto(HA, cc[0], cc[1], cc[2]), lit = onto(HA, ...cc.map((c, i) => c + rr[i] * rr[i] * Lh[i] / k));
      const foc = [cr[0] + (lit[0] - cr[0]) * .55, cr[1] + (lit[1] - cr[1]) * .55];
      let out = '';
      if (wF > .01) {
        const sh = onto(HA, 0, -19, -1), sid = pre + 'hs';
        defs += `<radialGradient id="${sid}"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;
        out += `<ellipse cx="${f1(sh[0])}" cy="${f1(sh[1] + 2)}" rx="15" ry="10" fill="url(#${sid})"${wF < .99 ? ` opacity="${wF.toFixed(2)}"` : ''}/>`;
        const id = pre + 'hd', mid = onto(HA, 0, -2, 2), d = headH.map(smoothR).join('');
        defs += `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f1(mid[0])}" cy="${f1(mid[1])}" r="27" fx="${f1(foc[0])}" fy="${f1(foc[1])}"><stop offset="0" stop-color="#4d557c"/><stop offset=".3" stop-color="#383e5f"/><stop offset=".66" stop-color="#252942"/><stop offset="1" stop-color="#121424"/></radialGradient>`;
        out += `<path d="${d}" fill="url(#${id})"${STYLE.skin[1]} paint-order="stroke"${wF < .99 ? ` opacity="${wF.toFixed(2)}"` : ''}/>`;
      }
      if (wF < .99) {
        const id = pre + 'hb';
        defs += `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f1(cr[0])}" cy="${f1(cr[1])}" r="18" fx="${f1(foc[0])}" fy="${f1(foc[1])}"><stop offset="0" stop-color="#8f99cc" stop-opacity=".3"/><stop offset=".55" stop-color="#8f99cc" stop-opacity="0"/></radialGradient>`;
        out += `<path d="${smoothR(headE[0])}" fill="url(#${id})"${wF > .01 ? ` opacity="${(1 - wF).toFixed(2)}"` : ''}/>`;
      }
      return out;
    };
    // orden: los segmentos, de atrás adelante; el muslo, por detrás de la pelvis, y el brazo por detrás del tórax si no está claramente delante
    const items = [];
    if (!ex.noShadow) {
      const fc = mul(add(F.footL.o, F.footR.o), .5);
      items.push({ z: -1e9, svg: kept(cam, 's' + fc.map(v => round(v)), () => {
        const ring = [];
        for (let i = 0; i < 36; i++) { const a = i / 36 * 2 * PI; ring.push(add([fc[0], 0, fc[2] + 12], [95 * cos(a), 0, 60 * sin(a)])); }
        return `<path d="${pathOf(cam, ring)}" fill="url(#g3Sh)"/>`;
      }) });
    }
    const tz = groups.trunk.z, hipZ = cam.P(F.pelvis.o)[2];
    const Z = {};
    Object.values(groups).forEach(g => {
      let z = g.z;
      // el muslo suelto, siempre por detrás del tronco (antes, con el tronco inclinado, podía pintarse encima del glúteo)
      if (/^thigh/.test(g.key)) z = min(z, hipZ - 2, tz - 2);
      if (/^(shin|fore|hand|foot)/.test(g.key)) z += 1.5;
      Z[g.key] = z;
    });
    /* en el codo y en la rodilla, delante va el trozo que, desde la articulación, apunta más hacia la cámara (antes, el que
       tenía el centro más cerca: en el press militar el antebrazo pasaba de golpe de delante a detrás del brazo). Si los dos
       apuntan casi igual, el de abajo se pinta detrás y otra vez delante, cada vez más visible: el cambio es un fundido */
    const TAU = .1, twin = {};
    const joint = (a, b, A, M, B) => {
      if (!groups[a] || !groups[b]) return;
      const x = dot(norm(sub(B, M)), cam.c) - dot(norm(sub(A, M)), cam.c), w = clamp((x + TAU) / (2 * TAU), 0, 1), k = w * w * (3 - 2 * w);
      if (k > .995) Z[b] = max(Z[b], Z[a] + .01);
      else { Z[b] = min(Z[b], Z[a] - .01); if (k > .005) twin[b] = { z: max(Z[a] + .01, Z[b] + .02), k }; }
    };
    ['L', 'R'].forEach(s => {
      joint('upper' + s, 'fore' + s, J[s].sh, J[s].el, J[s].fist);
      joint('thigh' + s, 'shin' + s, J[s].hip, J[s].knee, J[s].ankle);
      // la mano y el pie, siempre encima del antebrazo y de la pierna: la muñeca y el tobillo quedan dentro de ellos
      if (groups['hand' + s] && groups['fore' + s]) Z['hand' + s] = max(Z['hand' + s], Z['fore' + s] + 1e-4);
      if (groups['foot' + s] && groups['shin' + s]) Z['foot' + s] = max(Z['foot' + s], Z['shin' + s] + 1e-4);
    });
    Object.values(groups).forEach(g => {
      const z = Z[g.key];
      const sk = STYLE.skin;
      // de través: perpendicular al eje de la pieza en la imagen, del lado que mira a la luz al otro
      const ax = [dot(g.f.y, cam.r), -dot(g.f.y, cam.u)], pp = [-ax[1], ax[0]];
      const toLight = pp[0] * LIGHT[0] - pp[1] * LIGHT[1] > 0 ? -1 : 1;
      const gi = ((round(atan2(pp[1] * toLight, pp[0] * toLight) / (2 * PI) * 32) % 32) + 32) % 32;
      const rimD = g.skin.filter(k => k.rim).map(k => smoothR(k.h)).join(''), domeD = g.skin.filter(k => !k.rim).map(k => smoothR(k.h)).join('');
      // la piel: primero el contorno (con borde) y encima el relleno de todo, que tapa las costuras de dentro
      const sg = `url(#g3Sn${gi})`;
      /* sin cúpulas de articulación, un solo trazado: primero el borde y encima el relleno (paint-order), que tapa las costuras
         de dentro; con cúpulas, dos, porque las cúpulas no llevan borde */
      const skin = domeD ? `<path d="${rimD}" fill="${sk[0]}"${sk[1]}/><path d="${rimD + domeD}" fill="${sg}"/>` : `<path d="${rimD}" fill="${sg}"${sk[1]} paint-order="stroke"/>`;
      /* orden dentro de la pieza: por la profundidad de su hueso; en el mismo hueso, encima el lado del mapa (delante o
         detrás) que más mira a la cámara, y los del mismo lado en el orden de capas de la app (antes se ordenaban solo por su
         profundidad media, y dos músculos solapados, como el trapecio bajo y los erectores, se turnaban al moverse) */
      // un orden total: hueso, lado (encima, el lado que más mira a la cámara) y capa
      const side = {};
      g.mus.forEach(m => { const k = m.sz + m.view; (side[k] = side[k] || []).push(m.face); });
      g.mus.forEach(m => { const zs = side[m.sz + m.view]; m.vz = zs.reduce((a, b) => a + b, 0) / zs.length; });
      // se desvanece al llegar a la cabeza: una máscara con un degradado redondo, negro dentro del arco y blanco fuera
      const faded = (fade, body) => {
        if (!fade) return body;
        const id = `${pre}hm${nMask++}`;
        defs += `<radialGradient id="${id}g" gradientUnits="userSpaceOnUse" cx="${f1(fade[0])}" cy="${f1(fade[1])}" r="${FADE_R + FADE}"><stop offset="${(FADE_R / (FADE_R + FADE)).toFixed(3)}" stop-color="#000"/><stop offset="1" stop-color="#fff"/></radialGradient><mask id="${id}"><rect x="-2000" y="-2000" width="4000" height="4000" fill="url(#${id}g)"/></mask>`;
        return `<g mask="url(#${id})">${body}</g>`;
      };
      const mus = g.mus.sort((x, y) => (x.sz - y.sz) || (x.vz - y.vz) || (x.layer - y.layer)).map(m => {
        /* un músculo que asoma por un borde aparece poco a poco según lo que mira a la cámara (la media de lo que se ve, de
           canto a de frente), que cambia sin saltos al girar; enseguida se pinta entero. Antes contaba cuántos de sus puntos se
           veían: si muchos asomaban a la vez, aparecía de golpe, y a medio camino se veía a medias, como un fantasma */
        if (m.skip) return '';
        const st = STYLE[m.lv], op = clamp((m.vis - .012) / .07, 0, 1) * m.thin, o = op < .99 ? ` opacity="${op.toFixed(2)}"` : '';
        if (op < .03) return '';
        /* el trazado se escribe solo si se pinta, y una vez: el rayado usa el mismo, con su propio rayado girado y colocado
           según las fibras del músculo (antes se escribía otra vez el músculo entero, girado) */
        const d = smoothR(m.pts);
        let hatch = '';
        if (!m.small && !lite) {
          const id = `${pre}r${m.pi}`;
          defs += `<pattern id="${id}" width="3.4" height="4" patternUnits="userSpaceOnUse" patternTransform="${m.ht}"><line y2="4" stroke="#000" stroke-opacity=".33" stroke-width=".55"/></pattern>`;
          hatch = `<path d="${d}" fill="url(#${id})"${o}/>`;
        }
        const body = `<path d="${d}" fill="url(#g3${st[0]}${m.shade})" stroke="${st[1]}" stroke-width="1.3" stroke-linejoin="round"${o}${G.FIG_DEBUG ? ` data-r="${m.view}:${m.region}:${m.pi}" data-t="${m.thin.toFixed(2)}" data-s="${m.seen.toFixed(2)}" data-v="${m.vis.toFixed(3)}"` : ''}/>` + hatch;
        return faded(m.fade, body);
      }).join('');
      /* el puño, pieza a pieza (de atrás adelante): cada una con su relleno y un contorno oscuro fino; la de los dedos, de una
         pieza (el contorno de dentro lo tapa el relleno) y con sus rayas */
      const detail = g.detail ? g.detail.map(p => `<path d="${p.h.map(smoothR).join('')}" fill="${sg}" stroke="#090a12" stroke-opacity=".7" stroke-width=".55" stroke-linejoin="round" paint-order="stroke"/>` + (p.lines ? `<g stroke="#090a12" stroke-width=".5" stroke-linecap="round">${p.lines}</g>` : '')).join('') : '';
      const body = skin + detail + (g.key == 'trunk' ? headLayer() : '') + mus;
      items.push({ z, svg: G.FIG_DEBUG ? `<g data-g="${g.key}">${body}</g>` : body });
      if (twin[g.key]) items.push({ z: twin[g.key].z, svg: `<g opacity="${twin[g.key].k.toFixed(2)}">${body}</g>` });
    });
    if (G.FIG_DEBUG) G.Fig3D.lastZ = Z;
    /* lo que va dentro del puño, detrás de la mano; lo que va detrás de otra pieza (below: sus nombres), detrás de ella */
    (ex.gear ? ex.gear(q, F, cam) : []).forEach(i => {
      if (i.hand && Z['hand' + i.hand] != null) i.z = min(i.z, Z['hand' + i.hand] - 1e-3);
      if (i.below) i.below.forEach(k => { if (Z[k] != null) i.z = min(i.z, Z[k] - 1e-3); });
      if (i.above) i.above.forEach(k => { if (Z[k] != null) i.z = max(i.z, Z[k] + 1e-3); });
      items.push(i);
    });
    items.sort((a, b) => a.z - b.z);
    // lo que se sale del encuadre a propósito (lo alto de una máquina, las cintas hasta su anclaje) no cuenta para encuadrar
    return (defs ? `<defs>${defs}</defs>` : '') + items.map(i => i.nf ? `<g class="nf">${i.svg}</g>` : i.svg).join('');
  };

  /* ── el material ── */
  const pathOf = (cam, pts) => 'M' + pts.map(p => { const q = cam.P(p); return f1(q[0]) + ' ' + f1(q[1]); }).join('L') + 'Z';
  const box = (cam, c, h, fill, stroke) => kept(cam, 'b' + c + h + fill, () => {
    const pts = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) pts.push([c[0] + sx * h[0], c[1] + sy * h[1], c[2] + sz * h[2]]);
    const faces = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
    const svg = faces.map(f => {
      const n = cross(sub(pts[f[1]], pts[f[0]]), sub(pts[f[2]], pts[f[0]]));
      return dot(n, cam.c) <= 0 ? '' : `<path d="${pathOf(cam, f.map(i => pts[i]))}" fill="${fill}" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round"/>`;
    }).join('');
    return { z: cam.P(c)[2], svg };
  });
  /* lo que no cambia de forma de un fotograma a otro (discos, banco, sombra del suelo) se calcula una vez por cámara y luego
     solo se coloca: un disco, por ejemplo, solo se desplaza con la barra */
  const KEEP = new WeakMap();
  const kept = (cam, key, make) => { let m = KEEP.get(cam); if (!m) KEEP.set(cam, m = new Map()); let v = m.get(key); if (v === undefined) m.set(key, v = make()); return v; };
  const plate = (cam, c, R, w, metal) => {
    const svg = kept(cam, 'p' + R + ',' + w, () => {
      // el disco alrededor de su centro (la proyección no tiene desplazamiento: basta con moverlo luego a su sitio)
      const axis = [1, 0, 0], u = [0, 1, 0], v = [0, 0, 1];
      const ring = (cc, r, n = 24) => { const out = []; for (let i = 0; i < n; i++) { const a = i / n * 2 * PI; out.push(cam.P(add(cc, add(mul(u, r * cos(a)), mul(v, r * sin(a)))))); } return out; };
      const sgn = dot(axis, cam.c) > 0 ? 1 : -1;
      const near = mul(axis, sgn * w / 2), farc = mul(axis, -sgn * w / 2);
      const side = smoothR(hull(ring(near, R).concat(ring(farc, R))));
      if (metal) return `<path d="${side}" fill="#7d849e" stroke="#0a0b10" stroke-width="1"/><path d="${smoothR(ring(near, R, 12))}" fill="#b9bed0" stroke="#0a0b10" stroke-width="1"/>`;
      return `<path d="${side}" fill="#0f1119" stroke="#59607c" stroke-width="1.2"/><path d="${smoothR(ring(near, R))}" fill="#171a27" stroke="#59607c" stroke-width="1.2"/><path d="${smoothR(ring(near, R * .7, 20))}" fill="none" stroke="#2b2f43" stroke-width="2"/><path d="${smoothR(ring(near, R * .14, 10))}" fill="#b9bed0" stroke="#0a0b10" stroke-width="1"/>`;
    });
    const P = cam.P(c);
    return { z: P[2], svg: `<g class="pl" transform="translate(${f1(P[0])} ${f1(P[1])})">${svg}</g>` };
  };
  /* una barra, a trozos para ordenarla con el cuerpo; los trozos van a tope (sin remate redondo, que dejaba una raya oscura
     en cada unión) y el relleno pasa un poco del borde para tapar la costura */
  const bar = (cam, a, b, n, wdt) => {
    const out = [], ext = .4 / (len(sub(b, a)) || 1);
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const P1 = cam.P(mix(a, b, t0)), P2 = cam.P(mix(a, b, t1)), Q1 = cam.P(mix(a, b, max(0, t0 - ext))), Q2 = cam.P(mix(a, b, min(1, t1 + ext)));
      const d = `M${f1(P1[0])} ${f1(P1[1])}L${f1(P2[0])} ${f1(P2[1])}`, e = `M${f1(Q1[0])} ${f1(Q1[1])}L${f1(Q2[0])} ${f1(Q2[1])}`;
      out.push({ z: (P1[2] + P2[2]) / 2, svg: `<path d="${d}" stroke="#0a0b10" stroke-width="${wdt + 2}"/><path d="${e}" stroke="#b9bed0" stroke-width="${wdt}"/>` });
    }
    return out;
  };
  /* una barra olímpica (unos 2,2 m): la barra entre los collarines, las mangas más gruesas, un disco grande y uno mediano
     y el cierre a cada lado. Lo que queda dentro de los puños (a grip del centro) no se pinta. */
  const barbell = (cam, c, grip) => {
    const X = x => add(c, [x, 0, 0]);
    let spans = [[-139, 139]];
    if (grip) [[-grip - 8, -grip + 8], [grip - 8, grip + 8]].forEach(([a, b]) => { spans = spans.flatMap(([u, v]) => b <= u || a >= v ? [[u, v]] : [[u, a], [b, v]].filter(([m, n]) => n - m > 1)); });
    const out = [];
    spans.forEach(([u, v]) => {
      const it = bar(cam, X(u), X(v), max(1, round((v - u) / 18)), 5.2);
      // el trozo que entra en un puño va siempre detrás de él (si no, su corte asomaba por encima de la mano)
      if (grip) [[u, 0], [v, it.length - 1]].forEach(([e, i]) => { if (abs(abs(e) - grip) < 9) it[i].hand = e > 0 ? 'L' : 'R'; });
      out.push(...it);
    });
    [-1, 1].forEach(k => {
      out.push(...bar(cam, X(k * 141), X(k * 222), 4, 7.6));
      out.push(plate(cam, X(k * 140), 6.5, 3.5, true), plate(cam, X(k * 151), 49, 12), plate(cam, X(k * 163), 40, 9), plate(cam, X(k * 171), 7.5, 5, true), plate(cam, X(k * 221.5), 3.8, 1, true));
    });
    return out;
  };

  /* ── los ejercicios del prototipo ── */
  /* el momento del gesto (0 a 1) a los ms de empezar. Como se mueve una persona: cada tramo arranca y frena sin tirones (el
     perfil de tirón mínimo, que es el de los movimientos humanos), la bajada es más lenta que la subida, y solo se descansa
     en la posición de reposo (arriba, con los brazos o las piernas estirados); en el otro extremo el gesto apenas se para y
     da la vuelta, salvo en los ejercicios con pausa (pause, en ms). La sentadilla y el press de banca empiezan en reposo
     (up 'a': el esfuerzo acaba en a); el press de hombro, abajo (up 'b') */
  const mj = t => t * t * t * (10 + t * (6 * t - 15));
  const beat = (ms, up, long, pause = 0) => {
    const k = long ? 1.5 : 1, slow = 1650 * k, fast = 1100 * k, rest = 520, turn = 130 + pause;
    const go = up == 'a' ? slow : fast, back = up == 'a' ? fast : slow, h1 = up == 'a' ? turn : rest, h0 = up == 'a' ? rest : turn;
    let x = ms % (go + back + h0 + h1);
    if (x < go) return mj(x / go);
    if ((x -= go) < h1) return 1;
    if ((x -= h1) < back) return 1 - mj(x / back);
    return 0;
  };
  const ROOT_Y = 20 + 84 + 89 - 4; // de pie, con las rodillas apenas dobladas
  const EX = {
    rest: {
      name: 'De pie', yaw: 0, pitch: 0, up: 'a', P: [], S: [],
      at() {
        return { root: [0, 400 - 205, 0], tilt: 0, spine: 0, neck: 0, feet: { L: [22, 0, 0], R: [22, 0, 0] }, knee: { L: [0, 0, 1], R: [0, 0, 1] },
          hands: { L: [70, 400 - 212 - 15, 0], R: [-70, 400 - 212 - 15, 0] }, elbow: { L: [.2, 0, -1], R: [.2, 0, -1] }, palm: { L: [0, 0, 1], R: [0, 0, 1] }, fist: false };
      },
    },
    /* para revisar el dibujo: de pie con los brazos algo separados, para que se vean los costados */
    apose: {
      name: 'Brazos separados', yaw: 0, pitch: 0, up: 'a', P: [], S: [],
      at() {
        return { root: [0, 400 - 205, 0], tilt: 0, spine: 0, neck: 0, feet: { L: [26, 0, 8], R: [26, 0, 8] }, knee: { L: [0, 0, 1], R: [0, 0, 1] },
          hands: { L: [118, 200, 8], R: [-118, 200, 8] }, elbow: { L: [.3, 0, -1], R: [.3, 0, -1] }, palm: { L: [0, 0, 1], R: [0, 0, 1] }, fist: false };
      },
    },
    sentadilla: {
      name: 'Sentadilla', yaw: -140, pitch: 14, up: 'a', merge: false, P: ['cu', 'gl'], S: ['is', 'er', 'ad', 'co'],
      /* arriba, el tronco algo inclinado para que la barra quede sobre el medio del pie; abajo, el muslo paralelo al suelo,
         la cadera atrás, las rodillas hacia delante siguiendo la punta del pie y el tronco a unos 35°; la barra baja en
         vertical. Los pies, al ancho de los hombros y las puntas algo abiertas. */
      a: { root: [0, 186, 0], tilt: 9, spine: 4, neck: -13 },
      b: { root: [0, 89, -48.8], tilt: 26, spine: 9.5, neck: -30 },
      at(t) {
        const q = mix(this.a, this.b, t);
        const base = { ...q, feet: { L: [44, -8, 18], R: [44, -8, 18] }, knee: { L: [.33, 0, 1], R: [.33, 0, 1] } };
        const { F } = pose({ ...base, hands: { L: [0, 0, 0], R: [0, 0, 0] }, elbow: {} });
        /* barra alta: apoyada en los trapecios, por encima de las escápulas; las manos, bastante más abiertas que los hombros,
           y los codos hacia abajo, un poco atrás */
        const c = at(F.thorax, [0, 90, -26]);
        return { ...base, barC: c, grip: 80, hands: { L: add(c, [80, 0, 0]), R: add(c, [-80, 0, 0]) }, elbow: { L: [.25, -1, -.45], R: [.25, -1, -.45] }, shrug: 3 };
      },
      gear: (q, F, cam) => barbell(cam, q.barC, q.grip),
    },
    pressMilitar: {
      name: 'Press militar con barra', yaw: -42, pitch: 8, up: 'b', P: ['dA', 'dL'], S: ['tr', 'ts', 'sa'],
      at(t) {
        /* como en la app: la barra sale de lo alto del pecho, por delante de la barbilla, con los codos delante; pasa por
           delante de la cara (la cabeza un poco atrás) y acaba sobre la cabeza con los brazos estirados */
        const base = { root: [0, ROOT_Y, 0], tilt: 0, spine: -4 * Math.sin(Math.PI * t) + t, neck: -14 + 10 * t, feet: { L: [27, -2, 12], R: [27, -2, 12] }, knee: { L: [.2, 0, 1], R: [.2, 0, 1] } };
        const { F } = pose({ ...base, hands: { L: [0, 0, 0], R: [0, 0, 0] }, elbow: {} });
        const c = at(F.thorax, [0, 98 + 136 * t, 21 - 15 * t + 10 * Math.sin(Math.PI * t)]);
        /* los codos: delante y abajo al empezar; al subir, se abren hacia los lados, con el puño encima */
        const k1 = ease(Math.min(1, t / .4));
        const el = mix([.15, -.8, .6], [.85, -.3, .1], k1);
        /* las manos, justo por fuera de los hombros */
        return { ...base, barC: c, grip: 64, hands: { L: add(c, [64, 0, 0]), R: add(c, [-64, 0, 0]) }, elbow: { L: el, R: el }, shrug: 6 * t };
      },
      gear: (q, F, cam) => barbell(cam, q.barC, q.grip),
    },
    pressBanca: {
      name: 'Press banca', yaw: -30, pitch: 33, up: 'a', P: ['pe'], S: ['dA', 'tr'],
      at(t) {
        const base = { root: [0, 128, 10], tilt: -90, spine: 0, neck: 8, reach: -3, feet: { L: [56, 80, 20], R: [56, 80, 20] }, knee: { L: [.35, 1, .4], R: [.35, 1, .4] } };
        const { F } = pose({ ...base, hands: { L: [0, 0, 0], R: [0, 0, 0] }, elbow: {} });
        /* arriba, la barra sobre los hombros con los brazos estirados; abajo, toca el pecho a la altura de la parte baja del
           pectoral. Agarre de vez y media el ancho de los hombros; los codos, a unos 50° del cuerpo (ni pegados ni abiertos en
           cruz) y por debajo de la barra */
        const c = mix(at(F.thorax, [0, 80, 138]), at(F.thorax, [0, 56, 30]), t);
        return { ...base, barC: c, grip: 80, hands: { L: add(c, [80, 0, 0]), R: add(c, [-80, 0, 0]) }, elbow: { L: [.35, -.7, .65], R: [.35, -.7, .65] } };
      },
      /* el banco: la cabeza apoyada, y las piernas salen por el otro extremo con los pies en el suelo */
      gear: (q, F, cam) => [...[box(cam, [0, 2, -160], [38, 2, 7], '#1b1e2d', '#4d5370'), box(cam, [0, 2, 28], [38, 2, 7], '#1b1e2d', '#4d5370'), box(cam, [0, 44, -160], [5, 43, 5], '#1b1e2d', '#4d5370'), box(cam, [0, 44, 28], [5, 43, 5], '#1b1e2d', '#4d5370'),
        box(cam, [0, 94, -60], [32, 7, 128], '#343950', '#7078a0')].map((b, i) => ({ z: -1e6 + i, svg: b.svg })), ...barbell(cam, q.barC, q.grip)],
    },
  };

  const frameBox = (ex, cam) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    tmp.setAttribute('width', 0); tmp.setAttribute('height', 0); tmp.style.position = 'absolute';
    document.body.appendChild(tmp);
    for (let i = 0; i <= 12; i++) {
      tmp.innerHTML = draw(ex, i / 12, cam);
      const b = tmp.getBBox();
      x0 = min(x0, b.x); y0 = min(y0, b.y); x1 = max(x1, b.x + b.width); y1 = max(y1, b.y + b.height);
    }
    tmp.remove();
    return [x0, y0, x1 - x0, y1 - y0];
  };
  /* lo que hace falta para escribir ejercicios y material fuera de aquí */
  const lib = { add, sub, mul, dot, cross, len, norm, perp, mix, ease, clamp, at, turn, moved, RAD, LEN, bar, plate, box, barbell, kept, hull, smoothR, smooth, f1, pathOf, ik, isFist };
  G.Fig3D = { EX, draw, camera, DEFS, beat, frameBox, PARTS, pose, lib };
})(window);
