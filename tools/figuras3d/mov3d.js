/* ═══ figuras 3D: los ejercicios ═══
   Cada familia de movimiento (sentadilla, press de banca, press de hombro) recibe las variantes de un ejercicio (las
   palabras de su tabla: el material, el banco, el agarre…) y devuelve su figura para el motor: la cámara, qué extremo es
   el final del esfuerzo, la postura en cada momento del gesto (at, de 0 a 1) y el material (gear).
   Las posturas salen de reglas físicas y no de fotogramas hechos a mano: los pies no se mueven del suelo, las piernas se
   doblan desde los tobillos (las rodillas, hacia las puntas de los pies) y el tronco se inclina lo justo para que el centro
   de masas del cuerpo y la carga quede sobre el medio del pie; en la Smith, lo justo para que la barra suba y baje por sus
   guías. En el banco, la barra toca el pecho con los antebrazos casi verticales y acaba sobre los hombros.
   Define: Fig3D.FAMILIES, Fig3D.make */
(function (G) {
  const F3 = G.Fig3D, L = F3.lib, GR = F3.gear;
  const { add, sub, mul, dot, len, norm, mix, ease, clamp, at, RAD, LEN, barbell, bar, plate } = L;
  const { cos, sin, PI, abs, max, min, sqrt, atan2 } = Math;
  const has = (f, w) => f.includes(w);
  const pose = F3.pose;
  const ZERO = { L: [0, 0, 0], R: [0, 0, 0] };
  const UP = [0, 1, 0];
  /* un punto o una dirección dados para el lado izquierdo, en el lado s (el derecho, en espejo) */
  const sd = (s, p) => s == 'L' ? p : [-p[0], p[1], p[2]];
  const both = fn => ({ L: fn('L'), R: fn('R') });
  const T = (F, s, p) => at(F.thorax, sd(s, p));
  const shoulder = (F, s, q) => at(F.thorax, sd(s, [47, 80 + (q && q.shrug || 0), -2 + (q && q.reach || 0)]));
  /* un tramo del gesto: de 0 a 1 entre a y b, suave en los dos extremos */
  const span = (t, a, b) => ease(clamp((t - a) / (b - a), 0, 1));

  /* ── el equilibrio ── */
  /* el centro de masas: cada segmento con su parte del peso del cuerpo (de Leva) y la carga, con la suya (1 = lo que pesa
     el cuerpo) */
  const MASS = { head: .081, thorax: .3, pelvis: .2, upper: .028, fore: .022, thigh: .1, shin: .061 };
  const comOf = (F, J, load) => {
    let m = 0, c = [0, 0, 0];
    const put = (p, w) => { c = add(c, mul(p, w)); m += w; };
    put(at(F.head, [0, 4, 2]), MASS.head);
    put(at(F.thorax, [0, 50, 0]), MASS.thorax);
    put(at(F.pelvis, [0, 15, 0]), MASS.pelvis);
    ['L', 'R'].forEach(s => {
      const j = J[s];
      put(mix(j.sh, j.el, .44), MASS.upper); put(mix(j.el, j.fist, .5), MASS.fore);
      put(mix(j.hip, j.knee, .43), MASS.thigh); put(mix(j.knee, j.ankle, .5), MASS.shin);
    });
    (load || []).forEach(([p, w]) => put(p, w));
    return mul(c, 1 / m);
  };
  /* el medio del pie (donde cae el peso cuando se está en equilibrio): algo por delante del tobillo */
  const midFoot = (F, k = 14) => mul(add(at(F.footL, [0, 0, k]), at(F.footR, [0, 0, k])), .5);
  /* de pie y sin barra, el centro de masas cae algo más cerca del tobillo (unos 5 cm por delante) */
  const COP = 9;
  /* bisección: el valor de x entre lo y hi con f(x) = 0 */
  const solve = (f, lo, hi, n = 18) => {
    let flo = f(lo);
    for (let i = 0; i < n; i++) { const m = (lo + hi) / 2, fm = f(m); if ((fm > 0) == (flo > 0)) { lo = m; flo = fm; } else hi = m; }
    return (lo + hi) / 2;
  };
  /* como solve, pero si hay más de una solución (cuando la carga va en los brazos, el equilibrio no siempre crece con la
     inclinación), la más cercana a near: así no salta de una a otra entre un fotograma y el siguiente */
  const solveNear = (f, lo, hi, near, step = 5) => {
    let best = null, a = lo, fa = f(a);
    for (let b = lo + step; b <= hi + 1e-9; b += step) {
      const fb = f(b);
      if ((fa > 0) != (fb > 0)) { const r = solve(f, a, b, 12); if (best == null || abs(r - near) < abs(best - near)) best = r; }
      a = b; fa = fb;
    }
    return best == null ? (abs(f(lo)) < abs(f(hi)) ? lo : hi) : best;
  };
  /* la cadera desde los tobillos: la espinilla, ps grados hacia delante (hacia la punta del pie), y el muslo, pt grados sobre
     la horizontal; da la raíz (el centro de las caderas) y hacia dónde sale la rodilla, en el lado izquierdo */
  const legRoot = (w, za, toe, ps, pt) => {
    const A = [w, LEN.ankle, za], d = [sin(RAD(toe)), 0, cos(RAD(toe))];
    /* de pie, la pierna va recta de la cadera al tobillo (con los pies abiertos, la espinilla se inclina hacia dentro); al
       bajar, la rodilla sale hacia la punta del pie */
    const lat = -(w - 20) / (LEN.thigh + LEN.shin) * max(0, 1 - ps / 15);
    const K = add(A, mul(norm(add(mul(d, sin(RAD(ps))), [lat, cos(RAD(ps)), 0])), LEN.shin));
    const dx = 20 - K[0], vy = min(LEN.thigh * sin(RAD(pt)), sqrt(max(0, LEN.thigh ** 2 - dx * dx)) - .05);
    const H = [20, K[1] + vy, K[2] - sqrt(max(0, LEN.thigh ** 2 - dx * dx - vy * vy))];
    const ax = norm(sub(A, H)), kb = sub(K, add(H, mul(ax, dot(sub(K, H), ax)))), wk = clamp(len(kb) / 5, 0, 1);
    return { root: [0, H[1], H[2]], knee: norm(add(mul(norm(kb), wk), mul(d, 1 - wk))) };
  };

  /* ── el material de las figuras ── */
  const bb = (q, cam) => barbell(cam, q.barC, q.grip);
  const pair = (q, cam, axis) => ['L', 'R'].flatMap(s => GR.dumbbell(cam, q.hands[s], q.barDir && q.barDir[s] ? q.barDir[s] : axis || [1, 0, 0], s));

  /* ════ sentadillas ════ */
  const squat = f => {
    /* los pies (medio ancho del tobillo, adelante, apertura de la punta), la espinilla y el muslo arriba y abajo */
    const V = { w: 40, za: 0, toe: 20, ps: [3, 33], pt: [93.5, -8], view: 'front', up: 'a', lean: [2, 45], top: 10 };
    let arms, gear = () => [], track = null, fixed = null, note = '';
    const backBar = F => { const c = at(F.thorax, [0, 90, -26]); return { barC: c, grip: 80, hands: { L: add(c, [80, 0, 0]), R: add(c, [-80, 0, 0]) }, elbow: both(() => [.25, -1, -.45]), shrug: 3, load: [[c, 1]] }; };
    const hanging = (F, s, out = 12) => add(shoulder(F, s), sd(s, [out, -143, 3]));
    if (has(f, 'front')) {
      /* la barra sobre la parte de delante de los hombros, los codos altos y hacia delante */
      Object.assign(V, { w: 38, ps: [5, 38] });
      V.lean = [0, 28];
      track = (q, F) => q.barC[2] - midFoot(F)[2];
      /* la muñeca doblada hacia atrás (el puño encima de ella): así el antebrazo sale hacia delante y los codos quedan altos */
      arms = F => { const c = at(F.thorax, [0, 98, 16]), hd = s => norm(sub(T(F, s, [.4, 1, -.2]), F.thorax.o)); return { barC: c, grip: 54, hands: { L: add(c, [54, 0, 0]), R: add(c, [-54, 0, 0]) }, handDir: both(hd), elbow: both(() => [.2, -.3, 1]), shrug: 4, reach: 10, load: [[c, 1]] }; };
      gear = (q, F, cam) => bb(q, cam);
    }
    else if (has(f, 'zercher')) {
      /* la barra en el pliegue de los codos, delante del vientre; las manos juntas a la altura de la barbilla */
      Object.assign(V, { w: 40, ps: [5, 38], lean: [0, 30] });
      arms = F => ({ hands: both(s => T(F, s, [6, 88, 40])), elbow: both(() => [.18, -1, .6]), barDir: [0, 1, 0], load: (F2, J) => [[crooks(J).c, 1]] });
      gear = (q, F, cam) => { const J = pose(q).J; return olympic(cam, crooks(J).c, x => abs(x) < abs(crook(J.L)[0] - crooks(J).c[0]) + 6 ? ['foreL', 'foreR'] : null); };
    }
    else if (has(f, 'ssb')) {
      /* la barra de seguridad: el yugo acolchado sobre los trapecios y las asas hacia delante, por encima de los hombros */
      Object.assign(V, { w: 42, ps: [4, 34] });
      arms = F => ({ hands: both(s => T(F, s, [25, 84, 40])), elbow: both(() => [.35, -1, .15]), barDir: both(s => norm(sub(T(F, s, [25, 84, 40]), T(F, s, [26, 99, -8])))), shrug: 3, load: [[at(F.thorax, [0, 72, -6]), 1]] });
      gear = (q, F, cam) => ssbBar(cam, F);
    }
    else if (has(f, 'sides')) {
      /* una mancuerna en cada mano, colgando a los lados, con las palmas hacia dentro */
      Object.assign(V, { w: 30, toe: 12, ps: [4, 31] });
      arms = F => ({ hands: both(s => hanging(F, s, 17)), elbow: both(() => [.1, 0, -1]), barDir: [0, 0, 1], load: [[hanging(F, 'L', 17), .17], [hanging(F, 'R', 17), .17]] });
      gear = (q, F, cam) => pair(q, cam, [0, 0, 1]);
    }
    else if (has(f, 'sumo')) {
      /* pies muy abiertos y puntas hacia fuera; una mancuerna colgando entre las piernas, cogida por arriba con las dos manos */
      Object.assign(V, { w: 68, toe: 38, ps: [3, 25], pt: [86, -2] });
      const hand = (F, s) => add(mul(add(shoulder(F, 'L'), shoulder(F, 'R')), .5), sd(s, [6, -139, 6]));
      arms = F => ({ hands: both(s => hand(F, s)), elbow: both(() => [.3, 0, -1]), fist: false, palm: both(() => [-1, 0, 0]), load: [[add(hand(F, 'L'), [-6, -20, 0]), .3]] });
      gear = (q, F, cam) => { const c = add(mul(add(q.hands.L, q.hands.R), .5), [0, -11, 0]); return GR.dumbbell(cam, c, UP, null, { handle: 15 }); };
    }
    else if (has(f, 'goblet')) {
      Object.assign(V, { w: 38, toe: 22, ps: [5, 37] });
      if (has(f, 'kb')) {
        /* la kettlebell por los cuernos del asa, delante del pecho, con la bola hacia abajo */
        arms = F => { const h = T(F, 'L', [0, 60, 33]); return { hands: both(s => add(h, sd(s, [10.5, -3, 0]))), elbow: both(() => [.32, -1, .1]), barDir: [0, 1, 0], load: [[add(h, [0, -24, 0]), .2]] }; };
        gear = (q, F, cam) => { const h = add(mul(add(q.hands.L, q.hands.R), .5), [0, 6, 0]); return GR.kettlebell(cam, add(h, add(mul(F.thorax.z, 3), [0, -27, 0])), h, F.thorax.x, null); };
      }
      else if (has(f, 'bag')) {
        /* el saco apoyado en los pliegues de los codos, contra el pecho, y las manos agarrándolo por arriba */
        arms = F => ({ hands: both(s => T(F, s, [17, 70, 50])), elbow: both(() => [.2, -1, .55]), barDir: [0, 1, 0], load: (F2, J) => [[bagAt(J), .4]] });
        gear = (q, F, cam) => GR.sandbag(cam, bagAt(pose(q).J), [1, 0, 0], 56, 23).map(i => ({ ...i, below: ['foreL', 'foreR'], above: ['trunk'] }));
      }
      else {
        /* la mancuerna de pie, delante del esternón, con las manos abiertas bajo la cabeza de arriba */
        arms = F => { const h = T(F, 'L', [0, 60, 35]); return { hands: both(s => add(h, sd(s, [9, 0, 2]))), elbow: both(() => [.28, -1, .12]), fist: false, palm: both(() => [-1, .3, 0]), load: [[add(h, [0, -20, 0]), .3]] }; };
        gear = (q, F, cam) => GR.dumbbell(cam, add(mul(add(q.hands.L, q.hands.R), .5), [0, -14, 0]), UP, null, { handle: 15 });
      }
    }
    else if (has(f, 'band')) {
      /* la banda pisada bajo los pies y las asas a la altura de los hombros */
      Object.assign(V, { w: 38, ps: [5, 36] });
      arms = F => ({ hands: both(s => T(F, s, [44, 90, 22])), elbow: both(() => [.3, -.55, .9]), shrug: 2, load: [[T(F, 'L', [0, 90, 22]), .25]] });
      gear = (q, F, cam) => bands(cam, F, q);
    }
    else if (has(f, 'oh')) {
      /* la barra arriba, con los brazos estirados y agarre muy abierto, siempre sobre el medio del pie */
      Object.assign(V, { w: 44, toe: 24, ps: [3, 46], pt: [90, -12], lean: [0, 22] });
      arms = F => {
        const m = midFoot(F), sh = shoulder(F, 'L'), c0 = mul(add(sh, shoulder(F, 'R')), .5), dz = m[2] - c0[2];
        const c = [0, c0[1] + sqrt(max(0, 146 ** 2 - (112 - 47) ** 2 - dz * dz)), m[2]];
        return { barC: c, grip: 112, hands: { L: add(c, [112, 0, 0]), R: add(c, [-112, 0, 0]) }, elbow: both(() => [.45, 0, -1]), shrug: 6, load: [[c, .6]] };
      };
      gear = (q, F, cam) => bb(q, cam);
    }
    else if (has(f, 'trx')) {
      /* las asas del TRX con los brazos estirados hacia el anclaje; el TRX sostiene, así que el tronco no tiene que equilibrar */
      Object.assign(V, { w: 36, ps: [4, 30], pt: [87, -12] });
      fixed = [-3, 16];
      const anchor = s => sd(s, [14, 520, 300]);
      arms = F => ({ hands: both(s => { const sh = shoulder(F, s); return add(sh, mul(norm(sub(anchor(s), sh)), 140)); }), elbow: both(() => [.3, -1, 0]) });
      gear = (q, F, cam) => ['L', 'R'].flatMap(s => GR.strap(cam, [q.hands[s], anchor(s)], 2.6, GR.C.strap).map(i => ({ ...i, nf: true })));
    }
    else if (has(f, 'jump')) return jumpSquat(f);
    else {
      /* barra alta, sobre los trapecios */
      arms = backBar;
      V.view = 'back';
      V.top = 9;
      track = (q, F) => q.barC[2] - midFoot(F)[2];
      gear = (q, F, cam) => bb(q, cam);
      if (has(f, 'box')) {
        /* sentado atrás, hasta tocar la caja con el muslo paralelo; las espinillas casi verticales */
        Object.assign(V, { w: 46, toe: 24, ps: [2, 20], pt: [91, 0], lean: [2, 48] });
        let boxAt = null;
        gear = (q, F, cam, ex) => {
          if (!boxAt) { const { F: Fb } = pose(ex.at(1)); const g = at(Fb.pelvis, [0, -27, -16]); boxAt = [g[1] - 2, g[2] - 6]; }
          return [...bb(q, cam), ...GR.under([GR.obox(cam, [0, boxAt[0] / 2, boxAt[1]], [[1, 0, 0], UP], [42, boxAt[0] / 2, 24], GR.C.pad)])];
        };
      }
      if (has(f, 'smith')) {
        /* la barra va por las guías: el tronco se inclina lo justo para que no se salga de ellas; los pies, algo por delante
           (en el hack, bastante más, y el cuerpo casi vertical) */
        const hack = has(f, 'hack');
        Object.assign(V, hack ? { w: 34, za: 38, toe: 14, ps: [2, 40], pt: [86, -6] } : { w: 40, za: 14, toe: 18, ps: [3, 28], pt: [87, -6] });
        track = (q, F) => q.barC[2];
        V.lean = [-15, 40];
        gear = (q, F, cam) => [...bb(q, cam), ...GR.smithFrame(cam, 0).map(i => ({ ...i, nf: true })), ...GR.smithHooks(cam, q.barC)];
      }
    }
    const feet = both(() => [V.w, V.za, V.toe]);
    const build = (lean, lr) => {
      const base = { root: lr.root, tilt: lean * .72, spine: lean * .28, neck: -.88 * lean, feet, knee: both(() => lr.knee) };
      const { F } = pose({ ...base, hands: ZERO, elbow: {} });
      return { ...base, ...arms(F, base) };
    };
    return {
      view: V.view, up: 'a', merge: false, cam: V.view == 'back' ? [-140, 14] : [-40, 10],
      at(t) {
        const lr = legRoot(V.w, V.za, V.toe, mix(V.ps[0], V.ps[1], t), mix(V.pt[0], V.pt[1], t));
        if (fixed) return build(mix(fixed[0], fixed[1], t), lr);
        /* el tronco: lo justo para el equilibrio (con barra, para que quede sobre el medio del pie; en la Smith, para que siga
           en su guía, en z = 0). Si para eso tendría que inclinarse más (o menos) de lo que se inclina nadie, se queda en el
           tope y lo que falta lo pone la cadera, más atrás o más adelante */
        const off = (q, F, J) => track ? -track(q, F, J) : midFoot(F, COP)[2] - comOf(F, J, typeof q.load == 'function' ? q.load(F, J) : q.load)[2];
        const bal = (l, r) => { const q = build(l, r), { F, J } = pose(q); return off(q, F, J); };
        const lo = mix(V.lean[0], V.lean[0] + 6, t), hi = mix(V.top != null ? V.top : min(V.lean[1], 30), V.lean[1], t * (2 - t));
        let lean = solveNear(l => bal(l, lr), -20, 80, mix(V.lean[0] + 2, (V.lean[0] + V.lean[1]) / 2, t));
        if (lean < lo || lean > hi) {
          lean = clamp(lean, lo, hi);
          /* la cadera, movida adelante o atrás (y bajada lo justo para que las piernas lleguen al suelo) */
          const moved = d => { const r = add(lr.root, [0, 0, -d]), dx = 20 - V.w, dzA = r[2] - V.za, reach = sqrt(max(0, (LEN.thigh + LEN.shin - .6) ** 2 - dx * dx - dzA * dzA)); return { ...lr, root: [r[0], min(r[1], LEN.ankle + reach), r[2]] }; };
          const dz = solve(d => bal(lean, moved(d)), -25, 25);
          return build(lean, moved(dz));
        }
        return build(lean, lr);
      },
      gear(q, F, cam) { return gear(q, F, cam, this); },
    };
  };
  /* una barra olímpica entera (sin manos), con lo que deba ir detrás de alguna pieza: under(x) da sus nombres para el trozo
     que está a x del centro */
  const olympic = (cam, c, under) => {
    const X = x => add(c, [x, 0, 0]), out = [];
    for (let i = 0; i < 15; i++) { const a = -139 + i * 278 / 15, b = a + 278 / 15, it = bar(cam, X(a), X(b), 1, 5.2), u = under((a + b) / 2); if (u) it.forEach(j => { j.below = u; j.above = ['trunk']; }); out.push(...it); }
    [-1, 1].forEach(k => {
      out.push(...bar(cam, X(k * 141), X(k * 222), 4, 7.6));
      out.push(plate(cam, X(k * 140), 6.5, 3.5, true), plate(cam, X(k * 151), 49, 12), plate(cam, X(k * 163), 40, 9), plate(cam, X(k * 171), 7.5, 5, true), plate(cam, X(k * 221.5), 3.8, 1, true));
    });
    return out;
  };
  /* Zercher: los pliegues de los codos (donde va la barra), entre el brazo y el antebrazo */
  const crook = j => add(j.el, mul(norm(add(norm(sub(j.sh, j.el)), norm(sub(j.fist, j.el)))), 6));
  const crooks = J => { const a = crook(J.L), b = crook(J.R); return { c: mix(a, b, .5) }; };
  const bagAt = J => add(crooks(J).c, [0, 20, -6]);
  /* la barra de seguridad: el yugo (acolchado), las asas hacia delante y los extremos que bajan por delante, con sus discos */
  const ssbBar = (cam, F) => {
    const out = [], P = p => at(F.thorax, p);
    out.push(...GR.tube(cam, P([-40, 95, -20]), P([40, 95, -20]), 13, GR.C.pad, 3));
    [-1, 1].forEach(k => {
      out.push(...bar(cam, P([k * 40, 95, -20]), P([k * 92, 95, -20]), 2, 5.2));
      out.push(...bar(cam, P([k * 92, 95, -20]), P([k * 104, 72, -6]), 1, 5.2));
      const a = P([k * 104, 72, -6]), x = norm(sub(P([k, 72, -6]), P([0, 72, -6])));
      out.push(...bar(cam, a, add(a, mul(x, 80)), 3, 7.6));
      out.push(GR.disc(cam, add(a, mul(x, 22)), x, 49, 12), GR.disc(cam, add(a, mul(x, 34)), x, 40, 9));
      out.push(...bar(cam, P([k * 26, 99, -8]), P([k * 25, 84, 40]), 2, 4.4).map(i => ({ ...i, hand: k > 0 ? 'L' : 'R' })));
    });
    return out;
  };
  /* las bandas: de debajo de cada pie (pisadas por el medio) a cada mano */
  const bands = (cam, F, q) => ['L', 'R'].flatMap(s => {
    const foot = at(F['foot' + s], [0, -19, 12]);
    return GR.strap(cam, GR.sag(foot, q.hands[s], sd(s, [1, 0, 0]), 6, 5), 3.2, GR.C.band);
  });

  /* la sentadilla con salto: de abajo (los brazos atrás) a estirarse del todo y despegar (los brazos arriba), y vuelta */
  const jumpSquat = () => {
    const V = { w: 34, za: 0, toe: 14 };
    const STAND = LEN.ankle + sqrt((LEN.thigh + LEN.shin) ** 2 - (V.w - 20) ** 2) - .5, AIR = 34;
    return {
      view: 'front', up: 'b', merge: false, cam: [-40, 10],
      at(t) {
        /* t: 0, abajo; ~0,7, de pie con las piernas estiradas; 1, en el aire */
        const k = span(t, 0, .72), air = span(t, .62, 1);
        const lr = legRoot(V.w, V.za, V.toe, mix(30, 1, k), mix(-4, 89.5, k));
        const lift = air * AIR, root = [lr.root[0], min(lr.root[1], STAND) + lift, lr.root[2]];
        const lean = mix(38, 3, span(t, 0, .8));
        const ft = both(() => [V.w, V.za, V.toe, lift, 38 * span(t, .55, 1)]);
        const base = { root, tilt: lean * .72, spine: lean * .28, neck: -.85 * lean, feet: ft, knee: both(() => lr.knee) };
        const { F } = pose({ ...base, hands: ZERO, elbow: {} });
        /* los brazos: de atrás (-40°) a arriba (165°), por delante */
        const a = RAD(mix(-42, 165, span(t, .08, .95)));
        const hands = both(s => add(shoulder(F, s), add([0, -143 * cos(a), 143 * sin(a)], sd(s, [10 + 8 * sin(a), 0, 0]))));
        return { ...base, hands, elbow: both(() => [.2, .1, -1]), fist: false, palm: both(() => [-1, 0, 0]) };
      },
      gear: () => [],
    };
  };

  /* ════ press de banca ════ */
  const press = f => {
    const incline = has(f, 'incline'), decline = has(f, 'decline'), floor = has(f, 'floor');
    const db = has(f, 'db'), smith = has(f, 'smith'), ez = has(f, 'ez'), one = has(f, 'one'), close = has(f, 'close'), jm = has(f, 'jm');
    const wide = has(f, 'wide'), neutral = has(f, 'neutral'), band = has(f, 'band');
    const ang = incline ? (has(f, 'thirty') ? 30 : 38) : decline ? -18 : 0;
    /* el cuerpo en el banco (no se mueve): las caderas, la inclinación y las piernas */
    let body;
    if (floor) body = { root: [0, 27, 10], tilt: -90, spine: 0, neck: 6, reach: -3, feet: both(() => [34, 118, 12]), knee: both(() => [.25, 1, .2]) };
    else if (incline) body = { root: [0, 124, 10], tilt: -(90 - ang), spine: -2, neck: 4, reach: -3, feet: both(() => [46, 104, 16]), knee: both(() => [.3, .8, .7]) };
    else if (decline) body = { root: [0, 134, 10], tilt: -(90 - ang), spine: 0, neck: 12, reach: -3, feet: both(() => [24, 116, 6, 84]), knee: both(() => [.12, 1, .25]) };
    else body = { root: [0, 128, 10], tilt: -90, spine: -3, neck: 8, reach: -3, feet: both(() => [56, 80, 20]), knee: both(() => [.35, 1, .4]) };
    const { F: F0, J: J0 } = pose({ ...body, hands: ZERO, elbow: {} });
    const sh = s => shoulder(F0, s, body), shC = mix(sh('L'), sh('R'), .5);
    /* donde toca la barra en el pecho (en el tórax) y el agarre (medio ancho) */
    const grip = jm || close ? (ez ? 42 : 48) : wide ? 104 : 80;
    const touch = jm ? [0, 92, 44] : incline ? [0, 62, 29] : decline ? [0, 38, 28] : close ? [0, 40, 30] : wide ? [0, 54, 30] : [0, 46, 30];
    let bottom = at(F0.thorax, touch);
    if (floor) bottom = [0, 84, shC[2] + 46];
    /* arriba: sobre los hombros (en vertical), con los brazos casi estirados; en la Smith, sobre el mismo punto del pecho */
    const reach = (x, c) => { const d = sub([x, 0, c[2]], [47, 0, shC[2]]); return sqrt(max(0, 146 ** 2 - d[0] ** 2 - d[2] ** 2)); };
    const topAt = (x, z) => [0, shC[1] + reach(x, [0, 0, z]), z];
    const top = smith ? topAt(grip, bottom[2]) : topAt(grip, shC[2]);
    const elbow = jm ? [.12, .35, 1] : close ? [.12, -.7, .7] : wide ? [.85, -.5, .2] : [.45, -.75, .5];
    /* hacia dónde tiene que salir el codo para que quede bajo la mano (el antebrazo vertical), en el lado izquierdo */
    const under = (H, fb) => { const v = sub(sub(H, [0, LEN.fore + LEN.grip, 0]), sh('L')); return len(v) > 1 ? norm(add(norm(v), mul(fb, .35))) : fb; };
    const path = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], ease(t))];
    let arms;
    if (db) {
      /* las mancuernas: abajo, a los lados del pecho y algo más hondas que la barra; arriba, sobre los hombros, casi juntas.
         Con agarre neutro (o el press cerrado), las asas a lo largo del cuerpo y los codos más pegados */
      const axis = neutral || close ? norm(F0.thorax.y) : [1, 0, 0];
      const lowX = close ? 15.5 : neutral ? 62 : 76, topX = close ? 15.5 : neutral ? 34 : 44;
      const low = s => close ? T(F0, s, [lowX, 48, 44]) : T(F0, s, [lowX, incline ? 62 : decline ? 40 : 48, 17]);
      const hi = s => { const l = low(s); const z = close ? l[2] : sh(s)[2]; const x = sd(s, [topX, 0, 0])[0]; return [x, shC[1] + sqrt(max(0, 145 ** 2 - (topX - 47) ** 2 - (z - shC[2]) ** 2)), z]; };
      const el = close ? [.1, -.6, .8] : neutral ? [.25, -.75, .6] : [.5, -.75, .45];
      /* el codo va por un arco desde debajo del hombro (por fuera y hacia los pies, flare grados) y el antebrazo, vertical;
         al final, las manos se juntan sobre los hombros */
      const flare = close ? 15 : neutral ? 30 : 52, fy = mul(F0.thorax.y, -1), feet = norm([fy[0], 0, fy[2]]);
      const arcH = (s, t) => {
        /* en el suelo, el codo no baja de él: el brazo se queda apoyado */
        const ph = RAD(mix(floor ? -13 : -30, 78, t)), w = norm(add(mul(sd(s, [1, 0, 0]), sin(RAD(flare))), mul(feet, cos(RAD(flare)))));
        const E = add(sh(s), add(mul(w, LEN.upper * cos(ph)), [0, LEN.upper * sin(ph), 0]));
        return add(E, [0, LEN.fore + LEN.grip, 0]);
      };
      /* t: 0, arriba; 1, abajo */
      const dbH = (s, t) => close ? path(hi(s), low(s), t) : mix(arcH(s, min(1, (1 - t) / .8)), hi(s), span(1 - t, .7, 1));
      if (one) {
        /* con una mano: la derecha; la izquierda, abierta sobre el vientre */
        arms = t => ({ hands: { R: dbH('R', t), L: at(F0.pelvis, [10, 36, 24]) }, elbow: { R: under(dbH('L', t), el), L: [.6, .3, 0] }, barDir: { R: axis, L: axis }, fist: { L: false }, palm: { L: [0, -1, 0] } });
      }
      else arms = t => ({ hands: both(s => dbH(s, t)), elbow: both(() => close ? [.45, -.6, .65] : under(dbH('L', t), el)), barDir: { L: axis, R: axis } });
    }
    else {
      arms = t => { const c = path(top, bottom, t), H = add(c, [grip, 0, 0]); return { barC: c, grip, hands: { L: H, R: add(c, [-grip, 0, 0]) }, elbow: both(() => jm ? elbow : under(H, elbow)) }; };
    }
    /* el banco, hecho a la medida del cuerpo: el respaldo pegado a la espalda y el asiento bajo la pelvis */
    const benchGear = cam => {
      if (floor) return GR.under([GR.obox(cam, [0, 1.5, body.root[2] - 70], [[1, 0, 0], UP], [40, 1.5, 125], GR.C.pad)]);
      const back = F0.thorax, n = back.z, u = back.y;
      const b0 = at(back, [0, -42, -25]), b1 = at(back, [0, 150, -25]);
      const items = [GR.padAB(cam, add(b0, mul(n, -7)), add(b1, mul(n, -7)), n, 30, 7)];
      if (!ang) {
        const legs = [add(b0, [0, -14, 40]), add(b1, [0, -14, -12])].flatMap(p => GR.leg(cam, p));
        return GR.under([...legs, ...items, GR.padAB(cam, add(b0, [0, -7, 0]), add(b0, [0, -7, 62]), UP, 30, 7)]);
      }
      /* el asiento (bajo la pelvis) y el armazón */
      const seatC = at(F0.pelvis, [0, -4, -27]), s0 = add([0, seatC[1] - 7, seatC[2] - 18], [0, 0, 0]), s1 = add(s0, [0, 0, 56]);
      const legs = [add(s0, [0, -7, 10]), add(b1, [0, -10, 0])].flatMap(p => GR.leg(cam, [p[0], max(8, p[1]), p[2]]));
      const extra = [];
      if (decline) {
        /* los rodillos: uno por delante de las espinillas, bajo las rodillas, y otro detrás de los tobillos */
        const kn = mix(J0.L.knee, J0.R.knee, .5), an = mix(J0.L.ankle, J0.R.ankle, .5);
        const r1 = add(mix(kn, an, .22), [0, 0, 11]), r2 = add(an, [0, 4, -11]);
        [r1, r2].forEach(r => extra.push(...GR.tube(cam, add(r, [-30, 0, 0]), add(r, [30, 0, 0]), 11, GR.C.pad, 2)));
        extra.push(...GR.tube(cam, [0, 8, r2[2] - 6], add(r2, [0, 0, -6]), 5), ...GR.tube(cam, [0, 8, r2[2] - 6], [0, 8, s0[2]], 5));
      }
      return GR.under([...legs, ...extra, GR.padAB(cam, s0, s1, UP, 30, 7), ...items]);
    };
    const bandGear = (q, cam) => [-1, 1].flatMap(k => { const a = add(q.barC, [k * 128, 0, 0]), b = [k * 128, 2, q.barC[2]]; return [...GR.strap(cam, [a, b], 3, GR.C.band), GR.obox(cam, b, [[1, 0, 0], UP], [5, 2, 5], GR.C.frame)]; });
    return {
      view: 'bench', up: 'a', cam: incline ? [-38, 26] : [-30, 33],
      at(t) { return { ...body, ...arms(t) }; },
      gear(q, F, cam) {
        const out = [...benchGear(cam)];
        if (db) out.push(...(one ? GR.dumbbell(cam, q.hands.R, q.barDir.R, 'R') : pair(q, cam)));
        else if (ez) out.push(...ezBar(cam, q.barC, grip));
        else out.push(...bb(q, cam));
        if (smith) out.push(...GR.smithFrame(cam, q.barC[2]).map(i => ({ ...i, nf: true })), ...GR.smithHooks(cam, q.barC));
        if (band) out.push(...bandGear(q, cam));
        return out;
      },
    };
  };
  /* la barra Z: más corta, con las curvas del centro donde van las manos, y discos medianos */
  const ezBar = (cam, c, grip) => {
    const X = (x, d = 0) => add(c, [x, 0, d]), out = [];
    const pts = [-118, -60, -50, -36, -24, 24, 36, 50, 60, 118].map(x => X(x, abs(x) == 50 || abs(x) == 24 ? 3.5 : 0));
    for (let i = 0; i + 1 < pts.length; i++) {
      const it = bar(cam, pts[i], pts[i + 1], 1, 5);
      const xm = (pts[i][0] + pts[i + 1][0]) / 2 - c[0];
      if (abs(abs(xm) - grip) < 10) it.forEach(j => { j.hand = xm > 0 ? 'L' : 'R'; });
      out.push(...it);
    }
    [-1, 1].forEach(k => { out.push(...bar(cam, X(k * 118), X(k * 160), 2, 7)); out.push(GR.disc(cam, X(k * 128), [1, 0, 0], 34, 8), GR.disc(cam, X(k * 120), [1, 0, 0], 6, 4, 'metal')); });
    return out;
  };

  /* ════ press de hombro ════ */
  const overhead = f => {
    const seated = has(f, 'seated') || has(f, 'machine'), db = has(f, 'db'), one = has(f, 'one') || has(f, 'kb') || has(f, 'cable') || has(f, 'landmine');
    const machine = has(f, 'machine'), smith = has(f, 'smith'), barb = has(f, 'bar') || smith, arnold = has(f, 'arnold'), neutral = has(f, 'neutral');
    const kb = has(f, 'kb'), cable = has(f, 'cable'), band = has(f, 'band'), landmine = has(f, 'landmine');
    /* sentado: en un banco con respaldo casi vertical; de pie: las rodillas apenas dobladas */
    const ROOT_Y = LEN.ankle + LEN.shin + LEN.thigh - 4;
    let body = seated ? { root: [0, 122, 0], tilt: -6, spine: -2, neck: 0, feet: both(() => [40, 86, 14]), knee: both(() => [.25, .7, .7]) }
      : { root: [0, ROOT_Y, 0], tilt: 0, spine: 0, neck: 0, feet: both(() => [27, -2, 12]), knee: both(() => [.2, 0, 1]) };
    if (landmine) body = { ...body, feet: { L: [26, 26, 10], R: [26, -22, 14] }, tilt: 8, spine: 4, neck: -10 };
    const bodyAt = t => {
      if (barb) return { ...body, spine: body.spine - 4 * sin(PI * t) + t, neck: -14 + 10 * t };
      if (landmine) return { ...body, tilt: 8 + 4 * t, spine: 4 + 3 * t, neck: -10 - 6 * t };
      return body;
    };
    /* las mancuernas: abajo, a la altura de las orejas por fuera de los hombros, con el antebrazo vertical; arriba, sobre los
       hombros con los brazos estirados */
    const LOW = [82, 95, 10], HIGH = [40, 222, 4];
    /* el codo sube por un arco desde algo por debajo del hombro (hacia fuera y fwd grados hacia delante) con el antebrazo
       vertical; al final, el brazo se estira y la mano se mete un poco, sobre el hombro */
    const arcAt = (th, fwd) => { const u = [cos(RAD(fwd)), 0, sin(RAD(fwd))], E = [47 + LEN.upper * cos(th) * u[0], 80 + LEN.upper * sin(th), -2 + LEN.upper * cos(th) * u[2]]; return { E, H: [E[0], E[1] + LEN.fore + LEN.grip, E[2]] }; };
    const arcT = (t, fwd) => arcAt(RAD(mix(-38, 76, min(1, t / .82))), fwd);
    const pressed = (F, s, t, fwd = 25) => mix(T(F, s, arcT(t, fwd).H), T(F, s, HIGH), span(t, .68, 1));
    const elAt = (F, t, fwd = 25) => { const a = arcT(t, fwd); return norm(mix(norm(sub(T(F, 'L', a.E), T(F, 'L', [47, 80, -2]))), [.2, -1, 0], span(t, .75, 1) * .5)); };
    const elOut = [.48, -.86, .17];
    let arms, gear = () => [], cam = [-42, seated ? 10 : 8];
    const hang = (F, s) => add(shoulder(F, s), sd(s, [9, -143, 4]));
    const freeL = F => ({ L: hang(F, 'L') });
    if (barb) {
      /* la barra sale de lo alto del pecho, por delante de la barbilla, con los codos delante; pasa por delante de la cara (la
         cabeza un poco atrás) y acaba sobre la cabeza con los brazos estirados. En la Smith, en vertical por sus guías */
      let railZ = null;
      arms = (F, t) => {
        let c = at(F.thorax, [0, 98 + 136 * t, 21 - 15 * t + 10 * sin(PI * t)]);
        if (smith) { railZ = railZ != null ? railZ : at(F.thorax, [0, 98, 21])[2]; c = [0, at(F.thorax, [0, 98 + 132 * t, 0])[1], railZ]; }
        const el = mix([.15, -.8, .6], [.85, -.3, .1], ease(min(1, t / .4)));
        return { barC: c, grip: 64, hands: { L: add(c, [64, 0, 0]), R: add(c, [-64, 0, 0]) }, elbow: both(() => el), shrug: 6 * t };
      };
      gear = (q, F, cam) => [...bb(q, cam), ...(smith ? [...GR.smithFrame(cam, q.barC[2]).map(i => ({ ...i, nf: true })), ...GR.smithHooks(cam, q.barC)] : [])];
    }
    else if (machine) {
      /* las asas de la máquina van por un arco alrededor de un eje detrás de la cabeza */
      let piv = null;
      arms = (F, t) => {
        const lo = s => T(F, s, add(arcT(0, 40).H, [0, 0, 6])), hi = s => T(F, s, [44, 220, 22]);
        if (!piv) { const a = lo('L'), b = hi('L'), m = mix(a, b, .5), d = norm(sub(b, a)), n = norm([0, d[2], -d[1]]); piv = add(m, mul(n, n[2] < 0 ? 100 : -100)); }
        const hands = both(s => { const a = lo(s), b = hi(s), p = [a[0], piv[1], piv[2]], r = len(sub(a, p)); const a0 = atan2(a[1] - p[1], a[2] - p[2]), a1 = atan2(b[1] - p[1], b[2] - p[2]), th = mix(a0, a1, t); return [mix(a[0], b[0], t), p[1] + r * sin(th), p[2] + r * cos(th)]; });
        return { hands, elbow: both(() => elAt(F, t, 40)), barDir: [1, 0, 0], piv };
      };
      gear = (q, F, cam) => machineGear(cam, q, F);
    }
    else if (arnold) {
      /* Arnold: empieza con las mancuernas delante de la cara, las palmas hacia uno y los codos delante; al subir, los codos se
         abren y las muñecas giran hasta acabar como en el press normal */
      arms = (F, t) => {
        const k = span(t, 0, .5), u = span(t, .42, 1);
        const hands = both(s => mix(T(F, s, [20, 86, 36]), pressed(F, s, u), k));
        const th = PI * span(t, .05, .6);
        return { hands, elbow: both(() => norm(mix([.15, -.6, 1], elAt(F, u), k))), barDir: { L: [cos(PI - th), 0, sin(PI - th)], R: [cos(PI + th), 0, sin(PI + th)] } };
      };
      gear = (q, F, cam) => pair(q, cam);
    }
    else if (kb) {
      /* la kettlebell en la posición de rack (la bola apoyada por fuera del antebrazo) y arriba, con la palma hacia delante */
      arms = (F, t) => {
        const R = mix(T(F, 'R', [28, 94, 30]), T(F, 'R', [42, 222, 2]), t), th = PI * 1.5 + PI / 2 * span(t, .1, .8);
        return { hands: { R, ...freeL(F) }, elbow: { R: norm(mix([-.27, -.92, .3], elOut, span(t, 0, .5))), L: [.1, 0, -1] }, barDir: { R: [cos(th), 0, sin(th)], L: [1, 0, 0] }, fist: { L: false }, palm: { L: [-1, 0, 0] } };
      };
      gear = (q, F, cam) => GR.kettlebell(cam, at(F.gripR, [0, 9, 17]), q.hands.R, q.barDir.R, 'R');
    }
    else if (landmine) {
      /* la barra apoyada en el suelo por delante: la mano va por su arco, hacia delante y arriba, hasta estirar el brazo */
      const LM = 400;
      let geo = null;
      arms = (F, t) => {
        if (!geo) {
          const h0 = T(F, 'R', [30, 88, 30]), sh = shoulder(F, 'R');
          const piv = [h0[0] * .4, 6, h0[2] + sqrt(LM ** 2 - (h0[1] - 6) ** 2 - (h0[0] * .6) ** 2)];
          const u = norm(sub(h0, piv)), v = norm(sub(sub(sh, piv), mul(u, dot(sub(sh, piv), u))));
          const at2 = a => add(piv, mul(add(mul(u, cos(a)), mul(norm(sub([0, 1, 0], mul(u, dot([0, 1, 0], u)))), sin(a))), LM));
          let a1 = 0; for (let a = 0; a < .7; a += .002) { if (len(sub(at2(a), sh)) <= 146) a1 = a; }
          geo = { piv, at2, a1, v };
        }
        return { hands: { R: geo.at2(geo.a1 * t), ...freeL(F) }, elbow: { R: [.25, -1, .2], L: [.1, 0, -1] }, barDir: { R: [1, 0, 0], L: [1, 0, 0] }, fist: { L: false }, palm: { L: [-1, 0, 0] }, piv: geo.piv };
      };
      cam = [-62, 10];
      gear = (q, F, cam) => landmineGear(cam, q);
    }
    else if (cable) {
      /* con una mano, de pie junto a la polea baja: el cable sube de la polea al asa */
      arms = (F, t) => ({ hands: { R: pressed(F, 'R', t), ...freeL(F) }, elbow: { R: elAt(F, t), L: [.1, 0, -1] }, barDir: [1, 0, 0], fist: { L: false }, palm: { L: [-1, 0, 0] } });
      gear = (q, F, cam) => [...GR.pulleyTower(cam, [-118, 0, -6], 16, q.hands.R), ...GR.tube(cam, add(q.hands.R, [-7, 0, 0]), add(q.hands.R, [7, 0, 0]), 4, ['#b9bed0', '#0a0b10'], 1).map(i => ({ ...i, hand: 'R' }))];
    }
    else {
      /* mancuernas (o bandas): con una mano o con las dos; agarre normal o neutro (las palmas, una frente a otra) */
      const nb = neutral ? { L: [0, 0, 1], R: [0, 0, -1] } : [1, 0, 0];
      const fwd = neutral ? 55 : 25;
      if (one) arms = (F, t) => ({ hands: { R: pressed(F, 'R', t, fwd), ...freeL(F) }, elbow: { R: elAt(F, t, fwd), L: [.1, 0, -1] }, barDir: nb, fist: { L: false }, palm: { L: [-1, 0, 0] } });
      else arms = (F, t) => ({ hands: both(s => pressed(F, s, t, fwd)), elbow: both(() => elAt(F, t, fwd)), barDir: nb });
      gear = (q, F, cam) => band ? bands(cam, F, q) : one ? GR.dumbbell(cam, q.hands.R, Array.isArray(q.barDir) ? q.barDir : q.barDir.R, 'R') : pair(q, cam);
    }
    const seatGear = cam => {
      if (!seated) return [];
      const { F } = pose({ ...body, hands: ZERO, elbow: {} });
      const s = at(F.pelvis, [0, -22, -8]), s0 = [0, s[1] - 7, s[2] - 22], s1 = add(s0, [0, 0, 58]);
      const b0 = at(F.thorax, [0, -30, -26]), b1 = at(F.thorax, [0, 108, -26]), n = F.thorax.z;
      return GR.under([...[add(s0, [0, -7, 12]), add(s0, [0, -7, 48])].flatMap(p => GR.leg(cam, p)), ...GR.tube(cam, add(b0, mul(n, -14)), [0, 8, b0[2] - 10], 6), GR.padAB(cam, s0, s1, UP, 30, 7), GR.padAB(cam, add(b0, mul(n, -7)), add(b1, mul(n, -7)), n, 26, 7)]);
    };
    return {
      view: seated ? 'seat' : 'stand', up: 'b', cam,
      at(t) { const b = bodyAt(t), { F } = pose({ ...b, hands: ZERO, elbow: {} }); return { ...b, ...arms(F, t) }; },
      gear(q, F, cam) { return [...seatGear(cam), ...gear(q, F, cam)]; },
    };
  };
  /* la máquina de press de hombro: el asiento (con su respaldo, del banco), los postes detrás y las palancas hasta las asas */
  const machineGear = (cam, q, F) => {
    const out = [], p = q.piv;
    [-1, 1].forEach(k => {
      const s = k > 0 ? 'L' : 'R', h = q.hands[s], pv = [h[0] + k * 12, p[1], p[2]];
      out.push(...GR.tube(cam, [pv[0], 0, pv[2]], pv, 7, GR.C.frame, 5).map(i => ({ ...i, z: i.z - 400 })));
      out.push(GR.disc(cam, pv, [1, 0, 0], 7, 8, 'wheel'));
      out.push(...GR.tube(cam, pv, add(h, [k * 12, 0, 0]), 6, GR.C.frame, 3));
      out.push(...GR.tube(cam, add(h, [k * 12, 0, 0]), add(h, [-k * 8, 0, 0]), 4, ['#b9bed0', '#0a0b10'], 1).map(i => ({ ...i, hand: s })));
    });
    return out;
  };
  /* el landmine: la base en el suelo, la barra hasta la mano y un disco cerca de ella */
  const landmineGear = (cam, q) => {
    const p = q.piv, h = q.hands.R, u = norm(sub(h, p)), out = [];
    out.push(GR.obox(cam, [p[0], 3, p[2]], [[1, 0, 0], UP], [22, 3, 22], GR.C.frame));
    out.push(...bar(cam, add(p, mul(u, -8)), add(h, mul(u, -36)), 8, 5.2));
    out.push(...bar(cam, add(h, mul(u, -36)), add(h, mul(u, 8)), 2, 7.6).map((i, n) => n == 1 ? { ...i, hand: 'R' } : i));
    out.push(GR.disc(cam, add(h, mul(u, -30)), u, 34, 8));
    return out;
  };

  F3.FAMILIES = { squat, press, overhead };
  /* la figura de un ejercicio: su familia y variantes (palabras), y sus músculos principales (P) y secundarios (S) */
  F3.make = (name, words, P, S) => {
    const w = words.split(' '), fam = F3.FAMILIES[w[0]];
    if (!fam) return null;
    const ex = fam(w.slice(1));
    return Object.assign(ex, { name, P, S, pause: has(w, 'pause') ? 900 : 0, yaw: ex.cam[0], pitch: ex.cam[1] });
  };
})(window);
