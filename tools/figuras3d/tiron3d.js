/* ═══ figuras 3D: los tirones (lote 2) ═══
   Jalones, remos y dominadas. Como en el lote 1, las posturas salen de reglas: en los jalones y remos sentados el tronco se
   echa algo atrás al tirar; en los remos inclinados, con la espalda recta, la cadera se va atrás lo justo para que el peso
   (el del cuerpo con el de la barra) quede sobre el medio del pie; colgado de la barra, el cuerpo se coloca con su centro de
   masas bajo las manos. En los tirones se descansa con los brazos estirados (rest 'a') y el esfuerzo acaba con el tirón
   (up 'b').
   Define: Fig3D.FAMILIES.pulldown, .row, .pullup */
(function (G) {
  const F3 = G.Fig3D, L = F3.lib, GR = F3.gear, M = F3.mlib;
  const { add, sub, mul, dot, len, norm, mix, ease, clamp, at, RAD, LEN, bar, plate, barbell, cross } = L;
  const { has, pose, ZERO, UP, sd, both, T, shoulder, span, comOf, midFoot, solve, solveNear, legRoot, bb, pair, bands, visTag } = M;
  const { cos, sin, PI, abs, max, min, sqrt, atan2, exp } = Math;
  const STEEL = ['#b9bed0', '#0a0b10'];
  /* el centro de los hombros */
  const shC = (F, q) => mix(shoulder(F, 'L', q), shoulder(F, 'R', q), .5);
  /* una cuerda (la del jalón con cuerda): dos ramales con su nudo al final */
  const rope = (cam, top, hands) => ['L', 'R'].flatMap(s => GR.strap(cam, [top, hands[s]], 3.4, ['#c9b98f', '#0a0b10']).map(i => ({ ...i, hand: s })));
  /* un asa de agarre (un tubo corto de acero) en la mano s, a lo largo de dir */
  const grip = (cam, c, dir, s, hw = 9) => GR.tube(cam, add(c, mul(dir, -hw)), add(c, mul(dir, hw)), 4, STEEL, 1).map(i => ({ ...i, hand: s }));

  /* ════ jalones ════ */
  const pulldown = f => {
    const wide = has(f, 'wide'), one = has(f, 'one'), machine = has(f, 'machine'), rope_ = has(f, 'rope'), kneel = has(f, 'kneel');
    const name = f.join(' ');
    /* el agarre: ancho, normal, supino (al ancho de los hombros, palmas hacia uno), neutro (asas paralelas), estrecho (el
       triángulo: las manos casi juntas) o la cuerda */
    const kind = rope_ ? 'rope' : wide ? 'wide' : f.includes('supine') ? 'supine' : f.includes('neutral') ? 'neutral' : f.includes('close') ? 'close' : one || machine ? 'neutral' : 'normal';
    const g = { wide: 100, normal: 76, supine: 40, neutral: 30, close: 8, rope: 16 }[kind];
    const neutralGrip = kind == 'neutral' || kind == 'close' || kind == 'rope';
    const barDir = neutralGrip ? { L: [0, 0, 1], R: [0, 0, -1] } : kind == 'supine' ? [-1, 0, 0] : [1, 0, 0];
    const elbow = kind == 'wide' ? [1, -.2, .05] : kind == 'normal' ? [.85, -.3, .2] : [.35, -.45, .85];
    /* sentado con los muslos bajo los rodillos (o de rodillas en el suelo, en el de una mano) */
    const body = kneel ? { root: [0, 97, 0], feet: both(() => [20, -76, 0, 14, 60]), knee: both(() => [0, -.2, 1]) }
      : { root: [0, 122, 0], feet: both(() => [40, 86, 14]), knee: both(() => [.25, .7, .7]) };
    const bodyAt = t => { const lean = kneel ? mix(-2, -8, t) : mix(-4, -17, t); return { ...body, tilt: lean * .55, spine: lean * .45, neck: -.8 * lean + 3, shrug: mix(8, -4, t) }; };
    /* el principio (los brazos estirados hacia arriba, algo por delante de la cabeza) y el final (la barra en lo alto del pecho;
       con los agarres cerrados, más abajo, en el esternón), cada uno con el tronco de ese momento */
    const F0 = pose({ ...bodyAt(0), hands: ZERO, elbow: {} }).F, F1 = pose({ ...bodyAt(1), hands: ZERO, elbow: {} }).F;
    const topY = 80 + 8 + sqrt(max(0, 145 ** 2 - (g - 47) ** 2 - 14 ** 2));
    const c0 = at(F0.thorax, [0, topY, 12]);
    const c1 = at(F1.thorax, neutralGrip || kind == 'supine' ? [0, 76, 30] : [0, 92, 24]);
    const pulley = [0, 560, c0[2]];
    const at3 = t => { const c = mix(c0, c1, t); return add(c, [0, 0, 6 * sin(PI * t)]); };
    const hand = (c, s) => add(c, sd(s, [g, 0, 0]));
    return {
      view: 'back', up: 'b', rest: 'a', cam: [-148, 12], one: one || kneel, feetOff: kneel,
      at(t) {
        const b = bodyAt(t), c = at3(t);
        if (one || kneel) {
          /* con una mano (la derecha): la otra, apoyada en el muslo (sentado) o colgando (de rodillas) */
          const { F } = pose({ ...b, hands: ZERO, elbow: {} });
          const free = kneel ? add(shoulder(F, 'L', b), [9, -143, 4]) : at(F.pelvis, [26, 8, 40]);
          return { ...b, barC: c, hands: { R: hand(c, 'R'), L: free }, elbow: { R: [.45, -.4, .6], L: kneel ? [.1, 0, -1] : [.3, -.3, 1] }, barDir: { R: [0, 0, -1], L: [1, 0, 0] }, fist: { L: false }, palm: { L: kneel ? [-1, 0, 0] : [0, -1, 0] } };
        }
        if (machine) {
          /* la convergente: cada asa baja por su arco, de arriba y separadas a los lados del pecho */
          const hs = both(s => { const a = hand(c0, s), e = add(T(F1, s, [52, 66, 24]), [0, 0, 0]); const u = mix(a, e, t); return add(u, sd(s, [12 * sin(PI * t), 0, 0])); });
          return { ...b, barC: c, hands: hs, elbow: both(() => elbow), barDir };
        }
        return { ...b, barC: c, hands: both(s => hand(c, s)), elbow: both(() => elbow), barDir, ...(kind == 'supine' ? {} : {}) };
      },
      gear(q, F, cam) {
        const out = [];
        /* el asiento y los rodillos de los muslos (o nada, de rodillas) */
        if (!kneel) {
          const s = at(F.pelvis, [0, -22, -8]), s0 = [0, s[1] - 7, s[2] - 24], s1 = add(s0, [0, 0, 60]);
          out.push(...GR.under([...GR.leg(cam, add(mix(s0, s1, .5), [0, -7, 0])), GR.padAB(cam, s0, s1, UP, 30, 7)]));
          const { J } = pose(q), kn = mix(J.L.knee, J.R.knee, .5), d = norm(sub(mix(J.L.hip, J.R.hip, .5), kn)), r = add(add(kn, mul(d, 18)), mul(norm(sub(UP, mul(d, dot(UP, d)))), 21));
          out.push(...GR.tube(cam, add(r, [-34, 0, 0]), add(r, [-8, 0, 0]), 11, GR.C.pad, 1), ...GR.tube(cam, add(r, [8, 0, 0]), add(r, [34, 0, 0]), 11, GR.C.pad, 1));
          out.push(...GR.tube(cam, add(r, [0, 0, 0]), [0, r[1], r[2] + 60], 5, GR.C.frame, 1).map(i => ({ ...i, nf: true })));
        }
        /* el cable, de la polea (arriba, fuera del encuadre) a la barra o el asa */
        const att = q.barC;
        if (machine) {
          (one ? ['R'] : ['L', 'R']).forEach(s => { const h = q.hands[s], pv = add(h, [0, 0, -1]), top = [sd(s, [70, 0, 0])[0], 470, pulley[2] - 40]; out.push(...GR.tube(cam, top, add(h, sd(s, [10, 0, 0])), 6, GR.C.frame, 4).map(i => ({ ...i, nf: true })), ...grip(cam, h, [0, 0, 1], s, 8)); });
          return out;
        }
        out.push(...visLine(GR.cableLine(cam, att, pulley), att, pulley, cam, F, q).map(i => ({ ...i, nf: true })));
        if (one || kneel) { out.push(...grip(cam, q.hands.R, [0, 0, 1], 'R', 8)); return out; }
        if (kind == 'rope') { out.push(...rope(cam, add(att, [0, 14, 0]), q.hands)); return out; }
        if (kind == 'close') {
          /* el triángulo: dos asas paralelas, juntas, colgando de un soporte en V */
          ['L', 'R'].forEach(s => { const h = q.hands[s]; out.push(...grip(cam, h, [0, 0, 1], s, 8), ...GR.tube(cam, add(h, [0, 0, 8]), add(att, [0, 22, 0]), 3, STEEL, 1), ...GR.tube(cam, add(h, [0, 0, -8]), add(att, [0, 22, 0]), 3, STEEL, 1)); });
          return out;
        }
        if (kind == 'neutral') {
          /* la barra de agarre neutro: un travesaño con dos asas paralelas */
          out.push(...bar(cam, add(att, [-52, 8, 0]), add(att, [52, 8, 0]), 4, 5));
          ['L', 'R'].forEach(s => { const h = q.hands[s]; out.push(...grip(cam, h, [0, 0, 1], s, 9), ...GR.tube(cam, add(h, [0, 0, 9]), add(h, [0, 8, 9]), 3, STEEL, 1), ...GR.tube(cam, add(h, [0, 0, -9]), add(h, [0, 8, -9]), 3, STEEL, 1)); });
          return out;
        }
        /* la barra de jalón: recta, con las puntas algo dobladas hacia abajo */
        const hw = wide ? 124 : 104;
        const segs = bar(cam, add(att, [-hw + 18, 0, 0]), add(att, [hw - 18, 0, 0]), 10, 5.2);
        segs.forEach((i, n) => { const x = -hw + 18 + (n + .5) * (2 * hw - 36) / 10; if (abs(abs(x) - g) < 18) i.hand = x > 0 ? 'L' : 'R'; });
        out.push(...segs, ...[-1, 1].flatMap(k => bar(cam, add(att, [k * (hw - 18), 0, 0]), add(att, [k * hw, -10, 0]), 1, 5.2)));
        return out;
      },
    };
  };

  /* ════ remos ════ */
  /* el tronco inclinado (en grados desde la vertical) con la espalda recta: toda la inclinación sale de la cadera, y la
     espalda guarda su curva natural (un poco arqueada, nunca redondeada) */
  const trunk = lean => ({ tilt: lean + 3, spine: -3 });
  /* la raíz (la cadera) para que el centro de los hombros quede donde se pide, con el tronco dado */
  const rootFor = (base, S) => { const q = { ...base, hands: ZERO, elbow: {} }, { F } = pose(q); return add(base.root, sub(S, shC(F, base))); };
  /* la mano s colgando, con el brazo estirado bajo el hombro (y algo hacia fuera, out) */
  const hangFrom = (F, s, q, out = 6) => add(shoulder(F, s, q), sd(s, [out, -145, 0]));
  /* los trozos de una pieza recta de a a b (cable, barra), ordenados con el cuerpo por lo que de verdad se ve */
  const visLine = (items, a, b, cam, F, q) => visTag(items, items.map((_, i) => mix(a, b, (i + .5) / items.length)), cam, F, pose(q).J);
  /* un remo con mancuerna, con el antebrazo colgando en vertical (la mancuerna tira hacia abajo): el brazo sube desde colgado
     (th = 0) hacia dir (atrás o a un lado, en el mundo) y la mano queda siempre bajo el codo. Devuelve la mano y la pista del
     codo (en términos del lado izquierdo) que deja el codo justo ahí */
  const armArc = (S, th, dir, s, def, k = .06) => {
    const d = norm(add(add(mul([0, -1, 0], cos(th)), mul(dir, sin(th))), sd(s, [k, 0, 0])));
    const E = add(S, mul(d, LEN.upper)), H = add(E, [0, LEN.upper - 145, 0]), v = sub(E, mix(S, H, .5));
    return { H, hint: norm(add([s == 'L' ? v[0] : -v[0], v[1], v[2]], mul(def, 6))) };
  };
  /* el pie s en el suelo por detrás de su cadera, a la distancia que deja esa rodilla doblada k grados (x: lo abierto del
     tobillo; toe: la punta) */
  const backFoot = (q, s, k, x, toe) => {
    const H = pose({ ...q, hands: ZERO, elbow: {} }).J[s].hip, d = sqrt(LEN.thigh ** 2 + LEN.shin ** 2 + 2 * LEN.thigh * LEN.shin * cos(RAD(k)));
    const dy = H[1] - LEN.ankle, dx = abs(x - abs(H[0]));
    return [x, H[2] - sqrt(max(0, d * d - dy * dy - dx * dx)), toe];
  };
  const row = f => {
    const w = x => has(f, x);
    let body, arms, gear = () => [], cam = [-130, 14], one = false, feetOff = false, rest = 'a', up = 'b';
    /* ── inclinado, de pie: con barra (normal, supino, Pendlay, en la Smith), Remo T y Meadows, y Kroc ── */
    if (w('bar') || w('pendlay') || w('smith') || w('tbar')) {
      const pend = w('pendlay'), supine = w('supine'), meadows = w('meadows'), tb = w('tbar') && !meadows, smith = w('smith');
      const gg = tb ? 7 : supine ? 46 : 64, el = supine ? [.18, .25, -1] : tb ? [.5, .25, -1] : [.6, .25, -1];
      const hands2 = c => ({ L: add(c, [gg, 0, 0]), R: add(c, [-gg, 0, 0]) }), F_ = q => pose({ ...q, hands: ZERO, elbow: {} }).F;
      /* la altura de la mano con el brazo estirado desde el hombro S, dx hacia dentro y en la vertical de z */
      const armY = (S, dx, z) => S[1] - sqrt(max(0, 145 ** 2 - dx * dx - (S[2] - z) ** 2));
      if (meadows) {
        /* Meadows: de lado a la barra, con el extremo cargado (el manguito, en la mano derecha) junto al cuerpo y la barra
           saliendo hacia la derecha hasta su eje en el suelo. El pie izquierdo (el de fuera) delante, con la mano izquierda en
           esa rodilla, y el derecho detrás. El tronco casi paralelo al suelo y la cadera a la altura justa para que, abajo, con
           el brazo estirado, los discos queden cerca del suelo */
        one = true;
        const mk = pt => {
          const lr = legRoot(24, 30, 10, 12, pt);
          const q = { root: lr.root, ...trunk(76), neck: -14, feet: { L: [24, 30, 10], R: [30, -60, 22] }, knee: { L: lr.knee, R: [.1, 0, 1] }, shrug: 2, reach: 8 };
          q.feet.R = backFoot(q, 'R', 24, 30, 22);
          return q;
        };
        body = mk(solve(pt => { const q = mk(pt); return hangFrom(F_(q), 'R', q, 2)[1] - 48; }, -10, 88));
        const F0 = F_(body), J0 = pose({ ...body, hands: ZERO, elbow: {} }).J;
        const h0 = hangFrom(F0, 'R', body, 2), h1 = T(F0, 'R', [34, 22, 4]), piv = [h0[0] - 400, 6, h0[2] + 6], R = len(sub(h0, piv));
        /* la mano sube girando alrededor del eje de la barra (la barra no cambia de largo) */
        const hR = t => add(piv, mul(norm(sub(mix(h0, h1, t), piv)), R));
        const hl = add(J0.L.knee, [2, 14, 2]);
        arms = t => ({ reach: mix(8, -6, t), hands: { R: hR(t), L: hl }, elbow: { R: [.45, .5, -1], L: [.8, .1, -.2] }, barDir: { R: norm(sub(piv, hR(t))), L: [1, 0, 0] }, fist: { L: false }, palm: { L: [0, -1, 0] }, piv });
        gear = (q, F, cam) => { const h = q.hands.R, u = norm(sub(h, q.piv)), a = add(q.piv, mul(u, -8)), b = add(h, mul(u, -30)); return [GR.obox(cam, [q.piv[0], 3, q.piv[2]], [[1, 0, 0], UP], [22, 3, 22], GR.C.frame), ...visLine(bar(cam, a, b, 16, 5.2), a, b, cam, F, q), ...bar(cam, add(h, mul(u, -30)), add(h, mul(u, 10)), 2, 7.6).map((i, n) => n == 1 ? { ...i, hand: 'R' } : i), GR.disc(cam, add(h, mul(u, -24)), u, 40, 9)]; };
      }
      else {
        /* la espalda recta e inclinada (unos 40° sobre el suelo; con agarre supino, unos 45°), las espinillas casi
           verticales y el muslo lo justo para que el peso, el del cuerpo con el de la barra, caiga sobre el medio del pie. En el
           Pendlay la espalda va casi paralela al suelo y las rodillas, más dobladas, como al empezar un peso muerto: la barra
           sale del suelo cada vez */
        const ps = pend ? 10 : 3, load = tb ? .3 : .4;
        const mk = (lean, pt) => { const lr = legRoot(30, 0, 8, ps, pt); return { root: lr.root, ...trunk(lean), neck: -.2 * lean, feet: both(() => [30, 0, 8]), knee: both(() => lr.knee), shrug: 2, reach: 4 }; };
        /* arriba, donde la barra llega al cuerpo: la parte baja del pecho (con agarre supino, la boca del estómago; en el T, el asa
           delante del pecho) */
        const topOf = F => at(F.thorax, supine ? [0, 8, 34] : tb ? [0, 2, 50] : [0, 24, 34]);
        /* el eje del T, en el suelo detrás: el asa va por el arco que hace la barra alrededor de él */
        const pivOf = F => { const c = topOf(F); return [0, 6, c[2] - 340]; };
        const onArc = (F, y) => { const c = topOf(F), p = pivOf(F), R = len(sub(c, p)); return [0, y, p[2] + sqrt(max(0, R * R - (y - p[1]) ** 2))]; };
        /* abajo, con los brazos estirados: la barra en la vertical de donde acaba (sube recta), el asa del T en su arco y, en el
           Pendlay, la barra en el suelo sobre el medio del pie */
        const botOf = (q, F) => {
          if (pend) return [0, 49, midFoot(F, 20)[2]];
          const S = shC(F, q);
          if (tb) return onArc(F, solve(y => { const c = onArc(F, y); return len(sub([gg, c[1], c[2]], add(S, [47, 0, 0]))) - 145; }, topOf(F)[1], 30));
          const c = topOf(F); return [0, armY(S, gg - 47, c[2]), c[2]];
        };
        const err = q => { const c = botOf(q, F_(q)), { F, J } = pose({ ...q, hands: hands2(c), elbow: both(() => el) }); return midFoot(F, 16)[2] - comOf(F, J, [[c, load]])[2]; };
        if (pend) {
          /* con cada inclinación, la cadera a la altura justa para llegar con los brazos estirados a la barra en el suelo; y la
             inclinación, la que deja el peso sobre el medio del pie */
          const fit = lean => solve(pt => { const q = mk(lean, pt), F = F_(q), S = shC(F, q), c = botOf(q, F); return armY(S, gg - 47, c[2]) - 49; }, -10, 88);
          const lean = solve(l => err(mk(l, fit(l))), 55, 89);
          body = mk(lean, fit(lean));
          rest = 'a';
        }
        /* en el T, el tronco casi paralelo al suelo (unos 20°) y el asa hasta la parte baja del pecho: con la barra entre las
           piernas desde su eje, detrás, es lo que la deja pasar holgada por debajo de los glúteos */
        else { const lean = tb ? 70 : supine ? 45 : 50; body = mk(lean, solve(pt => err(mk(lean, pt)), 4, 88)); }
        const F0 = F_(body), c0 = botOf(body, F0), c1 = topOf(F0);
        const barDir = tb ? { L: [0, 1, 0], R: [0, 1, 0] } : supine ? [-1, 0, 0] : [1, 0, 0];
        if (tb) {
          /* Remo T: a horcajadas sobre la barra, con el asa en V bajo ella, delante de dos discos pequeños (con discos grandes,
             arriba tocarían el pecho antes de tiempo) */
          const piv = pivOf(F0), R = len(sub(c1, piv));
          arms = t => { const c = add(piv, mul(norm(sub(mix(c0, c1, t), piv)), R)); return { reach: mix(4, -6, t), barC: c, hands: hands2(c), elbow: both(() => el), barDir, piv }; };
        /* la barra, a trozos cortos, cada uno detrás de lo que lo tapa desde la cámara (entre las piernas, los muslos y la
           pelvis) o, si nada lo tapa, delante del cuerpo */
        gear = (q, F, cam) => {
          const c = q.barC, u = norm(sub(c, q.piv)), { J } = pose(q), a = add(q.piv, mul(u, -8)), b = add(c, mul(u, 100)), n = 30;
          const segs = visTag(bar(cam, a, b, n, 5.2), Array.from({ length: n }, (_, i) => mix(a, b, (i + .5) / n)), cam, F, J);
          return [GR.obox(cam, [q.piv[0], 3, q.piv[2]], [[1, 0, 0], UP], [22, 3, 22], GR.C.frame), ...segs, GR.disc(cam, add(c, mul(u, 44)), u, 31, 6), GR.disc(cam, add(c, mul(u, 51)), u, 31, 6), ...GR.tube(cam, add(c, [0, 10, -10]), add(c, [0, 10, 10]), 3, STEEL, 1), ...['L', 'R'].flatMap(s => grip(cam, q.hands[s], [0, 1, 0], s, 7))]; 
        };
        }
        else {
          /* la barra sube recta (en la Smith, guiada por la máquina); en el Pendlay, al despegar del suelo, pasa por delante de
             las rodillas */
          const K = pose({ ...body, hands: ZERO, elbow: {} }).J.L.knee, g = y => exp(-(((y - K[1]) / 22) ** 2));
          const A = pend ? max(0, K[2] + 18 - mix(c0[2], c1[2], (K[1] - c0[1]) / (c1[1] - c0[1]))) : 0;
          arms = t => { const c = mix(c0, c1, t); c[2] += A * (g(c[1]) - mix(g(c0[1]), g(c1[1]), t)); return { reach: mix(4, -6, t), barC: c, grip: gg, hands: hands2(c), elbow: both(() => el), barDir }; };
        gear = (q, F, cam) => [...bb(q, cam), ...(smith ? [...GR.smithFrame(cam, q.barC[2]).map(i => ({ ...i, nf: true })), ...GR.smithHooks(cam, q.barC)] : [])];
        }
      }
      cam = meadows ? [-118, 14] : [-125, 14];
    }
    /* ── con mancuerna, a una mano: apoyado en el banco (rodilla y mano izquierdas) o, el Kroc, con la mano en un apoyo ── */
    else if (w('db')) {
      one = true;
      const kroc = w('kroc');
      if (kroc) {
        /* el pie izquierdo delante, con la rodilla algo doblada, y el derecho detrás, casi estirado; la mano izquierda en un
           apoyo y el tronco, unos 35° sobre el suelo */
        const lr = legRoot(30, 34, 10, 6, 58);
        body = { root: lr.root, ...trunk(55), neck: -12, feet: { L: [30, 34, 10], R: [32, -40, 16] }, knee: { L: lr.knee, R: [.1, 0, 1] } };
        body.feet.R = backFoot(body, 'R', 16, 32, 16);
      }
      else {
        /* la rodilla izquierda en el banco, la espinilla sobre él y el pie colgando por detrás; la mano izquierda en el banco,
           con el brazo estirado; el pie derecho en el suelo. El tronco queda algo más alto por delante (unos 30°) */
        const root = [0, 190, -38], mk = lean => ({ root, ...trunk(lean), neck: -18, feet: { L: [18, -96, 180, 91, 55], R: [28, -30, 10] }, knee: { L: [0, -.3, 1], R: [.2, 0, 1] } });
        /* el tronco se inclina lo justo para que el brazo izquierdo, estirado, llegue con la mano al banco */
        const want = 105 + sqrt(145 ** 2 - 21 ** 2);
        body = mk(solve(l => { const b = mk(l), { F } = pose({ ...b, hands: ZERO, elbow: {} }); return shoulder(F, 'L', b)[1] - want; }, 45, 85));
      }
      const { F: F0 } = pose({ ...body, hands: ZERO, elbow: {} });
      const hl = kroc ? add(shoulder(F0, 'L', body), [6, -128, 30]) : (() => { const S = shoulder(F0, 'L', body); return [26, 105, S[2]]; })();
      /* el brazo derecho sube hacia atrás con el antebrazo vertical: arriba, el codo pasa algo por encima de la espalda y la
         mancuerna queda al costado de la cintura, fuera del tronco; las escápulas se separan abajo y se juntan arriba */
      arms = t => {
        const reach = mix(6, -5, t), { H, hint } = armArc(shoulder(F0, 'R', { ...body, reach }), RAD(kroc ? 92 : 94) * t, [0, 0, -1], 'R', [.1, .2, -1], .13);
        return { reach, hands: { R: H, L: hl }, elbow: { R: hint, L: [.4, 0, -1] }, barDir: { R: [0, 0, 1], L: [1, 0, 0] }, fist: { L: false }, palm: { L: [0, -1, 0] } };
      };
      gear = (q, F, cam) => {
        const out = [...GR.dumbbell(cam, q.hands.R, [0, 0, 1], 'R', { R: 15.5 })];
        if (kroc) { const p = add(hl, [0, -6, 0]); out.push(...GR.under([GR.obox(cam, [p[0], p[1] / 2, p[2]], [[1, 0, 0], UP], [30, p[1] / 2, 22], GR.C.pad)])); }
        else out.push(...GR.under([GR.padAB(cam, [18, 94, -100], [18, 94, 112], UP, 30, 7), ...GR.leg(cam, [18, 87, -70]), ...GR.leg(cam, [18, 87, 84])]));
        return out;
      };
      cam = [-118, 16];
    }
    /* ── tumbado boca abajo en el banco inclinado (con apoyo en el pecho; el posterior, con los codos abiertos) ── */
    else if (w('chest')) {
      const rear = w('rear'), inc = 34;
      body = { root: [0, 112, 0], ...trunk(90 - inc), neck: -(90 - inc) * .3, feet: both(() => [22, -150, 6, 8, 34]), knee: both(() => [0, -1, -.15]) };
      const { F: F0 } = pose({ ...body, hands: ZERO, elbow: {} });
      /* los antebrazos cuelgan en vertical: en el remo, los codos suben hacia atrás pegados al cuerpo y las mancuernas quedan
         a los costados; en el posterior, los codos se abren hacia los lados hasta la altura de los hombros */
      const barDir = rear ? [1, 0, 0] : [0, 0, 1];
      arms = t => {
        const reach = mix(6, -5, t), arc = s => armArc(shoulder(F0, s, { ...body, reach }), RAD(rear ? 84 : 90) * t, rear ? add(sd(s, [1, 0, 0]), [0, 0, -.15]) : [0, 0, -1], s, rear ? [1, .2, -.1] : [.1, .2, -1], .1);
        const A = { L: arc('L'), R: arc('R') };
        return { reach, hands: both(s => A[s].H), elbow: both(s => A[s].hint), barDir };
      };
      gear = (q, F, cam) => {
        const n = mul(F0.thorax.z, -1), a = at(F0.thorax, [0, -40, 27]), b = at(F0.thorax, [0, 96, 27]);
        const seat = at(F0.pelvis, [0, -30, 10]);
        return [...pair(q, cam, barDir), ...GR.under([...GR.leg(cam, [0, seat[1] - 14, seat[2]]), ...GR.leg(cam, add(b, [0, -30, 0])), GR.padAB(cam, add(a, mul(n, -7)), add(b, mul(n, -7)), mul(n, -1), 28, 7)])];
      };
      cam = [-140, 18];
      feetOff = true;
    }
    /* ── sentado en la polea baja (V, agarre neutro, a una mano, retracción de escápulas) o alta, y en máquina ── */
    else if (w('cable') || w('machine')) {
      const high = w('high'), mach = w('machine'), scap = w('scap'), conv = w('converge');
      one = w('one');
      const seatY = mach || high ? 100 : 70;
      body = { root: [0, seatY + 22, 0], feet: mach || high ? both(() => [36, 80, 12]) : both(() => [22, 162, 4, 40, -30]), knee: both(() => [.15, .8, .7]) };
      const bodyAt = t => { const lean = scap ? 0 : mach ? mix(8, 2, t) : high ? mix(10, -6, t) : mix(22, -6, t); return { ...body, ...trunk(lean), neck: -.8 * lean, reach: scap ? mix(8, -8, t) : mix(6, -4, t) }; };
      const F0 = pose({ ...bodyAt(0), hands: ZERO, elbow: {} }).F, F1 = pose({ ...bodyAt(1), hands: ZERO, elbow: {} }).F;
      /* la polea (o la máquina): baja, a la altura de los pies; alta, por delante y arriba; en la máquina, el asa delante */
      const pul = high ? [0, 400, 230] : mach ? null : [0, 64, 196];
      const reachTo = (F, s, q, tgt, k = 140) => { const S = shoulder(F, s, q); return add(S, mul(norm(sub(tgt, S)), k)); };
      const end = s => mach ? T(F1, s, [44, 46, 6]) : high ? T(F1, s, [22, 74, 44]) : T(F1, s, one ? [32, 26, 26] : [16, 26, 48]);
      const start = s => { const q = bodyAt(0); if (mach) return add(shoulder(F0, s, q), sd(s, [-4 + (conv ? 14 : 0), -12, 138])); return reachTo(F0, s, q, add(pul, sd(s, [one ? 0 : 9, 0, 0])), scap ? 143 : 140); };
      const neutral = !w('bar');
      const barDir = neutral ? [0, 1, 0] : [1, 0, 0];
      arms = t => {
        const q = bodyAt(t);
        const H = s => scap ? (() => { const { F } = pose({ ...q, hands: ZERO, elbow: {} }); return reachTo(F, s, q, add(pul, sd(s, [9, 0, 0])), 143); })() : mix(start(s), end(s), t);
        const el = mach || one ? [.35, .2, -1] : high ? [.65, -.55, -.6] : [.55, .05, -1];
        if (one) { const { F } = pose({ ...q, hands: ZERO, elbow: {} }); return { hands: { R: H('R'), L: at(F.pelvis, [26, 8, 40]) }, elbow: { R: el, L: [.3, -.3, 1] }, barDir: { R: barDir, L: [1, 0, 0] }, fist: { L: false }, palm: { L: [0, -1, 0] } }; }
        return { hands: both(H), elbow: both(() => el), barDir };
      };
      const ret = arms;
      arms = t => ({ ...bodyAt(t), ...ret(t) });
      gear = (q, F, cam) => {
        const out = [];
        const s = at(F.pelvis, [0, -22, -8]), s0 = [0, s[1] - 7, s[2] - 26], s1 = add(s0, [0, 0, mach || high ? 60 : 110]);
        out.push(...GR.under([...GR.leg(cam, add(mix(s0, s1, .5), [0, -7, 0])), GR.padAB(cam, s0, s1, UP, 28, 7)]));
        if (mach) {
          /* el apoyo del pecho y las palancas de las asas, que cuelgan de un eje alto por delante */
          const ch = at(F.thorax, [0, 52, 31]);
          out.push(...GR.under([GR.padAB(cam, add(ch, [0, -32, 7]), add(ch, [0, 32, 7]), [0, 0, -1], 30, 7)], 1), ...GR.tube(cam, add(ch, [0, -40, 20]), [0, 8, ch[2] + 20], 6, GR.C.frame));
          const { J } = pose(q);
          (one ? ['R'] : ['L', 'R']).forEach(k => { const h = q.hands[k], pv = [h[0] + sd(k, [10, 0, 0])[0], 330, 170], e = add(h, sd(k, [10, 0, 0])); out.push(...visTag(GR.tube(cam, pv, e, 6, GR.C.frame, 10), Array.from({ length: 10 }, (_, i) => mix(pv, e, (i + .5) / 10)), cam, F, J), ...grip(cam, h, [0, 1, 0], k, 8)); });
          return out;
        }
        if (!high) {
          /* la plataforma de los pies, inclinada, y la polea baja delante */
          out.push(...GR.under([GR.obox(cam, [0, 52, 182], [[1, 0, 0], norm([0, .5, -1])], [36, 30, 4], GR.C.frame)], 2));
        }
        const hc = one ? q.hands.R : mix(q.hands.L, q.hands.R, .5);
        out.push(...visLine(GR.cableLine(cam, add(hc, [0, 0, 8]), pul), add(hc, [0, 0, 8]), pul, cam, F, q).map(i => high ? { ...i, nf: true } : i), GR.disc(cam, pul, [1, 0, 0], 8, 4, 'wheel'));
        if (one) out.push(...grip(cam, q.hands.R, [0, 1, 0], 'R', 8));
        else ['L', 'R'].forEach(k => { const h = q.hands[k]; out.push(...grip(cam, h, [0, 1, 0], k, 8), ...GR.tube(cam, add(h, [0, 8, 0]), add(hc, [0, 2, 8]), 3, STEEL, 1), ...GR.tube(cam, add(h, [0, -8, 0]), add(hc, [0, 2, 8]), 3, STEEL, 1)); });
        return out;
      };
      cam = [-128, 12];
      if (!mach && !high) feetOff = true;
    }
    /* ── invertido bajo una barra, y en anillas o TRX: el cuerpo recto de los talones a los hombros, que sube hasta las manos ── */
    else if (w('inverted') || w('rings')) {
      const rings = w('rings'), trx = w('trx');
      const yb = rings ? 0 : 190, L1 = LEN.thigh + LEN.shin - .6, L2 = 128;
      /* el ángulo del cuerpo con el suelo: abajo, los brazos estirados; arriba, el pecho en la barra (o en las manos) */
      let ph = t => RAD(rings ? mix(32, 52, t) : mix(9, 31, t));
      const ankle = [0, LEN.ankle, 150];
      /* el cuerpo recto con un ángulo a (en radianes) sobre el suelo, apoyado en los talones */
      const bodyAng = a => ({ root: add(ankle, [0, L1 * sin(a), -L1 * cos(a)]), tilt: -(90 - a / RAD(1)), spine: 0, neck: 8, feet: both(() => [22, ankle[2], 4, 0, -62]), knee: both(() => [0, 1, .2]), reach: -2 });
      const bodyAt = t => bodyAng(ph(t));
      const g = rings ? 26 : 70, zB = -96;
      if (!rings) {
        /* bajo la barra: el ángulo de cada momento, el que deja el hombro a la distancia de la mano que toca (los brazos
           estirados abajo; arriba, el pecho junto a la barra) */
        const armAt = a => { const q = bodyAng(a), { F } = pose({ ...q, hands: ZERO, elbow: {} }); return len(sub(add([0, yb, zB], [g, 0, 0]), shoulder(F, 'L', q))); };
        const memo = {};
        ph = t => { const k = Math.round(t * 400); if (memo[k] == null) memo[k] = solve(a => mix(145, 60, t) - armAt(a), RAD(0), RAD(60), 16); return memo[k]; };
      }
      const F0 = pose({ ...bodyAt(0), hands: ZERO, elbow: {} }).F, F1 = pose({ ...bodyAt(1), hands: ZERO, elbow: {} }).F;
      const anchor = [0, 560, shC(F0, bodyAt(0))[2] - 60];
      const top = s => rings ? T(F1, s, [24, 58, 44]) : add([0, yb, zB], sd(s, [g, 0, 0]));
      const bot = s => rings ? add(shoulder(F0, s, bodyAt(0)), mul(norm(sub(add(anchor, sd(s, [20, 0, 0])), shoulder(F0, s, bodyAt(0)))), 143)) : top(s);
      arms = t => ({ ...bodyAt(t), hands: both(s => rings ? mix(bot(s), top(s), t) : top(s)), elbow: both(() => rings ? [.35, -.3, .4] : [.55, -.4, .3]), barDir: rings ? [0, 1, 0] : [1, 0, 0] });
      gear = (q, F, cam) => {
        if (rings) return ['L', 'R'].flatMap(s => { const h = q.hands[s], A = add(anchor, sd(s, [20, 0, 0])); return [...GR.strap(cam, [h, A], 2.6, GR.C.strap).map(i => ({ ...i, nf: true })), ...(trx ? grip(cam, h, [0, 1, 0], s, 7) : [ringAt(cam, h, s)])]; });
        const c = [0, yb, q.hands.L[2]];
        return [...barbell(cam, c, g), ...GR.sideFade([-1, 1].flatMap(k => GR.tube(cam, [k * 128, 0, c[2]], [k * 128, 300, c[2]], 6, GR.C.frame, 6).map(i => ({ ...i, nf: true }))))];
      };
      cam = [-62, 16];
      feetOff = true;
    }
    /* ── con banda: sentado en el suelo con la banda en los pies, o de pie con la banda sujeta delante ── */
    else if (w('bandsit') || w('band')) {
      const sit = w('bandsit');
      body = sit ? { root: [0, 26, 0], feet: both(() => [18, 160, 4, 4, -28]), knee: both(() => [.1, 1, .3]) }
        : { root: [0, LEN.ankle + LEN.shin + LEN.thigh - 5, 0], feet: { L: [26, 14, 10], R: [26, -14, 10] }, knee: both(() => [.2, 0, 1]) };
      const bodyAt = t => { const lean = sit ? mix(14, -6, t) : mix(6, -2, t); return { ...body, ...trunk(lean), neck: -.8 * lean, reach: mix(5, -5, t) }; };
      const F0 = pose({ ...bodyAt(0), hands: ZERO, elbow: {} }).F, F1 = pose({ ...bodyAt(1), hands: ZERO, elbow: {} }).F;
      const anchor = sit ? null : [0, 236, 250];
      const tgt = s => sit ? at(F0['foot' + s], [0, -6, 26]) : add(anchor, sd(s, [6, 0, 0]));
      const start = s => { const S = shoulder(F0, s, bodyAt(0)); return add(S, mul(norm(sub(tgt(s), S)), 140)); };
      const end = s => T(F1, s, sit ? [26, 26, 42] : [28, 52, 38]);
      arms = t => ({ ...bodyAt(t), hands: both(s => mix(start(s), end(s), t)), elbow: both(() => [.5, .05, -1]), barDir: [0, 1, 0] });
      /* sentado, la banda rodea las plantas de los pies; de pie, sale de un anclaje delante, a la altura del pecho */
      gear = (q, F, cam) => ['L', 'R'].flatMap(s => GR.bandLoop(cam, sit ? at(F['foot' + s], [0, -6, 26]) : add(anchor, sd(s, [6, 0, 0])), q.hands[s], 110, [0, 1, 0], 4)).concat(sit ? [] : [GR.obox(cam, anchor, [[1, 0, 0], UP], [6, 9, 4], GR.C.frame)]);
      cam = [-118, 14];
      if (sit) feetOff = true;
    }
    if (!arms) return null;
    const self = {
      view: 'back', up, rest, cam, one, feetOff,
      at(t) { const a = arms(t); return { ...(body || {}), ...a }; },
      gear(q, F, cam) { return gear(q, F, cam); },
    };
    return self;
  };
  /* una anilla (vista de canto o de frente según la cámara), en la mano s */
  const ringAt = (cam, h, s) => {
    const c = add(h, [0, 6, 0]), P = cam.P(c), u = cam.P(add(c, [0, 1, 0])), r = 11;
    return { z: P[2] + .5, hand: s, svg: `<ellipse cx="${(P[0]).toFixed(1)}" cy="${(P[1] - 2).toFixed(1)}" rx="${(r * .55).toFixed(1)}" ry="${r}" fill="none" stroke="#0a0b10" stroke-width="5"/><ellipse cx="${(P[0]).toFixed(1)}" cy="${(P[1] - 2).toFixed(1)}" rx="${(r * .55).toFixed(1)}" ry="${r}" fill="none" stroke="#c9b98f" stroke-width="3"/>` };
  };

  /* ════ dominadas y colgados ════ */
  /* las piernas, colgando: la cadera flexionada a grados (hacia delante) y la rodilla b grados (la espinilla, atrás); da el
     tobillo en el marco de la pelvis (lado izquierdo) y el pie, con la punta estirada pf grados */
  const legAt = (a, b, x = 14) => {
    const th = [0, -cos(RAD(a)), sin(RAD(a))], sh = [0, -cos(RAD(a - b)), sin(RAD(a - b))];
    return add(add([x, 0, 0], mul(th, LEN.thigh)), mul(sh, LEN.shin));
  };
  const footFrom = (F, s, local, kneeDir, pf = 30) => {
    const A = at(F.pelvis, sd(s, local)), K = at(F.pelvis, sd(s, add([local[0], 0, 0], mul(kneeDir, LEN.thigh))));
    const sh = norm(sub(A, K)), f0 = [0, sh[2], -sh[1]], th0 = atan2(f0[1], f0[2]) / RAD(1);
    return [abs(A[0]), A[2], 0, A[1] - LEN.ankle, pf - th0];
  };
  const pullup = f => {
    const w = x => has(f, x);
    const hang = w('hang'), scap = w('scap'), knees = w('knees'), legs = w('legs'), t2b = w('t2b'), kip = w('kip'), c2b = w('c2b');
    const chair = w('chair'), rings = w('rings'), towel = w('towel'), band = w('band'), machine = w('machine'), weight = w('weight');
    const one = w('one'), ecc = w('eccentric'), supine = w('supine'), neutral = w('neutral') || rings, wide = w('wide');
    const strict = !hang && !scap && !knees && !legs && !t2b && !kip && !c2b && !chair && !machine;
    /* ── en la silla romana (antebrazos en los apoyos, espalda en el respaldo) o en paralelas (brazos estirados) ── */
    if (chair) return captainsChair(knees);
    const g = wide ? 100 : supine ? 40 : neutral ? 32 : towel ? 44 : 64;
    const barDir = towel ? [0, 1, 0] : neutral ? { L: [0, 0, 1], R: [0, 0, -1] } : supine ? [-1, 0, 0] : [1, 0, 0];
    const elbow = wide ? [1, -.15, .25] : supine ? [.3, -.3, 1] : neutral ? [.55, -.3, .8] : [.85, -.25, .45];
    /* lo que mide cada brazo (hombro a mano), la inclinación del tronco (negativa: hacia atrás), los hombros (encogidos
       al colgar, abajo al tirar) y las piernas (cadera y rodilla), en cada momento */
    const P = t => {
      if (hang) return { d: 146, lean: 0, shrug: 10, a: 6, b: 18, sway: 5 * (t - .5) * 2 };
      if (scap) return { d: 146, lean: mix(0, -5, t), shrug: mix(10, -7, t), a: 6, b: 18 };
      if (knees || legs || t2b) {
        /* las piernas suben por delante: rodillas al pecho, piernas estiradas hasta la horizontal o los pies a la barra */
        const k = t2b ? mix(4, 150, t) : legs ? mix(4, 92, t) : mix(6, 112, t);
        return { d: t2b ? mix(146, 128, t) : 146, lean: t2b ? mix(0, -30, t) : mix(0, -8, t), shrug: mix(8, -2, t), a: k, b: knees ? mix(14, 105, t) : 4, pf: 40 };
      }
      if (kip) {
        /* el balanceo: arqueado (el pecho adelante, las piernas atrás) hasta el hueco (los pies delante) y el tirón */
        const s1 = span(t, 0, .4), s2 = span(t, .3, 1);
        return { d: mix(146, 50, s2), lean: mix(mix(12, -12, s1), -18, s2), shrug: mix(8, -4, s2), a: mix(mix(-18, 34, s1), 12, s2), b: mix(26, 8, s1), pf: 40 };
      }
      /* arriba: la barbilla (o el pecho) a la altura de la barra; con el agarre abierto, los hombros no pueden acercarse a las
         manos más de lo que las separan a lo ancho */
      const top = max(c2b ? 36 : supine ? 46 : 50, sqrt((g - 47) ** 2 + 30 ** 2) + 6);
      const lean = mix(0, c2b ? -24 : supine ? -10 : -16, t), legsOn = strict && !w('pullup') ? 0 : 1;
      return { d: mix(146, top, t), lean, shrug: mix(10, -4, t), a: machine ? 6 : band ? 12 : strict ? 6 : 14, b: machine ? 92 : band ? 70 : strict ? 8 : 62, pf: machine ? 10 : 35 };
    };
    /* el cuerpo de cada momento: los hombros a la distancia de las manos que toca y el centro de masas bajo la barra (que está
       a la altura yb) */
    const qAt = (t, z, yb) => {
      const p = P(t), base = { tilt: p.lean * .6, spine: p.lean * .4, neck: hang || scap ? 6 : mix(-6, 10, t), shrug: p.shrug, reach: 0 };
      const { F: F0 } = pose({ ...base, root: [0, 0, 0], feet: both(() => [20, 0, 0]), knee: both(() => [0, 0, 1]), hands: ZERO, elbow: {} });
      const sO = shoulder(F0, 'L', base), dx = one ? 8 : g - 47, dz = z + sO[2];
      const root = [0, yb - sqrt(max(0, p.d ** 2 - dx * dx - dz * dz)) - sO[1], z], q = { ...base, root };
      const { F } = pose({ ...q, feet: both(() => [20, 0, 0]), knee: both(() => [0, 0, 1]), hands: ZERO, elbow: {} });
      const kd = [0, -cos(RAD(p.a)), sin(RAD(p.a))], leg = legAt(p.a, p.b);
      let hands = both(s => sd(s, [g, yb, 0])), extra = {};
      if (one) { hands = { R: [-39, yb, 0], L: add(shoulder(F, 'L', q), [8, -143, 4]) }; extra = { fist: { L: false }, palm: { L: [-1, 0, 0] } }; }
      if (towel) hands = both(s => add(hands[s], [0, -26, 0]));
      return { ...q, feet: both(s => footFrom(F, s, leg, kd, p.pf != null ? p.pf : 30)), knee: both(() => [0, sin(RAD(p.a)), cos(RAD(p.a))]), hands, elbow: both(() => elbow), barDir, ...extra };
    };
    /* el disco del lastre: cuelga del cinturón por delante de los muslos (apoyado en ellos), a la altura de siempre */
    const plateAt = (F, J) => {
      const y = at(F.pelvis, [0, -62, 10])[1];
      const zf = max(...['L', 'R'].flatMap(s => [-26, 0, 26].map(dy => { const a = J[s].hip, b = J[s].knee, k = clamp((y + dy - a[1]) / ((b[1] - a[1]) || 1), 0, 1); return mix(a, b, k)[2]; })));
      return [0, y, zf + 19];
    };
    /* dónde queda el cuerpo (z) en cada momento, calculado una vez en 41 momentos: el centro de masas, bajo la barra */
    let ztab = null;
    const zAt = t => {
      if (!ztab) ztab = Array.from({ length: 41 }, (_, i) => { const tt = i / 40, tgt = P(tt).sway || 0; return solveNear(z => { const q = qAt(tt, z, 0), r = pose(q); return tgt - comOf(r.F, r.J, weight ? [[plateAt(r.F, r.J), .25]] : [])[2]; }, -80, 80, 0, 10); });
      const x = clamp(t, 0, 1) * 40, i = min(39, Math.floor(x));
      return mix(ztab[i], ztab[i + 1], x - i);
    };
    /* la barra, a la altura justa para que lo más bajo del cuerpo quede a un palmo del suelo */
    let yb = null;
    const barY = () => {
      if (yb == null) { const low = t => { const { J } = pose(qAt(t, zAt(t), 0)); return min(J.L.ankle[1], J.R.ankle[1], J.L.knee[1] - 8, J.R.knee[1] - 8); }; yb = -min(low(0), low(.5), low(1)) + (machine ? 70 : 44); }
      return yb;
    };
    const self = {
      view: 'back', up: 'b', rest: 'a', cam: knees || legs || t2b ? [-32, 6] : [-152, 8], one, feetOff: true,
      at(t) { return qAt(t, zAt(t), barY()); },
      gear(q, F, cam) {
        const out = [], yb = barY();
        if (rings) {
          ['L', 'R'].forEach(s => { const h = q.hands[s]; out.push(...GR.strap(cam, [add(h, [0, 12, 0]), [sd(s, [g + 4, 0, 0])[0], yb + 160, 0]], 2.6, GR.C.strap).map(i => ({ ...i, nf: true })), ringAt(cam, h, s)); });
          return out;
        }
        /* la barra entre dos postes (los postes, fuera del encuadre) */
        const bx = wide ? 150 : 128;
        const segs = bar(cam, [-bx, yb, 0], [bx, yb, 0], 12, 5.2);
        segs.forEach((i, n) => { const x = -bx + (n + .5) * 2 * bx / 12; ['L', 'R'].forEach(s => { if (q.hands[s] && !towel && abs(x - q.hands[s][0]) < 14 && !(one && s == 'L')) i.hand = s; }); });
        out.push(...segs, ...GR.sideFade([-1, 1].flatMap(k => GR.tube(cam, [k * (bx + 6), yb + 30, 0], [k * (bx + 6), 0, 0], 7, GR.C.frame, 8).map(i => ({ ...i, nf: true })))));
        if (neutral && !rings) ['L', 'R'].forEach(s => out.push(...GR.tube(cam, add(q.hands[s], [0, 0, -14]), add(q.hands[s], [0, 0, 14]), 4, STEEL, 1).map(i => ({ ...i, hand: s })), ...GR.tube(cam, add(q.hands[s], [0, 0, -14]), [q.hands[s][0], yb, -14], 3, STEEL, 1)));
        /* la toalla: cuelga de la barra y entra en el puño, que tapa su final */
        if (towel) ['L', 'R'].forEach(s => { const h = q.hands[s]; [-4, 4].forEach(dx => out.push(...GR.strap(cam, [[h[0] + dx, yb + 4, 0], add(h, [dx, 2, 0])], 4.5, ['#d9dce6', '#0a0b10']).map(i => ({ ...i, hand: s })))); });
        /* la banda, en lazo alrededor de la barra y por debajo de las rodillas: abajo, estirada; arriba, casi suelta */
        if (band) {
          /* tensa, va en línea recta salvo donde se apoya: rodea por delante la cara y el pecho (la envolvente, vista de lado) */
          const { J } = pose(q), K = add(mix(J.L.knee, J.R.knee, .5), [0, -7, 0]), A = [0, yb + 3, 0];
          const obst = [[0, 14, 19], [0, 2, 21], [0, -10, 18]].map(p => at(F.head, p)).concat([88, 68, 48, 28].map(y => at(F.thorax, [0, y, 35])));
          const P = [A, ...obst.filter(o => o[1] < A[1] && o[1] > K[1]).sort((u, v) => v[1] - u[1]), K], path = [];
          for (const p of P) {
            while (path.length >= 2) { const [o, a] = path.slice(-2), cr = (o[1] - a[1]) * (p[2] - o[2]) - (a[2] - o[2]) * (o[1] - p[1]); if (cr >= 0) path.pop(); else break; }
            path.push(p);
          }
          const l = path.slice(1).reduce((s, p, i) => s + len(sub(p, path[i])), 0), wd = max(1.6, min(4, 3.4 * sqrt(170 / l)));
          let run = 0;
          const fr = path.map((p, i) => i ? (run += len(sub(p, path[i - 1]))) / l : 0);
          [-1, 1].forEach(k => out.push(...GR.strap(cam, path.map((p, i) => add(p, [0 + k * 5 * mix(1, .45, fr[i]), 0, 0])), wd, GR.C.band)));
        }
        if (weight) { const p = plateAt(F, pose(q).J); out.push(...GR.strap(cam, [at(F.pelvis, [-14, 6, 18]), p, at(F.pelvis, [14, 6, 18])], 1.4, [GR.C.cable, '#0a0b10']), GR.disc(cam, p, [0, 0, 1], 30, 6)); }
        if (machine) {
          /* el apoyo, bajo las espinillas (de la rodilla hacia atrás), y su columna hasta el suelo */
          const { J } = pose(q), kn = mix(J.L.knee, J.R.knee, .5), an = mix(J.L.ankle, J.R.ankle, .5), d = norm(sub(an, kn)), n = norm(sub(UP, mul(d, dot(UP, d))));
          const c = add(add(kn, mul(d, 30)), mul(n, -14));
          out.push(...GR.under([GR.obox(cam, c, [[1, 0, 0], n], [34, 5, 36], GR.C.pad), ...GR.tube(cam, add(c, [0, -6, 0]), [0, 0, c[2]], 6, GR.C.frame)]));
        }
        return out;
      },
    };
    /* excéntricas: arriba de un salto (deprisa) y abajo muy despacio; el kipping, sin pausas, como un péndulo */
    if (ecc) self.beat = ms => { const x = ms % 5000; return x < 500 ? 0 : x < 1100 ? L.ease((x - 500) / 600) : x < 1400 ? 1 : x < 4600 ? 1 - (x - 1400) / 3200 : 0; };
    if (kip || c2b && !strict) self.beat = ms => { const x = ms % 1700; return x < 850 ? L.ease(x / 850) : 1 - L.ease((x - 850) / 850); };
    if (hang) self.beat = ms => .5 + .5 * sin(ms / 1000 * 2 * PI / 3.2);
    return self;
  };
  /* la silla romana (rodillas: antebrazos en los apoyos, la espalda en el respaldo) y las paralelas (piernas estiradas, con
     los brazos estirados sobre las barras): las piernas suben por delante */
  const captainsChair = knees => {
    const root = [0, 206, 0];
    const bodyAt = t => ({ root, tilt: -3, spine: 0, neck: 4, shrug: knees ? 4 : -2 });
    const { F: F0 } = pose({ ...bodyAt(0), feet: both(() => [20, 0, 0]), knee: both(() => [0, 0, 1]), hands: ZERO, elbow: {} });
    return {
      view: 'front', up: 'b', rest: 'a', cam: [-34, 8], feetOff: true,
      at(t) {
        const b = bodyAt(t), a = knees ? mix(8, 108, t) : mix(6, 90, t), bb2 = knees ? mix(14, 102, t) : 4;
        const leg = legAt(a, bb2), kd = [0, -cos(RAD(a)), sin(RAD(a))];
        const feet = both(s => footFrom(F0, s, leg, kd, 36));
        /* los antebrazos en los apoyos (codos a 90°) o, en paralelas, los brazos estirados con las manos en las barras */
        const hands = knees ? both(s => T(F0, s, [52, 4, 72])) : both(s => add(shoulder(F0, s, b), sd(s, [12, -143, 4])));
        return { ...b, feet, knee: both(() => [0, .2, 1]), hands, elbow: both(() => knees ? [.2, -1, -.3] : [.1, 0, -1]), barDir: { L: [0, 0, 1], R: [0, 0, -1] } };
      },
      gear(q, F, cam) {
        const out = [];
        if (knees) {
          /* los apoyos de los antebrazos, los asideros y el respaldo */
          const back = at(F0.thorax, [0, 20, -36]);
          out.push(...GR.under([GR.padAB(cam, at(F0.thorax, [0, -40, -33]), at(F0.thorax, [0, 70, -33]), F0.thorax.z, 26, 6)]));
          ['L', 'R'].forEach(s => { const { J } = pose(q), e = J[s].el, h = q.hands[s]; out.push(...GR.under([GR.padAB(cam, add(e, [0, -11, -10]), add(h, [0, -11, -8]), UP, 9, 4)], 1), ...grip(cam, h, [0, 1, 0], s, 7)); });
          out.push(...GR.tube(cam, add(back, [0, -40, -8]), [0, 0, back[2] - 8], 7, GR.C.frame, 4).map(i => ({ ...i, z: -1e6 })));
        }
        else ['L', 'R'].forEach(s => { const h = q.hands[s]; out.push(...bar(cam, add(h, [0, 0, -60]), add(h, [0, 0, 70]), 6, 5.2).map(i => ({ ...i, hand: abs(i.z - cam.P(h)[2]) < 6 ? s : undefined })), ...GR.tube(cam, add(h, [0, 0, -54]), [h[0], 0, h[2] - 54], 6, GR.C.frame, 4), ...GR.tube(cam, add(h, [0, 0, 64]), [h[0], 0, h[2] + 64], 6, GR.C.frame, 4)); });
        return out;
      },
    };
  };

  F3.FAMILIES.pulldown = pulldown;
  F3.FAMILIES.row = row;
  F3.FAMILIES.pullup = pullup;
})(window);
