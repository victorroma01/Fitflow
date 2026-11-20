/* ═══ figuras 3D: el material ═══
   Las piezas con las que se arma el material de cada ejercicio (bancos, máquinas, mancuernas, poleas…), en las mismas
   unidades que el cuerpo (unas 0,45 cm por unidad; el suelo en y = 0). Cada pieza devuelve trozos { z, svg } que se
   ordenan con el cuerpo por su profundidad; lo que va debajo del cuerpo (bancos, asientos) se pinta siempre antes.
   Define: Fig3D.gear */
(function (G) {
  const F3 = G.Fig3D, L = F3.lib;
  const { add, sub, mul, dot, cross, len, norm, mix, bar, plate, kept, hull, smoothR, f1, pathOf } = L;
  const { cos, sin, PI, abs, max, min, round, sqrt } = Math;
  /* los colores: el armazón, oscuro y con el canto algo más claro; los acolchados, un poco más claros; el acero, como la barra */
  const C = { frame: ['#1b1e2d', '#4d5370'], pad: ['#343950', '#7078a0'], rubber: ['#0f1119', '#59607c'], iron: ['#1d2030', '#5d6482'], band: ['#454d6c', '#0a0b10'], strap: ['#2a2e40', '#0a0b10'], cable: '#9aa1bb' };
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
      out.push({ z: (P1[2] + P2[2]) / 2, svg: `<path d="M${f1(P1[0])} ${f1(P1[1])}L${f1(P2[0])} ${f1(P2[1])}" stroke="${col[1]}" stroke-width="${w + 2}" stroke-linecap="${cap}"/><path d="M${f1(Q1[0])} ${f1(Q1[1])}L${f1(Q2[0])} ${f1(Q2[1])}" stroke="${col[0]}" stroke-width="${w}" stroke-linecap="${cap}"/>` });
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
    else if (style == 'wheel') svg = `<path d="${side}" fill="#1d2030" stroke="#5d6482" stroke-width="1"/><path d="${face}" fill="#2b2f43" stroke="#5d6482" stroke-width="1"/><path d="${smoothR(ring(near, R * .35, 10))}" fill="#9aa1bb" stroke="#0a0b10" stroke-width=".7"/>`;
    else svg = `<g class="pl"><path d="${side}" fill="#0f1119" stroke="#59607c" stroke-width="1.2"/><path d="${face}" fill="#171a27" stroke="#59607c" stroke-width="1.2"/><path d="${smoothR(ring(near, R * .7, 20))}" fill="none" stroke="#2b2f43" stroke-width="1"/></g>`;
    return { z: cam.P(c)[2], svg };
  };
  /* una cinta o un cable: una línea con su borde oscuro, a trozos */
  const strap = (cam, pts, w, col = C.band) => {
    const out = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const P1 = cam.P(pts[i]), P2 = cam.P(pts[i + 1]);
      const d = `M${f1(P1[0])} ${f1(P1[1])}L${f1(P2[0])} ${f1(P2[1])}`;
      out.push({ z: (P1[2] + P2[2]) / 2, svg: `<path d="${d}" stroke="${col[1]}" stroke-width="${w + 1.6}" stroke-linecap="round"/><path d="${d}" stroke="${col[0]}" stroke-width="${w}" stroke-linecap="round"/>` });
    }
    return out;
  };
  const cableLine = (cam, a, b) => strap(cam, [a, b], 1.4, [C.cable, '#0a0b10']);
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
  const leg = (cam, top, w = 5, foot = 34) => [obox(cam, [top[0], top[1] / 2, top[2]], [[1, 0, 0], UP], [w, top[1] / 2, w], C.frame), obox(cam, [top[0], 2, top[2]], [[1, 0, 0], UP], [foot, 2, 7], C.frame)];

  /* ── máquinas ── */
  /* el armazón de una Smith: dos guías verticales a ±xr, en el plano z = zr, y el travesaño de arriba */
  const smithFrame = (cam, zr, xr = 128, top = 470) => [
    ...tube(cam, [xr, 0, zr], [xr, top, zr], 6, C.frame, 10), ...tube(cam, [-xr, 0, zr], [-xr, top, zr], 6, C.frame, 10),
    ...tube(cam, [xr, top, zr], [-xr, top, zr], 6, C.frame, 6),
    obox(cam, [xr, 3, zr], [[1, 0, 0], UP], [8, 3, 46], C.frame), obox(cam, [-xr, 3, zr], [[1, 0, 0], UP], [8, 3, 46], C.frame),
  ];
  /* los ganchos de la barra de la Smith, en las guías */
  const smithHooks = (cam, c, xr = 128) => [-1, 1].flatMap(k => tube(cam, [k * xr, c[1], c[2]], [k * xr, c[1] + 9, c[2] - 7], 2.4, ['#7d849e', '#0a0b10'], 1));
  /* una torre de polea: el poste, la polea abajo (o a la altura h) y el cable hasta la mano */
  const pulleyTower = (cam, base, h, to) => {
    const out = [{ ...obox(cam, [base[0], 235, base[2]], [[1, 0, 0], UP], [9, 235, 9], C.frame), nf: true }, obox(cam, [base[0], 3, base[2]], [[1, 0, 0], UP], [26, 3, 26], C.frame)];
    const p = [base[0] + (to[0] > base[0] ? 14 : -14), h, base[2]];
    out.push(disc(cam, p, [0, 0, 1], 7, 4, 'wheel'));
    out.push(...cableLine(cam, p, to));
    return out;
  };

  F3.gear = { C, tone, basis, obox, tube, disc, strap, cableLine, sag, dumbbell, kettlebell, sandbag, under, padAB, leg, smithFrame, smithHooks, pulleyTower };
})(window);
