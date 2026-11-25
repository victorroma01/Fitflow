/* ═══ figuras 3D: core y lo que queda de pierna (lote 6) ═══
   Abdominales (crunch, sit-up y sus variantes, elevaciones de piernas, planchas y hollow, dead bug, bird dog, giros, rueda,
   leñador, Pallof y vacío abdominal), lumbares (hiperextensiones, GHD, superman y la máquina), gemelos y tibial, abductores y
   aductores, patadas de glúteo, step up, sissy, pistol, pasos laterales con banda y zancada lateral.
   Las mismas reglas que el resto: lo que se apoya (la espalda, la pelvis, los antebrazos, las rodillas) toca el suelo o el
   acolchado con el grosor del dibujo, sin hundirse ni flotar; lo que no se mueve (los pies que empujan, las manos en el
   suelo) no se mueve, y nada atraviesa el cuerpo ni el material. Usa lo de brazos3d.js (F3.blib).
   Define: Fig3D.FAMILIES.crunch, .plank, .hyper, .legRaise, .twist, .wheelRoll, .sidePlank, .chop, .deadBug, .pallof,
   .birdDog, .vacuum, .calf, .tib, .hipOpen, .kick, .stepUp, .sissy, .pistol, .bandWalk, .sideLunge */
(function (G) {
  const F3 = G.Fig3D, L = F3.lib, GR = F3.gear, M = F3.mlib, B = F3.blib;
  const { add, sub, mul, dot, cross, len, norm, perp, mix, ease, clamp, at, RAD, LEN } = L;
  const { has, pose, torso, pivotFor, leverAt, ZERO, UP, sd, both, shoulder, span, comOf, midFoot, solve, legRoot, bodyCaps, onThigh, prof1, THIGH_F, THIGH_W, visTag } = M;
  const { STAND, ROOT_Y, LU, LF, STEEL, hintL, armAt, onHip, keys, cycle, flatBench } = B;
  const { cos, sin, PI, abs, max, min, sqrt, atan2 } = Math;
  const DEG = 180 / PI;

  /* (la curva suave, la de mov3d.js) */
  const spl = M.spl;

  /* ── lo que se apoya ── */
  /* lo más bajo del cuerpo tal como se dibuja, a lo largo de n (por omisión, hacia arriba: lo más bajo): el tronco (su sección a
     cada altura, una elipse), la cabeza (el cráneo y la cara), y si se pide, brazos y piernas (cápsulas del grosor del dibujo)
     y los pies (los elipsoides de la zapatilla) */
  const TV = [62, 72, 82, 92, 102, 112, 122, 132, 142, 152, 160, 170, 180, 190, 200, 208, 216, 222];
  const ell = (Fr, c, r, n) => dot(at(Fr, c), n) - sqrt((r[0] * dot(Fr.x, n)) ** 2 + (r[1] * dot(Fr.y, n)) ** 2 + (r[2] * dot(Fr.z, n)) ** 2);
  const FOOT = [[[0, -12, -5], [6.5, 7.5, 6.5]], [[0, -3, 0], [6.5, 7, 7]], [[0, -11, 10], [8, 7.5, 9]], [[0, -15, 25], [9, 4.8, 8]], [[0, -16.5, 35], [7.5, 3.4, 6]]];
  const lowOf = (F, J, n = UP, o = {}) => {
    let m = 1e9;
    for (const v of TV) { const p = B.prof(L.TRUNK3, v), th = v < 160, Fr = th ? F.thorax : F.pelvis; m = min(m, ell(Fr, [0, th ? 160 - v : 205 - v, p[3]], [p[1], 0, p[2]], n)); }
    if (o.pelvis) { m = 1e9; for (const v of TV) if (v >= 180) { const p = B.prof(L.TRUNK3, v); m = min(m, ell(F.pelvis, [0, 205 - v, p[3]], [p[1], 0, p[2]], n)); } return m; }
    if (!o.noHead) m = min(m, ell(F.head, [0, 7, -1.5], [15, 16.5, 17.5], n), ell(F.head, [0, -5, 6], [13.2, 9.5, 10], n));
    if (o.limbs) for (const [a, b, r] of bodyCaps(J)) m = min(m, dot(a, n) - r, dot(b, n) - r);
    if (o.feet) for (const s of ['L', 'R']) for (const [c, r] of FOOT) m = min(m, ell(F['foot' + s], c, r, n));
    return m;
  };
  /* toda la postura movida d: la raíz, los pies (que se dan en el mundo: x de cada lado, z, y la altura del tobillo) y las
     manos (y lo que llevan) */
  const shF = (fo, d, k) => { const o = [...fo]; o[0] += k * d[0]; o[1] += d[2]; o[3] = (o[3] || 0) + d[1]; while (o.length < 4) o.push(0); return o; };
  const shift = (q, d) => {
    const o = { ...q, root: add(q.root, d) };
    if (q.feet) o.feet = { L: shF(q.feet.L, d, 1), R: shF(q.feet.R, d, -1) };
    if (q.hands) o.hands = { L: add(q.hands.L, d), R: add(q.hands.R, d) };
    if (q.barC) o.barC = add(q.barC, d);
    return o;
  };
  /* lo que hay que subir (a lo largo de n) la postura para que su punto más bajo quede en el plano dot(p, n) = d0 */
  const NOLEG = { feet: both(() => [20, 0, 0]), knee: both(() => [0, 0, 1]), hands: ZERO, elbow: {} };
  const restOn = (q, n = UP, d0 = 0, o = {}) => { const { F, J } = pose({ ...NOLEG, ...q }); return d0 - lowOf(F, J, n, o); };

  /* ── piernas y brazos dados por direcciones ── */
  /* la pierna desde la cadera hip: el muslo hacia d1 y la espinilla hacia d2 (en el mundo); front: hacia dónde mira la
     rótula si la pierna va estirada. Da el tobillo (como pie del motor: x, z, giro de la punta, altura), la pista de la rodilla
     y los ejes del pie, con la planta en ángulo recto con la espinilla y la punta estirada pf grados */
  const legAt = (hip, d1, d2, s, front, pf = 20) => {
    d1 = norm(d1); d2 = norm(d2);
    const K = add(hip, mul(d1, LEN.thigh)), A = add(K, mul(d2, LEN.shin)), ax = norm(sub(A, hip)), kb = sub(sub(K, hip), mul(ax, dot(sub(K, hip), ax)));
    const kh = len(kb) > 2 ? norm(kb) : norm(front);
    /* el pie: hacia la rodilla, -d2; la punta, hacia donde mira la rótula (perpendicular a la espinilla), girada pf hacia d2 */
    const n = perp(kh, d2), p = RAD(pf), fy = add(mul(d2, -cos(p)), mul(n, sin(p))), fz = add(mul(n, cos(p)), mul(d2, sin(p)));
    return { foot: [s == 'L' ? A[0] : -A[0], A[2], 0, A[1] - LEN.ankle], knee: hintL(s, kh), fd: { y: fy, z: fz }, A, K };
  };
  /* las dos piernas con legAt: lo que va en la postura */
  const legsOf = (o) => ({ feet: { L: o.L.foot, R: o.R.foot }, knee: { L: o.L.knee, R: o.R.knee }, footDir: { L: o.L.fd, R: o.R.fd } });
  /* una dirección en el plano de delante (y, z) a a grados de +z hacia +y (tumbado boca arriba: 0, hacia los pies; 90, arriba) */
  const yz = a => [0, sin(RAD(a)), cos(RAD(a))];
  /* el brazo s desde el hombro, estirado (o doblado e grados hacia n) hacia la dirección u del mundo (dada para el lado izquierdo) */
  const armTo = (F, q, s, u, e = 0, n = [0, 1, 0], k = 1) => {
    const S = shoulder(F, s, q), U = norm(sd(s, u)), N = perp(sd(s, n), U), r = RAD(e);
    const E = add(S, mul(U, LU)), V = add(mul(U, cos(r)), mul(N, sin(r))), Hh = add(E, mul(V, LF * k));
    return { H: Hh, hint: hintL(s, norm(add(sub(E, mix(S, Hh, .5)), mul(N, -.5)))) };
  };
  /* las manos en las sienes (los dedos hacia la frente, las palmas hacia la cabeza) y los codos abiertos */
  const temples = (F, ss = ['L', 'R']) => {
    const o = { hands: {}, elbow: {}, handDir: {}, palm: {} };
    for (const s of ss) { o.hands[s] = at(F.head, sd(s, [21, 3, -6])); o.handDir[s] = norm(sub(at(F.head, [0, 10, 14]), at(F.head, [0, 0, -4]))); o.elbow[s] = hintL(s, norm(add(F.head.x.map(v => v * (s == 'L' ? 1 : -1)), mul(F.head.z, .25)))); o.palm[s] = [-1, 0, 0]; }
    return { ...o, fist: false };
  };
  /* las manos detrás de la cabeza, junto a las orejas (los dedos hacia la nuca, las palmas hacia la cabeza) y los codos bien
     abiertos a los lados */
  const behindHead = (F, ss = ['L', 'R']) => {
    const o = { hands: {}, elbow: {}, handDir: {}, palm: {} };
    for (const s of ss) { const k = s == 'L' ? 1 : -1, H = at(F.head, sd(s, [15, 4, -11])); o.hands[s] = H; o.handDir[s] = norm(sub(at(F.head, [0, 6, -17]), at(F.head, sd(s, [16, 2, 2])))); o.elbow[s] = hintL(s, norm(add(mul(F.head.x, k), add(mul(F.head.z, .08), mul(F.head.y, -.1))))); o.palm[s] = [-1, 0, 0]; }
    return { ...o, fist: false };
  };
  /* los brazos cruzados sobre el pecho: cada mano en el hombro contrario, el antebrazo izquierdo por encima */
  const crossed = (F, dzL = 0, dzR = 0, lift = 0) => {
    /* (los codos, delante de la parte baja del pecho, hacia la cintura: antes apuntaban hacia la cara; lift los sube, para
       cuando el tronco se inclina sobre algo que tiene delante) */
    const hint = (s, v) => hintL(s, norm(add(add(mul(F.thorax.x, v[0]), mul(F.thorax.y, v[1] + lift)), mul(F.thorax.z, v[2]))));
    /* (layers: sobre el pecho, los brazos; encima, el antebrazo derecho, con su mano en el hombro izquierdo; y por fuera de
       todo, el izquierdo) */
    /* (los dedos, por encima del hombro hacia fuera y algo atrás, como al abrazarse: antes apuntaban a la barbilla y, al
       doblar el cuello, se metían en ella) */
    const fd = s => norm(add(add(mul(F.thorax.x, s == 'L' ? -.55 : .55), mul(F.thorax.y, .75)), mul(F.thorax.z, -.25)));
    return { hands: { L: at(F.thorax, [-24, 80, 37 + dzL]), R: at(F.thorax, [24, 66, 30 + dzR]) }, elbow: { L: hint('L', [0, -.58, .82]), R: hint('R', [0, -.9, .36]) }, handDir: { L: fd('L'), R: fd('R') }, palm: { L: hintL('L', mul(F.thorax.z, -1)), R: hintL('R', mul(F.thorax.z, -1)) }, fist: false, layers: [['upperL', 'upperR'], ['foreR', 'handR'], ['foreL', 'handL']] };
  };

  /* ── material ── */
  /* una bola (balón suizo, balón medicinal): un círculo con su brillo, que se ordena por su centro */
  const ball = (cam, c, r, col = ['#262a3c', '#6a7190', '#3a3f58']) => {
    const P = cam.P(c), f = v => Math.round(v * 10) / 10;
    return [{ z: P[2], svg: `<circle cx="${f(P[0])}" cy="${f(P[1])}" r="${f(r)}" fill="${col[0]}" stroke="${col[1]}" stroke-width="1.3"/><ellipse cx="${f(P[0] - r * .32)}" cy="${f(P[1] - r * .36)}" rx="${f(r * .42)}" ry="${f(r * .3)}" fill="${col[2]}" opacity=".7"/><path d="M${f(P[0] - r)} ${f(P[1])}Q${f(P[0])} ${f(P[1] + r * .38)} ${f(P[0] + r)} ${f(P[1])}" fill="none" stroke="${col[1]}" stroke-width="1" opacity=".5"/>` }];
  };
  /* un balón medicinal (más pequeño y con sus costuras) */
  const medBall = (cam, c, r = 21) => ball(cam, c, r, ['#2a2318', '#8a7a58', '#4a3f2a']);
  /* una barra olímpica a lo largo de ax (no solo de través): la de los giros con barra sobre los hombros */
  const barAx = (cam, c, ax, grip) => {
    const a = norm(ax), X = x => add(c, mul(a, x)), out = [];
    let spans = [[-139, 139]];
    if (grip) [[-grip - 8, -grip + 8], [grip - 8, grip + 8]].forEach(([u, v]) => { spans = spans.flatMap(([m, n]) => v <= m || u >= n ? [[m, n]] : [[m, u], [v, n]].filter(([i, j]) => j - i > 1)); });
    spans.forEach(([u, v]) => { const it = L.bar(cam, X(u), X(v), max(1, Math.round((v - u) / 18)), 5.2); if (grip) [[u, 0], [v, it.length - 1]].forEach(([e, i]) => { if (abs(abs(e) - grip) < 9) it[i].hand = e > 0 ? 'L' : 'R'; }); out.push(...it); });
    [-1, 1].forEach(k => out.push(...L.bar(cam, X(k * 141), X(k * 222), 4, 7.6), GR.disc(cam, X(k * 151), a, 49, 12), GR.disc(cam, X(k * 163), a, 40, 9), GR.disc(cam, X(k * 171), a, 7.5, 5, 'metal')));
    return out;
  };
  /* un disco suelto (de 10 kg) con su eje */
  const plate10 = (cam, c, ax) => [GR.disc(cam, c, ax, 30, 5.5)];

  /* ════ crunch, sit-up y sus variantes ════ */
  const crunch = f => {
    const w = x => has(f, x);
    if (w('cable')) return cableCrunch();
    if (w('machine')) return machineCrunch();
    if (w('ghd')) return ghdSitup();
    if (w('decline')) return declineSitup();
    if (w('ball')) return ballCrunch();
    const situp = w('situp'), abmat = w('abmat'), bike = w('bike'), vup = w('vup'), heel = w('heel'), weight = w('weight');
    /* tumbado boca arriba (la cabeza hacia -z), las rodillas dobladas y los pies apoyados; la espalda (o la pelvis, al
       subir) toca el suelo. P(t): la pelvis (tilt), la columna (spine), el cuello y el giro y la inclinación del tronco */
    const P = t => {
      if (situp) {
        /* primero se enrolla la columna y luego sube el tronco entero, hasta quedar sentado */
        const a = span(t, 0, .45), b = span(t, .2, 1);
        return abmat ? { tilt: mix(-84, -14, b), spine: mix(-12, 24, a) - 6 * b, neck: mix(-4, 14, a) } : { tilt: mix(-90, -12, b), spine: mix(0, 26, a) - 8 * b, neck: mix(0, 16, a) - 6 * b };
      }
      if (vup) return { tilt: mix(-90, -38, t), spine: mix(0, 16, t), neck: mix(0, 12, t) };
      if (bike) { const ph = 2 * PI * t; return { tilt: -88, spine: 24, neck: 18, twist: 30 * sin(ph) }; }
      if (heel) { const ph = 2 * PI * t; return { tilt: -90, spine: 20, neck: 16, bend: 15 * sin(ph) }; }
      return { tilt: mix(-90, -87, t), spine: mix(0, 32, t), neck: mix(0, 16, t) };
    };
    /* la raíz: la cadera en z = 0 y apoyada (lo más bajo del tronco y la cabeza, en el suelo; sobre el abmat, en su
       superficie) */
    const body = t => { const p = P(t), q = { root: [0, 0, 0], shrug: 0, ...p }; return shift(q, [0, restOn(q), 0]); };
    const q0 = body(0), hip0 = at(torso(q0).pelvis, [20, 0, 0]);
    /* los pies: apoyados, con la rodilla doblada en ángulo algo más que recto (en el sit-up de CrossFit, juntas las plantas
       y las rodillas abiertas) */
    /* (en el sit-up, los pies algo más lejos: arriba, las rodillas quedan bajas y no tocan los brazos cruzados; en el de
       CrossFit, las plantas juntas cerca del cuerpo y las rodillas caídas hacia fuera, casi en el suelo) */
    const zF = hip0[2] + (abmat ? 66 : 126);
    const feetFlat = abmat
      ? { feet: { L: [7, zF, 0, -4], R: [7, zF, 0, -4] }, knee: both(() => [.95, .3, 0]), footDir: { L: { y: [.95, .3, 0], z: [0, 0, 1] }, R: { y: [-.95, .3, 0], z: [0, 0, 1] } } }
      : { feet: both(() => [22, zF, 6]), knee: both(() => [.08, 1, 0]) };
    const legsUp = (q, t) => {
      const T = torso(q), hip = s => at(T.pelvis, sd(s, [20, 0, 0]));
      if (bike) {
        /* en la bicicleta, una rodilla al pecho mientras la otra pierna se estira, a un palmo del suelo */
        const ph = 2 * PI * t, u = s => (1 + sin(s == 'L' ? ph : ph + PI)) / 2;
        const lg = s => { const a = mix(26, 112, u(s)), b = mix(8, 118, u(s)); return legAt(hip(s), yz(a), yz(a - b), s, yz(a + 90), 25); };
        return legsOf({ L: lg('L'), R: lg('R') });
      }
      /* en los V-ups, las piernas estiradas: del suelo (los talones apoyados) hasta arriba */
      const h = hip('L')[1], a0 = -DEG * Math.asin(clamp((h - 15) / (LEN.thigh + LEN.shin), -1, 1)), a = mix(a0, 62, t);
      return legsOf({ L: legAt(hip('L'), yz(a), yz(a), 'L', yz(a + 90), 35), R: legAt(hip('R'), yz(a), yz(a), 'R', yz(a + 90), 35) });
    };
    const at_ = t => {
      let q = body(t);
      q = { ...q, ...(bike || vup ? legsUp(q, t) : feetFlat) };
      const { F } = pose({ ...q, hands: ZERO, elbow: {} });
      if (bike) return { ...q, ...behindHead(F) };
      if (heel) {
        /* las manos, por los costados hacia los talones, a un palmo del suelo: con el tronco ladeado, una llega más lejos */
        const { J } = pose({ ...q, hands: ZERO, elbow: {} }), o = { hands: {}, elbow: {}, palm: {}, fist: false };
        for (const s of ['L', 'R']) { const S = shoulder(F, s, q), tgt = add(J[s].ankle, sd(s, [34, 4, -22])), a = armTo(F, q, s, sd(s, norm(sub(tgt, S))), 4, [0, 1, 0]); o.hands[s] = a.H; o.elbow[s] = a.hint; o.palm[s] = [-1, 0, 0]; }
        return { ...q, ...o };
      }
      if (vup) {
        /* los brazos: de estirados por encima de la cabeza, en el suelo, a estirados hacia los pies */
        const o = { hands: {}, elbow: {}, palm: {}, fist: false };
        for (const s of ['L', 'R']) { const S = shoulder(F, s, q), dy = 12 - S[1], u0 = norm([.1, dy / (LU + LF), -sqrt(max(0, 1 - (dy / (LU + LF)) ** 2))]), u1 = norm(add(yz(54), [0, -.18, 0])), u = norm(mix(u0, u1, ease(t))), a = armTo(F, q, s, [.1 * (1 - t), u[1], u[2]], 0); o.hands[s] = a.H; o.elbow[s] = a.hint; o.palm[s] = [-1, 0, 0]; }
        return { ...q, ...o };
      }
      if (situp && abmat) {
        /* las manos: tocan el suelo detrás de la cabeza y, al subir, van a los pies */
        const o = { hands: {}, elbow: {}, palm: {}, fist: false }, k = span(t, .25, 1);
        for (const s of ['L', 'R']) { const S = shoulder(F, s, q), dy = 10 - S[1], u0 = norm([.2, dy / (LU + LF), -1]), tgt = [sd(s, [19, 0, 0])[0], 34, zF + 6], u1 = sd(s, norm(sub(tgt, S))), up = [0, 1, 0], u = k < .5 ? norm(mix(u0, up, k * 2)) : norm(mix(up, u1, k * 2 - 1)), a = armTo(F, q, s, u, 4); o.hands[s] = a.H; o.elbow[s] = a.hint; o.palm[s] = [-1, 0, 0]; }
        return { ...q, ...o };
      }
      if (situp) return { ...q, ...crossed(F) };
      /* los brazos cruzados sobre el pecho (con el disco, por encima de él, sujetándolo) */
      if (weight) return { ...q, ...crossed(F, 22, 16) };
      return { ...q, ...crossed(F) };
    };
    const gear = (q, F, cam) => {
      if (weight) return [GR.disc(cam, at(F.thorax, [0, 67, 33.6]), F.thorax.z, 19, 4.5)];
      if (abmat) {
        /* el abmat: una cuña blanda bajo la zona lumbar, en el suelo, donde apoya la espalda al empezar */
        const T = torso(q0), a = at(T.pelvis, [0, 20, -26]), b = at(T.thorax, [0, 30, -24]);
        return GR.under([GR.padAB(cam, [0, 4, a[2]], [0, 4, b[2]], UP, 30, 4, ['#2e3346', '#646b8a'])]);
      }
      return [];
    };
    /* (con los brazos cruzados, cada brazo va a un sitio: no es simétrico) */
    const ex = { view: 'bench', up: bike || heel ? 'a' : 'b', rest: 'a', cam: [-62, 26], feetOff: true, one: bike || heel || !(vup || abmat), at: at_, gear };
    if (bike) ex.beat = cycle(2600);
    if (heel) ex.beat = cycle(2400);
    return ex;
  };
  /* de rodillas: las rodillas en el suelo bajo la cadera (o a z de ella), las espinillas tumbadas detrás y el empeine
     apoyado (la punta hacia atrás) */
  const KNEE_Y = 12, kneel = (zK, w = 16) => ({ feet: both(() => [w, zK - sqrt(LEN.shin ** 2 - (KNEE_Y - 7) ** 2), 0, 7 - LEN.ankle]), knee: both(() => [0, -.15, 1]), footDir: both(() => ({ y: [0, -1, 0], z: [0, 0, -1] })) });
  /* la raíz para que la rodilla quede en (±w, KNEE_Y, zK) con el muslo a a grados de la vertical (hacia delante) */
  const kneelRoot = (zK, a = 0) => [0, KNEE_Y + LEN.thigh * cos(RAD(a)), zK + LEN.thigh * sin(RAD(a))];

  /* el crunch en polea alta: de rodillas frente a la polea, la cuerda junto a la cabeza; la cadera no se mueve (no se sienta
     hacia los talones) y el tronco se enrolla llevando los codos hacia las rodillas */
  const cableCrunch = () => {
    /* (la polea, alta y algo por delante de la cabeza; la torre, lo bastante lejos para que la cabeza, abajo, quede por
       delante de ella: antes se metía en la columna) */
    const pul = [0, 430, 172];
    const at_ = t => {
      const q = { root: kneelRoot(0, 4), tilt: mix(10, 17, t), spine: mix(6, 60, t), neck: mix(4, 22, t), ...kneel(0) }, { F } = pose({ ...q, hands: ZERO, elbow: {} });
      /* las manos, con los extremos de la cuerda a los lados de la cabeza y algo hacia la polea: la cuerda y el cable quedan
         siempre por el lado de la polea, sin pasar por la cabeza */
      const hc = at(F.head, [0, 4, 2]), P = norm(sub(pul, hc));
      return { ...q, hands: both(s => add(add(hc, sd(s, [21, 0, 0])), mul(P, 15))), elbow: both(() => [.35, -.5, 1]), barDir: both(() => P) };
    };
    const gear = (q, F, cam) => {
      /* el nudo de la cuerda: por encima de las manos, hacia la polea */
      const m = mix(q.hands.L, q.hands.R, .5), top = add(m, mul(norm(sub(pul, m)), 34));
      return [...GR.station(cam, pul, [0, 0, 1], { d: 46, h: 470 }), ...GR.cableLine(cam, pul, top), ...B.rope(cam, top, q.hands)];
    };
    return { view: 'front', up: 'b', rest: 'a', cam: [-66, 14], feetOff: true, at: at_, gear };
  };

  /* la máquina de crunch: sentado, los pies bajo los rodillos y las asas junto a los hombros, en una palanca que gira a los
     lados del tronco (su eje, el centro del arco que hacen los hombros al enrollarse) */
  const machineCrunch = () => {
    const base = { root: [0, 118, 0], feet: both(() => [24, 70, 8]), knee: both(() => [.15, .6, .8]) };
    const at0 = t => { const q = { ...base, tilt: mix(-4, 12, t), spine: mix(0, 42, t), neck: mix(0, 14, t) }, { F } = pose({ ...q, hands: ZERO, elbow: {} }); return { ...q, hands: both(s => at(F.thorax, sd(s, [34, 104, 22]))), elbow: both(() => [.5, -.7, .5]), barDir: both(() => [0, 0, 1]) }; };
    let piv = null;
    const pivot = () => {
      if (piv) return piv;
      const [a, b, c] = [0, .5, 1].map(t => at0(t).hands.L), y1 = a[1], z1 = a[2], y2 = b[1], z2 = b[2], y3 = c[1], z3 = c[2];
      const d = 2 * (y1 * (z2 - z3) + y2 * (z3 - z1) + y3 * (z1 - z2)) || 1e-6, s1 = y1 * y1 + z1 * z1, s2 = y2 * y2 + z2 * z2, s3 = y3 * y3 + z3 * z3;
      return (piv = [0, (s1 * (z2 - z3) + s2 * (z3 - z1) + s3 * (z1 - z2)) / d, (s1 * (y3 - y2) + s2 * (y1 - y3) + s3 * (y2 - y1)) / d]);
    };
    const gear = (q, F, cam) => {
      const out = [], P = pivot(), X = 66, seat = [0, 104, 0];
      /* el asiento y el respaldo, el armazón con la pila detrás, los rodillos de los pies y las dos palancas con sus asas */
      out.push(...GR.under([GR.padAB(cam, [0, 97, -26], [0, 97, 30], UP, 30, 7), GR.padAB(cam, [0, 118, -44], [0, 236, -50], [0, 0, 1], 26, 7), ...GR.beam(cam, [0, 4, -60], [0, 250, -64], 7), ...GR.beam(cam, [0, 90, 0], [0, 4, 0], 6), ...GR.beam(cam, [0, 4, -110], [0, 4, 96], 6), ...GR.stack(cam, [0, 0, -100], [0, 0, 1], 12)], 2));
      out.push(...GR.beam(cam, [0, 40, 96], [0, 4, 96], 5), ...GR.tube(cam, [-30, 40, 92], [30, 40, 92], 9, GR.C.pad, 2), ...GR.beam(cam, [-X - 8, P[1], P[2]], [X + 8, P[1], P[2]], 5));
      ['L', 'R'].forEach(s => { const k = s == 'L' ? 1 : -1, h = q.hands[s], hb = [k * X, h[1], h[2]]; out.push(...GR.hub(cam, [k * X, P[1], P[2]], [1, 0, 0], 8), ...GR.beam(cam, [k * X, P[1], P[2]], hb, 4.5), ...GR.beam(cam, hb, add(h, [k * 9, 0, 0]), 3.5), ...GR.rubber(cam, add(h, [0, 0, -9]), add(h, [0, 0, 9])).map(i => ({ ...i, hand: s }))); });
      return out;
    };
    return { view: 'seat', up: 'b', rest: 'a', cam: [-58, 12], at: at0, gear };
  };

  /* el GHD sit-up: sentado en el sillín del GHD con los pies bajo los rodillos; el tronco baja hacia atrás por debajo de la
     horizontal (los brazos, estirados por encima de la cabeza) y sube con fuerza hasta tocarse los pies */
  /* (el sillín, a la altura de la cadera de pie: abajo, la cabeza no llega al suelo) */
  const GHD = { padY: 196, padZ: -6, footZ: 150, footY: 178 };
  /* el GHD: dir 1, los pies hacia +z (el sit-up); -1, hacia -z (la extensión de cadera, boca abajo). La plataforma de los pies,
     donde apoyan las plantas (perpendicular a las piernas, no plana bajo ellas), con su poste hasta el carril; F, la postura
     (los pies no se mueven) */
  const ghdFrame = (cam, F, dir = 1, padZ = GHD.padZ * dir) => {
    const out = [], Y = GHD.padY, Z = padZ, fy = F.footL.y, fz = F.footL.z, A = mix(F.footL.o, F.footR.o, .5), Am = [0, A[1], A[2]];
    /* (la planta, 20 por debajo del tobillo según el pie, y algo hacia los dedos) */
    const pc = add(add(Am, mul(fy, -22.5)), mul(fz, 9)), FZ = pc[2] - dir * 4, bot = add(pc, mul(fz, -24));
    /* el sillín (doble), el carril del suelo, sus patas y la plataforma de los pies con su poste */
    out.push(GR.padAB(cam, [0, Y - 7, Z - 34], [0, Y - 7, Z + 34], UP, 26, 8), ...GR.beam(cam, [0, Y - 16, Z], [0, 4, Z], 7), ...GR.beam(cam, [0, 4, Z - 70 * dir], [0, 4, FZ + 40 * dir], 7), ...GR.beam(cam, [-40, 4, Z - 70 * dir], [40, 4, Z - 70 * dir], 6), ...GR.beam(cam, [-40, 4, FZ + 30 * dir], [40, 4, FZ + 30 * dir], 6));
    out.push(...GR.beam(cam, [0, 4, FZ + 22 * dir], add(bot, mul(fy, -6)), 6), GR.obox(cam, pc, [[1, 0, 0], fy], [30, 2.5, 22], GR.C.frame));
    return GR.under(out, 1);
  };
  /* los dos rodillos que sujetan la parte baja de las piernas, justo encima de los tobillos: uno por delante (sobre el empeine) y
     otro por detrás (contra el talón y el tendón) */
  const ghdRollers = (cam, q, F) => { const fr = { o: mix(F.footL.o, F.footR.o, .5), x: [1, 0, 0], y: F.footL.y, z: F.footL.z }, a = at(fr, [0, 11, 16]), b = at(fr, [0, -4, -19]); return [...GR.tube(cam, add(a, [-28, 0, 0]), add(a, [28, 0, 0]), 7, GR.C.pad, 2), ...GR.tube(cam, add(b, [-28, 0, 0]), add(b, [28, 0, 0]), 7, GR.C.pad, 2)]; };
  const ghdSitup = () => {
    const at_ = t => {
      /* t = 0: sentado y tocándose los pies; 1: abajo, extendido hacia atrás */
      /* (sentado en el borde de atrás del sillín: los muslos apoyados en él y los glúteos fuera, para que la cadera se pueda
         extender por debajo de la horizontal; antes se sentaba encima, en medio del sillín) */
      const tl = mix(-12, -118, t), q = { root: [0, GHD.padY + 1 + 17, GHD.padZ - 34 - 9], tilt: tl, spine: mix(22, -6, t), neck: mix(14, -8, t) }, T = torso(q);
      /* las piernas, boca arriba como el tronco: los muslos sobre el sillín, las rodillas algo dobladas hacia arriba y las
         espinillas bajando hasta los pies, con las puntas hacia arriba y las plantas contra la plataforma. Antes la rodilla se
         doblaba hacia abajo y los pies apuntaban al suelo, como si estuviera boca abajo */
      const lg = s => legAt(at(T.pelvis, sd(s, [20, 0, 0])), [0, -.12, .993], [0, -.36, .933], s, [0, 1, 0], 4);
      const lq = { ...q, ...legsOf({ L: lg('L'), R: lg('R') }) }, { F } = pose({ ...lq, hands: ZERO, elbow: {} }), o = { hands: {}, elbow: {}, palm: {}, fist: false };
      for (const s of ['L', 'R']) { const S = shoulder(F, s, lq), toFeet = norm(sub(add(F['foot' + s].o, [0, 14, 4]), S)), over = norm(add(mul(F.thorax.y, 1), mul(F.thorax.z, -.08))), a = armTo(F, lq, s, add(sd(s, norm(mix(toFeet, over, span(t, .1, .9)))), [.22, 0, 0]), 4); o.hands[s] = a.H; o.elbow[s] = a.hint; o.palm[s] = [-1, 0, 0]; }
      return { ...lq, ...o };
    };
    return { view: 'bench', up: 'a', rest: 'a', cam: [-70, 16], feetOff: true, at: at_, gear: (q, F, cam) => [...ghdFrame(cam, F), ...ghdRollers(cam, q, F)] };
  };

  /* el sit-up en banco declinado: los pies sujetos arriba (las rodillas dobladas sobre el rodillo) y la espalda en el
     acolchado, inclinado; el tronco sube hasta la mitad del recorrido */
  const declineSitup = () => {
    const A = RAD(24), n = [0, cos(A), -sin(A)], top = [0, 112, 60], d0 = dot(top, n);
    const at_ = t => {
      const q0 = { root: [0, 0, 30], tilt: mix(-90 - 24, -58, t), spine: mix(0, 26, t), neck: mix(2, 18, t) };
      const q = shift(q0, mul(n, restOn(q0, n, d0))), T = torso(q), hip = s => at(T.pelvis, sd(s, [20, 0, 0]));
      const edge = add(top, add(mul([0, -sin(A), -cos(A)], -14), mul(n, 18))), lg = s => { const K = [sd(s, [20, 0, 0])[0], edge[1], edge[2]], hp = hip(s); return legAt(hp, sub(K, hp), [0, -1, .25], s, [0, 1, 0], 15); };
      const lq = { ...q, ...legsOf({ L: lg('L'), R: lg('R') }) }, { F } = pose({ ...lq, hands: ZERO, elbow: {} });
      return { ...lq, ...crossed(F) };
    };
    const gear = (q, F, cam) => {
      const out = [], a = add(top, mul([0, -sin(A), -cos(A)], 210)), b = add(top, mul([0, -sin(A), -cos(A)], -6));
      out.push(GR.padAB(cam, add(a, mul(n, -7)), add(b, mul(n, -7)), n, 28, 7), ...GR.beam(cam, add(a, [0, -16, 0]), [0, 4, a[2]], 6), ...GR.beam(cam, add(b, [0, -16, 0]), [0, 4, b[2] + 30], 6), ...GR.beam(cam, [0, 4, a[2] - 20], [0, 4, b[2] + 60], 6));
      /* el rodillo de las corvas y el de los tobillos (por delante de ellos), en un brazo desde lo alto del banco */
      /* las rodillas se doblan sobre el borde de arriba del acolchado; los rodillos, delante de los tobillos, en un poste que
         baja del extremo del banco */
      const q0 = at_(0), { F: F0, J } = pose(q0), an = add(mix(J.L.ankle, J.R.ankle, .5), mul(F0.shinL.z, 17)), post = [0, 4, an[2] + 16];
      out.push(...GR.tube(cam, add(an, [-26, 0, 0]), add(an, [26, 0, 0]), 7, GR.C.pad, 2), ...GR.beam(cam, add(b, [0, -12, 4]), [0, an[1], post[2]], 5), ...GR.beam(cam, [0, an[1], post[2]], post, 5), ...GR.beam(cam, [0, an[1], post[2]], an, 4));
      return GR.under(out, 1);
    };
    return { view: 'bench', up: 'b', rest: 'a', cam: [-62, 20], feetOff: true, one: true, at: at_, gear };
  };

  /* el crunch en balón suizo: la zona lumbar apoyada arriba del balón, los pies en el suelo y las manos en el pecho; la
     espalda se arquea sobre el balón y se enrolla */
  const ballCrunch = () => {
    const R = 66, C = [0, R, -10];
    const at_ = t => {
      const q0 = { root: [0, 0, 0], tilt: mix(-80, -72, t), spine: mix(-22, 24, t), neck: mix(-6, 16, t) }, T0 = torso(q0);
      /* el punto de la espalda (la zona lumbar) que toca el balón queda sobre él, justo encima de su centro */
      const P0 = at(T0.pelvis, [0, 36, -24]), d = sub(add(C, mul(norm(sub(P0, add(P0, mul(T0.pelvis.z, -1)))), 0)), [0, 0, 0]);
      const want = add(C, mul(norm(add(mul(T0.pelvis.z, -1), [0, 0, 0])), -R));
      const q = shift(q0, sub(add(C, mul(T0.pelvis.z, R)), P0)), T = torso(q), hip = s => at(T.pelvis, sd(s, [20, 0, 0]));
      const lq = { ...q, feet: both(() => [26, hip('L')[2] + 92, 6]), knee: both(() => [.15, .7, .6]) }, { F } = pose({ ...lq, hands: ZERO, elbow: {} });
      return { ...lq, ...crossed(F) };
    };
    return { view: 'bench', up: 'b', rest: 'a', cam: [-64, 14], one: true, at: at_, gear: (q, F, cam) => GR.under(ball(cam, C, R * .98)) };
  };

  /* ── tumbado boca arriba: lo común ── */
  /* el tronco apoyado (con la cadera en z = zc) y las piernas por ángulos: a, el muslo (0, hacia los pies a ras de suelo; 90,
     vertical), b, lo que se dobla la rodilla */
  const supine = (p, zc = 0) => { const q0 = { root: [0, 0, zc], shrug: 0, ...p }; return shift(q0, [0, restOn(q0), 0]); };
  const legsAB = (q, A, Bk, pf = 25) => {
    const T = torso(q), lg = s => { const a = A[s], b = Bk[s]; return legAt(at(T.pelvis, sd(s, [20, 0, 0])), yz(a), yz(a - b), s, yz(a + 90), pf); };
    return legsOf({ L: lg('L'), R: lg('R') });
  };
  /* las manos apoyadas en el suelo junto a la cadera, palmas abajo y los brazos estirados a lo largo del cuerpo (el codo, casi
     recto, hacia fuera). Antes la mano quedaba a un palmo y medio del hombro y el codo se doblaba hacia arriba y afuera, como
     un ala */
  const palmsDown = (F, q) => {
    const o = { hands: {}, elbow: {}, palm: {}, handDir: {}, fist: false };
    for (const s of ['L', 'R']) { const S = shoulder(F, s, q), x = sd(s, [40, 0, 0])[0], dy = S[1] - 6, dx = abs(S[0] - x), r = LU + LF - 5, Hh = [x, 6, S[2] + sqrt(max(0, r * r - dy * dy - dx * dx))]; o.hands[s] = Hh; o.elbow[s] = [1, -.15, 0]; o.palm[s] = [0, -1, 0]; o.handDir[s] = [0, -.15, 1]; }
    return o;
  };
  /* el ciclo de las retenciones (plancha, hollow): solo la respiración, que mueve un poco el pecho */
  const breath = t => sin(2 * PI * t);

  /* ════ elevaciones de piernas: tumbado (con las piernas estiradas), crunch inverso y dragon flag ════ */
  const legRaise = f => {
    const w = x => has(f, x), rev = w('reverse'), dragon = w('dragon');
    if (dragon) return dragonFlag();
    const at_ = t => {
      /* (en el crunch inverso, la pelvis se enrolla y despega del suelo: la apoya lo que queda más bajo de la espalda) */
      const q = supine(rev ? { tilt: mix(-90, -122, t), spine: mix(2, 36, t), neck: 4 } : { tilt: mix(-90, -86, t), spine: 2, neck: 4 });
      const A = rev ? mix(64, 118, t) : mix(10, 88, t), Bk = rev ? 100 : 0;
      const lq = { ...q, ...legsAB(q, { L: A, R: A }, { L: Bk, R: Bk }, rev ? 15 : 30) }, { F } = pose({ ...lq, hands: ZERO, elbow: {} });
      return { ...lq, ...palmsDown(F, lq) };
    };
    return { view: 'bench', up: 'b', rest: 'a', cam: [-64, 24], feetOff: true, at: at_ };
  };
  /* el dragon flag: tumbado en un banco, agarrado a su borde por detrás de la cabeza. Sube como un crunch inverso (las
     rodillas al pecho, la cadera se despega y rueda sobre la parte alta de la espalda) y estira las piernas hacia arriba hasta
     quedar casi vertical; de ahí baja despacio con el cuerpo recto como una tabla, apoyado solo en la parte alta de la espalda,
     hasta rozar el banco. Antes subía y bajaba entero, rígido, girando sobre los hombros */
  const dragonFlag = () => {
    const top = 58, zH = -150;
    /* el ángulo del tronco (tilt), lo que se enrolla la columna, la flexión de la cadera y la de las rodillas, por tiempos (en
       una vuelta de 6,4 s): sube recogiendo las rodillas (0,9 s) y estirándolas hacia el techo (1,1 s), aguanta arriba (0,6 s),
       baja recto y despacio (3 s), se posa (0,4 s) y descansa un momento. Arriba no pasa de unos 65° (antes casi vertical,
       como haciendo el pino sobre la cabeza) */
    const K = { tl: [[0, -92], [.14, -112], [.234, -144], [.31, -155], [.406, -154], [.875, -99], [.94, -92], [1, -92]],
      sp: [[0, 0], [.14, 16], [.234, 13], [.31, 9], [.406, 8], [.875, 1], [.94, 0], [1, 0]],
      hf: [[0, 2], [.14, 104], [.234, 58], [.31, 6], [.406, 5], [.875, 3], [.94, 2], [1, 2]], kf: [[0, 0], [.14, 116], [.234, 46], [.31, 2], [.406, 0], [1, 0]] };
    const at_ = t => {
      const tl = spl(t, K.tl), sp = spl(t, K.sp), hf = spl(t, K.hf), kf = spl(t, K.kf);
      /* la cabeza, tumbada en el banco: el cuello se dobla lo que sube el tórax (la barbilla hacia el pecho), y el apoyo es la
         parte alta de la espalda y la nuca. Antes la cabeza seguía al tronco y, arriba, el cuerpo quedaba apoyado sobre ella */
      const th = max(0, -tl - 90 - sp), neck = min(54, 4 + th * .95);
      const q0 = { root: [0, 0, 0], tilt: tl, spine: sp, neck }, T0 = torso(q0);
      /* la parte alta de la espalda, en el banco, siempre en el mismo sitio (el cuerpo gira alrededor de ella) */
      const P = at(T0.thorax, [0, 74, -26]), q1 = shift(q0, sub([0, 0, -70], [0, P[1], P[2]]));
      const q = shift(q1, [0, restOn(q1, UP, top), 0]), T = torso(q), dir = mul(T.pelvis.y, -1), fr = T.pelvis.z;
      const d1 = norm(add(mul(dir, cos(RAD(hf))), mul(fr, sin(RAD(hf))))), d2 = norm(add(mul(dir, cos(RAD(hf - kf))), mul(fr, sin(RAD(hf - kf)))));
      const lg = s => legAt(at(T.pelvis, sd(s, [20, 0, 0])), d1, d2, s, fr, mix(30, 18, min(1, kf / 60))), lq = { ...q, ...legsOf({ L: lg('L'), R: lg('R') }) };
      return { ...lq, hands: both(s => [sd(s, [22, 0, 0])[0], top + 4, zH - 12]), elbow: both(() => [.5, .6, .4]), barDir: both(() => [1, 0, 0]) };
    };
    return { view: 'bench', up: 'b', rest: 'a', cam: [-64, 18], feetOff: true, at: at_, beat: cycle(6400), gear: (q, F, cam) => GR.under(flatBench(cam, [0, top, zH - 18], [0, top, 120])) };
  };

  /* ════ dead bug: tumbado, los brazos hacia el techo y las rodillas a 90°; se estiran a la vez un brazo y la pierna contraria ════ */
  const deadBug = () => {
    const at_ = t => {
      /* (una vuelta: brazo izquierdo y pierna derecha, y luego brazo derecho y pierna izquierda) */
      const uL = keys(t, [[0, 0], [.2, 1], [.3, 1], [.5, 0], [1, 0]]), uR = keys(t, [[0, 0], [.5, 0], [.7, 1], [.8, 1], [1, 0]]);
      const q = supine({ tilt: -90, spine: 3, neck: 6 }), A = { L: mix(90, 16, uR), R: mix(90, 16, uL) }, Bk = { L: mix(90, 0, uR), R: mix(90, 0, uL) };
      const lq = { ...q, ...legsAB(q, A, Bk, 20) }, { F } = pose({ ...lq, hands: ZERO, elbow: {} }), o = { hands: {}, elbow: {}, palm: {}, fist: false };
      for (const s of ['L', 'R']) { const u = s == 'L' ? uL : uR, a = armTo(F, lq, s, [.06, cos(RAD(mix(0, 74, u))), -sin(RAD(mix(0, 74, u)))], 2, [0, 0, 1]); o.hands[s] = a.H; o.elbow[s] = a.hint; o.palm[s] = [-1, 0, 0]; }
      return { ...lq, ...o };
    };
    return { view: 'bench', up: 'a', rest: 'a', cam: [-60, 24], feetOff: true, one: true, at: at_, beat: cycle(4600) };
  };

  /* ════ planchas y hollow ════ */
  /* boca abajo, recto desde las puntas de los pies (el pie casi perpendicular al suelo): el cuerpo gira alrededor de los
     tobillos; th, su ángulo con el suelo; zA, la z de los tobillos */
  const TOE_A = 40.6, LG = LEN.thigh + LEN.shin - 2;
  const prone = (th, zA, o = {}) => ({ root: [o.dx || 0, TOE_A + LG * sin(RAD(th)), zA + LG * cos(RAD(th))], tilt: 90 - th, spine: o.spine || 0, neck: o.neck != null ? o.neck : 8, roll: o.roll || 0, shrug: 0, feet: both(() => [o.fw || 12, zA - 3, 0, TOE_A - LEN.ankle, 65]), knee: both(() => [0, -1, .1]) });
  /* el ángulo para que los hombros queden a la altura y (y dónde quedan) */
  const shAt = (th, zA, o) => { const q = prone(th, zA, o); return shoulder(torso(q), 'L', q); };
  const thFor = (y, o = {}) => solve(th => shAt(th, 0, o)[1] - y, -10, 60);
  /* en los antebrazos: el codo bajo el hombro y el antebrazo en el suelo hacia delante (los puños casi juntos, de canto) */
  const ELB_Y = 10, forearm = (S, s, d = 0) => { const E = [sd(s, [40, 0, 0])[0], ELB_Y, S[2] + d], Hh = add(E, mul(norm([sd(s, [-22, 0, 0])[0], 1, 70]), LF)); return { E, H: [Hh[0], ELB_Y, Hh[2]] }; };
  /* con los brazos estirados: la mano abierta y plana bajo el hombro, los dedos hacia delante */
  const HD = norm([0, -.5, 15]), handFlat = (s, x = 54, z = 0) => [sd(s, [x, 0, 0])[0], 3.9, z];
  const plank = f => {
    const w = x => has(f, x), hollow = w('hollow'), rock = w('rock'), ballH = w('ball'), walk = w('walk'), drag = w('drag'), saw = w('saw'), climber = w('climber'), tap = w('tap');
    if (hollow) return hollowBody(rock, ballH);
    /* las dos alturas de los hombros: sobre los antebrazos y con los brazos estirados (la muñeca, a la altura de la palma) */
    const W0 = s => sub(handFlat(s), mul(HD, LEN.grip)), yHigh = W0('L')[1] + sqrt((LU + LEN.fore - 3) ** 2 - (47 + 0 - 54) ** 2) - 0;
    const yLow = ELB_Y + LU, high = !(saw || walk) || false;
    const fw = tap || drag ? 26 : 12;
    if (saw) {
      /* el body saw: en los antebrazos, con los pies en deslizadores; el cuerpo va hacia atrás y vuelve, los codos quietos */
      const thL = thFor(yLow, { fw }), z0 = -shAt(thL, 0, { fw })[2];
      const at_ = t => {
        const d = mix(-6, -34, ease(t)), a = Math.asin(clamp(d / LU, -1, 1)), y = ELB_Y + LU * cos(a), th = thFor(y, { fw }), zA = z0 + d - (shAt(th, 0, { fw })[2] - shAt(thL, 0, { fw })[2]);
        const q = prone(th, zA, { fw }), { F } = pose({ ...q, hands: ZERO, elbow: {} }), o = { hands: {}, elbow: {}, barDir: {} };
        for (const s of ['L', 'R']) { const S0 = shAt(thL, z0, { fw }), fa = forearm(S0, s); o.hands[s] = fa.H; o.elbow[s] = [.2, -1, -.2]; o.barDir[s] = [0, 1, 0]; }
        return { ...q, ...o };
      };
      const gear = (q, F, cam) => ['L', 'R'].map(s => GR.disc(cam, add(at(F['foot' + s], [0, -17, 33]), [0, -1.5, 0]), UP, 11, 2.5, 'wheel'));
      return { view: 'front', up: 'a', rest: 'a', cam: [-66, 14], feetOff: true, at: at_, gear };
    }
    if (walk) {
      /* la plancha con desplazamiento: de los antebrazos a las manos, un brazo y luego el otro, y de vuelta */
      const thL = thFor(yLow, { fw }), z0 = -shAt(thL, 0, { fw })[2], S0 = shAt(thL, z0, { fw });
      const at_ = t => {
        const aL = keys(t, [[0, 0], [.22, 1], [.5, 1], [.72, 0], [1, 0]]), aR = keys(t, [[0, 0], [.08, 0], [.3, 1], [.58, 1], [.8, 0], [1, 0]]);
        const y = mix(yLow, yHigh, (aL + aR) / 2), th = thFor(y, { fw }), zA = z0 - (shAt(th, 0, { fw })[2] - shAt(thL, 0, { fw })[2]) * 0;
        const q = prone(th, z0, { fw, roll: 5 * (aR - aL) }), { F } = pose({ ...q, hands: ZERO, elbow: {} }), o = { hands: {}, elbow: {}, barDir: {}, handDir: {}, palm: {}, fist: {} };
        for (const s of ['L', 'R']) {
          o.barDir[s] = [1, 0, 0];
          const a = s == 'L' ? aL : aR, fa = forearm(S0, s), hf = handFlat(s, 50, S0[2]), lift = 14 * sin(PI * a);
          o.hands[s] = add(mix(fa.H, hf, a), [0, lift, 0]); o.elbow[s] = [.25, -1, -.3];
          if (a > .5) { o.handDir[s] = HD; o.palm[s] = [0, -1, 0]; o.fist[s] = false; } else o.barDir[s] = [0, 1, 0];
        }
        return { ...q, ...o };
      };
      return { view: 'front', up: 'a', rest: 'a', cam: [-66, 14], feetOff: true, one: true, at: at_, beat: cycle(5200) };
    }
    /* con los brazos estirados (o en los antebrazos, la plancha): hombros sobre las manos */
    const forearmPlank = !(climber || tap || drag);
    const y0 = forearmPlank ? yLow : yHigh, th0 = thFor(y0, { fw }), zA0 = -shAt(th0, 0, { fw })[2], S0 = shAt(th0, zA0, { fw });
    let dumb = null;
    const at_ = t => {
      const bth = breath(t);
      let q = prone(th0 + (forearmPlank ? .4 * bth : 0), zA0, { fw }), extra = {};
      const { F } = pose({ ...q, hands: ZERO, elbow: {} }), o = { hands: {}, elbow: {}, barDir: {}, handDir: {}, palm: {}, fist: {} };
      for (const s of ['L', 'R']) {
        if (forearmPlank) { const fa = forearm(S0, s); o.hands[s] = fa.H; o.elbow[s] = [.2, -1, -.2]; o.barDir[s] = [0, 1, 0]; }
        else { o.hands[s] = handFlat(s, 54, S0[2]); o.elbow[s] = [.55, .28, -.8]; o.handDir[s] = HD; o.palm[s] = [0, -1, 0]; o.fist[s] = false; }
      }
      if (climber) {
        /* las rodillas al pecho, una y otra, como corriendo en el sitio: cada pie está atrás (de puntillas, como en la plancha)
           o delante (de puntillas bajo la cadera, con la rodilla bajo el pecho), y las dos piernas se cambian a la vez con un
           saltito: la cadera sube un poco y los pies pasan por el aire, uno hacia delante y otro hacia atrás, y se posan.
           Antes cada pierna daba vueltas por su cuenta y, a medio camino, las dos rodillas quedaban dobladas junto al suelo,
           como de rodillas, con los pies levantados hacia atrás */
        /* (la cadera, algo más alta que en la plancha y algo más en el salto, por el arco que le deja el tronco desde los
           hombros, que no se mueven: las manos siguen llegando) */
        const pL = spl(t, [[0, 0], [.1, 0], [.4, 1], [.6, 1], [.9, 0], [1, 0]]), air = max(sin(PI * clamp((t - .1) / .3, 0, 1)), sin(PI * clamp((t - .6) / .3, 0, 1)));
        const S0 = shoulder(torso(q), 'L', q), r0 = q.root, D = Math.hypot(S0[1] - r0[1], S0[2] - r0[2]), ry = r0[1] + 14 + 6 * air, r1 = [r0[0], ry, S0[2] - sqrt(D * D - (S0[1] - ry) ** 2)];
        const ang = (a, b) => atan2(b[2] - a[2], b[1] - a[1]) * DEG;
        q = { ...q, root: r1, tilt: q.tilt + (ang(r1, S0) - ang(r0, S0)) };
        const T = torso(q), hz = at(T.pelvis, [20, 0, 0])[2];
        /* el tobillo de un pie de puntillas (la punta en el suelo) con el pie inclinado p grados */
        const tip = p => ({ y: 20 * cos(RAD(p)) + 41 * sin(RAD(p)) - 5, dz: 41 * cos(RAD(p)) - 20 * sin(RAD(p)) });
        const back = { z: zA0 - 3, p: 65 }, front = { z: hz + 8, p: 50 };
        const lg = (s, u) => {
          /* u: 0 atrás, 1 delante; la punta del pie va de un sitio al otro por el aire (despegando y posándose sin tirones) y
             el pie se endereza al llegar delante */
          /* (como al correr: la pierna que va hacia delante lleva la rodilla por delante y el pie la sigue; la que va hacia atrás
             estira primero, con el pie por delante. Así, al cruzarse, las dos van más estiradas y las rodillas no rozan el
             suelo) */
          const e = u ** 2.4, p = mix(back.p, front.p, e), tz = mix(back.z + tip(back.p).dz, front.z, e), lift = 8 * sin(PI * u), k = tip(p);
          return { foot: [fw, tz - k.dz, 0, k.y + lift - LEN.ankle, p], knee: [0, -.6, .8] };
        };
        const a = lg('L', pL), b = lg('R', 1 - pL);
        q = { ...q, feet: { L: a.foot, R: b.foot }, knee: { L: a.knee, R: b.knee } };
      }
      if (tap) {
        /* una mano sube y toca el hombro contrario; el cuerpo se apoya en la otra */
        const uL = keys(t, [[0, 0], [.18, 1], [.3, 1], [.5, 0], [1, 0]]), uR = keys(t, [[0, 0], [.5, 0], [.68, 1], [.8, 1], [1, 0]]);
        q = prone(th0, zA0, { fw, roll: 4 * (uR - uL) });
        const { F: F2 } = pose({ ...q, hands: ZERO, elbow: {} });
        for (const s of ['L', 'R']) { const u = s == 'L' ? uL : uR; if (u > 0) { const o2 = s == 'L' ? 'R' : 'L', tgt = at(F2.thorax, sd(o2, [36, 84, 22])); o.hands[s] = mix(handFlat(s, 54, S0[2]), tgt, u); o.handDir[s] = norm(mix(HD, sd(o2, [1, .2, 0]), u)); o.elbow[s] = [.7, -.2, -.6]; } }
      }
      if (drag) {
        /* la mancuerna en el suelo a un lado; la mano contraria pasa por debajo del cuerpo y la arrastra al otro */
        const xs = keys(t, [[0, -36], [.15, -36], [.4, 36], [.65, 36], [.9, -36], [1, -36]]), uL = keys(t, [[0, 0], [.12, 1], [.42, 1], [.5, 0], [1, 0]]), uR = keys(t, [[0, 0], [.5, 0], [.62, 1], [.92, 1], [1, 0]]);
        dumb = [xs, 15, S0[2] - 24];
        q = prone(th0, zA0, { fw, roll: 4 * (uR - uL) });
        for (const s of ['L', 'R']) { const u = s == 'L' ? uL : uR; if (u > 0) { o.hands[s] = mix(handFlat(s, 54, S0[2]), [xs, 15, S0[2] - 24], u); o.handDir[s] = undefined; o.fist[s] = true; o.barDir[s] = [0, 0, 1]; o.elbow[s] = [.6, -.4, -.4]; } }
        extra.dumb = [xs, 15, S0[2] - 24];
      }
      for (const k of ['handDir', 'palm']) { for (const s of ['L', 'R']) if (o[k][s] === undefined) delete o[k][s]; }
      for (const s of ['L', 'R']) if (!o.barDir[s]) o.barDir[s] = [1, 0, 0];
      const fist = { L: o.fist.L !== false, R: o.fist.R !== false };
      return { ...q, ...o, fist: fist.L && fist.R ? undefined : { L: fist.L, R: fist.R }, ...extra };
    };
    const gear = drag ? (q, F, cam) => GR.dumbbell(cam, q.dumb, [0, 0, 1], abs(q.hands.L[0] - q.dumb[0]) < 3 ? 'L' : abs(q.hands.R[0] - q.dumb[0]) < 3 ? 'R' : null) : undefined;
    const ex = { view: 'front', up: 'a', rest: 'a', cam: [-66, 14], feetOff: true, one: climber || tap || drag, at: at_, gear };
    ex.beat = cycle(climber ? 1500 : tap || drag ? 4400 : 4000);
    return ex;
  };
  /* el hollow: boca arriba, la zona lumbar pegada al suelo, hombros y piernas estiradas algo despegados y los brazos por
     encima de la cabeza (con balón, sujeto entre las manos); el hollow rock se balancea como un balancín */
  const hollowBody = (rock, ballH) => {
    const at_ = t => {
      const b = breath(t), q = supine({ tilt: -88 + (rock ? 13 * sin(2 * PI * t) : 0), spine: 13 + .6 * b, neck: 14 }), T = torso(q);
      const A = 24 + (rock ? 0 : .8 * b), lq = { ...q, ...legsAB(q, { L: A, R: A }, { L: 0, R: 0 }, 35) }, { F } = pose({ ...lq, hands: ZERO, elbow: {} }), o = { hands: {}, elbow: {}, palm: {}, fist: false };
      const over = norm(add(mul(T.thorax.y, 1), mul(T.thorax.z, .26)));
      for (const s of ['L', 'R']) { const a = armTo(F, lq, s, sd(s, add(over, sd(s, [ballH ? -.1 : .06, 0, 0]))), ballH ? 14 : 0, [-1, 0, 0]); o.hands[s] = a.H; o.elbow[s] = a.hint; o.palm[s] = [-1, 0, 0]; }
      return { ...lq, ...o };
    };
    const gear = ballH ? (q, F, cam) => medBall(cam, add(mix(q.hands.L, q.hands.R, .5), mul(F.thorax.y, 14))) : undefined;
    return { view: 'bench', up: 'a', rest: 'a', cam: [-62, 24], feetOff: true, one: rock, at: at_, gear, beat: cycle(rock ? 1800 : 4000) };
  };

  /* ════ plancha lateral: tumbado sobre el costado derecho, apoyado en el antebrazo y en el canto de los pies; en la variante,
     la pierna de arriba sube y baja ════ */
  const sidePlank = f => {
    const lift = has(f, 'leg');
    /* el cuerpo recto, ladeado: la cabeza hacia -x, el costado izquierdo arriba; sube del lado de la cabeza a ang grados */
    const mk = (ang, root) => ({ root, roll: 90 - ang, tilt: 0, spine: 0, neck: -4, shrug: 0 });
    const parts = ang => { const q = mk(ang, [0, 0, 0]), T = torso(q); return { q, T, sh: at(T.thorax, [-47, 80, -2]), hipR: at(T.pelvis, [-20, 0, 0]) }; };
    /* el pie de abajo (el derecho), de canto en el suelo; el hombro derecho, sobre el codo, a un brazo de él */
    const ankleY = 10, rise = ang => { const p = parts(ang), dir = mul(p.T.pelvis.y, -1), A = add(p.hipR, mul(dir, LG)); return p.sh[1] - A[1]; };
    const ang = solve(a => rise(a) - (ELB_Y + LU - ankleY), 0, 40);
    const P0 = parts(ang), A0 = add(P0.hipR, mul(mul(P0.T.pelvis.y, -1), LG)), root = [-A0[0] + 0, ankleY - A0[1], 0];
    const at_ = t => {
      const b = breath(t), q = mk(ang + .5 * b, add(root, [0, 0, 0])), T = torso(q), dir = mul(T.pelvis.y, -1);
      const up = lift ? 36 * ease(keys(t, [[0, 0], [.4, 1], [.55, 1], [1, 0]])) : 0;
      const lg = s => { const hp = at(T.pelvis, sd(s, [20, 0, 0])), d = s == 'L' ? norm(add(mul(dir, cos(RAD(up))), mul(T.pelvis.x, sin(RAD(up))))) : dir; return legAt(hp, d, d, s, [0, 0, 1], 12); };
      const lq = { ...q, ...legsOf({ L: lg('L'), R: lg('R') }) }, { F } = pose({ ...lq, hands: ZERO, elbow: {} });
      const S = shoulder(F, 'R', lq), E = [S[0], ELB_Y, S[2]], Hr = add(E, [6, 0, LF]);
      return { ...lq, hands: { R: Hr, L: at(F.pelvis, [30, 22, 6]) }, elbow: { R: [0, -1, -.1], L: hintL('L', [-.2, .9, -.5]) }, barDir: { R: [0, 1, 0], L: [1, 0, 0] }, fist: { L: false }, palm: { L: [-1, 0, 0] } };
    };
    return { view: 'front', up: 'a', rest: 'a', cam: [-18, 16], side: [0, 4], feetOff: true, one: true, at: at_, beat: lift ? undefined : cycle(4000) };
  };

  /* ── a cuatro patas: las rodillas bajo la cadera y las manos (abiertas, planas) bajo los hombros, los brazos estirados ── */
  const quadBase = (() => {
    const root = kneelRoot(0, 0), W0 = sub(handFlat('L'), mul(HD, LEN.grip)), reach = LU + LEN.fore - 3;
    const shY = tl => { const q = { root, tilt: tl, spine: 0 }; return shoulder(torso(q), 'L', q)[1]; };
    const tl = solve(x => shY(x) - (W0[1] + sqrt(reach ** 2 - 7 ** 2)), 60, 90), q = { root, tilt: tl, spine: 0 };
    return { tilt: tl, S: shoulder(torso(q), 'L', q) };
  })();
  const quad = (o = {}) => ({ root: kneelRoot(0, 0), tilt: quadBase.tilt + (o.tilt || 0), spine: o.spine || 0, neck: o.neck != null ? o.neck : 12, roll: o.roll || 0, shrug: 0, ...kneel(0) });
  const quadHands = (F, q, ss = ['L', 'R']) => {
    const o = { hands: {}, elbow: {}, handDir: {}, palm: {}, barDir: {}, fist: false };
    for (const s of ss) { o.hands[s] = handFlat(s, 50, quadBase.S[2]); o.elbow[s] = [.4, .2, -1]; o.handDir[s] = HD; o.palm[s] = [0, -1, 0]; o.barDir[s] = [1, 0, 0]; }
    return o;
  };
  /* la pierna s de rodillas, por ángulos: el muslo, desde la vertical hacia atrás (h), y lo que se dobla la rodilla (k) */
  /* (la rótula, cuando la pierna va estirada: hacia delante con el muslo vertical y hacia el suelo con la pierna estirada atrás.
     Antes iba al revés y, al estirar la pierna en el bird dog, el pie acababa apuntando al techo) */
  const quadLeg = (q, s, h, k, pf = 0) => { const T = torso(q), d1 = [0, -cos(RAD(h)), -sin(RAD(h))], d2 = [0, -cos(RAD(h + 180 - k)), -sin(RAD(h + 180 - k))]; return legAt(at(T.pelvis, sd(s, [20, 0, 0])), d1, d2, s, [0, -sin(RAD(h)), cos(RAD(h))], pf); };

  /* ════ bird dog: a cuatro patas, se estiran a la vez un brazo hacia delante y la pierna contraria hacia atrás ════ */
  const birdDog = () => {
    const at_ = t => {
      const uA = keys(t, [[0, 0], [.18, 1], [.32, 1], [.5, 0], [1, 0]]), uB = keys(t, [[0, 0], [.5, 0], [.68, 1], [.82, 1], [1, 0]]);
      const q = quad({ roll: 3 * (uB - uA) }), { F } = pose({ ...q, hands: ZERO, elbow: {} }), o = quadHands(F, q);
      /* (A: el brazo izquierdo y la pierna derecha; B: el derecho y la izquierda) */
      /* las piernas siempre por ángulos, también apoyadas (el muslo vertical, la espinilla y el empeine en el suelo, como de
         rodillas): así no saltan al empezar a moverse. La punta del pie, de estirada en el suelo a hacia abajo, con el talón
         atrás. Antes la pierna pasaba de golpe de la postura de rodillas a la otra y el pie giraba de repente */
      const k0 = 90 - Math.asin((KNEE_Y - 7) / LEN.shin) * DEG;
      /* (la pierna, estirada a la altura de la cadera, en línea con la espalda; el brazo, a la altura del hombro: antes los dos
         acababan por encima de la horizontal) */
      const leg = (s, u) => quadLeg(q, s, mix(0, 88, u), mix(k0, 177, u), mix(90, 8, ease(u)));
      const lq = { ...q, ...legsOf({ L: leg('L', uB), R: leg('R', uA) }) };
      /* los brazos: la mano, de apoyada (la muñeca doblada) a estirada al frente, sin saltos */
      for (const [s, u] of [['L', uA], ['R', uB]]) if (u > 0) { const ad = [.04, .02, 1], a = armTo(F, q, s, ad, 0, [0, 0, 1], .96); o.hands[s] = add(mix(o.hands[s], a.H, u), [0, 30 * sin(PI * u), 0]); o.elbow[s] = mix(o.elbow[s], a.hint, u); o.handDir[s] = norm(mix(HD, sd(s, ad), ease(u))); o.palm[s] = norm(mix([0, -1, 0], [-1, -.3, 0], u)); }
      return { ...lq, ...o };
    };
    return { view: 'front', up: 'a', rest: 'a', cam: [-66, 16], feetOff: true, one: true, at: at_, beat: cycle(5200) };
  };

  /* ════ vacío abdominal: de pie, las manos en la cadera; se saca el aire y el ombligo va hacia dentro (el pecho sube algo) ════ */
  const vacuum = () => {
    const at_ = t => { const q = { ...STAND, spine: mix(0, -3, t), shrug: mix(0, 3, t), neck: mix(0, -2, t) }, { F } = pose({ ...q, hands: ZERO, elbow: {} }), h = s => onHip(F, s); return { ...q, hands: both(s => h(s).hand), elbow: both(s => h(s).elbow), palm: both(s => h(s).palm), fist: false }; };
    return { view: 'front', up: 'b', rest: 'a', cam: [-34, 6], at: at_ };
  };

  /* ════ patadas de glúteo ════ */
  const kick = f => {
    const w = x => has(f, x);
    if (w('cable')) return kickCable();
    if (w('machine')) return w('kneel') ? kickKneel() : kickStand();
    const band = w('band');
    /* a cuatro patas: la pierna izquierda sube con la rodilla doblada hasta dejar el muslo paralelo al suelo (la planta, al
       techo); con banda, el pie empuja hacia atrás y arriba hasta casi estirar la pierna */
    const at_ = t => {
      const q = quad({ roll: -2 * t }), { F } = pose({ ...q, hands: ZERO, elbow: {} }), k = kneel(0);
      const lg = band ? quadLeg(q, 'L', mix(14, 98, t), mix(84, 168, t), mix(-10, 25, t)) : quadLeg(q, 'L', mix(0, 92, t), 90, -18);
      return { ...q, ...legsOf({ L: lg, R: { foot: k.feet.R, knee: k.knee.R, fd: k.footDir.R } }), ...quadHands(F, q) };
    };
    const gear = band ? (q, F, cam) => { const { J } = pose(q), f0 = at(F.footL, [0, -23, 14]), h = q.hands.L, k = J.L.knee; return GR.bandPath(cam, [add(h, [8, -2, 0]), [k[0] + 26, 5, k[2] + 30], [k[0] + 24, 6, k[2] - 10], add(f0, [6, 0, 0])], 140, [0, 1, 0], 3); } : undefined;
    return { view: 'front', up: 'b', rest: 'a', cam: [-70, 16], feetOff: true, one: true, at: at_, gear };
  };
  /* de pie, de cara a la polea baja (o a la máquina), agarrado con las dos manos: la pierna izquierda, casi estirada, va hacia
     atrás hasta pasar la línea del cuerpo; en la máquina, empujando con el muslo el acolchado de una palanca que gira a la
     altura de la cadera */
  const kickUp = (machine) => {
    const zT = machine ? 96 : 112;
    const at_ = t => {
      /* (en la máquina, por tiempos: la pierna va atrás, aprieta arriba un momento y vuelve despacio) */
      if (machine) t = spl(t, [[0, 0], [.08, 0], [.42, 1], [.54, 1], [.94, 0], [1, 0]]);
      const h = machine ? mix(-28, 26, t) : mix(-8, 32, t), kb = machine ? 18 : mix(18, 20, t);
      /* (en la máquina, de pie en su plataforma) */
      const pl = machine ? 6 : 0;
      const q = { root: [0, ROOT_Y + 3 + pl, 0], tilt: mix(12, 18, t), spine: 2, neck: -4, shrug: 0 }, T = torso(q), hp = add(at(T.pelvis, [20, 0, 0]), [0, 0, 0]);
      const d1 = [0, -cos(RAD(h)), -sin(RAD(h))], d2 = [0, -cos(RAD(h + kb)), -sin(RAD(h + kb))], lgL = legAt(hp, d1, d2, 'L', [0, -sin(RAD(h)), cos(RAD(h))], 20);
      const lq = { ...q, feet: { L: lgL.foot, R: [20, 0, 8, pl] }, knee: { L: lgL.knee, R: [.1, 0, 1] }, footDir: { L: lgL.fd } };
      return { ...lq, hands: both(s => [sd(s, [24, 0, 0])[0], 210 + pl, zT - 14]), elbow: both(() => [.4, -.6, -.3]), barDir: both(() => [0, 1, 0]) };
    };
    const gear = (q, F, cam) => {
      const out = [], { J } = pose(q);
      if (!machine) { const a = at(F.footL, [0, 2, -2]); out.push(...GR.station(cam, [0, 26, zT], [0, 0, 1], { d: 30, h: 300 }), ...GR.cableLine(cam, [0, 26, zT], a), ...GR.strap(cam, [add(a, [-9, 0, 0]), add(a, [9, 0, 0])], 6, GR.C.strap)); }
      else {
        /* la palanca: el eje a la izquierda de la cadera, en su misma línea (el rodillo gira con el muslo sin resbalar), y el
           rodillo apoyado detrás del muslo, encima de la rodilla. El eje va en una columna por detrás de la cadera, con su
           brazo, y el que se apoya pisa una plataforma; las asas, delante. Antes el eje quedaba suelto en el aire, sujeto
           solo por una barra delante del muslo */
        const hp = J.L.hip, P = [hp[0] + 42, hp[1], hp[2]], dd = LEN.thigh * .76, pad = add(add(J.L.hip, mul(norm(sub(J.L.knee, J.L.hip)), dd)), mul(F.thighL.z, -(prof1(THIGH_F, dd) + 10)));
        out.push(...GR.hub(cam, P, [1, 0, 0], 9), ...GR.beam(cam, P, [P[0], pad[1], pad[2]], 4.5), ...GR.beam(cam, [P[0], pad[1], pad[2]], add(pad, [10, 0, 0]), 4), ...GR.tube(cam, add(pad, [-15, 0, 0]), add(pad, [15, 0, 0]), 9, GR.C.pad, 2));
        const cz = P[2] - 50;
        out.push(...GR.under([GR.obox(cam, [0, 3, 6], [[1, 0, 0], UP], [52, 3, 44], GR.C.frame), ...GR.beam(cam, [P[0] + 6, 4, cz], [P[0] + 6, P[1] + 14, cz], 7), ...GR.beam(cam, [P[0] + 6, P[1], cz], [P[0] + 6, P[1], P[2]], 6), ...GR.beam(cam, [P[0] + 6, 4, cz], [P[0] + 6, 4, zT], 6), ...GR.beam(cam, [-44, 4, zT], [44, 4, zT], 6)], 2));
      }
      out.push(...GR.under([...GR.beam(cam, [-30, 4, zT], [-30, 220, zT], 6), ...GR.beam(cam, [30, 4, zT], [30, 220, zT], 6), ...GR.beam(cam, [-30, 210, zT], [30, 210, zT], 5)], 1));
      ['L', 'R'].forEach(s => out.push(...GR.rubber(cam, add(q.hands[s], [0, -9, 0]), add(q.hands[s], [0, 9, 0])).map(i => ({ ...i, hand: s }))));
      return out;
    };
    /* (en la máquina, el pie que apoya está en su plataforma) */
    return { view: 'front', up: 'b', rest: 'a', cam: [-70, 8], one: true, feetOff: machine, at: at_, gear };
  };
  const kickCable = () => kickUp(false), kickStand = () => kickUp(true);
  /* la máquina de patada de rodillas: la rodilla derecha en su apoyo (con la espinilla encima), los antebrazos en el de delante
     y la planta del pie izquierdo contra la plataforma de una palanca que cuelga de un eje por encima de la cadera y a su lado.
     La pierna empuja la plataforma hacia atrás y arriba hasta dejar el muslo casi horizontal, y la plataforma va por el arco
     de la palanca (rígida, siempre del mismo largo); el pie, plano contra ella. Antes la palanca se estiraba y encogía según
     dónde estuviera el pie, y la pierna acababa muy por encima de la horizontal */
  const kickKneel = () => {
    const kY = 56, root = [0, kY + KNEE_Y + LEN.thigh - 2, 0], X = 50;
    const q0 = { root, tilt: 76, spine: 4, neck: 8, shrug: 0 }, H = at(torso(q0).pelvis, [20, 0, 0]);
    /* el tobillo al empezar (la rodilla bajo la cadera) y al acabar (el muslo casi horizontal), y el eje que los deja a los dos
       en el mismo arco: encima de la cadera */
    const ankleAt = (h, k) => { const d1 = [0, -cos(RAD(h)), -sin(RAD(h))], d2 = [0, -cos(RAD(h + k)), -sin(RAD(h + k))]; return add(add(H, mul(d1, LEN.thigh)), mul(d2, LEN.shin)); };
    const A0 = ankleAt(-30, 112), A1 = ankleAt(84, 46), P = [X, H[1] + 65, H[2] + 4];
    const ang = A => atan2(A[2] - P[2], A[1] - P[1]), R = (Math.hypot(A0[1] - P[1], A0[2] - P[2]) + Math.hypot(A1[1] - P[1], A1[2] - P[2])) / 2, f0 = ang(A0), f1 = ang(A1);
    const lever = t => {
      const f = mix(f0, f1, spl(t, [[0, 0], [.1, 0], [.48, 1], [.6, 1], [.94, 0], [1, 0]])), Lr = [0, cos(f), sin(f)], T = [0, -sin(f), cos(f)];
      const A = [H[0], P[1] + R * Lr[1], P[2] + R * Lr[2]], C = add(A, mul(T, 20));
      return { A, C, T, Lr };
    };
    const at_ = t => {
      const lv = lever(t), q = { ...q0 };
      const R_ = { foot: [16, -82, 0, kY + 7 - LEN.ankle], knee: [0, -.15, 1], fd: { y: [0, -1, 0], z: [0, 0, -1] } };
      const lq = { ...q, ...legsOf({ L: { foot: [lv.A[0], lv.A[2], 0, lv.A[1] - LEN.ankle], knee: [0, -1, .25], fd: { y: mul(lv.T, -1), z: lv.Lr } }, R: R_ }) }, { F } = pose({ ...lq, hands: ZERO, elbow: {} });
      const o = { hands: {}, elbow: {}, barDir: {} };
      for (const s of ['L', 'R']) { const S = shoulder(F, s, lq), E = [sd(s, [34, 0, 0])[0], 128, S[2]]; o.hands[s] = add(E, [sd(s, [-10, 0, 0])[0], 6, LF - 4]); o.elbow[s] = [.2, -1, -.3]; o.barDir[s] = [0, 1, 0]; }
      return { ...lq, ...o, lt: t };
    };
    const gear = (q, F, cam) => {
      const out = [], lv = lever(q.lt || 0), Q = add(lv.C, mul(lv.T, 5)), Pl = [X, Q[1], Q[2]];
      /* la plataforma (bajo la planta, en el plano de la palanca), la palanca del eje a ella y su travesaño, y el eje en su
         poste, a un lado de la pierna */
      out.push(GR.obox(cam, add(lv.C, mul(lv.T, 2.5)), [[1, 0, 0], lv.T], [15, 2.5, 21], GR.C.frame), ...GR.beam(cam, [X, P[1], P[2]], Pl, 4.5), ...GR.beam(cam, Pl, add(Q, [-10, 0, 0]), 4), ...GR.hub(cam, [X, P[1], P[2]], [1, 0, 0], 8));
      /* el apoyo de la rodilla (largo, con la espinilla encima), el de los antebrazos, sus postes, el carril y el poste del eje */
      out.push(...GR.under([GR.padAB(cam, [-14, kY, -98], [-14, kY, 26], UP, 15, 7), ...GR.beam(cam, [-14, kY - 10, -30], [0, 4, -30], 6), GR.padAB(cam, [0, 122, root[2] + 116], [0, 122, root[2] + 192], UP, 34, 7), ...GR.beam(cam, [0, 112, root[2] + 154], [0, 4, root[2] + 154], 7), ...GR.beam(cam, [0, 4, -150], [0, 4, root[2] + 186], 6), ...GR.beam(cam, [-40, 4, -140], [40, 4, -140], 6), ...GR.beam(cam, [X, 4, P[2]], [X, P[1] - 10, P[2]], 6), ...GR.beam(cam, [0, 4, P[2]], [X, 4, P[2]], 6)], 2));
      ['L', 'R'].forEach(s => out.push(...GR.rubber(cam, add(q.hands[s], [0, -8, 0]), add(q.hands[s], [0, 8, 0])).map(i => ({ ...i, hand: s }))));
      return out;
    };
    return { view: 'front', up: 'b', rest: 'a', cam: [-72, 12], feetOff: true, one: true, at: at_, gear, beat: cycle(3600) };
  };

  /* ════ hiperextensiones, GHD, superman y la máquina lumbar ════ */
  const hyper = f => {
    const w = x => has(f, x);
    if (w('superman')) return superman();
    if (w('machine')) return backMachine();
    if (w('reverse')) return reverseHyper();
    const flat = w('flat'), ghd = w('ghd'), weight = w('weight');
    /* boca abajo con la cadera en el borde del apoyo y los pies sujetos: el tronco baja colgando, con la espalda recta, y sube
       hasta quedar en línea con las piernas (en el banco a 45°, las piernas van inclinadas) */
    const inc = flat || ghd ? 0 : 45, A = RAD(inc);
    /* (en el GHD, la cadera sobre el sillín y los pies bajan un poco hasta la plataforma, detrás) */
    const rootG = [0, GHD.padY + 1 + 22, 0];
    const root = ghd ? rootG : [0, inc ? 200 : 214, 0];
    const legDir = ghd ? norm([0, GHD.footY + 10 - root[1], -sqrt(max(0, LG ** 2 - (GHD.footY + 10 - root[1]) ** 2))]) : [0, -sin(A), -cos(A)];
    /* abajo, el tronco cuelga hasta donde la cabeza queda a un palmo del suelo (y nunca más de 80° por debajo de la horizontal) */
    const low0 = x => { const q = { root, tilt: x, spine: 10, neck: 10 }, { F, J } = pose({ ...NOLEG, ...q }); return lowOf(F, J); };
    const tl0 = min(inc ? 158 : 170, solve(x => low0(x) - 16, 90, 179));
    const at_ = t => {
      const tl = mix(tl0, 90 - inc, t), q = { root, tilt: tl, spine: mix(10, 0, t), neck: mix(10, 4, t), shrug: 0 }, T = torso(q);
      const lg = s => legAt(at(T.pelvis, sd(s, [20, 0, 0])), legDir, legDir, s, [0, -cos(A), sin(A)], 20);
      const lq = { ...q, ...legsOf({ L: lg('L'), R: lg('R') }) }, { F } = pose({ ...lq, hands: ZERO, elbow: {} });
      if (weight) return { ...lq, hands: both(s => at(F.thorax, sd(s, [26, 66, 40]))), elbow: both(s => [.8, -.3, -.3]), barDir: both(() => F.thorax.y) };
      return { ...lq, ...crossed(F) };
    };
    const gear = (q, F, cam) => {
      if (ghd) return [...ghdFrame(cam, F, -1, -40), ...ghdRollers(cam, q, F)];
      const out = [], T = torso(q), h = root, fe = mix(F.footL.o, F.footR.o, .5);
      /* el acolchado de la cadera, bajo los muslos, con su borde un palmo por debajo de la ingle (la cadera dobla libre por
         encima); los rodillos detrás de los tobillos; el armazón */
      const u = norm([0, -sin(A), -cos(A)]), n = norm([0, cos(A), -sin(A)]), pad = add(add(h, mul(u, 30)), mul(n, -24));
      out.push(GR.padAB(cam, pad, add(pad, mul(u, 46)), n, 26, 8), ...GR.beam(cam, add(pad, mul(n, -10)), [0, 4, pad[2] - 10], 7));
      out.push(...GR.beam(cam, [0, 4, pad[2] + 20], [0, 4, fe[2] - 40], 7), ...GR.beam(cam, add(fe, [0, -24, -12]), [0, 4, fe[2] - 30], 6), ...GR.beam(cam, [-40, 4, fe[2] - 40], [40, 4, fe[2] - 40], 6), ...GR.beam(cam, [-40, 4, pad[2] + 20], [40, 4, pad[2] + 20], 6));
      out.push(GR.obox(cam, add(fe, mul(n, -22)), [[1, 0, 0], u], [30, 3, 24], GR.C.frame));
      const r = add(fe, add(mul(n, 12), mul(u, -8)));
      out.push(...GR.under(GR.tube(cam, add(r, [-26, 0, 0]), add(r, [26, 0, 0]), 7, GR.C.pad, 2), 3));
      if (weight) out.push(...plate10(cam, at(F.thorax, [0, 62, 36]), F.thorax.z));
      return GR.under(out.slice(0, out.length - (weight ? 1 : 0)), 1).concat(weight ? [out[out.length - 1]] : []);
    };
    return { view: 'front', up: 'b', rest: 'a', cam: [-70, 12], feetOff: true, one: !weight, at: at_, gear };
  };
  /* el superman: boca abajo en el suelo, los brazos estirados por delante; brazos, pecho y piernas se despegan a la vez */
  const superman = () => {
    const at_ = t => {
      const q0 = { root: [0, 0, 0], tilt: mix(90, 87, t), spine: mix(0, -14, t), neck: mix(0, -10, t), shrug: 0 }, q = shift(q0, [0, restOn(q0), 0]), T = torso(q);
      const a = mix(-4, 8, t), d = [0, sin(RAD(a)), -cos(RAD(a))], lg = s => legAt(at(T.pelvis, sd(s, [18, 0, 0])), d, d, s, [0, -1, 0], 60);
      const lq = { ...q, ...legsOf({ L: lg('L'), R: lg('R') }) }, { F } = pose({ ...lq, hands: ZERO, elbow: {} }), o = { hands: {}, elbow: {}, palm: {}, fist: false };
      for (const s of ['L', 'R']) { const S = shoulder(F, s, lq), dy = 10 - S[1] + t * 34, u = norm([.12, dy / (LU + LF), 1]), ar = armTo(F, lq, s, u, 0); o.hands[s] = ar.H; o.elbow[s] = ar.hint; o.palm[s] = [0, -1, 0]; }
      return { ...lq, ...o };
    };
    return { view: 'front', up: 'b', rest: 'a', cam: [-66, 20], feetOff: true, at: at_ };
  };
  /* la máquina lumbar: sentado, los pies en el reposapiés y los muslos sujetos por el rodillo (sobre ellos, cerca de las
     rodillas, en dos postes por fuera de las piernas); la espalda empuja hacia atrás el respaldo, que va en una palanca con el
     eje en la línea de la cadera, desde inclinado hacia delante hasta pasar un poco la vertical. Los brazos, cruzados sobre el
     pecho. Antes el rodillo bajaba por un poste entre las piernas que, de lado, atravesaba el muslo, y el tronco se inclinaba
     tanto que los codos daban en los muslos */
  const backMachine = () => {
    const base = { root: [0, 118, 0], feet: both(() => [22, 82, 8, 6, 0]), knee: both(() => [.12, .6, .8]) };
    const at_ = t => { const q = { ...base, tilt: mix(28, -10, t), spine: mix(12, 0, t), neck: mix(6, 0, t), shrug: 0 }, { F } = pose({ ...q, hands: ZERO, elbow: {} }); return { ...q, ...crossed(F, 0, 0, .45) }; };
    const gear = (q, F, cam) => {
      const out = [], X = 62, P = [0, 120, -4], pad = at(F.thorax, [0, 62, -36]), { J } = pose(q);
      /* el asiento con su poste y la base, la columna de atrás con la pila, y el reposapiés */
      out.push(...GR.under([GR.padAB(cam, [0, 97, -30], [0, 97, 34], UP, 30, 7), ...GR.beam(cam, [0, 90, 0], [0, 4, 0], 6), ...GR.beam(cam, [0, 4, -130], [0, 4, 140], 6), ...GR.beam(cam, [-40, 4, 130], [40, 4, 130], 6), GR.obox(cam, [0, 3, 96], [[1, 0, 0], UP], [40, 3, 30], GR.C.frame), ...GR.beam(cam, [0, 4, -120], [0, 260, -120], 7), ...GR.stack(cam, [0, 0, -150], [0, 0, 1], 12)], 2));
      /* el rodillo de los muslos, encima de ellos junto a las rodillas, y sus postes por fuera de las piernas */
      const m = mix(J.L.hip, J.L.knee, .78), ty = m[1] + 16 + 8, tz = m[2];
      out.push(...GR.tube(cam, [-40, ty, tz], [40, ty, tz], 8, GR.C.pad, 2));
      [-1, 1].forEach(k => out.push(...GR.beam(cam, [k * 46, ty, tz], [k * 46, 60, tz - 20], 4.5), ...GR.beam(cam, [k * 46, 60, tz - 20], [k * 30, 92, -10], 4.5)));
      /* el respaldo en la espalda, a la altura de los omóplatos, y la palanca a los dos lados, del eje al respaldo */
      out.push(GR.padAB(cam, pad, add(pad, mul(F.thorax.y, -40)), mul(F.thorax.z, -1), 28, 7));
      ['L', 'R'].forEach(s => { const k = s == 'L' ? 1 : -1, e = add(pad, mul(F.thorax.x, k * X)), hub = [k * X, P[1], P[2]]; out.push(...GR.hub(cam, hub, [1, 0, 0], 8), ...GR.beam(cam, hub, e, 4.5), ...GR.beam(cam, e, add(pad, mul(F.thorax.x, k * 26)), 4), ...GR.beam(cam, [k * X, P[1], P[2]], [k * X, 92, -24], 5)); });
      return out;
    };
    /* (feetOff: los pies, en el reposapiés) */
    return { view: 'seat', up: 'b', rest: 'a', cam: [-62, 12], one: true, feetOff: true, at: at_, gear };
  };
  /* la hiperextensión inversa: boca abajo en el acolchado alto (la máquina de hiperextensiones inversas, o un banco alto), con
     la cadera en el borde y las manos en los agarres de delante; las piernas cuelgan (algo por delante, las rodillas apenas
     dobladas) y suben estiradas, apretando los glúteos, hasta pasar un poco la horizontal, y bajan despacio. Antes el banco
     era bajo y, colgando, las puntas de los pies se metían en el suelo */
  const reverseHyper = () => {
    const top = 202;
    const q0 = { root: [0, 0, 0], tilt: 90, spine: 0, neck: 12, shrug: 0 }, base = shift(q0, [0, restOn(q0, UP, top, { pelvis: false }), 0]);
    const T0 = torso(base), hz = T0.pelvis.o[2] + 12, zE = hz + 108;
    /* (por tiempos, en 3,2 s: suben en 1 s, aguantan arriba 0,4, bajan en 1,4 y descansan colgando) */
    const KA = [[0, -95], [.31, 8], [.44, 8], [.88, -95], [1, -95]], KB = [[0, 9], [.31, 0], [.44, 0], [.88, 9], [1, 9]];
    const at_ = t => {
      const a = spl(t, KA), b = spl(t, KB), d = [0, sin(RAD(a)), -cos(RAD(a))], d2 = [0, sin(RAD(a + b)), -cos(RAD(a + b))];
      const lg = s => legAt(at(T0.pelvis, sd(s, [20, 0, 0])), d, d2, s, [0, -cos(RAD(a)), -sin(RAD(a))], 26);
      const lq = { ...base, ...legsOf({ L: lg('L'), R: lg('R') }) }, { F } = pose({ ...lq, hands: ZERO, elbow: {} });
      return { ...lq, hands: both(s => [sd(s, [34, 0, 0])[0], top - 66, zE + 40]), elbow: both(() => [.7, .1, -.5]), barDir: both(() => [0, 1, 0]) };
    };
    const gear = (q, F, cam) => {
      const out = [];
      /* el acolchado (de la cadera al pecho), sobre su armazón, y los dos agarres verticales a los lados de su extremo */
      out.push(GR.padAB(cam, [0, top - 7, hz], [0, top - 7, zE], UP, 30, 7), ...GR.beam(cam, [0, top - 14, hz + 14], [0, top - 14, zE - 6], 6), ...GR.beam(cam, [0, top - 14, zE - 14], [0, 4, zE - 14], 7), ...GR.beam(cam, [0, top - 14, hz + 22], [0, 4, hz + 40], 7), ...GR.beam(cam, [0, 4, hz - 20], [0, 4, zE + 30], 6), ...GR.beam(cam, [-44, 4, zE + 20], [44, 4, zE + 20], 6), ...GR.beam(cam, [-44, 4, hz - 10], [44, 4, hz - 10], 6));
      /* (los agarres, delante del acolchado, un poco más allá de los hombros: los brazos se estiran hacia ellos) */
      ['L', 'R'].forEach(s => { const x = sd(s, [34, 0, 0])[0]; out.push(...GR.beam(cam, [0, top - 40, zE - 14], [0, top - 40, zE + 40], 5), ...GR.beam(cam, [0, top - 40, zE + 40], [x, top - 40, zE + 40], 4), ...GR.beam(cam, [x, top - 40, zE + 40], [x, top - 82, zE + 40], 4)); });
      return [...GR.under(out, 1), ...['L', 'R'].flatMap(s => GR.rubber(cam, add(q.hands[s], [0, -9, 0]), add(q.hands[s], [0, 9, 0])).map(i => ({ ...i, hand: s })))];
    };
    return { view: 'front', up: 'b', rest: 'a', cam: [-72, 12], feetOff: true, at: at_, gear, beat: cycle(3200) };
  };

  /* ════ giros del tronco: sentado en V (Russian twist), de pie con mancuerna o barra, y en la máquina ════ */
  const twist = f => {
    const w = x => has(f, x), standing = w('standing'), bar = w('bar'), machine = w('machine'), ballW = w('ball');
    if (machine) return twistMachine();
    if (standing || bar) {
      /* de pie, la cadera quieta: el tronco gira a un lado y a otro (con la mancuerna delante del pecho, cogida con las dos
         manos, o con la barra sobre los hombros) */
      const at_ = t => {
        const tw = 40 * sin(2 * PI * t), q = { ...STAND, feet: both(() => [30, 0, 10]), twist: tw, neck: 0, shrug: bar ? 3 : 0 }, { F } = pose({ ...q, hands: ZERO, elbow: {} });
        if (bar) { const c = at(F.thorax, [0, 90, -26]); return { ...q, barC: c, grip: 80, hands: { L: add(c, mul(F.thorax.x, 80)), R: add(c, mul(F.thorax.x, -80)) }, elbow: both(() => [.25, -1, -.45]), barDir: both(() => F.thorax.x) }; }
        const h = at(F.thorax, [0, 60, 38]);
        return { ...q, barC: add(h, [0, -14, 0]), hands: { L: add(h, mul(F.thorax.x, 9)), R: add(h, mul(F.thorax.x, -9)) }, elbow: both(() => [.28, -1, .12]), fist: false, palm: { L: [-1, .3, 0], R: [-1, .3, 0] }, barDir: both(() => F.thorax.x) };
      };
      const gear = (q, F, cam) => bar ? barAx(cam, q.barC, F.thorax.x, q.grip) : GR.dumbbell(cam, q.barC, UP, null, { handle: 15 });
      return { view: 'front', up: 'a', rest: 'a', cam: [-28, 8], one: true, at: at_, gear, beat: cycle(3200) };
    }
    /* sentado, inclinado hacia atrás con la espalda recta y los pies despegados del suelo: las manos juntas (con el balón)
       van de un costado al otro */
    const at_ = t => {
      const tw = 42 * sin(2 * PI * t), q = supine({ tilt: -48, spine: 10, neck: 10, twist: tw }), T = torso(q);
      const lq = { ...q, ...legsAB(q, { L: 42, R: 42 }, { L: 96, R: 96 }, 15) }, { F } = pose({ ...lq, hands: ZERO, elbow: {} });
      const c = at(F.thorax, [0, 34, ballW ? 62 : 54]);
      return { ...lq, barC: c, hands: { L: add(c, mul(F.thorax.x, ballW ? 20 : 4)), R: add(c, mul(F.thorax.x, ballW ? -20 : -4)) }, elbow: both(() => [.6, -.4, .1]), ...(ballW ? { fist: false, palm: both(() => [-1, 0, 0]) } : {}), barDir: both(() => F.thorax.y) };
    };
    const gear = ballW ? (q, F, cam) => medBall(cam, q.barC) : undefined;
    return { view: 'bench', up: 'a', rest: 'a', cam: [-40, 22], feetOff: true, one: true, at: at_, gear, beat: cycle(3000) };
  };
  /* la máquina de rotación: sentado con las piernas sujetas y el pecho contra el apoyo, que gira con el tronco hacia un lado */
  const twistMachine = () => {
    const base = { root: [0, 118, 0], feet: both(() => [24, 80, 8]), knee: both(() => [.15, .6, .8]) };
    const at_ = t => { const q = { ...base, tilt: 0, spine: 0, neck: 0, twist: mix(0, 48, t) }, { F } = pose({ ...q, hands: ZERO, elbow: {} }); return { ...q, hands: both(s => at(F.thorax, sd(s, [40, 64, 50]))), elbow: both(() => [.7, -.6, .2]), barDir: both(() => [0, 1, 0]) }; };
    const gear = (q, F, cam) => {
      const out = [], c = at(F.thorax, [0, 60, 40]);
      out.push(...GR.under([GR.padAB(cam, [0, 97, -26], [0, 97, 30], UP, 30, 7), ...GR.beam(cam, [0, 90, 0], [0, 4, 0], 6), ...GR.beam(cam, [0, 4, -60], [0, 4, 150], 6), ...GR.tube(cam, [-28, 52, 104], [28, 52, 104], 8, GR.C.pad, 2), ...GR.beam(cam, [0, 44, 104], [0, 4, 104], 5), ...GR.beam(cam, [0, 4, 150], [0, 300, 150], 7), ...GR.stack(cam, [0, 0, 180], [0, 0, -1], 12)], 2));
      /* el apoyo del pecho y las asas giran con el eje vertical, delante del pecho */
      out.push(GR.padAB(cam, add(c, mul(F.thorax.x, -26)), add(c, mul(F.thorax.x, 26)), mul(F.thorax.z, -1), 18, 6), ...GR.beam(cam, add(c, mul(F.thorax.z, 8)), [0, c[1], 150], 5), ...GR.hub(cam, [0, c[1] + 12, 150], [0, 1, 0], 9));
      ['L', 'R'].forEach(s => out.push(...GR.rubber(cam, add(q.hands[s], [0, -9, 0]), add(q.hands[s], [0, 9, 0])).map(i => ({ ...i, hand: s }))));
      return out;
    };
    return { view: 'seat', up: 'b', rest: 'a', cam: [-38, 14], one: true, at: at_, gear };
  };

  /* ════ rueda abdominal: de rodillas o de pie, las manos en la rueda; rueda hacia delante estirando el cuerpo y vuelve ════ */
  const WR = 17;
  const wheelRoll = f => {
    const standing = has(f, 'standing'), reach = LU + LEN.fore + 10;
    /* (por tiempos: la rueda sale despacio, aguanta estirado, vuelve algo más deprisa y descansa arriba) */
    const W = t => spl(t, [[0, 0], [.08, 0], [.52, 1], [.62, 1], [.94, 0], [1, 0]]);
    const handsTo = (F, q) => { const o = { hands: {}, elbow: {}, barDir: {} }; for (const s of ['L', 'R']) { const S = shoulder(F, s, q), dy = WR - S[1], dz = sqrt(max(0, reach ** 2 - dy * dy)); o.hands[s] = [sd(s, [16, 0, 0])[0], WR, S[2] + dz]; o.elbow[s] = [.2, -.3, -1]; o.barDir[s] = [1, 0, 0]; } return o; };
    const at_ = t => {
      if (standing) {
        /* de pie: de la carpa (las piernas estiradas, el tronco casi horizontal y los brazos verticales, con la rueda en el
           suelo bajo los hombros) al cuerpo estirado, casi paralelo al suelo, de puntillas. Antes empezaba con el tronco doblado
           más allá de la vertical, metido entre las piernas */
        /* (el tronco, el que toque hacia la línea recta con las piernas; pero si con él los hombros quedan más altos de lo que
           llegan los brazos hasta la rueda, se inclina lo justo para que lleguen) */
        const u = W(t), b = mix(2, 79, u), p = clamp((b - 18) * 1.05, 0, 64), T0 = toeAnkle([0, 0, 0], p);
        const A = T0, root = add(A, [0, LG * cos(RAD(b)), LG * sin(RAD(b))]);
        const base = { root, spine: mix(8, 2, u), neck: mix(10, 6, u), shrug: 0 }, shY = tl => { const qq = { ...base, tilt: tl }; return shoulder(torso(qq), 'L', qq)[1]; };
        let tl = mix(104, b + 3, u);
        if (shY(tl) > WR + reach - 2) tl = solve(x => shY(x) - (WR + reach - 2), tl, 170);
        const q = { ...base, tilt: tl, feet: both(() => [14, A[2], 0, A[1] - LEN.ankle, p]), knee: both(() => [0, -.2, 1]) }, { F } = pose({ ...q, hands: ZERO, elbow: {} });
        return { ...q, ...handsTo(F, q) };
      }
      /* de rodillas: de la cadera sobre las rodillas, la espalda redondeada y la rueda casi bajo los hombros, a todo lo largo,
         con el cuerpo casi recto a un palmo del suelo y los brazos estirados por delante de la cabeza (la cadera se abre a la
         vez que la rueda avanza). Antes la rueda apenas se movía y el cuerpo solo bajaba */
      const u = W(t), a = mix(-6, 70, u), q = { root: kneelRoot(0, a), tilt: mix(60, 80, u), spine: mix(14, 2, u), neck: mix(16, 4, u), shrug: 0, ...kneel(0) }, { F } = pose({ ...q, hands: ZERO, elbow: {} });
      return { ...q, ...handsTo(F, q) };
    };
    const gear = (q, F, cam) => { const c = mix(q.hands.L, q.hands.R, .5); return [GR.disc(cam, c, [1, 0, 0], WR, 9, 'wheel'), ...GR.tube(cam, add(c, [-24, 0, 0]), add(c, [24, 0, 0]), 3.2, STEEL, 1), ...['L', 'R'].flatMap(s => GR.rubber(cam, add(q.hands[s], [-8, 0, 0]), add(q.hands[s], [8, 0, 0])).map(i => ({ ...i, hand: s })))]; };
    return { view: 'front', up: 'a', rest: 'a', cam: [-70, 16], feetOff: true, at: at_, gear, beat: cycle(standing ? 5200 : 4600) };
  };
  /* el tobillo para que la bola del pie quede en ball con el pie inclinado p grados (la punta hacia abajo) */
  const toeAnkle = (ball, p) => { const r = RAD(p), y = [0, cos(r), sin(r)], z = [0, -sin(r), cos(r)]; return add(ball, add(mul(y, 19.8), mul(z, -25))); };

  /* ════ leñador y Pallof: de pie, de lado a la polea (a la izquierda de la figura) ════ */
  const TX = 150;
  const chop = f => {
    const low = has(f, 'low');
    /* las dos manos en el asa: de arriba y del lado de la polea, en diagonal, hasta abajo y al otro lado (bajo: al revés) */
    const D0 = low ? norm([.72, -.62, .42]) : norm([.7, .58, .45]), D1 = low ? norm([-.42, .7, .58]) : norm([-.48, -.72, .5]);
    const at_ = t => {
      const u = ease(t), q = { ...STAND, feet: { L: [30, 0, 12], R: [30, 0, 18] }, knee: both(() => [.2, 0, 1]), root: [0, ROOT_Y - 6, 0], twist: mix(36, -36, u), tilt: 4, neck: 0 }, T = torso(q);
      const m = mix(shoulder(T, 'L', q), shoulder(T, 'R', q), .5), c = add(m, mul(norm(mix(D0, D1, u)), LU + LF - 22)), ax = norm(sub([TX, low ? 40 : 420, low ? 170 : 30], c));
      return { ...q, barC: c, cax: ax, hands: { L: add(c, mul(ax, -4)), R: add(c, mul(ax, -13)) }, elbow: both(() => [.4, -.5, -.2]), barDir: both(() => ax) };
    };
    const gear = (q, F, cam) => [...GR.pulleyTower(cam, [TX, 0, low ? 170 : 30], low ? 40 : 420, add(q.barC, mul(q.cax, 6))), ...GR.tube(cam, add(q.barC, mul(q.cax, -19)), add(q.barC, mul(q.cax, 6)), 4, STEEL, 1).map(i => ({ ...i, hand: 'L' }))];
    return { view: 'front', up: 'b', rest: 'a', cam: [-26, 10], one: true, at: at_, gear };
  };
  const pallof = () => {
    const at_ = t => {
      const u = ease(t), q = { ...STAND, feet: both(() => [32, 0, 10]), knee: both(() => [.2, .1, 1]), root: [0, ROOT_Y - 8, 0], twist: 0 }, { F } = pose({ ...q, hands: ZERO, elbow: {} });
      const c = add(at(F.thorax, [0, 56, 36]), [0, 0, mix(0, 78, u)]);
      return { ...q, barC: c, hands: { L: add(c, [0, 5, 0]), R: add(c, [0, -5, 0]) }, elbow: both(() => [.6, -.6, -.1]), barDir: both(() => [0, 0, 1]) };
    };
    const gear = (q, F, cam) => [...GR.pulleyTower(cam, [TX, 0, 110], q.barC[1], add(q.barC, [0, 0, 10])), ...GR.tube(cam, add(q.barC, [0, 0, -8]), add(q.barC, [0, 0, 10]), 4, STEEL, 1).map(i => ({ ...i, hand: 'L' }))];
    /* (la vista de lado, desde atrás: de lado, el brazo tapaba el oblicuo al empujar y el músculo pintado desaparecía; por
       detrás, los lumbares y el oblicuo se ven en todo el gesto) */
    return { view: 'front', up: 'b', rest: 'a', cam: [-28, 8], side: [-150, 8], one: true, at: at_, gear };
  };

  /* el tobillo para que el talón quede en heel con el pie inclinado p grados (negativo: la punta hacia arriba) */
  const heelAnkle = (heel, p) => { const r = RAD(p), y = [0, cos(r), sin(r)], z = [0, -sin(r), cos(r)]; return add(heel, add(mul(y, 19.5), mul(z, 5))); };
  /* la mano libre que se agarra a un poste (a un lado) y el poste */
  const postAt = (x, z, h = 250) => [x, h, z];
  /* el poste de los gemelos en el escalón: delante y algo a la derecha */
  const CALF_POST = [-38, 318, 70];
  const holdPost = (s, P) => ({ hand: add(P, [0, -60, 0]), elbow: hintL(s, [.4, -.6, .2]), bd: [0, 1, 0] });
  /* el poste (con su base): por trozos, cada uno delante o detrás según lo que de verdad lo tapa, si se le pasa la postura.
     Antes iba siempre detrás del cuerpo y, con el poste entre la cámara y la figura, la mano que lo agarra parecía flotar
     sobre el cuerpo y el poste lo atravesaba */
  const postGear = (cam, P, F, J) => {
    const base = GR.under([GR.obox(cam, [P[0], 3, P[2]], [[1, 0, 0], UP], [22, 3, 22], GR.C.frame)], 2);
    if (!F) return [...GR.under([GR.obox(cam, [P[0], P[1] / 2, P[2]], [[1, 0, 0], UP], [6, P[1] / 2, 6], GR.C.frame)], 2), ...base];
    /* (de una pieza, delante o detrás según lo que hay entre la cámara y la altura de la mano que lo agarra) */
    const post = GR.obox(cam, [P[0], P[1] / 2, P[2]], [[1, 0, 0], UP], [6, P[1] / 2, 6], GR.C.frame);
    if (dot(sub([P[0], F.pelvis.o[1], P[2]], F.pelvis.o), cam.c) < 0) return [...base, ...GR.under([post], 2)];
    return [...base, ...visTag([post], [add([P[0], P[1] - 60, P[2]], mul(norm(cam.c), 6))], cam, F, J)];
  };
  /* un escalón o una plataforma (de alto h) delante de los pies, con su borde donde apoya la bola del pie */
  const step = (cam, z, h, w = 60, d = 34) => GR.under([GR.obox(cam, [0, h / 2, z - d], [[1, 0, 0], UP], [w, h / 2, d], GR.C.frame)], 1);
  /* colgando a los lados (las mancuernas): la mano bajo el hombro */
  const hang = (F, q, s, out = 21) => add(shoulder(F, s, q), sd(s, [out, -143, 3]));

  /* ════ gemelos: de pie (en máquina, en escalón, con barra, Smith o mancuerna, a una pierna, burro), sentado y saltos ════ */
  const calf = f => {
    const w = x => has(f, x), seated = w('seated'), one = w('one'), machine = w('machine'), donkey = w('donkey'), smith = w('smith'), barW = w('bar'), db = w('db'), jump = w('jump');
    if (seated) return calfSeated(one, machine, barW, db);
    /* la bola del pie en el borde del escalón (o del suelo, en los saltos) y el talón que baja por debajo y sube de puntillas */
    const sh = jump ? 0 : machine || donkey ? 22 : barW || smith ? 12 : 18, fw = one ? 14 : 22;
    const pitch = t => jump ? 0 : mix(-16, 40, t);
    const legsAt = (t, p, dy = 0) => {
      const ball = s => [sd(s, [fw, 0, 0])[0], sh + dy, 12];
      const A = s => toeAnkle(ball(s), p), Lq = A('L'), Rq = A('R');
      return { A: Lq, feet: { L: [fw, Lq[2], 6, Lq[1] - LEN.ankle, p], R: [fw, Rq[2], 6, Rq[1] - LEN.ankle, p] }, knee: { L: [.1, 0, 1], R: [.1, 0, 1] } };
    };
    /* a una pierna: la otra, relajada, con la rodilla algo doblada y el pie detrás de la pantorrilla que trabaja, un poco hacia
       ella y sin cruzarla; la cadera, sobre el pie que apoya. Antes la espinilla quedaba horizontal hacia atrás, como una
       grulla, y en la máquina el pie llegaba hasta la columna */
    const freeLeg = q => { const T = torso(q), o = legAt(at(T.pelvis, [-20, 0, 0]), [.03, -.985, .17], [.14, -.76, -.64], 'R', [0, 0, 1], 30); return { foot: o.foot, knee: o.knee, fd: o.fd }; };
    const at_ = t => {
      let p = pitch(t), dy = 0, flex = 0;
      if (jump) {
        /* el salto, como bota una pelota: en el suelo (el primer 40 % de la vuelta) cae sobre la parte de delante del pie, el
           talón baja un poco y las rodillas ceden apenas, y empuja hasta las puntas; en el aire, sube frenando y baja
           acelerando (una parábola), con los pies estirados. Antes el vuelo era un seno y los tobillos cambiaban de golpe */
        const g = t < .4, u = g ? t / .4 : (t - .4) / .6;
        p = g ? spl(u, [[0, 24], [.45, 4], [1, 36]]) : spl(u, [[0, 36], [.5, 33], [1, 24]]);
        dy = g ? 0 : 15 * 4 * u * (1 - u); flex = g ? 6 * sin(PI * u) : 0;
      }
      const lg = legsAt(t, p, dy), A = lg.A, tl = donkey ? 82 : 0;
      const root = [one ? 7 : 0, A[1] + LEN.shin + LEN.thigh - 3 - (donkey ? 2 : 0) - (one ? 1 : 0) - flex, A[2] + (donkey ? -10 : 4)];
      let q = { root, tilt: tl, spine: donkey ? 4 : 0, neck: donkey ? -20 : 0, shrug: 0, feet: lg.feet, knee: lg.knee };
      if (one) { const fl = freeLeg(q); q = { ...q, roll: -2, feet: { L: lg.feet.L, R: fl.foot }, knee: { L: lg.knee.L, R: fl.knee }, footDir: { R: fl.fd } }; }
      const { F } = pose({ ...q, hands: ZERO, elbow: {} });
      if (machine && !donkey || smith || barW) {
        /* la barra o las hombreras sobre los trapecios, las manos agarradas a ellas */
        const c = at(F.thorax, [0, 90, -26]);
        /* (en la máquina, las asas de las hombreras van de delante a atrás y se agarran en neutro: antes el puño iba de través y
           el asa lo cruzaba) */
        return { ...q, barC: c, grip: machine ? 54 : 80, hands: { L: add(c, [machine ? 54 : 80, 0, 0]), R: add(c, [machine ? -54 : -80, 0, 0]) }, elbow: both(() => [.25, -1, -.45]), shrug: 3, ...(machine ? { barDir: both(() => [0, 0, 1]) } : {}) };
      }
      /* (en el burro, las asas del apoyo, verticales y con el pulgar arriba: el antebrazo va de delante a atrás, y antes el asa
         también) */
      if (donkey) return { ...q, hands: both(s => [sd(s, [30, 0, 0])[0], 124, root[2] + 150]), elbow: both(() => [.3, -.4, -1]), barDir: both(() => [0, 1, 0]) };
      /* (los brazos, sueltos junto al cuerpo con los codos algo doblados, acompañando el bote) */
      if (jump) { const e = 22 + 8 * sin(2 * PI * t), h = s => armTo(F, q, s, [.12, -1, .14], e, [0, 0, 1]); return { ...q, hands: both(s => h(s).H), elbow: both(s => h(s).hint), fist: false, palm: both(() => [-1, 0, 0]) }; }
      /* en el escalón: la mano derecha en un poste que queda delante y algo a la derecha, a la altura del pecho, con el codo
         doblado y relajado; la izquierda, suelta y colgando junto al cuerpo o, con mancuerna, llevándola colgada. Antes el poste
         quedaba a un lado, a la altura del hombro: el brazo iba estirado en horizontal, rígido, y la otra mano en la cadera */
      const hp = holdPost('R', CALF_POST);
      if (db) return { ...q, hands: { L: hang(F, q, 'L'), R: hp.hand }, elbow: { L: [.1, 0, -1], R: [.35, -.7, -.3] }, barDir: { L: [0, 0, 1], R: hp.bd } };
      const fl = armTo(F, q, 'L', [.14, -1, .08], 16, [0, 0, 1]);
      return { ...q, hands: { L: fl.H, R: hp.hand }, elbow: { L: fl.hint, R: [.35, -.7, -.3] }, barDir: { L: [1, 0, 0], R: hp.bd }, fist: { L: false }, palm: { L: [-1, 0, .2] } };
    };
    let zS = null;
    const gear = (q, F, cam) => {
      const out = [];
      if (!jump) out.push(...step(cam, 12 + 20, sh, one ? 40 : 60));
      if (smith) { zS = zS ?? at_(0).barC[2]; out.push(...L.barbell(cam, q.barC, q.grip), ...GR.smithFrame(cam, zS).map(i => ({ ...i, nf: true })), ...GR.smithHooks(cam, [q.barC[0], q.barC[1], zS])); }
      else if (barW) out.push(...L.barbell(cam, q.barC, q.grip));
      else if (machine && !donkey) {
        /* la máquina de gemelo de pie: las hombreras en un carro que sube por dos guías detrás, con la pila */
        const c = q.barC;
        out.push(...['L', 'R'].flatMap(s => [GR.padAB(cam, add(c, sd(s, [30, 6, 14])), add(c, sd(s, [30, 6, -26])), UP, 12, 7), ...GR.rubber(cam, add(q.hands[s], [0, 0, -8]), add(q.hands[s], [0, 0, 8])).map(i => ({ ...i, hand: s }))]));
        out.push(...GR.beam(cam, add(c, [-54, 0, -40]), add(c, [54, 0, -40]), 6), ...GR.beam(cam, add(c, [0, 0, -40]), [0, c[1], -110], 6));
        out.push(...GR.under([...GR.beam(cam, [-40, 4, -110], [-40, 470, -110], 6), ...GR.beam(cam, [40, 4, -110], [40, 470, -110], 6), ...GR.beam(cam, [-40, 470, -110], [40, 470, -110], 6), ...GR.beam(cam, [0, 4, -110], [0, 4, 60], 6), ...GR.stack(cam, [0, 0, -150], [0, 0, 1], 12)], 2));
      }
      else if (donkey) {
        /* el burro: el apoyo de los antebrazos delante y el de la cadera, en una palanca que sube con ella */
        const hp = at(F.pelvis, [0, 20, -30]);
        out.push(GR.padAB(cam, add(hp, [0, 8, -6]), add(hp, [0, 8, 26]), UP, 28, 7), ...GR.beam(cam, add(hp, [0, 0, 10]), [0, 260, -120], 5), ...GR.hub(cam, [0, 262, -122], [1, 0, 0], 8));
        out.push(...GR.under([GR.padAB(cam, [0, 116, q.root[2] + 120], [0, 116, q.root[2] + 180], UP, 30, 7), ...GR.beam(cam, [0, 106, q.root[2] + 150], [0, 4, q.root[2] + 150], 7), ...GR.beam(cam, [0, 4, -130], [0, 4, q.root[2] + 170], 6), ...GR.beam(cam, [0, 4, -122], [0, 262, -122], 7)], 2));
        ['L', 'R'].forEach(s => out.push(...GR.rubber(cam, add(q.hands[s], mul(F['grip' + s].x, -8)), add(q.hands[s], mul(F['grip' + s].x, 8))).map(i => ({ ...i, hand: s }))));
      }
      if (db) out.push(...GR.dumbbell(cam, q.hands.L, [0, 0, 1], 'L'));
      if (!machine && !donkey && !smith && !barW && !jump) out.push(...postGear(cam, CALF_POST, F, pose(q).J));
      return out;
    };
    const ex = { view: 'front', up: 'b', rest: 'a', cam: [-56, 8], feetOff: true, one: one || !(machine || smith || barW || jump), at: at_, gear };
    /* (en el escalón con el poste, de frente por el lado izquierdo: se ve la pierna que trabaja, la mano libre (o la mancuerna) y
       el poste detrás, sin tapar el cuerpo; de lado, por ese mismo lado) */
    if (!machine && !donkey && !smith && !barW && !jump) { ex.cam = [52, 8]; ex.side = [84, 4]; }
    if (jump) ex.beat = cycle(640);
    return ex;
  };
  /* sentado: las rodillas bajo el acolchado de la máquina (o la barra, o la mancuerna) y la bola del pie en la plataforma */
  const calfSeated = (one, machine, barW, db) => {
    const seatY = 104, root = [0, seatY + 22, 0], sh = 22, zB = 92;
    const at_ = t => {
      const p = mix(-14, 36, t), lg = s => { const A = toeAnkle([sd(s, [22, 0, 0])[0], sh, zB], p); return [22, A[2], 6, A[1] - LEN.ankle, p]; };
      const flat = [24, zB - 10, 8];
      const solo = one || db;
      const q = { root, tilt: 0, spine: 2, neck: 0, shrug: 0, feet: { L: lg('L'), R: solo ? flat : lg('R') }, knee: both(() => [.1, .6, .8]) }, { F, J } = pose({ ...q, hands: ZERO, elbow: {} });
      /* lo que se apoya en los muslos (el acolchado de la barra, la mancuerna), sobre su cara de arriba justo antes de las
         rodillas: antes flotaba por encima de ellas */
      const onTop = (s, r) => { const th = F['thigh' + s], d = LEN.thigh - 14; return add(add(J[s].hip, mul(norm(sub(J[s].knee, J[s].hip)), d)), mul(th.z, prof1(THIGH_F, d) + r)); };
      if (barW) { const cc = mix(onTop('L', 10.5), onTop('R', 10.5), .5); return { ...q, barC: cc, grip: 50, hands: { L: add(cc, [50, 0, 0]), R: add(cc, [-50, 0, 0]) }, elbow: both(() => [.6, -.3, -.4]) }; }
      if (db) { const c = add(onTop('L', 14.5), [0, 0, 0]); return { ...q, barC: c, hands: { L: add(c, [0, 1, 0]), R: onThigh(q, 'R').hand }, elbow: { L: [.4, .3, -1], R: [.6, .2, -1] }, barDir: { L: [1, 0, 0], R: [1, 0, 0] }, fist: { R: false }, palm: { R: onThigh(q, 'R').palm } }; }
      return { ...q, hands: both(s => [sd(s, [56, 0, 0])[0], seatY + 10, 30]), elbow: both(() => [.6, -.2, -1]), barDir: both(() => [0, 0, 1]) };
    };
    const gear = (q, F, cam) => {
      const { J } = pose(q), out = [];
      /* (a una pierna, el apoyo solo bajo el pie que trabaja: antes iba también bajo el otro, que quedaba metido en él) */
      out.push(...GR.under([...flatBench(cam, [0, seatY, -60], [0, seatY, 40]), GR.obox(cam, [one || db ? 22 : 0, sh / 2, zB + 6], [[1, 0, 0], UP], [one || db ? 17 : 56, sh / 2, 22], GR.C.frame)], 1));
      if (barW) { out.push(...L.barbell(cam, q.barC, q.grip), ...GR.tube(cam, add(q.barC, [-40, -4, 0]), add(q.barC, [40, -4, 0]), 10, GR.C.pad, 3)); return out; }
      if (db) { out.push(...GR.dumbbell(cam, q.barC, [1, 0, 0], 'L', { handle: 12 })); return out; }
      if (machine) {
        /* la palanca: el acolchado sobre las rodillas, que gira en un eje delante, a la altura de la plataforma */
        const pT = s => { const th = F['thigh' + s], d = LEN.thigh - 16; return add(add(J[s].hip, mul(norm(sub(J[s].knee, J[s].hip)), d)), mul(th.z, prof1(THIGH_F, d) + 9)); };
        const pad = one ? pT('L') : mix(pT('L'), pT('R'), .5), P = [0, 60, zB + 70];
        out.push(...GR.tube(cam, add(pad, [one ? -22 : -40, 0, 0]), add(pad, [one ? 22 : 40, 0, 0]), 9, GR.C.pad, 2), ...GR.beam(cam, [54, pad[1], pad[2]], [54, P[1], P[2]], 5), ...GR.beam(cam, [-54, pad[1], pad[2]], [-54, P[1], P[2]], 5), ...GR.hub(cam, [56, P[1], P[2]], [1, 0, 0], 8), ...GR.hub(cam, [-56, P[1], P[2]], [1, 0, 0], 8));
        out.push(...GR.under([...GR.beam(cam, [56, 4, P[2]], [56, P[1], P[2]], 6), ...GR.beam(cam, [-56, 4, P[2]], [-56, P[1], P[2]], 6), ...GR.beam(cam, [-56, 4, P[2]], [56, 4, P[2]], 6), ...GR.horn(cam, [56, P[1] + 30, P[2] - 40], [1, 0, 0], 2)], 2));
        ['L', 'R'].forEach(s => out.push(...GR.rubber(cam, add(q.hands[s], [0, 0, -8]), add(q.hands[s], [0, 0, 8])).map(i => ({ ...i, hand: s }))));
      }
      return out;
    };
    return { view: 'seat', up: 'b', rest: 'a', cam: [-56, 12], feetOff: true, one: one || db, at: at_, gear };
  };

  /* ════ tibial: de pie contra la pared, en la máquina y con banda ════ */
  const tib = f => {
    const w = x => has(f, x), seated = w('seated'), band = w('band');
    if (seated && band) {
      /* sentado en el suelo con las piernas estiradas, las manos apoyadas detrás; la banda, del empeine a un poste delante */
      const at_ = t => {
        const q = supine({ tilt: -14, spine: 6, neck: 6 }), T = torso(q), hip = s => at(T.pelvis, sd(s, [20, 0, 0])), h = hip('L')[1], a = -DEG * Math.asin(clamp((h - 13) / LG, -1, 1));
        const lgL = legAt(hip('L'), yz(a), yz(a), 'L', [0, 1, 0], mix(32, -22, t)), lgR = legAt(hip('R'), yz(a), yz(a), 'R', [0, 1, 0], 20);
        const lq = { ...q, ...legsOf({ L: lgL, R: lgR }) }, { F } = pose({ ...lq, hands: ZERO, elbow: {} });
        return { ...lq, hands: both(s => [sd(s, [48, 0, 0])[0], 8, T.pelvis.o[2] - 36]), elbow: both(() => [.3, .3, -1]), fist: false, palm: both(() => [0, -1, 0]), handDir: both(() => [0, -.2, -1]) };
      };
      let P = null;
      const gear = (q, F, cam) => { const toe = at(F.footL, [0, -6, 30]); if (!P) { const F0 = pose(at_(0)).F, t0 = at(F0.footL, [0, -6, 30]); P = [t0[0], 30, t0[2] + 110]; } return [...GR.under([GR.obox(cam, [P[0], 30, P[2]], [[1, 0, 0], UP], [6, 30, 6], GR.C.frame)], 2), ...GR.bandPath(cam, [add(P, [0, 20, 0]), toe], 90, [1, 0, 0], 3)]; };
      return { view: 'bench', up: 'b', rest: 'a', cam: [-52, 20], feetOff: true, one: true, at: at_, gear };
    }
    if (seated) {
      /* sentado en la máquina, los talones en la plataforma y el empeine bajo el rodillo: las puntas suben hacia las espinillas */
      const seatY = 104, root = [0, seatY + 22, 0], zH = 106, hy = 26;
      const at_ = t => {
        const p = mix(22, -26, t), A = s => heelAnkle([sd(s, [20, 0, 0])[0], hy, zH], p);
        const q = { root, tilt: -4, spine: 0, neck: 0, shrug: 0, feet: both(s => { const a = A(s); return [20, a[2], 4, a[1] - LEN.ankle, p]; }), knee: both(() => [.1, .5, .8]) };
        return { ...q, hands: both(s => [sd(s, [56, 0, 0])[0], seatY + 10, 26]), elbow: both(() => [.6, -.2, -1]), barDir: both(() => [0, 0, 1]) };
      };
      const gear = (q, F, cam) => { const ins = mix(at(F.footL, [0, 6, 18]), at(F.footR, [0, 6, 18]), .5), piv = [0, hy + 4, zH + 60]; return [...GR.under([...flatBench(cam, [0, seatY, -60], [0, seatY, 40]), GR.obox(cam, [0, hy / 2, zH + 10], [[1, 0, 0], UP], [40, hy / 2, 36], GR.C.frame)], 1), ...GR.tube(cam, add(ins, [-34, 0, 0]), add(ins, [34, 0, 0]), 8, GR.C.pad, 2), ...GR.beam(cam, add(ins, [40, 0, 0]), add(piv, [40, 0, 0]), 4), ...GR.beam(cam, add(ins, [-40, 0, 0]), add(piv, [-40, 0, 0]), 4), ...GR.hub(cam, add(piv, [42, 0, 0]), [1, 0, 0], 7), ...GR.hub(cam, add(piv, [-42, 0, 0]), [1, 0, 0], 7), ...['L', 'R'].flatMap(s => GR.rubber(cam, add(q.hands[s], [0, 0, -8]), add(q.hands[s], [0, 0, 8])).map(i => ({ ...i, hand: s })))]; };
      return { view: 'seat', up: 'b', rest: 'a', cam: [-56, 12], feetOff: true, at: at_, gear };
    }
    /* de pie, la espalda apoyada en la pared y los talones a un pie de ella: las puntas suben */
    const zW = -60, zH = 6;
    const at_ = t => {
      const p = mix(0, -28, t), A = s => heelAnkle([sd(s, [22, 0, 0])[0], 0, zH], p);
      const q = { root: [0, ROOT_Y - 4, -16], tilt: -9, spine: 0, neck: 6, shrug: 0, feet: both(s => { const a = A(s); return [22, a[2], 8, a[1] - LEN.ankle, p]; }), knee: both(() => [.15, 0, 1]) }, { F } = pose({ ...q, hands: ZERO, elbow: {} });
      return { ...q, hands: both(s => add(shoulder(F, s, q), sd(s, [22, -140, -8]))), elbow: both(() => [.2, 0, -1]), fist: false, palm: both(() => [0, 0, -1]) };
    };
    const gear = (q, F, cam) => { const zb = min(lowOf(pose(q).F, pose(q).J, [0, 0, 1]) - 4, -40); return GR.under([GR.obox(cam, [0, 210, zb - 6], [[1, 0, 0], UP], [110, 210, 6], ['#202436', '#4d5370'])], 0); };
    return { view: 'front', up: 'b', rest: 'a', cam: [-50, 8], feetOff: true, at: at_, gear };
  };

  /* la minibanda alrededor de los dos muslos, por encima de las rodillas: por fuera de cada muslo y cruzando por delante y
     por detrás de uno a otro, ceñida a su grosor del dibujo */
  const miniBand = (cam, J, k = .8, F = null) => {
    const P = s => add(J[s].hip, mul(norm(sub(J[s].knee, J[s].hip)), k * LEN.thigh)), ax = norm(sub(P('L'), P('R'))), d = k * LEN.thigh;
    const th = norm(sub(mix(J.L.hip, J.R.hip, .5), mix(J.L.knee, J.R.knee, .5))), fr = norm(cross(th, ax)), fz = dot(fr, [0, 0, 1]) < 0 && dot(fr, [0, 1, 0]) < .5 ? mul(fr, -1) : fr;
    const W = prof1(THIGH_W, d) * 1.08 + 3, Fz = prof1(THIGH_F, d) * 1.08 + 3, Bk = 15.5, half = s => { const c = P(s), sg = s == 'L' ? 1 : -1, o = []; for (let i = 0; i <= 6; i++) { const a = PI * i / 6, r = a < PI / 2 ? Fz : Bk; o.push(add(c, add(mul(fz, cos(a) * (i <= 3 ? Fz : Bk)), mul(ax, sg * sin(a) * W)))); } return o; };
    const hl = half('L'), hr = half('R'), pts = [...hl, ...hr.reverse(), hl[0]], it = GR.bandPath(cam, pts, 130, th, 2.2);
    /* (cada trozo, delante o detrás según lo que de verdad lo tapa: el de delante de las rodillas, encima; el de detrás,
       debajo. Antes se ordenaba contra el tronco entero, muslos incluidos, y a ratos la banda desaparecía) */
    return F ? visTag(it, it.map(i => i.mid), cam, F, J) : it;
  };

  /* ════ abductores y aductores: máquina, polea, banda, de lado y balón ════ */
  const hipOpen = f => {
    const w = x => has(f, x), add_ = w('adduct'), machine = w('machine'), cable = w('cable'), band = w('band'), side = w('side'), ballA = w('ball');
    if (machine) {
      /* sentado en la máquina (el respaldo algo inclinado), las rodillas dobladas y los pies en sus apoyos; los muslos se abren
         (o se cierran) girando sobre la cadera, con el acolchado por fuera (o por dentro) de las rodillas */
      const root = [0, 122, 0];
      const at_ = t => {
        const ph = add_ ? mix(36, 9, t) : mix(4, 38, t), q = { root, tilt: -14, spine: 2, neck: 6, shrug: 0 }, T = torso(q);
        const lg = s => { const hp = at(T.pelvis, sd(s, [20, 0, 0])), d1 = sd(s, [sin(RAD(ph)), .05, cos(RAD(ph))]), d2 = sd(s, [sin(RAD(ph)) * .2, -1, .12]); return legAt(hp, d1, d2, s, [0, 1, 0], -2); };
        const lq = { ...q, ...legsOf({ L: lg('L'), R: lg('R') }) };
        /* (las asas junto al asiento, inclinadas hacia delante y arriba, de través al antebrazo, con el pulgar delante) */
        return { ...lq, hands: both(s => [sd(s, [62, 0, 0])[0], 112, 6]), elbow: both(() => [.6, -.2, -1]), barDir: both(() => [0, .57, .82]) };
      };
      const gear = (q, F, cam) => {
        const { J } = pose(q), out = [], BN = norm([0, .26, 1]);
        out.push(...GR.under([GR.padAB(cam, [0, 100, -26], [0, 100, 34], UP, 32, 7), ...GR.beam(cam, [0, 92, 0], [0, 4, 0], 7), ...GR.beam(cam, [0, 4, -150], [0, 4, 110], 6), ...GR.beam(cam, [0, 4, -110], [0, 280, -110], 7), ...GR.stack(cam, [0, 0, -150], [0, 0, 1], 12)], 2));
        /* el respaldo: debajo del cuerpo si se ve por delante y, visto desde atrás, encima de la espalda (antes se pintaba siempre
           debajo y, desde atrás, la espalda se veía a través de él) */
        const back = GR.padAB(cam, [0, 120, -40], [0, 260, -74], BN, 28, 7);
        out.push(dot(BN, cam.c) < 0 ? { ...back, above: ['trunk'] } : { ...back, z: -1e6 + 1.9 });
        ['L', 'R'].forEach(s => {
          /* (el acolchado, por fuera de la rodilla en la abducción y por dentro en la aducción, en las dos piernas: antes el de la
             derecha iba al revés) */
          /* (el acolchado: un cojín redondo, de pie, contra la cara de fuera (o de dentro) de la rodilla, con su placa y la palanca
             que baja hasta el eje bajo la cadera. Antes era una caja a lo largo del muslo que, desde algunos lados, parecía un
             bloque clavado en la rodilla o, en tres trozos, cajas sueltas) */
          const k = s == 'L' ? 1 : -1, K = J[s].knee, hip = J[s].hip, out_ = add_ ? -1 : 1, d1 = norm(sub(K, hip)), side_ = norm(cross(UP, d1)).map(v => v * k * out_), hub = [hip[0], 62, hip[2]];
          const dd = LEN.thigh - 10, c = add(add(hip, mul(d1, dd)), mul(side_, prof1(THIGH_W, dd) * 1.08 + 2 + 9)), plate = add(c, mul(side_, 11));
          const legs = ['trunk', 'shin' + s, 'foot' + s], near = dot(side_, cam.c) > 0;
          const ord = add_ ? { under: ['trunk', 'shinL', 'shinR', 'footL', 'footR'] } : near ? { above: legs } : { under: legs };
          const it = [GR.obox(cam, plate, [d1, UP], [7, 15, 2.5], GR.C.frame), ...GR.tube(cam, add(c, [0, 15, 0]), add(c, [0, -15, 0]), 18, GR.C.pad, 1)];
          out.push(...it.map(x => ({ ...x, ...ord })), ...GR.beam(cam, add(plate, [0, -12, 0]), [plate[0], 62, plate[2]], 4.5), ...GR.beam(cam, [plate[0], 62, plate[2]], hub, 4.5), ...GR.hub(cam, hub, [0, 1, 0], 8));
          const fo = J[s].ankle; out.push(GR.obox(cam, add(fo, [0, -24, 12]), [[1, 0, 0], UP], [14, 2.5, 18], GR.C.frame), ...GR.beam(cam, add(fo, [0, -26, -4]), [hub[0], 62, hub[2]], 4));
          out.push(...GR.rubber(cam, add(q.hands[s], mul(F['grip' + s].x, -8)), add(q.hands[s], mul(F['grip' + s].x, 8))).map(i => ({ ...i, hand: s })));
        });
        return out;
      };
      /* (la abducción: de frente y a un lado, que se ve cómo se abren las piernas; y de lado, algo desde atrás, donde quedan
         a la vista el glúteo medio y el mayor, lo que trabaja. La aducción, de frente y desde arriba: la cara de dentro de los
         muslos) */
      /* (la abducción: en 3/4, de frente y algo de lado y desde arriba, se ve cómo se abren las piernas y el costado de la
         cadera; de lado, el glúteo medio, en el costado, que es lo que trabaja. La aducción, de frente y desde arriba: la cara de
         dentro de los muslos) */
      return { view: 'seat', up: 'b', rest: 'a', cam: add_ ? [-58, 16] : [-50, 22], side: add_ ? [-10, 30] : [-90, 8], feetOff: true, at: at_, gear };
    }
    if (cable) {
      /* de pie, de lado a la polea baja, la tobillera en el tobillo izquierdo y agarrado a la torre: la pierna se separa del
         cuerpo (abducción, la polea a la derecha) o cruza por delante de la otra (aducción, la polea a la izquierda) */
      const tx = add_ ? TX : -TX, hold = add_ ? 'L' : 'R', free = hold == 'L' ? 'R' : 'L';
      const at_ = t => {
        const ph = add_ ? mix(30, -14, t) : mix(2, 36, t), roll = add_ ? 0 : 3 + .12 * ph;
        const q = { root: [add_ ? 6 : -6, ROOT_Y + 3, 0], tilt: 0, spine: 0, neck: 0, roll: add_ ? -3 : roll, shrug: 0 }, T = torso(q);
        const hp = at(T.pelvis, [20, 0, 0]), d = norm([sin(RAD(ph)), -cos(RAD(ph)), ph < 0 ? .3 : .06]), d2 = norm(add(d, [0, 0, .2])), lgL = legAt(hp, d, d2, 'L', [0, 0, 1], 10);
        const R = [24 - (add_ ? -6 : 6) * 0, 0, 0], rf = { foot: [add_ ? 18 : 30, 0, 8], knee: [.1, 0, 1], fd: undefined };
        const lq = { ...q, feet: { L: lgL.foot, R: [add_ ? 18 : 30, 0, 8] }, knee: { L: lgL.knee, R: [.1, 0, 1] }, footDir: { L: lgL.fd } }, { F } = pose({ ...lq, hands: ZERO, elbow: {} });
        const P = [tx, 0, 26], Hh = [tx + (add_ ? -14 : 14), 200, 18], fh = onHip(F, free);
        return { ...lq, hands: { [hold]: Hh, [free]: fh.hand }, elbow: { [hold]: [.3, -.6, -.4], [free]: fh.elbow }, barDir: { [hold]: [0, 1, 0], [free]: [1, 0, 0] }, fist: { [free]: false }, palm: { [free]: fh.palm } };
      };
      const gear = (q, F, cam) => { const a = at(F.footL, [0, 2, -2]); return [...GR.pulleyTower(cam, [tx, 0, 26], 24, a), ...GR.strap(cam, [add(a, [-9, 0, 0]), add(a, [9, 0, 0])], 6, GR.C.strap)]; };
      return { view: 'front', up: 'b', rest: 'a', cam: add_ ? [-14, 8] : [155, 10], side: add_ ? undefined : [-20, 8], one: true, at: at_, gear };
    }
    if (band) {
      /* sentado en un banco con la minibanda sobre las rodillas: las rodillas se separan y vuelven, los pies quietos */
      const seatY = 104, root = [0, seatY + 22, 0];
      const at_ = t => {
        const ph = mix(0, 34, t), q = { root, tilt: 4, spine: 4, neck: 0, shrug: 0, feet: both(() => [26, 92, 14]), knee: both(() => [sin(RAD(ph)) * 1.4, .55, .8]) }, { F } = pose({ ...q, hands: ZERO, elbow: {} });
        return { ...q, hands: both(s => [sd(s, [50, 0, 0])[0], seatY + 6, -8]), elbow: both(() => [.3, .2, -1]), fist: false, palm: both(() => [0, -1, 0]) };
      };
      const gear = (q, F, cam) => [...GR.under(flatBench(cam, [0, seatY, -70], [0, seatY, 30])), ...miniBand(cam, pose(q).J, .8, F)];
      return { view: 'seat', up: 'b', rest: 'a', cam: [-150, 18], side: [-20, 16], at: at_, gear };
    }
    if (side) {
      /* tumbado sobre el costado derecho, la cabeza apoyada en el brazo y la mano izquierda delante del pecho: la pierna de
         arriba sube y baja, estirada */
      const at_ = t => {
        const q0 = { root: [0, 0, 0], roll: 90, tilt: 0, spine: 0, neck: 6, shrug: 0 }, q = shift(q0, [0, restOn(q0, UP, 0, { noHead: false }), 0]), T = torso(q), dir = mul(T.pelvis.y, -1);
        const up = mix(0, 38, t), lg = s => { const hp = at(T.pelvis, sd(s, [20, 0, 0])), d = s == 'L' ? norm(add(mul(dir, cos(RAD(up))), mul(T.pelvis.x, sin(RAD(up))))) : dir; return legAt(hp, d, d, s, [0, 0, 1], 15); };
        const lq = { ...q, ...legsOf({ L: lg('L'), R: lg('R') }) }, { F } = pose({ ...lq, hands: ZERO, elbow: {} });
        const S = shoulder(F, 'R', lq), Hr = add(S, [-(LU + LF) + 8, 6, 8]), Hl = [S[0] + 30, 6, S[2] + 50];
        return { ...lq, hands: { R: Hr, L: Hl }, elbow: { R: [0, .2, 1], L: hintL('L', [-.3, .8, .5]) }, fist: false, palm: { R: [0, 1, 0], L: [0, -1, 0] }, handDir: { L: [-.4, -.2, 1] } };
      };
      return { view: 'front', up: 'b', rest: 'a', cam: [-165, 34], side: [-14, 22], feetOff: true, one: true, at: at_ };
    }
    /* tumbado boca arriba con las rodillas dobladas y un balón entre ellas: las rodillas aprietan el balón y sueltan */
    const zF0 = 112;
    const at_ = t => {
      const u = sin(PI * t), q = supine({ tilt: -90, spine: 2, neck: 4 }), hip0 = at(torso(q).pelvis, [20, 0, 0]);
      const lq = { ...q, feet: both(() => [24, hip0[2] + zF0, 6]), knee: both(() => [mix(-.05, -.16, u), 1, 0]) }, { F } = pose({ ...lq, hands: ZERO, elbow: {} });
      return { ...lq, ...palmsDown(F, lq), squeeze: u };
    };
    const gear = (q, F, cam) => { const { J } = pose(q), c = add(mix(J.L.knee, J.R.knee, .5), [0, 6, 0]); return ball(cam, c, 18 - 2.5 * (q.squeeze || 0), ['#2a2318', '#8a7a58', '#4a3f2a']); };
    return { view: 'bench', up: 'b', rest: 'a', cam: [-6, 12], side: [-56, 26], feetOff: true, at: at_, gear, pause: 900 };
  };

  /* ── girar la postura entera alrededor de la vertical que pasa por C (el cuerpo, los pies, las manos y sus direcciones) ── */
  const rotV = (v, th) => { const c = cos(RAD(th)), s = sin(RAD(th)); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; };
  const rotP = (p, th, C) => add(C, rotV(sub(p, C), th));
  const rotY = (q, th, C) => {
    const o = { ...q, root: rotP(q.root, th, C), yaw: (q.yaw || 0) + th }, mir = (v, k) => [k * v[0], v[1], v[2]];
    o.feet = {}; o.knee = {};
    for (const [s, k] of [['L', 1], ['R', -1]]) {
      const fo = q.feet[s], A = rotP([k * fo[0], LEN.ankle + (fo[3] || 0), fo[1]], th, C), n = [...fo];
      n[0] = k * A[0]; n[1] = A[2]; n[2] = (fo[2] || 0) + k * th; o.feet[s] = n;
      o.knee[s] = mir(rotV(mir(q.knee[s] || [0, 0, 1], k), th), k);
    }
    if (q.hands) o.hands = { L: rotP(q.hands.L, th, C), R: rotP(q.hands.R, th, C) };
    if (q.elbow) o.elbow = Object.fromEntries(Object.entries(q.elbow).map(([s, v]) => [s, mir(rotV(mir(v, s == 'L' ? 1 : -1), th), s == 'L' ? 1 : -1)]));
    if (q.barC) o.barC = rotP(q.barC, th, C);
    if (q.barDir) o.barDir = Array.isArray(q.barDir) ? rotV(q.barDir, th) : Object.fromEntries(Object.entries(q.barDir).map(([s, v]) => [s, rotV(v, th)]));
    if (q.handDir) o.handDir = Object.fromEntries(Object.entries(q.handDir).map(([s, v]) => [s, rotV(v, th)]));
    if (q.palm) o.palm = Object.fromEntries(Object.entries(q.palm).map(([s, v]) => [s, mir(rotV(mir(v, s == 'L' ? 1 : -1), th), s == 'L' ? 1 : -1)]));
    if (q.footDir) o.footDir = Object.fromEntries(Object.entries(q.footDir).map(([s, v]) => [s, { y: rotV(v.y, th), z: rotV(v.z, th) }]));
    return o;
  };
  /* el pie s en la posición A (su tobillo, a la altura del suelo si y = 20) como pie del motor */
  const footAtA = (s, A, toe = 8, p = 0) => [s == 'L' ? A[0] : -A[0], A[2], toe, A[1] - LEN.ankle, p];
  /* el paso: un pie que va de a a b levantándose h en medio */
  const stepPath = (a, b, u, h) => add(mix(a, b, ease(u)), [0, h * sin(PI * clamp(u, 0, 1)), 0]);

  /* ════ step up: a un cajón por delante (alto: por encima de la rodilla), de lado, y el box step-over ════ */
  /* una tabla de momentos clave ([t, {campo: valor}]) y su valor en t: cada campo por su curva suave (spl) */
  const keyed = K => { const f = Object.keys(K[0][1]), tab = {}; for (const k of f) tab[k] = K.map(([t, o]) => [t, o[k]]); return t => { const o = {}; for (const k of f) o[k] = spl(t, tab[k]); return o; }; };
  /* la raíz, nunca más alta de lo que dejan llegar las piernas que apoyan (con un margen y sin esquinas: un mínimo suave) */
  const reachY = (root, A, hx) => A[1] + sqrt(max(0, 169 ** 2 - (root[2] - A[2]) ** 2 - (hx - A[0]) ** 2));
  const capRoot = (root, feet) => { let y = root[1]; for (const [A, hx] of feet) { const m = reachY(root, A, hx); y = (y + m - sqrt((y - m) ** 2 + 16)) / 2; } return [root[0], y, root[2]]; };
  const stepUp = f => {
    const w = x => has(f, x), side = w('side'), high = w('high'), none = w('none'), db = w('db');
    if (high && none) return boxStepOver();
    const Hb = side ? 64 : high ? 132 : 100, zB = side ? 0 : 58, xB = side ? 100 : 0, A = LEN.ankle;
    /* el pie izquierdo, en el cajón todo el rato. Primero el peso pasa a él (la cadera adelante, sobre ese pie, y el tronco se
       inclina), luego esa pierna se estira y sube el cuerpo, y el pie derecho se despega (de puntillas primero), sube por detrás
       con la rodilla doblada y llega junto al izquierdo. Al bajar, lo mismo al revés: el derecho baja despacio al suelo. Antes
       la cadera iba en línea recta de abajo a arriba y el pie derecho se deslizaba en diagonal hasta el cajón */
    /* (el pie entero sobre el cajón, con el talón dentro: antes quedaba en el borde, y el otro pie, al subir, se posaba con el
       talón en el aire) */
    const AL = side ? [xB - 12, Hb + A, 6] : [18, Hb + A, zB + 6];
    const top = side ? xB - 24 : zB - 2, Ytop = Hb + A + 168;
    const K = side ? [
      [0, { rx: 18, ry: ROOT_Y - 24, rz: 4, lean: 6, roll: -9, Rx: -12, Ry: A, Rz: 4, Rp: 0 }],
      [.3, { rx: 46, ry: ROOT_Y - 20, rz: 4, lean: 12, roll: -7, Rx: -12, Ry: A + 4, Rz: 4, Rp: 26 }],
      [.55, { rx: 62, ry: Hb + ROOT_Y - 50, rz: 5, lean: 8, roll: -3, Rx: 14, Ry: A + 40, Rz: -6, Rp: 30 }],
      [.82, { rx: top, ry: Ytop - 6, rz: 6, lean: 2, roll: 0, Rx: xB - 36, Ry: Hb + A + 10, Rz: 4, Rp: 10 }],
      [1, { rx: top, ry: Ytop - 3, rz: 6, lean: 0, roll: 0, Rx: xB - 36, Ry: Hb + A + 2, Rz: 4, Rp: 0 }]]
      : [
      [0, { rx: 0, ry: ROOT_Y - 8, rz: -14, lean: high ? 20 : 14, roll: 0, Rx: -20, Ry: A, Rz: -40, Rp: 0 }],
      [.3, { rx: 0, ry: ROOT_Y + (high ? 10 : 4), rz: high ? 6 : 12, lean: high ? 32 : 24, roll: 0, Rx: -20, Ry: A + 6, Rz: -40, Rp: 30 }],
      [.56, { rx: 0, ry: Hb + ROOT_Y - (high ? 62 : 48), rz: zB - (high ? 30 : 22), lean: high ? 22 : 14, roll: 0, Rx: -20, Ry: high ? 92 : 74, Rz: -10, Rp: 34 }],
      [.82, { rx: 0, ry: Ytop - 6, rz: top, lean: 6, roll: 0, Rx: -20, Ry: Hb + A + 12, Rz: zB + 2, Rp: 12 }],
      [1, { rx: 0, ry: Ytop - 3, rz: top, lean: 3, roll: 0, Rx: -20, Ry: Hb + A + 1, Rz: zB + 2, Rp: 0 }]];
    const tr = keyed(K);
    const at_ = t => {
      const k = tr(t), AR = [k.Rx, k.Ry, k.Rz], onFloor = t < .38;
      /* (la raíz, sin pasarse de lo que llega la pierna del cajón ni, mientras apoya, la del suelo) */
      const root = capRoot([k.rx, k.ry, k.rz], [[AL, side ? k.rx + 20 : 20], ...(onFloor ? [[toeAnkleP(AR, k.Rp), side ? k.rx - 20 : -20]] : [])]);
      const ARf = toeAnkleP(AR, k.Rp);
      const q = { root, tilt: k.lean * .7, spine: k.lean * .3, neck: -k.lean * .6, shrug: 0, roll: k.roll, feet: { L: footAtA('L', AL, side ? 0 : 8), R: footAtA('R', ARf, side ? 0 : 8, k.Rp) }, knee: { L: side ? [.3, 0, 1] : [.12, .2, 1], R: [.1, 0, 1] } }, { F } = pose({ ...q, hands: ZERO, elbow: {} });
      return { ...q, hands: both(s => hang(F, q, s, side ? 31 : 21)), elbow: both(() => [.1, 0, -1]), barDir: [0, 0, 1] };
    };
    const gear = (q, F, cam) => [...GR.under([GR.obox(cam, side ? [xB + 8, Hb / 2, 4] : [0, Hb / 2, zB + 22], [[1, 0, 0], UP], side ? [50, Hb / 2, 46] : [56, Hb / 2, 40], ['#2e3346', '#6a7190'])], 1), ...(db ? M.pair(q, cam, [0, 0, 1], F) : [])];
    return { view: 'front', up: 'b', rest: 'a', cam: side ? [-18, 8] : [-62, 8], feetOff: true, one: true, at: at_, gear };
  };
  /* el tobillo de un pie apoyado en la bola (A: donde está el tobillo con el pie plano) levantado p grados de talón */
  const toeAnkleP = (A, p) => { if (!p) return A; const r = RAD(p), ku = 19.8 * (cos(r) - 1) + 25 * sin(r), kd = 19.8 * sin(r) + 25 * (1 - cos(r)); return [A[0], A[1] + ku, A[2] + kd]; };
  /* el box step-over: sube al cajón, baja por el otro lado, se da la vuelta y repite (el cajón, siempre en el mismo sitio). Los
     pies, por momentos clave con curvas suaves (se despegan, pasan por encima del borde y se posan); la cadera, la que deja
     llegar a las piernas que apoyan, sin esquinas. Antes cada tramo arrancaba y frenaba (y la cadera daba tirones) */
  const boxStepOver = () => {
    const Hb = 110, d = 82, A = LEN.ankle, T0 = Hb + A, zE = 34;
    const K = [
      [0, { lx: 20, ly: A, lz: -d + 4, rx: -20, ry: A, rz: -d - 4, lp: 0, rp: 0, hx: 0, hy: ROOT_Y, hz: -d, lean: 4 }],
      [.06, { lx: 20, ly: A, lz: -d + 4, rx: -20, ry: A, rz: -d - 4, lp: 18, rp: 0, hx: -4, hy: ROOT_Y - 4, hz: -d + 4, lean: 6 }],
      [.13, { lx: 20, ly: T0 + 24, lz: -zE - 6, rx: -20, ry: A, rz: -d - 4, lp: 12, rp: 0, hx: -6, hy: ROOT_Y - 8, hz: -d + 14, lean: 12 }],
      [.2, { lx: 20, ly: T0, lz: -6, rx: -20, ry: A, rz: -d - 4, lp: 0, rp: 14, hx: 4, hy: ROOT_Y - 8, hz: -50, lean: 22 }],
      [.3, { lx: 20, ly: T0, lz: -6, rx: -20, ry: A + 18, rz: -d + 8, lp: 0, rp: 42, hx: 12, hy: Hb + ROOT_Y - 70, hz: -22, lean: 18 }],
      [.38, { lx: 20, ly: T0, lz: -6, rx: -20, ry: T0 + 30, rz: -28, lp: 0, rp: 20, hx: 10, hy: Hb + ROOT_Y - 18, hz: -10, lean: 8 }],
      [.45, { lx: 20, ly: T0, lz: -6, rx: -20, ry: T0, rz: 6, lp: 0, rp: 0, hx: 0, hy: Hb + ROOT_Y - 4, hz: -2, lean: 4 }],
      [.5, { lx: 20, ly: T0, lz: -6, rx: -20, ry: T0, rz: 6, lp: 0, rp: 0, hx: -8, hy: Hb + ROOT_Y - 10, hz: 2, lean: 6 }],
      [.58, { lx: 20, ly: T0 + 14, lz: zE + 10, rx: -20, ry: T0, rz: 6, lp: 10, rp: 0, hx: -10, hy: Hb + ROOT_Y - 52, hz: 14, lean: 12 }],
      [.67, { lx: 20, ly: A, lz: d - 22, rx: -20, ry: T0, rz: 6, lp: 0, rp: 0, hx: -2, hy: ROOT_Y - 16, hz: 40, lean: 10 }],
      [.74, { lx: 20, ly: A, lz: d - 22, rx: -20, ry: T0, rz: 6, lp: 0, rp: 30, hx: 8, hy: ROOT_Y + 2, hz: 56, lean: 6 }],
      [.78, { lx: 20, ly: A, lz: d - 22, rx: -20, ry: T0 + 8, rz: zE - 4, lp: 0, rp: 22, hx: 7, hy: ROOT_Y + 6, hz: 60, lean: 4 }],
      [.84, { lx: 20, ly: A, lz: d - 22, rx: -20, ry: T0 - 22, rz: zE + 22, lp: 0, rp: 14, hx: 5, hy: ROOT_Y + 3, hz: 64, lean: 4 }],
      [.9, { lx: 20, ly: A, lz: d - 22, rx: -20, ry: A, rz: d - 30, lp: 0, rp: 0, hx: 0, hy: ROOT_Y - 6, hz: d - 18, lean: 4 }],
      [1, { lx: 20, ly: A, lz: d - 22, rx: -20, ry: A, rz: d - 30, lp: 0, rp: 0, hx: 0, hy: ROOT_Y, hz: d - 22, lean: 3 }]];
    const tr = keyed(K);
    const first = u => {
      const k = tr(u), Lf = [k.lx, k.ly, k.lz], Rf = [k.rx, k.ry, k.rz];
      /* (apoyan los pies que están en el suelo o en el cajón, no en el aire) */
      const stance = [];
      if (abs(k.ly - A) < 1 || abs(k.ly - T0) < 1) stance.push([toeAnkleP(Lf, k.lp), k.hx + 20]);
      if (abs(k.ry - A) < 1 || abs(k.ry - T0) < 1) stance.push([toeAnkleP(Rf, k.rp), k.hx - 20]);
      const root = capRoot([k.hx, k.hy, k.hz], stance), lean = k.lean;
      const q = { root, tilt: lean * .7, spine: lean * .3, neck: -lean * .5, shrug: 0, feet: { L: footAtA('L', toeAnkleP(Lf, k.lp), 8, k.lp), R: footAtA('R', toeAnkleP(Rf, k.rp), 8, k.rp) }, knee: both(() => [.1, .2, 1]) }, { F } = pose({ ...q, hands: ZERO, elbow: {} });
      /* (los brazos, sueltos, con un poco de balanceo contrario a las piernas) */
      const sw = s => (s == 'L' ? 1 : -1) * 10 * sin(2 * PI * u);
      return { ...q, hands: both(s => add(shoulder(F, s, q), sd(s, [16, -139, 10 + sw(s)]))), elbow: both(() => [.2, 0, -1]), fist: false, palm: both(() => [-1, 0, 0]) };
    };
    const C = [0, 0, 0];
    const at_ = t => {
      /* la ida (.42), la vuelta sobre sí mismo (.08), la ida al revés (.42) y otra vuelta (.08) */
      if (t < .42) return first(t / .42);
      if (t < .5) { const e = first(1); return rotY(e, 180 * ease((t - .42) / .08), e.root); }
      if (t < .92) return rotY(first((t - .5) / .42), 180, C);
      const e = rotY(first(1), 180, C); return rotY(e, 180 * ease((t - .92) / .08), e.root);
    };
    const gear = (q, F, cam) => GR.under([GR.obox(cam, [0, Hb / 2, 0], [[1, 0, 0], UP], [58, Hb / 2, 34], ['#2e3346', '#6a7190'])], 1);
    return { view: 'front', up: 'a', rest: 'a', cam: [-70, 10], feetOff: true, one: true, at: at_, gear, beat: cycle(9000) };
  };

  /* ════ sissy, pistol asistida, pasos laterales con banda y zancada lateral ════ */
  const sissy = () => {
    /* de puntillas, agarrado a un poste con la mano derecha: las rodillas van hacia delante y abajo con la cadera estirada (de
       las rodillas a la cabeza, una línea que se inclina hacia atrás) */
    const P = postAt(-96, 30, 260);
    const at_ = t => {
      /* (las espinillas, hasta 56° hacia delante, y los muslos, 42° hacia atrás: antes llegaban a 62° y 48° y la rodilla y el
         tobillo quedaban forzados; la cadera, con un poco de flexión abajo, para equilibrar) */
      const u = ease(t), p = mix(20, 36, u), A = s => toeAnkle([sd(s, [20, 0, 0])[0], 0, 18], p);
      const sg = RAD(mix(8, 56, u)), dl = RAD(mix(2, 42, u)), AL = A('L'), Kz = AL[2] + LEN.shin * sin(sg), Ky = AL[1] + LEN.shin * cos(sg), Hy = Ky + LEN.thigh * cos(dl), Hz = Kz - LEN.thigh * sin(dl);
      /* (de las rodillas a los hombros, casi en línea: la cadera estirada; los pies, a la anchura de la cadera) */
      const q = { root: [0, Hy, Hz], tilt: -mix(2, 39, u), spine: mix(0, 2, u), neck: mix(0, 16, u), shrug: 0, feet: both(s => { const a = A(s); return [22, a[2], 8, a[1] - LEN.ankle, p]; }), knee: both(() => [.08, .1, 1]) }, { F } = pose({ ...q, hands: ZERO, elbow: {} });
      const hp = holdPost('R', P), fl = armTo(F, q, 'L', [.2, -.2, 1], 10);
      return { ...q, hands: { R: hp.hand, L: fl.H }, elbow: { R: hp.elbow, L: fl.hint }, barDir: { R: hp.bd, L: [1, 0, 0] }, fist: { L: false }, palm: { L: [-1, 0, 0] } };
    };
    /* (de lado, desde el lado contrario al poste: así no tapa las piernas) */
    return { view: 'front', up: 'a', rest: 'a', cam: [-58, 8], side: [88, 4], feetOff: true, one: true, at: at_, gear: (q, F, cam) => postGear(cam, P, F, pose(q).J) };
  };
  const pistol = () => {
    /* de pie sobre la pierna izquierda, la derecha estirada por delante, agarrado a las asas del TRX: baja todo lo que puede
       con el talón en el suelo */
    const anchor = [0, 640, 330];
    const at_ = t => {
      /* (con las cintas sujetando, el tronco va más erguido y la pierna libre, por delante, sin subir tanto: antes la cadera de
         las dos piernas acababa tan doblada que el cuerpo se deformaba en la ingle y los glúteos) */
      const u = ease(t), lr = legRoot(18, 0, 10, mix(3, 32, u), mix(88, -5, u)), q0 = { root: add(lr.root, [0, 0, 0]), tilt: mix(3, 24, u), spine: mix(0, 8, u), neck: mix(0, -10, u), shrug: 0 }, T = torso(q0);
      const b = mix(24, 70, u), dR = [0, -cos(RAD(b)), sin(RAD(b))], lgR = legAt(at(T.pelvis, [-20, 0, 0]), dR, dR, 'R', [0, sin(RAD(b)), cos(RAD(b))], 25);
      const q = { ...q0, feet: { L: [18, 0, 10], R: lgR.foot }, knee: { L: lr.knee, R: lgR.knee }, footDir: { R: lgR.fd } }, { F } = pose({ ...q, hands: ZERO, elbow: {} });
      const o = { hands: {}, elbow: {} };
      for (const s of ['L', 'R']) { const S = shoulder(F, s, q), a = sd(s, [16, 0, 0]), dir = norm(sub(add(anchor, a), S)); o.hands[s] = add(S, mul(dir, LU + LF - 30)); o.elbow[s] = [.3, -.8, -.2]; }
      return { ...q, ...o };
    };
    const gear = (q, F, cam) => ['L', 'R'].flatMap(s => [...GR.strap(cam, [q.hands[s], add(anchor, sd(s, [10, 0, 0]))], 6, GR.C.trx).map(i => ({ ...i, nf: true })), ...GR.tube(cam, add(q.hands[s], [-8, 0, 0]), add(q.hands[s], [8, 0, 0]), 4.5, STEEL, 1).map(i => ({ ...i, hand: s }))]);
    return { view: 'front', up: 'a', rest: 'a', cam: [-62, 8], one: true, at: at_, gear };
  };
  const bandWalk = () => {
    /* en media sentadilla con la minibanda sobre las rodillas: el pie izquierdo da un paso corto hacia fuera y el derecho le
       sigue sin juntarse (la banda, siempre tensa); luego el derecho vuelve hacia su lado y el izquierdo le sigue. Cada pie se
       despega un poco al moverse y la cadera va con el peso. Antes, a la vuelta, los dos pies se movían a la vez y uno se
       levantaba sin moverse */
    const W = 30, S = 34;
    const K = [
      [0, { xl: W, xr: -W, ll: 0, lr: 0, cx: 0 }], [.125, { xl: W + S / 2, xr: -W, ll: 8, lr: 0, cx: 2 }], [.25, { xl: W + S, xr: -W, ll: 0, lr: 0, cx: S / 2 }],
      [.375, { xl: W + S, xr: -W + S / 2, ll: 0, lr: 8, cx: S * .62 }], [.5, { xl: W + S, xr: -W + S, ll: 0, lr: 0, cx: S }], [.625, { xl: W + S, xr: -W + S / 2, ll: 0, lr: 8, cx: S - 2 }],
      [.75, { xl: W + S, xr: -W, ll: 0, lr: 0, cx: S / 2 }], [.875, { xl: W + S / 2, xr: -W, ll: 8, lr: 0, cx: S * .38 }], [1, { xl: W, xr: -W, ll: 0, lr: 0, cx: 0 }]];
    const tr = keyed(K);
    const at_ = t => {
      const k = tr(t), q = { root: [k.cx, ROOT_Y - 30, -14], tilt: 18, spine: 6, neck: -12, shrug: 0, roll: (k.lr - k.ll) * .25, feet: { L: [k.xl, 0, 12, max(0, k.ll)], R: [-k.xr, 0, 12, max(0, k.lr)] }, knee: both(() => [.35, .1, 1]) }, { F } = pose({ ...q, hands: ZERO, elbow: {} });
      const c = at(F.thorax, [0, 44, 46]);
      return { ...q, hands: { L: add(c, [6, 0, 0]), R: add(c, [-6, 0, 0]) }, elbow: both(() => [.5, -.6, .2]), fist: false, palm: both(() => [-1, 0, 0]) };
    };
    return { view: 'front', up: 'a', rest: 'a', cam: [-24, 8], feetOff: true, one: true, at: at_, gear: (q, F, cam) => miniBand(cam, pose(q).J, .74, F), beat: cycle(3600) };
  };
  const sideLunge = () => {
    /* con la mancuerna delante del pecho: un paso amplio a la izquierda (el pie algo girado hacia fuera), la cadera se va sobre
       ese pie y baja hacia atrás doblando esa rodilla, con la otra pierna estirada, y vuelve empujando al centro. Antes el paso
       era corto y la cadera se quedaba en medio: bajaba con las dos rodillas dobladas, como una sentadilla abierta */
    /* (de un tirón y sin paradas: mientras el pie sale, la cadera ya va hacia él y empieza a bajar; al posarse el pie sigue
       bajando hasta abajo, aguanta un momento y, al volver, la cadera empuja hacia el centro y el pie se despega cuando ya
       casi ha llegado. Antes daba el paso con el cuerpo en medio, se paraba con las piernas abiertas y luego bajaba) */
    const K = [
      [0, { xl: 24, ll: 0, tl: 10, rx: 0, ry: ROOT_Y, rz: 0, lean: 2 }], [.12, { xl: 72, ll: 9, tl: 14, rx: 8, ry: ROOT_Y - 6, rz: 0, lean: 4 }],
      [.28, { xl: 150, ll: 0, tl: 20, rx: 58, ry: ROOT_Y - 32, rz: -6, lean: 14 }], [.5, { xl: 150, ll: 0, tl: 20, rx: 118, ry: 128, rz: -16, lean: 30 }],
      [.6, { xl: 150, ll: 0, tl: 20, rx: 118, ry: 128, rz: -16, lean: 30 }], [.8, { xl: 150, ll: 0, tl: 20, rx: 46, ry: ROOT_Y - 24, rz: -4, lean: 12 }],
      [.9, { xl: 82, ll: 9, tl: 14, rx: 10, ry: ROOT_Y - 6, rz: 0, lean: 4 }], [1, { xl: 24, ll: 0, tl: 10, rx: 0, ry: ROOT_Y, rz: 0, lean: 2 }]];
    const tr = keyed(K);
    const at_ = t => {
      const k = tr(t), AL = [k.xl, LEN.ankle, 10], AR = [-24, LEN.ankle, 10];
      const root = capRoot([k.rx, k.ry, k.rz], [...(k.ll < .5 ? [[AL, k.rx + 20]] : []), [AR, k.rx - 20]]);
      const q0 = { root, tilt: k.lean * .8, spine: k.lean * .2, neck: -k.lean * .6, shrug: 0, feet: { L: [k.xl, 10, k.tl, max(0, k.ll)], R: [24, 10, 10] }, knee: { L: [.35, .1, 1], R: [-.1, 0, 1] } };
      const { F } = pose({ ...q0, hands: ZERO, elbow: {} }), c = at(F.thorax, [0, 58, 38]);
      return { ...q0, barC: c, hands: { L: add(c, [8, 2, 0]), R: add(c, [-8, 2, 0]) }, elbow: both(() => [.3, -1, .1]), fist: false, palm: both(() => [-1, .3, 0]) };
    };
    const gear = (q, F, cam) => GR.dumbbell(cam, add(q.barC, [0, -14, 0]), UP, null, { handle: 15 });
    return { view: 'front', up: 'a', rest: 'a', cam: [-20, 8], feetOff: true, one: true, at: at_, gear, beat: cycle(4600) };
  };

  Object.assign(F3.FAMILIES, { crunch, legRaise, deadBug, plank, sidePlank, birdDog, vacuum, kick, hyper, twist, wheelRoll, chop, pallof, calf, tib, hipOpen, stepUp, sissy, pistol, bandWalk, sideLunge });
  /* (para las pruebas: lo más bajo del cuerpo dibujado) */
  F3.clib = { keyed, capRoot, reachY, spl, lowOf, restOn, shift, legAt, legsOf, armTo, crossed, behindHead, prone, thFor, shAt, forearm, handFlat, HD, TOE_A, quad, quadHands, quadLeg, kneel, kneelRoot, KNEE_Y, supine, palmsDown, stepPath, toeAnkle, heelAnkle, footAtA, rotY, rotP, rotV, ball, medBall, barAx, plate10, step, postAt, hang, yz, miniBand };
})(window);
