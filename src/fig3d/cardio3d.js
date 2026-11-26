/* ═══ figuras 3D: cardio (lote 8) ═══
   Carrera (en la calle, en cinta, en cuesta, andando, con chaleco y con mochila), bicicleta (estática, de aire y de
   carretera), remo, SkiErg, comba (simple, doble y de boxeo), elíptica, escaladora, natación y saco de boxeo.
   Las mismas reglas que el resto: lo que se apoya toca el suelo o el material con el grosor del dibujo, sin hundirse ni
   flotar; lo que no se mueve no se mueve, y nada atraviesa el cuerpo ni el material. Lo que avanza (correr, andar, nadar)
   lo hace en el sitio, como en una cinta. Usa lo de brazos3d.js (F3.blib), core3d.js (F3.clib) y funcional3d.js (F3.flib).
   Define: Fig3D.FAMILIES.run, .bike, .rower, .skiErg, .jumpRope, .elliptical, .stairs, .swim, .boxing */
(function (G) {
  const F3 = G.Fig3D, L = F3.lib, GR = F3.gear, M = F3.mlib, B = F3.blib, C = F3.clib, FL = F3.flib;
  const { add, sub, mul, dot, cross, len, norm, perp, mix, ease, clamp, at, RAD, LEN } = L;
  const { has, pose, torso, ZERO, UP, sd, both, shoulder } = M;
  const { ROOT_Y, LU, LF, mj, keys, cycle } = B;
  const { spl, legs, qOf, gait, hipOver, keyAnim, qmix, reachClamp, withHands, bySh, legsFree, acrossFist, BASE } = FL;
  const { cos, sin, PI, abs, max, min, sqrt, atan2, pow } = Math;

  /* ════ correr y andar ════ */
  /* la zancada de carrera, en el sitio (como en una cinta), con las medidas de un trote de verdad: unas 160 zancadas por minuto
     y cada pie en el suelo algo menos de dos quintos de la vuelta (st), así que entre un apoyo y otro van los dos en el aire.
     El pie cae algo por delante de la cadera (zOn), con el medio del pie y la rodilla apenas doblada; va hacia atrás con el
     suelo (S: lo que recorre apoyado) mientras la cadera baja hasta media pisada (la rodilla, a unos 40°) y vuelve a subir;
     el talón se despega pasada la mitad y el pie sale por la punta muy por detrás, con la pierna casi estirada. En el aire, el
     pie sigue un momento hacia atrás y sube por detrás hacia el glúteo (la rodilla, a unos 95°: el talón, a la altura de la
     otra rodilla), el muslo tira hacia delante con la rodilla arriba y la pierna se estira por delante; antes de caer, el pie
     vuelve un poco hacia atrás, a la velocidad del suelo, para no frenar. Las alturas del tobillo y su recorrido en el aire
     salen de los ángulos de cadera y rodilla de una carrera suave (de la pierna de 89 + 84 del modelo); hk escala lo que sube
     el talón. slope: la pendiente del suelo (tan), que sube hacia delante; y0: la altura del suelo en z = 0 */
  const RUN_SWING = {
    /* (en el aire, v de 0 a 1: el recorrido, en partes del de apoyo (0: donde despega; 1: donde cae); la altura del tobillo
       sobre el suelo, y la inclinación del pie: la punta hacia abajo con el talón arriba, y plano al caer) */
    f: [[.15, -.17], [.3, -.065], [.45, .2], [.6, .555], [.75, 1.02], [.9, 1.09]],
    h: [[.15, 62], [.3, 92], [.45, 86], [.6, 55], [.75, 33], [.9, 23.5]],
    p: [[0, 42], [.15, 66], [.3, 82], [.45, 74], [.6, 46], [.75, 16], [.9, -2], [1, 0]]
  };
  /* (curva de Hermite que pasa por los puntos K ([v, valor]), con la pendiente de Catmull-Rom dentro y las de los extremos que
     se den: así el pie sale y llega a la velocidad que lleva) */
  const hermPts = (v, K, m0, m1) => {
    let i = 1; while (i < K.length - 1 && K[i][0] < v) i++;
    const sl = j => j == 0 ? m0 : j == K.length - 1 ? m1 : (K[j + 1][1] - K[j - 1][1]) / (K[j + 1][0] - K[j - 1][0]);
    const [x0, a] = K[i - 1], [x1, b] = K[i], h = x1 - x0;
    return FL.herm((v - x0) / h, a, b, sl(i - 1) * h, sl(i) * h);
  };
  const runGait = (t, o = {}) => {
    const S = o.S ?? 120, zOn = o.zOn ?? 32, w = o.w ?? 10, toe = o.toe ?? 4, st = o.st ?? .38, hk = o.hk ?? 1, slope = o.slope ?? 0, y0 = o.y0 ?? 0;
    const P_OFF = 42, feet = {}, knee = {}, ank = {}, on = {};
    for (const [s, ph] of [['L', 0], ['R', .5]]) {
      const u = ((t + ph) % 1 + 1) % 1, x = s == 'L' ? w : -w;
      let A, p;
      if (u < st) {
        /* (apoyado: el medio del pie, plano; pasada la mitad, el talón se levanta y el pie gira sobre la bola hasta despegar) */
        const v = u / st;
        p = v < .55 ? 0 : P_OFF * ((v - .55) / .45) ** 1.4;
        A = FL.footPose(x, zOn - S * v, p); on[s] = true;
      }
      else {
        const v = (u - st) / (1 - st), A0 = FL.footPose(x, zOn - S, P_OFF), dz = zOn - A0[2], m = -S * (1 - st) / st;
        const z = hermPts(v, [[0, A0[2]], ...RUN_SWING.f.map(([k, f]) => [k, A0[2] + dz * f]), [1, zOn]], m, m);
        const H = [[0, A0[1]], ...RUN_SWING.h.map(([k, y]) => [k, LEN.ankle + (y - LEN.ankle) * hk]), [1, LEN.ankle]];
        p = spl(v, RUN_SWING.p);
        A = [x, hermPts(v, H, (H[1][1] - H[0][1]) / H[1][0], (H[H.length - 1][1] - H[H.length - 2][1]) / (1 - H[H.length - 2][0])), z];
        on[s] = false;
      }
      /* (el tobillo, sobre el suelo, que puede ir en cuesta) */
      const yF = y0 + A[2] * slope;
      feet[s] = [abs(x), A[2], toe, yF + A[1] - LEN.ankle, p]; knee[s] = [sin(RAD(toe)), 0, cos(RAD(toe))];
      ank[s] = [x, yF + A[1], A[2]];
    }
    return { feet, knee, ank, on };
  };
  /* la altura de la cadera al correr, en cada paso (ph: de 0, cuando cae un pie, a 1, cuando cae el otro): baja desde que cae
     hasta media pisada, sube hasta que despega y algo más en el vuelo, y baja otra vez hasta caer. Sin estirar nunca del todo
     la pierna que apoya (capRoot) */
  const runHip = (ph, st, base) => {
    const lo = .4 * st / .5, off = st / .5, fly = (off + 1) / 2;
    return base + spl(ph, [[fly - 1, 5], [0, 2], [lo, -4], [off, 1.5], [fly, 5], [1, 2], [1 + lo, -4]]);
  };
  /* los brazos al correr: el hombro lleva el brazo adelante y atrás, al revés que la pierna de su lado, con el codo doblado:
     más cerrado delante, donde la mano sube hasta la altura del pecho y algo hacia el centro (sin cruzarlo), y más abierto
     detrás, donde la mano baja junto a la cadera. Todo en el marco del tronco, que se inclina y gira al revés que la cadera:
     los brazos van con él. La muñeca, recta, en la línea del antebrazo, y las manos sueltas, a medio cerrar */
  const runArms = (F, q, t, amp = 1) => {
    const o = { hands: {}, elbow: {}, handDir: {} }, T = F.thorax, loc = v => add(add(mul(T.x, v[0]), mul(T.y, v[1])), mul(T.z, v[2]));
    const LU = LEN.upper, LFG = LEN.fore + LEN.grip, ABD = RAD(10);
    for (const [s, ph] of [['L', .42], ['R', .92]]) {
      /* (a: 1 con el brazo delante, -1 detrás; el izquierdo llega delante cuando la pierna izquierda despega por detrás) */
      const a = cos(2 * PI * (t - ph)), fw = max(0, a);
      const th = RAD(-11 + 19 * a * amp), el = RAD(81 - 23 * a), inw = RAD(6 + 22 * fw), be = th + PI - el;
      /* (el brazo, algo separado del costado; el antebrazo, girado hacia delante lo que se dobla el codo) */
      const u = [sin(ABD), -cos(ABD) * cos(th), cos(ABD) * sin(th)], f = [-sin(inw), -cos(inw) * cos(be), cos(inw) * sin(be)];
      const hand = add(mul(u, LU), mul(f, LFG));
      o.hands[s] = add(shoulder(F, s, q), loc(sd(s, hand)));
      o.handDir[s] = loc(sd(s, f));
      o.elbow[s] = [.35, -.3, -1];
    }
    return { ...o, fist: false, palm: both(() => [-1, 0, .2]) };
  };
  /* andando: los brazos sueltos, casi estirados, al revés que las piernas */
  const walkArms = (F, q, t, amp = 1) => {
    const o = { hands: {}, elbow: {} };
    for (const [s, ph] of [['L', .5], ['R', 0]]) { const a = cos(2 * PI * (t + ph - .05)); o.hands[s] = add(shoulder(F, s, q), sd(s, [9 + 5 * max(0, -a), -138 + 8 * max(0, a) * amp, 10 + 34 * a * amp])); o.elbow[s] = [.2, 0, -1]; }
    return { ...o, fist: false, palm: both(() => [-1, 0, 0]), handDir: both(() => [0, -1, .1]) };
  };
  /* la cinta: la base con la banda (de z = -130 a 70), los dos postes delante y la consola con los pasamanos. inc: lo que
     se inclina (tan), subiendo hacia delante */
  const TM_Y = 13, TM_C = ['#1d2030', '#5d6482'], TM_BELT = ['#11131c', '#3a3f56'];
  const treadmill = (cam, inc = 0) => {
    const a = Math.atan(inc), up = [0, cos(a), -sin(a)], fw = [0, sin(a), cos(a)], c = [0, TM_Y / 2 + 4 + (-30) * inc, -30], out = [];
    out.push(...GR.under([GR.obox(cam, add(c, mul(up, -3)), [[1, 0, 0], up], [44, TM_Y / 2 + 1, 104], TM_C), GR.obox(cam, add(c, mul(up, TM_Y / 2 - 1)), [[1, 0, 0], up], [34, 1.2, 100], TM_BELT)], 0));
    /* (los postes salen de delante de la base; arriba, la consola y los pasamanos hacia atrás, a los lados) */
    const fr = add(c, add(mul(fw, 100), mul(up, TM_Y / 2))), top = [0, fr[1] + 236, fr[2] + 18];
    for (const k of [-1, 1]) {
      out.push(...GR.tube(cam, add(fr, [k * 48, 0, 0]), [k * 52, top[1], top[2]], 5, GR.C.frame, 6));
      /* (los pasamanos, por fuera de por donde van los brazos) */
      out.push(...GR.tube(cam, [k * 52, top[1] - 30, top[2]], [k * 74, top[1] - 34, top[2] - 70], 4, GR.C.frame, 3));
    }
    out.push(GR.obox(cam, add(top, [0, 8, 4]), [[1, 0, 0], norm([0, 1, -.5])], [48, 12, 4], TM_C));
    return out;
  };
  const run = f => {
    const w = x => has(f, x), walk = w('walk'), tm = w('treadmill'), incline = w('incline'), pack = w('pack'), vest = w('vest');
    /* la pendiente: en la cinta, 7° (12 %); en la calle, una cuesta de 9° */
    const slope = incline ? Math.tan(RAD(tm ? 7 : 9)) : 0, y0 = tm ? TM_Y + 2 : 0;
    /* (andando, una vuelta de 1,35 s (con mochila, 1,5 s); corriendo, de 0,74 s: unas 162 zancadas por minuto) */
    const T = walk ? (pack ? 1500 : 1350) : 740;
    /* (corriendo en cuesta: la zancada, algo más corta, y el pie cae más bajo la cadera; el talón sube algo menos) */
    const RS = incline ? { S: 100, zOn: 26, st: .4, hk: .92 } : { S: 120, zOn: 32, st: .38, hk: 1 };
    const at_ = t => {
      const ph = 2 * PI * t;
      let g, ry;
      if (walk) {
        const g0 = gait(t, { S: pack ? 92 : 104, w: 18, toe: 5, lift: incline ? 16 : 11, z0: 0 });
        /* (andando en cuesta, cada pie apoya a su altura) */
        g = { ...g0, feet: { L: [...g0.feet.L], R: [...g0.feet.R] }, ank: { L: [...g0.ank.L], R: [...g0.ank.R] } };
        for (const s of ['L', 'R']) { const dy = y0 + g.ank[s][2] * slope; g.feet[s][3] += dy; g.ank[s][1] += dy; }
        ry = hipOver(g.ank, ROOT_Y + y0 - 1);
      }
      else {
        g = runGait(t, { ...RS, slope, y0 });
        /* (la cadera: la de cada paso (runHip), más baja a media pisada y más alta en el vuelo; sin estirar nunca del todo la
           pierna que apoya) */
        const top = runHip(((t % .5) + .5) % .5 / .5, RS.st, ROOT_Y + y0 - 4);
        /* (con las dos piernas, también la que va en el aire: si solo contara la que apoya, al despegar dejaba de contar de
           golpe y la cadera daba un saltito) */
        ry = C.capRoot([0, top, 0], [[g.ank.L, 20], [g.ank.R, -20]])[1];
      }
      /* (el tronco, algo adelante; más en cuesta y con mochila; gira un poco con cada zancada) */
      const lean = (walk ? 2 : 6) + (incline ? 6 : 0) + (pack ? 6 : 0);
      /* (la cadera gira con la pierna que va delante y los hombros, al revés, con el brazo; corriendo, la pelvis va algo hacia
         el pie que apoya y cae un poco del lado de la pierna en el aire; la cabeza, quieta y mirando al frente) */
      const c = cos(ph), q = walk ? { tt: t, feet: g.feet, knee: g.knee, root: [1.5 * sin(ph), ry, 0], tilt: lean, spine: 0, neck: -lean * .6, shrug: 2, reach: 2, yaw: -3 * c, twist: 7 * c, roll: 1.5 * sin(ph) }
        : { tt: t, feet: g.feet, knee: g.knee, root: [2.2 * sin(ph), ry, 0], tilt: lean, spine: 2, neck: -lean * .75, shrug: 1, reach: 2, yaw: -6 * cos(ph + .3), twist: 11 * cos(ph + .3), roll: 2.5 * sin(ph) };
      const { F } = pose({ ...q, hands: ZERO, elbow: {} });
      return { ...q, ...(walk ? walkArms(F, q, t, pack ? .6 : 1) : runArms(F, q, t)) };
    };
    /* (lo que corre el suelo, o la banda de la cinta, en una vuelta: lo que recorre el pie de apoyo) */
    const V = walk ? (pack ? 92 : 104) / .62 : RS.S / RS.st;
    const gear = (q, F, cam) => {
      const out = [];
      if (tm) out.push(...treadmill(cam, slope), ...FL.floorRun(cam, q.tt, V, { z0: -30, half: 96, x: 30, y0: TM_Y + 4.4, slope, z: -1e6 + 1, n: max(2, Math.round(V / 48)) }));
      else {
        if (incline) out.push(...GR.under([GR.obox(cam, [0, -2, 0], [[1, 0, 0], norm([0, 1, -slope])], [60, 2, 150], ['#1b1e2b', '#3f4560'])], 0));
        out.push(...FL.floorRun(cam, q.tt, V, { slope, y0: .5, z: -1e6 + 1, half: 160, x: 56 }));
      }
      if (pack) out.push(...wornPack(cam, F));
      if (vest) out.push(...weightVest(cam, F));
      return out;
    };
    return { view: 'front', up: 'a', rest: 'a', cam: [-68, 6], side: [-90, 4], feetOff: true, one: true, at: at_, gear, beat: cycle(T) };
  };
  /* la mochila a la espalda (la de la cargada de mochila, con las hombreras sobre los hombros) */
  const wornPack = (cam, F) => {
    const c = at(F.thorax, [0, 52, -50]), up = F.thorax.y, out = FL.packGear(cam, c, up, false, mul(F.thorax.x, -1));
    for (const k of [-1, 1]) {
      /* (de arriba de la mochila, por encima del hombro, por delante del pecho y, bajo el brazo, por fuera del costado, a su
         esquina de abajo) */
      const pts = [[k * 16, 92, -34], [k * 24, 103, 2], [k * 30, 70, 27], [k * 38, 42, 10], [k * 30, 12, -36]].map(v => at(F.thorax, v));
      out.push(...GR.strap(cam, pts, 4.5, ['#262a38', '#5a6280']));
    }
    return out;
  };
  /* el chaleco lastrado: un panel delante y otro detrás del pecho, unidos por los hombros */
  const VEST_C = ['#262a38', '#5d6482'];
  const weightVest = (cam, F) => {
    const T = F.thorax, out = [];
    out.push(GR.obox(cam, at(T, [0, 62, 31]), [T.x, T.y], [28, 26, 3.5], VEST_C), GR.obox(cam, at(T, [0, 64, -27]), [T.x, T.y], [28, 28, 3.5], VEST_C));
    for (const k of [-1, 1]) out.push(...GR.strap(cam, [at(T, [k * 20, 88, 30]), at(T, [k * 22, 100, 4]), at(T, [k * 20, 92, -26])], 5, VEST_C));
    return out;
  };

  /* ════ bicicleta ════ */
  /* el pedaleo: las bielas (de 38, unos 17 cm) giran alrededor del eje de pedalier BB; th, el ángulo de la izquierda (0:
     arriba; 90: delante). Los pedales, a 22 del centro (algo más que las caderas); la bola del pie sobre el pedal, con el
     talón más bajo al empujar delante y la punta más caída al subir por detrás */
  const CRANK = 38, PED_X = 22;
  const pedal = (BB, s, th) => { const a = RAD(th + (s == 'L' ? 0 : 180)); return add(BB, [s == 'L' ? PED_X : -PED_X, CRANK * cos(a), CRANK * sin(a)]); };
  const pedalFeet = (BB, th) => {
    const feet = {}, knee = {};
    for (const s of ['L', 'R']) {
      const P = pedal(BB, s, th), a = RAD(th + (s == 'L' ? 0 : 180)), p = 16 - 10 * sin(a - RAD(20));
      const A = C.toeAnkle(add(P, [0, 4.5, 0]), p);
      feet[s] = [abs(A[0]), A[2], 3, A[1] - LEN.ankle, p]; knee[s] = [0, .25, 1];
    }
    return { feet, knee };
  };
  const BIKE_C = ['#2a2f42', '#6a7190'], DARK = ['#3a3f56', '#0a0b10'];
  const ringOf = (cam, c, R, w, col) => { const pts = []; for (let i = 0; i <= 32; i++) { const t = i / 32 * 2 * PI; pts.push(cam.P(add(c, [0, R * cos(t), R * sin(t)]))); } const d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L'); return { z: cam.P(c)[2], svg: `<path d="${d}" fill="none" stroke="${col[1]}" stroke-width="${w + 2}"/><path d="${d}" fill="none" stroke="${col[0]}" stroke-width="${w}"/>` }; };
  /* la bici estática: la base en el suelo, el tubo del sillín, la columna del manillar, el volante de inercia delante y el
     manillar recto con los cuernos; la de aire: el ventilador delante, con sus aspas, y las palancas, que pivotan abajo y
     van y vienen con los pedales; la de carretera: cuadro, ruedas (cuyos radios giran), plato y manillar de carretera */
  const bikeGear = (cam, kind, BB, th, q, saddle, hand) => {
    const out = [], air = kind == 'air', T = (a, b, r, col = GR.C.frame, cap = 4) => out.push(...GR.tube(cam, a, b, r, col, cap));
    for (const s of ['L', 'R']) { const P = pedal(BB, s, th), k = s == 'L' ? 1 : -1, arm = add(P, [-k * (PED_X - 11), 0, 0]); T(add(BB, [k * 11, 0, 0]), arm, 2.2, DARK, 1); T(arm, add(P, [-k * 5, 0, 0]), 1.2, DARK, 1); out.push(GR.obox(cam, P, [[1, 0, 0], UP], [5, 1.5, 8], DARK)); }
    if (kind == 'road') {
      const RW = 75, rear = [0, RW + 2, BB[2] - 92], front = [0, RW + 2, BB[2] + 133], seat = add(BB, mul(sub(saddle, BB), .78));
      const bar = mix(hand.L, hand.R, .5), stem = add(bar, [0, -6, -22]), ht = add(stem, [0, -12, -4]), hb = add(ht, [0, -34, 9]);
      T(BB, seat, 3.2, BIKE_C); T(seat, ht, 3, BIKE_C); T(BB, hb, 3.8, BIKE_C); T(ht, hb, 3.8, BIKE_C); T(BB, rear, 2.2, BIKE_C); T(seat, rear, 2, BIKE_C); T(hb, front, 2.6, BIKE_C);
      T(seat, add(saddle, [0, -3, 0]), 1.8, DARK); T(ht, stem, 2.4, BIKE_C, 1);
      /* el manillar: la barra recta, las curvas hacia delante y abajo y las manetas, donde van las manos */
      for (const s of ['L', 'R']) { const h = hand[s], k = s == 'L' ? 1 : -1, b0 = [k * 22, bar[1] - 4, bar[2] - 16]; T([0, b0[1], b0[2]], b0, 2, DARK, 1); T(b0, add(h, [-k * 1, -4, -2]), 2, DARK, 1); T(add(h, [-k * 1, -4, -2]), add(h, [-k * 1, -30, -8]), 2, DARK, 1); T(add(h, [-k * 1, -30, -8]), add(b0, [0, -36, 6]), 2, DARK, 1); }
      out.push(GR.obox(cam, saddle, [[1, 0, 0], UP], [5, 2.5, 13], ['#1b1e2b', '#4d5370']));
      out.push(ringOf(cam, add(BB, [-8, 0, 0]), 23, 2, ['#3a3f56', '#6a7190']));
      for (const c of [rear, front]) { out.push(ringOf(cam, c, RW, 4, ['#14161f', '#4a5068']), ringOf(cam, c, RW - 5, 1.6, ['#2b2f43', '#2b2f43'])); for (let i = 0; i < 9; i++) { const a = RAD(th * 2.2 + i * 40); T(c, add(c, [0, (RW - 5) * cos(a), (RW - 5) * sin(a)]), .6, ['#6a7190', '#2b2f43'], 1); } }
      return out;
    }
    /* la base: dos pies en el suelo y la viga que los une; el tubo del sillín, que baja hasta el pedalier; la columna
       delantera, del pie de delante al manillar */
    const zr = -82, zf = air ? 150 : 112, low = [0, 9, 0], seat = add(BB, mul(sub(saddle, BB), .62));
    out.push(GR.obox(cam, [0, 3, zr], [[1, 0, 0], UP], [36, 3, 6], GR.C.frame), GR.obox(cam, [0, 3, zf], [[1, 0, 0], UP], [36, 3, 6], GR.C.frame));
    T(add(low, [0, 0, zr]), add(low, [0, 0, zf]), 4.5); T(add(low, [0, 0, zr + 10]), BB, 4.5); T(BB, seat, 4.5); T(seat, add(saddle, [0, -3, 0]), 3.2, DARK);
    out.push(GR.obox(cam, saddle, [[1, 0, 0], UP], [9, 3, 14], GR.C.pad));
    const bar = mix(hand.L, hand.R, .5);
    if (air) {
      /* el ventilador, con su rejilla y las aspas que giran; las palancas, de su pivote (abajo y fuera) a las manos */
      const fan = [0, 104, BB[2] + 122];
      out.push(GR.disc(cam, fan, [1, 0, 0], 62, 24, 'wheel'));
      for (let i = 0; i < 8; i++) { const a = RAD(th * 1.6 + i * 45); T(add(fan, [13, 0, 0]), add(fan, [13, 56 * cos(a), 56 * sin(a)]), 1.6, ['#6a7190', '#2b2f43'], 1); }
      T(add(low, [0, 0, zf - 10]), add(fan, [0, -40, 0]), 4.5); T(BB, add(fan, [0, -30, -40]), 4.5);
      for (const s of ['L', 'R']) { const h = hand[s], k = s == 'L' ? 1 : -1, piv = [k * 48, 74, BB[2] + 70]; T([k * 13, 74, piv[2]], piv, 3); T(piv, add(h, [0, -10, 0]), 3.6); T(add(h, [0, 10, 0]), add(h, [0, -12, 0]), 3.4, DARK, 1); }
    }
    else {
      /* el volante de inercia, con su eje; la columna; la potencia y el manillar recto con los cuernos */
      const fly = [0, 78, BB[2] + 74], top = add(bar, [0, -18, -16]);
      out.push(GR.disc(cam, fly, [1, 0, 0], 42, 10, 'wheel'));
      T(add(low, [0, 0, zf - 12]), add(fly, [0, 0, 18]), 4.5); T(add(fly, [0, 0, 18]), top, 4.5); T(BB, add(fly, [0, -10, -20]), 4); T(top, bar, 3.2);
      for (const s of ['L', 'R']) { const h = hand[s], k = s == 'L' ? 1 : -1; T([0, bar[1], bar[2]], add(h, [k * 9, 0, 0]), 2.6, DARK, 1); T(add(h, [k * 9, 0, 0]), add(h, [k * 9, 12, 26]), 2.6, DARK, 1); }
    }
    return out;
  };
  const bike = f => {
    const w = x => has(f, x), air = w('air'), road = w('road'), kind = road ? 'road' : air ? 'air' : 'bike';
    /* (el pedalier; la cadera, encima y detrás, a la altura con la que la rodilla queda algo doblada abajo; el tronco, más
       tumbado en la de carretera y más erguido en la de aire) */
    const BB = [0, road ? 61 : 64, 0], H0 = add(BB, road ? [0, 152, -52] : air ? [0, 154, -50] : [0, 155, -46]);
    const saddle = add(H0, [0, -13, -2]), tilt = road ? 50 : air ? 22 : 38, T = road ? 1100 : air ? 950 : 1000;
    const qb = th => { const g = pedalFeet(BB, th); return { root: H0, tilt, spine: road ? 8 : 5, neck: -tilt * .75, shrug: 3, reach: road ? 12 : 8, twist: 2 * sin(RAD(th)), roll: 1.2 * sin(RAD(th)), feet: g.feet, knee: g.knee }; };
    /* las manos: donde caen desde los hombros (en reposo) con los codos algo doblados: en las manetas de la de carretera, en
       la barra recta de la estática y en las palancas de la de aire, que van y vienen al revés que el pedal de su lado */
    const J0 = pose({ ...qb(90), twist: 0, roll: 0, hands: ZERO, elbow: {} }).J, rel = road ? [-6, -104, 84] : air ? [6, -84, 76] : [-8, -96, 80];
    const hand = { L: add(J0.L.sh, sd('L', rel)), R: add(J0.R.sh, sd('R', rel)) };
    const at = t => {
      const th = 360 * t, q = { ...qb(th), th, elbow: both(() => [.55, -.5, -.6]) };
      if (!air) return { ...q, hands: hand, barDir: [1, 0, 0] };
      const swing = s => -24 * sin(RAD(th + (s == 'L' ? 0 : 180))), hands = { L: add(hand.L, [0, 0, swing('L')]), R: add(hand.R, [0, 0, swing('R')]) };
      const { J } = pose({ ...q, hands, barDir: both(() => [0, 1, 0]) });
      return { ...q, hands, barDir: { L: mul(acrossFist(J, 'L', [0, 1, 0]), -1), R: acrossFist(J, 'R', [0, 1, 0]) } };
    };
    const gear = (q, F, cam) => bikeGear(cam, kind, BB, q.th ?? 0, q, saddle, air ? q.hands : hand);
    return { view: 'front', up: 'a', rest: 'a', cam: [-68, 8], side: [-90, 4], feetOff: true, one: true, at, gear, beat: cycle(T) };
  };

  /* ════ remo (ergómetro) ════ */
  /* el remo de aire: el raíl con el asiento que corre por él, los reposapiés inclinados con su cinta, la jaula del volante
     delante, la cadena que sale de ella hasta el asa y el monitor en su brazo. La bola del pie queda fija bajo la cinta: el
     talón se despega en el enganche y se apoya entero al final */
  const RW_BALL = 50, RW_SEAT = 80, RW_HIP = RW_SEAT + 16, RW_E = [0, 104, 68], RW_DIR = norm([0, .2, -1]), RW_FX = 16;
  const rowerGear = (cam, q) => {
    const out = [], T = (a, b, r, col = GR.C.frame, cap = 4) => out.push(...GR.tube(cam, a, b, r, col, cap));
    /* el raíl y sus pies; la jaula del volante, la cadena, el asa y el monitor */
    /* (el raíl acaba antes de los pies: de su punta baja el bastidor delantero, que lleva los reposapiés, hasta el pie de
       delante y sube a la jaula) */
    out.push(GR.obox(cam, [0, 66, -178], [[1, 0, 0], UP], [7, 5, 136], GR.C.frame), GR.obox(cam, [0, 3, 96], [[1, 0, 0], UP], [36, 3, 7], GR.C.frame), GR.obox(cam, [0, 3, -300], [[1, 0, 0], UP], [30, 3, 7], GR.C.frame));
    T([0, 61, -296], [0, 6, -300], 4.5); T([0, 64, -44], [0, 26, 14], 6); T([0, 26, 14], [0, 6, 92], 5); T([0, 26, 14], [0, 80, 74], 5);
    out.push(GR.disc(cam, [0, 104, 112], [1, 0, 0], 46, 30, 'wheel'));
    T([0, 146, 96], [0, 212, 70], 2.6); out.push(GR.obox(cam, [0, 222, 66], [[1, 0, 0], norm([0, .94, .34])], [15, 11, 2.5], ['#1b1e2b', '#4d5370']));
    out.push(GR.obox(cam, add(q.seatAt, [0, -4, 0]), [[1, 0, 0], UP], [16, 4, 15], GR.C.pad));
    const h = q.handle; T(RW_E, h, 1, DARK, 1); T(add(h, [-56, 0, 0]), add(h, [56, 0, 0]), 2.4, DARK, 2);
    for (const k of [-1, 1]) T(add(h, [k * 30, 0, 0]), add(h, [k * 54, 0, 0]), 3.4, ['#2b2f43', '#0a0b10'], 2);
    /* los reposapiés: una tabla inclinada bajo cada pie, con la cinta sobre la bola */
    const n = [0, cos(RAD(42)), -sin(RAD(42))], u = [0, sin(RAD(42)), cos(RAD(42))];
    for (const k of [-1, 1]) {
      const b = [k * RW_FX, RW_BALL, 0];
      out.push(GR.obox(cam, add(b, add(mul(n, -7), mul(u, -16))), [[1, 0, 0], n], [10, 1.6, 23], GR.C.frame));
      out.push(GR.obox(cam, add(b, add(mul(n, 8), mul(u, -3))), [[1, 0, 0], n], [10.5, 1.2, 3.5], ['#1b1e2b', '#4d5370']));
    }
    T([-26, 30, -10], [26, 30, -10], 3.5);
    return out;
  };
  const rower = f => {
    /* la palada (1:2): piernas con los brazos estirados, luego el tronco hacia atrás y por fin los brazos; a la vuelta, al
       revés: brazos, tronco y piernas. l: las piernas (0, recogidas; 1, estiradas); b: el tronco (0, adelante; 1, atrás); a: los
       brazos (0, estirados; 1, el asa en la boca del estómago) */
    const ph = (t, a, d) => ease(clamp((t - a) / d, 0, 1));
    const l = t => t < .36 ? ph(t, 0, .24) : 1 - ph(t, .56, .42), b = t => t < .36 ? ph(t, .12, .2) : 1 - ph(t, .42, .18), a = t => t < .36 ? ph(t, .22, .14) : 1 - ph(t, .36, .12);
    const body = t => {
      const L_ = l(t), p = -24 - 18 * L_, feet = {}, knee = {};
      for (const s of ['L', 'R']) { const A = C.toeAnkle([s == 'L' ? RW_FX : -RW_FX, RW_BALL, 0], p); feet[s] = [abs(A[0]), A[2], 3, A[1] - LEN.ankle, p]; knee[s] = [0, .3, 1]; }
      const tilt = mix(32, -18, b(t)), hz = mix(-102, -196, L_);
      return { root: [0, RW_HIP, hz], tilt, spine: 4 - 4 * b(t), neck: -.7 * tilt, shrug: 2, reach: 6, feet, knee, seatAt: [0, RW_SEAT, hz - 5] };
    };
    /* el asa, sobre la línea de la cadena: con los brazos estirados, a su largo desde los hombros; con ellos recogidos, delante
       de la boca del estómago */
    const onChain = (S, R) => { const w = sub(RW_E, S), bq = dot(w, RW_DIR), c = dot(w, w) - R * R, d = bq * bq - c; return d > 0 ? -bq - sqrt(d) : -bq; };
    const atT = t => {
      const q0 = body(t), { F, J } = pose({ ...q0, hands: ZERO, elbow: {} }), S = mix(J.L.sh, J.R.sh, .5);
      const d0 = onChain(S, 136), rib = at(F.thorax, [0, 14, 30]), d1 = dot(sub(rib, RW_E), RW_DIR) - 8;
      const handle = add(RW_E, mul(RW_DIR, mix(d0, d1, a(t))));
      return { ...q0, handle, hands: { L: add(handle, [42, 0, 0]), R: add(handle, [-42, 0, 0]) }, elbow: both(() => [.5, -.05, -1]), barDir: [1, 0, 0] };
    };
    return { view: 'side', up: 'a', rest: 'a', cam: [-80, 10], side: [-90, 6], feetOff: true, one: true, at: atT, gear: (q, F, cam) => rowerGear(cam, q), beat: cycle(2800) };
  };

  /* ════ SkiErg ════ */
  /* la torre delante, con el volante arriba y las dos poleas por donde salen las cuerdas hasta las asas; la base en el suelo.
     La palada: los brazos bajan casi estirados por delante del cuerpo, separados de él, mientras la cadera se dobla y las
     rodillas se flexionan un poco, hasta que las asas pasan junto a los muslos; a la vuelta, los brazos suben delante y el
     cuerpo se estira. Todo seguido: los extremos de la palada son los únicos sitios donde el movimiento se para */
  const SKI_Z = 166;
  /* (de 0 a 1 y vuelta, en una onda suave: la bajada dura dt de la vuelta entera) */
  const stroke = (t, dt) => { const x = ((t % 1) + 1) % 1, w = x < dt ? x / dt * .5 : .5 + (x - dt) / (1 - dt) * .5; return (1 - cos(2 * PI * w)) / 2; };
  const skiGear = (cam, q) => {
    const out = [], T = (a, b, r, col = GR.C.frame, cap = 4) => out.push(...GR.tube(cam, a, b, r, col, cap));
    out.push(GR.obox(cam, [0, 3, SKI_Z + 30], [[1, 0, 0], UP], [42, 3, 36], GR.C.frame), GR.obox(cam, [0, 238, SKI_Z + 16], [[1, 0, 0], UP], [12, 232, 10], GR.C.frame));
    out.push(GR.disc(cam, [0, 446, SKI_Z + 40], [1, 0, 0], 38, 32, 'wheel'), GR.obox(cam, [0, 482, SKI_Z + 6], [[1, 0, 0], norm([0, .9, -.44])], [14, 10, 2.5], ['#1b1e2b', '#4d5370']));
    for (const s of ['L', 'R']) {
      /* (el asa va a lo largo del puño; la cuerda sale de su punta de arriba) */
      const k = s == 'L' ? 1 : -1, ex = [k * 14, 456, SKI_Z + 4], h = q.hands[s], g0 = q.grip[s], d = dot(g0, sub(ex, h)) < 0 ? mul(g0, -1) : g0;
      out.push(GR.obox(cam, ex, [[1, 0, 0], UP], [5, 5, 5], DARK));
      T(ex, add(h, mul(d, 10)), .9, DARK, 1);
      out.push(...GR.tube(cam, add(h, mul(d, 10)), add(h, mul(d, -8)), 3.2, ['#2b2f43', '#0a0b10'], 2).map(i => ({ ...i, hand: s })));
    }
    return out;
  };
  const skiErg = f => {
    const dt = .42;
    const atT = t => {
      /* a: los brazos (delante en las dos direcciones); h: la cadera, algo después; k: las rodillas, después aún */
      const a = stroke(t, dt), h = stroke(t - .04, dt), k = stroke(t - .07, dt), tilt = 4 + 38 * h;
      const q = qOf(legs({ w: 18, toe: 8, ps: 3 + 11 * k, pt: 85 - 23 * k }, { tilt, spine: 10 * h, neck: -.55 * tilt, shrug: 6 - 6 * a, reach: 8 - 4 * a }));
      const { J } = pose({ ...q, hands: ZERO, elbow: {} });
      /* la mano, desde el hombro: arriba y algo delante, por delante del pecho con el codo doblado y abajo, junto al muslo */
      const hand = s => { const S = J[s].sh, R = 132 - 42 * sin(PI * a), th = RAD(21 + 169 * a); return [s == 'L' ? 26 : -26, S[1] + R * cos(th), S[2] + R * sin(th)]; };
      const hands = { L: hand('L'), R: hand('R') }, cord = s => norm(sub([s == 'L' ? 14 : -14, 456, SKI_Z + 4], hands[s]));
      const J2 = pose({ ...q, hands, elbow: both(() => [.7, 0, -.5]), barDir: both(() => [0, 1, 0]) }).J;
      const grip = { L: acrossFist(J2, 'L', cord('L')), R: acrossFist(J2, 'R', cord('R')) };
      return { ...q, hands, grip, elbow: both(() => [.7, 0, -.5]), barDir: { L: mul(grip.L, -1), R: grip.R } };
    };
    return { view: 'side', up: 'a', rest: 'a', cam: [-62, 8], side: [-90, 4], at: atT, gear: (q, F, cam) => skiGear(cam, q), beat: cycle(2800) };
  };

  /* ════ comba ════ */
  /* los saltos: sobre la parte delantera de los pies (los talones no bajan), con un rebote corto de tobillos y rodillas al
     tocar el suelo y el vuelo justo para que pase la cuerda. La cuerda gira alrededor de la línea de las manos (que hacen
     círculos pequeños con las muñecas, los codos junto al cuerpo): en un salto simple pasa bajo los pies en lo más alto; en
     los double unders, dos vueltas por salto, a media subida y a media bajada; en el de boxeo, un pie y luego el otro, con un
     saltito en cada uno */
  const ROPE_C = ['#c9cfe6', '#2b2f43'];
  const ropeGear = (cam, q, F) => {
    const out = [], T = (a, b, r, col, cap = 1) => out.push(...GR.tube(cam, a, b, r, col, cap)), tip = {};
    for (const s of ['L', 'R']) { const h = q.hands[s], d = q.hd[s]; T(add(h, mul(d, -4)), add(h, mul(d, 12)), 2.6, ['#a33a3a', '#3a0f12'], 2); tip[s] = add(h, mul(d, 13)); }
    /* la cuerda, en el plano que forma con la línea de las manos y la dirección del ángulo φ (0: abajo; 90: detrás; 180: arriba):
       se abre hacia fuera al salir de las manos (pasa por fuera de los hombros y de las piernas), roza el suelo abajo y pasa
       por encima de la cabeza arriba */
    /* (arriba, siempre un palmo por encima de la cabeza, también en lo más alto del salto) */
    const A = tip.L, B = tip.R, c = mix(A, B, .5), ph = RAD(q.phi), d = [0, -cos(ph), -sin(ph)], top = max(405, at(F.head, [0, 30, 0])[1] + 26), Rd = c[1] - 2, Ru = top - c[1], R = (Rd + Ru) / 2 - (Ru - Rd) / 2 * cos(ph);
    let prev = A;
    for (let i = 1; i <= 26; i++) {
      const u = i / 26, x = c[0] + (A[0] - c[0]) * cos(PI * u) + 110 * sin(PI * u) * cos(PI * u), r = R * pow(sin(PI * u), 1.3);
      const pt = add([x, c[1], c[2]], mul(d, r)), P = [pt[0], max(1.2, pt[1]), pt[2]];
      T(prev, P, 1, ROPE_C); prev = P;
    }
    return out;
  };
  const jumpRope = f => {
    const dbl = has(f, 'double'), alt = has(f, 'alt');
    /* tc: la parte de la vuelta con los pies en el suelo; H: la altura del vuelo; T: lo que dura (más despacio que en la
       realidad, para que se vea) */
    const tc = dbl ? .3 : .38, H = dbl ? 20 : 9, T = alt ? 1500 : dbl ? 1200 : 820;
    /* (el vuelo y el rebote: senos, que empiezan y acaban con la velocidad del despegue y del aterrizaje) */
    const fly = x => x < tc ? 0 : sin(PI * (x - tc) / (1 - tc)), dip = x => x < tc ? sin(PI * x / tc) : 0;
    const atT = t => {
      let st;
      if (!alt) {
        const v = fly(t), dd = dip(t);
        st = legs({ w: 11, toe: 6, ps: 3 + 7 * dd, pt: 87 - 8 * dd, heel: 22 + 8 * v - 4 * dd }, { tilt: 4, neck: -3, shrug: 2 });
        st.lL = st.lR = H * v; st.ry += H * v;
      }
      else {
        /* (cada mitad, un pie: el de apoyo da un saltito cuando pasa la cuerda y el otro va levantado, algo atrás; todo con
           senos, de modo que los dos pies están en el suelo un instante al cambiar) */
        const w2 = sin(2 * PI * t), up = { L: 12 * max(0, -w2) ** 1.3, R: 12 * max(0, w2) ** 1.3 }, hop = 5 * max(0, abs(w2)) ** 2;
        st = legs({ w: 12, toe: 6, ps: 4, pt: 86, heel: 22 }, { tilt: 4, neck: -3, shrug: 2, twist: 2 * w2 });
        for (const k of ['L', 'R']) { st['l' + k] = up[k] > 0 ? up[k] : hop; st['p' + k] = 22 + 16 * up[k] / 12; st['z' + k] = -7 * up[k] / 12; }
        st.ry += hop - 2;
      }
      const q = qOf(st);
      /* la cuerda: φ = 0 cuando pasa bajo los pies */
      const phi = alt ? 720 * (t - .25) : dbl ? 720 * (t - (tc + (1 - tc) / 2)) + 180 : 360 * (t - (tc + (1 - tc) / 2));
      const { J } = pose({ ...q, hands: ZERO, elbow: {} }), hip = mix(J.L.hip, J.R.hip, .5), a = RAD(phi);
      const hands = { L: add([42, hip[1] - 2, 30], [0, -4 * cos(a), -4 * sin(a)]), R: add([-42, hip[1] - 2, 30], [0, -4 * cos(a), -4 * sin(a)]) };
      const hd = { L: norm([.15, -.85, .45]), R: norm([-.15, -.85, .45]) };
      const q2 = { ...q, hands, elbow: both(() => [.45, -.2, -1]), barDir: both(() => [0, 1, 0]) }, J2 = pose(q2).J;
      return { ...q2, barDir: { L: mul(acrossFist(J2, 'L', hd.L), -1), R: acrossFist(J2, 'R', hd.R) }, hd, phi };
    };
    return { view: 'front', up: 'a', rest: 'a', cam: [-38, 8], side: [-90, 4], feetOff: true, one: alt, at: atT, gear: (q, F, cam) => ropeGear(cam, q, F), beat: cycle(T) };
  };

  /* ════ elíptica ════ */
  /* tracción trasera: cada brazo de pedal va de la manivela del volante (detrás) al rodillo que corre por la rampa de delante;
     el pedal, en medio, describe la elipse (unos 46 cm de zancada). Las asas, en palancas que pivotan en la columna de
     delante, van al revés que el pie de su lado (el pie izquierdo delante, el asa izquierda atrás) */
  const EL_C = [0, 50, -128], EL_X = 16;
  /* (el pedal: la elipse, de 52 a cada lado y 9 arriba y abajo; la manivela, de 30; el rodillo, donde la línea que va de la
     manivela al pedal llega a la rampa) */
  const ellArm = (s, th) => {
    const a = RAD(th + (s == 'L' ? 0 : 180)), x = s == 'L' ? EL_X : -EL_X;
    const P = [x, 40 + 9 * sin(a), 1 + 52 * cos(a)], R = [x, EL_C[1] + 30 * sin(a), EL_C[2] + 30 * cos(a)], F = add(R, mul(sub(P, R), 1 / .55)), u = norm(sub(F, R));
    return { R, F, P, u, n: norm(cross([1, 0, 0], u)), a };
  };
  const ellGear = (cam, q) => {
    const out = [], T = (a, b, r, col = GR.C.frame, cap = 4) => out.push(...GR.tube(cam, a, b, r, col, cap));
    /* la bancada, el volante detrás, la rampa y la columna delante */
    out.push(GR.obox(cam, [0, 4, 24], [[1, 0, 0], UP], [12, 4, 172], GR.C.frame), GR.obox(cam, [0, 3, -140], [[1, 0, 0], UP], [36, 3, 7], GR.C.frame));
    out.push(GR.disc(cam, EL_C, [1, 0, 0], 44, 22, 'wheel'));
    out.push(GR.obox(cam, [0, 24, 108], [[1, 0, 0], UP], [26, 2.5, 80], GR.C.frame), GR.obox(cam, [0, 3, 196], [[1, 0, 0], UP], [36, 3, 7], GR.C.frame));
    T([0, 8, 196], [0, 262, 182], 6); out.push(GR.obox(cam, [0, 274, 176], [[1, 0, 0], norm([0, .8, -.6])], [22, 13, 4], ['#1b1e2b', '#4d5370']));
    for (const s of ['L', 'R']) {
      const A = ellArm(s, q.th), k = s == 'L' ? 1 : -1, piv = [k * 30, 160, 184];
      T(add(EL_C, [k * 13, 0, 0]), A.R, 3.5, DARK, 1); T(A.R, A.F, 3.2, DARK, 1); out.push(GR.disc(cam, A.F, [1, 0, 0], 5, 5, 'metal'));
      out.push(GR.obox(cam, add(A.P, mul(A.n, -1)), [[1, 0, 0], A.n], [9, 2.2, 22], GR.C.frame));
      /* la palanca del asa, del pivote a la mano y algo más arriba; su bielita baja al brazo del pedal */
      const h = q.hands[s], d = norm(sub(h, piv));
      T(piv, add(h, mul(d, -9)), 3.4); out.push(...GR.tube(cam, add(h, mul(d, -8)), add(h, mul(d, 14)), 3, ['#2b2f43', '#0a0b10'], 2).map(i => ({ ...i, hand: s })));
      T(add(piv, [0, -6, 0]), add(A.F, [0, 6, -10]), 2.4);
    }
    return out;
  };
  const elliptical = f => {
    const atT = t => {
      const th = 360 * t, feet = {}, knee = {}, hands = {};
      for (const s of ['L', 'R']) {
        const A = ellArm(s, th), pit = Math.atan2(A.u[1], A.u[2]) * 180 / PI, ball = add(add(A.P, mul(A.n, 6.5)), mul(A.u, 14));
        const An = C.toeAnkle(ball, -pit); feet[s] = [abs(An[0]), An[2], 4, An[1] - LEN.ankle, -pit]; knee[s] = [0, .2, 1];
        /* (el asa, al revés que el pie) */
        hands[s] = [s == "L" ? 40 : -40, 298 + 5 * sin(A.a), 92 - 28 * cos(A.a)];
      }
      const ay = (feet.L[3] + feet.R[3]) / 2 + LEN.ankle;
      const q = { root: [0, ay + 160, -10 + 4 * cos(RAD(th) * 2)], tilt: 6, spine: 2, neck: -4, shrug: 3, reach: 6, twist: -4 * cos(RAD(th)), roll: 4 * sin(RAD(th)), feet, knee, th };
      const q2 = { ...q, hands, elbow: both(() => [.6, -.4, -.7]), barDir: both(() => [0, 1, 0]) }, J = pose(q2).J;
      const want = s => norm(sub(hands[s], [s == 'L' ? 30 : -30, 160, 184]));
      return { ...q2, barDir: { L: mul(acrossFist(J, 'L', want('L')), -1), R: acrossFist(J, 'R', want('R')) } };
    };
    return { view: 'front', up: 'a', rest: 'a', cam: [-64, 8], side: [-90, 4], feetOff: true, one: true, at: atT, gear: (q, F, cam) => ellGear(cam, q), beat: cycle(1800) };
  };

  /* ════ escaladora (escalera que gira) ════ */
  /* los peldaños (de 45 de alto y 56 de fondo) bajan sin parar hacia quien sube: el pie de apoyo baja con su peldaño y el
     otro sube al de dos más arriba. Cada pie: el 60 % de la vuelta en el peldaño (el talón se despega al final) y el 40 % en el
     aire, saliendo y llegando a la velocidad de la escalera (sin frenazos). Las manos, apenas apoyadas en las barras de los
     lados */
  const ST_H = 45, ST_D = 56, ST_Y = 80, ST_Z = 62, ST_ON = .6, RAIL_Y = 252;
  const stairFoot = (s, t) => {
    const ph = (((t - (s == 'L' ? 0 : .5)) % 1) + 1) % 1, v = [0, -2 * ST_H, -2 * ST_D], x = s == 'L' ? 14 : -14;
    const land = [x, ST_Y + .2, ST_Z], off = add(land, mul(v, ST_ON));
    if (ph < ST_ON) return { ball: add(land, mul(v, ph)), p: 26 * ease(clamp((ph - .3) / .3, 0, 1)) };
    /* (en el aire: una curva de Hermite con la velocidad de la escalera al salir y al llegar, y un arco para pasar el peldaño) */
    const u = (ph - ST_ON) / (1 - ST_ON), m = mul(v, 1 - ST_ON), h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
    const P = add(add(mul(off, h00), mul(m, h10)), add(mul(land, h01), mul(m, h11)));
    return { ball: add(P, [0, 26 * sin(PI * u) ** 2, 0]), p: 26 * (1 - ease(u)) };
  };
  const stairGear = (cam, q) => {
    const out = [], T = (a, b, r, col = GR.C.frame, cap = 4) => out.push(...GR.tube(cam, a, b, r, col, cap)), o = 2 * ((q.tt % 1 + 1) % 1);
    /* los peldaños que se ven, del suelo a la carcasa de delante (donde se meten); los largueros de los lados, las barras y la
       consola */
    for (let k = -2; k <= 4; k++) {
      const y = ST_Y + (k - o) * ST_H, z = ST_Z + (k - o) * ST_D;
      /* (el peldaño, con el pie apoyado en su centro, diez por detrás de la bola; su tabica baja hasta el de debajo, sin llegar a
         la base) */
      if (y < 17 || z > 178) continue;
      const zc = z - 10, lo = max(y - ST_H, 12), hi = y - 8;
      out.push(GR.obox(cam, [0, y - 4, zc], [[1, 0, 0], UP], [30, 4, ST_D / 2 - 1], ['#3a3f56', '#14161f']));
      if (hi - lo > 2) out.push(GR.obox(cam, [0, (hi + lo) / 2, zc + ST_D / 2 - 2], [[1, 0, 0], UP], [29, (hi - lo) / 2, 1.5], ['#232738', '#0a0b10']));
    }
    out.push(GR.obox(cam, [0, 130, 214], [[1, 0, 0], UP], [36, 130, 34], GR.C.frame), GR.obox(cam, [0, 3, 90], [[1, 0, 0], UP], [42, 3, 130], GR.C.frame));
    for (const k of [-1, 1]) {
      T([k * 34, 14, 8], [k * 34, 160, 190], 4);
      T([k * 42, RAIL_Y, -40], [k * 42, RAIL_Y, 110], 3); T([k * 42, RAIL_Y, 110], [k * 42, 316, 176], 3); T([k * 42, RAIL_Y, -40], [k * 36, 6, -40], 3);
    }
    T([-42, 316, 176], [42, 316, 176], 3); out.push(GR.obox(cam, [0, 332, 172], [[1, 0, 0], norm([0, .8, -.6])], [22, 13, 4], ['#1b1e2b', '#4d5370']));
    return out;
  };
  const stairs = f => {
    const atT = t => {
      const feet = {}, knee = {};
      for (const s of ['L', 'R']) { const F = stairFoot(s, t), A = C.toeAnkle(F.ball, F.p); feet[s] = [abs(A[0]), A[2], 4, A[1] - LEN.ankle, F.p]; knee[s] = [0, .1, 1]; }
      const w = sin(2 * PI * t), q = { root: [0, 225 + 3 * cos(4 * PI * t), -6], tilt: 10, spine: 2, neck: -6, shrug: 3, reach: 4, twist: 3 * w, roll: 2.5 * w, feet, knee, tt: t };
      /* (las manos, abiertas y apoyadas encima de las barras de los lados) */
      const hands = { L: [42, RAIL_Y + 8, 62], R: [-42, RAIL_Y + 8, 62] };
      return { ...q, hands, elbow: both(() => [.3, -.3, -1]), handDir: both(() => [0, 0, 1]), palm: both(() => [0, -1, 0]), fist: false };
    };
    return { view: 'front', up: 'a', rest: 'a', cam: [-60, 10], side: [-90, 4], feetOff: true, one: true, at: atT, gear: (q, F, cam) => stairGear(cam, q), beat: cycle(1900) };
  };

  /* una curva cerrada (de Catmull-Rom, con los tiempos de cada punto) por los puntos K = [[t, [x, y, z]], …], t de 0 a 1: pasa
     por todos sin pararse en ninguno */
  const loop = (t, K) => {
    const n = K.length, x = ((t % 1) + 1) % 1;
    let i = n - 1; while (i > 0 && K[i][0] > x) i--;
    const g = j => { const k = ((j % n) + n) % n; return [K[k][0] + Math.floor(j / n), K[k][1]]; };
    const [t0, p0] = g(i - 1), [t1, p1] = g(i), [t2, p2] = g(i + 1), [t3, p3] = g(i + 2), h = t2 - t1, u = (x - t1) / h, u2 = u * u, u3 = u2 * u;
    const m1 = mul(sub(p2, p0), h / (t2 - t0)), m2 = mul(sub(p3, p1), h / (t3 - t1));
    return add(add(mul(p1, 2 * u3 - 3 * u2 + 1), mul(m1, u3 - 2 * u2 + u)), add(mul(p2, 3 * u2 - 2 * u3), mul(m2, u3 - u2)));
  };

  /* ════ natación (crol) ════ */
  /* boca abajo en el agua, con la espalda a ras de la superficie: cada brazo entra delante de la cabeza, tira por debajo del
     cuerpo hasta la cadera, sale junto al muslo y vuelve por encima del agua con el codo alto; el otro, media vuelta después.
     El cuerpo rueda hacia el brazo que tira y las piernas baten seis veces por ciclo, desde la cadera, con los pies en punta.
     El agua: losetas translúcidas a la altura de la superficie, ordenadas con el cuerpo, de modo que lo que queda debajo se ve a
     través de ella */
  const W_Y = 104, SWIM = [[0, [6, -6, 128]], [.12, [8, -30, 124]], [.25, [2, -62, 72]], [.38, [-4, -60, 6]], [.5, [10, -36, -68]], [.56, [16, -6, -86]], [.68, [30, 22, -50]], [.82, [26, 30, 30]], [.93, [14, 12, 100]]];
  const waterGear = (cam, q, F) => {
    /* el gorro, claro, sobre el cráneo: se ve aunque la cara vaya en el agua (con su profundidad, la de lo más alto, para que
       el agua no lo tape) */
    const C0 = at(F.head, [0, 9, -3]), capZ = max(cam.P(C0)[2], cam.P(at(F.head, [0, 24, -3]))[2]);
    const P0 = cam.P(C0), f1 = v => v.toFixed(1);
    const out = [{ z: capZ, above: ['head'], svg: `<circle cx="${f1(P0[0])}" cy="${f1(P0[1])}" r="17.5" fill="#d7dbe7" stroke="#59607c" stroke-width="1.2"/><ellipse cx="${f1(P0[0] - 5)}" cy="${f1(P0[1] - 6)}" rx="7" ry="4.5" fill="rgba(255,255,255,.55)"/>` }], c = q.root;
    for (let i = -3; i < 3; i++) for (let j = -7; j < 5; j++) {
      const x0 = i * 40, z0 = c[2] + j * 40, P = [[x0, W_Y, z0], [x0 + 40, W_Y, z0], [x0 + 40, W_Y, z0 + 40], [x0, W_Y, z0 + 40]].map(v => cam.P(v));
      out.push({ z: cam.P([x0 + 20, W_Y, z0 + 20])[2], nf: true, svg: `<path d="M${P.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L')}Z" fill="rgba(70,150,210,.2)" stroke="rgba(150,200,240,.10)" stroke-width=".8"/>` });
    }
    /* (las ondas que levanta el cuerpo) */
    for (const k of [-1, 1]) for (let r = 0; r < 3; r++) {
      const z = c[2] + 40 - r * 70 - 30 * ((q.tt * 2) % 1), P = [[k * (34 + r * 10), W_Y + .5, z + 26], [k * (44 + r * 12), W_Y + .5, z], [k * (34 + r * 10), W_Y + .5, z - 26]].map(v => cam.P(v));
      out.push({ z: cam.P([k * 44, W_Y, z])[2], nf: true, svg: `<path d="M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}Q${P[1][0].toFixed(1)} ${P[1][1].toFixed(1)} ${P[2][0].toFixed(1)} ${P[2][1].toFixed(1)}" fill="none" stroke="rgba(190,225,250,.35)" stroke-width="1.4"/>` });
    }
    return out;
  };
  const swim = f => {
    const atT = t => {
      /* (el cuerpo rueda hacia el brazo que tira: sube el hombro del que vuelve por encima del agua; la cabeza, con la coronilla
         a ras del agua y la cara hacia abajo y algo adelante, gira hacia el brazo izquierdo para respirar cuando sale) */
      const roll = -34 * sin(2 * PI * t), breath = sin(PI * clamp((t - .58) / .3, 0, 1)) ** 2;
      const q0 = { root: [0, W_Y - 7, 0], tilt: 90, spine: 0, neck: -12 + 8 * breath, look: 62 * breath, roll, twist: -roll * .25, shrug: 0, reach: 10, tt: t };
      const J0 = pose({ ...q0, feet: both(() => [20, -170, 0, 40, 0]), knee: both(() => [0, -1, 0]), hands: ZERO, elbow: {} }).J;
      /* las piernas: baten desde la cadera (unos 9° arriba y abajo), la rodilla algo doblada al bajar, los pies en punta */
      const kneeDown = s => { const a = 9 * sin(6 * PI * t + (s == 'L' ? 0 : PI)), b = a - 10 * max(0, sin(6 * PI * t + (s == 'L' ? 0 : PI) - .6)); return [a, b]; };
      const lg = {};
      for (const s of ['L', 'R']) { const [a, b] = kneeDown(s), r = RAD(roll * .4); lg[s] = C.legAt(J0[s].hip, [0, sin(RAD(a)), -cos(RAD(a))], [0, sin(RAD(b)), -cos(RAD(b))], s, [sin(r), -cos(r), 0], 78); }
      const q = { ...q0, ...C.legsOf(lg) };
      const hands = {}, elbow = {}, handDir = {}, palm = {};
      for (const s of ['L', 'R']) {
        const ph = t + (s == 'L' ? 0 : .5), o = loop(ph, SWIM), S = J0[s].sh, x = ((ph % 1) + 1) % 1, rec = x > .54 && x < .97;
        hands[s] = add(S, sd(s, o));
        const pull = clamp(x / .5, 0, 1);
        handDir[s] = rec ? norm([0, -.4, .9]) : norm([0, -cos(PI * .75 * pull) , .9 - 1.6 * pull]);
        palm[s] = rec ? norm([0, .4, -.9]) : norm(cross([1, 0, 0], handDir[s]));
        elbow[s] = rec ? [.5, 1, -.2] : [1, .6, 0];
      }
      return { ...q, hands, elbow, handDir, palm, fist: false };
    };
    return { view: 'side', up: 'a', rest: 'a', cam: [-32, 24], side: [-90, 8], feetOff: true, one: true, noShadow: true, at: atT, gear: (q, F, cam) => waterGear(cam, q, F), beat: cycle(2800) };
  };

  /* ════ saco de boxeo ════ */
  /* en guardia (zurdo delante, el cuerpo de perfil y los codos abajo, los puños a la altura de la cara), el uno-dos dos veces:
     directo de izquierda y cruzado de derecha a la altura del hombro. En el cruzado gira la cadera y el talón de atrás se
     despega; cada golpe sale y vuelve a la guardia sin pararse, y el saco se mece un poco tras cada uno */
  const BAG = [-4, 0, 236], BAG_R2 = 34, GLOVE = ['#b23b3b', '#3a0f12', '#d4706c'];
  const bump = (t, a, d) => { const x = (t - a) / d; return x <= 0 || x >= 1 ? 0 : sin(PI * x) ** 2; };
  const hits = [[.12, 'L'], [.32, 'R'], [.62, 'L'], [.82, 'R']], PD = .2;
  const bagSwing = t => { let z = 0; for (const [h] of hits) { const u = ((t - h - PD / 2) % 1 + 1) % 1; z += 5 * Math.exp(-u * 9) * sin(2 * PI * u * 2.2); } return z; };
  const bagGear = (cam, q) => {
    const out = [], T = (a, b, r, col, cap = 4) => out.push(...GR.tube(cam, a, b, r, col, cap)), dz = bagSwing(q.tt), top = [BAG[0], 342, BAG[2] + dz * .9], bot = [BAG[0], 112, BAG[2] + dz];
    T(bot, top, BAG_R2, ['#5a2324', '#1e0b0c'], 4);
    const sw = [BAG[0], 392, BAG[2] + dz * .3];
    for (const a of [45, 135, 225, 315]) T(add(top, [BAG_R2 * .8 * cos(RAD(a)), 0, BAG_R2 * .8 * sin(RAD(a))]), sw, .9, DARK, 1);
    T(sw, [BAG[0], 470, BAG[2]], 1.2, DARK, 1); out.push(GR.obox(cam, [BAG[0], 474, BAG[2]], [[1, 0, 0], UP], [40, 4, 6], GR.C.frame));
    /* (el guante tapa el puño: se pinta encima de la mano) */
    for (const s of ['L', 'R']) out.push(...GR.ball(cam, q.glove[s], 13, GLOVE).map(i => ({ ...i, hand: s, above: ['hand' + s] })));
    return out;
  };
  const boxing = f => {
    const atT = t => {
      let j = 0, c = 0;
      for (const [h, s] of hits) { const b = bump(t, h - PD / 2, PD); if (s == 'L') j = max(j, b); else c = max(c, b); }
      /* (la base: zurdo delante; en el cruzado, el talón de atrás sube y la punta gira; un rebote suave en las piernas) */
      const bounce = sin(4 * PI * t) * 2;
      const st = { ...BASE, wL: 14, wR: 18, zL: 24, zR: -34, toeL: -28, toeR: 42 - 22 * c, pL: 0, pR: 26 * c, ry: ROOT_Y - 16 + bounce, rz: -4 + 6 * c + 4 * j, tilt: 6 + 4 * c, spine: 2, neck: -8, shrug: 6, reach: 4 + 6 * max(j, c), twist: 34 * c - 8 * j, bend: 0 };
      const q = { ...qOf(st), yaw: -30 + 14 * c, roll: 0, tt: t };
      const { J } = pose({ ...q, hands: ZERO, elbow: {} });
      /* la guardia: los puños delante de la cara; el golpe: el guante llega a la cara del saco, a la altura del hombro */
      const head = mix(J.L.sh, J.R.sh, .5), dz = bagSwing(t);
      const guard = { L: add(J.L.sh, [-22, 38, 36]), R: add(J.R.sh, [16, 42, 42]) };
      const tgt = s => [BAG[0] + (s == 'L' ? 8 : -8), J[s].sh[1] + 4, BAG[2] + dz - BAG_R2 - 13];
      const glove = { L: mix(guard.L, tgt('L'), j), R: mix(guard.R, tgt('R'), c) };
      const hands = { L: add(glove.L, [0, 0, -4]), R: add(glove.R, [0, 0, -4]) };
      return { ...q, hands, glove, elbow: { L: mix([.15, -1, -.25], [.45, -1, 0], j), R: mix([.15, -1, -.25], [.45, -1, 0], c) }, fist: true };
    };
    return { view: 'front', up: 'a', rest: 'a', cam: [-56, 8], side: [-90, 4], one: true, at: atT, gear: (q, F, cam) => bagGear(cam, q), beat: cycle(3600) };
  };

  const stub = () => null;
  Object.assign(F3.FAMILIES, { run, bike, rower, skiErg, jumpRope, elliptical, stairs, swim, boxing });
})(window);
