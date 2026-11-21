/* ═══ figuras 3D: los ejercicios de brazos ═══
   Las familias del lote 4: los curls de bíceps (de pie, sentado, en banco inclinado, concentrado, araña, en predicador, en
   polea y en máquina), el curl en TRX, las extensiones de tríceps (en polea, tumbado, sobre la cabeza, la patada y en
   máquina), los fondos (en paralelas, anillas, TRX, máquina y banco) y los de antebrazo (curl de muñeca y rodillo).
   Las mismas reglas que el resto: el brazo se dobla en su plano, el codo queda donde lo sujeta el cuerpo o el apoyo, lo que
   se agarra va en el puño con su giro (supino, neutro o prono) y nada atraviesa el cuerpo.
   Define: Fig3D.FAMILIES.curl, .trxCurl, .pushdown, .skull, .overheadExt, .kickback, .tricepsMachine, .dip, .benchDip, .wristCurl */
(function (G) {
  const F3 = G.Fig3D, L = F3.lib, GR = F3.gear, M = F3.mlib;
  const { add, sub, mul, dot, len, norm, mix, ease, clamp, at, RAD, LEN, bar, cross } = L;
  const { has, pose, ZERO, UP, sd, both, shoulder, span, comOf, solve, legFront, onThigh, ezBar, ezCd, dbAxis } = M;
  const { cos, sin, PI, abs, max, min, sqrt, round } = Math;
  const LU = LEN.upper, LF = LEN.fore + LEN.grip;
  const ROOT_Y = LEN.ankle + LEN.shin + LEN.thigh - 4;
  const mj = x => x * x * x * (10 + x * (6 * x - 15));
  const STEEL = ['#b9bed0', '#0a0b10'], ROPE = ['#c9b98f', '#0a0b10'];

  /* ── el cuerpo y los brazos ── */
  /* de pie: los pies algo abiertos y las rodillas apenas dobladas */
  const STAND = { root: [0, ROOT_Y, 0], tilt: 0, spine: 0, neck: 0, feet: both(() => [24, -2, 10]), knee: both(() => [.2, 0, 1]) };
  /* sentado en el extremo de un banco plano, erguido, con los pies en el suelo algo por delante de las rodillas */
  const SEAT = { root: [0, 118, 0], tilt: 0, spine: 0, neck: 0, feet: both(() => [26, 84, 10]), knee: both(() => [.2, .6, .8]) };
  /* una dirección dada en el tronco (para el lado izquierdo), en el mundo y en el lado s */
  const dirT = (F, s, d) => { const v = sd(s, d); return add(add(mul(F.thorax.x, v[0]), mul(F.thorax.y, v[1])), mul(F.thorax.z, v[2])); };
  /* la pista del codo se da como si fuera el lado izquierdo (el motor la refleja en el derecho) */
  const hintL = (s, v) => s == 'L' ? v : [-v[0], v[1], v[2]];
  /* el brazo s: el hombro flexionado fl grados (hacia delante) y abierto ab grados, y el codo doblado e grados (0, estirado):
     el antebrazo gira hacia el frente del brazo (o hacia o.n, o girado o.tw grados hacia dentro). Con o.hx, la mano a esa
     distancia del centro (el agarre de una barra: el antebrazo se abre o se cierra lo justo). Los ángulos, respecto al tronco
     o, con o.world, a la vertical del mundo. Devuelve el hombro, el codo, la mano, el antebrazo (del codo a la mano) y la
     pista del codo que deja el codo justo ahí */
  const armAt = (F, q, s, fl, ab, e, o = {}) => {
    const S = o.S || shoulder(F, s, q), D = o.world ? (d => sd(s, d)) : (d => dirT(F, s, d));
    const a = RAD(ab), f = RAD(fl), k = RAD(e);
    const u = [sin(a), -cos(a) * cos(f), cos(a) * sin(f)];
    let n = o.n || [0, sin(f), cos(f)];
    if (o.tw) { const tw = RAD(o.tw); n = [-sin(tw), n[1] * cos(tw), n[2] * cos(tw)]; }
    n = norm(sub(n, mul(u, dot(n, u))));
    let v = add(mul(u, cos(k)), mul(n, sin(k)));
    const E = add(S, mul(D(u), LU));
    if (o.hx != null) {
      const ex = o.world ? (s == 'L' ? E[0] : -E[0]) : (s == 'L' ? 1 : -1) * dot(sub(E, F.thorax.o), F.thorax.x);
      const vx = clamp((o.hx - ex) / LF, -.7, .7), r = sqrt(1 - vx * vx) / (Math.hypot(v[1], v[2]) || 1);
      v = [vx, v[1] * r, v[2] * r];
    }
    const vw = D(v), H = add(E, mul(vw, LF)), hw = norm(add(sub(E, mix(S, H, .5)), mul(D(n), -2)));
    return { S, E, H, v: vw, u: D(u), n: D(n), hint: hintL(s, hw) };
  };
  /* el eje de lo que agarra la mano s, con el antebrazo v (del codo a la mano): rho 0, supino (la palma hacia donde se dobla
     el codo); 90, neutro (la palma hacia dentro); 180, prono */
  const gripDir = (s, v, rho) => { const nt = norm(cross(sd(s, [1, 0, 0]), v)), r = RAD(rho); return norm(add(mul([-1, 0, 0], cos(r)), mul(nt, sin(r)))); };
  /* la mano libre, en la cadera (con la palma apoyada) */
  const onHip = (F, s) => ({ hand: at(F.pelvis, sd(s, [30, 26, 4])), elbow: [1, -.2, -.6], palm: sd(s, [-1, 0, 0]) });
  /* lo que sobresale por delante el tronco a la altura y (erguido), y por debajo de la cadera, los muslos */
  const prof = (tab, v) => { if (v <= tab[0][0]) return tab[0]; for (let i = 1; i < tab.length; i++) if (v <= tab[i][0]) { const a = tab[i - 1], b = tab[i], k = (v - a[0]) / (b[0] - a[0]); return a.map((x, j) => x + (b[j] - x) * k); } return tab[tab.length - 1]; };
  const frontAt = (F, J, y) => { const v = 205 - (y - F.pelvis.o[1]); let z = -1e9; if (v >= 56 && v <= 228) { const p = prof(L.TRUNK3, v); z = F.pelvis.o[2] + p[2] + p[3]; } return max(z, legFront(J, y)); };
  /* un tramo de ida y vuelta dentro de [a, b]: sube (de 0 a 1) hasta .42, se para un momento y baja, más despacio */
  const bump = (t, a, b) => { const u = (t - a) / (b - a); return u <= 0 || u >= 1 ? 0 : u < .42 ? mj(u / .42) : u < .5 ? 1 : 1 - mj((u - .5) / .5); };
  /* un recorrido por momentos clave ([t, valor], en orden): de uno a otro, arrancando y frenando suave */
  const keys = (t, K) => { if (t <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const [t0, a] = K[i - 1], [t1, b] = K[i]; return a + (b - a) * mj((t - t0) / (t1 - t0 || 1)); } return K[K.length - 1][1]; };
  /* el reloj de los gestos que dan una vuelta entera en un ciclo (alternos, Zottman, 21): t avanza parejo */
  const cycle = T => ms => (ms % T) / T;

  /* ── el material ── */
  /* la barra recta de curl (algo más de 1 m), con discos medianos; lo que queda dentro de los puños no se pinta */
  const curlBar = (cam, c, grip) => {
    const X = x => add(c, [x, 0, 0]), out = [];
    let spans = [[-112, 112]];
    [[-grip - 8, -grip + 8], [grip - 8, grip + 8]].forEach(([a, b]) => { spans = spans.flatMap(([u, v]) => b <= u || a >= v ? [[u, v]] : [[u, a], [b, v]].filter(([m, n]) => n - m > 1)); });
    spans.forEach(([u, v]) => {
      const it = bar(cam, X(u), X(v), max(1, round((v - u) / 18)), 5);
      [[u, 0], [v, it.length - 1]].forEach(([e, i]) => { if (abs(abs(e) - grip) < 9) it[i].hand = e > 0 ? 'L' : 'R'; });
      out.push(...it);
    });
    [-1, 1].forEach(k => { out.push(...bar(cam, X(k * 112), X(k * 150), 2, 7), GR.disc(cam, X(k * 124), [1, 0, 0], 34, 8), GR.disc(cam, X(k * 115), [1, 0, 0], 6, 4, 'metal')); });
    return out;
  };
  /* un asa de polea (en D): un tubo corto en el puño, a lo largo de su eje */
  const handle = (cam, F, s, H) => { const x = F['grip' + s].x; return GR.tube(cam, add(H, mul(x, -8)), add(H, mul(x, 8)), 4, STEEL, 1).map(i => ({ ...i, hand: s })); };
  /* la cuerda: del final del cable a cada mano */
  const rope = (cam, top, hands, ss = ['L', 'R']) => ss.flatMap(s => GR.strap(cam, [top, hands[s]], 3.6, ROPE).map(i => ({ ...i, hand: s })));
  /* un banco plano: el acolchado de a a b (su eje, a la altura de arriba) y dos patas */
  const flatBench = (cam, a, b, hw = 28) => [...GR.leg(cam, add(mix(a, b, .15), [0, -14, 0])), ...GR.leg(cam, add(mix(a, b, .85), [0, -14, 0])), GR.padAB(cam, add(a, [0, -7, 0]), add(b, [0, -7, 0]), UP, hw, 7)];

  /* ════ curls de bíceps ════ */
  const curl = f => {
    const w = x => has(f, x);
    const db = w('db'), ez = w('ez'), smith = w('smith'), cable = w('cable'), machine = w('machine'), ropeA = w('rope');
    const one = w('one'), alt = w('alt'), hammer = w('hammer'), reverse = w('reverse'), zott = w('zottman'), supin = w('supinate');
    const crossB = w('cross'), x21 = w('x21'), wide = w('wide'), close = w('close'), drag = w('drag');
    const seated = w('seated'), incline = w('incline'), conc = w('concentration'), spider = w('spider');
    const preacher = w('preacher') || machine, bayes = w('bayesian'), high = w('high'), lying = w('lying'), tri = w('tri');
    /* lo que se agarra: una barra con las dos manos, mancuernas, la cuerda o asas */
    const kind = db ? 'db' : ropeA ? 'rope' : machine || high || (cable && one) ? 'handle' : 'bar';
    /* el agarre de la barra (medio ancho) y su giro */
    const gx = ez ? (close || hammer ? 24 : 50) : wide ? 64 : close ? 30 : 46;
    const barRho = reverse ? (ez ? 158 : 180) : ez ? (hammer ? 55 : 22) : 0;
    /* el giro de cada mano según lo subida que va (p, de 0 a 1) y, en el Zottman, según suba o baje */
    const rhoAt = (p, down) => {
      if (kind == 'bar') return barRho;
      if (kind == 'rope' || hammer || tri) return 90;
      if (high) return 0;
      if (zott) return down;
      if (drag || preacher) return 0;
      /* sentado o en el banco inclinado, los muslos quedan a la altura de las mancuernas: suben en neutro (las cabezas, delante y
         detrás, sin salirse hacia el muslo) y giran a supino cuando ya los han pasado */
      if (seated) return 90 * (1 - span(p, .35, .75));
      if (incline) return 90 * (1 - span(p, w('deg45') ? .66 : .55, .95));
      if (supin) return mix(90, -10, span(p, 0, .85));
      if (reverse) return mix(125, 180, span(p, 0, .5));
      if (machine) return 0;
      return 70 * (1 - span(p, 0, .55));
    };
    /* lo que sube cada brazo en cada momento: los dos a la vez (p = t), alternos (un ciclo: primero el izquierdo, luego el
       derecho), el Zottman (sube en supino, gira arriba, baja en prono y gira abajo) y el 21 (siete de la mitad de abajo,
       siete de la de arriba y siete enteras: aquí, una de cada) */
    const prog = t => {
      if (alt) return { L: bump(t, 0, .5), R: bump(t, .5, 1), down: { L: false, R: false } };
      if (zott) {
        /* el giro, a su ritmo: supina al subir, prona arriba, baja en prono y abajo vuelve a medio camino (así la mancuerna no roza
           el muslo) antes de supinar otra vez */
        const up = t < .4 ? mj(t / .4) : t < .55 ? 1 : t < .92 ? 1 - mj((t - .55) / .37) : 0, r = keys(t, [[0, 70], [.2, 0], [.4, 0], [.52, 180], [.72, 180], [.9, 112], [1, 70]]);
        return { L: up, R: up, down: both(() => r) };
      }
      if (x21) {
        /* dos de la mitad de abajo (hasta el antebrazo horizontal); sube a la mitad y se para; dos de la mitad de arriba, sin bajar
           de ahí (con una pausa en la mitad, para que se vea que el tramo empieza ahí); baja, y una entera. Antes la de arriba
           salía del suelo y volvía a él sin pararse en la mitad: parecía una entera */
        const p = keys(t, [[0, 0], [.06, .5], [.075, .5], [.14, 0], [.155, 0], [.215, .5], [.23, .5], [.295, 0], [.32, 0],
          [.37, .5], [.4, .5], [.455, 1], [.47, 1], [.525, .5], [.545, .5], [.6, 1], [.615, 1], [.67, .5], [.7, .5],
          [.76, 0], [.78, 0], [.855, 1], [.87, 1], [1, 0]]);
        return { L: p, R: p, down: { L: false, R: false } };
      }
      return { L: t, R: t, down: { L: false, R: false } };
    };

    /* ── el cuerpo y cómo va cada brazo, según dónde se hace ── */
    let body = STAND, cam = [-52, 6], feetOff = false, solo = one || conc || bayes;
    /* P: los ángulos del brazo en cada momento (fl, ab y e del brazo; con world, respecto al mundo) */
    /* (abajo, el brazo algo abierto: las mancuernas cuelgan por fuera de los muslos, sin rozarlos) */
    let P = p => ({ fl: mix(5, 15, p ** 1.5), ab: mix(10, 4, span(p, 0, .5)), e: mix(6, 132, p) });
    let opt = s => ({});
    let extra = () => [];
    if (seated) { body = SEAT; P = p => ({ fl: mix(4, 15, p ** 1.5), ab: mix(14, 5, span(p, .15, .75)), e: mix(6, 132, p) }); }
    else if (incline) {
      /* recostado en el banco inclinado (a 60°, o a 45°): los brazos cuelgan en vertical, por detrás del tronco */
      const ang = w('deg45') ? 45 : 60;
      body = { root: [0, 124, 10], tilt: -(90 - ang), spine: -2, neck: 6, reach: -3, feet: both(() => [30, 100, 12]), knee: both(() => [.2, .8, .7]) };
      const ab0 = ang < 50 ? 18 : 14;
      P = p => ({ fl: mix(0, 12, p ** 1.4), ab: mix(ab0, 5, span(p, .5, .97)), e: mix(4, 128, p), world: true });
      cam = [-62, 10];
    }
    else if (conc) {
      /* sentado en el extremo del banco, con las piernas abiertas y el tronco inclinado: el brazo derecho cuelga en vertical, con
         el codo apoyado en la cara de dentro del muslo, y sube hacia el hombro contrario; la mano izquierda, en el otro muslo */
      body = { root: [0, 118, 0], tilt: 38, spine: 6, neck: -16, feet: both(() => [52, 74, 26]), knee: both(() => [.55, .5, .7]) };
      P = p => ({ fl: mix(0, 6, p), ab: -4, e: mix(6, 128, p), world: true, tw: 22 });
      cam = [-38, 12];
    }
    else if (spider) {
      /* boca abajo en el banco inclinado (unos 35° sobre el suelo), con las axilas por encima del borde del respaldo: los brazos
         cuelgan en vertical por delante del banco */
      body = { root: [0, 112, 0], tilt: 59, spine: -3, neck: -17, feet: both(() => [22, -150, 6, 8, 34]), knee: both(() => [0, -1, -.15]) };
      P = p => ({ fl: mix(0, 12, p ** 1.4), ab: 4, e: mix(4, 126, p), world: true });
      cam = [-70, 12]; feetOff = true;
    }
    else if (preacher) {
      /* sentado en el banco Scott: el brazo apoyado en el atril (unos 45° por delante), con la axila en su borde de arriba; el
         antebrazo va de casi estirado (sin bloquear el codo) a vertical */
      body = { root: [0, 120, -4], tilt: 8, spine: 2, neck: -8, feet: both(() => [30, 62, 10]), knee: both(() => [.2, .6, .8]) };
      P = p => ({ fl: 40, ab: 0, e: mix(tri ? 6 : 24, 118, p) });
      cam = [-64, 8];
    }
    else if (bayes) {
      /* de espaldas a la polea baja, con el pie derecho detrás: el brazo derecho queda por detrás del cuerpo, estirado por el cable,
         y sube hacia delante sin que el codo se adelante apenas */
      body = { ...STAND, tilt: 6, spine: 2, neck: -6, feet: { L: [24, 34, 10], R: [26, -40, 14] }, knee: { L: [.2, .1, 1], R: [.2, 0, 1] } };
      P = p => ({ fl: mix(-28, -16, p), ab: 6, e: mix(6, 128, p) });
      cam = [-74, 8];
    }
    else if (high) {
      /* entre las dos poleas altas: los brazos en cruz, a la altura de los hombros, y los antebrazos suben hacia las orejas */
      P = p => ({ fl: 2, ab: 86, e: mix(22, 122, p), n: [0, 1, 0] });
      cam = [-22, 6];
    }
    else if (lying) {
      /* tumbado boca arriba en el suelo, con los pies hacia la polea y las piernas abiertas: los brazos, en el suelo junto al
         cuerpo, y los antebrazos suben del muslo al pecho */
      body = { root: [0, 27, 10], tilt: -90, spine: 0, neck: 6, reach: -3, feet: both(() => [32, 176, 4, -10, -78]), knee: both(() => [.1, 1, .1]) };
      P = p => ({ fl: -9, ab: 12, e: mix(50, 132, p) });
      cam = [-34, 30]; feetOff = true;
    }
    const { F: F0, J: J0 } = pose({ ...body, hands: ZERO, elbow: {} });

    /* con barra de pie, abajo, la barra apoyada por delante de los muslos: el brazo se adelanta lo justo */
    if (kind == 'bar' && !preacher && !lying && !drag && !smith) {
      let fl0 = 0;
      /* (con la barra Z, más: sus curvas se acercan a los muslos lo que las manos no) */
      for (; fl0 < 30; fl0 += .5) { const H = armAt(F0, body, 'L', fl0, 0, 8, { hx: gx }).H; if (H[2] >= frontAt(F0, J0, H[1]) + (ez ? 16 : 6.5)) break; }
      const base = P; P = p => ({ ...base(p), fl: mix(fl0, fl0 + 14, p ** 1.5), ab: 0, e: mix(8, 128, p) });
    }
    /* con la cuerda, abajo, las manos por delante de los muslos (la cuerda cuelga entre ellas) */
    if (kind == 'rope') {
      let fl0 = 0;
      for (; fl0 < 30; fl0 += .5) { const H = armAt(F0, body, 'L', fl0, 4, 6).H; if (H[2] >= frontAt(F0, J0, H[1]) + 11) break; }
      P = p => ({ fl: mix(fl0, fl0 + 12, p ** 1.5), ab: 4, e: mix(6, 130, p) });
    }

    /* el arrastre (drag curl, también en la Smith): la barra (o las mancuernas) sube pegada al cuerpo y los codos van atrás */
    let dragPath = null;
    if (drag || smith) {
      const S0 = shoulder(F0, 'L', body), hx = db ? 52 : 46, need = db ? 26 : 7, y1 = at(F0.thorax, [0, 52, 0])[1];
      const zAt = y => frontAt(F0, J0, y) + need;
      /* abajo, con el brazo estirado: lo más bajo que llega la mano a ese fondo */
      const yLow = z => S0[1] - sqrt(max(0, 146 ** 2 - (hx - S0[0]) ** 2 - (z - S0[2]) ** 2));
      let zr = zAt(170);
      for (let i = 0; i < 3; i++) { let m = -1e9; for (let y = yLow(zr); y <= y1; y += 4) m = max(m, zAt(y)); zr = m; }
      let y0 = 170;
      for (let i = 0; i < 8; i++) y0 = yLow(zAt(y0));
      dragPath = (s, p) => { const y = mix(smith ? yLow(zr) : y0, y1, p); return [sd(s, [hx, 0, 0])[0], y, smith ? zr : zAt(y)]; };
    }

    /* las manos y los codos de los dos brazos (o de uno) */
    const armsAt = (q, F, t) => {
      const pr = prog(t), out = { hands: {}, elbow: {}, barDir: {} }, A = {};
      for (const s of ['L', 'R']) {
        if (solo && s == 'L') continue;
        const p = pr[s], a = P(p);
        if (dragPath) {
          const H = dragPath(s, p), S = shoulder(F, s, q), v = norm(sub(H, S));
          A[s] = { H, v, hint: hintL(s, norm(add([sd(s, [.25, 0, 0])[0], -.1, -1], mul(v, -.2)))) };
        }
        else {
          const o = { world: a.world, n: a.n, tw: a.tw };
          if (kind == 'bar') o.hx = gx;
          if (crossB) o.tw = 34 * span(p, 0, .7);
          A[s] = armAt(F, q, s, a.fl, a.ab, a.e, o);
        }
        out.hands[s] = A[s].H; out.elbow[s] = A[s].hint;
        out.barDir[s] = kind == 'bar' ? (reverse ? [1, 0, 0] : [-1, 0, 0]) : gripDir(s, A[s].v, rhoAt(p, pr.down[s]));
        if (kind == 'bar' && barRho % 180) out.barDir[s] = gripDir(s, A[s].v, barRho);
      }
      if (kind == 'bar') {
        const c = mix(out.hands.L, out.hands.R, .5);
        out.barC = c; out.grip = gx;
        /* la barra, a lo largo del eje x: las dos manos a la misma altura y fondo (ya lo están: los brazos son simétricos) */
        out.hands.L = add(c, [gx, 0, 0]); out.hands.R = add(c, [-gx, 0, 0]);
      }
      if (solo) {
        /* la mano libre: en la cadera, en el muslo (concentrado) o sobre el atril */
        if (conc) { const th = onThigh(q, 'L', .7); out.hands.L = th.hand; out.elbow.L = [.7, .1, -.7]; out.palm = { L: th.palm }; }
        else if (preacher) { out.hands.L = add(A.R.S, [70, -14, 34]); out.elbow.L = [.8, -.3, -.4]; out.palm = { L: [0, -1, 0] }; }
        else { const h = onHip(F, 'L'); out.hands.L = h.hand; out.elbow.L = h.elbow; out.palm = { L: h.palm }; }
        out.fist = { L: false }; out.barDir.L = [1, 0, 0];
      }
      out.A = A;
      return out;
    };

    /* ── el material ── */
    const towerZ = 92;
    const gear = (q, F, cam) => {
      const out = [];
      if (kind == 'bar') out.push(...(ez ? ezBar(cam, q.barC, gx, ezCd(F)) : curlBar(cam, q.barC, gx)));
      if (kind == 'db') out.push(...(solo ? GR.dumbbell(cam, q.hands.R, dbAxis(F, q, 'R'), 'R') : ['L', 'R'].flatMap(s => GR.dumbbell(cam, q.hands[s], dbAxis(F, q, s), s))));
      if (smith) out.push(...GR.smithFrame(cam, q.barC[2]).map(i => ({ ...i, nf: true })), ...GR.smithHooks(cam, q.barC));
      /* las poleas: baja delante (barra, cuerda o asa), detrás (Bayesian), altas a los lados o a los pies (tumbado) */
      if (cable && !preacher) {
        if (high) ['L', 'R'].forEach(s => out.push(...GR.pulleyTower(cam, [sd(s, [262, 0, 0])[0], 0, 0], 330, q.hands[s]), ...handle(cam, F, s, q.hands[s])));
        else if (bayes) out.push(...GR.pulleyTower(cam, [-61, 0, -96], 16, q.hands.R), ...handle(cam, F, 'R', q.hands.R));
        else if (lying) out.push(...GR.pulleyTower(cam, [14, 0, 262], 10, q.barC));
        else if (one) out.push(...GR.pulleyTower(cam, [-63, 0, towerZ], 16, q.hands.R), ...handle(cam, F, 'R', q.hands.R));
        else if (kind == 'rope') { const top = add(mix(q.hands.L, q.hands.R, .5), mul(norm(sub([0, 16, towerZ], mix(q.hands.L, q.hands.R, .5))), 16)); out.push(...GR.pulleyTower(cam, [14, 0, towerZ], 16, top), ...rope(cam, top, q.hands)); }
        else out.push(...GR.pulleyTower(cam, [14, 0, towerZ], 16, q.barC));
      }
      out.push(...extra(q, F, cam));
      return out;
    };

    /* ── los apoyos de cada sitio ── */
    if (seated || conc) {
      /* el banco plano, bajo la pelvis y hacia atrás (en el concentrado, de lado, a lo ancho) */
      const p0 = at(F0.pelvis, [0, -22, 0]);
      const top = p0[1] - 7;
      extra = (q, F, cam) => GR.under(conc ? flatBench(cam, [-70, top, p0[2] - 10], [70, top, p0[2] - 10], 26) : flatBench(cam, [0, top, p0[2] + 26], [0, top, p0[2] - 110]));
    }
    else if (incline) {
      /* el banco inclinado: el respaldo pegado a la espalda, el asiento bajo la pelvis y el armazón por el centro (los brazos
         cuelgan por fuera del respaldo) */
      const back = F0.thorax, n = back.z, b0 = at(back, [0, -40, -25]), b1 = at(back, [0, 132, -25]);
      const seatC = at(F0.pelvis, [0, -4, -27]), s0 = [0, seatC[1] - 7, seatC[2] - 18], s1 = add(s0, [0, 0, 56]);
      extra = (q, F, cam) => GR.under([...GR.leg(cam, add(s0, [0, -7, 10])), ...GR.tube(cam, add(b1, mul(n, -18)), [0, 8, b1[2] - 20], 6), ...GR.tube(cam, [0, 8, b1[2] - 20], [0, 8, s0[2] + 10], 6), GR.padAB(cam, s0, s1, UP, 28, 7), GR.padAB(cam, add(b0, mul(n, -7)), add(b1, mul(n, -7)), n, 22, 7)]);
    }
    else if (spider) {
      const n = mul(F0.thorax.z, -1), a = at(F0.thorax, [0, -44, 27]), b = at(F0.thorax, [0, 44, 27]), seat = at(F0.pelvis, [0, -30, 10]);
      extra = (q, F, cam) => GR.under([...GR.leg(cam, [0, seat[1] - 14, seat[2]]), ...GR.leg(cam, add(b, [0, -30, -10])), GR.padAB(cam, add(a, mul(n, -7)), add(b, mul(n, -7)), mul(n, -1), 26, 7)]);
    }
    else if (preacher) {
      /* el atril: su cara de arriba pasa por la parte de atrás de los brazos (el tríceps apoyado), desde la axila hasta pasado
         el codo; el asiento bajo la pelvis y la columna */
      const A0 = armAt(F0, body, 'L', 40, 0, 14, kind == 'bar' ? { hx: gx } : {}), u = A0.u, nb = mul(A0.n, -1);
      /* el borde de arriba, donde el centro del atril queda ya por delante del pecho (el pecho se apoya en él) */
      let d0 = 16;
      for (; d0 < 50; d0 += 1) { const c = add(add(A0.S, mul(u, d0)), mul(nb, 15)); if (c[2] >= frontAt(F0, J0, c[1]) + 4) break; }
      const top = add(add(A0.S, mul(u, d0)), mul(nb, 15)), bot = add(add(A0.E, mul(u, 12)), mul(nb, 15)), cen = mix(top, bot, .5);
      const kneeZ = max(J0.L.knee[2], J0.R.knee[2]);
      const padA = [0, top[1], top[2]], padB = [0, bot[1], bot[2]], nrm = mul(nb, -1);
      const seat = at(F0.pelvis, [0, -22, 0]);
      extra = (q, F, cam) => {
        /* (el atril, ordenado con el cuerpo por su profundidad: queda delante del pecho y de los muslos, y detrás de los brazos) */
        const out = [{ ...GR.padAB(cam, add(padA, mul(nrm, -8)), add(padB, mul(nrm, -8)), nrm, 56, 8), above: ['trunk', 'thighL', 'thighR'], below: ['upperL', 'upperR', 'foreL', 'foreR', 'handL', 'handR'] }, ...GR.under([...GR.tube(cam, add([0, bot[1], bot[2]], mul(nrm, -16)), [0, 8, kneeZ + 34], 7), GR.obox(cam, [0, 3, kneeZ + 34], [[1, 0, 0], UP], [40, 3, 22], GR.C.frame), GR.padAB(cam, [0, seat[1] - 7, seat[2] - 24], [0, seat[1] - 7, seat[2] + 24], UP, 28, 7), ...GR.leg(cam, [0, seat[1] - 14, seat[2]])])];
        if (machine) {
          /* la palanca gira en el eje de los codos: los brazos de la palanca, por fuera, y en cada uno su asa */
          const ax = mix(A0.E, [-A0.E[0], A0.E[1], A0.E[2]], .5);
          (solo ? ['R'] : ['L', 'R']).forEach(s => {
            const H = q.hands[s], xo = sd(s, [74, 0, 0])[0];
            out.push(...GR.tube(cam, [xo, ax[1], ax[2]], [xo, H[1], H[2]], 9, GR.C.frame, 2), ...GR.tube(cam, [xo, H[1], H[2]], add(H, sd(s, [-8, 0, 0])), 5, STEEL, 1).map(i => ({ ...i, hand: s })));
            out.push(GR.disc(cam, [sd(s, [82, 0, 0])[0], ax[1], ax[2]], [1, 0, 0], 16, 8, 'wheel'));
          });
        }
        /* la pila de pesas de la máquina, a la derecha, detrás del cuerpo para la cámara */
        if (machine) out.push(...GR.under(GR.stack(cam, [-114, 0, kneeZ + 20], [1, 0, 0], 12), 3));
        if (cable) {
          /* la polea, en el suelo por delante del atril, y el cable hasta el centro de la barra */
          out.push(...GR.pulleyTower(cam, [14, 0, bot[2] + 70], 12, q.barC));
        }
        return out;
      };
    }
    else if (lying) {
      extra = (q, F, cam) => GR.under([GR.obox(cam, [0, 1.5, body.root[2] - 60], [[1, 0, 0], UP], [42, 1.5, 120], GR.C.pad)]);
    }

    const at_ = t => {
      const q = { ...body }, { F } = pose({ ...q, hands: ZERO, elbow: {} }), a = armsAt(q, F, t);
      const r = { ...q, hands: a.hands, elbow: a.elbow, barDir: a.barDir };
      if (a.barC) { r.barC = a.barC; r.grip = a.grip; }
      if (a.fist) r.fist = a.fist;
      if (a.palm) r.palm = a.palm;
      return r;
    };
    const ex = { view: 'stand', up: 'b', rest: 'a', cam, one: solo || alt || zott, feetOff, at: at_, gear };
    if (alt) ex.beat = cycle(5200);
    if (zott) ex.beat = cycle(4800);
    if (x21) ex.beat = cycle(13000);
    return ex;
  };

  /* ════ curl en TRX ════ */
  const trxCurl = () => {
    /* de cara al anclaje, con el cuerpo recto inclinado hacia atrás desde los talones y los brazos estirados hacia él: los codos
       no se mueven respecto al tronco y, al doblarlos, las manos van a la frente y el cuerpo sube. Las cintas, siempre tensas,
       miden lo mismo: lo que se inclina el cuerpo en cada momento sale de ahí */
    const A = [0, 500, 170], an = [0, LEN.ankle, 30], legL = LEN.shin + LEN.thigh - 3;
    const mk = th => ({ root: add(an, [0, legL * cos(RAD(th)), -legL * sin(RAD(th))]), tilt: -th, spine: 0, neck: 6, feet: both(() => [17, 30, 4]), knee: both(() => [0, 0, 1]) });
    const th0 = 40, b0 = mk(th0), F0 = pose({ ...b0, hands: ZERO, elbow: {} }).F, S0 = shoulder(F0, 'L', b0);
    /* el brazo, hacia el anclaje (algo hacia dentro), en ángulos del tronco */
    const d0 = norm(sub(A, S0)), ut = [dot(d0, F0.thorax.x), dot(d0, F0.thorax.y), dot(d0, F0.thorax.z)];
    const ab = Math.asin(clamp(ut[0], -1, 1)) / RAD(1), fl = Math.atan2(ut[2], -ut[1]) / RAD(1);
    const handAt = (th, e, s = 'L') => { const b = mk(th), F = pose({ ...b, hands: ZERO, elbow: {} }).F; return armAt(F, b, s, fl, ab, e); };
    const Ls = len(sub(A, handAt(th0, 4).H));
    const at_ = t => {
      const e = mix(4, 122, t), th = solve(x => len(sub(A, handAt(x, e).H)) - Ls, 2, th0 + 1), b = mk(th), F = pose({ ...b, hands: ZERO, elbow: {} }).F;
      const out = { ...b, hands: {}, elbow: {}, barDir: {} };
      for (const s of ['L', 'R']) { const a = armAt(F, b, s, fl, ab, e); out.hands[s] = a.H; out.elbow[s] = a.hint; out.barDir[s] = gripDir(s, a.v, 0); }
      return out;
    };
    const gear = (q, F, cam) => ['L', 'R'].flatMap(s => [...GR.strap(cam, [add(A, sd(s, [3, 0, 0])), add(q.hands[s], mul(norm(sub(A, q.hands[s])), 9))], 6, GR.C.trx), ...handle(cam, F, s, q.hands[s])]);
    return { view: 'stand', up: 'b', rest: 'a', cam: [-78, 6], at: at_, gear };
  };

  /* ════ extensión de tríceps en polea alta ════ */
  const pushdown = f => {
    const w = x => has(f, x);
    const ropeA = w('rope'), one = w('one'), band = w('band'), supine = w('supine'), vbar = w('vbar');
    /* de pie frente a la polea alta, algo inclinado hacia delante; los codos pegados al cuerpo: solo se mueven los antebrazos */
    const body = { ...STAND, tilt: 8, spine: 2, neck: -6 };
    const { F: F0, J: J0 } = pose({ ...body, hands: ZERO, elbow: {} });
    /* el agarre: barra recta (prono o, la de agarre supino, al revés), barra V (las manos juntas y medio giradas), cuerda (neutro,
       las manos se separan abajo) o un asa (neutro) */
    const gx = ropeA || one ? null : vbar ? 12 : 24, rho = ropeA || one ? 90 : vbar ? 128 : supine ? 0 : 180;
    /* abajo, con los brazos estirados, las manos (o la barra) por delante de los muslos */
    let fl0 = 0;
    for (; fl0 < 25; fl0 += .5) { const H = armAt(F0, body, 'L', fl0, 4, 2, gx != null ? { hx: gx } : {}).H; if (H[2] >= frontAt(F0, J0, H[1]) + 8) break; }
    const at_ = t => {
      const { F } = pose({ ...body, hands: ZERO, elbow: {} }), out = { ...body, hands: {}, elbow: {}, barDir: {} };
      for (const s of ['L', 'R']) {
        if (one && s == 'L') continue;
        const o = gx != null ? { hx: gx } : ropeA ? { hx: mix(34, 14, t) } : {};
        const a = armAt(F, body, s, mix(fl0, fl0 + 5, t), 4, mix(2, 112, t), o);
        out.hands[s] = a.H; out.elbow[s] = a.hint; out.barDir[s] = gripDir(s, a.v, rho);
      }
      if (one) { const h = onHip(F, 'L'); out.hands.L = h.hand; out.elbow.L = h.elbow; out.palm = { L: h.palm }; out.fist = { L: false }; out.barDir.L = [1, 0, 0]; }
      return out;
    };
    const zt = 106, yp = 420;
    const gear = (q, F, cam) => {
      const out = [], m = one ? q.hands.R : mix(q.hands.L, q.hands.R, .5), up = norm(sub([one ? -47 : 0, yp, zt], m));
      if (band) {
        /* la banda, colgada de un anclaje alto delante: un tramo hasta cada mano */
        const a = [0, yp - 30, zt - 20];
        out.push(GR.obox(cam, a, [[1, 0, 0], UP], [16, 6, 6], GR.C.frame));
        ['L', 'R'].forEach(s => out.push(...GR.bandLoop(cam, add(a, sd(s, [8, 0, 0])), q.hands[s], 160, [1, 0, 0], 2.5)));
        return out;
      }
      if (one) { out.push(...GR.pulleyTower(cam, [-61, 0, zt], yp, q.hands.R), ...handle(cam, F, 'R', q.hands.R)); return out; }
      const top = add(m, mul(up, ropeA ? 16 : vbar ? 14 : 4));
      out.push(...GR.pulleyTower(cam, [14, 0, zt], yp, top));
      if (ropeA) out.push(...rope(cam, top, q.hands));
      else if (vbar) ['L', 'R'].forEach(s => out.push(...GR.tube(cam, top, add(q.hands[s], mul(norm(sub(q.hands[s], top)), 8)), 4.5, STEEL, 1).map(i => ({ ...i, hand: s }))));
      else {
        /* la barra recta, corta, con el cable en el centro */
        const c = m, X = x => add(c, [x, 0, 0]);
        [[-34, -gx - 8], [-gx + 8, gx - 8], [gx + 8, 34]].forEach(([a, b]) => out.push(...bar(cam, X(a), X(b), 1, 5)));
        out.push(...GR.tube(cam, c, top, 3, STEEL, 1));
      }
      return out;
    };
    return { view: 'stand', up: 'a', rest: 'a', cam: [-56, 6], one, at: at_, gear };
  };

  /* ════ press francés y rompecráneos ════ */
  const benchUnder = (cam, F0, ang) => {
    /* el banco, hecho a la medida del cuerpo: el respaldo pegado a la espalda y, plano, sobre dos patas; inclinado, con su asiento */
    const back = F0.thorax, n = back.z, b0 = at(back, [0, -42, -25]), b1 = at(back, [0, 150, -25]);
    const pad = GR.padAB(cam, add(b0, mul(n, -7)), add(b1, mul(n, -7)), n, 28, 7);
    if (!ang) return GR.under([...[add(b0, [0, -14, 40]), add(b1, [0, -14, -12])].flatMap(p => GR.leg(cam, p)), pad, GR.padAB(cam, add(b0, [0, -7, 0]), add(b0, [0, -7, 62]), UP, 28, 7)]);
    const seatC = at(F0.pelvis, [0, -4, -27]), s0 = [0, seatC[1] - 7, seatC[2] - 18], s1 = add(s0, [0, 0, 56]);
    return GR.under([...GR.leg(cam, add(s0, [0, -7, 10])), ...GR.leg(cam, [0, max(8, b1[1] - 10), b1[2]]), GR.padAB(cam, s0, s1, UP, 28, 7), pad]);
  };
  const skull = f => {
    const w = x => has(f, x);
    const db = w('db'), cable = w('cable'), incline = w('incline');
    const ang = incline ? 30 : 0;
    /* tumbado en el banco: los brazos casi verticales (algo hacia la cabeza) y quietos; los antebrazos bajan hasta llevar la barra
       justo por encima de la frente */
    const body = incline ? { root: [0, 124, 10], tilt: -(90 - ang), spine: -2, neck: 4, reach: -3, feet: both(() => [46, 104, 16]), knee: both(() => [.3, .8, .7]) }
      : { root: [0, 128, 10], tilt: -90, spine: -3, neck: 8, reach: -3, feet: both(() => [56, 80, 20]), knee: both(() => [.35, 1, .4]) };
    const { F: F0 } = pose({ ...body, hands: ZERO, elbow: {} });
    const gx = db ? null : 24, rho = db ? 90 : cable ? 180 : 158;
    const at_ = t => {
      const out = { ...body, hands: {}, elbow: {}, barDir: {} };
      for (const s of ['L', 'R']) { const a = armAt(F0, body, s, mix(98, 106, t), 3, mix(2, 100, t), gx != null ? { hx: gx } : {}); out.hands[s] = a.H; out.elbow[s] = a.hint; out.barDir[s] = gripDir(s, a.v, rho); }
      if (gx != null) { out.barC = mix(out.hands.L, out.hands.R, .5); out.grip = gx; }
      return out;
    };
    const gear = (q, F, cam) => {
      const out = [...benchUnder(cam, F0, ang)];
      if (db) out.push(...['L', 'R'].flatMap(s => GR.dumbbell(cam, q.hands[s], dbAxis(F, q, s), s)));
      else if (cable) {
        /* la polea baja detrás de la cabeza y el cable hasta el centro de una barra recta corta */
        const c = q.barC, X = x => add(c, [x, 0, 0]), hd = at(F0.thorax, [0, 230, 0]);
        out.push(...GR.pulleyTower(cam, [14, 0, hd[2] - 40], 30, c));
        [[-34, -gx - 8], [-gx + 8, gx - 8], [gx + 8, 34]].forEach(([a, b]) => out.push(...bar(cam, X(a), X(b), 1, 5)));
      }
      else out.push(...ezBar(cam, q.barC, gx, ezCd(F)));
      return out;
    };
    return { view: 'bench', up: 'a', rest: 'a', cam: incline ? [-46, 24] : [-40, 30], at: at_, gear };
  };

  /* ════ extensión de tríceps sobre la cabeza ════ */
  const overheadExt = f => {
    const w = x => has(f, x);
    const cable = w('cable'), ez = w('ez'), one = w('one');
    /* los brazos por encima de la cabeza, con los codos apuntando arriba; los antebrazos bajan por detrás de la cabeza.
       Con mancuerna (una, sujeta con las dos manos por la cabeza de arriba, o a una mano), sentado; con la barra Z, de pie; con
       la cuerda, de espaldas a la polea y algo inclinado, hacia delante y arriba */
    /* (casi de perfil: de tres cuartos, la mancuerna detrás de la cabeza quedaba tapada por ella) */
    let body = SEAT, flA = 170, flB = 174, gx = 7, rho = 90, cam = [-80, 8];
    if (ez) { body = STAND; gx = 24; rho = 158; }
    if (cable) { body = { ...STAND, tilt: 26, spine: 4, neck: -4, feet: { L: [22, 40, 8], R: [24, -38, 12] }, knee: { L: [.2, .3, 1], R: [.2, 0, 1] } }; flA = 150; flB = 156; gx = null; cam = [-72, 6]; }
    if (one) gx = null;
    const at_ = t => {
      const { F } = pose({ ...body, hands: ZERO, elbow: {} }), out = { ...body, hands: {}, elbow: {}, barDir: {} };
      for (const s of ['L', 'R']) {
        if (one && s == 'L') continue;
        const o = gx != null ? { hx: gx } : cable ? { hx: mix(30, 14, t) } : one ? { tw: 18 } : {};
        const a = armAt(F, body, s, mix(flA, flB, t), one ? -2 : 8, mix(3, 122, t), o);
        out.hands[s] = a.H; out.elbow[s] = a.hint; out.barDir[s] = gripDir(s, a.v, rho);
      }
      if (one) { const th = onThigh(body, 'L', .66); out.hands.L = th.hand; out.elbow.L = [.7, .1, -.7]; out.palm = { L: th.palm }; out.fist = { L: false }; out.barDir.L = [1, 0, 0]; }
      if (ez) { out.barC = mix(out.hands.L, out.hands.R, .5); out.grip = gx; }
      return out;
    };
    const gear = (q, F, cam) => {
      const out = [];
      if (body === SEAT) { const p0 = at(F.pelvis, [0, -22, 0]); out.push(...GR.under(flatBench(cam, [0, p0[1] - 7, p0[2] + 26], [0, p0[1] - 7, p0[2] - 110]))); }
      if (ez) out.push(...ezBar(cam, q.barC, gx, ezCd(F)));
      else if (cable) {
        /* (la polea, por encima de la cabeza: el cable pasa por encima de ella hasta la cuerda) */
        const m = mix(q.hands.L, q.hands.R, .5), pz = -130, top = add(m, mul(norm(sub([0, 350, pz], m)), 16));
        out.push(...GR.pulleyTower(cam, [14, 0, pz], 350, top), ...rope(cam, top, q.hands));
      }
      else if (one) out.push(...GR.dumbbell(cam, q.hands.R, dbAxis(F, q, 'R'), 'R'));
      /* una mancuerna con las dos manos: en vertical, colgando de las manos, que la sujetan por debajo de la cabeza de arriba */
      else out.push(...GR.dumbbell(cam, add(mix(q.hands.L, q.hands.R, .5), [0, -24, 0]), [0, 1, 0]));
      return out;
    };
    return { view: 'stand', up: 'a', rest: 'a', cam, one, at: at_, gear };
  };

  /* ════ patada de tríceps ════ */
  const kickback = f => {
    const w = x => has(f, x);
    const cable = w('cable'), two = w('two'), band = w('band'), oneDb = !cable && !two && !band;
    let body, cam = [-96, 10], solo = oneDb || cable;
    if (oneDb) {
      /* como el remo con mancuerna: la rodilla y la mano izquierdas en el banco, el pie derecho en el suelo */
      const root = [0, 190, -38], mk = lean => ({ root, tilt: lean + 3, spine: -3, neck: -18, feet: { L: [18, -96, 180, 91, 55], R: [32, -40, 10] }, knee: { L: [0, -.3, 1], R: [.2, 0, 1] } });
      const want = 105 + sqrt(145 ** 2 - 21 ** 2);
      body = mk(solve(l => { const b = mk(l), { F } = pose({ ...b, hands: ZERO, elbow: {} }); return shoulder(F, 'L', b)[1] - want; }, 45, 85));
    }
    else {
      /* de pie, inclinado desde la cadera con la espalda recta (el tronco, unos 30° sobre el suelo) y las rodillas algo dobladas:
         la cadera atrás lo justo para que el peso caiga sobre el medio del pie */
      const lean = 60, mk = pt => { const lr = M.legRoot(24, cable ? 6 : 0, 8, 10, pt); return { root: lr.root, tilt: lean + 3, spine: -3, neck: -24, feet: cable ? { L: [24, 34, 8], R: [24, -22, 12] } : both(() => [24, 0, 8]), knee: both(() => lr.knee) }; };
      body = mk(solve(pt => { const q = mk(pt), { F, J } = pose({ ...q, hands: ZERO, elbow: {} }); return M.midFoot(F, 16)[2] - comOf(F, J)[2]; }, 20, 88));
    }
    const { F: F0 } = pose({ ...body, hands: ZERO, elbow: {} });
    /* el brazo, pegado al costado y paralelo al tronco (el codo algo por encima de la espalda); flexionado, el antebrazo cuelga en
       vertical, y se estira hacia atrás hasta quedar en línea con el brazo */
    const flK = -14, uW = dirT(F0, 'L', [0, -cos(RAD(flK)), sin(RAD(flK))]), eHang = Math.acos(clamp(-uW[1], -1, 1)) / RAD(1);
    const at_ = t => {
      const out = { ...body, hands: {}, elbow: {}, barDir: {} };
      for (const s of ['L', 'R']) {
        if (solo && s == 'L') continue;
        const a = armAt(F0, body, s, flK, oneDb ? 13 : 10, mix(2, eHang, t));
        out.hands[s] = a.H; out.elbow[s] = a.hint; out.barDir[s] = gripDir(s, a.v, 90);
      }
      if (oneDb) { out.hands.L = [26, 105, shoulder(F0, 'L', body)[2]]; out.elbow.L = [.4, 0, -1]; out.fist = { L: false }; out.palm = { L: [0, -1, 0] }; out.barDir.L = [1, 0, 0]; }
      if (cable) { const th = onThigh(body, 'L', .82); out.hands.L = th.hand; out.elbow.L = [.7, .1, -.6]; out.palm = { L: th.palm }; out.fist = { L: false }; out.barDir.L = [1, 0, 0]; }
      return out;
    };
    const gear = (q, F, cam) => {
      const out = [];
      if (oneDb) out.push(...GR.dumbbell(cam, q.hands.R, dbAxis(F, q, 'R'), 'R'), ...GR.under([GR.padAB(cam, [18, 94, -100], [18, 94, 112], UP, 30, 7), ...GR.leg(cam, [18, 87, -70]), ...GR.leg(cam, [18, 87, 84])]));
      else if (two) out.push(...['L', 'R'].flatMap(s => GR.dumbbell(cam, q.hands[s], dbAxis(F, q, s), s)));
      else if (cable) out.push(...GR.pulleyTower(cam, [-84, 0, 120], 70, q.hands.R), ...handle(cam, F, 'R', q.hands.R));
      else {
        /* la banda pisada: de debajo del medio de cada pie a la mano, por fuera de la pierna */
        const { J } = pose(q), caps = M.bodyCaps(J).map(([a, b, r], i) => [a, b, r + (i % 4 == 3 ? 10 : 8.5)]);
        ['L', 'R'].forEach(s => out.push(...GR.bandPath(cam, M.taut(at(F['foot' + s], [0, -19, 12]), q.hands[s], caps, [0, 0, -1], 14, 36, mul(norm([s == 'L' ? 1 : -1, 0, -.3]), 30)), 105, F['foot' + s].x, 4)));
      }
      return out;
    };
    return { view: 'stand', up: 'a', rest: 'a', cam, one: solo, at: at_, gear };
  };

  /* ════ tríceps en máquina ════ */
  const tricepsMachine = f => {
    /* la extensión: el atril de la máquina de curl, con las asas en neutro y el esfuerzo al estirar */
    if (!has(f, 'dip')) { const ex = curl(['machine', 'tri']); return { ...ex, up: 'a', rest: 'a' }; }
    /* los fondos sentado: la espalda en el respaldo; las asas, a los lados, van de la altura de las costillas (codos doblados y
       atrás) hasta los costados de la cadera (brazos estirados), por el arco de sus palancas */
    const body = { root: [0, 120, -6], tilt: -4, spine: 0, neck: 0, feet: both(() => [28, 70, 10]), knee: both(() => [.2, .6, .8]) };
    const { F: F0 } = pose({ ...body, hands: ZERO, elbow: {} });
    /* (el eje de las palancas, detrás del respaldo y a la altura de la cadera: con palancas largas, el asa baja casi en vertical) */
    const piv = s => at(F0.thorax, sd(s, [70, -20, -165])), hi = s => at(F0.thorax, sd(s, [52, 4, 16]));
    /* el asa va por un arco alrededor del eje de su palanca: arriba, junto a las costillas; abajo, donde el brazo queda estirado */
    const arc = (s, th) => { const p = piv(s), b = sub(hi(s), p), r = Math.hypot(b[1], b[2]); return [hi(s)[0], p[1] + r * sin(th), p[2] + r * cos(th)]; };
    const thHi = s => { const b = sub(hi(s), piv(s)); return Math.atan2(b[1], b[2]); };
    const thLo = solve(th => len(sub(arc('L', th), shoulder(F0, 'L', body))) - 145, thHi('L'), thHi('L') - 1.2);
    /* t: 0, abajo (brazos estirados); 1, arriba */
    const handAt = (s, t) => arc(s, mix(thLo, thHi(s), t));
    const at_ = t => {
      const out = { ...body, hands: {}, elbow: {}, barDir: {} };
      for (const s of ['L', 'R']) { const H = handAt(s, t); out.hands[s] = H; out.elbow[s] = [.25, 0, -1]; out.barDir[s] = gripDir(s, norm(sub(H, add(shoulder(F0, s, body), [0, -60, -20]))), 90); }
      return out;
    };
    const gear = (q, F, cam) => {
      const out = [];
      const seat = at(F0.pelvis, [0, -22, -6]), b0 = at(F0.thorax, [0, -30, -26]), b1 = at(F0.thorax, [0, 110, -26]), n = F0.thorax.z;
      out.push(...GR.under([GR.padAB(cam, [0, seat[1] - 7, seat[2] - 22], [0, seat[1] - 7, seat[2] + 36], UP, 30, 7), GR.padAB(cam, add(b0, mul(n, -7)), add(b1, mul(n, -7)), n, 26, 7), ...GR.leg(cam, [0, seat[1] - 14, seat[2]]), ...GR.tube(cam, add(b1, mul(n, -18)), [0, 8, b1[2] - 30], 7)]));
      ['L', 'R'].forEach(s => {
        const p = piv(s), H = q.hands[s], xo = sd(s, [70, 0, 0])[0];
        out.push(...GR.tube(cam, [xo, p[1], p[2]], [xo, H[1], H[2]], 8, GR.C.frame, 3), GR.disc(cam, [xo, p[1], p[2]], [1, 0, 0], 12, 7, 'wheel'), ...GR.under(GR.tube(cam, [xo, p[1], p[2]], [xo, 0, p[2]], 9, GR.C.frame, 2)));
        out.push(...GR.tube(cam, [xo, H[1], H[2]], add(H, [0, 0, -6]), 5, STEEL, 1), ...GR.tube(cam, add(H, [0, 0, -9]), add(H, [0, 0, 9]), 5, STEEL, 1).map(i => ({ ...i, hand: s })));
      });
      /* la pila de pesas, detrás del respaldo, entre los ejes de las palancas */
      out.push(...GR.under(GR.stack(cam, [0, 0, piv('L')[2] - 30], [0, 0, 1], 12), 3));
      return out;
    };
    return { view: 'seat', up: 'a', rest: 'a', cam: [-50, 8], at: at_, gear };
  };

  /* ════ fondos ════ */
  /* las piernas colgando: los muslos hacia abajo y las rodillas dobladas, con los pies detrás (de rodillas en la máquina) */
  const hangFeet = (root, kneel) => both(s => kneel ? [14, root[2] - 82, 0, root[1] - 92 - LEN.ankle, 0] : [12, root[2] - 60, 0, root[1] - 123 - LEN.ankle, 40]);
  const dip = f => {
    const w = x => has(f, x);
    const fwd = w('forward'), machine = w('machine'), rings = w('rings'), trx = w('trx');
    /* las manos, quietas en las paralelas (o en las asas, las anillas o el TRX); el cuerpo baja hasta que los codos quedan en ángulo
       recto, inclinado hacia delante (más en los de pecho), con el peso siempre sobre las manos */
    const Hb = 262, hx = rings || trx ? 46 : 50, H = both(s => [sd(s, [hx, 0, 0])[0], Hb, 0]);
    const lean = t => fwd ? mix(14, 34, t) : mix(5, 14, t), dist = t => mix(146, 104, t);
    const mk = (t, root) => ({ root, tilt: lean(t) + 3, spine: -3, neck: -lean(t) * .4, feet: hangFeet(root, machine), knee: both(() => [0, .2, 1]) });
    const el = fwd ? [.35, .1, -1] : [.12, .1, -1];
    const rootAt = t => {
      let root = [0, Hb + 20, -4];
      for (let i = 0; i < 8; i++) {
        const q = mk(t, root), { F, J } = pose({ ...q, hands: H, elbow: both(() => el) }), S = shoulder(F, 'L', q), c = comOf(F, J), d = dist(t);
        const z = S[2] + (H.L[2] - c[2]), want = [S[0], H.L[1] + sqrt(max(0, d * d - (S[0] - H.L[0]) ** 2 - (z - H.L[2]) ** 2)), z];
        root = add(root, sub(want, S));
      }
      return root;
    };
    const at_ = t => { const q = mk(t, rootAt(t)); return { ...q, hands: H, elbow: both(() => el), barDir: both(s => gripDir(s, [0, -1, 0], 90)) }; };
    const gear = (q, F, cam) => {
      const out = [];
      if (rings || trx) {
        /* (las cintas, cada una de su anclaje, por fuera de los brazos: desde un solo punto rozaban los antebrazos) */
        if (trx) { ['L', 'R'].forEach(s => out.push(...GR.strap(cam, [[sd(s, [hx + 46, 0, 0])[0], 600, -10], add(q.hands[s], sd(s, [9, 6, 0]))], 6, GR.C.trx), ...GR.tube(cam, add(q.hands[s], [0, 0, -9]), add(q.hands[s], [0, 0, 9]), 5, STEEL, 1).map(i => ({ ...i, hand: s })))); }
        else ['L', 'R'].forEach(s => {
          /* la anilla, en vertical, con la mano en su parte de abajo, y la cinta hasta arriba */
          /* (la anilla, algo por fuera del puño y su cinta, vertical por fuera del brazo) */
          const c = add(q.hands[s], sd(s, [11, 12, 0])), pts = Array.from({ length: 13 }, (_, i) => add(c, [0, 12 * sin(i / 12 * 2 * PI - PI / 2), 12 * cos(i / 12 * 2 * PI - PI / 2)]));
          for (let i = 0; i < 12; i++) out.push(...GR.tube(cam, pts[i], pts[i + 1], 3.6, ['#c8b48a', '#0a0b10'], 1).map(it => i < 2 || i > 9 ? { ...it, hand: s } : it));
          out.push(...GR.strap(cam, [add(c, [0, 12, 0]), [c[0] + sd(s, [34, 0, 0])[0], 560, c[2]]], 4, GR.C.strap));
        });
        return out;
      }
      ['L', 'R'].forEach(s => {
        const x = H[s][0];
        if (machine) {
          /* las asas de la máquina, cortas, sobre sus columnas */
          out.push(...GR.tube(cam, [x, Hb, -22], [x, Hb, 22], 6, STEEL, 3).map(i => abs(i.z) < 1e9 ? i : i), ...GR.under(GR.tube(cam, [x, Hb, -22], [x * 1.25, 0, -40], 8, GR.C.frame, 3)));
        }
        else {
          /* la paralela, con sus dos postes */
          const segs = GR.tube(cam, [x, Hb, -80], [x, Hb, 80], 6, STEEL, 8);
          segs.forEach((it, i) => { if (i == 3 || i == 4) it.hand = s; });
          out.push(...segs, ...GR.tube(cam, [x, Hb, -62], [x, 0, -62], 7, GR.C.frame, 3), ...GR.tube(cam, [x, Hb, 62], [x, 0, 62], 7, GR.C.frame, 3));
          out.push(GR.obox(cam, [x, 3, -62], [[1, 0, 0], UP], [12, 3, 22], GR.C.frame), GR.obox(cam, [x, 3, 62], [[1, 0, 0], UP], [12, 3, 22], GR.C.frame));
        }
      });
      if (machine) {
        /* el apoyo de las rodillas: sube y baja con ellas (es lo que ayuda) */
        const { J } = pose(q), k = mix(J.L.knee, J.R.knee, .5), a = mix(J.L.ankle, J.R.ankle, .5);
        out.push(GR.padAB(cam, [0, k[1] - 14, k[2] + 6], [0, a[1] - 12, a[2] - 4], UP, 30, 6), ...GR.tube(cam, [0, k[1] - 26, mix(k[2], a[2], .5)], [0, 0, mix(k[2], a[2], .5)], 9, GR.C.frame, 2));
        out.push(...GR.under(GR.stack(cam, [0, 0, -168], [0, 0, 1], 12), 3));
      }
      return out;
    };
    return { view: 'stand', up: 'a', rest: 'a', cam: [-70, 6], feetOff: true, at: at_, gear };
  };

  /* ════ fondos en banco ════ */
  const benchDip = f => {
    const weight = has(f, 'weight');
    /* las manos agarran el borde de un banco que queda detrás, a lo ancho; los pies en el suelo por delante, con las rodillas algo
       dobladas. Los hombros, por delante de las manos; la cadera baja por delante del banco hasta que los codos quedan en ángulo
       recto */
    const top = 92, zb = -46, H = both(s => [sd(s, [26, 0, 0])[0], top + 3, zb + 3]), feetZ = 118;
    const mk = root => ({ root, tilt: 2, spine: 0, neck: -8, feet: both(() => [22, feetZ, 6]), knee: both(() => [0, .3, 1]) });
    /* (la distancia del hombro a la muñeca: casi el brazo entero arriba y, abajo, con el codo en ángulo recto) */
    const dist = t => mix(LU + LEN.fore - 2, sqrt(LU ** 2 + LEN.fore ** 2), t), hd = both(() => norm([0, -.5, 1]));
    const rootAt = t => {
      let root = [0, 110, -20];
      for (let i = 0; i < 6; i++) {
        const q = mk(root), F = pose({ ...q, hands: H, handDir: hd, elbow: both(() => [0, .1, -1]) }).F, S = shoulder(F, 'L', q), d = dist(t);
        /* (los hombros bien por delante de las manos: así la cadera queda por delante del banco y de los puños) */
        const W = sub(H.L, mul(hd.L, LEN.grip)), z = W[2] + 34, want = [S[0], W[1] + sqrt(max(0, d * d - (S[0] - W[0]) ** 2 - (z - W[2]) ** 2)), z];
        root = add(root, sub(want, S));
      }
      return root;
    };
    const at_ = t => ({ ...mk(rootAt(t)), hands: H, handDir: hd, elbow: both(() => [0, .1, -1]), barDir: [1, 0, 0] });
    const gear = (q, F, cam) => {
      const out = GR.under([GR.padAB(cam, [-96, top - 7, zb - 28], [96, top - 7, zb - 28], UP, 28, 7), ...GR.leg(cam, [-72, top - 14, zb - 28]), ...GR.leg(cam, [72, top - 14, zb - 28])]);
      if (weight) {
        /* el disco, plano sobre los muslos */
        const { J } = pose(q), c = mix(mix(J.L.hip, J.L.knee, .68), mix(J.R.hip, J.R.knee, .68), .5), n = norm(add(F.thighL.z, F.thighR.z));
        out.push(GR.disc(cam, add(c, mul(n, 23.5)), n, 28, 5));
      }
      return out;
    };
    return { view: 'stand', up: 'a', rest: 'a', cam: [-60, 8], at: at_, gear };
  };

  /* ════ antebrazos: curl de muñeca y rodillo ════ */
  const wristCurl = f => {
    const w = x => has(f, x);
    const roller = w('roller'), behind = w('behind'), reverse = w('reverse'), db = w('db'), cable = w('cable');
    /* la mano gira en la muñeca (handDir: de la muñeca al puño) en el plano del antebrazo, de b0 a b1 grados respecto a él (hacia
       arriba, positivo) */
    const turnHand = (fv, b) => { const up = norm(sub([0, 1, 0], mul(fv, dot([0, 1, 0], fv)))); return norm(add(mul(fv, cos(RAD(b))), mul(up, sin(RAD(b))))); };
    if (roller) {
      /* de pie, los brazos al frente a la altura de los hombros, con el rodillo en las manos: las muñecas giran una y otra vez,
         alternas, y la cuerda enrolla el disco hasta arriba y luego lo desenrolla despacio */
      const body = STAND, { F: F0 } = pose({ ...body, hands: ZERO, elbow: {} });
      const at_ = t => {
        const out = { ...body, hands: {}, elbow: {}, handDir: {}, barDir: [1, 0, 0] };
        for (const s of ['L', 'R']) {
          const a = armAt(F0, body, s, 86, 0, 4, { hx: 22 }), Wr = add(a.E, mul(a.v, LEN.fore)), b = 36 * sin(2 * PI * 6 * t + (s == 'R' ? PI : 0));
          out.handDir[s] = turnHand(a.v, b); out.hands[s] = add(Wr, mul(out.handDir[s], LEN.grip)); out.elbow[s] = a.hint;
        }
        out.plate = keys(t, [[0, 40], [.48, 150], [.52, 150], [1, 40]]);
        return out;
      };
      const gear = (q, F, cam) => {
        const c = mix(q.hands.L, q.hands.R, .5), X = x => add(c, [x, 0, 0]), py = q.plate;
        const out = [...GR.tube(cam, X(-34), X(-30), 9, GR.C.rubber, 1), ...GR.tube(cam, X(-14), X(14), 9, GR.C.rubber, 1), ...GR.tube(cam, X(30), X(34), 9, GR.C.rubber, 1)];
        out.push(...GR.strap(cam, [add(c, [0, -5, 0]), [c[0], py + 30, c[2]]], 2.4, ROPE), GR.disc(cam, [c[0], py, c[2]], [0, 0, 1], 28, 5));
        return out;
      };
      return { view: 'stand', up: 'b', rest: 'a', cam: [-50, 6], at: at_, gear, beat: cycle(9000) };
    }
    if (behind) {
      /* de pie, la barra detrás de los glúteos con las palmas hacia atrás y los brazos estirados: solo se doblan las muñecas, hacia
         atrás y arriba */
      const body = STAND, { F: F0, J: J0 } = pose({ ...body, hands: ZERO, elbow: {} });
      const backAt = y => { const v = 205 - (y - F0.pelvis.o[1]), p = prof(L.TRUNK3, clamp(v, 56, 228)); return F0.pelvis.o[2] + p[3] - p[2]; };
      let fl = 0;
      for (; fl > -30; fl -= .5) { const a = armAt(F0, body, 'L', fl, 6, 2, { hx: 30 }); if (a.H[2] <= backAt(a.H[1]) - 9) break; }
      const at_ = t => {
        const out = { ...body, hands: {}, elbow: {}, handDir: {}, barDir: [1, 0, 0] };
        for (const s of ['L', 'R']) { const a = armAt(F0, body, s, fl, 6, 2, { hx: 30 }), Wr = add(a.E, mul(a.v, LEN.fore)); out.handDir[s] = turnHand(a.v, -mix(0, 62, t)); out.hands[s] = add(Wr, mul(out.handDir[s], LEN.grip)); out.elbow[s] = a.hint; }
        out.barC = mix(out.hands.L, out.hands.R, .5); out.grip = abs(out.hands.L[0] - out.barC[0]);
        return out;
      };
      return { view: 'stand', up: 'b', rest: 'a', cam: [-120, 8], at: at_, gear: (q, F, cam) => curlBar(cam, q.barC, q.grip) };
    }
    /* sentado en el extremo del banco, inclinado, con los antebrazos apoyados en los muslos y las muñecas pasadas de las
       rodillas: la mano baja (la muñeca estirada) y sube (doblada); con agarre prono, al revés: sube estirando la muñeca */
    const solo = db, base = { root: [0, 118, 0], spine: 4, neck: -14, reach: 6, feet: both(() => [22, 84, 6]), knee: both(() => [.1, .6, .8]) };
    const J00 = pose({ ...base, tilt: 0, hands: ZERO, elbow: {} });
    const thighOf = (J, F, s) => { const d = norm(sub(J[s].knee, J[s].hip)), up = F['thigh' + s].z; return { d, up }; };
    const wristOf = (J, F, s) => { const { d, up } = thighOf(J, F, s); return add(add(J[s].knee, mul(d, 22)), mul(up, 17)); };
    const elbowOf = (J, F, s) => { const Wr = wristOf(J, F, s), { d, up } = thighOf(J, F, s), E0 = sub(Wr, mul(d, LEN.fore)), dh = len(sub(E0, J[s].hip)); return add(E0, mul(up, M.prof1(M.THIGH_F, dh) - 11 + 4)); };
    /* el tronco se inclina lo justo para que el brazo llegue del hombro al codo apoyado */
    /* (la distancia baja y luego vuelve a subir al inclinarse: la primera vez que llega) */
    const gap = l => { const q = { ...base, tilt: l }, { F, J } = pose({ ...q, hands: ZERO, elbow: {} }); return len(sub(shoulder(F, 'L', q), elbowOf(J, F, 'L'))) - LU; };
    let l0 = 0; while (l0 < 75 && gap(l0 + 1) > 0) l0 += 1;
    const lean = solve(gap, l0, l0 + 1);
    const body = { ...base, tilt: lean }, { F: F0, J: J0 } = pose({ ...body, hands: ZERO, elbow: {} });
    const b0 = reverse ? -58 : -64, b1 = reverse ? 34 : 52;
    const at_ = t => {
      const out = { ...body, hands: {}, elbow: {}, handDir: {}, barDir: reverse ? [1, 0, 0] : [-1, 0, 0] };
      for (const s of ['L', 'R']) {
        const Wr = wristOf(J0, F0, s), E = elbowOf(J0, F0, s), fv = norm(sub(Wr, E)), still = solo && s == 'L';
        out.handDir[s] = turnHand(fv, still ? -10 : mix(b0, b1, t)); out.hands[s] = add(Wr, mul(out.handDir[s], LEN.grip));
        out.elbow[s] = hintL(s, norm(sub(E, mix(shoulder(F0, s, body), Wr, .5))));
      }
      if (solo) { out.fist = { L: false }; out.palm = { L: [0, -1, 0] }; out.barDir = { L: [1, 0, 0], R: reverse ? [1, 0, 0] : [-1, 0, 0] }; }
      if (!db) { out.barC = mix(out.hands.L, out.hands.R, .5); out.grip = abs(out.hands.L[0] - out.barC[0]); }
      return out;
    };
    const gear = (q, F, cam) => {
      const p0 = at(F0.pelvis, [0, -22, 0]), out = [...GR.under(flatBench(cam, [0, p0[1] - 7, p0[2] + 26], [0, p0[1] - 7, p0[2] - 110]))];
      if (db) out.push(...GR.dumbbell(cam, q.hands.R, dbAxis(F, q, 'R'), 'R'));
      else {
        out.push(...curlBar(cam, q.barC, q.grip));
        if (cable) out.push(...GR.pulleyTower(cam, [14, 0, wristOf(J0, F0, 'L')[2] + 90], 12, q.barC));
      }
      return out;
    };
    return { view: 'seat', up: 'b', rest: 'a', cam: [-60, 14], one: solo, at: at_, gear };
  };

  Object.assign(F3.FAMILIES, { curl, trxCurl, pushdown, skull, overheadExt, kickback, tricepsMachine, dip, benchDip, wristCurl });
  /* lo que comparten las familias del lote 5 (hombros3d.js) */
  F3.blib = { STAND, SEAT, ROOT_Y, LU, LF, STEEL, ROPE, mj, dirT, hintL, armAt, gripDir, onHip, prof, frontAt, bump, keys, cycle, curlBar, handle, rope, flatBench, benchUnder };
})(window);
