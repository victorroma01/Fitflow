/* ═══ figuras 3D: hombro, pecho y espalda alta (lote 5) ═══
   Flexiones, press de pecho de pie y en máquina, pájaros, elevaciones laterales y frontales, aperturas y cruces de poleas,
   encogimientos, remo al mentón, face pull, jalón con brazos rectos y pullover. Usa lo de brazos3d.js (F3.blib): el brazo
   se da por la dirección del brazo y lo que se dobla el codo, y lo que agarra la mano va en el puño.
   Define: Fig3D.FAMILIES.pushup, .pressOut, .rearFly, .lateral, .cross, .shrug, .frontRaise, .fly, .upright, .facePull,
   .straightArm, .pullover */
(function (G) {
  const F3 = G.Fig3D, L = F3.lib, GR = F3.gear, M = F3.mlib, B = F3.blib;
  const { add, sub, mul, dot, len, norm, mix, ease, at, RAD, LEN, bar } = L;
  const { has, pose, torso, pivotFor, leverAt, ZERO, UP, sd, both, shoulder, comOf, solve, legRoot, midFoot, ezBar, ezCd, dbAxis, bodyCaps, taut, olympic } = M;
  const { STAND, SEAT, LU, LF, STEEL, dirT, hintL, armAt, onHip, frontAt, keys, cycle, curlBar, handle, rope, flatBench, benchUnder } = B;
  const { cos, sin, max, min, sqrt } = Math;

  /* una dirección por dos ángulos (grados): h, de delante (0) hacia fuera (90); el, hacia arriba */
  const sph = (h, el) => [cos(RAD(el)) * sin(RAD(h)), sin(RAD(el)), cos(RAD(el)) * cos(RAD(h))];
  /* el brazo s con la dirección del brazo u (en el tronco o, con o.world, en el mundo; dada para el lado izquierdo) y el codo
     doblado e grados hacia o.n */
  const armU = (F, q, s, u, e, o = {}) => {
    const S = shoulder(F, s, q), D = o.world ? (d => sd(s, d)) : (d => dirT(F, s, d));
    u = norm(u);
    let n = o.n || [0, 0, 1]; n = sub(n, mul(u, dot(n, u))); n = len(n) > 1e-3 ? norm(n) : norm(sub([0, 1, 0], mul(u, u[1])));
    const k = RAD(e), v = add(mul(u, cos(k)), mul(n, sin(k))), E = add(S, mul(D(u), LU)), vw = D(v), H = add(E, mul(vw, LF));
    return { S, E, H, v: vw, hint: hintL(s, norm(add(sub(E, mix(S, H, .5)), mul(D(n), -2)))) };
  };
  /* las manos y los codos de los brazos ss, con fn(s) = { H, hint, bd } */
  const arms = (ss, fn) => { const o = { hands: {}, elbow: {}, barDir: {} }; for (const s of ss) { const a = fn(s); o.hands[s] = a.H; o.elbow[s] = a.hint; o.barDir[s] = a.bd || [0, 0, 1]; } return o; };
  /* la mano izquierda, libre, en la cadera */
  const freeL = (F, o) => { const h = onHip(F, 'L'); o.hands.L = h.hand; o.elbow.L = h.elbow; o.palm = { L: h.palm }; o.fist = { L: false }; o.barDir.L = [1, 0, 0]; return o; };
  /* de pie con un pie delante y el tronco algo inclinado (los gestos de polea y banda) */
  const SPLIT = { ...STAND, tilt: 6, spine: 2, neck: -4, feet: { L: [22, 32, 8], R: [24, -30, 12] }, knee: { L: [.2, .2, 1], R: [.2, 0, 1] } };
  const towers = (cam, q, x, z, h, ss = ['L', 'R'], to = s => q.hands[s]) => ss.flatMap(s => GR.pulleyTower(cam, [sd(s, [x, 0, 0])[0], 0, z], h, to(s)));
  const handles = (cam, F, q, ss = ['L', 'R']) => ss.flatMap(s => handle(cam, F, s, q.hands[s]));
  const shortBar = (cam, c, g) => { const X = x => add(c, [x, 0, 0]); return [[-34, -g - 8], [-g + 8, g - 8], [g + 8, 34]].flatMap(([a, b]) => b - a > 1 ? bar(cam, X(a), X(b), 1, 5) : []); };
  /* la banda de cada pie a su mano, por fuera de la pierna */
  const footBands = (cam, q, F, ss = ['L', 'R']) => { const { J } = pose(q), caps = bodyCaps(J).map(([a, b, r], i) => [a, b, r + (i % 4 == 3 ? 10 : 8.5)]); return ss.flatMap(s => GR.bandPath(cam, taut(at(F['foot' + s], [0, -19, 12]), q.hands[s], caps, [0, 0, 1], 14, 36, mul(norm([s == 'L' ? 1 : -1, 0, .3]), 30)), 105, F['foot' + s].x, 4)); };
  /* una banda de un anclaje a cada mano (un poste o una espaldera, fijos) */
  /* (la banda sale del lado del puño que da al anclaje, para no correr por el antebrazo) */
  const anchorBands = (cam, q, A, ss = ['L', 'R']) => [GR.obox(cam, [A[0], A[1] / 2, A[2]], [[1, 0, 0], UP], [7, A[1] / 2, 7], GR.C.frame), ...ss.flatMap(s => { const h = q.hands[s], d = norm(sub(A, h)); return GR.bandLoop(cam, add(A, sd(s, [6, 0, 0])), add(add(h, mul(d, 9)), sd(s, [14, 0, 0])), 140, [1, 0, 0], 2.5); })];

  /* las flexiones en TRX con las manos en las asas: de pie y de espaldas al anclaje, el cuerpo recto e inclinado hacia delante
     desde los pies; el pecho baja entre las asas y los brazos empujan hasta estirarse (arriba, perpendiculares al cuerpo). Las
     cintas van del anclaje, alto y detrás, a las asas, por encima de los brazos */
  const trxPress = () => {
    const ankleY = 40.6, Lg = LEN.thigh + LEN.shin - 2, zA = -150;
    const mk = th => ({ root: [0, ankleY + Lg * sin(RAD(th)), zA + Lg * cos(RAD(th))], tilt: 90 - th, spine: 0, neck: 8, feet: both(() => [12, zA - 3, 0, ankleY - LEN.ankle, 65]), knee: both(() => [0, -1, .1]) });
    const at_ = t => {
      const q = mk(mix(56, 42, ease(t))), { F } = pose({ ...q, hands: ZERO, elbow: {} });
      return { ...q, hands: both(s => at(F.thorax, sd(s, mix([60, 66, 140], [74, 62, 32], ease(t))))), elbow: both(() => [.55, .28, -.8]), barDir: both(() => [1, 0, 0]) };
    };
    const A = [0, 820, zA + 60];
    const gear = (q, F, cam) => ['L', 'R'].flatMap(s => { const h = q.hands[s]; return [...GR.strap(cam, [add(h, sd(s, [9, 6, 0])), A], 6, GR.C.trx).map(i => ({ ...i, nf: true })), ...GR.tube(cam, add(h, [-9, 0, 0]), add(h, [9, 0, 0]), 5, STEEL, 1).map(i => ({ ...i, hand: s }))]; });
    return { view: 'front', up: 'a', rest: 'a', cam: [-64, 14], feetOff: true, at: at_, gear };
  };

  /* ════ flexiones ════ */
  const pushup = f => {
    const w = x => has(f, x), rings = w('rings'), trx = w('trx'), par = w('parallettes'), feetUp = w('feetup'), handsUp = w('handsup');
    /* (en el TRX, con los pies en las cunas: TRX flexiones; con las manos en las asas, de pie: flexiones en TRX) */
    if (trx && !w('feet')) return trxPress();
    const diamond = w('diamond'), archer = w('archer'), clap = w('clap'), weight = w('weight'), grips = rings || par;
    /* las manos, quietas: en el suelo (abiertas, los dedos hacia delante), en un banco, en las anillas o en las paralelas;
       en el TRX, las manos en el suelo y los pies colgados en las cunas */
    const hx = diamond ? 10 : archer ? 120 : 54, hy = handsUp ? 92 : rings ? 30 : par ? 24 : 0;
    /* (la mano abierta, plana: la palma apoyada, con la muñeca a su altura, y los dedos hacia delante) */
    const hd = grips ? null : both(() => norm([0, -.5, 15]));
    const Hs = both(s => [sd(s, [hx, 0, 0])[0], hy + (grips ? 0 : 3.9), 0]);
    const W = s => hd ? sub(Hs[s], mul(hd[s], LEN.grip)) : Hs[s];
    /* el cuerpo, recto desde las puntas de los pies (el pie, perpendicular a la espinilla); gira alrededor de los tobillos */
    const ankleY = (feetUp ? 92 : trx ? 62 : 0) + 40.6, Lg = LEN.thigh + LEN.shin - 2;
    const mk = (th, zA, dx = 0) => ({ root: [dx, ankleY + Lg * sin(RAD(th)), zA + Lg * cos(RAD(th))], tilt: 90 - th, spine: 0, neck: 8, feet: both(() => [12, zA - 3, 0, ankleY - LEN.ankle, 65]), knee: both(() => [0, -1, .1]) });
    const sh = (th, zA, dx) => { const q = mk(th, zA, dx); return shoulder(torso(q), 'L', q); };
    /* arriba: los hombros justo encima de las muñecas, con los brazos casi estirados; de ahí sale dónde van los pies */
    const reachTop = (grips ? LU + LF : LU + LEN.fore) - 3, Wl = W('L');
    /* (con los pies en alto, el cuerpo baja hacia la cabeza: el ángulo, negativo) */
    const th0 = solve(th => sh(th, 0)[1] - Wl[1] - sqrt(max(0, reachTop ** 2 - (sh(th, 0)[0] - Wl[0]) ** 2)), -45, 70);
    const zA = Wl[2] - sh(th0, 0)[2];
    /* abajo: el pecho a un palmo del apoyo de las manos */
    /* (y la cara, con los pies en alto, a un palmo del suelo) */
    const chestY = th => { const q = mk(th, zA), { F } = pose({ ...q, hands: ZERO, elbow: {} }); return min(at(F.thorax, [0, 50, 32])[1], at(F.head, [0, 0, 18])[1] - 6); };
    const th1 = solve(th => chestY(th) - (hy + 18), -60, th0);
    const el = [.55, .28, -.8];
    const at_ = t => {
      /* (en la arquera, el cuerpo baja hacia la mano derecha y se corre hacia ella lo justo para que el brazo izquierdo siga
         estirado: el hombro izquierdo, siempre a un brazo de su mano) */
      let th = mix(th0, th1, ease(t)), H = Hs, dx = 0, u = 0;
      if (archer) { const D = sub(Wl, sh(th, zA, 0)), r2 = (LU + LEN.fore - .5) ** 2 - D[1] ** 2 - D[2] ** 2; dx = r2 > 0 ? min(0, D[0] - sqrt(r2)) : 0; }
      if (clap) {
        /* el ciclo: baja y sube (hasta .45), empuja fuerte: el cuerpo sube un poco, las manos se despegan y dan una palmada
           delante del pecho, y vuelve a caer en las manos */
        /* (de seguido, como se hace: baja despacio, empuja de golpe sin pararse, el cuerpo sale despedido y sube y cae como cae
           cualquier cosa (una parábola) mientras las manos se juntan y vuelven, y al caer amortigua doblando un poco los codos.
           Antes cada tramo arrancaba y frenaba y el cuerpo apenas subía) */
        const S_ = M.spl, fl = t > .5 && t < .72 ? (t - .5) / .22 : -1;
        const d = S_(t, [[0, 0], [.38, 1], [.5, 0], [.72, 0], [.8, .38], [.92, 0], [1, 0]]);
        u = fl < 0 ? 0 : Math.sin(Math.PI * fl) ** .7;
        th = mix(th0, th1, d) + (fl < 0 ? 0 : 9 * 4 * fl * (1 - fl));
        const q0 = mk(th, zA), { F } = pose({ ...q0, hands: ZERO, elbow: {} });
        H = both(s => mix(Hs[s], at(F.thorax, sd(s, [6, 30, 52])), u));
      }
      const q = mk(th, zA, dx);
      /* (en la palmada, las manos se giran al subir: las palmas, de mirar al suelo a mirarse, y los dedos, hacia delante y abajo) */
      if (hd) return { ...q, hands: H, elbow: both(() => el), handDir: both(() => norm(mix([0, -.5, 15], [0, -1, 1.1], u))), fist: false, palm: both(() => norm(mix([0, -1, 0], [-1, -.25, 0], u))) };
      return { ...q, hands: H, elbow: both(() => el), barDir: both(() => [0, 0, 1]) };
    };
    const gear = (q, F, cam) => {
      const out = [];
      if (weight) { const n = mul(F.thorax.z, -1); out.push(GR.disc(cam, add(at(F.thorax, [0, 52, -26]), mul(n, 3)), n, 30, 5)); }
      if (feetUp) out.push(...GR.under(flatBench(cam, [0, 92, zA - 40], [0, 92, zA + 70])));
      if (handsUp) out.push(...GR.under([GR.padAB(cam, [-96, 85, 0], [96, 85, 0], UP, 28, 7), ...GR.leg(cam, [-72, 78, 0]), ...GR.leg(cam, [72, 78, 0])]));
      if (rings) ['L', 'R'].forEach(s => { const h = q.hands[s], top = [h[0] + sd(s, [80, 0, 0])[0], 560, h[2]]; out.push(...GR.strap(cam, [add(h, sd(s, [24, 6, 0])), top], 4, GR.C.strap).map(i => ({ ...i, nf: true })), ...GR.tube(cam, add(h, [0, 0, -9]), add(h, [0, 0, 9]), 5, ['#c8b48a', '#0a0b10'], 1).map(i => ({ ...i, hand: s }))); });
      /* el TRX: las dos cintas bajan de un mismo anclaje, encima de los pies, y abrazan los tobillos (las cunas) */
      if (trx) ['L', 'R'].forEach(s => { const a = F['foot' + s].o, A = [0, 600, zA - 6]; out.push(...GR.strap(cam, [add(a, [0, 7, -2]), A], 6, GR.C.trx).map(i => ({ ...i, nf: true })), ...GR.strap(cam, [add(a, [-10, 2, 0]), add(a, [10, 2, 0])], 7, GR.C.trx).map(i => ({ ...i, above: ['foot' + s, 'shin' + s], nf: true }))); });
      if (par) ['L', 'R'].forEach(s => { const h = q.hands[s]; out.push(...GR.tube(cam, add(h, [0, 0, -22]), add(h, [0, 0, 22]), 5, STEEL, 2).map(i => ({ ...i, hand: s })), ...[-18, 18].flatMap(k => GR.tube(cam, add(h, [0, 0, k]), [h[0], 2, h[2] + k * 1.3], 4, GR.C.frame, 1))); });
      return out;
    };
    const ex = { view: 'front', up: 'a', rest: 'a', cam: [-64, 14], feetOff: true, one: archer, at: at_, gear };
    if (clap) ex.beat = cycle(3200);
    return ex;
  };

  /* ════ press de pecho: máquina, polea y banda ════ */
  const pressOut = f => {
    const w = x => has(f, x), machine = w('machine'), cable = w('cable'), band = w('band'), incline = w('incline'), decline = w('decline'), conv = w('converge'), one = w('one');
    /* (de pie, en la polea o con la banda, el tronco algo inclinado hacia delante sobre el pie adelantado, como se empuja de
       verdad; antes iba recto) */
    const body = machine ? { ...SEAT, tilt: -10, neck: 6 } : { ...SPLIT, tilt: (SPLIT.tilt || 0) + 9, spine: (SPLIT.spine || 0) + 3, neck: (SPLIT.neck || 0) - 8 }, { F: F0 } = pose({ ...body, hands: ZERO, elbow: {} });
    /* de junto al pecho (codos atrás y algo abiertos) a los brazos estirados al frente; inclinado, hacia arriba; declinado, hacia
       abajo; en la convergente, las manos se juntan al estirar */
    const yE = incline ? 122 : decline ? 26 : 66, yC = incline ? 64 : decline ? 50 : 58;
    /* (arriba, el brazo casi estirado, sin bloquear el codo: estirado del todo, el codo daría un salto al empezar a doblarse) */
    const reach = (s, P) => { const S = shoulder(F0, s, body), d = sub(P, S), r = len(d), m = .94 * (LU + LF); return r > m ? add(S, mul(d, m / r)) : P; };
    const lo = s => at(F0.thorax, sd(s, [57, yC, 24])), hi = s => reach(s, at(F0.thorax, sd(s, [conv ? 18 : cable || band ? 28 : 36, yE, 138])));
    const ss = one ? ['R'] : ['L', 'R'];
    /* en la máquina, cada asa va en una palanca que cuelga de un eje alto, por encima del punto medio de su recorrido: la mano va
       por un arco (antes iba en línea recta y la palanca se alargaba y se acortaba) */
    const PV = {}, pivot = s => PV[s] || (PV[s] = pivotFor(hi(s), lo(s), UP, 150));
    const at_ = t => {
      /* (de pie, con polea o banda, los codos algo más cerrados: el cable o la banda llegan por fuera del brazo) */
      const o = arms(ss, s => ({ H: machine ? leverAt(pivot(s), hi(s), lo(s), ease(t)) : mix(hi(s), lo(s), ease(t)), hint: machine ? [.7, -.25, -.65] : [.38, -.42, -.82], bd: [1, 0, 0] }));
      return one ? { ...body, ...freeL(F0, o) } : { ...body, ...o };
    };
    const gear = (q, F, cam) => {
      const out = [];
      if (machine) {
        const seat = at(F0.pelvis, [0, -22, -6]), b0 = at(F0.thorax, [0, -30, -26]), b1 = at(F0.thorax, [0, 110, -26]), n = F0.thorax.z;
        out.push(...GR.under([GR.padAB(cam, [0, seat[1] - 7, seat[2] - 22], [0, seat[1] - 7, seat[2] + 36], UP, 30, 7), GR.padAB(cam, add(b0, mul(n, -7)), add(b1, mul(n, -7)), n, 26, 7), ...GR.leg(cam, [0, seat[1] - 14, seat[2]]), ...GR.tube(cam, add(b1, mul(n, -18)), [0, 8, b1[2] - 30], 7), ...GR.stack(cam, [0, 0, b0[2] - 60], [0, 0, 1], 12)], 3));
        /* el armazón: una columna detrás del respaldo que sube por encima de la cabeza y una viga que sale hacia delante hasta el
           eje de las palancas, de lado a lado; la base, en el suelo, de la columna al asiento; el cable, de la pila a lo alto */
        const zc = b0[2] - 34, Y = pivot('R')[1] + 10, Z = pivot('R')[2];
        out.push(...GR.under([...GR.beam(cam, [0, 4, zc], [0, Y, zc], 8), ...GR.beam(cam, [0, Y, zc], [0, Y, Z], 6), ...GR.beam(cam, [0, 4, zc - 40], [0, 4, seat[2] + 20], 6),
          ...GR.cableLine(cam, [0, 10 + 12 * 6.4 + 40, b0[2] - 60], [0, Y - 14, zc - 8])]));
        out.push(...GR.beam(cam, pivot('L'), pivot('R'), 5));
        /* cada palanca, de sección cuadrada, del cubo de su eje al asa, con su puño de goma */
        /* (el puño de goma, a lo largo del puño, de su extremo de fuera hacia dentro: antes iba siempre de lado a lado y, con el
           antebrazo hacia fuera, cruzaba la mano en diagonal) */
        ss.forEach(s => { const k = s == 'L' ? 1 : -1, H = q.hands[s], P = pivot(s), gx = F['grip' + s].x, go = dot(gx, [k, 0, 0]) > 0 ? gx : mul(gx, -1), x = add(H, mul(go, 11)), top = [P[0] + k * 12, P[1], P[2]]; out.push(...GR.hub(cam, add(top, [k * 5, 0, 0]), [1, 0, 0]), ...GR.beam(cam, top, x, 4.8, GR.C.frame, 3), ...GR.rubber(cam, add(H, mul(go, 9)), add(H, mul(go, -9))).map(i => ({ ...i, hand: s }))); });
      }
      else if (cable) {
        /* las dos torres, detrás y a los lados; la polea a la altura de las manos (baja en el inclinado, alta en el declinado) */
        /* (anchas: así el cable llega a la mano por fuera del brazo) */
        out.push(...towers(cam, q, 230, -60, incline ? 40 : decline ? 330 : 240, ss, s => add(q.hands[s], sd(s, incline ? [-3, -12, 0] : [10, 0, -5]))), ...handles(cam, F, q, ss));
      }
      /* la banda: atada detrás, a cada lado (una espaldera a la altura de los hombros), y pasa por fuera de los brazos */
      else if (band) out.push(...ss.flatMap(s => anchorBands(cam, q, [sd(s, [150, 0, 0])[0], 252, -66], [s])));
      return out;
    };
    return { view: machine ? 'seat' : 'stand', up: 'a', rest: 'a', cam: [-50, 10], one, at: at_, gear };
  };

  /* ════ pájaros (deltoides posterior) ════ */
  const rearFly = f => {
    const w = x => has(f, x), machine = w('machine'), crossC = w('cross'), benchB = w('bench'), band = w('band'), yRaise = w('y');
    let body, P, cam = [-66, 16], world = false;
    if (machine || crossC || band) {
      /* de cara a la máquina (sentado, el pecho contra el respaldo), a las poleas o con la banda: los brazos al frente, a la
         altura de los hombros, se abren hasta los lados */
      body = machine ? { ...SEAT, tilt: 9 } : { ...STAND, tilt: 4 };
      /* (con banda, la banda pasa de puño a puño, de lado a lado, con las palmas hacia abajo; con las poleas cruzadas, el asa de
         cada mano, de través al cable que llega del otro lado, con el pulgar arriba: antes los dos ejes iban a lo largo del
         antebrazo) */
      P = t => ({ u: sph(mix(band ? 4 : crossC ? -14 : 6, band ? 76 : 86, t), 2), e: 8, n: [0, -1, 0], bd: machine ? [0, 1, 0] : band ? [1, 0, 0] : crossC ? [0, 1, 0] : [0, 0, 1] });
      /* (se ve desde atrás: los deltoides de atrás y la espalda, lo que trabaja, y los brazos que se abren; de frente la máquina
         tapaba el gesto) */
      cam = machine || crossC ? [-152, 16] : [-30, 18];
    }
    else if (benchB) {
      /* boca abajo en el banco inclinado: los brazos cuelgan y suben hasta los lados (la T) o hacia delante y arriba, abiertos (la Y) */
      body = { root: [0, 112, 0], tilt: 59, spine: -3, neck: -17, feet: both(() => [22, -150, 6, 8, 34]), knee: both(() => [0, -1, -.15]) };
      world = true;
      const up = [0, cos(RAD(56)), sin(RAD(56))], u1 = norm(add(mul(up, cos(RAD(34))), [sin(RAD(34)), 0, 0]));
      /* (la T, con los brazos estirados y los pulgares hacia arriba: la mancuerna, de través abajo y vertical arriba) */
      const tee = w('tee');
      P = t => ({ u: yRaise ? norm(mix([.06, -1, .08], u1, ease(t))) : sph(90, mix(-84, 0, t)), e: tee ? 1 : 6, n: [0, 0, 1], bd: yRaise ? [1, 0, 0] : tee ? norm(mix([0, 0, 1], [0, 1, .15], ease(t))) : [0, 0, 1] });
      /* (la Y y la T, vistas desde atrás y arriba, donde se ve la forma de los brazos y lo que trabaja; de lado, un brazo tapaba
         al otro y no se distinguían) */
      cam = yRaise || tee ? [-156, 34] : [-74, 14];
    }
    else {
      /* de pie, inclinado desde la cadera con la espalda recta: los brazos cuelgan y se abren a los lados, con los codos algo
         doblados */
      const lean = 66, mk = pt => { const lr = legRoot(24, 0, 8, 10, pt); return { root: lr.root, tilt: lean + 3, spine: -3, neck: -24, feet: both(() => [24, 0, 8]), knee: both(() => lr.knee) }; };
      body = mk(solve(pt => { const q = mk(pt), { F, J } = pose({ ...q, hands: ZERO, elbow: {} }); return midFoot(F, 16)[2] - comOf(F, J)[2]; }, 20, 88));
      world = true;
      P = t => ({ u: sph(90, mix(-86, -6, t)), e: 18, n: [0, 0, 1], bd: [0, 0, 1] });
    }
    const { F: F0 } = pose({ ...body, hands: ZERO, elbow: {} });
    const at_ = t => { const a = P(t); return { ...body, ...arms(['L', 'R'], s => ({ ...armU(F0, body, s, a.u, a.e, { n: a.n, world }), bd: a.bd })) }; };
    const gear = (q, F, cam) => {
      const out = [];
      if (machine) {
        /* (el respaldo, contra el pecho: su cara, justo en el pecho tal como se dibuja; antes quedaba un palmo por delante) */
        const fr = B.prof(L.TRUNK3, 160 - 52), seat = at(F0.pelvis, [0, -22, 0]), ch = at(F0.thorax, [0, 40, fr[2] + fr[3] + 1 - 6 + 7]);
        out.push(...GR.under([GR.padAB(cam, [0, seat[1] - 7, seat[2] - 24], [0, seat[1] - 7, seat[2] + 24], UP, 28, 7), ...GR.leg(cam, [0, seat[1] - 14, seat[2]]), GR.padAB(cam, add(ch, [0, -40, 6]), add(ch, [0, 40, 6]), [0, 0, -1], 26, 7), ...GR.tube(cam, add(ch, [0, -40, 20]), [0, 8, ch[2] + 30], 7), ...GR.stack(cam, [0, 0, ch[2] + 90], [0, 0, -1], 12)], 3));
        /* las asas, verticales, en palancas en L que giran en un eje vertical justo encima de cada hombro (la mano da la vuelta
           alrededor del hombro, así que la palanca no cambia de largo); los ejes cuelgan de una viga que viene de la columna de
           delante, que sube por encima de la cabeza; la base, del asiento a la columna. Antes las palancas eran varillas que
           cambiaban de largo y los ejes flotaban */
        const S = s => shoulder(F0, s, body), Y = S('L')[1] + 96, zp = S('L')[2], zc = ch[2] + 30;
        out.push(...GR.under([...GR.beam(cam, [0, 8, zc], [0, Y + 12, zc], 7), ...GR.beam(cam, [0, Y + 12, zc], [0, Y + 12, zp], 6), ...GR.beam(cam, [S('R')[0], Y + 12, zp], [S('L')[0], Y + 12, zp], 6), ...GR.beam(cam, [0, 4, seat[2]], [0, 4, ch[2] + 100], 6)], 3));
        ['L', 'R'].forEach(s => { const H = q.hands[s], pv = [S(s)[0], Y, zp], c = [H[0], Y, H[2]]; out.push(...GR.hub(cam, pv, [0, 1, 0], 8), ...GR.beam(cam, pv, c, 5), ...GR.beam(cam, c, add(H, [0, 9, 0]), 4.5), ...GR.rubber(cam, add(H, [0, 9, 0]), add(H, [0, -9, 0])).map(i => ({ ...i, hand: s }))); });
      }
      /* (las torres, lejos por delante: los brazos estirados no llegan a ellas; los cables se cruzan) */
      else if (crossC) out.push(...towers(cam, q, 62, 210, 300, ['L', 'R'], s => q.hands[s == 'L' ? 'R' : 'L']), ...handles(cam, F, q));
      else if (band) {
        /* la banda, de puño a puño por su lado de dentro y, abiertos los brazos, apoyada por delante del pecho */
        /* (por delante de los puños y de los antebrazos: con los brazos abiertos del todo, hacia dentro solo cabía por ellos) */
        const fz = mul(F.thorax.z, 12), a = add(add(q.hands.L, fz), mul(norm(sub(q.hands.R, q.hands.L)), 6)), b = add(add(q.hands.R, fz), mul(norm(sub(q.hands.L, q.hands.R)), 6)), c = at(F.thorax, [0, 64, 46]), m = mix(a, b, .5);
        out.push(...GR.bandPath(cam, dot(sub(m, c), F.thorax.z) < 0 ? [a, c, b] : [a, b], 70, [0, 1, 0], 3));
      }
      else if (benchB) {
        const n = mul(F0.thorax.z, -1), a = at(F0.thorax, [0, -44, 27]), b = at(F0.thorax, [0, 44, 27]), seat = at(F0.pelvis, [0, -30, 10]);
        out.push(...GR.under([...GR.leg(cam, [0, seat[1] - 14, seat[2]]), ...GR.leg(cam, add(b, [0, -30, -10])), GR.padAB(cam, add(a, mul(n, -7)), add(b, mul(n, -7)), mul(n, -1), 26, 7)]));
      }
      if (!machine && !crossC && !band) out.push(...['L', 'R'].flatMap(s => GR.dumbbell(cam, q.hands[s], dbAxis(F, q, s), s)));
      return out;
    };
    return { view: 'stand', up: 'b', rest: 'a', cam, side: machine || crossC ? [-60, 10] : benchB && (yRaise || w('tee')) ? [-74, 14] : undefined, feetOff: benchB, at: at_, gear };
  };

  /* ════ elevaciones laterales ════ */
  const lateral = f => {
    const w = x => has(f, x), cable = w('cable'), lean = w('lean'), machine = w('machine'), seated = w('seated'), band = w('band'), side = w('side'), partial = w('partial');
    const one = cable || lean, solo = side ? ['L'] : one ? ['R'] : ['L', 'R'];
    let body = seated || machine ? SEAT : STAND, cam = [-24, 8];
    /* inclinado: agarrado con la mano izquierda a un poste (con polea, al de la torre) y el cuerpo hacia el otro lado */
    if (lean) body = { ...STAND, roll: -14, feet: { L: [20, 0, 8], R: [26, 0, 10] } };
    if (side) {
      /* tumbado de lado en el banco, sobre el costado derecho: el brazo izquierdo sube desde junto al muslo hasta la vertical, y la
         mano derecha queda junto a la cabeza */
      /* (ladeado 90°: el cuerpo, a lo largo de x con la cabeza a la izquierda de la imagen y el costado izquierdo arriba; los
         pies, uno encima del otro: la x del derecho se da negativa porque el motor la refleja) */
      body = { root: [0, 92 + 24, 0], roll: 90, tilt: 0, spine: 0, neck: 0, feet: { L: [166, 4, 0, 92 + 24 + 14 - LEN.ankle, 0], R: [-166, 4, 0, 92 + 24 - 14 - LEN.ankle, 0] }, knee: { L: [0, 0, 1], R: [0, 0, 1] } };
      cam = [-20, 30];
    }
    const { F: F0 } = pose({ ...body, hands: ZERO, elbow: {} });
    /* el brazo: de colgando (algo separado y por delante) a horizontal, por el lado; en la máquina, con el codo doblado */
    const top = partial ? -42 : 2;
    const at_ = t => {
      const ss = solo;
      /* (con polea, la mano empieza por delante del cuerpo, hacia la cadera contraria: el cable tira desde abajo y del otro lado) */
      const o = arms(ss, s => ({ ...armU(F0, body, s, sph(machine ? 84 : cable ? mix(-28, 76, t) : 76, mix(side ? -86 : cable ? -72 : -80, side ? 6 : top, t)), machine ? 84 : 14, { n: machine ? [0, 0, 1] : [0, 0, 1] }), bd: machine ? [0, 1, 0] : [0, 0, 1] }));
      if (side) { o.hands.R = add(at(F0.head, [0, 0, 0]), [-6, -14, 26]); o.elbow.R = [.2, -.6, .6]; o.fist = { R: false }; o.palm = { R: [0, -1, 0] }; o.barDir.R = [1, 0, 0]; }
      if (one) {
        if (lean) { o.hands.L = [70, 230, cable ? 40 : 8]; o.elbow.L = [.4, -.3, -.6]; o.barDir.L = [0, 1, 0]; }
        else freeL(F0, o);
      }
      return { ...body, ...o };
    };
    const gear = (q, F, cam) => {
      const out = [];
      /* (inclinado, la mano izquierda agarra la columna de la torre: la torre, justo ahí) */
      if (cable) out.push(...GR.pulleyTower(cam, lean ? [78, 0, 40] : [84, 0, 64], 16, q.hands.R), ...handle(cam, F, 'R', q.hands.R));
      else if (band) out.push(...footBands(cam, q, F));
      else if (machine) {
        const seat = at(F0.pelvis, [0, -22, -6]), b0 = at(F0.thorax, [0, -30, -26]), b1 = at(F0.thorax, [0, 90, -26]), n = F0.thorax.z;
        out.push(...GR.under([GR.padAB(cam, [0, seat[1] - 7, seat[2] - 22], [0, seat[1] - 7, seat[2] + 30], UP, 30, 7), GR.padAB(cam, add(b0, mul(n, -7)), add(b1, mul(n, -7)), n, 26, 7), ...GR.leg(cam, [0, seat[1] - 14, seat[2]]), ...GR.stack(cam, [0, 0, b0[2] - 60], [0, 0, 1], 12)], 3));
        /* el acolchado, por fuera del brazo junto al codo, en una palanca que gira detrás del hombro, y el asa */
        const { J } = pose(q), J0L = pose({ ...body, hands: ZERO, elbow: {} }).J.L;
        /* (los ejes, detrás de los hombros, van en una viga que une los dos; de ella baja un poste al suelo, que también lleva el
           respaldo, y la base va del asiento al poste y a la pila: antes ejes y respaldo flotaban) */
        const zb = b0[2] - 34, yv = J0L.sh[1];
        out.push(...GR.under([...GR.beam(cam, [-J0L.sh[0], yv, zb], [J0L.sh[0], yv, zb], 6), ...GR.beam(cam, [0, 4, zb], [0, yv, zb], 7), ...GR.beam(cam, [0, mix(b0[1], b1[1], .4), b0[2] - 12], [0, mix(b0[1], b1[1], .4), zb], 5), ...GR.beam(cam, [0, 4, seat[2]], [0, 4, b0[2] - 60], 6)], 3));
        /* (el acolchado, sobre la cara de fuera del brazo, junto al codo: hacia fuera y arriba, perpendicular al brazo) */
        ['L', 'R'].forEach(s => { const E = J[s].el, S = J[s].sh, uw = norm(sub(E, S)), k = s == 'L' ? 1 : -1, no = norm([-uw[1] * k, uw[0] * k, 0]), pad = add(mix(E, S, .2), mul(no, 19)), pv = add(S, [0, 0, -26]); out.push(GR.padAB(cam, add(pad, mul(uw, 10)), add(pad, mul(uw, -12)), no, 8, 5), ...GR.beam(cam, pv, add(pad, [0, 0, -8]), 5), ...GR.hub(cam, pv, [0, 0, 1], 8), ...GR.beam(cam, pv, [pv[0], pv[1], zb], 6), ...GR.tube(cam, add(q.hands[s], [0, 9, 0]), add(q.hands[s], [0, -9, 0]), 5, STEEL, 1).map(i => ({ ...i, hand: s }))); });
      }
      else out.push(...solo.flatMap(s => GR.dumbbell(cam, q.hands[s], dbAxis(F, q, s), s)));
      /* (sentado, en el extremo de un banco plano que va hacia atrás: antes se sentaba en el aire) */
      if (seated && !machine) { const p0 = at(F.pelvis, [0, -22, 0]); out.push(...GR.under(flatBench(cam, [0, p0[1] - 7, p0[2] + 24], [0, p0[1] - 7, p0[2] - 110]))); }
      if (lean && !cable) out.push(GR.obox(cam, [78, 130, 8], [[1, 0, 0], UP], [6, 130, 6], GR.C.frame));
      if (side) out.push(...GR.under([GR.padAB(cam, [-150, 85, 0], [90, 85, 0], UP, 28, 7), ...GR.leg(cam, [-120, 78, 0]), ...GR.leg(cam, [60, 78, 0])]));
      return out;
    };
    return { view: side ? 'bench' : seated || machine ? 'seat' : 'stand', up: 'b', rest: 'a', cam, one: one || side, feetOff: side, at: at_, gear };
  };

  /* ════ aperturas en polea, cruces y contractor ════ */
  const cross_ = f => {
    const w = x => has(f, x), mid = w('mid'), low = w('low'), deck = w('deck'), one = w('one'), band = w('band');
    /* (de pie, el tronco inclinado sobre el pie adelantado: más desde arriba, menos desde abajo) */
    const body = deck ? { ...SEAT, tilt: -6 } : { ...SPLIT, tilt: low ? 8 : mid || band ? 12 : 16, spine: low ? 2 : 4 };
    const { F: F0 } = pose({ ...body, hands: ZERO, elbow: {} });
    /* los brazos van de abiertos (atrás, a la altura de las poleas) a juntos delante: desde arriba, las manos se juntan delante de
       la cadera; a media altura, del pecho; desde abajo, de la cara. En el contractor, con los codos doblados y los antebrazos
       verticales contra los rodillos */
    /* (al final, las manos llegan a juntarse y, desde arriba, se cruzan un poco delante de la cadera, como en un cruce de verdad) */
    const a0 = deck ? [86, 0] : low ? [70, -44] : mid || band ? [88, 0] : [76, 20], a1 = deck ? [10, 0] : low ? [5, 26] : mid || band ? [3, -4] : one ? [6, -36] : [-3, -38];
    const ss = one ? ['R'] : ['L', 'R'];
    const at_ = t => {
      const h = mix(a0[0], a1[0], t), el = mix(a0[1], a1[1], t);
      const o = arms(ss, s => ({ ...armU(F0, body, s, sph(h, el), deck ? 88 : 16, { n: deck ? [0, 1, 0] : [-.3, 0, 1] }), bd: deck ? [0, 1, 0] : [0, 0, 1] }));
      /* (en el contractor empujan los antebrazos: las manos, abiertas y relajadas, con las palmas hacia delante; antes iban
         cerradas sobre un asa a lo largo del antebrazo) */
      if (deck) { o.fist = false; o.palm = both(() => [0, 0, 1]); }
      return one ? { ...body, ...freeL(F0, o) } : { ...body, ...o };
    };
    const ph = low ? 20 : mid ? 290 : 400;
    const gear = (q, F, cam) => {
      /* (cada banda, de su anclaje a un lado y detrás: desde uno solo en el centro, la banda cruzaba el cuerpo) */
      if (band) return ss.flatMap(s => anchorBands(cam, q, [sd(s, [104, 0, 0])[0], 292, -70], [s]));
      /* (las torres, bien separadas, como en un cruce de poleas de verdad: con los brazos abiertos, las manos quedan lejos de las
         poleas; antes casi las tocaban) */
      if (!deck) return [...towers(cam, q, 262, -34, ph, ss), ...handles(cam, F, q, ss)];
      const out = [], seat = at(F0.pelvis, [0, -22, -6]), b0 = at(F0.thorax, [0, -30, -26]), b1 = at(F0.thorax, [0, 110, -26]), n = F0.thorax.z;
      out.push(...GR.under([GR.padAB(cam, [0, seat[1] - 7, seat[2] - 22], [0, seat[1] - 7, seat[2] + 34], UP, 30, 7), GR.padAB(cam, add(b0, mul(n, -7)), add(b1, mul(n, -7)), n, 26, 7), ...GR.leg(cam, [0, seat[1] - 14, seat[2]]), ...GR.tube(cam, add(b1, mul(n, -18)), [0, 8, b1[2] - 30], 7), ...GR.stack(cam, [0, 0, b0[2] - 60], [0, 0, 1], 12)], 3));
      /* los brazos del contractor giran en un eje sobre cada hombro; el rodillo, vertical, delante del antebrazo */
      const { J } = pose(q);
      /* (el rodillo, del lado hacia donde empuja el antebrazo, que gira con él: delante al principio, por dentro al final; antes
         iba siempre delante, y al cerrar quedaba fuera del camino del brazo. Los ejes cuelgan de una viga que viene de la columna
         de detrás, que sube por encima de la cabeza: antes flotaban) */
      const S = s => shoulder(F0, s, body), Y = S('L')[1] + 104, zp = S('L')[2], zc = b1[2] - 30;
      out.push(...GR.under([...GR.beam(cam, add(b1, mul(n, -18)), [0, Y + 12, zc], 6), ...GR.beam(cam, [0, Y + 12, zc], [0, Y + 12, zp], 6), ...GR.beam(cam, [S('R')[0], Y + 12, zp], [S('L')[0], Y + 12, zp], 6), ...GR.beam(cam, [0, 4, seat[2] + 20], [0, 4, b0[2] - 60], 6)], 3));
      ['L', 'R'].forEach(s => { const E = J[s].el, Hh = q.hands[s], pv = [S(s)[0], Y, zp], m = mix(E, Hh, .45), d = norm([m[0] - pv[0], 0, m[2] - pv[2]]), k = s == 'L' ? 1 : -1, r = add(m, mul([-d[2] * k, 0, d[0] * k], 21)), c = [r[0], Y, r[2]]; out.push(...GR.hub(cam, pv, [0, 1, 0], 8), ...GR.beam(cam, pv, c, 6), ...GR.beam(cam, c, add(r, [0, 30, 0]), 5), ...GR.tube(cam, add(r, [0, -26, 0]), add(r, [0, 26, 0]), 9, GR.C.pad, 2)); });
      return out;
    };
    return { view: deck ? 'seat' : 'stand', up: 'b', rest: 'a', cam: deck ? [-30, 16] : [-30, 10], one, at: at_, gear };
  };

  /* ════ encogimientos ════ */
  const shrug = f => {
    const w = x => has(f, x), db = w('db'), smith = w('smith'), machine = w('machine'), cable = w('cable'), hex = w('hex');
    const body = STAND, { F: F0, J: J0 } = pose({ ...body, hands: ZERO, elbow: {} });
    /* los brazos cuelgan estirados y solo suben los hombros; la barra, por delante de los muslos (la hexagonal, a los lados) */
    const barF = !db && !machine && !cable && !hex, gx = barF ? 46 : hex ? 56 : 58;
    let fl0 = 2;
    if (barF) for (; fl0 < 30; fl0 += .5) { const H = armAt(F0, body, 'L', fl0, 0, 4, { hx: gx }).H; if (H[2] >= frontAt(F0, J0, H[1]) + 6.5) break; }
    const at_ = t => {
      const q = { ...body, shrug: mix(0, 26, t) }, { F } = pose({ ...q, hands: ZERO, elbow: {} });
      const o = arms(['L', 'R'], s => ({ ...armAt(F, q, s, fl0, barF ? 0 : 5, 4, { hx: gx }), bd: barF ? [1, 0, 0] : [0, 0, 1] }));
      if (barF) { const c = mix(o.hands.L, o.hands.R, .5); o.barC = c; o.grip = gx; }
      return { ...q, ...o };
    };
    let zr = null;
    const gear = (q, F, cam) => {
      const out = [];
      if (barF) { out.push(...olympic(cam, q.barC, () => null)); if (smith) { zr = zr ?? q.barC[2]; out.push(...GR.smithFrame(cam, zr).map(i => ({ ...i, nf: true })), ...GR.smithHooks(cam, q.barC)); } }
      else if (db) out.push(...['L', 'R'].flatMap(s => GR.dumbbell(cam, q.hands[s], dbAxis(F, q, s), s)));
      else if (cable) out.push(...towers(cam, q, 100, 0, 16), ...handles(cam, F, q));
      else if (hex) {
        /* la barra hexagonal: el hexágono rodea al cuerpo a la altura de las manos, con las asas a los lados y las mangas fuera */
        const c = mix(q.hands.L, q.hands.R, .5), P = (x, z) => add(c, [x, 0, z]), pts = [P(-72, 0), P(-40, -50), P(40, -50), P(72, 0), P(40, 50), P(-40, 50), P(-72, 0)];
        for (let i = 0; i + 1 < pts.length; i++) out.push(...bar(cam, pts[i], pts[i + 1], 2, 5));
        ['L', 'R'].forEach(s => { const h = q.hands[s]; out.push(...bar(cam, add(h, [0, 0, -18]), add(h, [0, 0, 18]), 1, 4.6).map(i => ({ ...i, hand: s })), ...bar(cam, add(h, [0, 0, -18]), P(sd(s, [62, 0, 0])[0], -18), 1, 4.6), ...bar(cam, add(h, [0, 0, 18]), P(sd(s, [62, 0, 0])[0], 18), 1, 4.6)); });
        [-1, 1].forEach(k => out.push(...bar(cam, P(k * 72, 0), P(k * 130, 0), 3, 7.6), GR.disc(cam, P(k * 100, 0), [1, 0, 0], 49, 12)));
      }
      else {
        /* la máquina: las asas a los lados en una palanca que sube, la columna detrás y la pila */
        ['L', 'R'].forEach(s => { const h = q.hands[s], xo = sd(s, [84, 0, 0])[0]; out.push(...GR.tube(cam, add(h, [0, 0, -8]), add(h, [0, 0, 8]), 5, STEEL, 1).map(i => ({ ...i, hand: s })), ...GR.tube(cam, add(h, [0, 0, -8]), [xo, h[1], h[2] - 30], 6, GR.C.frame, 2)); });
        out.push(...GR.under([...GR.tube(cam, [-84, J0.L.hip[1] - 10, -30], [84, J0.L.hip[1] - 10, -30], 7, GR.C.frame, 4), GR.obox(cam, [-84, 100, -30], [[1, 0, 0], UP], [7, 100, 7], GR.C.frame), GR.obox(cam, [84, 100, -30], [[1, 0, 0], UP], [7, 100, 7], GR.C.frame), ...GR.stack(cam, [0, 0, -80], [0, 0, 1], 12)], 3));
      }
      return out;
    };
    return { view: 'stand', up: 'b', rest: 'a', cam: [-40, 8], at: at_, gear };
  };

  /* ════ elevaciones frontales ════ */
  const frontRaise = f => {
    const w = x => has(f, x), disc = w('disc'), barF = w('bar'), cable = w('cable'), ropeA = w('rope'), alt = w('alt');
    const body = STAND, { F: F0, J: J0 } = pose({ ...body, hands: ZERO, elbow: {} });
    /* los brazos, casi estirados, suben por delante hasta la horizontal; con disco, barra o polea, con las dos manos juntas */
    const two = disc || barF || cable, gx = disc ? 20 : barF || (cable && !ropeA) ? 30 : ropeA ? 14 : null;
    /* abajo, lo que cuelga, por delante de los muslos: las mancuernas (de través), la barra o el disco */
    const fl0 = (() => { let a = 4; for (; a < 34; a += .5) { const H = armAt(F0, body, 'L', a, two ? 0 : 4, 6, gx != null ? { hx: gx } : {}).H; if (H[2] >= frontAt(F0, J0, H[1]) + (disc ? 34 : two ? 8 : 23)) break; } return a; })();
    const at_ = t => {
      const p = alt ? both(s => (s == 'L' ? keys(t, [[0, 0], [.2, 1], [.25, 1], [.5, 0], [1, 0]]) : keys(t, [[0, 0], [.5, 0], [.7, 1], [.75, 1], [1, 0]]))) : both(() => t);
      const o = arms(['L', 'R'], s => ({ ...armAt(F0, body, s, mix(fl0, 92, p[s]), two ? 0 : 4, 6, gx != null ? { hx: gx } : {}), bd: disc ? [0, 1, 0] : ropeA ? [0, 0, 1] : [1, 0, 0] }));
      /* (el disco, sujeto por los lados con las manos abiertas, las palmas contra su canto; antes, con los puños cerrados sobre un
         eje a lo largo del antebrazo. La cuerda, con los pulgares hacia delante) */
      if (disc) { o.fist = false; o.palm = both(() => [-1, 0, 0]); }
      if (two && !ropeA) { o.barC = mix(o.hands.L, o.hands.R, .5); o.grip = gx; }
      return { ...body, ...o };
    };
    const gear = (q, F, cam) => {
      if (disc) return [GR.disc(cam, mix(q.hands.L, q.hands.R, .5), [0, 0, 1], 31, 5)];
      if (barF && !cable) return curlBar(cam, q.barC, gx);
      if (cable) {
        /* la polea baja detrás, entre los pies: el cable pasa entre las piernas hasta la barra o la cuerda */
        const m = mix(q.hands.L, q.hands.R, .5), top = ropeA ? add(m, [0, -12, -6]) : m;
        return [...GR.pulleyTower(cam, [14, 0, -96], 12, top), ...(ropeA ? rope(cam, top, q.hands) : shortBar(cam, q.barC, gx))];
      }
      return ['L', 'R'].flatMap(s => GR.dumbbell(cam, q.hands[s], dbAxis(F, q, s), s));
    };
    const ex = { view: 'stand', up: 'b', rest: 'a', cam: [-60, 6], one: alt, at: at_, gear };
    if (alt) ex.beat = cycle(5000);
    return ex;
  };

  /* ════ aperturas ════ */
  const fly = f => {
    const w = x => has(f, x), incline = w('incline'), decline = w('decline'), floor = w('floor'), cable = w('cable');
    const ang = incline ? 34 : decline ? -18 : 0;
    const body = floor ? { root: [0, 27, 10], tilt: -90, spine: 0, neck: 6, reach: -3, feet: both(() => [34, 118, 12]), knee: both(() => [.25, 1, .2]) }
      : incline ? { root: [0, 124, 10], tilt: -(90 - ang), spine: -2, neck: 4, reach: -3, feet: both(() => [46, 104, 16]), knee: both(() => [.3, .8, .7]) }
      : decline ? { root: [0, 134, 10], tilt: -(90 - ang), spine: 0, neck: 12, reach: -3, feet: both(() => [24, 116, 6, 84]), knee: both(() => [.12, 1, .25]) }
      : { root: [0, 128, 10], tilt: -90, spine: -3, neck: 8, reach: -3, feet: both(() => [56, 80, 20]), knee: both(() => [.35, 1, .4]) };
    const { F: F0 } = pose({ ...body, hands: ZERO, elbow: {} });
    /* arriba, las manos juntas sobre el pecho; abren los brazos (con los codos algo doblados) hasta que quedan a la altura del
       pecho, o hasta que los codos tocan el suelo */
    const hMax = floor ? 64 : 80;
    const at_ = t => ({ ...body, ...arms(['L', 'R'], s => ({ ...armU(F0, body, s, sph(mix(6, hMax, t), 10), 24, { n: [-.6, 0, 1] }), bd: norm(F0.thorax.y) })) });
    const gear = (q, F, cam) => {
      const out = floor ? GR.under([GR.obox(cam, [0, 1.5, body.root[2] - 70], [[1, 0, 0], UP], [40, 1.5, 125], GR.C.pad)]) : benchUnder(cam, F0, ang);
      /* (las torres, a los lados de donde quedan las manos con los brazos abiertos, a la altura del pecho: así el cable tira hacia
         fuera y abajo; antes quedaban hacia los pies y tiraba en diagonal hacia la cadera) */
      if (cable) out.push(...towers(cam, q, 250, at_(1).hands.L[2] - 4, 16), ...handles(cam, F, q));
      else out.push(...['L', 'R'].flatMap(s => GR.dumbbell(cam, q.hands[s], dbAxis(F, q, s), s)));
      return out;
    };
    return { view: 'bench', up: 'a', rest: 'a', cam: incline ? [-38, 26] : [-30, 33], at: at_, gear };
  };

  /* ════ remo al mentón ════ */
  const upright = f => {
    const w = x => has(f, x), db = w('db'), ez = w('ez'), cable = w('cable'), wide = w('wide');
    const body = STAND, { F: F0, J: J0 } = pose({ ...body, hands: ZERO, elbow: {} });
    /* las manos suben pegadas por delante del cuerpo, de los muslos al pecho, con los codos hacia fuera y por encima de ellas */
    /* (con mancuernas, las manos al ancho de los hombros: más juntas, las dos mancuernas se tocaban y se cruzaban delante) */
    const hx = wide ? 46 : ez ? 24 : db ? 38 : cable ? 12 : 33, need = db ? 25 : 9.5;
    const S0 = shoulder(F0, 'L', body), zAt = y => frontAt(F0, J0, y) + need;
    const yLow = z => S0[1] - sqrt(max(0, 146 ** 2 - (hx - S0[0]) ** 2 - (z - S0[2]) ** 2));
    let y0 = 170; for (let i = 0; i < 8; i++) y0 = yLow(zAt(y0));
    /* (arriba, hasta lo alto del pecho, bajo la barbilla, con los codos por encima de las manos) */
    const y1 = at(F0.thorax, [0, db ? 76 : 82, 0])[1];
    const at_ = t => {
      const y = mix(y0, y1, t);
      /* (la muñeca se dobla y el puño cuelga debajo de ella: la barra (o las mancuernas, de través) queda recta y por debajo de los
         antebrazos; si no, seguía al antebrazo y, con los codos altos, lo atravesaba o, con mancuernas, quedaba en diagonal) */
      const o = { hands: both(s => [sd(s, [hx, 0, 0])[0], y, zAt(y)]), elbow: both(() => [1, .8, -.25]), barDir: ez ? both(s => M.ezFit(s, [0, -1, .2], 180, hx)) : [1, 0, 0], ...(cable ? {} : { handDir: db ? { L: [-.25, -1, .2], R: [.25, -1, .2] } : both(() => [0, -1, .2]) }) };
      if (!db && !cable) { o.barC = mix(o.hands.L, o.hands.R, .5); o.grip = hx; }
      return { ...body, ...o };
    };
    const gear = (q, F, cam) => {
      if (db) return ['L', 'R'].flatMap(s => GR.dumbbell(cam, q.hands[s], dbAxis(F, q, s), s));
      if (cable) { const top = add(mix(q.hands.L, q.hands.R, .5), [0, -14, 6]); return [...GR.pulleyTower(cam, [14, 0, 96], 14, top), ...rope(cam, top, q.hands)]; }
      return ez ? ezBar(cam, q.barC, hx, ezCd(F, hx), true) : curlBar(cam, q.barC, hx);
    };
    return { view: 'stand', up: 'b', rest: 'a', cam: [-40, 6], at: at_, gear };
  };

  /* ════ face pull ════ */
  const facePull = f => {
    const w = x => has(f, x), band = w('band'), one = w('one');
    const body = { ...SPLIT, tilt: -6 }, { F: F0 } = pose({ ...body, hands: ZERO, elbow: {} });
    /* de cara a la polea, a la altura de la cara: de los brazos estirados hacia ella a las manos junto a las orejas, con los codos
       abiertos y altos */
    const ss = one ? ['R'] : ['L', 'R'];
    /* (al final, los codos abiertos a la altura de los hombros y algo atrás, y los antebrazos girados hacia arriba: las manos junto
       a las orejas, separadas; antes acababan delante de la cara, como un remo) */
    const at_ = t => { const k = ease(t), o = arms(ss, s => ({ ...armU(F0, body, s, sph(mix(10, 88, k), mix(4, 10, k)), mix(4, 102, k), { n: norm(mix([-.2, .4, 1], [-.12, 1, .1], k)) }), bd: [0, 1, 0] })); return one ? { ...body, ...freeL(F0, o) } : { ...body, ...o }; };
    const gear = (q, F, cam) => {
      if (band) return anchorBands(cam, q, [0, 340, 160], ss);
      const m = one ? q.hands.R : mix(q.hands.L, q.hands.R, .5), top = one ? m : add(m, [0, 0, 16]);
      return [...GR.pulleyTower(cam, [14, 0, 170], 340, top), ...(one ? handle(cam, F, 'R', q.hands.R) : rope(cam, top, q.hands))];
    };
    return { view: 'stand', up: 'b', rest: 'a', cam: [-62, 8], one, at: at_, gear };
  };

  /* ════ jalón con brazos rectos y pullover en polea o máquina ════ */
  const straightArm = f => {
    const w = x => has(f, x), ropeA = w('rope'), machine = w('machine');
    if (machine) {
      /* la máquina de pullover: sentado, los codos en las almohadillas de una palanca que gira a la altura de los hombros; los
         brazos bajan de por encima de la cabeza a delante del tronco */
      const body = { ...SEAT, tilt: -6 }, { F: F0 } = pose({ ...body, hands: ZERO, elbow: {} });
      const at_ = t => ({ ...body, ...arms(['L', 'R'], s => ({ ...armAt(F0, body, s, mix(168, 40, t), 6, 72, { hx: 22 }), bd: [1, 0, 0] })) });
      const gear = (q, F, cam) => {
        const out = [], seat = at(F0.pelvis, [0, -22, -6]), b0 = at(F0.thorax, [0, -30, -26]), b1 = at(F0.thorax, [0, 110, -26]), n = F0.thorax.z, { J } = pose(q);
        out.push(...GR.under([GR.padAB(cam, [0, seat[1] - 7, seat[2] - 22], [0, seat[1] - 7, seat[2] + 34], UP, 30, 7), GR.padAB(cam, add(b0, mul(n, -7)), add(b1, mul(n, -7)), n, 26, 7), ...GR.leg(cam, [0, seat[1] - 14, seat[2]]), ...GR.stack(cam, [0, 0, b0[2] - 60], [0, 0, 1], 12)], 3));
        /* el armazón: un montante a cada lado, de la base al eje (a la altura del hombro, por fuera), unidos por una viga por detrás
           del respaldo; la base, del asiento a la pila; el cable, de la pila a lo alto */
        const S0 = shoulder(F0, 'L', body), zb = b0[2] - 30;
        out.push(...GR.under([...[-1, 1].flatMap(k => [...GR.beam(cam, [k * 96, 4, S0[2]], [k * 96, S0[1], S0[2]], 6), ...GR.beam(cam, [k * 96, S0[1], S0[2]], [k * 96, S0[1], zb], 5), ...GR.beam(cam, [k * 96, 4, S0[2]], [k * 96, 4, zb - 30], 5)]),
          ...GR.beam(cam, [-96, S0[1], zb], [96, S0[1], zb], 5), ...GR.beam(cam, [-96, 4, zb - 30], [96, 4, zb - 30], 5), ...GR.beam(cam, [0, 4, zb - 30], [0, 4, seat[2] + 20], 5),
          ...GR.cableLine(cam, [0, 10 + 12 * 6.4 + 40, b0[2] - 60], [0, S0[1] - 4, zb])], 2));
        ['L', 'R'].forEach(s => { const S = J[s].sh, E = J[s].el, xo = sd(s, [88, 0, 0])[0], pv = [xo, S[1], S[2]], pad = add(E, sd(s, [17, 0, 0])); out.push(GR.disc(cam, pv, [1, 0, 0], 12, 7, 'wheel'), ...GR.tube(cam, pv, [xo, pad[1], pad[2]], 8, GR.C.frame, 3), ...GR.tube(cam, [xo, pad[1], pad[2]], pad, 6, GR.C.frame, 1), ...GR.tube(cam, add(pad, mul(norm(sub(E, S)), -12)), add(pad, mul(norm(sub(E, S)), 10)), 9, GR.C.pad, 1)); });
        return out;
      };
      return { view: 'seat', up: 'b', rest: 'a', cam: [-62, 10], at: at_, gear };
    }
    /* de pie frente a la polea alta, un paso atrás de la torre y con el tronco inclinado: los brazos rectos bajan desde arriba y
       delante (el cable, en diagonal; antes casi en vertical, con las manos pegadas a la polea) hasta los muslos */
    const body = { ...STAND, tilt: 24, spine: 4, neck: -12, feet: both(() => [20, 0, 8]), knee: both(() => [.2, .1, 1]) }, { F: F0, J: J0 } = pose({ ...body, hands: ZERO, elbow: {} });
    const gx = ropeA ? null : 30;
    let fl1 = 4;
    for (; fl1 < 40; fl1 += .5) { const H = armAt(F0, body, 'L', fl1, 0, 6, gx != null ? { hx: gx } : {}).H; if (H[2] >= frontAt(F0, J0, H[1]) + 10) break; }
    const at_ = t => {
      const o = arms(['L', 'R'], s => ({ ...armAt(F0, body, s, mix(132, fl1, t), ropeA ? 4 : 0, 8, ropeA ? { hx: mix(14, 30, t) } : { hx: gx }), bd: ropeA ? [0, 1, 0] : [1, 0, 0] }));
      if (!ropeA) { o.barC = mix(o.hands.L, o.hands.R, .5); o.grip = gx; }
      return { ...body, ...o };
    };
    const gear = (q, F, cam) => {
      const m = mix(q.hands.L, q.hands.R, .5), top = add(m, mul(norm(sub([0, 410, 236], m)), ropeA ? 16 : 3));
      return [...GR.pulleyTower(cam, [14, 0, 236], 410, top), ...(ropeA ? rope(cam, top, q.hands) : shortBar(cam, q.barC, gx))];
    };
    return { view: 'stand', up: 'b', rest: 'a', cam: [-70, 8], at: at_, gear };
  };

  /* ════ pullover ════ */
  const pullover = f => {
    const ez = has(f, 'ez');
    const body = { root: [0, 128, 10], tilt: -90, spine: -3, neck: 8, reach: -3, feet: both(() => [56, 80, 20]), knee: both(() => [.35, 1, .4]) };
    const { F: F0 } = pose({ ...body, hands: ZERO, elbow: {} });
    /* tumbado en el banco: los brazos, casi estirados, van de verticales sobre el pecho a por detrás de la cabeza y vuelven */
    const gx = ez ? 24 : 7;
    const at_ = t => {
      const o = arms(['L', 'R'], s => { const a = armAt(F0, body, s, mix(96, 176, t), 0, 16, { hx: gx }); return { ...a, bd: ez ? M.ezFit(s, a.v, 180, gx) : [1, 0, 0] }; });
      o.barC = mix(o.hands.L, o.hands.R, .5); o.grip = gx;
      return { ...body, ...o };
    };
    const gear = (q, F, cam) => [...benchUnder(cam, F0, 0), ...(ez ? ezBar(cam, q.barC, gx, ezCd(F, gx)) : GR.dumbbell(cam, add(q.barC, [0, -24, 0]), [0, 1, 0]))];
    return { view: 'bench', up: 'a', rest: 'a', cam: [-62, 18], at: at_, gear };
  };

  Object.assign(F3.FAMILIES, { pushup, pressOut, rearFly, lateral, cross: cross_, shrug, frontRaise, fly, upright, facePull, straightArm, pullover });
})(window);
