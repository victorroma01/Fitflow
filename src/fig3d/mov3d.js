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
  const { add, sub, mul, dot, cross, len, norm, mix, ease, clamp, at, RAD, LEN, barbell, bar, plate } = L;
  const { cos, sin, PI, abs, max, min, sqrt, acos } = Math;
  const has = (f, w) => f.includes(w);
  const pose = F3.pose, torso = F3.torso;
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
  /* mínimo y máximo suaves (k: lo ancha que es la curva): con ellos, lo que llega a un tope no frena de golpe */
  const smax = (a, b, k) => (a + b + sqrt((a - b) ** 2 + k * k)) / 2, smin = (a, b, k) => (a + b - sqrt((a - b) ** 2 + k * k)) / 2;
  /* el valor de x entre lo y hi con f(x) = 0, con la precisión de n bisecciones: si f cambia de signo entre los extremos, por
     la regla falsa (refine, mucho más rápida); si no, por bisección (que acaba en un extremo o en un cambio de signo de dentro) */
  const solve = (f, lo, hi, n = 18) => {
    let flo = f(lo);
    const fhi = f(hi);
    if ((flo > 0) != (fhi > 0)) return refine(f, lo, hi, flo, fhi, (hi - lo) / 2 ** n);
    for (let i = 0; i < n; i++) { const m = (lo + hi) / 2, fm = f(m); if ((fm > 0) == (flo > 0)) { lo = m; flo = fm; } else hi = m; }
    return (lo + hi) / 2;
  };
  /* como solve, pero si hay más de una solución (cuando la carga va en los brazos, el equilibrio no siempre crece con la
     inclinación), la más cercana a near: así no salta de una a otra entre un fotograma y el siguiente */
  /* win: si se da, busca primero en una ventana alrededor de near (con la misma rejilla que la búsqueda entera): si ahí hay una
     solución, es la más cercana y sale igual que buscando en todo el intervalo, con muchas menos evaluaciones (el peso muerto
     tardaba segundos en prepararse) */
  const solveNear = (f, lo, hi, near, step = 5, win = 0) => {
    if (win) {
      const a0 = lo + step * Math.floor(max(0, near - win - lo) / step), b0 = min(hi, near + win);
      if (b0 - a0 >= step) { const r = scanNear(f, a0, b0, near, step); if (r != null) return r; }
    }
    return scanNear(f, lo, hi, near, step) ?? (abs(f(lo)) < abs(f(hi)) ? lo : hi);
  };
  const scanNear = (f, lo, hi, near, step) => {
    let best = null, a = lo, fa = f(a);
    for (let b = lo + step; b <= hi + 1e-9; b += step) {
      const fb = f(b);
      if ((fa > 0) != (fb > 0)) { const r = refine(f, a, b, fa, fb, step * 1e-4); if (best == null || abs(r - near) < abs(best - near)) best = r; }
      a = b; fa = fb;
    }
    return best;
  };
  /* la raíz de f entre a y b (con f(a) y f(b) de signo contrario, ya calculados) por la regla falsa con el arreglo de
     Illinois: con la misma precisión que doce bisecciones, en cuatro o cinco evaluaciones */
  const refine = (f, a, b, fa, fb, tol) => {
    let c = a, side = 0;
    for (let i = 0; i < 40; i++) {
      const cn = fb == fa ? (a + b) / 2 : (a * fb - b * fa) / (fb - fa);
      if (abs(cn - c) < tol || abs(b - a) < tol) return cn;
      c = cn; const fc = f(c);
      if (fc == 0) return c;
      if ((fc > 0) == (fb > 0)) { b = c; fb = fc; if (side == -1) fa /= 2; side = -1; }
      else { a = c; fa = fc; if (side == 1) fb /= 2; side = 1; }
    }
    return c;
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
  /* la barra; con F, cada trozo ordenado según lo que de verdad lo tapa visto desde la cámara (el muslo o la rodilla que
     quedan delante, el antebrazo...) y, si nada lo tapa, delante del cuerpo: ordenada solo por la profundidad de su centro,
     pegada a los muslos parecía pasar por dentro de ellos */
  const bb = (q, cam, F) => {
    if (!F) return barbell(cam, q.barC, q.grip);
    const { J } = pose(q), c = q.barC, grip = q.grip, X = x => add(c, [x, 0, 0]), out = [];
    let spans = [[-139, 139]];
    if (grip) [[-grip - 8, -grip + 8], [grip - 8, grip + 8]].forEach(([a, b]) => { spans = spans.flatMap(([u, v]) => b <= u || a >= v ? [[u, v]] : [[u, a], [b, v]].filter(([m, n]) => n - m > 1)); });
    spans.forEach(([u, v]) => {
      const it = bar(cam, X(u), X(v), max(1, Math.round((v - u) / 18)), 5.2), n = it.length;
      if (grip) [[u, 0], [v, n - 1]].forEach(([e, i]) => { if (abs(abs(e) - grip) < 9) it[i].hand = e > 0 ? 'L' : 'R'; });
      const tagged = visTag(it, it.map((_, i) => X(u + (v - u) * (i + .5) / n)), cam, F, J);
      out.push(...it.map((p, i) => p.hand ? p : tagged[i]));
    });
    [-1, 1].forEach(k => {
      out.push(...bar(cam, X(k * 141), X(k * 222), 4, 7.6));
      out.push(plate(cam, X(k * 140), 6.5, 3.5, true), plate(cam, X(k * 151), 49, 12), plate(cam, X(k * 163), 40, 9), plate(cam, X(k * 171), 7.5, 5, true), plate(cam, X(k * 221.5), 3.8, 1, true));
    });
    return out;
  };
  /* el eje de una mancuerna: el del puño que la agarra (la dirección pedida, puesta perpendicular al antebrazo); así el asa
     queda siempre de través en la mano y las cabezas no tocan el antebrazo */
  const dbAxis = (F, q, s, axis) => F && F['grip' + s] ? F['grip' + s].x : (q.barDir ? (Array.isArray(q.barDir) ? q.barDir : q.barDir[s]) : null) || axis || [1, 0, 0];
  const pair = (q, cam, axis, F) => ['L', 'R'].flatMap(s => GR.dumbbell(cam, q.hands[s], dbAxis(F, q, s, axis), s));

  /* ════ sentadillas ════ */
  const squat = f => {
    /* los pies (medio ancho del tobillo, adelante, apertura de la punta), la espinilla y el muslo arriba y abajo */
    const V = { w: 40, za: 0, toe: 20, ps: [3, 33], pt: [93.5, -8], view: 'front', up: 'a', lean: [2, 45], top: 10 };
    let arms, gear = () => [], track = null, fixed = null;
    const backBar = F => { const c = at(F.thorax, [0, 90, -26]); return { barC: c, grip: 80, hands: { L: add(c, [80, 0, 0]), R: add(c, [-80, 0, 0]) }, elbow: both(() => [.25, -1, -.45]), shrug: 3, load: [[c, 1]] }; };
    const hanging = (F, s, out = 12) => add(shoulder(F, s), sd(s, [out, -143, 3]));
    if (has(f, 'front')) {
      /* la barra sobre la parte de delante de los hombros, los codos altos y hacia delante */
      Object.assign(V, { w: 38, ps: [5, 38] });
      V.lean = [0, 28];
      track = (q, F) => q.barC[2] - midFoot(F)[2];
      /* la muñeca doblada hacia atrás (el puño encima de ella): así el antebrazo sale hacia delante y los codos quedan altos */
      /* (los dedos bajo la barra apuntan hacia el hombro: la muñeca queda más lejos de él y el codo, menos cerrado; antes la mano
         apuntaba hacia arriba, la muñeca quedaba junto al hombro y el antebrazo se metía en el brazo) */
      arms = F => { const c = at(F.thorax, [0, 100.5, 17.5]), sh = { shrug: 4, reach: 10 }, hd = s => { const H = add(c, sd(s, [54, 0, 0])); return norm(add(norm(sub(shoulder(F, s, sh), H)), mul(F.thorax.y, .35))); }; return { barC: c, grip: 54, hands: { L: add(c, [54, 0, 0]), R: add(c, [-54, 0, 0]) }, handDir: both(hd), elbow: both(() => [.22, .05, 1]), ...sh, load: [[c, 1]] }; };
      gear = (q, F, cam) => bb(q, cam);
    }
    else if (has(f, 'zercher')) {
      /* la barra en el pliegue de los codos, delante del vientre; las manos juntas a la altura de la barbilla */
      Object.assign(V, { w: 40, ps: [5, 38], lean: [0, 30] });
      /* (las manos, juntas y cerradas delante de la barbilla, con los nudillos hacia delante: antes el eje del puño iba a lo largo
         del antebrazo) */
      arms = F => ({ hands: both(s => T(F, s, [6, 88, 40])), elbow: both(() => [.18, -1, .6]), barDir: [-1, 0, 0], load: (F2, J) => [[crooks(J).c, 1]] });
      gear = (q, F, cam) => { const J = pose(q).J; return olympic(cam, crooks(J).c, x => abs(x) < abs(crook(J.L)[0] - crooks(J).c[0]) + 26 ? ['foreL', 'foreR'] : null); };
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
      arms = F => ({ hands: both(s => hanging(F, s, 21)), elbow: both(() => [.1, 0, -1]), barDir: [0, 0, 1], load: [[hanging(F, 'L', 21), .17], [hanging(F, 'R', 21), .17]] });
      gear = (q, F, cam) => pair(q, cam, [0, 0, 1], F);
    }
    else if (has(f, 'sumo')) {
      /* pies muy abiertos y puntas hacia fuera; una mancuerna colgando entre las piernas, cogida por arriba con las dos manos */
      Object.assign(V, { w: 68, toe: 38, ps: [3, 25], pt: [86, -2] });
      const hand = (F, s) => add(mul(add(shoulder(F, 'L'), shoulder(F, 'R')), .5), sd(s, [6, -132, 30]));
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
      gear = (q, F, cam) => ['L', 'R'].flatMap(s => GR.strap(cam, [q.hands[s], anchor(s)], 6, GR.C.trx).map(i => ({ ...i, nf: true })));
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
        const free = solveNear(l => bal(l, lr), -20, 80, mix(V.lean[0] + 2, (V.lean[0] + V.lean[1]) / 2, t));
        const lean = smin(smax(free, lo, 6), hi, 6);
        if (abs(lean - free) > .05) {
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
  /* el pliegue del codo: sobre la bisectriz entre el brazo y el antebrazo, a d del codo (la barra del Zercher, apretada en él) */
  const crookAt = (j, d) => add(j.el, mul(norm(add(norm(sub(j.sh, j.el)), norm(sub(j.fist, j.el)))), d));
  const crook = j => crookAt(j, 6);
  const crooks = J => ({ c: mix(crookAt(J.L, 6), crookAt(J.R, 6), .5) });
  const bagAt = J => add(mix(crookAt(J.L, 6), crookAt(J.R, 6), .5), [0, 20, -6]);
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
  /* brazos y piernas como cápsulas del grosor con que se dibujan (para que bandas y cables pasen por fuera) */
  const bodyCaps = J => ['L', 'R'].flatMap(s => { const j = J[s], wr = j.wr || add(j.fist, mul(norm(sub(j.el, j.fist)), 14)); return [[j.sh, j.el, 11], [j.el, wr, 9], [j.hip, j.knee, 16], [j.knee, j.ankle, 11]]; });
  /* qué partes del cuerpo tapan el punto m visto desde la cámara: el rayo de m hacia la cámara contra el cuerpo hecho de
     cápsulas del grosor dibujado (el tronco, tres a lo ancho del tórax y tres de la pelvis; la cabeza; brazos y piernas). Sirve
     para ordenar con el cuerpo los trozos de material largo por lo que de verdad se ve (el grupo del tronco tiene una sola
     profundidad, la del centro del pecho, y un trozo que pasa junto a él podía pintarse delante estando detrás) */
  const segRay = (m, c, a, b) => {
    const u = c, v = sub(b, a), w = sub(m, a), A = dot(u, u), B = dot(u, v), C = dot(v, v), D = dot(u, w), E = dot(v, w), den = A * C - B * B;
    let s = den > 1e-9 ? (B * E - C * D) / den : 0, k = den > 1e-9 ? (A * E - B * D) / den : 0;
    if (s < 0) { s = 0; k = clamp(E / (C || 1), 0, 1); }
    k = clamp(k, 0, 1); s = max(0, dot(sub(add(a, mul(v, k)), m), u) / (A || 1));
    return len(sub(add(m, mul(u, s)), add(a, mul(v, k))));
  };
  /* el rayo m + s·u (s > 0) contra un cilindro de sección elíptica en el marco fr (de y0 a y1, semiejes rx y rz) */
  const rayEll = (m, u, fr, y0, y1, rx, rz) => {
    const w = sub(m, fr.o), px = dot(w, fr.x), py = dot(w, fr.y), pz = dot(w, fr.z), dx = dot(u, fr.x), dy = dot(u, fr.y), dz = dot(u, fr.z);
    const A = dx * dx / rx / rx + dz * dz / rz / rz, B = 2 * (px * dx / rx / rx + pz * dz / rz / rz), C = px * px / rx / rx + pz * pz / rz / rz - 1;
    if (C < 0 && py > y0 && py < y1) return false;
    const D = B * B - 4 * A * C;
    if (A < 1e-9 || D < 0) return false;
    const s1 = (-B - sqrt(D)) / (2 * A), s2 = (-B + sqrt(D)) / (2 * A);
    if (s2 <= 0) return false;
    const ya = py + max(s1, 0) * dy, yb = py + s2 * dy;
    return max(ya, yb) > y0 && min(ya, yb) < y1;
  };
  const occluders = (m, cam, F, J) => {
    const u = norm(cam.c), out = new Set();
    /* el tronco como se dibuja: el tórax y la pelvis, cilindros de sección elíptica; la cabeza, una esfera */
    if (rayEll(m, u, F.thorax, 6, 106, 42, 25) || rayEll(m, u, F.pelvis, -16, 42, 42, 27)) out.add('trunk');
    /* la cabeza y el cuello (con los trapecios) y los hombros (deltoides), que el tronco también pinta */
    const caps = [['trunk', at(F.head, [0, 6, 1]), at(F.head, [0, 6, 1]), 16], ['trunk', at(F.thorax, [0, 96, -2]), at(F.head, [0, -6, 0]), 13]];
    for (const s of ['L', 'R']) caps.push(['trunk', J[s].sh, J[s].sh, 15]);
    for (const s of ['L', 'R']) { const j = J[s], wr = add(j.fist, mul(norm(sub(j.el, j.fist)), 14)); caps.push(['upper' + s, j.sh, j.el, 11], ['fore' + s, j.el, wr, 9], ['trunk', j.hip, mix(j.hip, j.knee, .5), 21], ['trunk', mix(j.hip, j.knee, .5), j.knee, 16], ['shin' + s, j.knee, j.ankle, 11]); }
    for (const [k, a, b, r] of caps) {
      /* solo si el punto queda fuera de la pieza (si está dentro, la pieza no lo tapa: lo toca) */
      const ab = sub(b, a), tt = clamp(dot(sub(m, a), ab) / (dot(ab, ab) || 1), 0, 1);
      if (len(sub(m, add(a, mul(ab, tt)))) < r) continue;
      if (segRay(m, u, a, b) < r) out.add(k);
    }
    return [...out];
  };
  const BODY = ['trunk', 'upperL', 'upperR', 'foreL', 'foreR', 'handL', 'handR', 'shinL', 'shinR', 'footL', 'footR'];
  /* el material que se lleva delante del cuerpo (una barra con sus discos): cada pieza con su punto en 3D (mid) se pinta
     delante o detrás según lo que de verdad la tapa; las que van en el puño (hand) o ya traen su orden, como estaban */
  const visAll = (items, cam, F, J) => items.map(it => it.mid && !it.hand && !it.below && !it.above ? (() => { const o = occluders(it.mid, cam, F, J); return o.length ? { ...it, below: o } : { ...it, above: BODY }; })() : it);
  /* los trozos (items) de una pieza larga, con sus puntos medios (mids): cada uno, detrás de lo que lo tapa o, si nada lo tapa,
     delante de todo el cuerpo */
  const visTag = (items, mids, cam, F, J) => items.map((it, i) => { const o = occluders(mids[i], cam, F, J); return o.length ? { ...it, below: o } : { ...it, above: BODY }; });
  /* una banda (o un cable) tensa de a a b que no atraviesa el cuerpo: los puntos de en medio se alisan (la tensión los lleva a
     la recta) y se apartan de cada cápsula [p, q, r] hasta su superficie; si alguno queda justo en el eje, sale hacia side */
  /* (bias: por dónde empieza a buscar, desviada hacia ese lado; sin él, si la recta pasaba cerca del eje de una rodilla, de un
     momento a otro la banda se iba por dentro o por fuera, y saltaba) */
  const taut = (a, b, caps, side = [0, 0, 1], n = 14, iters = 36, bias = null) => {
    const P = Array.from({ length: n + 1 }, (_, i) => bias ? add(mix(a, b, i / n), mul(bias, sin(PI * i / n))) : mix(a, b, i / n));
    for (let it = 0; it < iters; it++) {
      for (let i = 1; i < n; i++) P[i] = mix(P[i], mix(P[i - 1], P[i + 1], .5), .5);
      for (let i = 1; i < n; i++) for (const [p, q, r] of caps) {
        const ab = sub(q, p), k = clamp(dot(sub(P[i], p), ab) / (dot(ab, ab) || 1), 0, 1), c = add(p, mul(ab, k)), d = sub(P[i], c), l = len(d);
        if (l < r) P[i] = add(c, mul(l > 1e-3 ? mul(d, 1 / l) : norm(side), r));
      }
    }
    return P;
  };
  /* las bandas pisadas: cada una pasa por debajo del medio del pie (sus dos tiras suben por los lados del pie) y llega
     tensa a la mano; en reposo mide lo que hay del suelo a la cintura */
  const bands = (cam, F, q) => {
    /* (con holgura: los muslos y las pantorrillas del dibujo son más gruesos que las cápsulas, y la banda los rozaba) */
    const caps = bodyCaps(pose(q).J).map(([a, b, r], i) => [a, b, r + (i % 4 == 3 ? 10 : 8.5)]);
    return ['L', 'R'].flatMap(s => {
      const foot = at(F['foot' + s], [0, -19, 12]), x = F['foot' + s].x;
      /* (sale del lado de fuera del puño: desde el centro, arriba, rozaba el brazo) */
      const top = add(at(F['grip' + s], [0, 5, -9]), mul(norm([F['grip' + s].x[0], 0, F['grip' + s].x[2]]), s == 'L' ? 7 : -7));
      return GR.bandPath(cam, taut(foot, top, caps, [0, 0, 1], 14, 36, mul(norm([s == 'L' ? 1 : -1, 0, .3]), 30)), 105, x, 5);
    });
  };

  /* la sentadilla con salto: de abajo (los brazos atrás) a estirarse del todo y despegar (los brazos arriba), y vuelta */
  const jumpSquat = () => {
    const V = { w: 34, za: 0, toe: 14 };
    const STAND = LEN.ankle + sqrt((LEN.thigh + LEN.shin) ** 2 - (V.w - 20) ** 2) - .5, AIR = 34;
    /* el reloj del salto: abajo un momento, el impulso (cada vez más deprisa), el vuelo (sube frenando y cae acelerando, como
       cae cualquier cosa) y la caída, que se amortigua hasta abajo */
    const UPT = .72, PH = [140, 430, 290, 290, 680], TOT = PH.reduce((a, b) => a + b);
    const clock = ms => {
      let x = ms % TOT;
      if (x < PH[0]) return 0;
      if ((x -= PH[0]) < PH[1]) return UPT * (x / PH[1]) ** 1.6;
      if ((x -= PH[1]) < PH[2]) { const s = x / PH[2]; return UPT + (1 - UPT) * (1 - (1 - s) ** 2); }
      if ((x -= PH[2]) < PH[3]) { const s = x / PH[3]; return 1 - (1 - UPT) * s * s; }
      x -= PH[3]; const s = x / PH[4]; return UPT * (1 - s) ** 2;
    };
    return {
      view: 'front', up: 'b', merge: false, cam: [-40, 10], beat: clock,
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
      const dbH = (s, t) => close ? path(hi(s), low(s), t) : mix(arcH(s, 1 - t), hi(s), span(1 - t, .7, 1));
      if (one) {
        /* con una mano: la derecha; la izquierda, abierta sobre el vientre */
        arms = t => ({ hands: { R: dbH('R', t), L: at(F0.pelvis, [10, 36, 24]) }, elbow: { R: under(dbH('L', t), el), L: [.6, .3, 0] }, barDir: { R: axis, L: axis }, fist: { L: false }, palm: { L: [0, -1, 0] } });
      }
      else arms = t => ({ hands: both(s => dbH(s, t)), elbow: both(() => close ? [.45, -.6, .65] : under(dbH('L', t), el)), barDir: { L: axis, R: axis } });
    }
    else {
      /* (con la barra Z, el puño a lo largo del tramo que agarra) */
      arms = t => { const c = path(top, bottom, t), H = add(c, [grip, 0, 0]); return { barC: c, grip, hands: { L: H, R: add(c, [-grip, 0, 0]) }, elbow: both(() => jm ? elbow : under(H, elbow)), ...(ez ? { barDir: both(s => ezFit(s, [0, 1, 0], 180, grip)) } : {}) }; };
    }
    /* el banco, hecho a la medida del cuerpo: el respaldo pegado a la espalda y el asiento bajo la pelvis */
    const benchGear = cam => {
      if (floor) return GR.under([GR.obox(cam, [0, 1.5, body.root[2] - 70], [[1, 0, 0], UP], [40, 1.5, 125], GR.C.pad)]);
      const back = F0.thorax, n = back.z;
      const b0 = at(back, [0, -42, -25]), b1 = at(back, [0, 150, -25]);
      const items = [GR.padAB(cam, add(b0, mul(n, -7)), add(b1, mul(n, -7)), n, 30, 7)];
      if (!ang) {
        const legs = [add(b0, [0, -14, 40]), add(b1, [0, -14, -12])].flatMap(p => GR.leg(cam, p));
        /* (con su larguero bajo el acolchado, de pata a pata) */
        return GR.under([...legs, ...GR.beam(cam, add(b0, [0, -18, 40]), add(b1, [0, -18, -12]), 5), ...items, GR.padAB(cam, add(b0, [0, -7, 0]), add(b0, [0, -7, 62]), UP, 30, 7)]);
      }
      /* el asiento (bajo la pelvis) y el armazón */
      const seatC = at(F0.pelvis, [0, -4, -27]), s0 = add([0, seatC[1] - 7, seatC[2] - 18], [0, 0, 0]), s1 = add(s0, [0, 0, 56]);
      const legs = [add(s0, [0, -7, 10]), add(b1, [0, -10, 0])].flatMap(p => GR.leg(cam, [p[0], max(8, p[1]), p[2]]));
      const extra = [];
      if (decline) {
        /* los rodillos: uno por delante de las espinillas, bajo las rodillas, y otro detrás de los tobillos */
        const kn = mix(J0.L.knee, J0.R.knee, .5), an = mix(J0.L.ankle, J0.R.ankle, .5);
        const s = norm(sub(an, kn)), fw = norm([0, s[2], -s[1]]), r1 = add(mix(kn, an, .22), mul(fw, 17)), r2 = add(add(an, mul(s, -6)), mul(fw, -17));
        [r1, r2].forEach(r => extra.push(...GR.tube(cam, add(r, [-30, 0, 0]), add(r, [30, 0, 0]), 11, GR.C.pad, 2)));
        extra.push(...GR.tube(cam, [0, 8, r2[2] - 6], add(r2, [0, 0, -6]), 5), ...GR.tube(cam, [0, 8, r2[2] - 6], [0, 8, s0[2]], 5));
      }
      return GR.under([...legs, ...extra, GR.padAB(cam, s0, s1, UP, 30, 7), ...items]);
    };
    /* el soporte de la barra: dos postes en la cabecera del banco, por dentro de los discos y por fuera de las manos, con sus
       ganchos (en J) mirando a los pies; quedan detrás de por donde pasa la barra (hacia la cabeza) y algo por debajo de donde
       acaba arriba: ahí se deja al terminar. Fijos, aunque la barra suba y baje */
    /* (dónde: por detrás de lo más cerca de la cabeza que llega la barra en todo el gesto, y el tope de seguridad, por debajo de
       lo más bajo; antes se contaba desde arriba y en el press JM, que baja hacia la barbilla, la barra daba en el tope, y la
       barra Z, en el gancho) */
    let rg = null;
    const rackGeo = () => {
      if (rg) return rg;
      let zMin = 1e9, yLow = 1e9;
      for (let i = 0; i <= 24; i++) { const c = arms(i / 24).barC; if (c) { zMin = min(zMin, c[2]); yLow = min(yLow, c[1]); } }
      return (rg = { zp: min(top[2], zMin - (ez ? 40 : 0)) - 31, yLow });
    };
    const rack = cam => {
      const { zp, yLow } = rackGeo(), yh = top[1] - 7, H = yh + 30, out = [];
      [-1, 1].forEach(k => {
        const x = k * 121;
        out.push({ ...GR.obox(cam, [x, H / 2, zp], [[1, 0, 0], UP], [6, H / 2, 6], GR.C.frame), name: 'poste' });
        out.push(GR.obox(cam, [x, 3, zp + 4], [[1, 0, 0], UP], [10, 3, 34], GR.C.frame));
        /* el gancho: la cuna (con su forro de goma) y el labio del borde */
        out.push(GR.obox(cam, [x, yh - 3, zp + 13], [[1, 0, 0], UP], [6.5, 2.5, 8], GR.C.iron), GR.obox(cam, [x, yh, zp + 13], [[1, 0, 0], UP], [6, .8, 6], GR.C.rubber));
        out.push(GR.obox(cam, [x, yh + 2.5, zp + 20], [[1, 0, 0], UP], [6.5, 5, 1.6], GR.C.iron));
        /* el tope de seguridad, abajo (donde caería la barra si fallase), también hacia los pies */
        out.push(GR.obox(cam, [x, min(yh - 70, yLow - 16), zp + 16], [[1, 0, 0], UP], [5, 3, 11], GR.C.iron));
      });
      return out;
    };
    const withRack = !db && !smith && !floor;
    /* las bandas del banco: cada una, en lazo alrededor del extremo de la barra (por fuera de los discos) y de un anclaje en el
       suelo justo debajo; con la barra en el pecho ya están algo tensas y al subir se estiran más */
    const bandGear = (q, cam) => [-1, 1].flatMap(k => { const a = [k * 196, 6, bottom[2]], b = add(q.barC, [k * 196, 0, 0]); return [GR.obox(cam, [a[0], 4, a[2]], [[1, 0, 0], UP], [9, 4, 9], GR.C.frame), ...GR.bandLoop(cam, a, b, (bottom[1] - 6) * .8, [0, 0, 1], 3.5)]; });
    return {
      view: 'bench', up: 'a', cam: incline ? [-38, 26] : [-30, 33],
      at(t) { return { ...body, ...arms(t) }; },
      gear(q, F, cam) {
        const out = [...benchGear(cam)];
        if (db) out.push(...(one ? GR.dumbbell(cam, q.hands.R, dbAxis(F, q, 'R'), 'R') : pair(q, cam, null, F)));
        else if (ez) out.push(...ezBar(cam, q.barC, grip, ezCd(F, grip)));
        else out.push(...bb(q, cam));
        if (smith) out.push(...GR.smithFrame(cam, q.barC[2]).map(i => ({ ...i, nf: true })), ...GR.smithHooks(cam, q.barC));
        if (band) out.push(...bandGear(q, cam));
        if (withRack) out.push(...rack(cam));
        return out;
      },
    };
  };
  /* la barra Z (unos 120 cm): el centro recto y, a cada lado, una W: un tramo inclinado (el agarre cerrado, hacia x = 24), un
     valle plano y otro tramo inclinado al revés (el agarre abierto, hacia x = 50), que vuelve a la línea del centro antes del
     collarín. Las curvas van en el plano de las palmas (cd: perpendicular a la barra y a los antebrazos), así que giran con la
     barra en las manos. Las manos van sobre los tramos inclinados: la barra se desplaza lo que haga falta para que pase por
     ellas. Antes, las curvas eran apenas un pellizco fijo hacia delante, con las manos en los vértices */
  /* (curvas bien marcadas, de unos 8 cm, para que se distinga de una barra recta de un vistazo) */
  const EZ_D = 17, EZ_P = [[0, 0], [12, 0], [31, -1], [41, -1], [60, 0], [80, 0]];
  const ezOff = x => { x = abs(x); for (let i = 1; i < EZ_P.length; i++) if (x <= EZ_P[i][0]) { const [a, u] = EZ_P[i - 1], [b, v] = EZ_P[i]; return EZ_D * (u + (v - u) * (x - a) / (b - a)); } return 0; };
  /* el plano de las curvas, desde los puños: la media de hacia dónde miran los nudillos, sin su parte a lo largo de la barra */
  /* (y, si se da dónde van las manos (grip), el sentido de las curvas que deja el tramo que agarra cada mano a lo largo de su
     puño: antes las curvas iban siempre hacia la palma y, con la barra agarrada en las curvas de fuera, el tramo cruzaba el puño
     torcido, como si la muñeca girara al revés) */
  const ezSlope = x => { x = abs(x); for (let i = 1; i < EZ_P.length; i++) if (x <= EZ_P[i][0]) { const [a, u] = EZ_P[i - 1], [b, v] = EZ_P[i]; return EZ_D * (v - u) / (b - a); } return 0; };
  /* el eje del puño s agarrado a la barra Z en grip (de su centro), con el antebrazo v (del codo a la mano): a lo largo del tramo
     de la barra que agarra (las curvas, ~42° de la recta), girando desde base (0, supino; 180, prono) hacia neutro, como hace la
     muñeca. Antes el puño giraba un ángulo fijo (22°) que no era el de la barra: el tramo lo cruzaba torcido */
  const ezFit = (s, v, base, grip) => {
    const k = ezSlope(grip), gx0 = base > 90 ? [1, 0, 0] : [-1, 0, 0];
    if (!k) return gx0;
    /* (las curvas, en el plano de través a los antebrazos, hacia los nudillos o hacia las palmas, lo que gire la mano hacia
       neutro: la barra Z es plana, así que es el mismo plano para las dos manos; si el antebrazo no queda de través a la barra,
       la muñeca se dobla de lado, como con cualquier barra) */
    const gy = mul(norm(v), -1), kn = cross(gx0, gy), kp = norm([0, kn[1], kn[2]]), cd = mul(kp, k < 0 ? 1 : -1);
    const seg = norm(add([1, 0, 0], mul(cd, s == 'L' ? k : -k)));
    return dot(seg, gx0) >= 0 ? seg : mul(seg, -1);
  };
  /* el plano de las curvas para dibujar la barra: el que deja el tramo de cada mano a lo largo de su puño (sale de los ejes de los
     puños), de través a los antebrazos. Sin grip, o si las manos van en lo recto, hacia los nudillos */
  const ezCd = (F, grip) => {
    const v = add(F.gripL.z, F.gripR.z), cd0 = len([0, v[1], v[2]]) > 1e-6 ? norm([0, v[1], v[2]]) : [0, 0, 1];
    const k = grip == null ? 0 : ezSlope(grip);
    if (!k) return cd0;
    const est = (g, sg) => { const gx = dot(g, [1, 0, 0]) < 0 ? mul(g, -1) : g, c = dot(gx, [1, 0, 0]); if (c < .3) return null; const d = mul(sub(mul(gx, 1 / c), [1, 0, 0]), sg / k); return [0, d[1], d[2]]; };
    const a = est(F.gripL.x, 1), b = est(F.gripR.x, -1);
    let m = a && b ? add(a, b) : a || b;
    if (!m || len(m) < 1e-6) return cd0;
    /* (sin lo que vaya a lo largo de los antebrazos: la barra es plana) */
    const fa0 = add(F.foreL.y, F.foreR.y), fa = len([0, fa0[1], fa0[2]]) > 1e-6 ? norm([0, fa0[1], fa0[2]]) : null;
    if (fa) m = sub(m, mul(fa, dot(m, fa)));
    return len(m) > 1e-6 ? norm(m) : cd0;
  };
  /* (small: solo el disco pequeño, para los gestos con los codos muy abiertos, como el remo al mentón) */
  const ezBar = (cam, c, grip, cd = [0, 0, 1], small = false) => {
    const o = add(c, mul(cd, -ezOff(grip))), X = x => add(o, add([x, 0, 0], mul(cd, ezOff(x)))), out = [];
    const xs = [-80, -60, -50.5, -41, -31, -21.5, -12, 0, 12, 21.5, 31, 41, 50.5, 60, 80];
    for (let i = 0; i + 1 < xs.length; i++) {
      const it = bar(cam, X(xs[i]), X(xs[i + 1]), 1, 4.6), xm = (xs[i] + xs[i + 1]) / 2;
      if (abs(abs(xm) - grip) < 9) it.forEach(j => { j.hand = xm > 0 ? 'L' : 'R'; });
      out.push(...it);
    }
    /* los collarines, las mangas y los discos (uno mediano y uno pequeño por lado) */
    [-1, 1].forEach(k => {
      /* (los discos, hacia fuera de la manga: con los codos abiertos, en el remo al mentón, no los tocan) */
      out.push(GR.disc(cam, X(k * 81), [1, 0, 0], 7, 3, 'metal'), ...bar(cam, X(k * 82), X(k * 124), 2, 7));
      if (!small) out.push(GR.disc(cam, X(k * 103), [1, 0, 0], 30, 7));
      out.push(GR.disc(cam, X(k * 111), [1, 0, 0], 21, 5), GR.disc(cam, X(k * 117), [1, 0, 0], 6, 4, 'metal'));
    });
    return out;
  };

  /* ════ press de hombro ════ */
  const overhead = f => {
    const seated = has(f, 'seated') || has(f, 'machine'), one = has(f, 'one') || has(f, 'kb') || has(f, 'cable') || (has(f, 'landmine') && !has(f, 'two'));
    const machine = has(f, 'machine'), smith = has(f, 'smith'), barb = has(f, 'bar') || smith, arnold = has(f, 'arnold'), neutral = has(f, 'neutral');
    const kb = has(f, 'kb'), cable = has(f, 'cable'), band = has(f, 'band'), landmine = has(f, 'landmine'), two = landmine && has(f, 'two');
    /* sentado: en un banco con respaldo casi vertical; de pie: las rodillas apenas dobladas */
    const ROOT_Y = LEN.ankle + LEN.shin + LEN.thigh - 4;
    let body = seated ? { root: [0, 122, 0], tilt: -6, spine: -2, neck: 0, feet: both(() => [40, 86, 14]), knee: both(() => [.25, .7, .7]) }
      : { root: [0, ROOT_Y, 0], tilt: 0, spine: 0, neck: 0, feet: both(() => [27, -2, 12]), knee: both(() => [.2, 0, 1]) };
    if (landmine) body = { ...body, feet: { L: [26, 26, 10], R: [26, -22, 14] }, tilt: 8, spine: 4, neck: -10 };
    const bodyAt = t => {
      if (barb) return { ...body, spine: body.spine - 4 * sin(PI * t) + t, neck: -14 + 10 * t };
      /* (a dos manos, empuja también con las piernas: abajo, las rodillas algo dobladas, que se estiran al empujar) */
      if (two) return { ...body, root: add(body.root, [0, -9 * (1 - t), 0]), tilt: 10 + 8 * t, spine: 4 + 3 * t, neck: -10 - 6 * t };
      if (landmine) return { ...body, tilt: 8 + 4 * t, spine: 4 + 3 * t, neck: -10 - 6 * t };
      return body;
    };
    /* las mancuernas: abajo, a la altura de las orejas por fuera de los hombros, con el antebrazo vertical; arriba, sobre los
       hombros con los brazos estirados */
    const HIGH = [40, 222, 4];
    /* el codo sube por un arco desde algo por debajo del hombro (hacia fuera y fwd grados hacia delante) con el antebrazo
       vertical; al final, el brazo se estira y la mano se mete un poco, sobre el hombro */
    const arcAt = (th, fwd) => { const u = [cos(RAD(fwd)), 0, sin(RAD(fwd))], E = [47 + LEN.upper * cos(th) * u[0], 80 + LEN.upper * sin(th), -2 + LEN.upper * cos(th) * u[2]]; return { E, H: [E[0], E[1] + LEN.fore + LEN.grip, E[2]] }; };
    const arcT = (t, fwd) => arcAt(RAD(mix(-38, 76, t)), fwd);
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
      /* las asas van en dos palancas que giran en un eje detrás de la cabeza (cada asa, por su arco, sin abrirse ni cerrarse):
         de junto a las orejas a los brazos estirados por encima de la cabeza */
      let geo = null;
      arms = (F, t) => {
        if (!geo) {
          const a = T(F, 'L', add(arcT(0, 40).H, [0, 0, 6])), b = T(F, 'L', [44, 220, 22]), x = (a[0] + b[0]) / 2;
          const A = [x, a[1], a[2]], B = [x, b[1], b[2]], P = pivotFor(A, B, [0, 0, -1], 96);
          geo = { A, B, P };
        }
        const H = leverAt(geo.P, geo.A, geo.B, t);
        return { hands: { L: H, R: [-H[0], H[1], H[2]] }, elbow: both(() => elAt(F, t, 40)), barDir: [1, 0, 0], piv: geo.P };
      };
      gear = (q, F, cam) => machineGear(cam, q, F);
    }
    else if (arnold) {
      /* Arnold: empieza con las mancuernas a la altura de la barbilla, las palmas hacia uno y los codos juntos delante del pecho.
         Al subir, los codos se abren por un arco hacia los lados (con el antebrazo siempre vertical) mientras las muñecas giran:
         las palmas pasan de mirar a uno a mirarse y a mirar adelante. El giro acaba con las mancuernas a la altura de la frente,
         ya subiendo, y de ahí sigue como el press normal. Antes la mano iba en línea recta de delante al lado, sin subir, y
         luego subía: el codo daba un bandazo y las mancuernas pasaban rozando la cara */
      const azAt = t => RAD(mix(104, 25, ease(clamp(t / .5, 0, 1)))), evAt = t => RAD(mix(-62, 76, t ** 1.64));
      const arc = t => { const a = azAt(t), e = evAt(t), E = [47 + LEN.upper * cos(e) * cos(a), 80 + LEN.upper * sin(e), -2 + LEN.upper * cos(e) * sin(a)]; return { E, H: [E[0], E[1] + LEN.fore + LEN.grip, E[2]] }; };
      arms = (F, t) => {
        const a = arc(t), lock = span(t, .68, 1), th = PI * span(t, .04, .5);
        const hands = both(s => mix(T(F, s, a.H), T(F, s, HIGH), lock));
        const el = norm(mix(norm(sub(T(F, 'L', a.E), T(F, 'L', [47, 80, -2]))), [.2, -1, 0], lock * .5));
        return { hands, elbow: both(() => el), barDir: { L: [cos(PI - th), 0, sin(PI - th)], R: [cos(PI + th), 0, sin(PI + th)] } };
      };
      gear = (q, F, cam) => pair(q, cam, null, F);
    }
    else if (kb) {
      /* la kettlebell en la posición de rack (la bola apoyada por fuera del antebrazo) y arriba, con la palma hacia delante */
      arms = (F, t) => {
        const R = mix(T(F, 'R', [28, 94, 30]), T(F, 'R', [42, 222, 2]), t), th = PI * 1.5 + PI / 2 * span(t, .1, .8);
        return { hands: { R, ...freeL(F) }, elbow: { R: norm(mix([-.27, -.92, .3], elOut, span(t, 0, .5))), L: [.1, 0, -1] }, barDir: { R: [cos(th), 0, sin(th)], L: [1, 0, 0] }, fist: { L: false }, palm: { L: [-1, 0, 0] } };
      };
      gear = (q, F, cam) => GR.kettlebell(cam, at(F.gripR, [0, 9, 28]), q.hands.R, q.barDir.R, 'R');
    }
    else if (landmine) {
      /* la barra apoyada en el suelo por delante: el extremo va por su arco, hacia delante y arriba, hasta estirar el brazo. A
         una mano, desde el hombro (la otra, suelta); a dos (Landmine press), desde el pecho, con las manos juntas en el extremo */
      const LM = 400;
      let geo = null;
      arms = (F, t) => {
        if (!geo) {
          const h0 = two ? at(F.thorax, [0, 64, 40]) : T(F, 'R', [30, 88, 30]), sh = two ? mix(shoulder(F, 'L'), shoulder(F, 'R'), .5) : shoulder(F, 'R');
          const piv = [h0[0] * .4, 6, h0[2] + sqrt(LM ** 2 - (h0[1] - 6) ** 2 - (h0[0] * .6) ** 2)];
          const u = norm(sub(h0, piv));
          const at2 = a => add(piv, mul(add(mul(u, cos(a)), mul(norm(sub([0, 1, 0], mul(u, dot([0, 1, 0], u)))), sin(a))), LM));
          /* (a dos manos, cada mano a 8 del extremo: el brazo llega estirado cuando el extremo está a algo menos del hombro) */
          const reach = two ? sqrt(146 ** 2 - (47 - 8) ** 2) : 146;
          let a1 = 0; for (let a = 0; a < .7; a += .002) { if (len(sub(at2(a), sh)) <= reach) a1 = a; }
          geo = { piv, at2, a1 };
        }
        const E = geo.at2(geo.a1 * t), bd = norm(sub(E, geo.piv));
        if (two) return { hands: { L: add(E, [8, 0, 0]), R: add(E, [-8, 0, 0]) }, elbow: both(() => [.35, -1, .05]), barDir: both(() => bd), piv: geo.piv, lmEnd: E };
        /* (a una mano, el puño agarra el manguito a lo largo de la barra, con el pulgar hacia su extremo: antes iba de través y la
           barra lo cruzaba torcida) */
        return { hands: { R: E, ...freeL(F) }, elbow: { R: [.25, -1, .2], L: [.1, 0, -1] }, barDir: { R: thumbTo('R', bd), L: [1, 0, 0] }, fist: { L: false }, palm: { L: [-1, 0, 0] }, piv: geo.piv };
      };
      cam = [-62, 10];
      gear = (q, F, cam) => landmineGear(cam, q);
    }
    else if (cable) {
      /* con una mano, de pie junto a la polea baja: el cable sube de la polea al asa */
      arms = (F, t) => ({ hands: { R: pressed(F, 'R', t), ...freeL(F) }, elbow: { R: elAt(F, t), L: [.1, 0, -1] }, barDir: [1, 0, 0], fist: { L: false }, palm: { L: [-1, 0, 0] } });
      /* (el cable se engancha en el arco del asa, que pasa por detrás de los nudillos: arriba, si saliera del centro del puño,
         rozaría la muñeca) */
      gear = (q, F, cam) => [...GR.pulleyTower(cam, [-80, 0, -120], 16, add(q.hands.R, mul(F.gripR.z, 10))), ...GR.tube(cam, add(q.hands.R, [-7, 0, 0]), add(q.hands.R, [7, 0, 0]), 4, ['#b9bed0', '#0a0b10'], 1).map(i => ({ ...i, hand: 'R' }))];
    }
    else {
      /* mancuernas (o bandas): con una mano o con las dos; agarre normal o neutro (las palmas, una frente a otra) */
      const nb = neutral ? { L: [0, 0, 1], R: [0, 0, -1] } : [1, 0, 0];
      const fwd = neutral ? 55 : 25;
      if (one) arms = (F, t) => ({ hands: { R: pressed(F, 'R', t, fwd), ...freeL(F) }, elbow: { R: elAt(F, t, fwd), L: [.1, 0, -1] }, barDir: nb, fist: { L: false }, palm: { L: [-1, 0, 0] } });
      else arms = (F, t) => ({ hands: both(s => pressed(F, s, t, fwd)), elbow: both(() => elAt(F, t, fwd)), barDir: nb });
      gear = (q, F, cam) => band ? bands(cam, F, q) : one ? GR.dumbbell(cam, q.hands.R, dbAxis(F, q, 'R'), 'R') : pair(q, cam, null, F);
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
  /* la máquina de press de hombro: el asiento y el respaldo (del banco); detrás, la columna que sube hasta el eje de las
     palancas, con el eje de lado a lado, y su base en el suelo; cada palanca, de sección cuadrada, va de su cubo en el eje al asa,
     con su puño de goma; la pila de pesas, detrás de la columna, colgada de su viga */
  const machineGear = (cam, q, F) => {
    const out = [], P = q.piv, zc = P[2] - 6;
    out.push(...GR.under([
      ...GR.beam(cam, [0, 4, zc], [0, P[1] + 4, zc], 8), ...GR.beam(cam, [0, 4, zc - 70], [0, 4, zc + 120], 6), ...GR.beam(cam, [-52, 4, zc - 70], [52, 4, zc - 70], 6),
      ...GR.beam(cam, [0, 168, zc], [0, 168, zc - 52], 5), ...GR.stack(cam, [0, 0, zc - 52], [0, 0, 1], 12),
      /* (el cable, de la varilla de la pila a una polea en lo alto de la columna y de ahí al eje) */
      ...GR.cableLine(cam, [0, 127, zc - 52], [0, P[1] - 16, zc - 14]), GR.disc(cam, [0, P[1] - 12, zc - 10], [1, 0, 0], 7, 4, 'wheel')]));
    [-1, 1].forEach(k => {
      const s = k > 0 ? 'L' : 'R', h = q.hands[s], x = h[0] + k * 12, hub = [x, P[1], P[2]];
      out.push(...GR.beam(cam, [0, P[1], P[2]], hub, 4.5), ...GR.hub(cam, add(hub, [k * 6, 0, 0]), [1, 0, 0]));
      out.push(...GR.beam(cam, hub, [x, h[1], h[2]], 4.6), ...GR.rubber(cam, [x - k * 2, h[1], h[2]], add(h, [-k * 9, 0, 0])).map(i => ({ ...i, hand: s })));
    });
    return out;
  };
  /* el landmine: la base en el suelo, la barra hasta la mano y el disco en la parte de dentro del manguito (lejos de la mano
     y del antebrazo) */
  const landmineGear = (cam, q) => {
    const p = q.piv, h = q.lmEnd || q.hands.R, u = norm(sub(h, p)), out = [];
    out.push(GR.obox(cam, [p[0], 3, p[2]], [[1, 0, 0], UP], [22, 3, 22], GR.C.frame));
    out.push(...bar(cam, add(p, mul(u, -8)), add(h, mul(u, -88)), 8, 5.2));
    out.push(...bar(cam, add(h, mul(u, -88)), add(h, mul(u, 8)), 3, 7.6).map((i, n) => n == 2 && !q.lmEnd ? { ...i, hand: 'R' } : i));
    out.push(GR.disc(cam, add(h, mul(u, -80)), u, 34, 8));
    return out;
  };

  F3.FAMILIES = { squat, press, overhead };
  /* lo que comparten las familias de los otros lotes (cada lote, en su archivo) */
  /* lo que la cara de delante del muslo y de la espinilla sobresale de su eje, según la distancia a la cadera (o a la rodilla):
     el medio fondo del dibujo más lo que se adelanta su centro (los perfiles de fig3d). El muslo abulta hasta 22 a media
     altura; antes se tomaba 15, y la barra que subía pegada a él pasaba por dentro del cuádriceps */
  const THIGH_F = [[-10, 12], [2, 17], [12, 20.1], [28, 22.4], [46, 21.4], [62, 18.2], [74, 14.4], [88, 11], [99, 10.5]];
  const SHIN_F = [[-8, 10.5], [4, 11], [14, 12.2], [26, 11.6], [40, 10], [54, 8], [70, 7], [84, 6.6], [92, 6.6]];
  /* y su medio ancho (hacia los lados) */
  const THIGH_W = [[-10, 12], [2, 17.5], [12, 19.2], [28, 19.2], [46, 17.6], [62, 15.5], [74, 13], [88, 10.5], [99, 10]];
  const SHIN_W = [[-8, 10], [4, 11.5], [14, 15.2], [26, 14.6], [40, 11.4], [54, 8], [70, 6.4], [84, 6.2], [92, 6.2]];
  const prof1 = (tab, d) => { if (d <= tab[0][0]) return tab[0][1]; for (let i = 1; i < tab.length; i++) if (d <= tab[i][0]) { const a = tab[i - 1], b = tab[i]; return a[1] + (b[1] - a[1]) * (d - a[0]) / (b[0] - a[0]); } return tab[tab.length - 1][1]; };
  /* lo más adelantado de las piernas a la altura y: la cara de delante del muslo o de la espinilla, contada en horizontal (con
     la pierna inclinada, la sección a una altura es más larga que el grosor: e / cos). Lo que va pegado a ellas (la barra, las
     mancuernas, la kettlebell) tiene que quedar por delante */
  const legFront = (J, y, xr) => {
    let z = -1e9;
    for (const s of ['L', 'R']) {
      const j = J[s];
      const seg = (a, b, tab, wtab, L0, ext) => {
        const dy = b[1] - a[1], dz = b[2] - a[2], ln = Math.hypot(dy, dz) || 1, c = max(.25, abs(dy) / ln), lo = min(a[1], b[1]) - ext, hi = max(a[1], b[1]) + ext;
        if (y < lo || y > hi) return;
        const u = abs(dy) > 1e-6 ? clamp((y - a[1]) / dy, 0, 1) : .5, e = prof1(tab, u * L0);
        /* con xr (de x0 a x1, en valor absoluto): solo si la pierna, a esa altura, llega a esa franja */
        if (xr) { const xc = abs(a[0] + (b[0] - a[0]) * u), hw = prof1(wtab, u * L0); if (xc + hw < xr[0] || xc - hw > xr[1]) return; }
        z = max(z, a[2] + dz * u + e / c);
      };
      seg(j.hip, j.knee, THIGH_F, THIGH_W, LEN.thigh, 4); seg(j.knee, j.ankle, SHIN_F, SHIN_W, LEN.shin, 4);
    }
    return z;
  };
  /* lo más adelantado de las piernas a la altura y justo en x (en valor absoluto), para algo de radio r: la sección de cada pierna
     a esa altura es una elipse (su medio ancho y su fondo, estirado por la inclinación), así que lo que hace falta adelantarse
     crece y decrece sin saltos según se solapa con ella */
  const legFrontX = (J, y, x, r) => {
    let z = -1e9;
    for (const s of ['L', 'R']) {
      const j = J[s];
      const seg = (a, b, tab, wtab, L0) => {
        const dy = b[1] - a[1], dz = b[2] - a[2], ln = Math.hypot(dy, dz) || 1, c = max(.25, abs(dy) / ln);
        if (y < min(a[1], b[1]) - 4 || y > max(a[1], b[1]) + 4) return;
        const u = abs(dy) > 1e-6 ? clamp((y - a[1]) / dy, 0, 1) : .5, xc = abs(a[0] + (b[0] - a[0]) * u), hw = prof1(wtab, u * L0) + r, k = 1 - ((x - xc) / hw) ** 2;
        if (k > 0) z = max(z, a[2] + dz * u + (prof1(tab, u * L0) / c + r) * sqrt(k));
      };
      seg(j.hip, j.knee, THIGH_F, THIGH_W, LEN.thigh); seg(j.knee, j.ankle, SHIN_F, SHIN_W, LEN.shin);
    }
    return z;
  };
  /* lo que tiene que adelantarse lo que se lleva en las manos (a la altura y, con las manos a g del centro) para que ni ello
     (rng: su alto respecto a las manos; need: su radio y un margen) ni los puños y antebrazos, que cuelgan sobre ello, toquen
     las piernas */
  const loadFront = (J, y, g, rng, need) => {
    let m = -1e9;
    for (let d = rng[0]; d <= rng[1] + 1e-9; d += 5) m = max(m, legFront(J, y + d) + need);
    for (let d = 0; d <= 50; d += 5) m = max(m, legFront(J, y + d, [g - 11, g + 11]) + 10.5);
    return m;
  };

  /* la mano abierta apoyada encima del muslo, a k de la cadera a la rodilla: la palma, sobre la cara de delante del muslo tal
     como se dibuja (antes se ponía en un punto fijo respecto a la pelvis y la mano se hundía en él). Devuelve la mano y hacia
     dónde mira la palma */
  const onThigh = (q, s, k = .7, lift = 4) => {
    const { F, J } = pose({ ...q, hands: ZERO, elbow: {} }), th = F['thigh' + s], d = k * len(sub(J[s].knee, J[s].hip));
    return { hand: add(add(J[s].hip, mul(norm(sub(J[s].knee, J[s].hip)), d)), mul(th.z, prof1(THIGH_F, d) + lift)), palm: mul(th.z, -1) };
  };

  /* las palancas de las máquinas giran en un eje: la mano va por un arco. pivotFor: el eje para ir de a a b, a igual distancia
     de los dos y a d del punto medio, hacia dir (que se endereza para quedar en ángulo recto con a → b). leverAt: la mano en el
     momento t, de a (t = 0) a b (t = 1), girando alrededor de P */
  const pivotFor = (a, b, dir, d) => { const ab = norm(sub(b, a)), n = norm(sub(dir, mul(ab, dot(dir, ab)))); return add(mix(a, b, .5), mul(n, d)); };
  const leverAt = (P, a, b, t) => {
    const u = sub(a, P), v = sub(b, P), k = norm(cross(u, v)), th = acos(clamp(dot(norm(u), norm(v)), -1, 1)) * t, c = cos(th), s = sin(th);
    return add(P, add(add(mul(u, c), mul(cross(k, u), s)), mul(k, dot(k, u) * (1 - c))));
  };
  /* una curva suave que pasa por los valores de K ([t, valor]) sin pasarse de ellos: donde el valor da la vuelta (o se queda
     igual) se para, y donde sigue en el mismo sentido pasa de largo sin frenar (interpolación cúbica monótona). La usan las
     familias de todos los lotes: va aquí, en lo que carga cada página (antes estaba en core3d.js y la página del lote 5, que
     no lo carga, fallaba en las flexiones con palmada y se quedaba sin figuras) */
  const spl = (t, K) => {
    const n = K.length;
    if (t <= K[0][0]) return K[0][1];
    if (t >= K[n - 1][0]) return K[n - 1][1];
    let i = 1; while (K[i][0] < t) i++;
    const sl = j => { if (j <= 0 || j >= n - 1) return 0; const a = (K[j][1] - K[j - 1][1]) / (K[j][0] - K[j - 1][0]), b = (K[j + 1][1] - K[j][1]) / (K[j + 1][0] - K[j][0]); return a * b <= 0 ? 0 : 2 * a * b / (a + b); };
    const [x0, y0] = K[i - 1], [x1, y1] = K[i], h = x1 - x0, u = (t - x0) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * y0 + (u3 - 2 * u2 + u) * h * sl(i - 1) + (3 * u2 - 2 * u3) * y1 + (u3 - u2) * h * sl(i);
  };
  /* el eje de lo que agarra la mano s para que el pulgar quede hacia d (así lo entiende el motor: en la izquierda, el pulgar
     va al lado contrario del eje; en la derecha, al mismo) */
  const thumbTo = (s, d) => s == 'L' ? mul(norm(d), -1) : norm(d);
  F3.mlib = { spl, visAll, ezFit, thumbTo, pivotFor, leverAt, has, pose, torso, ZERO, UP, sd, both, T, shoulder, span, comOf, midFoot, COP, solve, solveNear, smin, smax, legRoot, bb, pair, bands, olympic, dbAxis, bodyCaps, taut, occluders, visTag, THIGH_F, SHIN_F, THIGH_W, SHIN_W, prof1, legFront, legFrontX, loadFront, onThigh, ezBar, ezCd };
  /* la figura de un ejercicio: su familia y variantes (palabras), y sus músculos principales (P) y secundarios (S) */
  F3.make = (name, words, P, S) => {
    const w = words.split(' '), fam = F3.FAMILIES[w[0]];
    if (!fam) return null;
    const ex = fam(w.slice(1));
    if (!ex) return null;
    /* la postura de cada momento se guarda (en 1/480 del gesto): el gesto se repite y algunas posturas cuestan de calcular (el
       equilibrio de la sentadilla, el paso de la zancada), así que cada una se calcula una vez. Se devuelve una copia, por si
       quien la pide la toca */
    const raw = ex.at, memo = new Map();
    ex.at = t => { const k = Math.round(clamp(t, 0, 1) * 480); let q = memo.get(k); if (!q) { q = raw(k / 480); memo.set(k, q); } return { ...q }; };
    return Object.assign(ex, { name, P, S, pause: ex.pause != null ? ex.pause : has(w, 'pause') ? 900 : 0, yaw: ex.cam[0], pitch: ex.cam[1] });
  };
})(window);
