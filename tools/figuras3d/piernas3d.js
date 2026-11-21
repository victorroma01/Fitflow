/* ═══ figuras 3D: las piernas (lote 3) ═══
   Bisagras de cadera (pesos muertos, rumanos, buenos días, pull-through), zancadas, hip thrust y puentes, y las máquinas
   de pierna (prensa, hack, extensión y curl femoral). Como en los lotes 1 y 2, las posturas salen de reglas: de pie, con la
   espalda recta, la cadera se coloca para que el peso (el del cuerpo con el de la carga) caiga sobre el medio del pie; con la
   barra en el suelo, la barra sube en vertical por encima del medio del pie, rozando las espinillas.
   Define: Fig3D.FAMILIES.hinge, .lunge, .thrust, .legPress, .hack, .legExt, .legCurl */
(function (G) {
  const F3 = G.Fig3D, L = F3.lib, GR = F3.gear, M = F3.mlib;
  const { add, sub, mul, dot, len, norm, mix, ease, clamp, at, RAD, LEN, bar, barbell, cross } = L;
  const { has, pose, torso, ZERO, UP, sd, both, T, shoulder, span, comOf, midFoot, solve, solveNear, legRoot, bb, pair, dbAxis, bodyCaps, taut, visTag, THIGH_F, SHIN_F, THIGH_W, SHIN_W, prof1, legFront, legFrontX, loadFront } = M;
  const { cos, sin, PI, abs, max, min, sqrt, atan2 } = Math;
  const STEEL = ['#b9bed0', '#0a0b10'];

  /* el tronco inclinado lean grados con la espalda recta (toda la inclinación sale de la cadera) */
  const trunk = lean => ({ tilt: lean + 3, spine: -3 });
  /* el centro de los dos hombros */
  const shC = (F, q) => mix(shoulder(F, 'L', q), shoulder(F, 'R', q), .5);
  /* la altura de la mano con el brazo estirado (145) desde el hombro S, dx hacia dentro y en la vertical de z */
  const armY = (S, dx, z) => S[1] - sqrt(max(0, 145 ** 2 - dx * dx - (S[2] - z) ** 2));
  /* una tabla de 41 momentos, calculada la primera vez que hace falta, y su valor en t (interpolado) */
  const table = make => { let tab = null; return t => { if (!tab) { tab = []; for (let i = 0; i <= 40; i++) tab.push(make(i / 40, tab[i - 1])); } const x = clamp(t, 0, 1) * 40, i = min(39, Math.floor(x)), k = x - i; return tab[i].map((v, j) => v + (tab[i + 1][j] - v) * k); }; };
  /* la pierna con la rodilla doblada kf grados y la espinilla ps grados hacia delante (negativo: la rodilla por detrás del
     tobillo, la pierna entera echada atrás, como al llevar la cadera atrás con las rodillas casi estiradas) */
  const legKf = (w, za, toe, kf, ps) => legRoot(w, za, toe, ps, 90 - kf + ps);

  /* ════ bisagras de cadera ════ */
  const hinge = f => {
    const w = x => has(f, x);
    const dl = w('dl'), sumo = w('sumo'), hex = w('hex'), deficit = w('deficit'), rack = w('rack'), gm = w('gm'), seated = w('seated');
    const single = w('single'), stiff = w('stiff'), cable = w('cable'), band = w('band'), db = w('db'), kb = w('kb'), smith = w('smith');
    /* los pies: medio ancho de los tobillos, la punta hacia fuera; en el sumo, muy abiertos */
    const fw = sumo ? 66 : hex ? 30 : cable ? 44 : 28, toe = sumo ? 36 : cable ? 18 : 8, plat = deficit ? 14 : 0;
    const feet = both(() => [fw, 0, toe, plat]);
    /* el agarre: por fuera de las piernas; en el sumo, por dentro de las rodillas; en la hexagonal, a los lados */
    /* (por fuera de las piernas del todo, que con su grosor llegan a 47 del centro; en el sumo, por dentro de las rodillas) */
    const g = sumo ? 28 : hex ? 56 : db ? 56 : kb ? 8 : 58;
    const load = dl ? 1 : gm ? .5 : db || kb || band || cable ? .3 : .5;
    let at_, gear = () => [], cam = [-58, 10], rest = 'a', up = 'a', one = false, feetOff = false, view = 'front';

    if (dl) {
      /* ── peso muerto: la barra sube en vertical sobre el medio del pie (del suelo, de la tarima o de los soportes del rack) ──
         Con cada altura de la barra: las espinillas, inclinadas lo justo para rozarla y cada vez más verticales al subir; la
         cadera, a la altura que deja los brazos estirados hasta ella; y el tronco, lo inclinado que pone el peso sobre el medio
         del pie */
      const zb = midFoot(pose({ root: [0, 190, 0], tilt: 0, spine: 0, feet, knee: both(() => [0, 0, 1]), hands: ZERO, elbow: {} }).F, sumo ? 20 : 17)[2];
      const floorY = 49 + plat * 0, hBar = rack ? 118 : floorY;
      /* (la última pierna, guardada: para cada muslo se prueban varios troncos con las mismas piernas) */
      let lk0 = NaN, lk1 = NaN, lv = null;
      const legs = (ps, pt) => ps === lk0 && pt === lk1 ? lv : (lk0 = ps, lk1 = pt, lv = legRoot(fw, 0, toe, ps, pt));
      const mk = (ps, pt, lean) => { const lr = legs(ps, pt); return { root: add(lr.root, [0, plat, 0]), ...trunk(lean), neck: -.35 * lean, feet, knee: both(() => lr.knee), shrug: 0, reach: 3 }; };
      /* la barra pasa por delante de las piernas, nunca por dentro: sobre el medio del pie mientras las espinillas la dejan pasar
         (más verticales cuanto más sube) y, por las rodillas y los muslos, rozando su cara de delante (con el grosor del
         dibujo). Antes las espinillas se inclinaban contando un grosor menor y la barra pasaba por dentro de las rodillas; en el
         sumo, por las espinillas. En la hexagonal, las asas van a los lados: no hay nada que esquivar */
      const clear = 2.6 + 1.8, kneeY = LEN.ankle + LEN.shin + plat;
      const shinFront = (y, ps) => { const hy = y - LEN.ankle - plat, c = cos(RAD(ps)), d = clamp(LEN.shin - hy / c, -8, 92); return hy * Math.tan(RAD(ps)) * cos(RAD(toe)) + prof1(SHIN_F, d) / c; };
      const psMaxAt = y => { if (y >= kneeY || hex) return 90; const f = p => shinFront(y, p) - (zb - clear); return f(-12) > 0 ? -12 : solve(f, -12, 30); };
      const shin0 = sumo ? 7 : 14;
      const zAt = (q, y) => { if (hex) return zb; const { J } = pose({ ...q, hands: ZERO, elbow: {} }); return max(zb, loadFront(J, y, g, [0, 0], clear)); };
      const hands = (y, z) => ({ L: [g, y, z], R: [-g, y, z] });
      /* (solo con el tronco: es lo que más se prueba) */
      const reach = (q, y, z) => len(sub(shoulder(torso(q), 'L', q), [g, y, z])) - 145;
      const bal = (q, y, z, k) => { const { F, J } = pose({ ...q, hands: hands(y, z), elbow: both(() => [.1, .2, -1]) }); return midFoot(F, k)[2] - comOf(F, J, [[[0, y, z], load]])[2]; };
      /* de pie, arriba: piernas estiradas, la barra donde llegan los brazos, delante de los muslos, y el tronco lo justo para el
         equilibrio */
      const PT0 = 88;
      const yTop = (l, z) => { const q = mk(0, PT0, l); return armY(shoulder(torso(q), 'L', q), g - 47, z); };
      let zTop = zb, lean0 = 0;
      /* (con la barra delante de los muslos, arriba el cuerpo se echa algo atrás para equilibrarla) */
      for (let i = 0; i < 4; i++) { lean0 = solve(l => bal(mk(0, PT0, l), yTop(l, zTop), zTop, 9), -20, 20); zTop = zAt(mk(0, PT0, lean0), yTop(lean0, zTop)); }
      const top = yTop(lean0, zTop), yK = kneeY + 4;
      let zPath = y => hex || y <= yK ? zb : zb + (zTop - zb) * ease(clamp((y - yK) / (top - yK), 0, 1));
      const makePost = zPath => table((t, prev) => {
        const y = mix(top, hBar, t), k = clamp((kneeY + 10 - y) / (kneeY + 10 - floorY), 0, 1);
        /* la espinilla: cada vez más vertical al subir, y nunca tanto hacia delante que su cara pase la barra */
        const ps = min(shin0 * k ** 1.3, psMaxAt(y));
        /* de la altura de la cadera hay dos que dejan los brazos estirados: la que sigue a la de antes (arriba, de pie) */
        if (!prev) return [0, PT0, lean0, top, zTop];
        const p0 = prev, kk = mix(9, 14, t);
        /* el tronco: arriba, lo que equilibra; abajo (con la barra bajo las rodillas), lo que deja los hombros justo por delante
           de la barra, con los brazos casi verticales. Solo con el equilibrio en un punto fijo del pie, la cadera se quedaba
           alta y el tronco casi horizontal, como en un peso muerto con piernas rígidas; el peso del cuerpo puede caer algo más
           atrás (hacia el talón) y lo compensa la barra */
        const sh = q => shoulder(torso(q), 'L', q)[2], ahead = sumo ? 6 : hex ? 8 : 14;
        /* la barra: sobre el medio del pie hasta pasar las rodillas y, de ahí arriba, cada vez más por delante, hasta donde
           queda arriba, delante de los muslos (un camino suave; calcularla a cada momento según las piernas hacía que la barra y la
           cadera se empujaran una a otra y la figura temblara) */
        const z = zPath(y);
        /* para cada ángulo del muslo, el tronco que deja los brazos estirados hasta la barra; y el muslo, el que cumple la regla
           del tronco. Al revés (el muslo para llegar a la barra), con las piernas casi rectas, bajar un poco la barra llevaba la
           cadera muy atrás de golpe */
        const leanFor = p => solveNear(l => reach(mk(ps, p, l), y, z), -25, 88, p0[2], 2, 6);
        /* (en el sumo, abajo, la cadera algo por encima de las rodillas: si no, salía en cuclillas, con los muslos horizontales) */
        const pt = max(sumo ? 16 : -20, solveNear(p => { const l = leanFor(p), q = mk(ps, p, l); return (1 - k) * bal(q, y, z, kk) + k * (z + ahead - sh(q)); }, -20, 89.5, p0[1], 2, 6));
        return [ps, pt, leanFor(pt), y, z];
      });
      /* el camino de la barra: el de arriba y, donde con él las piernas (muslos o rodillas) asomarían por delante de la barra,
         lo justo más adelante, suavizado. Dos pasadas: con cada camino, las posturas; con las posturas, lo que hace falta */
      let post = makePost(zPath);
      if (!hex) for (let pass = 0; pass < 2; pass++) {
        const N = 40, ys = [], need = [];
        /* (en el sumo, las manos van por dentro de las rodillas y los brazos cuelgan por delante de la cadera, lejos de los muslos:
           solo la barra tiene que pasar por delante de las piernas. Contar los antebrazos contra los muslos, casi horizontales
           abajo, echaba la barra un palmo por delante del medio del pie) */
        for (let i = 0; i <= N; i++) { const [ps, pt, lean, y, z] = post(i / N), { J } = pose({ ...mk(ps, pt, lean), hands: ZERO, elbow: {} }); ys.push(y); need.push(max(z, sumo ? legFront(J, y) + clear + .6 : loadFront(J, y, g, [0, 0], clear + .6))); }
        const sm = need.map((_, i) => { let m = -1e9; for (let j = max(0, i - 3); j <= min(N, i + 3); j++) m = max(m, need[j]); return m; });
        const zs = sm.map((_, i) => { let s = 0, w = 0; for (let j = max(0, i - 2); j <= min(N, i + 2); j++) { s += sm[j]; w++; } return s / w; });
        const prevPath = zPath;
        zPath = y => { const u = clamp((top - y) / (top - hBar), 0, 1) * N, i = min(N - 1, Math.floor(u)), f = u - i; return max(prevPath(y), zs[i] + (zs[i + 1] - zs[i]) * f); };
        post = makePost(zPath);
      }
      at_ = t => { const [ps, pt, lean, y, z] = post(t), q = mk(ps, pt, lean); return { ...q, barC: [0, y, z], grip: g, hands: hands(y, z), elbow: both(() => [.12, .15, -1]), barDir: hex ? both(() => [0, 0, 1]) : [1, 0, 0] }; };
      rest = 'b';
      feetOff = deficit;
      gear = (q, F, cam) => {
        const out = [];
        if (hex) out.push(...hexBar(cam, q.barC, g));
        else out.push(...bb(q, cam));
        if (deficit) out.push(...GR.under([GR.obox(cam, [0, plat / 2, 6], [[1, 0, 0], UP], [70, plat / 2, 52], GR.C.rubber)]));
        if (rack) [-1, 1].forEach(k => { out.push(...GR.sideFade([...GR.tube(cam, [k * 118, 0, zb - 30], [k * 118, 260, zb - 30], 7, GR.C.frame, 6), ...GR.tube(cam, [k * 118, 0, zb + 40], [k * 118, 260, zb + 40], 7, GR.C.frame, 6)]).map(i => ({ ...i, nf: true })), ...GR.tube(cam, [k * 112, hBar - 7.6, zb - 40], [k * 112, hBar - 7.6, zb + 50], 5, STEEL, 2)); });
        return out;
      };
      cam = sumo ? [-40, 10] : [-62, 10];
    }
    else if (gm) {
      /* ── buenos días: la barra sobre los trapecios; la cadera atrás con las rodillas algo dobladas hasta casi la horizontal (de
         pie) o, sentado, el tronco adelante desde la vertical ── */
      const back = F => at(F.thorax, [0, 90, -26]);
      if (seated) {
        const seatY = 96, mk = lean => ({ root: [0, seatY + 22, 0], ...trunk(lean), neck: -.3 * lean, feet: both(() => [44, 56, 18]), knee: both(() => [.35, .3, 1]), shrug: 3 });
        at_ = t => { const q = mk(mix(2, 58, t)), { F } = pose({ ...q, hands: ZERO, elbow: {} }), c = back(F); return { ...q, barC: c, grip: 80, hands: { L: add(c, [80, 0, 0]), R: add(c, [-80, 0, 0]) }, elbow: both(() => [.25, -1, -.45]) }; };
        /* el banco, donde está el asiento al empezar (antes seguía a la pelvis al inclinarse y se movía) */
        const s = at(pose({ ...mk(2), hands: ZERO, elbow: {} }).F.pelvis, [0, -22, -8]);
        gear = (q, F, cam) => [...bb(q, cam), ...GR.under([...GR.leg(cam, [0, s[1] - 14, s[2]]), GR.padAB(cam, [0, s[1] - 7, s[2] - 34], [0, s[1] - 7, s[2] + 30], UP, 30, 7)])];
        feetOff = false;
      }
      else {
        const mk = (ps, kf, lean) => { const lr = legKf(fw, 0, toe, kf, ps); return { root: lr.root, ...trunk(lean), neck: -.3 * lean, feet, knee: both(() => lr.knee), shrug: 3 }; };
        const bal = (q, k) => { const { F, J } = pose({ ...q, hands: ZERO, elbow: {} }); return midFoot(F, k)[2] - comOf(F, J, [[back(F), load]])[2]; };
        /* arriba, ya algo inclinado (la barra sobre el medio del pie, como en la sentadilla) */
        const post = table(t => { const lean = mix(8, 76, t), kf = mix(6, 24, t), ps = solve(p => bal(mk(p, kf, lean), mix(12, 18, t)), -14, 16); return [ps, kf, lean]; });
        at_ = t => { const [ps, kf, lean] = post(t), q = mk(ps, kf, lean), { F } = pose({ ...q, hands: ZERO, elbow: {} }), c = back(F); return { ...q, barC: c, grip: 80, hands: { L: add(c, [80, 0, 0]), R: add(c, [-80, 0, 0]) }, elbow: both(() => [.25, -1, -.45]) }; };
        gear = (q, F, cam) => bb(q, cam);
      }
      cam = [-62, 10];
    }
    else if (single) {
      /* ── rumano a una pierna: de pie sobre la izquierda (algo doblada); el tronco baja hasta casi la horizontal mientras la
         pierna derecha sube por detrás, en línea con él; una mancuerna en cada mano, colgando bajo los hombros ── */
      one = true; feetOff = true;
      const mk = (ps, kf, lean) => {
        const lr = legKf(22, 0, 6, kf, ps);
        const q = { root: lr.root, ...trunk(lean), neck: -.3 * lean, feet: { L: [22, 0, 6], R: [24, -20, 6, 4, 20] }, knee: { L: lr.knee, R: [0, -.2, 1] }, shrug: 1 };
        /* la pierna de atrás: recta, siguiendo la línea del tronco (de la cadera hacia atrás y abajo) */
        const { J } = pose({ ...q, hands: ZERO, elbow: {} }), H = J.R.hip, th = RAD(lean), dir = [0, -cos(th), -sin(th)], A = add(H, mul(dir, LEN.thigh + LEN.shin - .5));
        q.feet.R = [abs(A[0]), A[2], 4, max(0, A[1] - LEN.ankle), lean * .6];
        return q;
      };
      const hang = (F, q, s) => add(shoulder(F, s, q), sd(s, [15, -144, 2]));
      const bal = (q, k) => { const { F, J } = pose({ ...q, hands: ZERO, elbow: {} }); return at(F.footL, [0, 0, k])[2] - comOf(F, J, [[hang(F, q, 'L'), .15], [hang(F, q, 'R'), .15]])[2]; };
      const post = table(t => { const lean = mix(2, 74, t), kf = mix(4, 22, t), ps = solve(p => bal(mk(p, kf, lean), mix(9, 14, t)), -24, 20); return [ps, kf, lean]; });
      at_ = t => { const [ps, kf, lean] = post(t), q = mk(ps, kf, lean), { F } = pose({ ...q, hands: ZERO, elbow: {} }); return { ...q, hands: both(s => hang(F, q, s)), elbow: both(() => [.1, 0, -1]), barDir: [0, 0, 1] }; };
      gear = (q, F, cam) => pair(q, cam, [0, 0, 1], F);
      cam = [-70, 10];
    }
    else {
      /* ── rumano (barra, mancuernas, kettlebell, Smith, banda), piernas rígidas y pull-through: la cadera va atrás con las
         rodillas algo dobladas y fijas, y lo que se lleva en las manos baja pegado a las piernas, sobre el medio del pie ── */
      const deep = stiff ? 84 : cable ? 72 : 76, kf1 = stiff ? 7 : cable ? 26 : 20;
      const zb = cable ? 0 : midFoot(pose({ root: [0, 190, 0], tilt: 0, spine: 0, feet, knee: both(() => [0, 0, 1]), hands: ZERO, elbow: {} }).F, 18)[2];
      const gg = cable ? 7 : g;
      const mk = (ps, kf, lean) => { const lr = legKf(fw, 0, toe, kf, ps); return { root: lr.root, ...trunk(lean), neck: -.32 * lean, feet, knee: both(() => lr.knee), shrug: 1, reach: mix(0, 6, lean / 80) }; };
      /* en el pull-through, las manos (con la cuerda) entre las piernas: delante de la entrepierna arriba y, al bajar, cada vez
         más atrás, con los brazos estirados */
      const handsAt = (q, F) => {
        const S = shoulder(F, 'L', q);
        if (cable) {
          /* (y nunca dentro de los muslos: mientras estos, a la altura de las manos, ocupen el hueco entre las piernas, las
             manos van por delante de ellos; abajo, entre las rodillas, ya hay sitio) */
          const { J } = pose({ ...q, hands: ZERO, elbow: {} }), z0 = mix(mix(J.L.hip[2], J.L.knee[2], .5) + 30, J.L.knee[2] - 6, clamp((q.tilt - 4) / (deep - 1), 0, 1));
          let z = z0, y = armY(S, 40, z);
          for (let i = 0; i < 3; i++) { z = max(z0, legFrontX(J, y, gg, 9.5)); y = armY(S, 40, z); }
          return { L: [gg, y, z], R: [-gg, y, z] };
        }
        /* pegado a las piernas: si la vertical del medio del pie las cruza, lo que se lleva va por delante de ellas en toda su
           altura: la barra (radio 2.6), las cabezas de las mancuernas (15) o la bola de la kettlebell (20, que cuelga 27 por
           debajo de las manos y 3 por delante); antes solo se miraba la altura de las manos y la bola se metía en los muslos */
        const { J } = pose({ ...q, hands: ZERO, elbow: {} }), rng = kb ? [-47, -7] : db ? [-15, 15] : [0, 0], need = kb ? 19 : db ? 21 : 4.4;
        let z = zb, y = armY(S, gg - 47, z);
        for (let i = 0; i < 3; i++) { z = max(zb, loadFront(J, y, gg, rng, need)); y = armY(S, gg - 47, z); }
        /* en la Smith, la barra va por sus guías: en vertical, tan adelante como haga falta en todo el gesto */
        if (smith && zRail != null) { z = zRail; y = armY(S, gg - 47, z); }
        return { L: [gg, y, z], R: [-gg, y, z] };
      };
      let zRail = null;
      /* la cuerda del pull-through tira hacia atrás: el peso cae algo más adelante, sobre la parte de delante del pie */
      const bal = (q, k) => { const { F } = pose({ ...q, hands: ZERO, elbow: {} }), h = handsAt(q, F), r = pose({ ...q, hands: h, elbow: both(() => [.1, .1, -1]) }); return midFoot(r.F, k)[2] - comOf(r.F, r.J, [[mix(h.L, h.R, .5), load]])[2]; };
      const makePost = () => table(t => { const lean = mix(1, deep, t), kf = mix(stiff ? 2 : 5, kf1, t), ps = solve(p => bal(mk(p, kf, lean), mix(9, cable ? 24 : 18, t)), -24, 20); return [ps, kf, lean]; });
      let post = makePost();
      if (smith) {
        /* la guía de la Smith: donde tiene que ir la barra para no tocar las piernas en ningún momento (con la barra libre) */
        let zr = -1e9;
        for (let i = 0; i <= 20; i++) { const [ps, kf, lean] = post(i / 20), q = mk(ps, kf, lean), { F } = pose({ ...q, hands: ZERO, elbow: {} }); zr = max(zr, handsAt(q, F).L[2]); }
        zRail = zr; post = makePost();
      }
      at_ = t => {
        const [ps, kf, lean] = post(t), q = mk(ps, kf, lean), { F } = pose({ ...q, hands: ZERO, elbow: {} }), h = handsAt(q, F);
        return { ...q, barC: mix(h.L, h.R, .5), grip: gg, hands: h, elbow: both(() => cable ? [.25, .1, -1] : [.12, .15, -1]), barDir: cable ? both(() => [0, 1, 0]) : [1, 0, 0] };
      };
      gear = (q, F, cam) => {
        if (db) return pair(q, cam, [1, 0, 0], F);
        if (kb) { const h = mix(q.hands.L, q.hands.R, .5); return GR.kettlebell(cam, add(h, [0, -27, 3]), add(h, [0, 4, 0]), [1, 0, 0], null); }
        if (band) { const caps = bodyCaps(pose(q).J).map(([a, b, r]) => [a, b, r + 4]); return ['L', 'R'].flatMap(s => GR.bandPath(cam, taut(at(F['foot' + s], [0, -19, 12]), q.hands[s], caps, [0, 0, 1]), 110, F['foot' + s].x, 5)); }
        if (cable) {
          /* la polea baja, detrás; la cuerda entre las piernas hasta las manos */
          const pul = [0, 30, -150], h = mix(q.hands.L, q.hands.R, .5), { J } = pose(q);
          const it = GR.cableLine(cam, pul, h), mids = it.map((_, i) => mix(pul, h, (i + .5) / it.length));
          return [...GR.pulleyTower(cam, [0, 0, -164], 30, h).slice(0, 2), GR.disc(cam, pul, [1, 0, 0], 7, 4, 'wheel'), ...visTag(it, mids, cam, F, J), ...['L', 'R'].flatMap(s => GR.tube(cam, add(q.hands[s], [0, 10, 0]), add(q.hands[s], [0, -12, 0]), 4, ['#2a2e40', '#0a0b10'], 1).map(i => ({ ...i, hand: s })))];
        }
        return [...bb(q, cam), ...(smith ? [...GR.smithFrame(cam, q.barC[2]).map(i => ({ ...i, nf: true })), ...GR.smithHooks(cam, q.barC)] : [])];
      };
      cam = cable ? [-56, 12] : [-62, 10];
    }
    /* el peso muerto con pausa se para al subir, a media espinilla, nada más despegar la barra del suelo (con el reloj de
       siempre, la pausa caería arriba, en el bloqueo): descanso abajo, el tirón hasta la pausa, la pausa, el resto del
       tirón, un momento arriba y la bajada, más lenta. Cada tramo arranca y frena sin tirones, como los demás */
    if (dl && w('pause')) {
      const mj = x => x * x * x * (10 + x * (6 * x - 15)), seg = [[520, 1, 1], [560, 1, .8], [900, .8, .8], [700, .8, 0], [160, 0, 0], [1650, 0, 1]], T = seg.reduce((s, x) => s + x[0], 0);
      const beat = ms => { let x = ms % T; for (const [d, a, b] of seg) { if (x < d) return a + (b - a) * mj(x / d); x -= d; } return 1; };
      return { view, up, rest, cam, one, feetOff, at: at_, gear, beat };
    }
    return { view, up, rest, cam, one, feetOff, at: at_, gear };
  };
  /* la barra hexagonal: el marco alrededor de los pies, las asas a los lados (a la altura de las manos) y los discos fuera */
  const hexBar = (cam, c, g) => {
    const out = [], P = (x, z) => add(c, [x, 0, z]);
    const ring = [[-g - 8, -40], [-g - 8, 40], [-24, 64], [24, 64], [g + 8, 40], [g + 8, -40], [24, -64], [-24, -64]].map(([x, z]) => P(x, z));
    ring.forEach((p, i) => out.push(...bar(cam, p, ring[(i + 1) % ring.length], 2, 5.2)));
    [-1, 1].forEach(k => {
      out.push(...bar(cam, P(k * g, -9), P(k * g, 9), 1, 5.2).map(i => ({ ...i, hand: k > 0 ? 'L' : 'R' })));
      out.push(...bar(cam, P(k * g, -9), P(k * (g + 8), -14), 1, 5.2), ...bar(cam, P(k * g, 9), P(k * (g + 8), 14), 1, 5.2));
      out.push(...bar(cam, P(k * (g + 8), 0), P(k * 200, 0), 4, 7.6));
      out.push(L.plate(cam, P(k * 128, 0), 49, 12), L.plate(cam, P(k * 140, 0), 40, 9));
    });
    return out;
  };


  /* el pie de puntillas: apoyado entre la bola y la punta en (x, suelo, z), con la punta inclinada th grados hacia abajo */
  const onToes = (x, z, th) => { const c = cos(RAD(th)), s = sin(RAD(th)); return [x, z - (35.5 * c - 20 * s), 0, 20 * c + 35.5 * s - 20, th]; };

  /* ════ zancadas ════ */
  const lunge = f => {
    const w = x => has(f, x);
    const bulg = w('bulgarian'), rev = w('reverse'), jump = w('jump'), deficit = w('deficit'), glute = w('glute');
    const smith = w('smith'), barb = w('bar') && !smith, db = w('db'), bag = w('bag');
    /* con paso: la de delante sale y vuelve (adelante, caminando) o la de atrás (atrás); sin paso: búlgaras, Smith y déficit */
    const stepF = !bulg && !smith && !deficit && !rev && !jump, stepB = rev && !smith;
    const lean = glute ? 24 : bulg ? 8 : 4;
    /* la postura de abajo: el pie de delante (izquierdo) y, detrás, la punta del derecho (o su empeine en el banco) */
    const zF = bulg ? 56 : 68, zB = bulg ? -88 : -72, step = deficit && !rev ? 16 : 0, plat = deficit && rev ? 16 : 0;
    const bench = bulg ? 96 : 0;
    /* la carga: mancuernas a los lados, barra (o saco) a la espalda */
    const loadOn = barb || smith || bag ? 'back' : db ? 'sides' : 'none';
    const mass = barb || smith ? .5 : bag ? .3 : db ? .3 : 0;
    /* los pies en cada momento: s = 0 de pie (con los pies juntos si hay paso), s = 1 en la postura de la zancada; d, lo que
       se ha bajado. El de atrás apoya la punta (cada vez más de puntillas al bajar) o, en la búlgara, el empeine en el banco */
    const backToes = d => bulg ? [18, zB, 0, bench + 4 - LEN.ankle, 168] : onToes(18, zB, mix(30, 52, d));
    const feetAt = (s, d) => {
      if (stepF) {
        /* adelante: el derecho no se mueve (de apoyado a de puntillas, sobre la punta) y el izquierdo da el paso, despegando un
           poco del suelo */
        /* (el pie de atrás se pone de puntillas a la vez que el otro avanza y luego, al bajar, más: todo seguido, sin cambiar de
           regla a mitad; y el pie que avanza lo hace al ritmo del paso, sin otra aceleración encima) */
        const z0 = zB - 35.5, u = s;
        return { L: [16, mix(z0, zF, u), 4, step + 9 * sin(PI * u)], R: onToes(18, zB, 30 * span(u, .2, 1) + 22 * d) };
      }
      if (stepB) {
        /* atrás: el izquierdo no se mueve y el derecho va de al lado del otro hasta apoyar la punta detrás */
        const u = s, T0 = [18, zF, 0, plat, 0], T1 = backToes(d);
        if (u >= 1) return { L: [16, zF, 4, plat], R: T1 };
        const R = T0.map((v, i) => mix(v, T1[i], u)); R[3] += 9 * sin(PI * u);
        return { L: [16, zF, 4, plat], R };
      }
      return { L: [16, zF, 4, step], R: backToes(d) };
    };
    const ankleOf = (q, s) => pose({ ...q, hands: ZERO, elbow: {} }).J[s].ankle;
    /* la cadera: tan alta como dejan las dos piernas casi estiradas (arriba) y, abajo, con la rodilla de atrás a un palmo del
       suelo (en la búlgara, el muslo de delante casi horizontal); y adelante o atrás lo justo para el equilibrio: el peso,
       sobre un punto entre el apoyo de atrás y el medio del pie de delante, más cerca de este */
    const mk = (feet, h, z, tl) => ({ root: [0, h, z], ...trunk(tl), neck: -.3 * tl, feet, knee: { L: [0, .1, 1], R: [0, -.35, 1] }, shrug: loadOn == 'back' ? 3 : 0 });
    const reachH = (feet, z, tl) => {
      /* la altura más alta a la que las dos piernas llegan a sus pies, con las rodillas apenas dobladas */
      let hi = 230;
      for (const s of ['L', 'R']) { const q = mk(feet, 190, z, tl), { J } = pose({ ...q, hands: ZERO, elbow: {} }), A = J[s].ankle, H = J[s].hip, dxz = Math.hypot(A[0] - H[0], A[2] - H[2]), Lg = (LEN.thigh + LEN.shin) * .992; hi = min(hi, A[1] + sqrt(max(0, Lg * Lg - dxz * dxz)) + (190 - H[1])); }
      return hi;
    };
    const lowH = (feet, z, tl) => {
      if (bulg) return solve(h => { const { J } = pose({ ...mk(feet, h, z, tl), hands: ZERO, elbow: {} }); return J.L.hip[1] - J.L.knee[1] - 6; }, 60, 200);
      /* la rodilla de atrás a un palmo del suelo */
      return solve(h => { const { J } = pose({ ...mk(feet, h, z, tl), hands: ZERO, elbow: {} }); return J.R.knee[1] - 16 - plat; }, 60, 200);
    };
    /* el peso: durante el paso, sobre el pie que no se mueve; con los dos apoyados, entre la punta de atrás (o el banco) y el medio
       del de delante, más cerca de este cuanto más arriba */
    const support = (F, s, d) => {
      const front = at(F.footL, [0, 0, 14]), back = bulg ? at(F.footR, [0, 0, 0]) : at(F.footR, [0, -18.5, 35.5]);
      const both_ = mix(back, front, bulg ? mix(.86, .7, d) : mix(.75, .62, d));
      if (stepF && s < 1) return mix(at(F.footR, [0, -18.5, 26]), both_, s ** 1.2);
      if (stepB && s < 1) return mix(front, both_, s ** 1.2);
      return both_;
    };
    const loadPts = (F, q) => loadOn == 'back' ? [[at(F.thorax, [0, 90, -26]), mass]] : loadOn == 'sides' ? ['L', 'R'].map(s => [add(shoulder(F, s, q), sd(s, [14, -143, 3])), mass / 2]) : [];
    const solveZ = (feet, h, tl, s, d) => solve(z => { const q = mk(feet, h, z, tl), { F, J } = pose({ ...q, hands: ZERO, elbow: {} }); return support(F, s, d)[2] - comOf(F, J, loadPts(F, q))[2]; }, -120, 120);
    /* la altura de abajo, una vez: con los pies de la postura final y la cadera donde equilibra ahí. Antes se buscaba en cada
       momento con la cadera de ese momento, y arriba (con la cadera casi sobre el pie de delante) el muslo no podía quedar
       horizontal: la búsqueda fallaba, la cadera no bajaba y, al encontrarla, caía de golpe */
    let LO = null, LOZ = 0;
    const bottom = () => {
      if (LO == null) { const feet = feetAt(1, 1); let z = 0; for (let i = 0; i < 5; i++) { LO = lowH(feet, z, lean); z = solveZ(feet, LO, lean, 1, 1); } LOZ = z; }
      return LO;
    };
    /* la altura de la cadera al empezar: al dar el paso no sube por encima (antes, al ponerse de puntillas el pie de atrás, la
       cadera subía un poco y parecía un saltito) y va bajando ya algo mientras el pie llega */
    let H0 = null, ZS = null;
    const post = table(t => {
      /* con paso: primero el pie (de 0 a .55), que llega frenando, sin golpe (antes avanzaba a ritmo constante y, como el reloj
         va más rápido a mitad del gesto, apoyaba de golpe); y bajar, desde .3; sin paso, todo es bajar */
      const s = stepF || stepB ? 1 - (1 - span(t, 0, .55)) ** 2 : 1, d = stepF || stepB ? span(t, .3, 1) : ease(t);
      const feet = feetAt(s, d), tl = lean;
      let z = 0, h = 0;
      /* en la Smith, la barra va por sus guías: la cadera, siempre a la misma distancia de ellas (la de abajo, en equilibrio),
         y la barra sube y baja en vertical (antes el cuerpo se equilibraba en cada momento y la máquina se movía con él) */
      if (smith) { bottom(); z = LOZ; h = mix(reachH(feet, z, tl), LO, d); }
      else if (stepF || stepB) {
        /* con paso, el cuerpo va de donde se equilibra de pie a donde se equilibra abajo a un ritmo parejo, a la vez que da el
           paso y baja (antes buscaba el equilibrio en cada momento: el cuerpo se quedaba atrás, se lanzaba hacia delante al
           apoyar el pie, se pasaba y volvía) */
        if (ZS == null) { const f0 = feetAt(0, 0); for (let i = 0; i < 3; i++) { h = reachH(f0, z, tl); z = solveZ(f0, h, tl, 0, 0); } ZS = z; }
        bottom(); z = mix(ZS, LOZ, span(t, .04, 1)); h = mix(reachH(feet, z, tl), LO, d);
      }
      else for (let i = 0; i < 3; i++) { const hi = reachH(feet, z, tl); h = mix(hi, bottom(), d); z = solveZ(feet, h, tl, s, d); }
      if (H0 == null) H0 = h;
      else if (stepF || stepB) h = min(h, H0 - 6 * s);
      const fl = [].concat(feet.L, [0, 0, 0, 0, 0]).slice(0, 5), fr = [].concat(feet.R, [0, 0, 0, 0, 0]).slice(0, 5);
      return [h, z, tl, ...fl, ...fr];
    });
    const at_ = t => {
      const v = post(t), q = mk({ L: v.slice(3, 8), R: v.slice(8, 13) }, v[0], v[1], v[2]), { F } = pose({ ...q, hands: ZERO, elbow: {} });
      if (loadOn == 'back') { const c = at(F.thorax, [0, 90, -26]); return { ...q, barC: c, grip: bag ? 44 : 80, hands: { L: add(c, [bag ? 44 : 80, 0, 0]), R: add(c, [bag ? -44 : -80, 0, 0]) }, elbow: both(() => [.25, -1, -.45]) }; }
      if (loadOn == 'sides') return { ...q, hands: both(s => add(shoulder(F, s, q), sd(s, [14, -143, 3]))), elbow: both(() => [.1, 0, -1]), barDir: [0, 0, 1] };
      /* sin carga: las manos en la cintura */
      return { ...q, hands: both(s => at(F.pelvis, sd(s, [30, 26, 4]))), elbow: both(() => [1, -.2, -.6]), fist: false, palm: both(s => sd(s, [-1, 0, 0])) };
    };
    const gear = (q, F, cam) => {
      const out = [];
      if (loadOn == 'sides') out.push(...pair(q, cam, [0, 0, 1], F));
      if (barb || smith) out.push(...bb(q, cam));
      if (smith) out.push(...GR.smithFrame(cam, q.barC[2]).map(i => ({ ...i, nf: true })), ...GR.smithHooks(cam, q.barC));
      if (bag) out.push(...GR.sandbag(cam, add(q.barC, [0, 4, -4]), [1, 0, 0], 52, 19).map(i => ({ ...i, above: ['trunk'] })));
      if (bulg) out.push(...GR.under([GR.padAB(cam, [18, bench - 7, zB - 40], [18, bench - 7, zB + 26], UP, 26, 7), ...GR.leg(cam, [18, bench - 14, zB - 20])]));
      if (step) out.push(...GR.under([GR.obox(cam, [16, step / 2, zF + 4], [[1, 0, 0], UP], [30, step / 2, 40], GR.C.rubber)]));
      if (plat) out.push(...GR.under([GR.obox(cam, [0, plat / 2, zF + 4], [[1, 0, 0], UP], [52, plat / 2, 44], GR.C.rubber)]));
      return out;
    };
    if (jump) {
      /* con salto: de abajo (el izquierdo delante) se salta, en el aire se cambian las piernas y se cae abajo con el derecho
         delante; y otra vez. Un ciclo (t de 0 a 1) son los dos saltos: el impulso, el vuelo y la caída, que se amortigua */
      const q0 = at_(1), hB = q0.root[1], zR = q0.root[2], hA = reachH(feetAt(1, 0), zR, lean) + 14;
      const fA = { L: [16, zF, 4, 0, 0], R: backToes(1) }, swap = f => ({ L: [f.R[0] - 2, ...f.R.slice(1)], R: [f.L[0] + 2, ...f.L.slice(1)] });
      const half = (u, A, B, kA, kB) => {
        /* el impulso (de 0 a .32), el vuelo (hasta .68) y la caída (hasta 1) */
        const up = span(u, 0, .32), down = 1 - span(u, .68, 1), air = clamp(min(up, down), 0, 1), sw = span(u, .3, .7);
        const h = mix(hB, hA, air ** .8), feet = {};
        for (const s of ['L', 'R']) {
          const v = A[s].map((x, i) => mix(x, B[s][i] != null ? B[s][i] : 0, sw));
          /* en el aire, los pies se despegan del suelo lo que sube la cadera por encima de estar de pie, y algo más */
          v[3] = (v[3] || 0) + max(0, h - hA + 14) * 1.05 * (sw > 0 && sw < 1 ? 1 : air);
          feet[s] = v;
        }
        const kn = { L: mix(kA.L, kB.L, sw), R: mix(kA.R, kB.R, sw) };
        return { ...mk(feet, h, zR, lean), knee: kn };
      };
      const kL = { L: [0, .1, 1], R: [0, -.35, 1] }, kR = { L: [0, -.35, 1], R: [0, .1, 1] };
      const B = swap(fA);
      return {
        view: 'front', up: 'a', rest: 'a', cam: [-68, 8], one: true, feetOff: true,
        beat: ms => (ms % 2400) / 2400,
        at(t) { const q = t < .5 ? half(t * 2, fA, B, kL, kR) : half(t * 2 - 1, B, fA, kR, kL), { F } = pose({ ...q, hands: ZERO, elbow: {} }); return { ...q, hands: both(s => at(F.pelvis, sd(s, [30, 26, 4]))), elbow: both(() => [1, -.2, -.6]), fist: false, palm: both(s => sd(s, [-1, 0, 0])) }; },
        gear: () => [],
      };
    }
    /* con paso, la vuelta (subir y recoger el pie) no puede ser tan rápida como subir de una sentadilla: con el reloj de siempre el
       pie volvía de golpe y parecía un salto. Descanso de pie, el paso y la bajada, un momento abajo y la vuelta, sin prisa */
    if (stepF || stepB) {
      const mj = x => x * x * x * (10 + x * (6 * x - 15)), seg = [[520, 0, 0], [1900, 0, 1], [150, 1, 1], [1700, 1, 0]], T = seg.reduce((s, x) => s + x[0], 0);
      const beat = ms => { let x = ms % T; for (const [d, a, b] of seg) { if (x < d) return a + (b - a) * mj(x / d); x -= d; } return 0; };
      return { view: 'front', up: 'a', rest: 'a', cam: [-68, 8], one: true, feetOff: true, at: at_, gear, beat };
    }
    return { view: 'front', up: 'a', rest: 'a', cam: [-68, 8], one: true, feetOff: true, at: at_, gear };
  };

  /* ════ hip thrust y puente de glúteo ════ */
  const thrust = f => {
    const w = x => has(f, x);
    const bridge = w('bridge'), one = w('one'), barb = w('bar'), smith = w('smith'), machine = w('machine'), band = w('band'), db = w('db');
    /* boca arriba: la espalda alta apoyada en el borde del banco (o en el suelo, en el puente), los pies en el suelo y la cadera
       que sube hasta dejar tronco y muslos en línea. El tronco gira alrededor de ese apoyo; las piernas llegan a los pies */
    const BACK = [0, 75, -24], C = bridge ? [0, 1, -118] : [0, 96, -120];
    const tiltAt = a => -87 + a;
    /* a: el ángulo del tronco (abajo, la cadera baja; arriba, en línea con los muslos) */
    const a0 = bridge ? 0 : 36, a1 = bridge ? -26 : 0;
    const rootFor = a => { const q = { root: [0, 0, 0], tilt: tiltAt(a), spine: -3, neck: 0, feet: both(() => [20, 200, 0]), knee: both(() => [0, 1, 0]), hands: ZERO, elbow: {} }; const { F } = pose(q); return sub(C, at(F.thorax, BACK)); };
    /* los pies: donde, arriba, las espinillas quedan verticales */
    /* (en el puente, algo más lejos: con la cadera tan baja como el suelo, los talones quedaban casi pegados al glúteo y las
       rodillas, dobladas del todo) */
    const top = rootFor(a1), zFoot = top[2] + sqrt(max(0, LEN.thigh ** 2 - (top[1] - LEN.ankle - LEN.shin) ** 2)) + (bridge ? 14 : 0);
    const legUp = one ? 'R' : null;
    /* la carga apoyada en la cadera, sin flotar ni hundirse: lo que tiene radio r (la almohadilla de la barra, la de la
       máquina, las cabezas de la mancuerna, la banda) toca la cara de delante de la pelvis o, abajo, la de los muslos, con el
       grosor del dibujo. Se busca desde la ingle hacia delante del cuerpo (en la Smith, en vertical bajo su guía) hasta el
       primer sitio libre. Antes iba a una distancia fija, que arriba (con el cuerpo plano) la dejaba flotando */
    const PELV_F = [[-20, 9.8], [-10, 16.8], [0, 19.2], [10, 19.1], [20, 19.3], [45, 19.3]];
    const clearAt = (F, J, C, r) => {
      const v = sub(C, F.pelvis.o), ly = dot(v, F.pelvis.y), lz = dot(v, F.pelvis.z);
      if (ly > -24 && ly < 60 && lz < prof1(PELV_F, ly) + r) return false;
      for (const s of ['L', 'R']) {
        const a = J[s].hip, b = J[s].knee, ab = [b[1] - a[1], b[2] - a[2]], L2 = ab[0] ** 2 + ab[1] ** 2;
        const u = clamp(((C[1] - a[1]) * ab[0] + (C[2] - a[2]) * ab[1]) / L2, 0, 1), d = Math.hypot(C[1] - a[1] - ab[0] * u, C[2] - a[2] - ab[1] * u);
        if (d < prof1(THIGH_F, u * LEN.thigh) + r) return false;
      }
      return true;
    };
    const restOn = (F, J, r, zr) => {
      /* se deja caer en vertical, algo por delante de las caderas (en la Smith, bajo su guía): abajo queda en el pliegue entre
         la tripa y los muslos; arriba, sobre la pelvis */
      const z = zr == null ? F.pelvis.o[2] + 6 : zr, P = k => [0, F.pelvis.o[1] + k, z];
      let lo = -60, hi = 120;
      for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (clearAt(F, J, P(m), r)) hi = m; else lo = m; }
      return P(hi);
    };
    const loadR = barb || smith ? 8 : machine ? 9 : db ? 19 : 2;
    let zRail = null, bandZ = null;
    const at_ = t => {
      const a = mix(a0, a1, t), root = rootFor(a);
      const q = { root, tilt: tiltAt(a), spine: -3, neck: mix(bridge ? 10 : 18, 38, t), feet: both(() => [24, zFoot, 6]), knee: both(() => [0, .5, 1]), shrug: 0 };
      if (legUp) {
        /* a una pierna: la otra, estirada y en línea con el muslo de la que trabaja */
        const { J } = pose({ ...q, hands: ZERO, elbow: {} }), H = J.R.hip, K = J.L.knee, dir = norm(sub(K, J.L.hip)), A = add(H, mul(dir, LEN.thigh + LEN.shin - 1));
        q.feet = { L: [24, zFoot, 6], R: [abs(A[0]), A[2], 4, A[1] - LEN.ankle, -40] };
        q.knee = { L: [0, .5, 1], R: [0, 1, .2] };
      }
      const { F, J } = pose({ ...q, hands: ZERO, elbow: {} });
      /* la carga, apoyada sobre la cadera; en la Smith, la barra va por sus guías, así que se queda en la misma vertical (la del
         medio de su recorrido) y solo sube y baja. Las manos, en ella o en el suelo (o el banco) a los lados */
      if (smith && zRail == null) { zRail = 0; const zs = [0, 1].map(tt => { const a2 = mix(a0, a1, tt), r2 = rootFor(a2), p2 = pose({ ...q, root: r2, tilt: tiltAt(a2), hands: ZERO, elbow: {} }); return restOn(p2.F, p2.J, loadR)[2]; }); zRail = (zs[0] + zs[1]) / 2; }
      const hipTop = restOn(F, J, loadR, smith ? zRail : null);
      if (barb || smith || machine) { const c = hipTop, g = machine ? 46 : 52; return { ...q, barC: c, grip: g, hands: { L: add(c, [g, 0, 0]), R: add(c, [-g, 0, 0]) }, elbow: both(() => machine ? [.02, -.6, -1] : [.6, .3, -1]), barDir: [1, 0, 0] }; }
      if (db) { const c = hipTop; return { ...q, barC: c, hands: { L: add(c, [22, 0, 0]), R: add(c, [-22, 0, 0]) }, elbow: both(() => [.6, .3, -1]), barDir: [1, 0, 0] }; }
      /* en el puente, las manos en el suelo a los lados, algo por detrás de la cadera */
      if (bridge) return { ...q, hands: both(s => [sd(s, [52, 0, 0])[0], 4, F.pelvis.o[2] - 20]), elbow: both(() => [.4, .2, -1]), fist: false, palm: both(() => [0, -1, 0]) };
      /* en el banco, los brazos abiertos sobre él */
      return { ...q, hands: both(s => add(at(F.thorax, sd(s, [70, 70, -22])), [0, 0, 0])), elbow: both(() => [1, .2, .2]), fist: false, palm: both(() => [0, -1, 0]) };
    };
    let pivMemo = null;
    /* el eje de la palanca de la máquina: el centro del arco que hace la cadera (que gira alrededor del apoyo de la espalda),
       así el apoyo de la cadera la sigue sin que la palanca cambie de largo */
    const pivot = () => {
      if (pivMemo) return pivMemo;
      const [a, b, c] = [0, .5, 1].map(t => at_(t).barC), y1 = a[1], z1 = a[2], y2 = b[1], z2 = b[2], y3 = c[1], z3 = c[2];
      const d = 2 * (y1 * (z2 - z3) + y2 * (z3 - z1) + y3 * (z1 - z2)) || 1e-6, s1 = y1 * y1 + z1 * z1, s2 = y2 * y2 + z2 * z2, s3 = y3 * y3 + z3 * z3;
      return (pivMemo = [0, (s1 * (z2 - z3) + s2 * (z3 - z1) + s3 * (z1 - z2)) / d, (s1 * (y3 - y2) + s2 * (y1 - y3) + s3 * (y2 - y1)) / d]);
    };
    const gear = (q, F, cam) => {
      const out = [];
      if (!bridge) {
        /* el banco, de través: la espalda en su borde */
        out.push(...GR.under([GR.padAB(cam, [-70, C[1] - 7, C[2] - 26], [70, C[1] - 7, C[2] - 26], UP, 26, 7), ...GR.leg(cam, [-52, C[1] - 14, C[2] - 26]), ...GR.leg(cam, [52, C[1] - 14, C[2] - 26])]));
      }
      if (barb || smith) {
        /* la barra, con su almohadilla sobre la cadera */
        out.push(...bb(q, cam), ...GR.tube(cam, add(q.barC, [-30, 0, 0]), add(q.barC, [30, 0, 0]), 16, GR.C.pad, 3));
        if (smith) out.push(...GR.smithFrame(cam, q.barC[2]).map(i => ({ ...i, nf: true })), ...GR.smithHooks(cam, q.barC));
      }
      if (machine) {
        /* la máquina: el apoyo de la cadera, en una palanca que gira en un eje fijo por delante, abajo (a la misma distancia de
           donde está el apoyo abajo y arriba, así que la palanca no cambia de largo); sus postes, los discos en la palanca y las
           asas donde van las manos */
        const c = q.barC, piv = pivot(), X = 86;
        out.push(...GR.tube(cam, add(c, [-34, 0, 0]), add(c, [34, 0, 0]), 18, GR.C.pad, 3), ...GR.tube(cam, add(c, [-X, 0, 0]), add(c, [X, 0, 0]), 5));
        [-1, 1].forEach(k => {
          const a = add(c, [k * X, 0, 0]), p = [k * X, piv[1], piv[2]];
          out.push(...GR.tube(cam, a, p, 6, GR.C.frame, 6), ...horn(cam, add(a, mul(norm(sub(a, p)), -10)), [k, 0, 0], 28), GR.disc(cam, add(p, [k * 4, 0, 0]), [1, 0, 0], 9, 6, 'wheel'));
          out.push(...GR.under(GR.tube(cam, [k * (X + 6), 4, piv[2]], [k * (X + 6), piv[1], piv[2]], 7), 2));
          /* (el bastidor del suelo, de los postes al banco: antes el banco iba suelto) */
          out.push(...GR.under(GR.beam(cam, [k * (X + 6), 4, piv[2]], [k * (X + 6), 4, C[2] - 26], 6), 2));
        });
        out.push(...GR.under(GR.beam(cam, [-(X + 6), 4, C[2] - 26], [X + 6, 4, C[2] - 26], 6), 2));
        ['L', 'R'].forEach(s => out.push(...GR.tube(cam, add(q.hands[s], [0, 0, -8]), add(q.hands[s], [0, 0, 8]), 4, STEEL, 1).map(i => ({ ...i, hand: s }))));
      }
      if (db) out.push(...GR.dumbbell(cam, q.barC, [1, 0, 0], null, { R: 15 }));
      if (band && !bridge) {
        /* la banda: tensa de un anclaje del suelo al otro por encima de la cadera, apoyada en ella (en la pelvis y en el nacimiento
           de los muslos, con su grosor del dibujo). Los anclajes, fijos (antes seguían a la cadera) */
        const { J } = pose(q), n = F.pelvis.z, top = restOn(F, J, 2), O = sub(top, mul(n, prof1(PELV_F, 0) + 2));
        if (bandZ == null) bandZ = pose(at_(.5)).F.pelvis.o[2] + 6;
        const aL = [70, 4, bandZ], aR = [-70, 4, bandZ];
        const arc = [0, 30, 60, 90, 120, 150, 180].map(a => add(O, add(mul(F.pelvis.x, 40 * cos(RAD(a))), mul(n, (prof1(PELV_F, 0) + 2) * sin(RAD(a))))));
        const caps = [[at(F.pelvis, [-28, 2, 0]), at(F.pelvis, [28, 2, 0]), prof1(PELV_F, 2) + 2.2], ...['L', 'R'].map(s => [J[s].hip, J[s].knee, 23.5])];
        /* (empieza en el arco sobre la cadera, no en la recta del suelo, y de ahí se tensa) */
        const seed = [aL, ...arc, aR], init = Array.from({ length: 19 }, (_, i) => { const u = i / 18 * (seed.length - 1), k = min(seed.length - 2, Math.floor(u)); return mix(seed[k], seed[k + 1], u - k); });
        for (let it = 0; it < 40; it++) {
          for (let i = 1; i < 18; i++) init[i] = mix(init[i], mix(init[i - 1], init[i + 1], .5), .5);
          for (let i = 1; i < 18; i++) for (const [p, qq, r] of caps) { const ab = sub(qq, p), k = clamp(dot(sub(init[i], p), ab) / (dot(ab, ab) || 1), 0, 1), c = add(p, mul(ab, k)), d = sub(init[i], c), l = len(d); if (l < r) init[i] = add(c, mul(l > 1e-3 ? mul(d, 1 / l) : n, r)); }
        }
        out.push(...bandTagged(cam, init, 170, F.pelvis.y, 3, F, J), GR.obox(cam, [70, 3, bandZ], [[1, 0, 0], UP], [8, 3, 8], GR.C.frame), GR.obox(cam, [-70, 3, bandZ], [[1, 0, 0], UP], [8, 3, 8], GR.C.frame));
      }
      if (bridge && band) {
        /* en el puente con banda: una minibanda alrededor de los muslos, por encima de las rodillas (las rodillas empujan hacia
           fuera contra ella) */
        /* la minibanda rodea los dos muslos por fuera, ceñida a su grosor del dibujo (a esa altura, unos 16 de medio ancho, 19 por
           delante y 14.5 por detrás), y cruza de uno a otro por delante y por detrás. Cada trozo se ordena con el cuerpo por lo que
           de verdad tapa (antes la banda se cortaba al pasar por delante del primer muslo) */
        const { J } = pose(q), d = .58 * LEN.thigh, P = s => add(J[s].hip, mul(norm(sub(J[s].knee, J[s].hip)), d)), ax = norm(sub(P('L'), P('R')));
        const th = norm(sub(mix(J.L.hip, J.R.hip, .5), mix(J.L.knee, J.R.knee, .5))), f0 = norm(add(F.thighL.z, F.thighR.z)), n = norm(sub(f0, add(mul(ax, dot(f0, ax)), mul(th, dot(f0, th)))));
        const Rw = prof1(THIGH_W, d) + 2.6, Rf = prof1(THIGH_F, d) + 2.6, Rb = 14.5 + 2.6, ring = [];
        for (let i = 0; i <= 8; i++) { const a = PI / 2 - i / 8 * PI; ring.push(add(P('L'), add(mul(ax, Rw * cos(a)), mul(n, (a > 0 ? Rf : Rb) * sin(a))))); }
        for (let i = 0; i <= 8; i++) { const a = -PI / 2 - i / 8 * PI; ring.push(add(P('R'), add(mul(ax, -Rw * cos(a + PI)), mul(n, (sin(a) > 0 ? Rf : Rb) * sin(a))))); }
        ring.push(ring[0]);
        out.push(...strapTagged(cam, ring, 3.2, GR.C.band, F, J));
      }
      return out;
    };
    return { view: 'front', up: 'b', rest: 'a', cam: [-58, 18], one, feetOff: !!legUp, at: at_, gear };
  };

  /* ════ máquinas de pierna: lo común ════ */
  /* la distancia de la cadera al tobillo con la rodilla a k grados (180: estirada) */
  const Dk = k => sqrt(LEN.thigh ** 2 + LEN.shin ** 2 - 2 * LEN.thigh * LEN.shin * cos(RAD(k)));
  /* un punto del pie (en su marco: y arriba, z hacia la punta; la planta, a -20) visto desde el tobillo, con el pie inclinado a
     grados (positivo: la punta hacia abajo) y sin girar hacia fuera */
  const footOff = (a, ly, lz) => { const c = cos(RAD(a)), s = sin(RAD(a)); return [0, ly * c - lz * s, ly * s + lz * c]; };
  /* los parámetros del pie con el tobillo en A */
  const footAt = (A, toe, a) => [abs(A[0]), A[2], toe, A[1] - LEN.ankle, a];
  /* una banda como la de GR.bandPath (dos tiras, más finas cuanto más se estira), con cada trozo ordenado con el cuerpo por lo
     que de verdad lo tapa (el rayo hacia la cámara): así no se corta al pasar por delante de una pierna */
  const bandTagged = (cam, pts, l0, dir, sep, F, J) => {
    const seg = pts.slice(1).map((p, i) => len(sub(p, pts[i]))), l = seg.reduce((s, v) => s + v, 0) || 1, w = max(1.6, min(4, 3.4 * sqrt(l0 / l)));
    let run = 0;
    const fr = pts.map((p, i) => i ? (run += seg[i - 1]) / l : 0);
    return [-1, 1].flatMap(k => strapTagged(cam, pts.map((p, i) => add(p, mul(dir, k * sep * (1 - .55 * fr[i])))), w, GR.C.band, F, J));
  };
  /* una cinta (GR.strap) con cada trozo (de unos 30, como los corta ella) ordenado por lo que lo tapa */
  const strapTagged = (cam, P, w, col, F, J) => {
    const mids = [];
    for (let i = 0; i + 1 < P.length; i++) { const n = max(1, Math.ceil(len(sub(P[i + 1], P[i])) / 30)); for (let j = 0; j < n; j++) mids.push(mix(P[i], P[i + 1], (j + .5) / n)); }
    return visTag(GR.strap(cam, P, w, col), mids, cam, F, J);
  };
  /* un asa: un tubo corto en la mano, a lo largo de dir */
  const handle = (cam, c, dir, s, hw = 9) => GR.tube(cam, add(c, mul(dir, -hw)), add(c, mul(dir, hw)), 4, STEEL, 1).map(i => ({ ...i, hand: s }));
  /* un disco en un cuerno: el cuerno (de a hacia fuera, a lo largo de ax) y el disco en él */
  const horn = (cam, a, ax, R = 34) => [...GR.tube(cam, a, add(a, mul(ax, 34)), 4, STEEL, 2), GR.disc(cam, add(a, mul(ax, 18)), ax, R, 7)];

  /* ════ prensa de piernas ════ */
  const legPress = f => {
    const w = x => has(f, x);
    const horiz = w('horizontal'), one = w('one'), low = w('low'), narrow = w('narrow'), calf = w('calf');
    /* el carro sube por sus guías a 45° (en la horizontal, adelante) y la plataforma le es perpendicular: d, hacia donde
       empujan las piernas; u, hacia arriba por la plataforma. La espalda, en un respaldo muy tumbado (en la de 45°, el tronco
       a unos 35° del suelo); la cadera, quieta en el asiento */
    const el = horiz ? 0 : 45, d = [0, sin(RAD(el)), cos(RAD(el))], u = [0, cos(RAD(el)), -sin(RAD(el))];
    const lean = horiz ? -20 : -55, root = horiz ? [0, 112, 0] : [0, 100, 0], pitch = -(90 + el);
    const xo = narrow ? 11 : one ? 16 : 27, toe = narrow ? 0 : 6;
    /* los pies: a la altura v de la plataforma respecto a la línea de la cadera (con los pies bajos, más abajo: la rodilla
       pasa más por delante y el tobillo se dobla más, así que se baja algo menos). La plataforma, centrada en el pie normal */
    const v0 = horiz ? 16 : 12, v = v0 - (low ? 26 : 0), vc = v0 + 15;
    const kTop = 166, kBot = horiz ? 92 : low ? 104 : 96;
    const lat = s => [sd(s, [xo, 0, 0])[0], 0, 0], dx = xo - 20;
    const along = k => sqrt(max(0, Dk(k) ** 2 - v * v - dx * dx));
    const base = { root, ...trunk(lean), neck: horiz ? 6 : 16, shrug: 0, hands: both(s => add(root, sd(s, [50, 4, 2]))), elbow: both(() => [.55, -.25, -.8]), barDir: [0, 0, 1] };
    const kneeH = [.25, u[1], u[2]];
    let at_;
    if (calf) {
      /* gemelo: las piernas casi estiradas y quietas; la punta del pie (entre la bola y los dedos) en el borde de abajo de la
         plataforma, y el tobillo gira alrededor de ella: del talón bajado (estirando) a la punta (empujando) */
      const D = Dk(170), vB = 30, P = [-19.5, 35];
      at_ = t => {
        const a = pitch + mix(-16, 20, t), off = footOff(a, P[0], P[1]);
        const wv = add(sub(mul(u, vB), off), [dx, 0, 0]), dw = dot(d, wv), p = -dw + sqrt(max(0, dw * dw - dot(wv, wv) + D * D));
        const A = s => add(add(root, add(mul(d, p), mul(u, vB))), add(mul(off, -1), lat(s)));
        return { ...base, feet: both(s => footAt(A(s), toe, a)), knee: both(() => kneeH), plateC: add(root, add(mul(d, p + 3), mul(u, vB + 49))) };
      };
    } else {
      at_ = t => {
        const k = mix(kTop, kBot, t), a = along(k), feet = {}, knee = {};
        for (const s of ['L', 'R']) {
          if (one && s == 'L') { feet.L = footAt([30, LEN.ankle, root[2] + 72], 8, 0); knee.L = [.2, .5, 1]; continue; }
          feet[s] = footAt(add(add(root, mul(d, a)), add(mul(u, v), lat(s))), toe, pitch);
          knee[s] = kneeH;
        }
        return { ...base, feet, knee, plateC: add(root, add(mul(d, along(mix(kTop, kBot, t)) + 23), mul(u, vc))) };
      };
    }
    /* las guías: por debajo de la plataforma (en su altura u), desde lo más bajo del carro hasta lo más alto */
    let railMemo = null;
    const rails = () => railMemo || (railMemo = (() => { const c0 = at_(0).plateC, c1 = at_(1).plateC, lo = dot(c0, d) < dot(c1, d) ? c0 : c1, hi = lo == c0 ? c1 : c0; return [add(add(lo, mul(u, -68)), mul(d, -40)), add(add(hi, mul(u, -68)), mul(d, 40))]; })());
    /* la máquina */
    const gear = (q, F, cam) => {
      const out = [], C = q.plateC;
      /* el respaldo, detrás de la espalda (hasta la cabeza), y el asiento bajo los glúteos, algo levantado por delante */
      const nB = F.thorax.z;
      out.push(...GR.under([GR.padAB(cam, at(F.thorax, [0, -36, -33]), at(F.thorax, [0, 196, -33]), nB, 27, 7)]));
      const sa = horiz ? 4 : 20, ns = [0, cos(RAD(sa)), -sin(RAD(sa))], fw = [0, sin(RAD(sa)), cos(RAD(sa))];
      const c0 = at(F.pelvis, [0, -6, -6]), nl = [dot(ns, F.pelvis.x), dot(ns, F.pelvis.y), dot(ns, F.pelvis.z)];
      const h = sqrt((28 * nl[0]) ** 2 + (22 * nl[1]) ** 2 + (24 * nl[2]) ** 2), P0 = add(sub(c0, mul(ns, h + 7)), mul(fw, -24));
      out.push(...GR.under([GR.padAB(cam, P0, add(P0, mul(fw, 64)), ns, 28, 7)], 1));
      /* el chasis: los largueros del suelo, el pie del asiento y del respaldo */
      const zb = min(P0[2], at(F.thorax, [0, 150, -40])[2]) - 30, zf = max(rails()[0][2], rails()[1][2]) + 20;
      const fr = [...[-1, 1].map(k => GR.obox(cam, [k * 62, 4, (zb + zf) / 2], [[1, 0, 0], UP], [6, 4, (zf - zb) / 2], GR.C.frame)), GR.obox(cam, [0, 4, zb + 6], [[1, 0, 0], UP], [62, 4, 6], GR.C.frame)];
      fr.push(...GR.tube(cam, add(P0, mul(ns, -7)), [0, 8, P0[2]], 7), ...GR.tube(cam, at(F.thorax, [0, 60, -40]), [0, 8, at(F.thorax, [0, 60, -40])[2]], 7));
      /* las guías del carro, bajo la plataforma: de un poco antes de lo más bajo que llega a un poco después de lo más alto,
         sobre dos patas (en la de 45°, la de arriba alta: el triángulo de la máquina) */
      const ends = rails(), r0 = ends[0], r1 = ends[1];
      [-1, 1].forEach(k => {
        const a = add(r0, [k * 46, 0, 0]), b = add(r1, [k * 46, 0, 0]);
        fr.push(...GR.tube(cam, a, b, 5), ...GR.tube(cam, a, [a[0], 4, a[2]], 5), ...GR.tube(cam, b, [b[0], 4, b[2]], 5));
      });
      out.push(...GR.under(fr, 2));
      /* la plataforma (detrás de los pies) y el carro: sus largueros hasta las guías y los cuernos con los discos, por fuera */
      out.push(...GR.under([GR.obox(cam, C, [[1, 0, 0], u], [62, 52, 3], GR.C.frame)], 3));
      const back = add(C, mul(d, 16));
      [-1, 1].forEach(k => {
        const c = add(back, [k * 46, 0, 0]);
        out.push(...GR.tube(cam, add(c, mul(u, 40)), add(c, mul(u, -64)), 4), ...horn(cam, add(add(back, mul(u, -30)), [k * 62, 0, 0]), [k, 0, 0]));
      });
      ['L', 'R'].forEach(s => out.push(...handle(cam, q.hands[s], [0, 0, 1], s), ...GR.tube(cam, add(q.hands[s], [0, 0, -9]), add(q.hands[s], [0, -34, -9]), 3)));
      return out;
    };
    return { view: 'seat', up: calf ? 'b' : 'a', rest: 'a', cam: horiz ? [-122, 18] : [-126, 20], one, feetOff: true, at: at_, gear };
  };

  /* ════ hack, hack inversa, péndulo y sentadilla en máquina ════ */
  const hack = f => {
    const w = x => has(f, x);
    const rev = w('reverse'), pend = w('pendulum'), upr = w('upright');
    /* los pies, en una plataforma inclinada pf grados (positivo: la punta más alta); la espalda (en la inversa, el pecho)
       apoyada en el respaldo del carro, que va por sus guías: el tronco, paralelo a ellas, y la cadera por una recta paralela
       (en la de máquina, vertical). En el péndulo, el respaldo va en una palanca que gira alrededor de un eje detrás, así que la
       cadera baja por un arco y el tronco se inclina un poco al bajar */
    const pf = upr ? 0 : rev ? -18 : pend ? 6 : 20, beta = upr ? 10 : rev ? -14 : pend ? 16 : 40;
    const railEl = rev ? 50 : 45, r = upr ? UP : rev ? [0, sin(RAD(railEl)), cos(RAD(railEl))] : [0, sin(RAD(railEl)), -cos(RAD(railEl))];
    const lean0 = upr ? -4 : rev ? 90 - railEl : pend ? -14 : railEl - 90;
    const kTop = 172, kBot = upr ? 90 : pend ? 80 : 85, xo = rev ? 20 : 25, toe = rev ? 4 : 12, dx = xo - 20;
    const A = [0, LEN.ankle + 26, 0], Htop = add(A, [0, Dk(kTop) * cos(RAD(beta)), -Dk(kTop) * sin(RAD(beta))]);
    /* el eje del péndulo: detrás de la cadera y algo más bajo; la palanca gira th grados (negativo: la cadera baja y el tronco
       se inclina hacia delante otro tanto) */
    const P = add(Htop, [0, -60, -200]), rot = (v, th) => { const c = cos(RAD(th)), s = sin(RAD(th)); return [v[0], v[1] * c + v[2] * s, v[2] * c - v[1] * s]; };
    const hipAt = k => {
      const target = Dk(k) ** 2 - dx * dx;
      if (pend) { const th = solve(th => { const H = add(P, rot(sub(Htop, P), th)); const v = sub(H, A); return dot(v, v) - target; }, -40, 0); return [add(P, rot(sub(Htop, P), th)), th]; }
      const p = sub(Htop, A), pr = dot(p, r), s = pr - sqrt(max(0, pr * pr - dot(p, p) + target));
      return [sub(Htop, mul(r, s)), 0];
    };
    const at_ = t => {
      const [H, th] = hipAt(mix(kTop, kBot, t)), lean = lean0 - th;
      const q = { root: H, ...trunk(lean), neck: rev ? -26 : upr ? 0 : pend ? 6 : 24, shrug: 0, feet: both(s => footAt(add(A, [sd(s, [xo, 0, 0])[0], 0, 0]), toe, -pf)), knee: both(() => [.2, .1, 1]) };
      const { F } = pose({ ...q, hands: ZERO, elbow: {} });
      return { ...q, hands: both(s => T(F, s, [38, 100, 30])), elbow: both(() => [.3, -1, .1]), barDir: F.thorax.y };
    };
    const gear = (q, F, cam) => {
      const out = [], tz = F.thorax.z, ty = F.thorax.y;
      /* la plataforma, inclinada, bajo los pies */
      const np = [0, cos(RAD(pf)), -sin(RAD(pf))], tp = [0, sin(RAD(pf)), cos(RAD(pf))], fp = add(A, footOff(-pf, -20, 10));
      out.push(...GR.under([GR.obox(cam, add(fp, mul(np, -4)), [[1, 0, 0], tp], [64, 58, 4], GR.C.frame), GR.obox(cam, [0, fp[1] / 2 - 2, fp[2] + 6], [[1, 0, 0], UP], [56, fp[1] / 2 - 2, 30], GR.C.frame)]));
      /* el respaldo (o el apoyo del pecho) y las hombreras sobre los hombros */
      const side = rev ? 1 : -1, pad = (y0, y1) => GR.padAB(cam, at(F.thorax, [0, y0, side * 33]), at(F.thorax, [0, y1, side * 33]), mul(tz, side), 27, 7);
      out.push(...(rev ? [pad(-8, 104)] : GR.under([pad(-40, 128)], 1)));
      ['L', 'R'].forEach(s => out.push(GR.padAB(cam, T(F, s, [26, 114, -16]), T(F, s, [26, 114, 22]), ty, 9, 7)));
      /* las asas */
      ['L', 'R'].forEach(s => out.push(...handle(cam, q.hands[s], ty, s)));
      const back = (y, x = 0) => at(F.thorax, [x, y, side * 46]);
      if (pend) {
        /* la palanca: del eje (detrás, a los lados) al respaldo, a la altura de la cadera y de los hombros, y los cuernos arriba */
        [-1, 1].forEach(k => {
          const piv = [k * 60, P[1], P[2]], a = back(-30, k * 40), b = back(100, k * 40);
          out.push(...GR.tube(cam, piv, a, 6), ...GR.tube(cam, piv, b, 6), ...GR.tube(cam, a, b, 5), ...horn(cam, add(b, [k * 14, 0, 0]), [k, 0, 0]));
          out.push(...GR.under([...GR.tube(cam, piv, [k * 60, 4, P[2]], 8), GR.disc(cam, piv, [1, 0, 0], 9, 6, 'wheel')], 2));
        });
        out.push(...GR.under([GR.obox(cam, [0, 4, (P[2] + A[2]) / 2], [[1, 0, 0], UP], [60, 4, (A[2] - P[2]) / 2 + 30], GR.C.frame)], 2));
        return out;
      }
      /* el carro detrás del respaldo (o delante del pecho) y las guías, fijas: paralelas a r, del suelo a lo alto */
      [-1, 1].forEach(k => {
        const a = back(rev ? 20 : -30, k * 40), b = back(110, k * 40);
        out.push(...GR.tube(cam, a, b, 5), ...horn(cam, rev ? back(-24, k * 46) : back(60, k * 44), [k, 0, 0]));
      });
      out.push(...GR.tube(cam, back(rev ? 20 : -30, -40), back(rev ? 20 : -30, 40), 5), ...GR.tube(cam, back(110, -40), back(110, 40), 5));
      const g0 = add(back(-30), mul(tz, side * 8)), lo = add(g0, mul(r, -(g0[1] - 6) / r[1])), hi = add(lo, mul(r, 420));
      out.push(...GR.under([-1, 1].flatMap(k => GR.tube(cam, add(lo, [k * 52, 0, 0]), add(hi, [k * 52, 0, 0]), 6)).map(i => ({ ...i, nf: true })), 2));
      return out;
    };
    return { view: 'front', up: 'a', rest: 'a', cam: rev ? [-112, 12] : [-62, 10], feetOff: true, at: at_, gear };
  };

  /* ════ extensión de cuádriceps ════ */
  /* la pila de pesas de las máquinas de pierna: a la derecha, junto al eje de la palanca (P) y algo hacia atrás, detrás del
     cuerpo para la cámara */
  const sideStack = (cam, P) => GR.under(GR.stack(cam, [P[0] - 44, 0, P[2] - 26], [1, 0, 0], 12), 3);
  const legExt = f => {
    const w = x => has(f, x);
    const band = w('band'), cable = w('cable'), machine = !band && !cable, single = w('one') || band || cable;
    /* sentado, con los muslos en el asiento y las rodillas en su borde (en la máquina, en el eje de la palanca); la espinilla va
       de algo por detrás de la vertical a casi horizontal. Con banda o polea, en un banco: el pie libre en el suelo y la
       pierna que trabaja (la derecha) sale del suelo */
    const root = machine ? [0, 128, 0] : [0, 104, 0], lean = machine ? -12 : 2, xk = 21;
    const k0 = machine ? 84 : 90, k1 = 172;
    const shin = k => { const p = RAD(k - 90); return [0, -cos(p), sin(p)]; }, front = k => { const p = RAD(k - 90); return [0, sin(p), cos(p)]; };
    const kneeOf = s => add(root, [sd(s, [xk, 0, 0])[0], 0, LEN.thigh]);
    const legAt = (s, k) => { const K = kneeOf(s), A = add(K, mul(shin(k), LEN.shin)); return footAt(A, 4, -(k - 90) - 8); };
    const at_ = t => {
      const k = mix(k0, k1, t), q = { root, ...trunk(lean), neck: machine ? 8 : -4, shrug: 0, knee: both(() => [0, 1, 0]) };
      q.feet = { L: legAt('L', single ? k0 : k), R: legAt('R', k) };
      const { F } = pose({ ...q, hands: ZERO, elbow: {} });
      /* las manos: en las asas junto al asiento (en el banco, agarradas a su borde) */
      return { ...q, k, hands: both(s => at(F.pelvis, sd(s, [54, -8, 16]))), elbow: both(() => [.5, -.2, -1]), barDir: [0, 0, 1] };
    };
    const gear = (q, F, cam) => {
      const out = [], K = kneeOf('R'), sh = shin(q.k), fr = front(q.k);
      /* el asiento (hasta las rodillas) y, en la máquina, el respaldo */
      const s = at(F.pelvis, [0, -22, -8]), s0 = [0, s[1] - 7, s[2] - 26], s1 = [0, s[1] - 7, K[2] - 14];
      out.push(...GR.under([GR.padAB(cam, s0, s1, UP, 30, 7), ...GR.leg(cam, add(mix(s0, s1, .25), [0, -7, 0])), ...GR.leg(cam, add(mix(s0, s1, .8), [0, -7, 0]))]));
      ['L', 'R'].forEach(s => out.push(...handle(cam, q.hands[s], [0, 0, 1], s)));
      if (machine) {
        const b0 = at(F.thorax, [0, -30, -26]), b1 = at(F.thorax, [0, 110, -26]), n = F.thorax.z;
        out.push(...GR.under([GR.padAB(cam, add(b0, mul(n, -7)), add(b1, mul(n, -7)), n, 27, 7), ...GR.tube(cam, add(b0, mul(n, -14)), [0, 8, b0[2] - 14], 6)], 1));
        /* la palanca: gira en el eje de las rodillas (por fuera, a la derecha), con su leva, y lleva el rodillo delante de las
           espinillas, encima de los tobillos */
        const P = add(K, [-38, 0, 0]), roll = add(add(K, mul(sh, 68)), mul(fr, 17)), end = add(roll, [-38 - xk + xk, 0, 0]);
        out.push(...GR.tube(cam, add(roll, [-34, 0, 0]), add(roll, [34, 0, 0]), 18, GR.C.pad, 3), ...GR.tube(cam, P, [P[0], end[1], end[2]], 6), ...GR.tube(cam, [P[0], end[1], end[2]], add(roll, [-34, 0, 0]), 5));
        out.push(GR.disc(cam, add(P, [-6, 0, 0]), [1, 0, 0], 16, 6, 'wheel'));
        out.push(...GR.under([GR.obox(cam, [P[0] - 8, (P[1] - 10) / 2, P[2]], [[1, 0, 0], UP], [6, (P[1] - 10) / 2, 10], GR.C.frame)], 2), ...sideStack(cam, P));
        return out;
      }
      const A = add(K, mul(sh, LEN.shin));
      if (band) {
        /* la banda: atada a la pata del banco, detrás del tobillo, y por delante del tobillo */
        const anc = [-xk, 22, K[2] - 34];
        out.push(...GR.bandPath(cam, [anc, add(A, mul(fr, 8))], 70, [1, 0, 0], 9));
      }
      if (cable) {
        /* la tobillera y el cable hasta la polea baja, detrás del banco */
        const ring = Array.from({ length: 13 }, (_, i) => { const a = i / 12 * 2 * PI; return add(add(A, mul(sh, -6)), add(mul([1, 0, 0], 9 * cos(a)), mul(fr, 9 * sin(a)))); });
        out.push(...GR.strap(cam, ring, 3.2, GR.C.strap), ...GR.pulleyTower(cam, [-xk - 30, 0, -150], 20, add(add(A, mul(sh, -6)), mul(fr, -9))));
      }
      return out;
    };
    return { view: 'seat', up: 'b', rest: 'a', cam: [-62, 12], one: single, feetOff: true, at: at_, gear };
  };

  /* ════ curl femoral ════ */
  /* el giro de un vector en el plano y-z: hacia donde apunta (atan2 de -y y z), como la inclinación de un pie */
  const pitchOf = v => atan2(-v[1], v[2]) / RAD(1);
  /* boca arriba en el suelo: el cuello, doblado lo justo (desde n0) para que la nuca no se meta en el suelo */
  const neckUp = (q, n0) => {
    const f = n => { const { F } = pose({ ...q, neck: n, hands: ZERO, elbow: {} }), c = at(F.head, [0, 7, -1.5]); return c[1] - Math.hypot(15 * F.head.x[1], 16.5 * F.head.y[1], 17.5 * F.head.z[1]) - 1; };
    return f(n0) >= 0 ? n0 : solve(f, n0, 85);
  };
  const legCurl = f => {
    const w = x => has(f, x);
    const seated = w('seated'), nordic = w('nordic'), standing = w('standing'), ball = w('ball'), slide = w('slide'), db = w('db'), band = w('band'), one = w('one');
    const k1 = 74, k0 = 172;
    /* ── boca abajo: en la máquina (el banco, más alto en la cadera) o en un banco plano con una mancuerna entre los pies. El
       muslo, quieto sobre el banco, y la rodilla justo pasado su borde (en el eje de la palanca); la espinilla gira hacia
       arriba hasta que el talón se acerca al glúteo ── */
    if (!seated && !nordic && !standing && !ball && !slide) {
      const th = db ? 2 : 12, dT = [0, -sin(RAD(th)), -cos(RAD(th))], nT = [0, cos(RAD(th)), -sin(RAD(th))];
      const xk = db ? 18 : 21, xa = db ? 9.5 : 21, root = [0, (db ? 82 : 95) + LEN.thigh * sin(RAD(th)), 0];
      const kneeOf = s => add(add(root, mul(dT, LEN.thigh)), [sd(s, [xk, 0, 0])[0], 0, 0]);
      const shinOf = k => { const p = RAD(180 - k); return add(mul(dT, cos(p)), mul(nT, sin(p))); };
      const backOf = k => { const p = RAD(180 - k); return add(mul(nT, cos(p)), mul(dT, -sin(p))); };
      const legAt = (s, k) => { const A = add(add(kneeOf(s), mul(shinOf(k), LEN.shin)), [sd(s, [xa - xk, 0, 0])[0], 0, 0]); return footAt(A, 0, pitchOf(mul(backOf(k), -1))); };
      const at_ = t => {
        const k = mix(k0, k1, t), q = { root, tilt: 90 + (db ? 4 : 14), spine: 0, neck: -16, shrug: 0, knee: both(() => add(mul(nT, -1), [db ? .5 : .1, 0, 0])) };
        q.feet = { L: legAt('L', one ? k0 : k), R: legAt('R', k) };
        const { F } = pose({ ...q, hands: ZERO, elbow: {} });
        return { ...q, k, hands: both(s => T(F, s, [40, 112, 36])), elbow: both(() => [.7, .55, 0]), barDir: [1, 0, 0] };
      };
      const gear = (q, F, cam) => {
        const out = [], K = kneeOf('R'), sh = shinOf(q.k), bk = backOf(q.k), down = mul(nT, -1);
        /* el banco: el apoyo del pecho y el de la cadera y los muslos, hasta antes de las rodillas */
        const ch0 = at(F.thorax, [0, -6, 33]), ch1 = at(F.thorax, [0, 96, 33]), hp0 = at(F.pelvis, [0, 34, 33]), kn = add(mix(K, kneeOf('L'), .5), add(mul(down, 22), mul(dT, -12)));
        const legs = [ch1, mix(hp0, kn, .5), kn].flatMap(p => GR.leg(cam, add(p, [0, -7, 0]), 5, 30));
        out.push(...GR.under([...legs, GR.padAB(cam, ch0, ch1, F.thorax.z, 28, 7), GR.padAB(cam, hp0, kn, F.pelvis.z, 30, 7)]));
        ['L', 'R'].forEach(s => out.push(...handle(cam, q.hands[s], [1, 0, 0], s), ...GR.tube(cam, q.hands[s], [q.hands[s][0], 6, q.hands[s][2]], 3)));
        if (db) {
          /* la mancuerna (una ligera), con el asa apretada entre los pies (hacia la bola, a media altura del pie) y una cabeza a
             cada lado: una sobre las plantas y la otra contra el empeine. Antes iba más allá de las plantas, flotando */
          const c = mix(at(F.footL, [0, -12, 26]), at(F.footR, [0, -12, 26]), .5);
          out.push(...GR.dumbbell(cam, c, norm(add(F.footL.y, F.footR.y)), null, { handle: 17, R: 11, w: 12 }));
          return out;
        }
        /* la palanca: gira en el eje de las rodillas (por fuera, a la derecha) y su rodillo va sobre las espinillas, encima de
           los talones */
        const P = add(K, [-38, 0, 0]), roll = add(add(K, mul(sh, 68)), mul(bk, 17)), elb = [P[0], roll[1], roll[2]];
        out.push(...GR.tube(cam, add(roll, [-34, 0, 0]), add(roll, [34, 0, 0]), 18, GR.C.pad, 3), ...GR.tube(cam, P, elb, 6), ...GR.tube(cam, elb, add(roll, [-34, 0, 0]), 5), GR.disc(cam, add(P, [-6, 0, 0]), [1, 0, 0], 16, 6, 'wheel'));
        out.push(...GR.under([GR.obox(cam, [P[0] - 8, (P[1] - 10) / 2, P[2]], [[1, 0, 0], UP], [6, (P[1] - 10) / 2, 10], GR.C.frame)], 2), ...sideStack(cam, P));
        return out;
      };
      return { view: 'bench', up: 'b', rest: 'a', cam: [-58, 18], one, feetOff: true, at: at_, gear };
    }
    /* ── sentado: los muslos en el asiento, sujetos por un acolchado encima de las rodillas; la pierna va de estirada hacia
       delante a doblada bajo el asiento, con el rodillo detrás de los tobillos ── */
    if (seated) {
      const root = [0, 128, 0], xk = 21, kneeOf = s => add(root, [sd(s, [xk, 0, 0])[0], 0, LEN.thigh]);
      const shin = k => { const p = RAD(k - 90); return [0, -cos(p), sin(p)]; }, front = k => { const p = RAD(k - 90); return [0, sin(p), cos(p)]; };
      const at_ = t => {
        const k = mix(170, 72, t), q = { root, ...trunk(-14), neck: 8, shrug: 0, knee: both(() => [0, 1, .5]) };
        q.feet = both(s => footAt(add(kneeOf(s), mul(shin(k), LEN.shin)), 4, -(k - 90) - 8));
        const { F } = pose({ ...q, hands: ZERO, elbow: {} });
        return { ...q, k, hands: both(s => at(F.pelvis, sd(s, [54, -8, 16]))), elbow: both(() => [.5, -.2, -1]), barDir: [0, 0, 1] };
      };
      const gear = (q, F, cam) => {
        const out = [], K = kneeOf('R'), sh = shin(q.k), bk = mul(front(q.k), -1);
        const s = at(F.pelvis, [0, -22, -8]), s0 = [0, s[1] - 7, s[2] - 26], s1 = [0, s[1] - 7, K[2] - 14];
        const b0 = at(F.thorax, [0, -30, -26]), b1 = at(F.thorax, [0, 110, -26]), n = F.thorax.z;
        out.push(...GR.under([GR.padAB(cam, s0, s1, UP, 30, 7), ...GR.leg(cam, add(mix(s0, s1, .25), [0, -7, 0])), ...GR.leg(cam, add(mix(s0, s1, .8), [0, -7, 0])), GR.padAB(cam, add(b0, mul(n, -7)), add(b1, mul(n, -7)), n, 27, 7), ...GR.tube(cam, add(b0, mul(n, -14)), [0, 8, b0[2] - 14], 6)]));
        /* el acolchado sobre los muslos, por encima de las rodillas, y su brazo */
        const tp = [0, root[1] + 20 + 9, K[2] - 20];
        out.push(...GR.tube(cam, add(tp, [-36, 0, 0]), add(tp, [36, 0, 0]), 16, GR.C.pad, 3), ...GR.tube(cam, add(tp, [-36, 0, 0]), add(tp, [-52, -40, 0]), 5));
        ['L', 'R'].forEach(s => out.push(...handle(cam, q.hands[s], [0, 0, 1], s)));
        const P = add(K, [-38, 0, 0]), roll = add(add(K, mul(sh, 68)), mul(bk, 17)), elb = [P[0], roll[1], roll[2]];
        out.push(...GR.tube(cam, add(roll, [-34, 0, 0]), add(roll, [34, 0, 0]), 18, GR.C.pad, 3), ...GR.tube(cam, P, elb, 6), ...GR.tube(cam, elb, add(roll, [-34, 0, 0]), 5), GR.disc(cam, add(P, [-6, 0, 0]), [1, 0, 0], 16, 6, 'wheel'));
        out.push(...sideStack(cam, P));
        return out;
      };
      return { view: 'seat', up: 'b', rest: 'a', cam: [-62, 12], feetOff: true, at: at_, gear };
    }
    /* ── nórdico: de rodillas, con los tobillos sujetos; el cuerpo recto de las rodillas a la cabeza se deja caer hacia delante
       despacio (lo que trabaja es el frenado) hasta que las manos se preparan para parar la caída ── */
    if (nordic) {
      const xk = 18, K = s => [sd(s, [xk, 0, 0])[0], 14, 0], A = s => add(K(s), [sd(s, [-2, 0, 0])[0], -1.5, -LEN.shin + .4]);
      const at_ = t => {
        const th = mix(0, 62, t), root = [0, 14 + LEN.thigh * cos(RAD(th)), LEN.thigh * sin(RAD(th))];
        const q = { root, ...trunk(th), neck: -.3 * th, shrug: 0, knee: both(() => [0, -1, .4]), feet: both(s => footAt(A(s), 0, 180)) };
        const { F } = pose({ ...q, hands: ZERO, elbow: {} });
        const chest = s => T(F, s, [16, 58, 36]), dir = norm([0, -1, .5]), cat = s => { const S = shoulder(F, s, q); return add(S, add(sd(s, [-4, 0, 0]), mul(dir, min(136, (S[1] - 9) / -dir[1])))); };
        const u = span(t, .4, 1);
        return { ...q, hands: both(s => mix(chest(s), cat(s), u)), elbow: both(() => norm(mix([.25, -1, .1], [.5, .2, -.6], u))), fist: false, palm: both(s => mix([0, 0, -1], [0, 0, 1], u)) };
      };
      const gear = (q, F, cam) => {
        const { J } = pose(q), a = mix(J.L.ankle, J.R.ankle, .5);
        /* la colchoneta bajo las rodillas y las espinillas, y el rodillo sobre los tobillos, en su poste */
        const roll = add(a, [0, 17, 4]);
        return [...GR.under([GR.obox(cam, [0, 3, -40], [[1, 0, 0], UP], [40, 3, 64], GR.C.pad)]), ...GR.tube(cam, add(roll, [-36, 0, 0]), add(roll, [36, 0, 0]), 16, GR.C.pad, 3), ...GR.tube(cam, add(roll, [0, 0, -14]), [0, 3, roll[2] - 40], 6)];
      };
      return { view: 'front', up: 'a', rest: 'a', cam: [-70, 12], feetOff: true, at: at_, gear };
    }
    /* ── de pie, a una pierna (la derecha): en la máquina, con el muslo contra un acolchado y el pecho apoyado; con banda,
       agarrado a un poste que sujeta la banda abajo, por delante ── */
    if (standing) {
      const th = 12, hipY = LEN.ankle + LEN.shin + LEN.thigh - 3, lean = band ? 10 : 18;
      const dT = [0, -cos(RAD(th)), sin(RAD(th))], nB = [0, -sin(RAD(th)), -cos(RAD(th))];
      const root = [6, hipY, 0], H = add(root, [-20, 0, 0]), K = add(H, mul(dT, LEN.thigh));
      const shinOf = k => { const p = RAD(180 - k); return add(mul(dT, cos(p)), mul(nB, sin(p))); };
      const backOf = k => { const p = RAD(180 - k); return add(mul(nB, cos(p)), mul(dT, -sin(p))); };
      const post = [0, 0, 74];
      const at_ = t => {
        const k = mix(k0, 80, t), A = add(K, mul(shinOf(k), LEN.shin));
        const q = { root, ...trunk(lean), neck: -lean * .6, shrug: 0, knee: { L: [0, 0, 1], R: [0, 0, 1] }, feet: { L: [14, 2, 6], R: footAt(A, 0, pitchOf(mul(backOf(k), -1))) } };
        const { F } = pose({ ...q, hands: ZERO, elbow: {} });
        if (band) return { ...q, k, hands: both(s => [sd(s, [9, 0, 0])[0], at(F.thorax, [0, 50, 0])[1], post[2] - 6]), elbow: both(() => [.5, -.6, -.4]), barDir: [0, 1, 0] };
        return { ...q, k, hands: both(s => T(F, s, [46, 56, 44])), elbow: both(() => [.6, -.6, -.3]), barDir: F.thorax.y };
      };
      const gear = (q, F, cam) => {
        const out = [], sh = shinOf(q.k), bk = backOf(q.k), A = add(K, mul(sh, LEN.shin));
        if (band) {
          /* el poste por delante y la banda, de su pie a la parte de atrás del tobillo */
          out.push(...GR.under([GR.obox(cam, [0, 130, post[2] + 6], [[1, 0, 0], UP], [6, 130, 6], GR.C.frame), GR.obox(cam, [0, 3, post[2] + 6], [[1, 0, 0], UP], [30, 3, 30], GR.C.frame)]));
          out.push(...GR.bandPath(cam, [[H[0], 24, post[2]], add(A, mul(bk, 8))], 60, [1, 0, 0], 8));
          return out;
        }
        /* la máquina: el apoyo del pecho con sus asas, el acolchado delante del muslo y la palanca con el rodillo detrás del
           tobillo */
        out.push(...GR.under([GR.padAB(cam, at(F.thorax, [0, 16, 33]), at(F.thorax, [0, 92, 33]), F.thorax.z, 28, 7), ...GR.tube(cam, at(F.thorax, [0, 30, 40]), [0, 4, at(F.thorax, [0, 30, 40])[2] + 20], 7)]));
        ['L', 'R'].forEach(s => out.push(...handle(cam, q.hands[s], F.thorax.y, s)));
        const kp = add(add(H, mul(dT, 66)), mul(nB, -24));
        out.push(...GR.tube(cam, add(kp, [-16, 0, 0]), add(kp, [14, 0, 0]), 16, GR.C.pad, 3));
        const P = add(K, [-34, 0, 0]), roll = add(add(K, mul(sh, 68)), mul(bk, 17)), elb = [P[0], roll[1], roll[2]];
        out.push(...GR.tube(cam, add(roll, [-14, 0, 0]), add(roll, [14, 0, 0]), 18, GR.C.pad, 3), ...GR.tube(cam, P, elb, 6), ...GR.tube(cam, elb, add(roll, [-14, 0, 0]), 5), GR.disc(cam, add(P, [-6, 0, 0]), [1, 0, 0], 16, 6, 'wheel'));
        out.push(...GR.under([GR.obox(cam, [P[0] - 8, (P[1] - 10) / 2, P[2]], [[1, 0, 0], UP], [6, (P[1] - 10) / 2, 10], GR.C.frame)], 2), ...sideStack(cam, P));
        /* el acolchado del muslo, en un brazo del poste de la palanca; y el bastidor del suelo, del poste del pecho al de la
           palanca (antes el acolchado flotaba y los dos postes iban sueltos) */
        const pf = [0, 4, at(F.thorax, [0, 30, 40])[2] + 20], br = [P[0] - 8, kp[1], kp[2]];
        out.push(...GR.beam(cam, add(kp, [-16, 0, 0]), br, 4.5), ...GR.under(GR.beam(cam, br, [P[0] - 8, P[1] + 8, P[2]], 5)), ...GR.under(GR.beam(cam, pf, [P[0] - 8, 4, P[2]], 6), 2));
        return out;
      };
      return { view: 'front', up: 'b', rest: 'a', cam: [-60, 10], one: true, feetOff: true, at: at_, gear };
    }
    /* ── boca arriba, con los talones en un balón suizo o en unos deslizadores: la cadera arriba (el cuerpo recto de los hombros
       a las rodillas) y las rodillas que se doblan llevando los talones hacia el glúteo ── */
    {
      /* en el balón, los talones empiezan arriba del todo y, al rodarlo hacia uno, la planta acaba en su lado de delante: el
         tobillo baja un poco y el balón queda más por delante de él (g, el ángulo del apoyo desde lo alto) */
      const R = 55, gAt = t => mix(25, 45, t), target = t => ball ? R + (R + 8) * cos(RAD(gAt(t))) : LEN.ankle + 2, C = [0, 1, -118];
      /* el apoyo en la espalda: con la cadera más alta, más cerca de los hombros */
      const BACK = a => mix([0, 75, -24], [0, 92, -17], clamp(-a / 40, 0, 1));
      const base = a => { const q = { root: [0, 0, 0], tilt: -87 + a, spine: -3, neck: 0, feet: both(() => [20, 200, 0]), knee: both(() => [0, 1, 0]), hands: ZERO, elbow: {} }; const { F } = pose(q); return sub(C, at(F.thorax, BACK(a))); };
      const legs = (a, k) => {
        const q = { root: base(a), tilt: -87 + a, spine: -3 }, { F } = pose({ ...q, neck: 0, feet: both(() => [20, 200, 0]), knee: both(() => [0, 1, 0]), hands: ZERO, elbow: {} });
        const dT = mul(F.pelvis.y, -1), dn = mul(F.pelvis.z, -1), p = RAD(180 - k), sh = add(mul(dT, cos(p)), mul(dn, sin(p))), fr = add(mul(F.pelvis.z, cos(p)), mul(dT, sin(p)));
        return { q, F, A: s => add(add(at(F.pelvis, sd(s, [20, 0, 0])), mul(dT, LEN.thigh)), mul(sh, LEN.shin)), fr };
      };
      const at_ = t => {
        const k = mix(176, ball ? 98 : 80, t);
        const a = solve(a => legs(a, k).A('L')[1] - target(t), -75, 12);
        const { q, F, A, fr } = legs(a, k);
        const full = { ...q, g: gAt(t), shrug: 0, feet: both(s => footAt(A(s), 0, pitchOf(fr))), knee: both(() => F.pelvis.z), hands: both(s => [sd(s, [52, 0, 0])[0], 4, at(F.pelvis, [0, 30, 0])[2]]), elbow: both(() => [.4, .3, -1]), fist: false, palm: both(() => [0, -1, 0]) };
        return { ...full, neck: neckUp(full, 6) };
      };
      const gear = (q, F, cam) => {
        const { J } = pose(q), a = mix(J.L.ankle, J.R.ankle, .5);
        if (slide) return ['L', 'R'].map(s => GR.disc(cam, [J[s].ankle[0], 2, J[s].ankle[2] - 4], UP, 11, 3, 'wheel'));
        /* el balón: rueda por el suelo con los talones encima, algo por delante de su punto más alto */
        const c = [0, R, a[2] + (R + 8) * sin(RAD(q.g))], P = cam.P(c);
        return [{ z: P[2], svg: `<circle cx="${P[0].toFixed(1)}" cy="${P[1].toFixed(1)}" r="${R}" fill="#262b40" stroke="#5d6482" stroke-width="1.2"/><circle cx="${(P[0] - R * .32).toFixed(1)}" cy="${(P[1] - R * .34).toFixed(1)}" r="${(R * .4).toFixed(1)}" fill="#323850"/>` }];
      };
      return { view: 'bench', up: 'b', rest: 'a', cam: [-66, 16], feetOff: true, at: at_, gear };
    }
  };
  /* para las pruebas: lo más adelantado de las piernas a una altura */
  F3.piernas = { legFront };
  F3.FAMILIES.hinge = hinge;
  F3.FAMILIES.legCurl = legCurl;
  F3.FAMILIES.legExt = legExt;
  F3.FAMILIES.hack = hack;
  F3.FAMILIES.legPress = legPress;
  F3.FAMILIES.thrust = thrust;
  F3.FAMILIES.lunge = lunge;
})(window);
