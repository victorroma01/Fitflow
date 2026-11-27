/* ═══ figuras 3D: el material ═══
   Las piezas con las que se arma el material de cada ejercicio (bancos, máquinas, mancuernas, poleas…), en las mismas
   unidades que el cuerpo (unas 0,45 cm por unidad; el suelo en y = 0). Cada pieza devuelve trozos { z, svg } que se
   ordenan con el cuerpo por su profundidad; lo que va debajo del cuerpo (bancos, asientos) se pinta siempre antes.
   Define: Fig3D.gear */
(function (G) {
  const F3 = G.Fig3D, L = F3.lib;
  const { add, sub, mul, dot, cross, len, norm, mix, bar, hull, smoothR, f1, pathOf } = L;
  const { cos, sin, PI, abs, max, min, round, sqrt, ceil } = Math;
  /* los colores: el armazón, oscuro y con el canto algo más claro; los acolchados, un poco más claros; el acero, como la barra */
  /* las bandas elásticas, siempre en cian: así se distinguen de un vistazo de cables, cintas y barras */
  const C = { frame: ['#1b1e2d', '#4d5370'], pad: ['#343950', '#7078a0'], rubber: ['#0f1119', '#59607c'], iron: ['#1d2030', '#5d6482'], band: ['#22d3ee', '#063845'], strap: ['#2a2e40', '#0a0b10'], trx: ['#b3473a', '#2b0a07', '#de7b64'], cable: '#9aa1bb' };
  /* un color algo más claro (k > 0) o más oscuro (k < 0) */
  const tone = (hex, k) => {
    const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => round(k > 0 ? v + (255 - v) * k : v * (1 + k)));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  };
  /* dos ejes perpendiculares a uno dado */
  const basis = a => { a = norm(a); const t = abs(a[1]) < .9 ? [0, 1, 0] : [1, 0, 0]; const u = norm(cross(a, t)); return [a, u, cross(a, u)]; };
  const XY = (cam, p) => { const q = cam.P(p); return f1(q[0]) + ' ' + f1(q[1]); };
  const UP = [0, 1, 0];

  /* una caja con sus ejes (ax[0], ax[1]; el tercero sale de ellos) y sus medios lados; las caras que miran arriba, más claras */
  const obox = (cam, c, ax, h, col, z) => {
    const ux = norm(ax[0]), uy = norm(ax[1]), uz = cross(ux, uy), pts = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) pts.push(add(c, add(add(mul(ux, sx * h[0]), mul(uy, sy * h[1])), mul(uz, sz * h[2]))));
    const faces = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
    const svg = faces.map(f => {
      const n = norm(cross(sub(pts[f[1]], pts[f[0]]), sub(pts[f[2]], pts[f[0]])));
      if (dot(n, cam.c) <= 0) return '';
      const fill = n[1] > .5 ? tone(col[0], .1) : n[1] < -.5 ? tone(col[0], -.25) : col[0];
      return `<path d="${pathOf(cam, f.map(i => pts[i]))}" fill="${fill}" stroke="${col[1]}" stroke-width="1.2" stroke-linejoin="round"/>`;
    }).join('');
    return { z: z != null ? z : cam.P(c)[2], svg };
  };
  /* un tubo del armazón (o una barra fina), a trozos para que se ordene bien con el cuerpo */
  const tube = (cam, a, b, w, col = C.frame, n) => {
    const l = len(sub(b, a)) || 1;
    n = n || max(1, round(l / 40));
    const out = [], ext = .4 / l;
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const P1 = cam.P(mix(a, b, t0)), P2 = cam.P(mix(a, b, t1)), Q1 = cam.P(mix(a, b, max(0, t0 - ext))), Q2 = cam.P(mix(a, b, min(1, t1 + ext)));
      const cap = i == 0 || i == n - 1 ? 'round' : 'butt';
      out.push({ z: (P1[2] + P2[2]) / 2, mid: mix(a, b, (t0 + t1) / 2), ax: norm(sub(b, a)), svg: `<path d="M${f1(P1[0])} ${f1(P1[1])}L${f1(P2[0])} ${f1(P2[1])}" stroke="${col[1]}" stroke-width="${w + 2}" stroke-linecap="${cap}"/><path d="M${f1(Q1[0])} ${f1(Q1[1])}L${f1(Q2[0])} ${f1(Q2[1])}" stroke="${col[0]}" stroke-width="${w}" stroke-linecap="${cap}"/>` });
    }
    return out;
  };
  /* un disco con su eje en cualquier dirección: un disco de barra, la cabeza de una mancuerna, una polea */
  const disc = (cam, c, axis, R, w, style = 'plate') => {
    const [a, u, v] = basis(axis), n = R > 20 ? 24 : 16;
    const ring = (cc, r, m = n) => { const out = []; for (let i = 0; i < m; i++) { const t = i / m * 2 * PI; out.push(cam.P(add(cc, add(mul(u, r * cos(t)), mul(v, r * sin(t)))))); } return out; };
    const sg = dot(a, cam.c) > 0 ? 1 : -1, near = add(c, mul(a, sg * w / 2)), far = add(c, mul(a, -sg * w / 2));
    const side = smoothR(hull(ring(near, R).concat(ring(far, R)))), face = smoothR(ring(near, R));
    let svg;
    if (style == 'metal') svg = `<path d="${side}" fill="#7d849e" stroke="#0a0b10" stroke-width="1"/><path d="${face}" fill="#b9bed0" stroke="#0a0b10" stroke-width="1"/>`;
    else if (style == 'head') svg = `<path d="${side}" fill="#161925" stroke="#5d6482" stroke-width="1.1"/><path d="${face}" fill="#232738" stroke="#5d6482" stroke-width="1.1"/><path d="${smoothR(ring(near, R * .42, 12))}" fill="#7d849e" stroke="#0a0b10" stroke-width=".8"/>`;
    /* (un neumático: la banda de rodadura y la cara de goma, con el hueco de la llanta en medio) */
    else if (style == 'tire') svg = `<path d="${side}" fill="#14161f" stroke="#4a5068" stroke-width="1.3"/><path d="${face}" fill="#1d2030" stroke="#4a5068" stroke-width="1.3"/><path d="${smoothR(ring(near, R * .5, 20))}" fill="#0a0b10" stroke="#3a3f56" stroke-width="1.2"/><path d="${smoothR(ring(near, R * .82, 24))}" fill="none" stroke="#2a2e40" stroke-width="1"/>`;
    else if (style == 'wheel') svg = `<path d="${side}" fill="#1d2030" stroke="#5d6482" stroke-width="1"/><path d="${face}" fill="#2b2f43" stroke="#5d6482" stroke-width="1"/><path d="${smoothR(ring(near, R * .35, 10))}" fill="#9aa1bb" stroke="#0a0b10" stroke-width=".7"/>`;
    else svg = `<g class="pl"><path d="${side}" fill="#0f1119" stroke="#59607c" stroke-width="1.2"/><path d="${face}" fill="#171a27" stroke="#59607c" stroke-width="1.2"/><path d="${smoothR(ring(near, R * .7, 20))}" fill="none" stroke="#2b2f43" stroke-width="1"/></g>`;
    return { z: cam.P(c)[2], mid: c, svg };
  };
  /* una cinta o un cable: una línea con su borde oscuro, a trozos cortos (de unos 30) para que cada trozo se ordene con el
     cuerpo por su propia profundidad: un cable largo que pasa por delante de una pierna y por detrás de la otra se ve así como
     es. Como en la barra, los trozos van a tope y el relleno pasa un poco de cada unión para tapar la costura; solo los
     extremos llevan remate redondo */
  const strap = (cam, pts, w, col = C.band) => {
    const out = [], P = [];
    for (let i = 0; i + 1 < pts.length; i++) { const n = max(1, ceil(len(sub(pts[i + 1], pts[i])) / 30)); for (let k = 0; k < n; k++) P.push(mix(pts[i], pts[i + 1], k / n)); }
    P.push(pts[pts.length - 1]);
    const S = P.map(p => cam.P(p)), m = S.length - 1;
    for (let i = 0; i < m; i++) {
      const A = S[i], B = S[i + 1], dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1, e = .5 / l;
      const a0 = i == 0 ? 0 : -e, b0 = i == m - 1 ? 0 : e;
      const d = `M${f1(A[0])} ${f1(A[1])}L${f1(B[0])} ${f1(B[1])}`, df = `M${f1(A[0] + dx * a0)} ${f1(A[1] + dy * a0)}L${f1(B[0] + dx * b0)} ${f1(B[1] + dy * b0)}`;
      const cap = m == 1 ? 'round' : i == 0 || i == m - 1 ? 'round' : 'butt';
      /* con un tercer color (la cinta del TRX), una raya fina por el centro, como una cincha */
      const stripe = col[2] ? `<path d="${df}" stroke="${col[2]}" stroke-width="${f1(w * .26)}" stroke-linecap="${cap}"/>` : '';
      /* (mid: el punto medio del trozo en 3D, para ordenarlo según lo que de verdad lo tapa) */
      out.push({ z: (A[2] + B[2]) / 2, mid: mix(P[i], P[i + 1], .5), svg: `<path d="${d}" stroke="${col[1]}" stroke-width="${w + 1.6}" stroke-linecap="${cap}"/><path d="${df}" stroke="${col[0]}" stroke-width="${w}" stroke-linecap="${cap}"/>${stripe}` });
    }
    return out;
  };
  const cableLine = (cam, a, b) => strap(cam, [a, b], 1.4, [C.cable, '#0a0b10']);
  /* una banda elástica: un lazo de dos tiras tensas, de a (donde está sujeta) a b (la mano o la barra), un poco separadas
     (sep, a lo largo de dir); cuanto más se estira respecto a su largo en reposo (l0), más fina */
  const bandLoop = (cam, a, b, l0, dir = [0, 0, 1], sep = 3) => {
    const l = len(sub(b, a)) || 1, w = max(1.6, min(4, 3.4 * sqrt(l0 / l)));
    return [-1, 1].flatMap(k => strap(cam, [add(a, mul(dir, k * sep)), add(b, mul(dir, k * sep * .45))], w, C.band));
  };
  /* una banda elástica por un camino (pts: de donde está sujeta a la mano), con sus dos tiras separadas a lo largo de dir; el
     grosor, según lo que se estira el camino entero respecto a su largo en reposo (l0) */
  const bandPath = (cam, pts, l0, dir = [0, 0, 1], sep = 3) => {
    const seg = pts.slice(1).map((p, i) => len(sub(p, pts[i]))), l = seg.reduce((s, v) => s + v, 0) || 1, w = max(1.6, min(4, 3.4 * sqrt(l0 / l)));
    let run = 0;
    const f = pts.map((p, i) => i ? (run += seg[i - 1]) / l : 0);
    return [-1, 1].flatMap(k => strap(cam, pts.map((p, i) => add(p, mul(dir, k * sep * (1 - .55 * f[i])))), w, C.band));
  };
  /* una curva suave entre dos puntos que cuelga (o se tensa) hacia dir: para las bandas */
  const sag = (a, b, dir, k, n = 6) => { const out = []; for (let i = 0; i <= n; i++) { const t = i / n; out.push(add(mix(a, b, t), mul(dir, k * 4 * t * (1 - t)))); } return out; };

  /* ── lo que se lleva en la mano ── */
  /* una mancuerna: el asa (dentro del puño, siempre detrás de la mano que la agarra) y las dos cabezas */
  const dumbbell = (cam, c, axis, hand, o = {}) => {
    const a = norm(axis), hl = o.handle || 15, hw = o.w || 18, R = o.R || 14.5, out = [];
    const h = bar(cam, add(c, mul(a, -hl - 1)), add(c, mul(a, hl + 1)), 1, 4.4);
    if (hand) h.forEach(i => { i.hand = hand; });
    out.push(...h);
    [-1, 1].forEach(s => out.push(disc(cam, add(c, mul(a, s * (hl + hw / 2))), a, R, hw, 'head')));
    return out;
  };
  /* una kettlebell: la bola (B, su centro) y el asa, que pasa por el puño (H) a lo largo de xa */
  const kettlebell = (cam, B, H, xa, hand, R = 20) => {
    const P = cam.P(B), u = norm(sub(H, B)), x = norm(xa), out = [];
    const ball = `<circle cx="${f1(P[0])}" cy="${f1(P[1])}" r="${R}" fill="#1d2030" stroke="#5d6482" stroke-width="1.2"/><circle cx="${f1(P[0] - R * .3)}" cy="${f1(P[1] - R * .32)}" r="${f1(R * .42)}" fill="#2c3146"/>`;
    out.push({ z: P[2], svg: ball });
    // el asa: de la bola a un lado del puño, por el puño y de vuelta a la bola
    const b1 = add(B, add(mul(u, R * .62), mul(x, -R * .62))), b2 = add(B, add(mul(u, R * .62), mul(x, R * .62)));
    const pts = [b1, add(H, add(mul(x, -12), mul(u, -4))), add(H, mul(x, -9)), add(H, mul(x, 9)), add(H, add(mul(x, 12), mul(u, -4))), b2];
    const d = 'M' + pts.map(p => XY(cam, p)).join('L');
    const it = { z: cam.P(H)[2] - 2, svg: `<path d="${d}" fill="none" stroke="#0a0b10" stroke-width="5.4" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#3a4058" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/>` };
    if (hand) it.hand = hand;
    out.push(it);
    return out;
  };
  /* una bola (balón medicinal, wall ball): un círculo con su brillo y su costura, que se ordena por su centro */
  const MB = ['#2a2318', '#8a7a58', '#4a3f2a'];
  const ball = (cam, c, r, col = MB) => {
    const P = cam.P(c);
    return [{ z: P[2], svg: `<circle cx="${f1(P[0])}" cy="${f1(P[1])}" r="${f1(r)}" fill="${col[0]}" stroke="${col[1]}" stroke-width="1.3"/><ellipse cx="${f1(P[0] - r * .32)}" cy="${f1(P[1] - r * .36)}" rx="${f1(r * .42)}" ry="${f1(r * .3)}" fill="${col[2]}" opacity=".7"/><path d="M${f1(P[0] - r)} ${f1(P[1])}Q${f1(P[0])} ${f1(P[1] + r * .38)} ${f1(P[0] + r)} ${f1(P[1])}" fill="none" stroke="${col[1]}" stroke-width="1" opacity=".5"/>` }];
  };
  /* un saco (sandbag): un cilindro blando, a lo largo de ax */
  const sandbag = (cam, c, ax, hl, r) => {
    const [a, u, v] = basis(ax), pts = [];
    for (let i = 0; i <= 6; i++) {
      const s = -1 + 2 * i / 6, rr = r * sqrt(max(.15, 1 - s ** 8));
      for (let j = 0; j < 14; j++) { const t = j / 14 * 2 * PI; pts.push(cam.P(add(c, add(mul(a, s * hl), add(mul(u, rr * cos(t)), mul(v, rr * sin(t))))))); }
    }
    const seam = [-hl * .55, hl * .55].map(s => add(c, mul(a, s)));
    return [{ z: cam.P(c)[2], svg: `<path d="${smoothR(hull(pts))}" fill="#2b2e3c" stroke="#666d88" stroke-width="1.2"/><path d="M${XY(cam, seam[0])}L${XY(cam, seam[1])}" stroke="#40455c" stroke-width="2.2" stroke-linecap="round"/>` }];
  };

  /* ── bancos, asientos, cajas (debajo del cuerpo: se pintan antes que él) ── */
  const under = (items, k = 0) => items.map((i, n) => ({ z: -1e6 + k + n * .01, svg: i.svg }));
  /* un acolchado plano entre dos puntos de su eje largo (a → b), con la cara de arriba hacia nrm */
  const padAB = (cam, a, b, nrm, hw, ht, col = C.pad) => {
    const u = norm(sub(b, a)), n = norm(nrm), x = cross(u, n);
    return obox(cam, mix(a, b, .5), [x, n], [hw, ht, len(sub(b, a)) / 2], col);
  };
  /* una pata: de un punto del banco al suelo, con su pie */
  const leg = (cam, top, w = 5, foot = 34) => [obox(cam, [top[0], top[1] / 2, top[2]], [[1, 0, 0], UP], [w, top[1] / 2, w], C.frame), obox(cam, [top[0], 2, top[2]], [[1, 0, 0], UP], [foot, 2, 7], C.frame), ...[-1, 1].map(k => obox(cam, [top[0] + k * (foot - 3), 2.5, top[2]], [[1, 0, 0], UP], [4, 2.5, 7.6], C.rubber))];

  /* ── máquinas ── */
  /* la Smith: dos guías de acero verticales a ±xr, en el plano z = zr, con su travesaño arriba y su base; la barra va sujeta a
     dos carros que suben y bajan por ellas (smithHooks) */
  const STEEL = ['#c3c8d8', '#0a0b10'];
  /* lo que, visto de lado, queda entre la cámara y el cuerpo (las guías de la Smith, los postes de una barra): en la vista de
     lado se aclara como los discos, para que se vea la postura */
  const sideFade = items => items.map(i => ({ ...i, svg: `<g class="pl">${i.svg}</g>` }));
  const smithFrame = (cam, zr, xr = 128, top = 470) => sideFade([
    ...tube(cam, [xr, 6, zr], [xr, top, zr], 4.6, STEEL, 12), ...tube(cam, [-xr, 6, zr], [-xr, top, zr], 4.6, STEEL, 12),
    ...tube(cam, [xr, top + 6, zr], [-xr, top + 6, zr], 7, C.frame, 6),
    obox(cam, [xr, 3, zr], [[1, 0, 0], UP], [10, 3, 46], C.frame), obox(cam, [-xr, 3, zr], [[1, 0, 0], UP], [10, 3, 46], C.frame),
  ]);
  /* los carros: cada uno abraza su guía a la altura de la barra (la barra pasa por ellos), con el gancho para dejarla */
  const smithHooks = (cam, c, xr = 128) => [-1, 1].flatMap(k => {
    const p = [k * xr, c[1], c[2]], it = obox(cam, p, [[1, 0, 0], UP], [8, 15, 8], ['#2a2f44', '#8c93b0']);
    it.z = cam.P(p)[2] + 9;
    const hook = tube(cam, add(p, [0, 4, -8]), add(p, [0, 13, -15]), 2.6, STEEL, 1).map(i => ({ ...i, z: it.z + .1 }));
    return [it, ...hook];
  });
  /* la pila de pesas de una máquina de placas: la base, las dos guías, las placas (de hierro, con su canto) atravesadas por la
     varilla, el pasador que elige el peso y el travesaño de arriba. c: el centro de la base en el suelo; f: hacia dónde mira su
     cara ancha; n: cuántas placas; lift: lo que suben las de arriba (las que se levantan) */
  const IRON = ['#262a3c', '#6a7190'];
  const stack = (cam, c, f = [0, 0, 1], n = 12, lift = 0) => {
    const a = norm([f[0], 0, f[2]]), s = [a[2], 0, -a[0]], PH = 6.4, W = 17, D = 8, top = 10 + n * PH, rodTop = top + 64, out = [];
    out.push(obox(cam, add(c, [0, 5, 0]), [s, UP], [W + 7, 5, D + 7], C.frame));
    [-1, 1].forEach(k => out.push(...tube(cam, add(c, add(mul(s, k * (W + 3.5)), [0, 10, 0])), add(c, add(mul(s, k * (W + 3.5)), [0, rodTop, 0])), 1.9, STEEL, 3)));
    for (let i = 0; i < n; i++) { const up = i >= n - 5 ? lift : 0; out.push(obox(cam, add(c, [0, 10 + PH * (i + .5) + up, 0]), [s, UP], [W, PH / 2 - .5, D], IRON)); }
    /* la varilla que sube de la placa de arriba (donde va el cable), el pasador en la quinta empezando por arriba y el travesaño */
    out.push(...tube(cam, add(c, [0, top + lift, 0]), add(c, [0, top + 40 + lift, 0]), 1.7, STEEL, 1));
    const yp = 10 + PH * (n - 5.5) + lift;
    out.push(...tube(cam, add(add(c, [0, yp, 0]), mul(a, D)), add(add(c, [0, yp, 0]), mul(a, D + 7)), 1.6, ['#d9b44a', '#3a2a00'], 1));
    out.push(obox(cam, add(c, [0, rodTop + 3, 0]), [s, UP], [W + 7, 3, D + 4], C.frame));
    return out;
  };
  /* una torre de polea: la columna, con su tapa, el carro que lleva la polea a la altura h, la pila de pesas al otro lado de
     la columna y el cable hasta la mano */
  /* (o.reach: la polea, colgada al final de un brazo que sale del poste o.reach hacia o.dir, en vez de pegada a él: el cable
     baja separado de la columna. En las extensiones de tríceps en polea alta el cable bajaba rozando la columna) */
  const pulleyTower = (cam, base, h, to, o = {}) => {
    const post = { ...obox(cam, [base[0], 236, base[2]], [[1, 0, 0], UP], [9, 236, 9], C.frame), nf: true };
    const out = [post, obox(cam, [base[0], 3, base[2]], [[1, 0, 0], UP], [26, 3, 26], C.frame), obox(cam, [base[0], 474, base[2]], [[1, 0, 0], UP], [12, 4, 12], C.frame)];
    /* la polea, en el lado del poste que da al cuerpo (siempre el mismo: si dependiera de la mano, saltaría de un lado a otro) */
    const side = base[0] < 0 ? 1 : -1;
    let p = [base[0] + side * 14, h, base[2]];
    if (o.reach) {
      /* el brazo: del carro del poste, en horizontal, hasta la polea; la rueda cuelga en su extremo, girando en el plano del
         cable */
      const d = norm([o.dir[0], 0, o.dir[2]]), end = add([base[0], h + 12, base[2]], mul(d, o.reach)), ax = cross(d, UP);
      p = [end[0], h, end[2]];
      out.push(obox(cam, [base[0], h + 12, base[2]], [[1, 0, 0], UP], [11.5, 9, 11.5], C.iron), ...beam(cam, [base[0], h + 12, base[2]], end, 5), ...tube(cam, end, add(p, [0, 2, 0]), 2.4, STEEL, 1));
      out.push(disc(cam, p, ax, 9, 4.5, 'wheel'), disc(cam, p, ax, 3, 5, 'metal'));
    } else {
      out.push(obox(cam, [base[0], h, base[2]], [[1, 0, 0], UP], [11.5, 9, 11.5], C.iron), ...tube(cam, [base[0] + side * 11, h, base[2]], add(p, [-side * 2, 0, 0]), 2.4, STEEL, 1));
      out.push(disc(cam, p, [0, 0, 1], 9, 4.5, 'wheel'), disc(cam, p, [0, 0, 1], 3, 5, 'metal'));
    }
    /* la pila, al otro lado de la columna (no entre la columna y el cuerpo) */
    out.push(...stack(cam, [base[0] - side * 30, 0, base[2]], [side, 0, 0], 12), obox(cam, [base[0] - side * 15, 3, base[2]], [[1, 0, 0], UP], [15, 3, 7], C.frame));
    /* el poste es una sola pieza (con la profundidad de su centro): cada trozo del cable se pinta delante o detrás de él según
       quede delante o detrás del poste a su misma altura, y no según el centro del poste (que hacía aparecer y desaparecer el
       cable al moverse) */
    const L = cableLine(cam, p, to), n = L.length;
    L.forEach((it, i) => { const m = mix(p, to, (i + .5) / n), d = cam.P(m)[2] - cam.P([base[0], m[1], base[2]])[2]; it.z = d >= 0 ? max(it.z, post.z + 1e-3) : min(it.z, post.z - 1e-3); });
    out.push(...L);
    return out;
  };

  /* el puesto de una polea que no va en torre (jalón, remo sentado): la columna, a d de la polea alejándose del cuerpo (away),
     el brazo que la sostiene, la rueda y la pila de pesas al pie de la columna */
  const station = (cam, pul, away, o = {}) => {
    const a = norm([away[0], 0, away[2]]), b = add([pul[0], 0, pul[2]], mul(a, o.d || 40)), H = o.h || 470, out = [];
    out.push({ ...obox(cam, [b[0], H / 2, b[2]], [[1, 0, 0], UP], [10, H / 2, 10], C.frame), nf: true }, obox(cam, [b[0], 3, b[2]], [[1, 0, 0], UP], [30, 3, 30], C.frame));
    const arm = [b[0], pul[1] + (pul[1] > 60 ? 12 : 0), b[2]];
    out.push(...tube(cam, arm, add(pul, [0, pul[1] > 60 ? 12 : 0, 0]), 6, C.frame, 2), disc(cam, pul, [1, 0, 0], 9, 4.5, 'wheel'), disc(cam, pul, [1, 0, 0], 3, 5, 'metal'));
    if (pul[1] > 60) out.push(obox(cam, [b[0], H + 4, b[2]], [[1, 0, 0], UP], [13, 4, 13], C.frame));
    out.push(...stack(cam, add(b, mul(a, 32)), mul(a, -1), 12), obox(cam, add(add(b, mul(a, 16)), [0, 3, 0]), [[a[2], 0, -a[0]], UP], [8, 3, 16], C.frame));
    return out;
  };

  /* ── piezas de las máquinas ── */
  /* una viga del armazón, de sección cuadrada (medio lado w), de a a b; si pasa junto al cuerpo, a n trozos, para que cada uno
     se ordene con él por su propia profundidad (si no, de una pieza: los trozos dejan rayas). Con ellas, las máquinas son de una
     pieza (antes, postes y varillas finas sueltos) */
  const beam = (cam, a, b, w = 6, col = C.frame, n = 1) => {
    const d = sub(b, a), L = len(d) || 1, u = mul(d, 1 / L), side = basis(u)[1], out = [];
    for (let i = 0; i < n; i++) out.push(obox(cam, mix(a, b, (i + .5) / n), [side, u], [w, L / n / 2 + .3, w], col));
    return out;
  };
  /* el eje de una palanca: el cubo (un disco gordo) con su tapa de metal */
  const hub = (cam, c, axis, r = 8.5) => [disc(cam, c, axis, r, 11, 'wheel'), disc(cam, c, axis, r * .42, 13, 'metal')];
  /* el puño de goma de un asa, de a a b */
  const rubber = (cam, a, b, r = 4.4) => tube(cam, a, b, r, C.rubber, 1);
  /* un cuerno para discos (de a hacia dir) con n discos puestos */
  const horn = (cam, a, dir, n = 2) => {
    const u = norm(dir), out = [...tube(cam, a, add(a, mul(u, 30)), 3.4, STEEL, 1)];
    for (let i = 0; i < n; i++) out.push(disc(cam, add(a, mul(u, 9 + i * 6.5)), u, 30 - i * 6, 5.5));
    return out;
  };

  F3.gear = { C, IRON, tone, basis, obox, tube, disc, strap, cableLine, bandLoop, bandPath, sag, dumbbell, kettlebell, ball, sandbag, under, padAB, leg, smithFrame, smithHooks, pulleyTower, stack, station, sideFade, beam, hub, rubber, horn };
})(window);
