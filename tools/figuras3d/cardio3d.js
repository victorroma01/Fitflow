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
  const { spl, legs, qOf, gait, hipOver, keyAnim, qmix, reachClamp, withHands, bySh, legsFree, acrossFist } = FL;
  const { cos, sin, PI, abs, max, min, sqrt, atan2 } = Math;

  /* ════ correr y andar ════ */
  /* la zancada de carrera, en el sitio: cada pie apoya una parte de la vuelta (st) yendo hacia atrás bajo la cadera, de
     z0 + S/2 a z0 - S/2, despega por la punta, sube por detrás (el talón hacia el glúteo) y vuelve adelante con la rodilla
     arriba hasta caer otra vez con el medio del pie. Entre un apoyo y otro, los dos pies en el aire (la fase de vuelo).
     slope: la pendiente del suelo (tan), que sube hacia delante; y0: la altura del suelo en z = 0 */
  const runGait = (t, o = {}) => {
    const S = o.S ?? 76, w = o.w ?? 13, toe = o.toe ?? 4, st = o.st ?? .36, hk = o.hk ?? 46, z0 = o.z0 ?? 0, slope = o.slope ?? 0, y0 = o.y0 ?? 0;
    const feet = {}, knee = {}, ank = {}, on = {};
    for (const [s, ph] of [['L', 0], ['R', .5]]) {
      const u = ((t + ph) % 1 + 1) % 1, x = s == 'L' ? w : -w;
      let z, lift, p;
      if (u < st) { const v = u / st; z = z0 + S / 2 - S * v; lift = 0; p = v < .7 ? -3 + 6 * v : 1 + 44 * ((v - .7) / .3) ** 1.5; on[s] = true; }
      else {
        const v = (u - st) / (1 - st);
        z = spl(v, [[0, z0 - S / 2], [.22, z0 - S / 2 - 12], [.55, z0 + 4], [.84, z0 + S / 2 + 12], [1, z0 + S / 2]]);
        lift = spl(v, [[0, 0], [.25, hk * .85], [.45, hk], [.75, hk * .45], [1, 0]]);
        p = spl(v, [[0, 45], [.3, 40], [.7, 10], [1, -3]]);
        on[s] = false;
      }
      /* (el tobillo: sobre el suelo, que puede ir en cuesta; con el talón levantado, la punta queda apoyada) */
      const yF = y0 + z * slope, A = p > 0 && lift < 1 ? FL.footPose(x, z, p) : [x, LEN.ankle, z];
      feet[s] = [abs(x), A[2], toe, yF + lift + (A[1] - LEN.ankle), p]; knee[s] = [sin(RAD(toe)), 0, cos(RAD(toe))];
      ank[s] = [x, yF + lift + A[1], A[2]];
    }
    return { feet, knee, ank, on };
  };
  /* los brazos al correr: los codos doblados a 90° y las manos que van y vienen a la altura de la cintura, al revés que las
     piernas */
  const runArms = (F, q, t, amp = 1) => {
    const o = { hands: {}, elbow: {} };
    for (const [s, ph] of [['L', .5], ['R', 0]]) {
      const a = sin(2 * PI * (t + ph)), S = shoulder(F, s, q);
      o.hands[s] = add(S, sd(s, [-7, -104 + 14 * a * amp, 18 + 38 * a * amp]));
      o.elbow[s] = [.25, -.3, -1];
    }
    return { ...o, fist: false, palm: both(() => [-1, 0, .2]), handDir: both(sd2 => norm(sd(sd2, [-.25, .15, 1]))) };
  };
  /* andando: los brazos sueltos, casi estirados, al revés que las piernas */
  const walkArms = (F, q, t, amp = 1) => {
    const o = { hands: {}, elbow: {} };
    for (const [s, ph] of [['L', .5], ['R', 0]]) { const a = sin(2 * PI * (t + ph)); o.hands[s] = add(shoulder(F, s, q), sd(s, [9, -138, 8 + 26 * a * amp])); o.elbow[s] = [.2, 0, -1]; }
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
    const T = walk ? (pack ? 1250 : 1100) : 720;
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
        g = runGait(t, { S: incline ? 64 : 78, st: incline ? .4 : .36, hk: incline ? 36 : 46, slope, y0 });
        /* (la cadera: más baja a mitad de cada apoyo, más alta en el vuelo; sin estirar nunca la pierna que apoya) */
        const top = ROOT_Y + y0 - 8 + 5 * cos(4 * PI * (t - .18));
        const stance = ['L', 'R'].filter(s => g.on[s]).map(s => [g.ank[s], s == 'L' ? 20 : -20]);
        ry = stance.length ? C.capRoot([0, top, 0], stance)[1] : top;
      }
      /* (el tronco, algo adelante; más en cuesta y con mochila; gira un poco con cada zancada) */
      const lean = (walk ? 2 : 7) + (incline ? 6 : 0) + (pack ? 6 : 0);
      const q = { feet: g.feet, knee: g.knee, root: [1.5 * sin(ph), ry, 0], tilt: lean, spine: walk ? 0 : 2, neck: -lean * .6, shrug: 2, reach: 2, twist: (walk ? 3 : 6) * sin(ph), roll: 1.5 * sin(ph) };
      const { F } = pose({ ...q, hands: ZERO, elbow: {} });
      return { ...q, ...(walk ? walkArms(F, q, t, pack ? .6 : 1) : runArms(F, q, t)) };
    };
    const gear = (q, F, cam) => {
      const out = [];
      if (tm) out.push(...treadmill(cam, slope));
      else if (incline) out.push(...GR.under([GR.obox(cam, [0, -2, 0], [[1, 0, 0], norm([0, 1, -slope])], [60, 2, 150], ['#1b1e2b', '#3f4560'])], 0));
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
    const saddle = add(H0, [0, -13, -2]), tilt = road ? 50 : air ? 22 : 38, T = road ? 900 : air ? 760 : 800;
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

  const stub = () => null;
  Object.assign(F3.FAMILIES, { run, bike, rower: stub, skiErg: stub, jumpRope: stub, elliptical: stub, stairs: stub, swim: stub, boxing: stub });
})(window);
