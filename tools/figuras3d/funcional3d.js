/* ═══ figuras 3D: CrossFit, Hyrox y funcional (lote 7) ═══
   Halterofilia (cargadas, arrancadas, envión, thruster, push press y jerks, con barra y con mancuernas), kettlebell (swings,
   cargadas, arrancada, get-up, windmill y halo), acarreos (granjero, rack, saco al hombro y abrazado, cargadas del saco y de
   la mochila, saco por encima del hombro, pinza con discos), trineo (empuje, arrastre hacia atrás y tirón con cuerda),
   burpees (y devil press, sprawl, por encima de la barra, del cajón y con salto adelante), wall balls, balón medicinal (slam
   y lanzamientos), box jump y saltos laterales, muscle-ups (anillas y barra), trepa de cuerda, pino y flexiones en pino,
   gateos (oso y cangrejo), inchworm, press Svend, battle ropes y volteo de neumático.
   Las mismas reglas que el resto: lo que se apoya toca el suelo o el material con el grosor del dibujo, sin hundirse ni
   flotar; lo que no se mueve no se mueve, y nada atraviesa el cuerpo ni el material. Usa lo de brazos3d.js (F3.blib) y lo de
   core3d.js (F3.clib).
   Define: Fig3D.FAMILIES.oly, .kbell, .carry, .sled, .burpee, .wallBall, .medBall, .boxJump, .sideJump, .muscleUp,
   .ropeClimb, .handstand, .crawl, .inchworm, .svend, .ropes, .tire */
(function (G) {
  const F3 = G.Fig3D, L = F3.lib, GR = F3.gear, M = F3.mlib, B = F3.blib, C = F3.clib;
  const { add, sub, mul, dot, cross, len, norm, perp, mix, ease, clamp, at, RAD, LEN, barbell } = L;
  const { has, pose, torso, ZERO, UP, sd, both, shoulder, span, comOf, midFoot, solve, legFront, prof1, SHIN_F } = M;
  const { ROOT_Y, LU, LF, mj, hintL, keys, cycle } = B;
  const { cos, sin, PI, abs, max, min, sqrt, atan2, asin } = Math;
  const DEG = 180 / PI;

  /* ── el ritmo ── */
  /* (la curva suave, la de mov3d.js) */
  const spl = M.spl;
  /* un gesto hecho de tramos: cada uno, la postura a la que llega, lo que tarda (ms) y cuánto cambia la figura (du: lo que
     avanza t). Así t avanza parejo con lo que se ve (y las comprobaciones lo miran a pasos iguales) y el reloj pone el ritmo:
     lento al bajar, explosivo en el tirón. Devuelve la postura en t (cada número por su curva) y el reloj */
  const sequence = (start, segs) => {
    const tot = segs.reduce((a, s) => a + s[2], 0), K = [[0, start]], CL = [];
    let acc = 0;
    for (const [st, ms, du] of segs) { acc += du; K.push([acc / tot, st]); CL.push([acc / tot, ms]); }
    const fields = Object.keys(start), tabs = {};
    for (const [, st] of K) for (const f of fields) if (typeof st[f] != 'number' || isNaN(st[f])) throw new Error('postura sin ' + f);
    for (const f of fields) tabs[f] = K.map(([t, s]) => [t, s[f]]);
    const T = CL.reduce((a, c) => a + c[1], 0);
    return {
      at: t => { const o = {}; for (const f of fields) o[f] = spl(t, tabs[f]); return o; },
      beat: ms => { let x = ms % T, t0 = 0; for (const [t1, d] of CL) { if (x < d) return t0 + (t1 - t0) * x / d; x -= d; t0 = t1; } return 1; },
      keyT: K.map(k => k[0]),
    };
  };

  /* una postura entre dos (cada número, mezclado) */
  const mix2 = (a, b, k) => { const o = {}; for (const f of Object.keys(a)) o[f] = a[f] + (b[f] - a[f]) * k; return o; };

  /* ── de pie, con los dos pies en el suelo ── */
  /* el pie con el talón levantado p grados (de puntillas) sin que se mueva la bola del pie: el tobillo sube y se adelanta a lo
     largo del pie (con la punta girada toe hacia fuera). Lo que va en la postura: x, z, giro, altura del tobillo, inclinación */
  const footUp = (w, z, toe, p = 0) => {
    const r = RAD(p), d = [sin(RAD(toe)), 0, cos(RAD(toe))], ku = 19.8 * (cos(r) - 1) + 25 * sin(r), kd = 19.8 * sin(r) + 25 * (1 - cos(r));
    return [w + d[0] * kd, z + d[2] * kd, toe, ku, p];
  };
  /* la cadera (la raíz) con el tobillo en A: la espinilla ps grados hacia la punta del pie y el muslo pt grados sobre la
     horizontal (como legRoot, con el tobillo donde quede) */
  const legRootA = (A, toe, ps, pt) => {
    const w = A[0], d = [sin(RAD(toe)), 0, cos(RAD(toe))], lat = -(w - 20) / (LEN.thigh + LEN.shin) * max(0, 1 - ps / 15);
    const K = add(A, mul(norm(add(mul(d, sin(RAD(ps))), [lat, cos(RAD(ps)), 0])), LEN.shin));
    const dx = 20 - K[0], vy = min(LEN.thigh * sin(RAD(pt)), sqrt(max(0, LEN.thigh ** 2 - dx * dx)) - .05);
    return [0, K[1] + vy, K[2] - sqrt(max(0, LEN.thigh ** 2 - dx * dx - vy * vy))];
  };
  const legsAt = (w, toe, ps, pt, heel = 0, z = 0) => { const f = footUp(w, z, toe, heel); return legRootA([f[0], LEN.ankle + f[3], f[1]], toe, ps, pt); };
  /* la postura de pie: cada número de la tabla (los dos pies por separado: ancho, adelante, giro, talón y despegue; la raíz, el
     tronco y los hombros). Las rodillas, hacia donde apuntan los pies */
  const BASE = { wL: 26, wR: 26, zL: 0, zR: 0, toeL: 10, toeR: 10, pL: 0, pR: 0, lL: 0, lR: 0, ry: ROOT_Y, rz: 0, tilt: 0, spine: 0, neck: 0, shrug: 0, reach: 0, twist: 0, bend: 0 };
  const qOf = s => {
    const ft = (w, z, toe, p, l) => { const f = footUp(w, z, toe, p); f[3] += l; return f; };
    const kh = toe => [sin(RAD(toe)), 0, cos(RAD(toe))];
    return {
      root: [0, s.ry, s.rz], tilt: s.tilt, spine: s.spine, neck: s.neck, shrug: s.shrug, reach: s.reach, twist: s.twist, bend: s.bend,
      feet: { L: ft(s.wL, s.zL, s.toeL, s.pL, s.lL), R: ft(s.wR, s.zR, s.toeR, s.pR, s.lR) }, knee: { L: kh(s.toeL), R: kh(s.toeR) },
    };
  };
  /* una postura simétrica: los pies (ancho, giro, talón), la espinilla y el muslo (por legRoot) y el resto */
  const legs = (o, extra = {}) => {
    const r = legsAt(o.w, o.toe, o.ps, o.pt, o.heel || 0);
    return { ...BASE, wL: o.w, wR: o.w, toeL: o.toe, toeR: o.toe, pL: o.heel || 0, pR: o.heel || 0, ry: r[1], rz: r[2], ...extra };
  };

  /* ── la barra en el tirón ── */
  /* el frente de la espinilla a la altura y (con la espinilla ps grados hacia delante): lo que no puede pasar la barra */
  const shinFront = (y, ps, toe) => { const hy = y - LEN.ankle, c = cos(RAD(ps)), d = clamp(LEN.shin - hy / c, -8, 92); return hy * Math.tan(RAD(ps)) * cos(RAD(toe)) + prof1(SHIN_F, d) / c; };
  /* la postura del tirón con la barra en (y, z) y la espinilla a ps grados: el hombro, donde los brazos estirados llegan a la
     barra (con las manos a g del centro) quedando ahead por delante de ella; la cadera, donde se cortan el arco que le deja el
     muslo desde la rodilla y el que le deja el tronco (con la columna doblada spine) desde el hombro. Sin buscar: es la
     intersección de dos circunferencias */
  const pullFit = (P, y, z, ps, ahead, spine, shrug = 0, reach = 3) => {
    const d = [sin(RAD(P.toe)), 0, cos(RAD(P.toe))], lat = -(P.w - 20) / (LEN.thigh + LEN.shin) * max(0, 1 - ps / 15);
    const K = add([P.w, LEN.ankle, 0], mul(norm(add(mul(d, sin(RAD(ps))), [lat, cos(RAD(ps)), 0])), LEN.shin)), dx = 20 - K[0], rho = sqrt(LEN.thigh ** 2 - dx * dx);
    const r = sqrt(145 ** 2 - (P.g - 47) ** 2), Sy = y + sqrt(r * r - ahead * ahead), Sz = z + ahead;
    const c = cos(RAD(spine)), s = sin(RAD(spine)), a = [80 + shrug, -2 + reach], v = [45 + a[0] * c - a[1] * s, -2 + a[0] * s + a[1] * c], D = Math.hypot(v[0], v[1]);
    const ey = Sy - K[1], ez = Sz - K[2], dd = Math.hypot(ey, ez), aa = (rho * rho - D * D + dd * dd) / (2 * dd), h = sqrt(max(0, rho * rho - aa * aa));
    const my = K[1] + aa * ey / dd, mz = K[2] + aa * ez / dd, H1 = [my - h * ez / dd, mz + h * ey / dd], H2 = [my + h * ez / dd, mz - h * ey / dd], H = H1[1] < H2[1] ? H1 : H2;
    const tilt = (atan2(Sz - H[1], Sy - H[0]) - atan2(v[1], v[0])) * DEG;
    return { ...BASE, wL: P.w, wR: P.w, toeL: P.toe, toeR: P.toe, ry: H[0], rz: H[1], tilt, spine, neck: -.45 * (tilt + spine), shrug, reach };
  };
  /* la espinilla más adelantada con la que la barra, a la altura y sobre el medio del pie, aún pasa por delante */
  const psMax = (P, y, zb) => { const f = p => shinFront(y, p, P.toe) - (zb - 4.6); return f(-10) > 0 ? -10 : f(30) < 0 ? 30 : solve(f, -10, 30); };

  /* ── lo que hacen los brazos con la barra ── */
  /* colgando, con los brazos estirados: la barra a la altura que llegan con ella en z, por delante de las piernas (y del
     tronco, si está erguido) con su grosor */
  const hangBar = (F, J, q, hz, g, k = 145) => {
    const S = shoulder(F, 'L', q), r = sqrt(max(1, k * k - (g - S[0]) ** 2));
    let z = hz, y = 0;
    for (let i = 0; i < 3; i++) { y = S[1] - sqrt(max(0, r * r - (z - S[2]) ** 2)); z = max(hz, B.frontAt(F, J, y) + 4.4); }
    return [0, S[1] - sqrt(max(0, r * r - (z - S[2]) ** 2)), z];
  };
  /* arriba, con los brazos bloqueados: la barra sobre el medio de los pies */
  const overBar = (F, q, g, k = 146) => {
    const S = mix(shoulder(F, 'L', q), shoulder(F, 'R', q), .5), m = mix(at(F.footL, [0, 0, 14]), at(F.footR, [0, 0, 14]), .5), r = sqrt(k * k - (g - 47) ** 2);
    return [0, S[1] + sqrt(max(0, r * r - (m[2] - S[2]) ** 2)), m[2]];
  };
  /* los pesos de lo que hacen los brazos (colgando, tirón alto, en los hombros, arriba), normalizados */
  const wts = s => { const a = [s.mH, s.mP, s.mR, s.mO].map(v => max(0, v)), k = a.reduce((x, y) => x + y, 0) || 1; return a.map(v => v / k); };
  const EL = [[.3, .1, -1], [1, .75, -.25], [.22, .05, 1], [.45, 0, -1]];
  /* la muñeca: con la barra en los hombros, doblada hacia atrás (el puño encima, el antebrazo hacia delante); en lo demás,
     siguiendo al antebrazo. Entre medias, mezclado: así no salta */
  /* (los dedos bajo la barra, hacia el hombro: la muñeca queda lejos de él y el antebrazo no se mete en el brazo. Hacia atrás,
     no hacia dentro: la barra, de través en los dedos; antes, apuntando al hombro, la cruzaba a 37°) */
  const rackHand = (F, s, q) => { const v = sub(shoulder(F, s, q), q.hands[s]), x = dot(v, F.thorax.x); return norm(add(norm(sub(v, mul(F.thorax.x, .7 * x))), mul(F.thorax.y, .35))); };
  /* (en el tirón alto, con los codos arriba y por fuera, la muñeca se dobla y el puño cuelga bajo ella, con los nudillos hacia
     abajo: la barra, de través y pegada al cuerpo. Antes el puño seguía al antebrazo y la barra corría a lo largo de él) */
  const pullHand = F => norm(add(mul(F.thorax.y, -1), mul(F.thorax.z, .3)));
  /* (de los hombros a arriba, la muñeca se endereza en cuanto la barra sale de ellos: el antebrazo, vertical bajo la barra.
     Antes seguía doblada hasta casi arriba, la muñeca se quedaba lejos del hombro y la mano no llegaba a la barra) */
  const wristMix = (q, w, wp = 0, wo = 0) => {
    if (w <= 0 && wp <= 0) return q;
    w = min(1, 3.5 * w) * max(0, 1 - 2 * wo); wp = min(1, 3.5 * wp) * max(0, 1 - 2 * wo);
    const { F, J } = pose(q), o = {};
    /* (y, en los cambios de una a otra, la muñeca algo doblada de lado: la barra, de lado a lado, cruza el puño casi de través) */
    for (const s of ['L', 'R']) { const v = norm(mix(mix(norm(sub(J[s].fist, J[s].el)), pullHand(F), wp), rackHand(F, s, q), w)); o[s] = norm([v[0] * .3, v[1], v[2]]); }
    return { ...q, handDir: o };
  };

  /* la barra (o lo que se lleve delante) fuera del tronco: en el marco del tórax y en el de la pelvis, si queda dentro de su
     sección a esa altura (una elipse, la del dibujo), se adelanta lo justo para pasar por delante con su grosor */
  const clearTrunk = (F, c, r = 4.4) => {
    for (const [fr, top, lo, hi] of [[F.thorax, 160, 56, 160], [F.pelvis, 205, 160, 228]]) {
      const d = sub(c, fr.o), v = top - dot(d, fr.y), z = dot(d, fr.z);
      if (v < lo || v > hi) continue;
      const p = B.prof(L.TRUNK3, v), front = p[3] + p[2] + r;
      if (z < front && z > p[3] - p[2]) c = add(c, mul(fr.z, front - z));
    }
    return c;
  };
  /* la barra olímpica (como barbell), con los discos que se aclaran en la vista de lado para que dejen ver el cuerpo */
  const olyBar = (cam, c, grip) => {
    const X = x => add(c, [x, 0, 0]), out = [];
    let spans = [[-139, 139]];
    [[-grip - 8, -grip + 8], [grip - 8, grip + 8]].forEach(([a, b]) => { spans = spans.flatMap(([u, v]) => b <= u || a >= v ? [[u, v]] : [[u, a], [b, v]].filter(([m, n]) => n - m > 1)); });
    spans.forEach(([u, v]) => {
      const it = L.bar(cam, X(u), X(v), max(1, Math.round((v - u) / 18)), 5.2);
      [[u, 0], [v, it.length - 1]].forEach(([e, i]) => { if (abs(abs(e) - grip) < 9) it[i].hand = e > 0 ? 'L' : 'R'; });
      out.push(...it);
    });
    [-1, 1].forEach(k => {
      out.push(...L.bar(cam, X(k * 141), X(k * 222), 4, 7.6));
      out.push(...GR.sideFade([L.plate(cam, X(k * 140), 6.5, 3.5, true), L.plate(cam, X(k * 151), 49, 12), L.plate(cam, X(k * 163), 49, 9), L.plate(cam, X(k * 171), 7.5, 5, true), L.plate(cam, X(k * 221.5), 3.8, 1, true)]));
    });
    return out;
  };

  /* ════ halterofilia ════ */
  const oly = f => {
    const w = x => has(f, x);
    const db = w('db'), one = w('one'), snatch = w('snatch'), thruster = w('thruster'), cj = w('cj'), pull = w('pull');
    const jerkOnly = w('jerk'), hang = w('hang'), power = w('power'), muscle = w('muscle');
    const cleanLift = w('clean') || cj, splitJ = w('split') || cj, pressJ = w('press'), pushJ = w('push');
    if (db) return olyDb(f);
    /* el agarre: el de la cargada, justo por fuera de las piernas; el de la arrancada, muy abierto. Los pies: al ancho de la
       cadera para tirar y algo más abiertos (y más girados) para recibir */
    const P = snatch ? { w: 27, toe: 11, g: 112 } : { w: 26, toe: 10, g: 58 }, g = P.g, Pc = snatch ? { w: 33, toe: 20 } : { w: 31, toe: 18 };
    const zb = 16.5;
    const rack = (o = {}) => ({ mH: 0, mP: 0, mR: 1, mO: 0, hz: zb, ...o });
    const hangM = (o = {}) => ({ mH: 1, mP: 0, mR: 0, mO: 0, hz: zb, ...o });
    const overM = (o = {}) => ({ mH: 0, mP: 0, mR: 0, mO: 1, hz: zb, ...o });
    /* el tirón: la barra en el suelo (sobre el medio del pie, con las espinillas rozándola), a la altura de las rodillas (las
       espinillas ya verticales) y en mitad de los muslos (las rodillas, otra vez algo adelante: el segundo tirón) */
    const yF = 49, sF = pullFit(P, yF, zb, min(snatch ? 13 : 11, psMax(P, yF, zb)), snatch ? 6 : 9, -3);
    const sFloor = { ...sF, ...hangM() };
    const sKnee = { ...pullFit(P, 114, zb, 0, snatch ? 6 : 9, -3), ...hangM() };
    const sThigh = { ...pullFit(P, snatch ? 158 : 148, zb + 2, 7, 1, -2), ...hangM() };
    /* la extensión: piernas estiradas y de puntillas, el tronco algo echado atrás, los hombros encogidos y los brazos aún
       estirados: la barra pegada a la cadera (en la arrancada, en el pliegue de la cadera) */
    const sExt = legs({ ...P, ps: -2, pt: 90, heel: 30 }, { tilt: -9, spine: -4, neck: 4, shrug: 10, reach: 0, ...hangM({ hz: zb + 4 }) });
    /* el tirón por debajo: los pies despegan un poco y se abren, el cuerpo baja y la barra sigue subiendo pegada (los codos,
       altos y por fuera) */
    const sUnder = legs({ w: (P.w + Pc.w) / 2, toe: (P.toe + Pc.toe) / 2, ps: 10, pt: 70 }, { lL: 6, lR: 6, toeL: (P.toe + Pc.toe) / 2, tilt: -2, spine: -2, neck: 2, shrug: 8, mH: 0, mP: 1, mR: 0, mO: 0, hz: zb });
    /* la recepción: en los hombros (cargada) o arriba con los brazos bloqueados (arrancada); en sentadilla completa o en media */
    const catchLegs = deep => deep ? { ...Pc, ps: snatch ? 40 : 38, pt: snatch ? -10 : -8 } : { ...Pc, ps: 20, pt: 46 };
    const deep = !power && !w('powerless');
    const sCatchR = d => legs(catchLegs(d), { tilt: d ? 17 : 9, spine: d ? 7 : 3, neck: d ? -14 : -6, shrug: 4, reach: 10, ...rack() });
    const sCatchO = d => legs(catchLegs(d), { tilt: d ? 14 : 8, spine: d ? 5 : 2, neck: d ? 6 : 2, shrug: 7, reach: 0, ...overM() });
    /* de pie al terminar (con los pies aún abiertos) y los pies que vuelven, de uno en uno, al ancho del tirón */
    const standR = (o = {}) => legs({ ...Pc, ps: 2, pt: 88 }, { tilt: 1, spine: 0, neck: -2, shrug: 3, reach: 8, ...rack(), ...o });
    const standO = (o = {}) => legs({ ...Pc, ps: 2, pt: 88 }, { tilt: 1, spine: 1, neck: 4, shrug: 7, reach: 0, ...overM(), ...o });
    const standP = (o = {}) => legs({ ...P, ps: 2, pt: 88 }, { tilt: 1, spine: 0, neck: -2, shrug: 3, reach: 8, ...rack(), ...o });
    /* la barra bajada hasta los muslos, de pie, y de ahí al suelo (el tirón al revés) */
    const sHangTop = legs({ ...P, ps: 3, pt: 86 }, { tilt: 4, spine: -2, neck: -2, shrug: 0, reach: 2, ...hangM({ hz: zb + 4 }) });
    const lower = [[sHangTop, 650, 1], [sThigh, 380, .7], [sKnee, 340, .7], [sFloor, 420, .8], [sFloor, 450, .15]];
    /* un paso: el pie side va de donde está a o (ancho, adelante, giro, talón), despegándose a mitad de camino */
    const stepTo = (s, side, o, ms = 200, body = {}) => {
      const k = side, to = {}; for (const [f, v] of Object.entries(o)) to[f + k] = v;
      const mid = { ...s, ...Object.fromEntries(Object.entries(to).map(([f, v]) => [f, (s[f] + v) / 2])), ['l' + k]: 8, ...Object.fromEntries(Object.entries(body).map(([f, v]) => [f, (s[f] + v) / 2])) };
      const end = { ...s, ...to, ['l' + k]: 0, ...body };
      return [[mid, ms * .5, .3], [end, ms * .5, .3]];
    };
    const last = segs => segs[segs.length - 1][0];
    let seq, cam = [-38, 9];
    if (thruster) {
      /* el thruster: sentadilla frontal y, al subir, la barra arriba en el mismo gesto; baja a los hombros otra vez de pie */
      const PT = { w: 31, toe: 18 };
      const top = legs({ ...PT, ps: 2, pt: 88 }, { tilt: 1, spine: 0, neck: -2, shrug: 3, reach: 8, ...rack() });
      const bot = legs({ ...PT, ps: 38, pt: -8 }, { tilt: 17, spine: 7, neck: -14, shrug: 4, reach: 10, ...rack() });
      const mid = legs({ ...PT, ps: 18, pt: 50 }, { tilt: 8, spine: 3, neck: -8, shrug: 4, reach: 9, ...rack() });
      const drive = legs({ ...PT, ps: 2, pt: 90, heel: 10 }, { tilt: 0, spine: 0, neck: -6, shrug: 6, reach: 5, mH: 0, mP: 0, mR: .5, mO: .5, hz: zb });
      const ohS = legs({ ...PT, ps: 2, pt: 88 }, { tilt: 1, spine: 1, neck: 4, shrug: 7, reach: 0, ...overM() });
      seq = sequence(top, [[mid, 700, .6], [bot, 600, .6], [bot, 120, .12], [mid, 420, .6], [drive, 260, .7], [ohS, 260, .6], [ohS, 380, .15], [top, 650, .9], [top, 300, .12]]);
    }
    else {
      /* lo que va del suelo (o de los muslos) a la barra recibida */
      const start = jerkOnly && !cj ? standP() : hang ? sHangTop : sFloor;
      const segs = [];
      if (jerkOnly && !cj) segs.push([standP(), 450, .15]);
      else if (hang) segs.push([sHangTop, 450, .15], [{ ...pullFit(P, snatch ? 168 : 160, zb + 2, 6, 2, -2), ...hangM() }, 520, .6], [sExt, 150, .6]);
      else segs.push([sFloor, 450, .15], [sKnee, 480, 1], [sThigh, 260, .7], [sExt, 140, .6]);
      /* bajar la barra de arriba: por delante de la cara (hasta el pecho) y de ahí a los muslos */
      const fromOver = () => [[legs({ ...P, ps: 3, pt: 86 }, { tilt: 1, spine: 0, neck: -4, shrug: 4, reach: 4, mH: 0, mP: 1, mR: 0, mO: 0, hz: zb }), 520, .8], [sHangTop, 520, .8]];
      if (pull) {
        /* el tirón de cargada: hasta la extensión, con los brazos estirados, y de vuelta */
        segs.push([sExt, 160, .15], [sThigh, 420, .7], [sKnee, 380, .7], [sFloor, 420, .8], [sFloor, 400, .15]);
      }
      else if (muscle) {
        /* sin volver a flexionar las piernas: los codos suben altos y la barra gira hasta arriba con los brazos estirados */
        const hi = legs({ ...P, ps: 2, pt: 89, heel: 10 }, { tilt: -3, spine: -2, neck: -6, shrug: 8, reach: 2, mH: 0, mP: 1, mR: 0, mO: 0, hz: zb });
        const top = legs({ ...P, ps: 2, pt: 88 }, { tilt: 1, spine: 1, neck: 4, shrug: 7, reach: 0, ...overM() });
        segs.push([hi, 300, .8], [top, 340, .8], [top, 420, .15], ...fromOver(), ...lower.slice(1));
      }
      else {
        if (!(jerkOnly && !cj)) {
          const catchS = snatch ? sCatchO(deep) : sCatchR(deep), upS = snatch ? standO() : standR();
          segs.push([sUnder, 130, .6], [catchS, 200, .8], [catchS, 160, .12], [upS, deep ? 900 : 500, deep ? 1 : .6], [upS, 300, .12]);
          segs.push(...stepTo(last(segs), 'L', { w: P.w, toe: P.toe }, 260));
          segs.push(...stepTo(last(segs), 'R', { w: P.w, toe: P.toe }, 260));
        }
        if (jerkOnly || cj) {
          /* el envión: una flexión corta de piernas (el tronco vertical), el empuje de puntillas y la barra arriba: recibida con
             las piernas algo flexionadas (push jerk), en tijera (split jerk) o empujada solo con los brazos (push press) */
          const base = last(segs);
          const dip = { ...base, ...legs({ ...P, ps: 14, pt: 70 }), tilt: 0, spine: 0, neck: -2, shrug: 3, reach: 8 };
          const drive = { ...base, ...legs({ ...P, ps: 0, pt: 90, heel: 22 }), tilt: -1, spine: -1, neck: -6, shrug: 8, reach: 4, mH: 0, mP: 0, mR: .55, mO: .45 };
          const top = { ...legs({ ...P, ps: 2, pt: 88 }), tilt: 1, spine: 1, neck: 4, shrug: 7, reach: 0, ...overM() };
          segs.push([dip, 420, .45], [drive, 150, .5]);
          if (splitJ) {
            /* la tijera: el pie izquierdo adelante y el derecho atrás, de puntillas; la cadera baja entre los dos. Al recuperar,
               primero vuelve el de delante y luego el de atrás */
            const sp = { ...top, toeL: 4, toeR: 12, zL: 70, zR: -122, pR: 48, ry: ROOT_Y - 30, rz: 2, spine: 2, neck: 3 };
            const air = { ...mix2(drive, sp, .5), lL: 9, lR: 9, ry: ROOT_Y + 2, mR: .25, mO: .75 };
            segs.push([air, 110, .45], [sp, 120, .5], [sp, 160, .12]);
            segs.push(...stepTo(sp, 'L', { z: 0, toe: P.toe }, 380, { ry: ROOT_Y - 16, rz: -12 }));
            segs.push(...stepTo(last(segs), 'R', { z: 0, toe: P.toe, p: 0 }, 380, { ry: top.ry, rz: top.rz }));
            segs.push([top, 240, .2]);
          }
          else if (pushJ) {
            /* el push jerk: los pies saltan un poco hacia fuera y recibe la barra arriba en media sentadilla */
            const catchJ = { ...legs({ w: P.w + 4, toe: P.toe + 4, ps: 16, pt: 56 }), tilt: 2, spine: 1, neck: 3, shrug: 7, reach: 0, ...overM() };
            const air = { ...mix2(drive, catchJ, .5), lL: 6, lR: 6, mR: .2, mO: .8 };
            segs.push([air, 90, .35], [catchJ, 130, .45], [catchJ, 140, .12], [{ ...top, wL: P.w + 4, wR: P.w + 4, toeL: P.toe + 4, toeR: P.toe + 4 }, 520, .6]);
            segs.push(...stepTo(last(segs), 'L', { w: P.w, toe: P.toe }, 260), ...stepTo(last(segs), 'R', { w: P.w, toe: P.toe }, 260));
          }
          else segs.push([{ ...top, pL: 0, pR: 0 }, 320, .7]);
          /* baja a los hombros, con las piernas algo flexionadas para amortiguarla */
          segs.push([last(segs), 400, .15], [{ ...dip, ...legs({ ...P, ps: 9, pt: 78 }), tilt: 0, spine: 0, neck: -2, shrug: 3, reach: 8 }, 600, .9], [standP(), 380, .3]);
          if (!cj) segs.push([standP(), 300, .12]);
        }
        if (snatch) segs.push(...fromOver(), ...lower.slice(1));
        else if (!(jerkOnly && !cj)) segs.push([sHangTop, 650, 1], ...lower.slice(1));
      }
      seq = sequence(start, segs);
    }
    const BUMP = thruster || jerkOnly || cj ? 14 : 10;
    return {
      view: 'front', up: 'a', merge: false, cam, side: [-80, 4], beat: seq.beat, keyT: seq.keyT,
      at(t) {
        const s = seq.at(t), q0 = qOf(s), { F, J } = pose({ ...q0, hands: ZERO, elbow: {} }), [wH, wP, wR, wO] = wts(s);
        let c = [0, 0, 0];
        if (wH) c = add(c, mul(hangBar(F, J, q0, s.hz, g), wH));
        if (wP) c = add(c, mul(at(F.thorax, snatch ? [0, 94, 27] : [0, 70, 31]), wP));
        if (wR) c = add(c, mul(at(F.thorax, [0, 101, 19.5]), wR));
        if (wO) c = add(c, mul(overBar(F, q0, g), wO));
        /* al pasar de los hombros (o del tirón alto) a arriba, la barra rodea la cara por delante; de los hombros a los muslos,
           el pecho. Y nunca dentro del tronco */
        c = clearTrunk(F, add(add(c, mul(F.thorax.z, BUMP * 4 * (wR + wP) * wO + 22 * 4 * wR * wH)), mul(F.thorax.y, 14 * 4 * wP * wR)));
        /* (los codos llegan a su sitio antes que la barra: en la cargada, se meten por delante deprisa) */
        /* (y al bajarla de los hombros a los muslos, los codos pasan por abajo: mezclando el de delante y el de atrás, iban de lado,
           los antebrazos se tumbaban a lo largo de la barra y la barra los cruzaba junto a la muñeca) */
        const kR = 1 + 3 * min(1, 4 * wP), el = norm(add([0, 1, 2].map(i => EL[0][i] * wH + EL[1][i] * wP + EL[2][i] * wR * kR + EL[3][i] * wO), [0, -6 * wH * wR, 0]));
        /* (y al alcance de los brazos: al pasar de los hombros a arriba, la barra, adelantada para rodear la cara, se quedaba
           lejos de ellos) */
        const S = shoulder(F, 'L', q0), hL = add(c, [g, 0, 0]), dS = len(sub(hL, S)), RM = LEN.upper + LEN.fore + LEN.grip - .3;
        if (dS > RM) c = sub(c, mul(sub(hL, S), (dS - RM) / dS));
        /* (la barra de lado a lado: la muñeca se dobla un poco de lado si hace falta, para que cruce el puño de través) */
        const q = { ...q0, barC: c, grip: g, hands: { L: add(c, [g, 0, 0]), R: add(c, [-g, 0, 0]) }, elbow: both(() => el), barDir: [1, 0, 0] };
        return wristMix(q, wR, wP, wO);
      },
      gear: (q, F, cam) => olyBar(cam, q.barC, q.grip),
    };
  };
  /* con mancuernas: la arrancada a una mano (del suelo, entre los pies, de un tirón hasta arriba con el brazo bloqueado), el
     thruster (en los hombros, sentadilla y arriba al subir) y la cargada y envión (de colgando a los hombros y de ahí arriba,
     con un empujón de piernas). El asa, de delante a atrás (agarre neutro) */
  const olyDb = f => {
    const w = x => has(f, x), P = { w: 30, toe: 14 };
    /* las manos: en los hombros (la cabeza de atrás de la mancuerna apoyada en el hombro, los codos abajo y adelante), arriba
       (los brazos bloqueados sobre los hombros), colgando junto a los muslos, entre las rodillas */
    /* (en los hombros, algo por fuera y adelantada, con el asa hacia fuera y adelante: la cabeza de atrás, sobre el hombro y no
       en el brazo; colgando y en las rodillas, por fuera de las piernas) */
    const rackH = (F, s2) => at(F.thorax, sd(s2, [38, 97, 57])), overH = (F, q, s2) => add(shoulder(F, s2, q), sd(s2, [-4, 140, 2])), hangH = (F, q, s2) => add(shoulder(F, s2, q), sd(s2, [23, -140, 6]));
    const kneeH = (F, q, s2) => add(shoulder(F, s2, q), sd(s2, [12, -138, 18]));
    const EL = { rack: [.45, -1, .5], over: [.4, 0, -1], hang: [.2, 0, -1] };
    const RACK_A = [.7, 0, 1];
    const pose2 = (st, which) => withHands(st, (F, q) => ({ hands: both(s2 => which == 'rack' ? rackH(F, s2) : which == 'over' ? overH(F, q, s2) : which == 'knee' ? kneeH(F, q, s2) : hangH(F, q, s2)), elbow: both(() => EL[which == 'knee' ? 'hang' : which]) }));
    const DB = both(() => [0, 0, 1]);
    let K, start;
    if (w('snatch')) {
      /* (a una mano, la derecha; la izquierda, suelta junto al cuerpo. La mancuerna, en el suelo entre los pies) */
      const FL = [-8, 14.5, 18], P = { w: 40, toe: 24 };
      const one = (st, Hr, el) => withHands(st, (F, q) => ({ hands: { R: typeof Hr == 'function' ? Hr(F, q) : Hr, L: add(shoulder(F, 'L', q), [24, -136, 10]) }, elbow: { R: el, L: [.2, 0, -1] }, fist: { L: false }, palm: { L: [-1, 0, 0] } }));
      const floor = one(legs({ ...P, ps: 22, pt: 26 }, { tilt: 48, spine: 6, neck: -24, shrug: 0, reach: 6 }), FL, [.3, .2, -1]);
      /* (sube por delante de las rodillas y del cuerpo, separada de él, y pasa por fuera de la cabeza, a la derecha) */
      /* (delante de las rodillas, por el medio: entre ellas, por donde subió del suelo) */
      const midKnee = (F, q) => { const { J } = pose({ ...q, hands: ZERO, elbow: {} }); return add(mix(J.L.knee, J.R.knee, .5), [-8, -4, 38]); };
      const lift = one(legs({ ...P, ps: 12, pt: 52 }, { tilt: 32, spine: 4, neck: -14, shrug: 2, reach: 6 }), midKnee, [.4, .1, -1]);
      const ext = one(legs({ ...P, ps: 0, pt: 90, heel: 22 }, { tilt: -4, spine: -2, neck: 2, shrug: 10, reach: 2 }), (F, q) => at(F.thorax, [-26, 74, 58]), [1, .3, -.3]);
      const punch = one(legs({ ...P, ps: 12, pt: 66 }, { tilt: 2, spine: 0, neck: 4, shrug: 8, reach: 0 }), (F, q) => at(F.thorax, [-50, 150, 46]), [.8, .5, -.4]);
      const catchO = one(legs({ ...P, ps: 14, pt: 62 }, { tilt: 4, spine: 1, neck: 4, shrug: 8, reach: 0 }), (F, q) => overH(F, q, 'R'), EL.over);
      const top = one(legs({ ...P, ps: 2, pt: 88 }, { tilt: 1, spine: 1, neck: 4, shrug: 8, reach: 0 }), (F, q) => overH(F, q, 'R'), EL.over);
      const down = one(legs({ ...P, ps: 4, pt: 84 }, { tilt: 2, spine: 0, neck: 0, shrug: 4, reach: 4 }), (F, q) => rackH(F, 'R'), EL.rack);
      const knees = one(legs({ ...P, ps: 14, pt: 52 }, { tilt: 34, spine: 4, neck: -14, shrug: 0, reach: 4 }), midKnee, EL.hang);
      start = floor;
      K = [[floor, 300, .12], [lift, 200, .45], [ext, 200, .5], [punch, 140, .4], [catchO, 140, .4], [top, 500, .6], [top, 400, .12], [down, 520, .6], [knees, 420, .5], [floor, 360, .5]];
      const A0 = keyAnim(start, K);
      const at_ = t => { const q = A0.at(t), { J } = pose(q); return { ...q, barDir: { R: acrossFist(J, 'R', [-.4, 0, 1]), L: [0, 0, 1] } }; };
      return { view: 'front', up: 'a', rest: 'a', cam: [-52, 8], side: [-90, 4], one: true, at: at_, beat: A0.beat, gear: (q, F, cam) => GR.dumbbell(cam, q.hands.R, M.dbAxis(F, q, 'R'), 'R') };
    }
    const rack = pose2(legs({ ...P, ps: 3, pt: 86 }, { tilt: 0, spine: 0, neck: -2, shrug: 4, reach: 6 }), 'rack');
    const over = pose2(legs({ ...P, ps: 2, pt: 88 }, { tilt: 1, spine: 1, neck: 4, shrug: 8, reach: 0 }), 'over');
    if (w('thruster')) {
      const sq = pose2(legs({ ...P, ps: 34, pt: -6 }, { tilt: 16, spine: 6, neck: -12, shrug: 4, reach: 8 }), 'rack');
      const drive = pose2(legs({ ...P, ps: 2, pt: 90, heel: 12 }, { tilt: 0, spine: 0, neck: -2, shrug: 6, reach: 4 }), 'rack');
      start = rack;
      K = [[sq, 700, .7], [sq, 120, .1], [drive, 420, .6], [over, 300, .6], [over, 300, .1], [rack, 520, .6], [rack, 200, .1]];
    }
    else {
      /* la cargada y envión: colgando, bisagra con las mancuernas en las rodillas, salto y a los hombros en media sentadilla;
         de pie, flexión corta y empujón arriba; vuelve a los hombros y a colgar */
      const hang = pose2(legs({ ...P, ps: 3, pt: 86 }, { tilt: 2, spine: 0, neck: -2, shrug: 0, reach: 2 }), 'hang');
      const knee = pose2(legs({ ...P, ps: 12, pt: 56 }, { tilt: 30, spine: 4, neck: -12, shrug: 0, reach: 4 }), 'knee');
      const ext = pose2(legs({ ...P, ps: 0, pt: 90, heel: 22 }, { tilt: -6, spine: -2, neck: 2, shrug: 10, reach: 2 }), 'hang');
      const catchR = pose2(legs({ ...P, ps: 16, pt: 58 }, { tilt: 8, spine: 2, neck: -4, shrug: 4, reach: 8 }), 'rack');
      const dip = pose2(legs({ ...P, ps: 14, pt: 70 }, { tilt: 0, spine: 0, neck: -2, shrug: 4, reach: 6 }), 'rack');
      const drive = pose2(legs({ ...P, ps: 0, pt: 90, heel: 20 }, { tilt: -1, spine: -1, neck: -4, shrug: 8, reach: 4 }), 'rack');
      const catchO = pose2(legs({ ...P, ps: 16, pt: 58 }, { tilt: 2, spine: 1, neck: 3, shrug: 8, reach: 0 }), 'over');
      start = hang;
      K = [[knee, 380, .5], [ext, 220, .5], [catchR, 220, .6], [rack, 380, .5], [dip, 300, .35], [drive, 160, .4], [catchO, 220, .6], [over, 340, .5], [over, 300, .1], [rack, 520, .6], [hang, 560, .6], [hang, 200, .1]];
    }
    const A0 = keyAnim(start, K);
    /* (el asa, en el puño de través; la izquierda, cambiada de signo: el motor la pone como en un espejo. En los hombros, hacia
       fuera y adelante) */
    const at_ = t => {
      const q = A0.at(t), { J, F } = pose(q), r = clamp((q.hands.L[1] - at(F.thorax, [0, 40, 0])[1]) / 40, 0, 1) * clamp((at(F.thorax, [0, 150, 0])[1] - q.hands.L[1]) / 30, 0, 1);
      return { ...q, barDir: { L: mul(acrossFist(J, 'L', norm(mix([0, 0, 1], RACK_A, r))), -1), R: acrossFist(J, 'R', norm(mix([0, 0, 1], [-RACK_A[0], 0, 1], r))) } };
    };
    return { view: 'front', up: 'a', rest: 'a', cam: [-44, 8], side: [-90, 4], at: at_, beat: A0.beat, gear: (q, F, cam) => ['L', 'R'].flatMap(s2 => GR.dumbbell(cam, q.hands[s2], M.dbAxis(F, q, s2), s2)) };
  };

  /* ════ kettlebell ════ */
  /* la kettlebell de estos ejercicios (16 kg: la bola, de radio 18) y lo que va del centro del puño al de la bola cuando
     cuelga del asa */
  const KB_R = 18, KB_D = 27;
  /* (los pies algo más abiertos que la cadera y girados hacia fuera, y las rodillas con ellos: entre los muslos queda hueco
     para que pase la bola) */
  const SW_P = { w: 38, toe: 24 };
  /* la bola fuera del brazo que la lleva: si se mete en el antebrazo o en el brazo (al dar la vuelta sobre la mano, al subir
     al rack o al bajar de él), se aparta de ellos lo justo, sin soltarse del asa (a la misma distancia del puño) */
  const kbClear = (J, s, H, B, R = KB_R) => {
    const d0 = len(sub(B, H));
    for (let it = 0; it < 4; it++) {
      /* (con el grosor del dibujo: el hombro y el bíceps abultan más que el antebrazo) */
      for (const [a, b, rr] of [[J[s].sh, J[s].el, 16], [J[s].el, J[s].fist, 8.5]]) {
        const ab = sub(b, a), k = clamp(dot(sub(B, a), ab) / dot(ab, ab), 0, 1), p = add(a, mul(ab, k)), v = sub(B, p), d = len(v), need = R + rr;
        if (d < need && d > 1e-6) B = add(p, mul(v, need / d));
      }
      B = add(H, mul(norm(sub(B, H)), d0));
    }
    return B;
  };
  /* (el asa, de través en el puño: lo que se pide, quitándole lo que vaya a lo largo del antebrazo) */
  const acrossFist = (J, s, want) => { const f = norm(sub(J[s].fist, J[s].el)), v = sub(want, mul(f, dot(want, f))); return len(v) > .2 ? norm(v) : norm(cross(f, [0, 1, 0])); };
  /* el brazo estirado, girando alrededor del hombro en el plano del cuerpo: th, desde abajo (0) hacia delante (90) y arriba
     (180); negativo, hacia atrás. La mano a x del centro (las dos juntas en el asa, o una sola por el medio) */
  const armArc = (F, q, s, th, x, r = 139) => { const S = shoulder(F, s, q), dx = x - S[0], R = sqrt(max(1, r * r - dx * dx)), a = RAD(th); return [x, S[1] - R * cos(a), S[2] + R * sin(a)]; };
  /* (el codo, con el brazo estirado: hacia atrás abajo; hacia abajo con el brazo delante; hacia atrás arriba) */
  const elArc = th => { const a = RAD(clamp(th, -60, 175)); return norm([.35, -sin(a) * .9, -cos(a) - .25 * sin(a)]); };
  const kbell = f => {
    const w = x => has(f, x);
    if (w('swing')) return kbSwing(w('american'), w('one'));
    if (w('snatch')) return kbOne('snatch');
    if (w('press')) return kbOne('press');
    if (w('gobletclean')) return kbGoblet();
    if (w('clean')) return kbOne('clean');
    if (w('halo')) return kbHalo();
    if (w('windmill')) return kbWindmill();
    if (w('tgu')) return kbTgu();
    return null;
  };
  /* el Turkish get-up: con la kettlebell arriba en la mano derecha y el brazo vertical todo el tiempo. Tumbado boca arriba
     (la rodilla derecha doblada, con el pie plano; la pierna y el brazo izquierdos en el suelo, abiertos), sube al codo
     izquierdo, a la mano, levanta la cadera (puente), barre la pierna izquierda por debajo hasta apoyar la rodilla detrás de
     la mano, endereza el tronco (rodilla izquierda en el suelo, pie derecho delante) y se pone de pie; luego vuelve igual */
  const kbTgu = () => {
    const FR = [-24, 92], LH = [70, -14];
    /* la pierna izquierda estirada en el suelo (el talón apoyado, la punta arriba), abierta ang grados */
    const legFloor = (q, ang, hy = 9) => { const P = torso(q).pelvis, H = at(P, [20, 0, 0]), A = [H[0] + 171 * sin(RAD(ang)), hy + LEN.ankle * 0, H[2] + 171 * cos(RAD(ang))], d = norm(sub(A, H)); return C.legAt(H, d, d, 'L', [0, 1, 0], 0); };
    /* la rodilla izquierda en el suelo en K, la espinilla hacia atrás por el suelo (el empeine apoyado) */
    const legKneel = (q, K, back) => { const P = torso(q).pelvis, H = at(P, [20, 0, 0]); return C.legAt(H, sub(K, H), back, 'L', [0, 0, 1], 70); };
    const rFoot = (q) => ({ R: [abs(FR[0]), FR[1], 6, 0, 0] });
    const body = (o, lL) => {
      const q = { root: o.root, tilt: o.tilt, roll: o.roll || 0, yaw: o.yaw || 0, spine: o.spine || 0, neck: o.neck || 0, twist: o.twist || 0, shrug: 4, reach: 2 };
      const L0 = lL(q), feet = { L: L0.foot, ...rFoot(q) }, knee = { L: L0.knee, R: o.kR || [0, 1, .3] }, footDir = { L: L0.fd };
      const { F } = pose({ ...q, feet, knee, footDir, hands: ZERO, elbow: {} });
      /* (la derecha, arriba en vertical; la izquierda, apoyada o suelta) */
      const SR = shoulder(F, 'R', q), HR = add(SR, [0, 140, 0]);
      return { ...q, feet, knee, footDir, hands: { R: HR, L: o.hL(F, q) }, elbow: { R: [.3, 0, -1], L: o.eL || [.3, 0, -1] }, fist: { L: false }, palm: { L: [0, -1, 0] }, handDir: { L: o.hdL || norm([0, -.5, 15]) } };
    };
    const flatL = (x, z) => () => [x, 3.9, z];
    const P0 = body({ root: C.supine({ tilt: -90 }).root, tilt: -90, neck: 4, kR: [0, 1, .2], hL: flatL(110, -70), hdL: norm([.7, -.2, -.7]) }, q => legFloor(q, 28));
    const P1 = body({ root: [4, 22, -6], tilt: -58, roll: -14, spine: 6, neck: -4, kR: [0, 1, .2], hL: flatL(78, 6), eL: [.2, -1, -.2] }, q => legFloor(q, 28));
    const P2 = body({ root: [6, 22, -4], tilt: -28, roll: -12, spine: 4, neck: -6, kR: [0, 1, .3], hL: flatL(LH[0], LH[1]), eL: [.3, -.3, -1] }, q => legFloor(q, 30));
    const P3 = body({ root: [4, 72, 8], tilt: -46, roll: -10, spine: -6, neck: 0, kR: [0, 1, .5], hL: flatL(LH[0], LH[1]), eL: [.3, -.3, -1] }, q => legFloor(q, 30, 12));
    const P4 = body({ root: [6, 96, -16], tilt: 18, roll: 16, spine: 4, neck: -6, kR: [0, .5, 1], hL: flatL(LH[0], LH[1]), eL: [.3, 0, -1] }, q => legKneel(q, [18, 10, -58], [0, -.05, -1]));
    const free = (F, q) => add(shoulder(F, 'L', q), [40, -126, 6]);
    const P5 = body({ root: [0, 100, -14], tilt: 2, roll: 0, spine: 0, neck: 0, kR: [0, .2, 1], hL: free, eL: [.4, 0, -1], hdL: [0, -1, 0] }, q => legKneel(q, [16, 10, -60], [0, -.05, -1]));
    const stand = (() => { const st = legs({ w: 22, toe: 6, ps: 2, pt: 88 }, { tilt: 0, spine: 0, neck: 0, shrug: 4, reach: 2 }); st.zL = st.zR = FR[1]; st.rz += FR[1]; const q = qOf(st), { F } = pose({ ...q, hands: ZERO, elbow: {} }); return { ...q, hands: { R: add(shoulder(F, 'R', q), [0, 140, 0]), L: free(F, q) }, elbow: { R: [.3, 0, -1], L: [.4, 0, -1] }, fist: { L: false }, palm: { L: [-1, 0, 0] }, handDir: { L: [0, -1, 0] } }; })();
    const K = [[P0, 400, .2], [P1, 800, .6], [P2, 700, .5], [P3, 700, .5], [P4, 900, .7], [P5, 800, .5], [stand, 900, .6], [stand, 600, .15], [P5, 900, .6], [P4, 800, .5], [P3, 900, .7], [P2, 700, .5], [P1, 700, .5], [P0, 800, .6]];
    const A0 = keyAnim(P0, K);
    const at_ = t => {
      const q = A0.at(t), { J } = pose(q), H = q.hands.R;
      /* (la bola, sobre el antebrazo, del lado del dorso de la mano) */
      return { ...q, barDir: { R: acrossFist(J, 'R', [1, 0, 0]), L: [1, 0, 0] }, kbB: kbClear(J, 'R', H, add(H, [-10, -13, -16])) };
    };
    const gear = (q, F, cam) => GR.kettlebell(cam, q.kbB, q.hands.R, F.gripR.x, 'R', KB_R);
    return { view: 'front', up: 'a', rest: 'a', cam: [-40, 16], side: [-90, 6], feetOff: true, one: true, at: at_, gear, beat: A0.beat };
  };
  /* el windmill: la kettlebell arriba en la mano derecha, con el brazo bloqueado y vertical todo el rato (la bola sobre el
     antebrazo); los pies, separados y girados hacia la izquierda; la cadera sale hacia la derecha y atrás y el tronco baja
     hacia el pie izquierdo, con el pecho abierto hacia la kettlebell, mientras la mano izquierda baja por dentro de la pierna
     hasta el tobillo; la vista, arriba. Y vuelve a subir */
  const kbWindmill = () => {
    const feet = { wL: 30, wR: 30, toeL: 42, toeR: -38 };
    const top = { ...BASE, ...feet, ry: ROOT_Y - 2, rz: 0, tilt: 0, spine: 0, neck: 4, shrug: 4, reach: 0, twist: -10, bend: 0, yaw: 28, roll: 0, rx: 0, dn: 0 };
    const bot = { ...top, ry: ROOT_Y - 14, rz: -18, rx: -30, yaw: 60, tilt: 84, roll: -8, twist: -68, bend: 4, spine: 6, neck: 18, dn: 1 };
    const seq = sequence(top, [[top, 500, .12], [bot, 1500, 1], [bot, 500, .12], [top, 1300, 1]]);
    const at_ = t => {
      const s = seq.at(t), q0 = { ...qOf(s), root: [s.rx, s.ry, s.rz], yaw: s.yaw, roll: s.roll };
      /* (la rodilla izquierda, casi estirada; la derecha, algo flexionada: los pies están fijos y la cadera baja y sale) */
      const P0 = pose({ ...q0, hands: ZERO, elbow: {} }), F = P0.F, J = P0.J;
      const S = shoulder(F, 'R', q0), H = add(S, [0, 140, 0]);
      /* la izquierda: colgando junto al muslo arriba; al bajar, resbala por la pierna hasta donde llega
         el brazo (abajo del todo, la espinilla, cerca del tobillo). Por delante y algo por fuera: el hombro izquierdo queda por
         fuera de la pierna y el antebrazo no la cruza */
      const SL = shoulder(F, 'L', q0), leg = k => { const P = k < .5 ? mix(J.L.hip, J.L.knee, k * 2) : mix(J.L.knee, J.L.ankle, k * 2 - 1); return add(P, [5, 6, 18 - 4 * k]); };
      let slide = leg(0);
      for (let i = 1; i <= 24; i++) { const p = leg(min(.86, i / 24 * .86)); if (len(sub(p, SL)) < 141) slide = p; else break; }
      const Hl = mix(add(SL, [10, -138, 6]), slide, s.dn);
      const q = { ...q0, hands: { R: H, L: Hl }, elbow: { R: [.3, 0, -1], L: [.3, .2, -1] }, fist: { L: false }, palm: { L: [-1, 0, 0] } };
      const { J: J2 } = pose(q);
      /* (la bola, sobre el antebrazo, por detrás de la muñeca) */
      const fo = norm(sub(J2.R.fist, J2.R.el)), bk = norm(cross(fo, F.thorax.x));
      return { ...q, barDir: { R: acrossFist(J2, 'R', F.thorax.x), L: [1, 0, 0] }, kbB: kbClear(J2, 'R', H, add(add(H, mul(fo, -12)), mul(bk, -17))) };
    };
    const gear = (q, F, cam) => GR.kettlebell(cam, q.kbB, q.hands.R, F.gripR.x, 'R', KB_R);
    return { view: 'front', up: 'a', rest: 'a', cam: [-14, 8], side: [-70, 4], one: true, at: at_, gear, beat: seq.beat, keyT: seq.keyT };
  };
  /* la kettlebell agarrada por los cuernos (los lados del asa) con las dos manos, derecha (la bola abajo): las manos, a los
     lados del centro del asa (H), a lo largo de t */
  const HORN = 12;
  const horns = (H, t) => ({ L: add(H, mul(t, HORN)), R: add(H, mul(t, -HORN)) });
  /* la cargada goblet: la kettlebell en el suelo entre los pies, agarrada por los cuernos en cuclillas; se levanta pegada al
     cuerpo (los codos salen hacia fuera y arriba) y se recibe delante del pecho, con los codos abajo y la bola contra el
     esternón; luego vuelve al suelo */
  const kbGoblet = () => {
    /* (las rodillas, abiertas: los brazos bajan por dentro de ellas hasta el asa) */
    const P = { w: 42, toe: 28 }, FL = [0, KB_R, 16];
    const G0 = { gF: 0, gH: 0, gU: 0, gC: 0 };
    const floor = legs({ ...P, ps: 26, pt: 4 }, { tilt: 40, spine: 10, neck: -16, shrug: 0, reach: 6, ...G0, gF: 1 });
    const mid = legs({ ...P, ps: 10, pt: 62 }, { tilt: 16, spine: 3, neck: -6, shrug: 2, reach: 4, ...G0, gH: 1 });
    const up = legs({ ...P, ps: 0, pt: 90, heel: 10 }, { tilt: -4, spine: -2, neck: 0, shrug: 8, reach: 2, ...G0, gU: 1 });
    const hold = legs({ ...P, ps: 3, pt: 86 }, { tilt: -2, spine: -1, neck: -2, shrug: 3, reach: 4, ...G0, gC: 1 });
    const seq = sequence(floor, [[floor, 300, .1], [mid, 420, .7], [up, 220, .6], [hold, 220, .6], [hold, 600, .15], [mid, 600, .8], [floor, 600, .8]]);
    const at_ = t => {
      const s = seq.at(t), q0 = qOf(s), { F } = pose({ ...q0, hands: ZERO, elbow: {} }), tot = s.gF + s.gH + s.gU + s.gC || 1;
      /* el centro del asa: sobre la bola en el suelo; colgando entre las piernas con los brazos estirados; a la altura del
         pecho (los codos arriba y por fuera); bajo la barbilla, con la bola delante del esternón */
      const Hf = add(FL, [0, KB_D, 0]);
      const Hh = (() => { const S = mix(shoulder(F, 'L', q0), shoulder(F, 'R', q0), .5), r = sqrt(139 ** 2 - 39 ** 2), z = S[2] + 30; return [0, S[1] - sqrt(max(0, r * r - 900)), z]; })();
      const Hu = at(F.thorax, [0, 66, 42]), Hc = at(F.thorax, [0, 92, 44]);
      let H = add(add(add(mul(Hf, s.gF / tot), mul(Hh, s.gH / tot)), mul(Hu, s.gU / tot)), mul(Hc, s.gC / tot));
      /* (al alcance de los brazos, solo de arriba abajo y de delante a atrás: al subir deprisa, el asa mezclada se quedaba lejos) */
      { const S = shoulder(F, 'L', q0), RM = LEN.upper + LEN.fore + LEN.grip - .3, dx = HORN - S[0], m = sqrt(max(1, RM * RM - dx * dx)), v = [0, H[1] - S[1], H[2] - S[2]], d = len(v); if (d > m) H = [H[0], S[1] + v[1] * m / d, S[2] + v[2] * m / d]; }
      /* (al recibirla, los codos abajo y algo abiertos: los antebrazos, a los lados de la bola) */
      const el = norm(add(add(mul([.3, 0, -1], (s.gF + s.gH) / tot), mul([1, .5, -.3], s.gU / tot)), mul([.3, -1, .2], s.gC / tot)));
      const q = { ...q0, hands: horns(H, [1, 0, 0]), elbow: both(() => el), kbH: H };
      const { J } = pose(q);
      /* (los cuernos van de arriba abajo; en el puño, de través a él. El eje del izquierdo, cambiado de signo: así el motor no
         lo da la vuelta solo en las posturas simétricas) */
      return { ...q, barDir: { L: mul(acrossFist(J, 'L', [0, 1, 0]), -1), R: acrossFist(J, 'R', [0, 1, 0]) } };
    };
    /* (la bola, colgando bajo el asa; abajo, en el suelo) */
    /* (sujeta delante del pecho, la bola algo adelantada: los antebrazos la abrazan por los lados) */
    const gear = (q, F, cam) => GR.kettlebell(cam, add(q.kbH, [0, -KB_D, 4]), q.kbH, [1, 0, 0], null, KB_R);
    return { view: 'front', up: 'a', rest: 'a', cam: [-40, 8], side: [-88, 4], at: at_, gear, beat: seq.beat, keyT: seq.keyT };
  };
  /* el halo: la kettlebell boca abajo (la bola arriba), agarrada por los cuernos, da la vuelta alrededor de la cabeza: delante
     de la cara, junto a la oreja derecha, detrás de la nuca y por la izquierda; luego al revés. Los codos, abajo delante y
     arriba al pasar por detrás; el tronco, quieto */
  const kbHalo = () => {
    const base = legs({ w: 24, toe: 10, ps: 3, pt: 86 }, { tilt: 0, spine: 0, neck: 0, shrug: 4, reach: 2 });
    const q0 = qOf(base), { F } = pose({ ...q0, hands: ZERO, elbow: {} });
    const Hd = at(F.thorax, [0, 128, 2]);
    /* el codo derecho (en el mundo) con la kettlebell delante (0°), junto a la oreja derecha (90°), detrás de la nuca (180°) y
       junto a la oreja izquierda (270°): abajo y abierto; arriba y afuera; arriba y hacia delante; cruzando por delante de la
       cara. Entre medias, una curva suave que pasa por los cuatro (una serie de Fourier corta); el izquierdo, como en un espejo */
    const EF = [[-.6, -1, .1], [-.8, .5, .2], [-.5, .6, .9], [-.1, -.6, .8]];
    const four = ph => [0, 1, 2].map(i => { const [f0, f1, f2, f3] = EF.map(v => v[i]); return (f0 + f1 + f2 + f3) / 4 + (f0 - f2) / 2 * cos(ph) + (f1 - f3) / 2 * sin(ph) + (f0 - f1 + f2 - f3) / 4 * cos(2 * ph); });
    const at_ = t => {
      /* (una vuelta en un sentido y otra en el otro) */
      const u = t < .5 ? t * 2 : 2 - t * 2, ph = 2 * PI * ease(u);
      const rad = [-sin(ph), 0, cos(ph)];
      /* (la bola, a la altura de la frente y algo por delante del centro de la cabeza; el asa, debajo, a la altura de la boca) */
      const B = add(add(Hd, mul(rad, 38)), [0, 6, 6]), H = add(B, [0, -KB_D, 0]);
      /* (las manos no se cruzan: la izquierda, a la izquierda del asa delante y detrás de la cabeza, y delante (o detrás) al
         pasar por los lados) */
      const h = mul(norm([abs(cos(ph)), 0, sin(ph)]), HORN);
      const back = (1 - cos(ph)) / 2;
      const eR = norm(four(ph)), eLm = norm(four(-ph)), eL = [-eLm[0], eLm[1], eLm[2]];
      const q = { ...q0, hands: { L: add(H, h), R: sub(H, h) }, elbow: { L: eL, R: [-eR[0], eR[1], eR[2]] }, kbH: H, kbB: B, neck: -4 * back };
      const P2 = pose(q);
      /* (los cuernos, en el puño de través. El eje del izquierdo, cambiado de signo: así el motor no lo da la vuelta solo en las
         posturas simétricas) */
      return { ...q, barDir: { L: mul(acrossFist(P2.J, 'L', [0, 1, 0]), -1), R: acrossFist(P2.J, 'R', [0, 1, 0]) } };
    };
    const gear = (q, F, cam) => GR.kettlebell(cam, q.kbB, q.kbH, norm(sub(q.hands.L, q.hands.R)), null, KB_R);
    return { view: 'front', up: 'a', rest: 'a', cam: [-34, 10], side: [-88, 4], at: at_, gear, beat: cycle(5200) };
  };
  /* (lo de abajo del swing a una mano: el mismo arco y las mismas posturas) */
  const swHike = (o = {}) => legs({ ...SW_P, ps: 11, pt: 46 }, { tilt: 60, spine: 4, neck: -34, shrug: 0, reach: 2, th: -31, ...o });
  const swHinge = (o = {}) => legs({ ...SW_P, ps: 7, pt: 68 }, { tilt: 34, spine: 2, neck: -18, shrug: 0, reach: 3, th: 2, ...o });
  const swPass = (o = {}) => legs({ ...SW_P, ps: 2, pt: 86 }, { tilt: 6, spine: 1, neck: -4, shrug: 0, reach: 4, th: 12, ...o });
  /* la kettlebell a una mano (la derecha): la cargada (del swing, pegada al cuerpo, al rack: la bola apoyada por fuera del
     antebrazo), la cargada y press (del rack, arriba con el brazo bloqueado, y vuelta) y la arrancada (del swing, de un tirón
     hasta arriba, donde la bola da la vuelta sobre la mano y cae sobre el antebrazo). Al bajar, la bola cae por delante y
     vuelve a pasar entre las piernas. Lo que lleva la mano: el arco del swing (wA, la bola en la línea del brazo), el tirón
     pegado al cuerpo (wP, la bola colgando), el rack (wR) y arriba (wO, la bola sobre el antebrazo) */
  const kbOne = kind => {
    const W0 = { wA: 0, wP: 0, wR: 0, wO: 0 };
    const hike = swHike({ ...W0, wA: 1 }), hinge = swHinge({ ...W0, wA: 1 }), pass = swPass({ ...W0, wA: 1 });
    const stand = (o = {}) => legs({ ...SW_P, ps: 2, pt: 88 }, { tilt: -2, spine: -1, neck: -2, shrug: 2, reach: 4, th: 0, ...W0, ...o });
    /* (el tirón: de pie y de puntillas, la mano a la altura del ombligo y el codo atrás y arriba; en la arrancada, sigue hasta
       la cara) */
    const pull = legs({ ...SW_P, ps: 0, pt: 90, heel: 12 }, { tilt: -4, spine: -2, neck: 0, shrug: 8, reach: 2, th: 0, ...W0, wP: 1 });
    const rack = stand({ wR: 1 }), over = stand({ wO: 1, shrug: 6, reach: 0, neck: 2 });
    /* (la caída: la bola sale del rack (o de arriba) por delante, en arco, y vuelve entre las piernas) */
    const fall = th => legs({ ...SW_P, ps: 2, pt: 88 }, { tilt: 1, spine: 0, neck: -3, shrug: 0, reach: 4, th, ...W0, wA: 1 });
    let segs;
    if (kind == 'snatch') {
      const fly = legs({ ...SW_P, ps: 0, pt: 90, heel: 14 }, { tilt: -6, spine: -3, neck: 4, shrug: 8, reach: 2, th: 112, ...W0, wA: 1 });
      const punch = legs({ ...SW_P, ps: 4, pt: 82 }, { tilt: -2, spine: -1, neck: 3, shrug: 8, reach: 1, th: 0, ...W0, wP: .35, wO: .65 });
      segs = [[hinge, 140, .45], [pass, 110, .35], [fly, 230, .8], [punch, 120, .4], [over, 160, .4], [over, 600, .15], [fall(150), 260, .6], [fall(70), 200, .6], [pass, 160, .5], [hinge, 120, .45], [hike, 140, .45]];
    }
    else {
      segs = [[hinge, 140, .45], [pass, 110, .35], [pull, 170, .5], [rack, 200, .55], [rack, 500, .15]];
      if (kind == 'press') segs.push([stand({ wR: .55, wO: .45, reach: 2 }), 380, .45], [over, 380, .45], [over, 300, .12], [stand({ wR: .55, wO: .45, reach: 2 }), 360, .45], [rack, 360, .45], [rack, 250, .12]);
      segs.push([fall(60), 300, .6], [pass, 160, .45], [hinge, 120, .45], [hike, 140, .45]);
    }
    const seq = sequence(hike, segs);
    const at_ = t => {
      const s = seq.at(t), q0 = qOf(s), { F } = pose({ ...q0, hands: ZERO, elbow: {} }), tot = s.wA + s.wP + s.wR + s.wO || 1;
      const S = shoulder(F, 'R', q0), r = rackKb(F, 'R');
      /* la mano: en el arco (por el medio), pegada al cuerpo, en el rack o arriba, con el brazo bloqueado sobre el hombro */
      /* (pegada al cuerpo, pero por delante de él: la bola cuelga delante de la cadera derecha, sin meterse en la tripa) */
      const Ha = armArc(F, q0, 'R', s.th, 0), Hp = at(F.thorax, kind == 'snatch' ? [-18, 112, 38] : [-22, 44, 44]), Ho = armArc(F, q0, 'R', 178, -52, 141);
      const H = add(add(add(mul(Ha, s.wA / tot), mul(Hp, s.wP / tot)), mul(r.hand, s.wR / tot)), mul(Ho, s.wO / tot));
      /* la bola: en la línea del brazo (la lleva la inercia), colgando bajo la mano, en el rack o sobre el antebrazo, arriba */
      const Ba = add(Ha, mul(norm(sub(Ha, S)), KB_D)), Bp = add(Hp, [0, -KB_D, 4]), Bo = add(Ho, [-9, -14, -17]);
      const Bk = add(add(add(mul(sub(Ba, Ha), s.wA / tot), mul(sub(Bp, Hp), s.wP / tot)), mul(sub(r.ball, r.hand), s.wR / tot)), mul(sub(Bo, Ho), s.wO / tot));
      /* el codo: el del arco, atrás y arriba en el tirón, abajo en el rack y atrás arriba */
      /* (en el tirón, el codo sale hacia fuera y arriba, no hacia atrás: el antebrazo, por fuera del tronco) */
      const el = norm(add(add(add(mul(elArc(s.th), s.wA / tot), mul([1, .3, -.5], s.wP / tot)), mul(r.elbow, s.wR / tot)), mul([.3, 0, -1], s.wO / tot)));
      /* la otra mano, suelta: sigue el gesto más corta y por fuera; arriba, algo separada del cuerpo */
      const thL = s.th * .55 * s.wA / tot;
      const q = { ...q0, hands: { R: H, L: armArc(F, q0, 'L', thL, 62, 136) }, elbow: { R: el, L: elArc(thL) }, fist: { L: false }, palm: { L: [-1, 0, .2] } };
      const { J } = pose(q);
      return { ...q, barDir: { R: acrossFist(J, 'R', norm(mix([1, 0, 0], r.bd, (s.wR + s.wO) / tot))), L: [1, 0, 0] }, kbB: kbClear(J, 'R', H, add(H, Bk)) };
    };
    const gear = (q, F, cam) => GR.kettlebell(cam, q.kbB, q.hands.R, F.gripR.x, 'R', KB_R);
    return { view: 'front', up: 'a', rest: 'a', cam: [-52, 6], side: [-90, 4], one: true, at: at_, gear, beat: seq.beat, keyT: seq.keyT };
  };
  /* el swing: la cadera atrás con la kettlebell pasando entre los muslos (por encima de las rodillas), y el golpe de cadera
     que la lanza: los brazos, estirados, solo la acompañan hasta la altura de los hombros (ruso) o hasta arriba, con la bola
     sobre la cabeza (americano). A una mano: la otra, suelta, acompaña a un lado */
  const kbSwing = (amer, one) => {
    const P = SW_P;
    /* las posturas: arriba (de pie, erguido), al pasar (los antebrazos contra la cadera, aún de pie), la bisagra (la cadera ya
       atrás y las manos aún delante de los muslos: la bola entra entre las piernas por abajo, donde hay hueco) y abajo (la
       cadera atrás, el tronco inclinado, las rodillas algo flexionadas y la cabeza en línea) */
    const top = legs({ ...P, ps: 0, pt: 90 }, { tilt: amer ? -5 : -3, spine: amer ? -3 : -1, neck: amer ? 8 : 0, shrug: amer ? 8 : 2, reach: amer ? 0 : 4, th: amer ? 176 : 88 });
    const pass = legs({ ...P, ps: 2, pt: 86 }, { tilt: 6, spine: 1, neck: -4, shrug: 0, reach: 4, th: 12 });
    const hinge = legs({ ...P, ps: 7, pt: 68 }, { tilt: 34, spine: 2, neck: -18, shrug: 0, reach: 3, th: 2 });
    const hike = legs({ ...P, ps: 11, pt: 46 }, { tilt: 60, spine: 4, neck: -34, shrug: 0, reach: 2, th: -34 });
    const seq = sequence(top, [[top, 160, .12], [pass, 360, .75], [hinge, 120, .35], [hike, 140, .45], [hinge, 140, .45], [pass, 110, .35], [top, 330, .8]]);
    const at_ = t => {
      const s = seq.at(t), q0 = qOf(s), { F } = pose({ ...q0, hands: ZERO, elbow: {} });
      /* (respecto del tronco: abajo, los brazos siguen al tronco inclinado) */
      const th = s.th;
      if (!one) {
        const hands = { L: armArc(F, q0, 'L', th, 5), R: armArc(F, q0, 'R', th, -5) };
        return { ...q0, hands, elbow: both(() => elArc(th)), barDir: [1, 0, 0], kbTh: th };
      }
      /* a una mano: la derecha, por el medio; la izquierda, abierta, sigue el gesto más corta y por fuera */
      const thL = th * .55;
      return { ...q0, hands: { R: armArc(F, q0, 'R', th, 0), L: armArc(F, q0, 'L', thL, 62, 136) }, elbow: { R: elArc(th), L: elArc(thL) }, barDir: [1, 0, 0], fist: { L: false }, palm: { L: [-1, 0, .2] }, kbTh: th };
    };
    const gear = (q, F, cam) => {
      /* la bola, en la línea de los brazos, más allá de las manos (la lleva la inercia) */
      const H = one ? q.hands.R : mix(q.hands.L, q.hands.R, .5), Sm = one ? shoulder(F, 'R', q) : mix(shoulder(F, 'L', q), shoulder(F, 'R', q), .5);
      const d = norm(sub(H, Sm));
      return GR.kettlebell(cam, add(H, mul(d, KB_D)), H, [1, 0, 0], one ? 'R' : null, KB_R);
    };
    return { view: 'front', up: 'a', rest: 'a', cam: [-64, 6], side: [-90, 4], one, at: at_, gear, beat: seq.beat, keyT: seq.keyT };
  };

  /* ════ andar en el sitio ════ */
  /* los pies al andar, como en una cinta: la figura no avanza y el suelo pasa por debajo. Cada pie apoya (st: la parte de la
     vuelta que está en el suelo) yendo hacia atrás bajo la cadera, de z0 + S/2 a z0 - S/2, a la velocidad del suelo: primero el
     talón (la punta algo levantada, hs grados), luego plano y al final se despega por la punta (el talón sube, to grados); en el
     aire vuelve adelante levantando el pie (lift). Los dos pies, a media vuelta el uno del otro. back: andando hacia atrás (lo
     mismo, al revés en el tiempo). Devuelve los pies (como van en la postura), las rodillas y los tobillos */
  const HEELP = A => add(A, [0, -19.5, -5]), BALLP = A => add(A, [0, -19.8, 25]);
  const footPose = (x, zA, p) => p < 0 ? C.heelAnkle(HEELP([x, LEN.ankle, zA]), p) : p > 0 ? C.toeAnkle(BALLP([x, LEN.ankle, zA]), p) : [x, LEN.ankle, zA];
  const gait = (t, o = {}) => {
    const S = o.S ?? 110, w = o.w ?? 20, toe = o.toe ?? 6, st = o.st ?? .62, lift = o.lift ?? 12, z0 = o.z0 ?? 0, hs = o.hs ?? 12, to = o.to ?? 32;
    const feet = {}, knee = {}, ank = {};
    for (const [s, ph] of [['L', 0], ['R', .5]]) {
      let u = ((t + ph) % 1 + 1) % 1;
      if (o.back) u = (1 - u) % 1;
      const x = s == 'L' ? w : -w, zA = v => z0 + S / 2 - S * v;
      const pSt = v => v < .14 ? -hs * (1 - mj(v / .14)) : v > .6 ? to * mj((v - .6) / .4) : 0;
      let A, pp;
      if (u < st) { const v = u / st; pp = pSt(v); A = footPose(x, zA(v), pp); }
      else {
        const v = (u - st) / (1 - st), a = footPose(x, zA(1), to), b = footPose(x, zA(0), -hs);
        pp = spl(v, [[0, to], [.45, 6], [1, -hs]]); A = add(mix(a, b, mj(v)), [0, lift * sin(PI * v), 0]);
      }
      feet[s] = [abs(A[0]), A[2], toe, A[1] - LEN.ankle, pp]; knee[s] = [sin(RAD(toe)), 0, cos(RAD(toe))]; ank[s] = A;
    }
    return { feet, knee, ank };
  };
  /* la cadera más alta que dejan las dos piernas (casi estiradas) con los tobillos donde están, sin pasar de top */
  const hipOver = (ank, top, z = 0) => C.capRoot([0, top, z], [[ank.L, 20], [ank.R, -20]])[1];

  /* ════ acarreos ════ */
  /* la mano s colgando junto al muslo con lo que lleve (una mancuerna, una kettlebell, los discos), el brazo estirado y algo
     separado; sw: lo que se balancea hacia delante */
  const hangHand = (F, q, s, out = 24, sw = 0) => add(shoulder(F, s, q), sd(s, [out, -143, 3 + sw]));
  /* la kettlebell en la posición de rack: la mano delante de lo alto del pecho, el codo abajo, y la bola apoyada por fuera del
     antebrazo */
  /* (el puño, a la altura de la clavícula y cerca de la línea media; el codo, metido junto a las costillas; la bola descansa por
     fuera del antebrazo, en la V entre el antebrazo y el bíceps) */
  const rackKb = (F, s) => ({ hand: at(F.thorax, sd(s, [10, 80, 40])), elbow: [-.45, -1, .55], bd: sd(s, [.55, .1, .83]), ball: at(F.thorax, sd(s, [42, 65, 38])) });
  /* el saco (de unos 60 cm por 27): su medio largo y su radio; dónde va abrazado (en el marco del tórax) y al hombro */
  const BAG_L = 56, BAG_R = 27, BAG_HUG = [0, 42, 58], BAG_SH = [-38, 112, 2];
  const carry = f => {
    const w = x => has(f, x), walk = w('walk'), db = w('db'), kb = w('kb'), bag = w('bag'), pinch = w('pinch'), rack = w('rack'), hug = w('hug'), onSh = w('shoulder');
    if (w('clean')) return bagLift(f);
    /* andando: pasos algo más cortos con carga (y más con el saco abrazado o al hombro), el tronco recto y algo adelantado */
    const S = hug || onSh ? 92 : rack ? 100 : 104, T = hug || onSh ? 1300 : 1150;
    const at_ = t => {
      const g = walk ? gait(t, { S, w: 21, toe: 6, lift: 11 }) : null;
      const top = ROOT_Y + 1 - (pinch ? 0 : 0);
      /* parado (el granjero quieto o la pinza): de pie, los pies al ancho de la cadera; respira */
      const br = walk ? 0 : sin(2 * PI * t);
      const base = walk ? { feet: g.feet, knee: g.knee } : { feet: both(() => [22, 0, 8]), knee: both(() => [.12, 0, 1]) };
      const ry = walk ? hipOver(g.ank, top) : ROOT_Y + .4 * br;
      /* (el tronco, de lado a lado con cada paso: una pizca, hacia la pierna que apoya; y algo inclinado hacia lo que se lleva) */
      const ph = 2 * PI * t, roll = walk ? (hug ? 1.5 : 2.5) * sin(ph) - (onSh ? 3 : 0) : 0;
      const q0 = { ...base, root: [walk ? 1.2 * sin(ph) : 0, ry, 0], tilt: hug ? -4 : 3, spine: hug ? -3 : 0, neck: hug ? 4 : -2, shrug: db || kb || pinch ? (rack ? 2 : -3) + .6 * br : 2, roll, twist: walk ? 3 * sin(ph) : 0 };
      const { F } = pose({ ...q0, hands: ZERO, elbow: {} });
      /* los brazos: colgando con la carga (y balanceándose un poco al andar), en rack, abrazando el saco o con el saco al hombro */
      const swing = s => walk ? (s == 'L' ? 1 : -1) * 5 * sin(ph) : 0;
      if (rack) {
        const o = { hands: {}, elbow: {}, barDir: {}, kbB: {} };
        for (const s of ['L', 'R']) { const r = rackKb(F, s); o.hands[s] = r.hand; o.elbow[s] = r.elbow; o.barDir[s] = r.bd; o.kbB[s] = r.ball; }
        const { J } = pose({ ...q0, ...o });
        for (const s of ['L', 'R']) o.kbB[s] = kbClear(J, s, o.hands[s], o.kbB[s], 20);
        return { ...q0, ...o };
      }
      if (hug) {
        /* el saco abrazado contra el pecho, de lado a lado: los antebrazos por debajo y por delante, las manos agarradas una a la
           otra por delante */
        /* (el saco, grande, contra el pecho; los brazos lo rodean por delante: los antebrazos, de través sobre su cara de delante,
           con las manos agarradas una a la otra en medio, y los codos en sus extremos) */
        const c = at(F.thorax, BAG_HUG);
        return { ...q0, bagC: c, hands: { L: at(F.thorax, [9, 40, 86]), R: at(F.thorax, [-9, 38, 86]) }, elbow: both(() => [1, -.2, .35]), barDir: both(() => [0, 1, 0]) };
      }
      if (onSh) {
        /* el saco sobre el hombro derecho, a lo largo (de delante a atrás): la mano derecha lo sujeta por delante; el brazo
           izquierdo, suelto, se balancea */
        /* (el saco, sobre lo alto del hombro, por fuera del cuello; la mano derecha lo sujeta por debajo de su extremo de delante) */
        const c = at(F.thorax, BAG_SH), fl = C.armTo(F, q0, 'L', [.1, -1, .18 * sin(ph)], 14, [0, 0, 1]);
        return { ...q0, bagC: c, hands: { R: at(F.thorax, [-50, 98, 40]), L: fl.H }, elbow: { R: [.3, -1, .5], L: fl.hint }, barDir: { R: [1, 0, 0], L: [1, 0, 0] }, fist: { L: false }, palm: { L: [-1, 0, .2] } };
      }
      /* (los discos, en pinza: la mano abierta, con el pulgar por un lado y los dedos por el otro del canto de arriba) */
      const o = { hands: {}, elbow: {}, barDir: {} };
      for (const s of ['L', 'R']) { o.hands[s] = hangHand(F, q0, s, pinch ? 26 : 25, swing(s)); o.elbow[s] = [.25, 0, -1]; o.barDir[s] = s == 'L' ? [0, 0, -1] : [0, 0, 1]; }
      if (pinch) return { ...q0, ...o, fist: false, palm: { L: [-1, 0, 0], R: [-1, 0, 0] }, handDir: both(() => [0, -1, 0]) };
      return { ...q0, ...o };
    };
    const gear = (q, F, cam) => {
      if (hug) return GR.sandbag(cam, q.bagC, F.thorax.x, BAG_L, BAG_R);
      if (onSh) return GR.sandbag(cam, q.bagC, shAx(F), BAG_L, BAG_R);
      if (rack) return ['L', 'R'].flatMap(s => GR.kettlebell(cam, q.kbB[s], q.hands[s], F['grip' + s].x, s));
      if (pinch) return ['L', 'R'].flatMap(s => [-3, 3].map(dx => GR.disc(cam, add(q.hands[s], [sd(s, [dx, 0, 0])[0], -24, 0]), [1, 0, 0], 29, 4)));
      if (kb) return ['L', 'R'].flatMap(s => GR.kettlebell(cam, add(q.hands[s], [0, -25, 0]), q.hands[s], F['grip' + s].x, s));
      return ['L', 'R'].flatMap(s => GR.dumbbell(cam, q.hands[s], M.dbAxis(F, q, s), s));
    };
    /* (andando, los brazos no van como en un espejo: el tronco gira y se ladea con cada paso; con el saco al hombro, tampoco) */
    const ex = { view: 'front', up: 'a', rest: 'a', cam: walk ? [-58, 8] : [-30, 8], side: walk ? [-88, 4] : undefined, feetOff: walk, one: walk || onSh, at: at_, gear, beat: cycle(walk ? T : 4000) };
    return ex;
  };
  /* el saco (o la mochila) del suelo: la cargada al pecho y, por encima del hombro, lanzado detrás */
  /* (la mochila: una caja blanda de 52 de ancho, 76 de alto y 32 de fondo, con su asa arriba) */
  const PACK = [26, 38, 16], HANDLE = 9;
  /* la mochila: el cuerpo (una caja), el asa de arriba (la agarran los puños) y las dos hombreras por la cara
     de atrás, la que va hacia quien la levanta. c: su centro; up: hacia arriba; hands: quién agarra el asa */
  const PACK_COL = ['#2b3040', '#68708c'];
  const packGear = (cam, c, up, hands) => {
    const y = norm(up), x = norm(perp([1, 0, 0], y)), z = cross(x, y), out = [];
    out.push(GR.obox(cam, c, [x, y], PACK, PACK_COL));
    /* (la tapa de arriba, algo abombada, y el bolsillo de delante) */
    out.push(GR.obox(cam, add(c, mul(y, PACK[1] - 6)), [x, y], [PACK[0] - 2, 6, PACK[2] + 1.5], ['#323849', '#68708c']));
    out.push(GR.obox(cam, add(add(c, mul(z, PACK[2] + 3)), mul(y, -12)), [x, y], [PACK[0] - 7, 16, 3], ['#30364a', '#68708c']));
    /* el asa: de un lado al otro de la tapa, por encima */
    const top = add(c, mul(y, PACK[1])), a = add(top, mul(x, -12)), b = add(top, mul(x, 12)), ha = add(a, add(mul(y, HANDLE), mul(x, 4))), hb = add(b, add(mul(y, HANDLE), mul(x, -4)));
    out.push(...GR.tube(cam, a, ha, 3.2, ['#3a4058', '#0a0b10'], 1), ...GR.tube(cam, hb, b, 3.2, ['#3a4058', '#0a0b10'], 1));
    const grip = GR.tube(cam, ha, hb, 3.6, ['#3a4058', '#0a0b10'], 2);
    grip.forEach((it, i) => { it.hand = hands ? (i == 0 ? 'R' : 'L') : undefined; });
    out.push(...grip);
    /* las hombreras, por la cara de atrás: de arriba abajo, algo separadas de ella */
    for (const k of [-1, 1]) { const p0 = add(add(c, mul(x, k * 13)), mul(y, PACK[1] - 4)), p3 = add(add(c, mul(x, k * 15)), mul(y, -PACK[1] + 6)), bz = mul(z, -PACK[2] - 2.5); out.push(...GR.strap(cam, [add(p0, mul(z, -PACK[2])), add(add(p0, bz), mul(y, -14)), add(add(p3, bz), mul(y, 22)), add(p3, mul(z, -PACK[2]))], 5, ['#262a38', '#5a6280'])); }
    return out;
  };
  /* la cargada de la mochila: del suelo, agarrada por el asa con las dos manos, se lleva arriba pegada al cuerpo (un tirón
     alto, con los codos arriba y por fuera) y se recibe delante del pecho, con los puños bajo la barbilla y los codos abajo,
     como un goblet; luego vuelve al suelo */
  const packLift = () => {
    const P = { w: 24, toe: 10 }, ZP = 38;
    /* la mochila, de pie delante de los pies (un poco inclinada hacia ellos: es blanda) */
    const FLOOR = [0, PACK[1] + .6, ZP], UPF = norm([0, 1, -.06]);
    const M0 = { mF: 0, mK: 0, mU: 0, mC: 0 };
    const floor = legs({ ...P, ps: 14, pt: 30 }, { tilt: 47, spine: 5, neck: -20, shrug: 0, reach: 3, ...M0, mF: 1 });
    const knee = legs({ ...P, ps: 2, pt: 58 }, { tilt: 34, spine: 2, neck: -12, shrug: 0, reach: 2, ...M0, mK: 1 });
    const ext = legs({ ...P, ps: -2, pt: 90, heel: 22 }, { tilt: -8, spine: -4, neck: 2, shrug: 10, reach: 2, ...M0, mU: 1 });
    const catchS = legs({ ...P, ps: 14, pt: 62 }, { tilt: 4, spine: 2, neck: -4, shrug: 4, reach: 4, ...M0, mC: 1 });
    const stand = legs({ ...P, ps: 2, pt: 88 }, { tilt: -2, spine: -1, neck: -2, shrug: 4, reach: 4, ...M0, mC: 1 });
    const seq = sequence(floor, [[floor, 300, .1], [knee, 520, .6], [ext, 240, .7], [catchS, 220, .7], [stand, 520, .5], [stand, 450, .15], [ext, 600, .8], [knee, 520, .7], [floor, 560, .6]]);
    const at_ = t => {
      const s = seq.at(t), q0 = qOf(s), { F, J } = pose({ ...q0, hands: ZERO, elbow: {} }), tot = s.mF + s.mK + s.mU + s.mC || 1;
      /* el asa: sobre la mochila en el suelo; delante de las rodillas, con los brazos estirados (la mochila, por delante de
         ellas); en el tirón alto, a la altura del ombligo y algo separada; al recibirla, bajo la barbilla, con la mochila
         colgando delante del pecho */
      const Hf = add(FLOOR, mul(UPF, PACK[1] + HANDLE));
      const Hk = () => { const S = mix(shoulder(F, 'L', q0), shoulder(F, 'R', q0), .5), K = mix(J.L.knee, J.R.knee, .5), z = max(ZP, K[2] + PACK[2] + 14), r = 141; return [0, S[1] - sqrt(max(0, r * r - (z - S[2]) ** 2)), z]; };
      const Hu = at(F.thorax, [0, 40, 46]), Hc = at(F.thorax, [0, 104, 56]);
      let Hm = [0, 0, 0];
      if (s.mF) Hm = add(Hm, mul(Hf, s.mF / tot));
      if (s.mK) Hm = add(Hm, mul(Hk(), s.mK / tot));
      if (s.mU) Hm = add(Hm, mul(Hu, s.mU / tot));
      if (s.mC) Hm = add(Hm, mul(Hc, s.mC / tot));
      /* (al alcance de los brazos: entre una postura y otra, el asa mezclada podía quedarse lejos de los hombros) */
      /* (solo de arriba abajo y de delante a atrás: el asa sigue en medio) */
      { const S = shoulder(F, 'L', q0), RM = LEN.upper + LEN.fore + LEN.grip - .3, dx = 4.5 - S[0], m = sqrt(max(1, RM * RM - dx * dx)), v = [0, Hm[1] - S[1], Hm[2] - S[2]], d = len(v); if (d > m) Hm = [Hm[0], S[1] + v[1] * m / d, S[2] + v[2] * m / d]; }
      /* (la mochila cuelga del asa: de pie; en el suelo, algo inclinada) */
      const up = norm(add(mul(UPF, s.mF / tot), [0, 1 - s.mF / tot, 0]));
      const c = sub(Hm, mul(up, PACK[1] + HANDLE));
      /* (los codos: atrás con los brazos estirados, arriba y por fuera en el tirón alto y al recibirla: los antebrazos pasan por
         encima de la mochila, no a través) */
      const el = norm(add(add(mul([.2, 0, -1], s.mF + s.mK), mul([1, .8, -.2], s.mU)), mul([1, .2, -.15], s.mC)));
      const q = { ...q0, packC: c, packUp: up, hands: { L: add(Hm, [4.5, 0, 0]), R: add(Hm, [-4.5, 0, 0]) }, elbow: both(() => el), barDir: [1, 0, 0] };
      /* (con los codos arriba y por fuera, como arriba en un remo al mentón, las muñecas se doblan y los puños cuelgan de ellas:
         el asa, de través en las manos) */
      const wu = min(1, 3 * (s.mU + s.mC) / tot);
      if (wu <= 0) return q;
      const P2 = pose(q), o = {};
      for (const sd2 of ['L', 'R']) o[sd2] = norm(mix(norm(sub(P2.J[sd2].fist, P2.J[sd2].el)), pullHand(P2.F), wu));
      return { ...q, handDir: o };
    };
    return { view: 'front', up: 'a', rest: 'a', cam: [-40, 8], side: [-88, 4], at: at_, beat: seq.beat, keyT: seq.keyT, gear: (q, F, cam) => packGear(cam, q.packC, q.packUp, true) };
  };
  /* el saco fuera de las piernas: si se mete en un muslo o en una espinilla (al pasar del regazo a las rodillas, que suben a su
     encuentro), se aparta lo justo hacia fuera de ellos; así rueda por encima de la rodilla */
  /* (a lo largo del saco: lo que cuenta es su tramo más cercano a cada pierna, no su centro) */
  const clearLegs = (J, c, r, ax = [1, 0, 0], hl = BAG_L) => {
    for (let it = 0; it < 2; it++) for (const s of ['L', 'R']) for (const [a, b, rr] of [[J[s].hip, J[s].knee, 13.5], [J[s].knee, J[s].ankle, 8.5]]) {
      const ab = sub(b, a), need = r + rr - 1;
      let best = null;
      for (let i = -5; i <= 5; i++) { const q = add(c, mul(ax, hl * i / 5)), k = clamp(dot(sub(q, a), ab) / dot(ab, ab), 0, 1), p = add(a, mul(ab, k)), v = sub(q, p), d = len(v); if (!best || d < best[0]) best = [d, v]; }
      /* (se aparta solo hacia arriba y hacia delante, sin correrse de lado: lo que haga falta para que, en esa dirección, quede
         a need de la pierna) */
      const [d, v] = best, vn = norm(v), k = Math.hypot(vn[1], vn[2]);
      if (d < need && k > .3) c = add(c, mul(norm([0, v[1], v[2]]), (need - d) / k));
    }
    return c;
  };
  /* (el saco al hombro, a lo largo: de delante a atrás, algo caído hacia delante) */
  const shAx = F => norm(add(F.thorax.z, [0, -.12, 0]));
  const bagLift = f => {
    const w = x => has(f, x), pack = w('pack'), over = w('shoulder');
    if (pack) return packLift();
    /* el saco, tumbado de través delante de los pies (sobre el suelo, con su radio); la mochila, de pie */
    const ZF = pack ? 40 : 52, FLOOR = pack ? [0, PACK[1], ZF] : [0, BAG_R, ZF];
    /* las posturas: el agarre abajo (sentadilla honda, la espalda algo redonda: así se coge un saco del suelo), en el regazo
       (sobre los muslos, en cuclillas, el tronco más erguido), la extensión (de puntillas, la cadera adelante), la recepción
       (media sentadilla) y de pie. Lo que lleva el saco: en el suelo (bF), en el regazo (bL), abrazado (bH), al hombro (bS);
       hF: las manos sueltas */
    /* (los pies, juntos: los brazos bajan por fuera de las rodillas hasta los extremos del saco) */
    const P = { w: 19, toe: 7 };
    const B0 = { bF: 0, bK: 0, bL: 0, bH: 0, bS: 0, hF: 0 };
    const floor = legs({ ...P, ps: 24, pt: 10 }, { tilt: 60, spine: 18, neck: -28, shrug: 0, reach: 8, ...B0, bF: 1 });
    /* (el saco sube por delante de las rodillas y rueda sobre los muslos: así no las atraviesa) */
    const kneeS = legs({ ...P, ps: 20, pt: 20 }, { tilt: 50, spine: 16, neck: -22, shrug: 0, reach: 8, ...B0, bK: 1 });
    const lap = legs({ ...P, ps: 26, pt: 4 }, { tilt: 30, spine: 14, neck: -14, shrug: 2, reach: 6, ...B0, bL: 1 });
    const ext = legs({ ...P, ps: -2, pt: 90, heel: 24 }, { tilt: -10, spine: -6, neck: 2, shrug: 8, reach: 4, ...B0, bH: .7, bL: .3 });
    const catchS = legs({ ...P, ps: 16, pt: 56 }, { tilt: 4, spine: 2, neck: -4, shrug: 3, reach: 6, ...B0, bH: 1 });
    const stand = legs({ ...P, ps: 2, pt: 88 }, { tilt: -3, spine: -2, neck: -2, shrug: 3, reach: 6, ...B0, bH: 1 });
    let seq, flight = null;
    if (!over) {
      /* la cargada: del suelo al regazo, de ahí al pecho en un golpe de cadera; de pie, y de vuelta abajo por el regazo */
      seq = sequence(floor, [[floor, 300, .1], [kneeS, 380, .45], [lap, 380, .45], [lap, 200, .1], [ext, 260, .8], [catchS, 220, .6], [stand, 600, .6], [stand, 500, .15],
        [{ ...lap }, 700, .7], [kneeS, 380, .45], [floor, 400, .45]]);
    }
    else {
      /* por encima del hombro: del regazo, el golpe de cadera lleva el saco al hombro derecho y los brazos lo empujan por
         encima: cae detrás. De pie, los brazos sueltos; luego se da la vuelta (el saco, ahora delante) y otra vez */
      const thr = { ...legs({ ...P, ps: 0, pt: 90, heel: 30 }, { tilt: -12, spine: -6, neck: 8, shrug: 12, reach: 0 }), ...B0, bS: 1 };
      const done = { ...legs({ ...P, ps: 2, pt: 88 }, { tilt: 0, spine: 0, neck: -2, shrug: 0, reach: 0 }), ...B0, bF: 0, hF: 1 };
      const ready = { ...done, hF: 1 };
      seq = sequence(floor, [[floor, 250, .1], [kneeS, 330, .4], [lap, 330, .4], [lap, 180, .1], [ext, 220, .7], [thr, 160, .5], [{ ...done, tilt: 2 }, 420, .6], [ready, 500, .15], [ready, 300, .1]]);
      /* (el saco sale del hombro al final del empuje y cae detrás, sobre el suelo, mientras el cuerpo se endereza) */
      flight = [seq.keyT[6], seq.keyT[7]];
    }
    /* (dónde suelta el saco: al hombro, al terminar el empuje) */
    let rel = null;
    const REL = () => { if (!rel) { const s = seq.at(flight[0]), { F } = pose({ ...qOf(s), hands: ZERO, elbow: {} }); rel = [at(F.thorax, BAG_SH), shAx(F)]; } return rel; };
    const first = u => {
      const s = seq.at(u), q0 = qOf(s), { F, J } = pose({ ...q0, hands: ZERO, elbow: {} });
      /* el saco: donde diga cada peso */
      const lapC = () => { const H = mix(J.L.hip, J.R.hip, .5), K = mix(J.L.knee, J.R.knee, .5), n = norm(mix(F.thighL.z, F.thighR.z, .5)); return add(mix(H, K, .62), mul(n, 12 + BAG_R * .9)); };
      const tot = s.bF + s.bK + s.bL + s.bH + s.bS || 1;
      const kneeC = () => add(mix(J.L.knee, J.R.knee, .5), [0, -16, BAG_R + 16]);
      let c = [0, 0, 0];
      if (s.bF) c = add(c, mul(FLOOR, s.bF / tot));
      if (s.bK) c = add(c, mul(kneeC(), s.bK / tot));
      if (s.bL) c = add(c, mul(lapC(), s.bL / tot));
      if (s.bH) c = add(c, mul(at(F.thorax, BAG_HUG), s.bH / tot));
      if (s.bS) c = add(c, mul(at(F.thorax, BAG_SH), s.bS / tot));
      if (s.bF < .99 && s.bH + s.bS < .99) c = clearLegs(J, c, BAG_R * .85);
      /* las manos: bajo los extremos del saco (abajo y en el regazo) o rodeándolo por delante (abrazado); al hombro, empujándolo
         por debajo; sueltas, colgando */
      const offs = () => ({ F: [50, -14, -18], K: [50, -12, -6], L: [48, -8, 8] });
      const hand = sd2 => {
        const k = sd2 == 'L' ? 1 : -1, o = offs(), m = v => [k * v[0], v[1], v[2]];
        let h = [0, 0, 0];
        if (s.bF) h = add(h, mul(add(c, m(o.F)), s.bF / tot));
        if (s.bK) h = add(h, mul(add(c, m(o.K)), s.bK / tot));
        if (s.bL) h = add(h, mul(add(c, m(o.L)), s.bL / tot));
        if (s.bH) h = add(h, mul(at(F.thorax, [k * 9, 40, 86]), s.bH / tot));
        /* (al hombro, las dos manos empujan su extremo de delante hacia arriba y atrás: la izquierda cruza por delante del cuello) */
        if (s.bS) h = add(h, mul(at(F.thorax, sd2 == 'L' ? [-10, 104, 58] : [-48, 100, 50]), s.bS / tot));
        return h;
      };
      const hands = { L: hand('L'), R: hand('R') };
      /* el saco, tumbado de través; al hombro, a lo largo, de delante a atrás (como al llevarlo) */
      let ax = norm(mix([1, 0, 0], shAx(F), s.bS / tot));
      /* (en el aire: del hombro, por encima y hacia atrás, hasta el suelo detrás de los pies, girando otra vez de través) */
      if (flight && u >= flight[0]) { const k = clamp((u - flight[0]) / (flight[1] - flight[0]), 0, 1), [A, a0] = REL(), Bk = [0, BAG_R, -ZF]; c = add(mix(A, Bk, k * k * (3 - 2 * k) * .35 + k * .65), [0, 46 * k * (1 - k), 0]); ax = norm(mix(a0, [1, 0, 0], k)); }
      const elbow = both(() => norm(add(add(mul([.4, .3, -1], s.bF + s.bK), mul([1, -.2, .1], s.bL + s.bH)), mul([.5, -1, .4], s.bS))));
      /* (lo que agarra el puño: abajo, el extremo del saco, de delante a atrás; abrazado o al hombro, la tela, de arriba abajo) */
      /* (y al empujarlo por encima del hombro, los puños por debajo de su extremo, de través) */
      const bd = norm(add(add(mul([0, 0, 1], (s.bF + s.bK + s.bL) / tot), mul([0, 1, 0], s.bH / tot)), mul([1, 0, 0], s.bS / tot)));
      let q = { ...q0, barC: c, bagAx: ax, hands, elbow, barDir: both(() => bd) };
      if (s.hF > 0) {
        /* (los brazos sueltos, colgando a los lados) */
        const free = { L: add(shoulder(F, 'L', q0), [16, -139, 10]), R: add(shoulder(F, 'R', q0), [-16, -139, 10]) };
        /* (las manos se abren al soltarlo; los codos van poco a poco a su sitio) */
        const eb = q.elbow.L, ef = mix(eb, [.2, -.4, -1], s.hF);
        q = { ...q, hands: { L: mix(q.hands.L, free.L, s.hF), R: mix(q.hands.R, free.R, s.hF) }, fist: false, palm: both(() => [-1, 0, 0]), elbow: both(() => ef) };
      }
      return q;
    };
    let at_ = first, beat = seq.beat;
    if (over) {
      /* dos lanzamientos, con media vuelta tras cada uno (sobre sí mismo, como en el box step-over) */
      const C0 = [0, 0, 0];
      /* (al darse la vuelta, el saco se queda en el suelo, donde cayó) */
      at_ = t => {
        if (t < .42) return first(t / .42);
        if (t < .5) { const e = first(1); return { ...C.rotY(e, 180 * ease((t - .42) / .08), C0), barC: [0, BAG_R, -ZF], bagAx: [1, 0, 0] }; }
        if (t < .92) { const e = first((t - .5) / .42); return { ...C.rotY(e, 180, C0), bagAx: C.rotV(e.bagAx, 180) }; }
        const e = first(1); return { ...C.rotY(e, 180 + 180 * ease((t - .92) / .08), C0), barC: [0, BAG_R, ZF], bagAx: [1, 0, 0] };
      };
      /* (el reloj: cada lanzamiento a su ritmo, y la media vuelta en 450 ms) */
      const Ts = 2680, Tt = 450;
      beat = ms => { const x = ms % (2 * (Ts + Tt)), r = x % (Ts + Tt), o = x < Ts + Tt ? 0 : .5; return o + (r < Ts ? .42 * min(.9999, seq.beat(r)) : .42 + .08 * (r - Ts) / Tt); };
    }
    const gear = (q, F, cam) => {
      if (pack) return [];
      return GR.sandbag(cam, q.barC, q.bagAx, BAG_L, BAG_R);
    };
    return { view: 'front', up: 'a', rest: 'a', cam: [-40, 8], side: [-88, 4], at: at_, gear, beat, keyT: over ? undefined : seq.keyT, one: over };
  };

  /* ════ trineo ════ */
  /* el trineo (sled): dos patines sobre el suelo, a lo largo, con la plataforma entre ellos y el poste de los discos en medio;
     detrás (hacia quien empuja), dos postes verticales para las manos. Z: la z de los postes; hp: su altura. No se mueve: la
     figura anda en el sitio y es el suelo el que pasa */
  const SLED_C = ['#2c3142', '#6a7190'];
  const sledGear = (cam, Z, hp, front = false) => {
    const k = front ? -1 : 1, z0 = Z, z1 = Z + k * 128, zm = (z0 + z1) / 2, out = [];
    /* los patines y la plataforma */
    for (const x of [-34, 34]) out.push(GR.obox(cam, [x, 3.5, zm], [[1, 0, 0], UP], [4, 3.5, 66], SLED_C));
    out.push(GR.obox(cam, [0, 11, zm], [[1, 0, 0], UP], [38, 4, 50], SLED_C));
    /* el poste de los discos, con tres discos tumbados */
    out.push(...GR.tube(cam, [0, 15, zm + k * 8], [0, 84, zm + k * 8], 5, ['#5d6482', '#0a0b10'], 2));
    for (const [y, R] of [[22, 44], [33, 44], [44, 36]]) out.push(GR.disc(cam, [0, y, zm + k * 8], [0, 1, 0], R, 9));
    /* los postes de empujar: de la plataforma hacia arriba, algo inclinados hacia atrás */
    for (const x of [-30, 30]) out.push(...GR.tube(cam, [x, 12, z0 + k * 14], [x, hp, z0], 5, ['#4d546e', '#0a0b10'], 3));
    out.push(...GR.tube(cam, [-30, hp - 2, z0], [30, hp - 2, z0], 4, ['#4d546e', '#0a0b10'], 2));
    return out;
  };
  /* empujar (pesado: el cuerpo bajo, casi a 45°, pasos cortos y lentos; ligero y rápido: más erguido, zancadas largas y
     rápidas), arrastrarlo andando hacia atrás (de cara a él, con las asas de las cintas en las manos) y tirar de la cuerda
     mano sobre mano (el trineo, lejos, viene hacia la figura) */
  const sled = f => {
    const w = x => has(f, x);
    if (w('pull')) return sledPull();
    if (w('drag')) return sledDrag();
    const heavy = w('heavy'), fast = w('fast');
    const G = heavy ? { S: 66, T: 1500, lift: 8, z0: -34, tilt: 52, st: .66 } : fast ? { S: 118, T: 720, lift: 17, z0: -16, tilt: 34, st: .55 } : { S: 92, T: 1050, lift: 12, z0: -24, tilt: 44, st: .6 };
    const HY = heavy ? 132 : fast ? 166 : 148;
    /* (los postes, a lo que llegan los brazos casi estirados desde la postura de partida) */
    const body = t => {
      const g = gait(t, { S: G.S, w: 20, toe: 4, lift: G.lift, z0: G.z0, st: G.st, hs: 6, to: 40 }), ph = 2 * PI * t;
      const q0 = { feet: g.feet, knee: g.knee, root: [1.2 * sin(ph), 0, 0], tilt: G.tilt + 1.5 * sin(2 * ph), spine: 4, neck: -G.tilt * .55, shrug: 4, reach: 6, roll: 1.5 * sin(ph), twist: 2 * sin(ph) };
      /* (la cadera, lo más alta que dejan las piernas, sin estirarlas del todo: siempre algo flexionadas, empujando) */
      q0.root[1] = hipOver(g.ank, ROOT_Y - (heavy ? 26 : 14), 0);
      return q0;
    };
    const q00 = body(0), F00 = pose({ ...q00, hands: ZERO, elbow: {} }).F, S00 = shoulder(F00, 'L', q00);
    const ZP = S00[2] + sqrt(max(0, (139 * .93) ** 2 - (S00[1] - HY) ** 2 - (47 - 30) ** 2));
    const at_ = t => {
      const q0 = body(t);
      return { ...q0, hands: { L: [30, HY, ZP], R: [-30, HY, ZP] }, elbow: both(() => [.3, -1, -.2]), barDir: both(() => [0, 1, 0]) };
    };
    const gear = (q, F, cam) => sledGear(cam, ZP, HY + 22);
    return { view: 'front', up: 'a', rest: 'a', cam: [-62, 8], side: [-90, 4], feetOff: true, one: true, at: at_, gear, beat: cycle(G.T) };
  };
  /* arrastrarlo hacia atrás: de cara al trineo, con una asa de cinta en cada mano a la altura de la cadera (los brazos
     estirados hacia delante y abajo) y andando hacia atrás, el cuerpo algo echado atrás; las cintas van tensas hasta el
     trineo */
  const sledDrag = () => {
    const ZS = 150;
    const at_ = t => {
      const g = gait(t, { S: 78, w: 20, toe: 6, lift: 10, z0: 6, back: true, st: .62, hs: 4, to: 30 }), ph = 2 * PI * t;
      const q0 = { feet: g.feet, knee: g.knee, root: [1.2 * sin(ph), hipOver(g.ank, ROOT_Y - 16, -4), -4], tilt: -6 + 1.5 * sin(2 * ph), spine: -2, neck: 6, shrug: 2, reach: 4, roll: 1.5 * sin(ph), twist: 2 * sin(ph) };
      const { F } = pose({ ...q0, hands: ZERO, elbow: {} });
      const H = s => add(shoulder(F, s, q0), sd(s, [-6, -118, 72]));
      return { ...q0, hands: { L: H('L'), R: H('R') }, elbow: both(() => [.3, -.4, -1]), barDir: both(() => [1, 0, 0]) };
    };
    const gear = (q, F, cam) => [...sledGear(cam, ZS, 120), ...['L', 'R'].flatMap(s => GR.strap(cam, [q.hands[s], [sd(s, [16, 0, 0])[0], 40, ZS - 2]], 3.4, ['#3a4058', '#0a0b10']).map(i => ({ ...i, hand: s })))];
    return { view: 'front', up: 'a', rest: 'a', cam: [-58, 8], side: [-90, 4], feetOff: true, one: true, at: at_, gear, beat: cycle(1150) };
  };
  /* tirar de la cuerda mano sobre mano: de pie, las piernas abiertas y flexionadas y el cuerpo algo echado atrás; la cuerda
     viene del trineo, delante y lejos, recta hasta las manos, y de la mano de atrás cae al suelo, a los pies, donde se
     amontona. Cada mano agarra delante, tira hasta delante de la tripa y vuelve, por encima, a agarrar otra vez; las dos, a
     destiempo */
  const ROPE_C = ['#c9b98f', '#0a0b10'];
  const sledPull = () => {
    const ZS = 330, PS = [0, 30, ZS - 4];
    const base = legs({ w: 36, toe: 20, ps: 22, pt: 40 }, { tilt: 4, spine: 0, neck: -2, shrug: 2, reach: 8 });
    const q0 = qOf(base);
    /* la línea de la cuerda: del trineo a un punto delante de la tripa; las manos van por ella */
    const PB = [0, 226, 14], along = u => mix(PB, PS, u);
    const handAt = (t, ph) => {
      const u = ((t + ph) % 1 + 1) % 1;
      /* (agarra delante (u = .3 de la línea) y tira hasta junto a la cadera (.05) en el 60 % de la vuelta; luego vuelve por
         encima de la cuerda) */
      if (u < .6) return { H: along(mix(.17, .07, ease(u / .6))), on: true };
      const v = (u - .6) / .4; return { H: add(along(mix(.07, .17, ease(v))), [0, 16 * sin(PI * v), 0]), on: false };
    };
    const at_ = t => {
      const a = handAt(t, 0), b = handAt(t, .5), ph = 2 * PI * t;
      /* (el tronco acompaña: gira un poco hacia la mano que tira) */
      const q = { ...q0, twist: 6 * sin(ph), roll: 1.5 * sin(ph) };
      const q2 = { ...q, hands: { L: add(a.H, [4, 0, 0]), R: add(b.H, [-4, 0, 0]) }, elbow: both(() => [.6, -.7, -.4]), ropeOn: { L: a.on, R: b.on } };
      /* (la cuerda corre casi a lo largo del antebrazo, como al tirar de una soga; en el puño, de través a él) */
      const { J } = pose(q2), rd = norm(sub(PS, PB));
      return { ...q2, barDir: { L: mul(acrossFist(J, 'L', rd), -1), R: acrossFist(J, 'R', rd) } };
    };
    const gear = (q, F, cam) => {
      /* la cuerda: del trineo a la mano más adelantada que agarra; de ahí, a la otra; luego cae a los pies y se amontona */
      const hs = ['L', 'R'].filter(s => q.ropeOn[s]).sort((s1, s2) => q.hands[s2][2] - q.hands[s1][2]);
      const pts = [PS, ...hs.map(s => q.hands[s])], last = pts[pts.length - 1];
      const tail = [add(last, [2, -40, 10]), [6, 30, 44], [8, 3, 40], [24, 3, 52], [-10, 3, 58], [-16, 3, 40], [12, 3, 34]];
      return [...sledGear(cam, ZS, 120, true), ...GR.strap(cam, [...pts, ...tail], 3.6, ROPE_C).map(i => ({ ...i, hand: hs[0] || null }))];
    };
    return { view: 'front', up: 'a', rest: 'a', cam: [-70, 8], side: [-90, 4], one: true, at: at_, gear, beat: cycle(1300) };
  };

  /* ════ posturas por fotogramas clave ════ */
  /* una postura entre dos (a, b: posturas completas del motor): los números, mezclados; las direcciones, mezcladas y
     normalizadas; lo que no se mezcla (puño cerrado o abierto), el de la más cercana. lift: lo que suben los pies en medio
     (un salto) */
  const mixV = (u, v, k) => u && v ? mix(u, v, k) : (k < .5 ? u || v : v || u);
  const mixN = (u, v, k) => { const m = mixV(u, v, k); return m ? norm(m) : m; };
  /* (lo que va por lados; uno dado para los dos (una barra de lado a lado), como si fuera el mismo en cada lado) */
  const perSide = A => Array.isArray(A) ? { L: A, R: A } : A;
  const sides = (A, B, k, f) => { if (!A && !B) return undefined; A = perSide(A); B = perSide(B); const o = {}; for (const s of ['L', 'R']) { const r = f(A && A[s], B && B[s], k); if (r) o[s] = r; } return o; };
  const qmix = (a, b, k, lift = 0) => {
    const n = f => (a[f] || 0) + ((b[f] || 0) - (a[f] || 0)) * k;
    const q = { root: mix(a.root, b.root, k) };
    for (const f of ['tilt', 'spine', 'neck', 'roll', 'yaw', 'twist', 'bend', 'shrug', 'reach']) q[f] = n(f);
    q.feet = sides(a.feet, b.feet, k, (u, v, kk) => u.map((x, i) => x + (v[i] - x) * kk));
    if (lift) for (const s of ['L', 'R']) q.feet[s][3] += lift * sin(PI * k);
    q.knee = sides(a.knee, b.knee, k, mixN);
    q.hands = sides(a.hands, b.hands, k, mixV);
    q.elbow = sides(a.elbow, b.elbow, k, mixN);
    q.handDir = sides(a.handDir, b.handDir, k, mixN);
    q.palm = sides(a.palm, b.palm, k, mixN);
    q.barDir = sides(a.barDir, b.barDir, k, mixN);
    q.fist = (k < .5 ? a : b).fist;
    if (a.footDir || b.footDir) q.footDir = (k < .5 ? a : b).footDir;
    return q;
  };
  /* la animación por fotogramas: K, [postura, ms hasta ella, lo que avanza t, salto]; devuelve at(t) y el reloj */
  /* (las manos, al alcance de los brazos: entre dos posturas, la mano mezclada podía quedarse lejos del hombro) */
  const reachClamp = q => {
    if (!q.hands) return q;
    const T0 = torso(q), F = { thorax: T0.thorax }, o = {};
    for (const s of ['L', 'R']) {
      const H = q.hands[s]; if (!H) continue;
      /* (con la muñeca doblada (handDir), lo que tiene que alcanzar el brazo es la muñeca) */
      const S = shoulder(F, s, q), hd = q.handDir && q.handDir[s] ? norm(q.handDir[s]) : null, P = hd ? sub(H, mul(hd, LEN.grip)) : H;
      const d = len(sub(P, S)), RM = hd ? LEN.upper + LEN.fore - 1 : LEN.upper + LEN.fore + LEN.grip - 1.5;
      o[s] = d > RM ? add(add(S, mul(sub(P, S), RM / d)), hd ? mul(hd, LEN.grip) : [0, 0, 0]) : H;
    }
    return { ...q, hands: o };
  };
  const keyAnim = (start, K) => {
    const tot = K.reduce((a, k) => a + k[2], 0), T = K.reduce((a, k) => a + k[1], 0), P = [start, ...K.map(k => k[0])];
    const at = t => {
      let acc = 0;
      for (let i = 0; i < K.length; i++) { const d = K[i][2] / tot; if (t <= acc + d || i == K.length - 1) { const k = clamp((t - acc) / d, 0, 1); return reachClamp(qmix(P[i], P[i + 1], ease(k), K[i][3] || 0)); } acc += d; }
      return P[P.length - 1];
    };
    const beat = ms => { let x = ms % T, t0 = 0; for (const k of K) { const d = k[2] / tot; if (x < k[1]) return t0 + d * x / k[1]; x -= k[1]; t0 += d; } return 1; };
    return { at, beat };
  };

  /* ════ burpees ════ */
  /* la flexión de los burpees: las manos planas en el suelo, a la anchura de los hombros (z = 0); el cuerpo, recto desde las
     puntas de los pies. Arriba, los brazos estirados; abajo, el pecho en el suelo */
  const HDF = norm([0, -.5, 15]);
  /* (hx: la mitad de la separación de las manos; hy: lo que se apoyan por encima del suelo, en las mancuernas) */
  const PUof = (hx, hy = 0, fist = false) => {
    const Hs = { L: [hx, hy + (fist ? 0 : 3.9), 0], R: [-hx, hy + (fist ? 0 : 3.9), 0] }, W = fist ? Hs.L : sub(Hs.L, mul(HDF, LEN.grip));
    const ankleY = 40.6, Lg = LEN.thigh + LEN.shin - 2;
    const mk = (th, zA) => ({ root: [0, ankleY + Lg * sin(RAD(th)), zA + Lg * cos(RAD(th))], tilt: 90 - th, spine: 0, neck: 8, feet: both(() => [12, zA - 3, 0, ankleY - LEN.ankle, 65]), knee: both(() => [0, -1, .1]) });
    const sh = (th, zA) => { const q = mk(th, zA); return shoulder(torso(q), 'L', q); };
    const reach = (fist ? LU + LF : LU + LEN.fore) - 3;
    const th0 = solve(th => sh(th, 0)[1] - W[1] - sqrt(max(0, reach ** 2 - (sh(th, 0)[0] - W[0]) ** 2)), -45, 70), zA = W[2] - sh(th0, 0)[2];
    const chestY = th => { const q = mk(th, zA), { F } = pose({ ...q, hands: ZERO, elbow: {} }); return min(at(F.thorax, [0, 50, 32])[1], at(F.head, [0, 0, 18])[1] - 6); };
    const thD = solve(th => chestY(th) - 4, -10, th0);
    const flat = fist ? { hands: Hs, fist: true } : { hands: Hs, handDir: both(() => HDF), palm: both(() => [0, -1, 0]), fist: false };
    return { Hs, mk, th0, thD, zA, flat };
  };
  const PU = PUof(48);
  /* de pie (con los pies en zf), los brazos colgando; agachado con las manos en el suelo; en el aire, con las manos arriba */
  const bpStand = (zf, o = {}) => { const s = legs({ w: 22, toe: 8, ps: 2, pt: 88 }, { tilt: 0, spine: 0, neck: 0, shrug: 0, reach: 2, ...o }); s.zL = s.zR = zf; s.rz += zf; const q = qOf(s), { F } = pose({ ...q, hands: ZERO, elbow: {} }); return { ...q, hands: both(sd2 => add(shoulder(F, sd2, q), sd(sd2, [14, -139, 6]))), elbow: both(() => [.2, 0, -1]), handDir: both(() => [0, -1, 0]), palm: both(() => [-1, 0, 0]), fist: false }; };
  /* (las rodillas juntas: los brazos bajan por fuera de ellas) */
  const bpSquat = zf => { const s = legs({ w: 17, toe: 4, ps: 28, pt: 0 }, { tilt: 56, spine: 14, neck: -16, shrug: 0, reach: 8 }); s.zL = s.zR = zf; s.rz += zf; return { ...qOf(s), ...PU.flat, elbow: both(() => [.3, .2, -1]) }; };
  const bpAir = (zf, h = 18) => { const s = legs({ w: 22, toe: 8, ps: 0, pt: 90, heel: 34 }, { tilt: -2, spine: -2, neck: 4, shrug: 8, reach: 0 }); s.zL = s.zR = zf; s.rz += zf; s.lL = s.lR = h; s.ry += h; const q = qOf(s), { F } = pose({ ...q, hands: ZERO, elbow: {} }); return { ...q, hands: both(sd2 => add(shoulder(F, sd2, q), sd(sd2, [-30, 134, 22]))), elbow: both(() => [.3, 0, -1]), handDir: both(() => [0, 1, .1]), palm: both(() => [-1, 0, 0]), fist: false }; };
  const bpPlank = () => ({ ...PU.mk(PU.th0, PU.zA), ...PU.flat, elbow: both(() => [.55, .28, -.8]) });
  const bpDown = () => ({ ...PU.mk(PU.thD, PU.zA), ...PU.flat, elbow: both(() => [.55, .28, -.8]) });
  /* (al levantarse para saltar, las manos salen del suelo hacia delante, por delante de las rodillas; al caer, los brazos
     bajan abiertos por los lados: así no pasan por las piernas ni por el cuerpo) */
  const bpRise = zf => { const s = legs({ w: 24, toe: 10, ps: 14, pt: 46 }, { tilt: 24, spine: 6, neck: -6, shrug: 4, reach: 6 }); s.zL = s.zR = zf; s.rz += zf; const q = qOf(s), { F } = pose({ ...q, hands: ZERO, elbow: {} }); return { ...q, hands: both(sd2 => add(shoulder(F, sd2, q), sd(sd2, [-6, -30, 128]))), elbow: both(() => [.3, -1, -.2]), handDir: both(() => [0, .2, 1]), palm: both(() => [-1, 0, 0]), fist: false }; };
  const bpLand = zf => { const q = bpStand(zf, { ps: 8, pt: 74 }), { F } = pose({ ...q, hands: ZERO, elbow: {} }); return { ...q, hands: both(sd2 => add(shoulder(F, sd2, q), sd(sd2, [128, -40, 8]))), elbow: both(() => [0, -1, -.5]), handDir: both(sd2 => sd(sd2, [1, -.3, 0])), palm: both(() => [0, -1, 0]) }; };
  /* (el burpee hasta volver a cuclillas: de pie, abajo con las manos, atrás de un salto, el pecho al suelo, arriba y los pies
     otra vez junto a las manos) */
  const ZF = -42;
  const bpDownUp = () => [[bpSquat(ZF), 320, .7], [bpPlank(), 230, .6, 12], [bpDown(), 320, .6], [bpPlank(), 300, .6], [bpSquat(ZF), 250, .6, 12]];
  /* dos repeticiones con media vuelta tras cada una (sobre sí mismo), la segunda girada media vuelta alrededor de C: así la
     segunda empieza donde acabó la primera y la animación cierra (como el saco por encima del hombro) */
  const twoReps = (one, C0, Ts, Tt = 450) => {
    const at = t => {
      if (t < .42) return one(t / .42);
      if (t < .5) { const e = one(1); return C.rotY(e, 180 * ease((t - .42) / .08), [e.root[0], 0, e.root[2]]); }
      if (t < .92) return C.rotY(one((t - .5) / .42), 180, C0);
      const e = C.rotY(one(1), 180, C0); return C.rotY(e, 180 * ease((t - .92) / .08), [e.root[0], 0, e.root[2]]);
    };
    const beat = ms => { const x = ms % (2 * (Ts + Tt)), r = x % (Ts + Tt), o = x < Ts + Tt ? 0 : .5; return o + (r < Ts ? .42 * r / Ts : .42 + .08 * (r - Ts) / Tt); };
    return { at, beat };
  };
  /* la caja del burpee con salto: 24" (61 cm), delante de las manos */
  const BOX_H = 122, BOX_D = 38, BOX_Z = -16 + BOX_D;
  const burpee = f => {
    const w = x => has(f, x);
    if (w('sprawl')) return sprawl();
    if (w('db')) return devilPress();
    const K = bpDownUp();
    if (w('bar')) {
      /* por encima de la barra, de lado: la barra en el suelo, a lo largo, junto a la figura; tras el burpee, salta de lado por
         encima de ella con las rodillas recogidas y cae al otro lado; la siguiente, de vuelta */
      const X0 = 86, rep = (dx, side) => {
        const sq = C.shift(bpSquat(ZF), [dx, 0, 0]), air = C.shift(bpAir(ZF, 46), [0, 0, 0]), land = C.shift(bpLand(ZF), [-dx, 0, 0]);
        air.knee = both(() => [0, .3, 1]); air.feet = both(sd2 => { const f0 = [...air.feet[sd2]]; return f0; });
        return [...bpDownUp().map(k => [C.shift(k[0], [dx, 0, 0]), ...k.slice(1)]), [C.shift(bpRise(ZF), [dx * .7, 0, 0]), 150, .35], [{ ...air, knee: both(() => [0, .25, 1]) }, 300, .8, 24], [land, 240, .55, 24], [C.shift(bpStand(ZF), [-dx, 0, 0]), 220, .4]];
      };
      const K2 = [...rep(X0), ...rep(-X0)];
      const A = keyAnim(C.shift(bpStand(ZF), [X0, 0, 0]), K2);
      /* (la barra, centrada a lo largo del cuerpo tumbado: los discos, más allá de la cabeza y de los pies) */
      const gear = (q, F, cam) => C.barAx(cam, [0, 49, -78], [0, 0, 1], 0);
      return { view: 'front', up: 'a', rest: 'a', cam: [-28, 12], side: [-90, 4], feetOff: true, one: true, at: A.at, beat: A.beat, gear };
    }
    if (w('box')) {
      /* con salto al cajón: tras el burpee (detrás del cajón), sube de un salto con los dos pies, se pone de pie y salta al otro
         lado; media vuelta, y otra vez */
      const dz = -88, sh = q => C.shift(q, [0, 0, dz]);
      /* (arriba, de pie en el cajón, con los brazos abiertos a los lados: al bajarlos desde arriba no pasan por el cuerpo) */
      const topZ = BOX_Z, onBox = (() => { const q = bpLand(0); return C.shift({ ...q, feet: both(sd2 => { const f0 = [...q.feet[sd2]]; f0[3] += BOX_H; return f0; }) }, [0, BOX_H, topZ]); })();
      const airUp = C.shift(bpAir(0, BOX_H + 24), [0, 0, -18]), airOff = C.shift(bpAir(0, BOX_H * .6), [0, 0, topZ + 50]);
      const endZ = 2 * BOX_Z - (ZF + dz);
      const K1 = [...bpDownUp().map(k => [sh(k[0]), ...k.slice(1)]), [sh(bpRise(ZF)), 150, .35], [airUp, 240, .6], [onBox, 200, .5], [airOff, 220, .5], [C.shift(bpLand(0), [0, 0, endZ - 0]), 160, .35], [C.shift(bpStand(0), [0, 0, endZ]), 200, .35]];
      const A = keyAnim(sh(bpStand(ZF)), K1);
      const R = twoReps(A.at, [0, 0, BOX_Z], 2900);
      const gear = (q, F, cam) => GR.under([GR.obox(cam, [0, BOX_H / 2, BOX_Z], [[1, 0, 0], UP], [54, BOX_H / 2, BOX_D], ['#3a3328', '#8a7a58'])], 1);
      return { view: 'front', up: 'a', rest: 'a', cam: [-62, 10], side: [-90, 4], feetOff: true, one: true, at: R.at, beat: R.beat, gear };
    }
    if (w('broad')) {
      /* con salto adelante: tras el burpee, un salto de longitud con los dos pies (los brazos, atrás y luego adelante); media
         vuelta, y otra vez hacia donde empezó */
      const D = 128, dz = -40;
      const load = (() => { const s2 = legs({ w: 22, toe: 8, ps: 18, pt: 50 }, { tilt: 34, spine: 6, neck: -10, shrug: 0, reach: 2 }); s2.zL = s2.zR = ZF + dz; s2.rz += ZF + dz; const q = qOf(s2), { F } = pose({ ...q, hands: ZERO, elbow: {} }); return { ...q, hands: both(sd2 => add(shoulder(F, sd2, q), sd(sd2, [12, -120, -60]))), elbow: both(() => [.2, .2, -1]), handDir: both(() => [0, -1, -.3]), palm: both(() => [-1, 0, 0]), fist: false }; })();
      const fly = C.shift({ ...bpRise(ZF + dz), feet: both(sd2 => { const f0 = [...bpRise(ZF + dz).feet[sd2]]; f0[3] += 34; f0[4] = 20; return f0; }) }, [0, 34, D / 2]);
      const land = C.shift(bpSquat(ZF), [0, 0, dz + D]);
      const K1 = [...bpDownUp().map(k => [C.shift(k[0], [0, 0, dz]), ...k.slice(1)]), [load, 260, .5], [fly, 240, .7], [{ ...land, ...bpRise(ZF + dz + D), root: land.root, feet: land.feet, tilt: 30 }, 200, .5], [C.shift(bpStand(ZF), [0, 0, dz + D]), 300, .45]];
      const A = keyAnim(C.shift(bpStand(ZF), [0, 0, dz]), K1);
      const R = twoReps(A.at, [0, 0, ZF + dz + D / 2], 2700);
      return { view: 'front', up: 'a', rest: 'a', cam: [-84, 10], side: [-90, 4], feetOff: true, one: true, at: R.at, beat: R.beat };
    }
    const A = keyAnim(bpStand(ZF), [...K, [bpRise(ZF), 140, .35], [bpAir(ZF), 180, .5], [bpLand(ZF), 160, .35], [bpStand(ZF), 220, .45]]);
    return { view: 'front', up: 'a', rest: 'a', cam: [-70, 10], side: [-90, 4], feetOff: true, at: A.at, beat: A.beat };
  };
  /* el sprawl: de pie, las manos al suelo y las piernas atrás de un golpe, con la cadera al suelo y el pecho arriba (los brazos
     estirados); de un salto, los pies otra vez junto a las manos, y de pie. Sin flexión ni salto arriba */
  const sprawl = () => {
    const low = (() => {
      /* (la cadera casi en el suelo, las piernas estiradas atrás sobre las puntas, el tronco levantado sobre los brazos: los
         tobillos, a lo que llegan las piernas desde la cadera, para que queden rectas) */
      const q0 = { root: [0, 34, -16], tilt: 64, spine: -14, neck: -6, shrug: 6, reach: 4 }, { pelvis } = torso(q0), Hp = at(pelvis, [20, 0, 0]);
      const AY = 40.6, dz = sqrt(max(0, (LEN.thigh + LEN.shin - 3) ** 2 - (Hp[1] - AY) ** 2)), zA = Hp[2] - dz;
      const q = { ...q0, feet: both(() => [16, zA, 0, AY - LEN.ankle, 68]), knee: both(() => [0, -.3, 1]) };
      return { ...q, ...PU.flat, elbow: both(() => [.3, -.2, -1]) };
    })();
    /* (las piernas salen atrás de un salto, como en el burpee, y la cadera cae al suelo; al volver, primero se levanta) */
    const A = keyAnim(bpStand(ZF), [[bpSquat(ZF), 260, .7], [bpPlank(), 170, .5, 10], [low, 150, .4], [low, 160, .15], [bpPlank(), 150, .4], [bpSquat(ZF), 190, .5, 10], [bpStand(ZF), 300, .7]]);
    return { view: 'front', up: 'a', rest: 'a', cam: [-70, 10], side: [-90, 4], feetOff: true, at: A.at, beat: A.beat };
  };
  /* el devil press: dos mancuernas en el suelo, de canto (el asa de delante a atrás), con las manos en ellas; el burpee con el
     pecho al suelo entre las dos, los pies otra vez adelante, por fuera de ellas, y, en un solo gesto, las mancuernas suben
     del suelo pegadas al cuerpo hasta arriba, con los brazos bloqueados; luego bajan al suelo */
  const devilPress = () => {
    /* (las mancuernas, algo más juntas que los hombros; al volver de un salto, los pies caen por fuera de ellas, abiertos. Abajo,
       el pecho roza el suelo entre las dos, sin que los hombros se metan en ellas) */
    const DBY = 14.5, P2 = PUof(24, DBY, true);
    const onDb = q => ({ ...q, hands: P2.Hs, barDir: both(() => [0, 0, 1]), fist: true, handDir: undefined, palm: undefined });
    /* (en cuclillas, con los pies a los lados de las mancuernas: ellas, entre los pies) */
    const ZW = 4, sqW = (() => { const s2 = legs({ w: 52, toe: 32, ps: 24, pt: 8 }, { tilt: 50, spine: 12, neck: -16, shrug: 0, reach: 8 }); s2.zL = s2.zR = ZW; s2.rz += ZW; return { ...qOf(s2), elbow: both(() => [-.25, .1, -1]) }; })();
    /* (abajo, los codos salen hacia fuera y arriba: el antebrazo sube empinado desde el asa y no pasa por encima de la cabeza
       de atrás de la mancuerna) */
    const sq = onDb(sqW), pl = { ...P2.mk(P2.th0, P2.zA), ...onDb({}), elbow: both(() => [.55, .28, -.8]) }, dn = { ...P2.mk(mix(P2.thD, P2.th0, .1), P2.zA), ...onDb({}), elbow: both(() => [.7, .8, -.45]) };
    /* (la bisagra con las mancuernas entre las piernas, el tirón y arriba) */
    const pull = (() => { const s2 = legs({ w: 52, toe: 32, ps: 0, pt: 90, heel: 14 }, { tilt: -4, spine: -2, neck: 2, shrug: 8, reach: 2 }); s2.zL = s2.zR = ZW; s2.rz += ZW; const q = qOf(s2), { F } = pose({ ...q, hands: ZERO, elbow: {} }); return { ...q, hands: both(sd2 => add(shoulder(F, sd2, q), sd(sd2, [-4, 40, 60]))), elbow: both(() => [1, .4, -.2]), barDir: both(() => [0, 0, 1]), fist: true }; })();
    const top = (() => { const s2 = legs({ w: 52, toe: 32, ps: 2, pt: 88 }, { tilt: 1, spine: 1, neck: 4, shrug: 8, reach: 0 }); s2.zL = s2.zR = ZW; s2.rz += ZW; const q = qOf(s2), { F } = pose({ ...q, hands: ZERO, elbow: {} }); return { ...q, hands: both(sd2 => add(shoulder(F, sd2, q), sd(sd2, [-2, 140, 4]))), elbow: both(() => [.45, 0, -1]), barDir: both(() => [0, 0, 1]), fist: true }; })();
    /* (al subir, primero se despegan del suelo con la cadera aún baja: así suben por delante de las rodillas) */
    const lift = (() => { const s2 = legs({ w: 52, toe: 32, ps: 14, pt: 40 }, { tilt: 42, spine: 6, neck: -18, shrug: 2, reach: 6 }); s2.zL = s2.zR = ZW; s2.rz += ZW; const q = qOf(s2), { F } = pose({ ...q, hands: ZERO, elbow: {} }); return { ...q, hands: both(sd2 => add(shoulder(F, sd2, q), sd(sd2, [-25, -128, 28]))), elbow: both(() => [.5, .1, -1]), barDir: both(() => [0, 0, 1]), fist: true }; })();
    const A0 = keyAnim(sq, [[pl, 240, .6, 12], [dn, 320, .6], [pl, 320, .6], [sq, 250, .6, 12], [lift, 220, .5], [pull, 220, .6], [top, 220, .6], [top, 400, .12], [pull, 380, .6], [lift, 280, .5], [sq, 300, .5]]);
    /* (el asa, de delante a atrás; en el aire, en el puño de través a él. En el suelo la mancuerna no se ladea con el antebrazo:
       sigue tumbada, de delante a atrás) */
    const offFloor = q => clamp((min(q.hands.L[1], q.hands.R[1]) - DBY) / 20, 0, 1);
    const at_ = t => {
      const q = A0.at(t), { J } = pose(q), k = offFloor(q);
      return { ...q, barDir: { L: norm(mix([0, 0, -1], mul(acrossFist(J, 'L', [0, 0, 1]), -1), k)), R: norm(mix([0, 0, 1], acrossFist(J, 'R', [0, 0, 1]), k)) } };
    };
    const A = { at: at_, beat: A0.beat };
    const gear = (q, F, cam) => { const k = offFloor(q); return ['L', 'R'].flatMap(s2 => GR.dumbbell(cam, q.hands[s2], norm(mix([0, 0, 1], M.dbAxis(F, q, s2), k)), s2)); };
    return { view: 'front', up: 'a', rest: 'a', cam: [-64, 10], side: [-90, 4], feetOff: true, at: A.at, beat: A.beat, gear };
  };

  /* ════ balón medicinal: wall balls, lanzamientos y slam ════ */
  const MB_R = 21;
  /* una postura de pie (legs) con algo en las manos: la bola en c (o lo que se pida), las manos donde digan */
  const withHands = (st, f) => { const q = qOf(st), { F } = pose({ ...q, hands: ZERO, elbow: {} }); return { ...q, ...f(F, q) }; };
  /* las manos sujetando la bola por debajo y por los lados (delante del pecho: los codos abajo; arriba: debajo de ella) */
  const holdBall = (c, up = 0, el = [.4, -1, .2]) => ({ hands: { L: add(c, [17, -9 - 6 * up, -8 + 4 * up]), R: add(c, [-17, -9 - 6 * up, -8 + 4 * up]) }, elbow: both(() => el), fist: false, palm: both(() => norm([-1, -.2 + .6 * up, 0])), handDir: both(sd2 => norm(sd(sd2, [-.3, .5 + .5 * up, .8 - .6 * up]))) });
  /* el vuelo de la bola: de a a la cima (top, donde da en la pared o se para) y de ahí a b, como cae lo que se lanza */
  const flight = (a, top, b, u) => u < .5 ? (k => [a[0] + (top[0] - a[0]) * k, a[1] + (top[1] - a[1]) * (1 - (1 - k) ** 2), a[2] + (top[2] - a[2]) * k])(u * 2) : (k => [top[0] + (b[0] - top[0]) * k, top[1] + (b[1] - top[1]) * k * k, top[2] + (b[2] - top[2]) * k])(u * 2 - 1);
  /* la pared (de delante, a la z dada, o de lado) con su diana */
  const WALL_C = ['#1e2232', '#4d5370'];
  const wallAt = (cam, z, ty = 600) => [...GR.under([GR.obox(cam, [0, 330, z + 5], [[1, 0, 0], UP], [120, 330, 5], WALL_C)], 0), GR.disc(cam, [0, ty, z - 1], [0, 0, 1], 30, 2), GR.disc(cam, [0, ty, z - 1.5], [0, 0, 1], 18, 1.5)];
  /* los wall balls: sentadilla frontal con la bola al pecho, al subir la lanza con los brazos a la diana de la pared (3 m);
     la recoge arriba y baja con ella a la sentadilla siguiente */
  const wallBall = () => {
    const WZ = 112, P = { w: 30, toe: 18 }, TGT = [0, 600, WZ - MB_R - 1];
    const sq = withHands(legs({ ...P, ps: 34, pt: -6 }, { tilt: 18, spine: 6, neck: -8, shrug: 2, reach: 6 }), F => ({ ball: at(F.thorax, [0, 86, 44]) }));
    const drive = withHands(legs({ ...P, ps: 2, pt: 90, heel: 16 }, { tilt: -2, spine: -2, neck: 4, shrug: 6, reach: 4 }), F => ({ ball: at(F.thorax, [0, 150, 44]) }));
    const rel = withHands(legs({ ...P, ps: 0, pt: 90, heel: 24 }, { tilt: -3, spine: -3, neck: 10, shrug: 10, reach: 2 }), F => ({ ball: at(F.thorax, [0, 232, 40]) }));
    const caught = withHands(legs({ ...P, ps: 3, pt: 86 }, { tilt: -2, spine: -2, neck: 10, shrug: 8, reach: 4 }), F => ({ ball: at(F.thorax, [0, 214, 42]) }));
    const down = withHands(legs({ ...P, ps: 20, pt: 46 }, { tilt: 10, spine: 3, neck: -4, shrug: 4, reach: 6 }), F => ({ ball: at(F.thorax, [0, 104, 44]) }));
    /* (las manos en la bola, salvo en el vuelo: entonces, arriba, esperándola) */
    const held = (k, up) => ({ ...k, ...holdBall(k.ball, up, up > .5 ? [.5, 0, -1] : [.4, -1, .2]) });
    const K = [[held(drive, .4), 300, .6], [held(rel, 1), 160, .45], [{ ...held(caught, 1), free: 1 }, 700, .6], [held(caught, 1), 60, .05], [held(down, .3), 300, .5], [held(sq, 0), 280, .5]];
    const A = keyAnim(held(sq, 0), K);
    /* (el vuelo: entre la suelta y la recogida, la bola va a la diana y vuelve) */
    const T = K.reduce((a, k) => a + k[2], 0), t1 = (K[0][2] + K[1][2]) / T, t2 = t1 + K[2][2] / T;
    const at_ = t => {
      const q = A.at(t);
      const B = t > t1 && t < t2 ? flight(rel.ball, TGT, caught.ball, (t - t1) / (t2 - t1)) : mix(sub(q.hands.L, [17, -9, -8]), sub(q.hands.R, [-17, -9, -8]), .5);
      return { ...q, mb: B };
    };
    const gear = (q, F, cam) => [...wallAt(cam, WZ), ...GR.ball(cam, q.mb, MB_R)];
    return { view: 'front', up: 'a', rest: 'a', cam: [-56, 8], side: [-90, 4], at: at_, gear, beat: A.beat };
  };
  const medBall = f => {
    const w = x => has(f, x);
    if (w('slam')) return mbSlam();
    if (w('rot')) return mbRot();
    return mbChest();
  };
  /* el slam: de puntillas con la bola arriba, la estrella contra el suelo delante de los pies doblando la cadera, bota un poco;
     se agacha a cogerla y la sube otra vez por encima de la cabeza */
  const mbSlam = () => {
    const P = { w: 34, toe: 16 }, FL = [0, MB_R, 74];
    const top = withHands(legs({ ...P, ps: 0, pt: 90, heel: 18 }, { tilt: -6, spine: -4, neck: 8, shrug: 10, reach: 0 }), F => ({ ball: at(F.thorax, [0, 236, 22]) }));
    /* (la bola baja por delante de la cara, con los brazos estirados, y sale de las manos delante de las rodillas; al subirla,
       lo mismo al revés: nunca pasa por la cabeza) */
    const front = withHands(legs({ ...P, ps: 4, pt: 84 }, { tilt: 8, spine: 2, neck: 0, shrug: 6, reach: 8 }), F => ({ ball: at(F.thorax, [0, 150, 96]) }));
    const slam = withHands(legs({ ...P, ps: 14, pt: 56 }, { tilt: 46, spine: 10, neck: -20, shrug: 0, reach: 6 }), F => ({ ball: [0, 84, 86] }));
    const pick = withHands(legs({ ...P, ps: 26, pt: 10 }, { tilt: 44, spine: 12, neck: -16, shrug: 0, reach: 6 }), F => ({ ball: FL }));
    const lift = withHands(legs({ ...P, ps: 6, pt: 80 }, { tilt: 4, spine: 0, neck: 0, shrug: 4, reach: 4 }), F => ({ ball: at(F.thorax, [0, 100, 40]) }));
    const held = (k, up) => ({ ...k, ...holdBall(k.ball, up, up > .5 ? [.5, 0, -1] : [.4, -1, .2]) });
    const K = [[held(front, .5), 130, .35], [held(slam, 0), 120, .35], [{ ...held(slam, 0), free: 1 }, 260, .25], [held(pick, 0), 300, .5], [held(lift, .2), 300, .5], [held(front, .5), 200, .4], [held(top, 1), 220, .4], [held(top, 1), 200, .1]];
    const A = keyAnim(held(top, 1), K);
    const T = K.reduce((a, k) => a + k[2], 0), t1 = (K[0][2] + K[1][2] * .6) / T, t2 = (K[0][2] + K[1][2] + K[2][2] + K[3][2] * .7) / T;
    /* (la bola sale de las manos a media bajada, da en el suelo, bota un palmo y se queda; las manos la recogen) */
    const at_ = t => {
      const q = A.at(t), inHands = mix(sub(q.hands.L, [17, -9, -8]), sub(q.hands.R, [-17, -9, -8]), .5);
      let B = inHands;
      if (t > t1 && t < t2) { const u = (t - t1) / (t2 - t1), hit = .3; B = u < hit ? mix(A.at(t1) && mix(sub(A.at(t1).hands.L, [17, -9, -8]), sub(A.at(t1).hands.R, [-17, -9, -8]), .5), FL, (u / hit) ** 2) : add(FL, [0, 18 * sin(PI * min(1, (u - hit) / .4)) * (u - hit < .4 ? 1 : 0), 0]); }
      return { ...q, mb: B };
    };
    const gear = (q, F, cam) => GR.ball(cam, q.mb, MB_R);
    return { view: 'front', up: 'a', rest: 'a', cam: [-62, 8], side: [-90, 4], at: at_, gear, beat: A.beat };
  };
  /* el lanzamiento de pecho: en media sentadilla con la bola al pecho, se estira de golpe y la empuja con los dos brazos contra
     la pared de delante; la bola vuelve y la recoge al pecho bajando otra vez */
  const mbChest = () => {
    const WZ = 260, P = { w: 30, toe: 14 }, HIT = [0, 250, WZ - MB_R - 1];
    const sq = withHands(legs({ ...P, ps: 22, pt: 40 }, { tilt: 16, spine: 4, neck: -6, shrug: 2, reach: 6 }), F => ({ ball: at(F.thorax, [0, 80, 42]) }));
    const push = withHands(legs({ ...P, ps: 0, pt: 90, heel: 14 }, { tilt: 4, spine: 0, neck: -2, shrug: 6, reach: 12 }), F => ({ ball: at(F.thorax, [0, 82, 120]) }));
    const wait = withHands(legs({ ...P, ps: 6, pt: 80 }, { tilt: 4, spine: 0, neck: -2, shrug: 4, reach: 8 }), F => ({ ball: at(F.thorax, [0, 82, 90]) }));
    const held = k => ({ ...k, ...holdBall(k.ball, 0, [.6, -1, 0]) });
    const K = [[held(push), 220, .6], [held(wait), 600, .4], [held(sq), 300, .6], [held(sq), 160, .1]];
    const A = keyAnim(held(sq), K);
    const T = K.reduce((a, k) => a + k[2], 0), t1 = K[0][2] / T, t2 = (K[0][2] + K[1][2]) / T;
    const at_ = t => { const q = A.at(t); return { ...q, mb: t > t1 && t < t2 ? flight(push.ball, HIT, wait.ball, (t - t1) / (t2 - t1)) : mix(sub(q.hands.L, [17, -9, -8]), sub(q.hands.R, [-17, -9, -8]), .5) }; };
    const gear = (q, F, cam) => [...wallAt(cam, WZ, 250), ...GR.ball(cam, q.mb, MB_R)];
    return { view: 'front', up: 'a', rest: 'a', cam: [-60, 8], side: [-90, 4], at: at_, gear, beat: A.beat };
  };
  /* el lanzamiento rotacional: de lado a la pared (a la izquierda), la bola junto a la cadera derecha con el tronco girado
     hacia ese lado; gira de golpe hacia la pared y la lanza con los brazos casi estirados; la recoge al volver y la lleva otra
     vez a la cadera derecha */
  const mbRot = () => {
    const WX = 230, P = { w: 36, toe: 14 }, HIT = [WX - MB_R - 1, 200, 10];
    const load = withHands(legs({ ...P, ps: 12, pt: 62 }, { tilt: 10, spine: 2, neck: -4, shrug: 2, reach: 4, twist: -46 }), F => ({ ball: add(at(F.thorax, [0, 46, 62]), [-8, 0, 0]) }));
    const thr = withHands(legs({ ...P, ps: 6, pt: 78 }, { tilt: 6, spine: 0, neck: -2, shrug: 4, reach: 8, twist: 34 }), F => ({ ball: at(F.thorax, [0, 66, 110]) }));
    const wait = withHands(legs({ ...P, ps: 8, pt: 74 }, { tilt: 6, spine: 0, neck: -2, shrug: 4, reach: 6, twist: 30 }), F => ({ ball: at(F.thorax, [0, 70, 84]) }));
    const held = k => ({ ...k, ...holdBall(k.ball, 0, [.6, -1, 0]) });
    const K = [[held(thr), 260, .6], [held(wait), 520, .4], [held(load), 520, .7], [held(load), 160, .1]];
    const A = keyAnim(held(load), K);
    const T = K.reduce((a, k) => a + k[2], 0), t1 = K[0][2] / T, t2 = (K[0][2] + K[1][2]) / T;
    const at_ = t => { const q = A.at(t); return { ...q, mb: t > t1 && t < t2 ? flight(thr.ball, HIT, wait.ball, (t - t1) / (t2 - t1)) : mix(sub(q.hands.L, [17, -9, -8]), sub(q.hands.R, [-17, -9, -8]), .5) }; };
    const gear = (q, F, cam) => [...GR.under([GR.obox(cam, [WX + 5, 200, 0], [[1, 0, 0], UP], [5, 200, 120], WALL_C)], 0), ...GR.ball(cam, q.mb, MB_R)];
    return { view: 'front', up: 'a', rest: 'a', cam: [-14, 8], side: [-90, 4], one: true, at: at_, gear, beat: A.beat };
  };

  /* ════ saltos: al cajón y laterales ════ */
  const jumpStand = (dx, dz, o = {}) => { const st = legs({ w: 22, toe: 8, ps: 2, pt: 88 }, { tilt: 0, spine: 0, neck: 0, shrug: 0, reach: 2, ...o }); return C.shift(withHands(st, (F, q) => ({ hands: both(sd2 => add(shoulder(F, sd2, q), sd(sd2, [14, -139, 6]))), elbow: both(() => [.2, 0, -1]), fist: false, palm: both(() => [-1, 0, 0]), handDir: both(() => [0, -1, 0]) })), [dx, 0, dz]); };
  /* (agachado para saltar: los brazos atrás; en el aire, las rodillas recogidas y los brazos arriba delante) */
  const jumpLoad = (dx, dz, o = {}) => { const st = legs({ w: 22, toe: 8, ps: 22, pt: 40 }, { tilt: 36, spine: 6, neck: -12, shrug: 0, reach: 2, ...o }); return C.shift(withHands(st, (F, q) => ({ hands: both(sd2 => add(shoulder(F, sd2, q), sd(sd2, [12, -120, -64]))), elbow: both(() => [.2, .2, -1]), fist: false, palm: both(() => [-1, 0, 0]), handDir: both(() => [0, -1, -.4]) })), [dx, 0, dz]); };
  const jumpAir = (dx, dz, h, o = {}) => { const st = legs({ w: 22, toe: 8, ps: 26, pt: 30, heel: 20 }, { tilt: 14, spine: 4, neck: -4, shrug: 6, reach: 4, ...o }); st.lL = st.lR = h; st.ry += h; return C.shift(withHands(st, (F, q) => ({ hands: both(sd2 => add(shoulder(F, sd2, q), sd(sd2, [-6, -20, 132]))), elbow: both(() => [.3, -1, -.2]), fist: false, palm: both(() => [-1, 0, 0]), handDir: both(() => [0, .3, 1]) })), [dx, 0, dz]); };
  const boxJump = () => {
    const BZ = 76, BH = 122, BD = 34;
    const onBox = (o = {}) => { const q = jumpStand(0, BZ, o); return { ...q, root: add(q.root, [0, BH, 0]), feet: both(sd2 => { const f0 = [...q.feet[sd2]]; f0[3] += BH; return f0; }) }; };
    const landBox = (() => { const q = C.shift(jumpLoad(0, BZ, { ps: 24, pt: 30, tilt: 30 }), [0, 0, 0]); return { ...q, root: add(q.root, [0, BH, 0]), feet: both(sd2 => { const f0 = [...q.feet[sd2]]; f0[3] += BH; return f0; }) }; })();
    /* (al bajar, un pie y luego el otro, hacia atrás: primero sale del cajón por encima de su borde y luego baja al suelo) */
    const back = BZ - BD - 16;
    const footOff = (q, s, z, y) => { const o = { ...q, feet: { ...q.feet } }; o.feet[s] = [q.feet[s][0], z, q.feet[s][2], y - LEN.ankle, 10]; return o; };
    const s1 = footOff(onBox({ tilt: 8 }), 'R', back, BH + 22), s2 = { ...footOff(onBox({ tilt: 4 }), 'R', 0, LEN.ankle), root: mix(onBox().root, jumpStand(0, 0).root, .5) };
    const s3 = footOff(s2, 'L', back, BH + 16), s4 = jumpStand(0, 0);
    const K = [[jumpLoad(0, 0), 300, .6], [jumpAir(0, BZ * .55, BH + 30), 220, .6], [landBox, 200, .5], [onBox(), 380, .5], [onBox(), 250, .1], [s1, 220, .35], [s2, 240, .4], [s3, 220, .35], [s4, 260, .4]];
    const A = keyAnim(jumpStand(0, 0), K);
    const gear = (q, F, cam) => GR.under([GR.obox(cam, [0, BH / 2, BZ], [[1, 0, 0], UP], [54, BH / 2, BD], ['#3a3328', '#8a7a58'])], 1);
    return { view: 'front', up: 'a', rest: 'a', cam: [-62, 10], side: [-90, 4], feetOff: true, at: A.at, gear, beat: A.beat };
  };
  /* los saltos laterales: con los dos pies, de un lado a otro de una valla baja; el skater: de una pierna a la otra, de lado,
     la de atrás cruzada por detrás y los brazos acompañando */
  const sideJump = f => {
    if (has(f, 'skater')) return skater();
    const X0 = 44;
    const land = dx => jumpLoad(dx, 0, { ps: 16, pt: 56, tilt: 18 });
    const air = (dx) => jumpAir(dx, 0, 50, { ps: 30, pt: 24, tilt: 8 });
    const K = [[land(X0), 160, .4], [air(0), 230, .6], [land(-X0), 220, .6], [air(0), 230, .6], [land(X0), 220, .6]];
    const A = keyAnim(land(X0), K);
    /* la valla: dos patas y un listón a 36 (18 cm) */
    const gear = (q, F, cam) => [...GR.tube(cam, [0, 36, -40], [0, 36, 40], 3, ['#c9b98f', '#0a0b10'], 2), ...[-40, 40].flatMap(z => GR.tube(cam, [0, 0, z], [0, 36, z], 3, ['#c9b98f', '#0a0b10'], 1))];
    return { view: 'front', up: 'a', rest: 'a', cam: [-14, 10], side: [-90, 4], feetOff: true, one: true, at: A.at, gear, beat: A.beat };
  };
  const skater = () => {
    /* (cae en una pierna, flexionada, con la otra cruzada por detrás y sin apoyar; los brazos, al otro lado) */
    const landOn = (s, x) => {
      const o = s == 'L' ? 1 : -1, st = legs({ w: 14, toe: 6, ps: 22, pt: 42 }, { tilt: 30, spine: 4, neck: -10, shrug: 0, reach: 2, twist: 14 * o });
      const q = qOf(st), back = s == 'L' ? 'R' : 'L';
      q.feet[back] = [-6, -44, 4, 22, 40]; q.knee[back] = [0, -.3, 1];
      const { F } = pose({ ...q, hands: ZERO, elbow: {} });
      return C.shift({ ...q, hands: { L: add(shoulder(F, 'L', q), [-o * 50, -110, o * 50]), R: add(shoulder(F, 'R', q), [-o * 50, -110, -o * 50]) }, elbow: both(() => [.3, 0, -1]), fist: false, palm: both(() => [-1, 0, 0]) }, [x, 0, 0]);
    };
    const air = x => jumpAir(x, 0, 22, { ps: 14, pt: 60, tilt: 16 });
    const K = [[air(0), 220, .6], [landOn('R', -70), 220, .6], [landOn('R', -70), 120, .15], [air(0), 220, .6], [landOn('L', 70), 220, .6], [landOn('L', 70), 120, .15]];
    const A = keyAnim(landOn('L', 70), K);
    return { view: 'front', up: 'a', rest: 'a', cam: [-14, 10], side: [-90, 4], feetOff: true, one: true, at: A.at, beat: A.beat };
  };

  /* ════ press Svend ════ */
  /* de pie, dos discos apretados entre las palmas delante del pecho: se empujan al frente con los brazos estirados, a la altura
     de los hombros, sin dejar de apretarlos, y vuelven al pecho */
  const svend = () => {
    const st = legs({ w: 24, toe: 10, ps: 3, pt: 86 }, { tilt: 0, spine: 0, neck: 0, shrug: 2, reach: 4 });
    const q0 = qOf(st), { F } = pose({ ...q0, hands: ZERO, elbow: {} });
    const C0 = at(F.thorax, [0, 74, 46]), C1 = at(F.thorax, [0, 80, 128]);
    const at_ = t => {
      const u = keys(t, [[0, 0], [.1, 0], [.45, 1], [.58, 1], [.95, 0], [1, 0]]), c = mix(C0, C1, u);
      /* (las palmas, contra las caras de los discos; los dedos hacia delante y arriba) */
      return { ...q0, pc: c, hands: { L: add(c, [9, 0, 0]), R: add(c, [-9, 0, 0]) }, elbow: both(() => [1, -.6, -.3 + .3 * u]), fist: false, palm: both(() => [-1, 0, 0]), handDir: both(() => norm([0, .5, 1])), reach: 4 + 8 * u };
    };
    const gear = (q, F, cam) => [-2.6, 2.6].map(dx => GR.disc(cam, add(q.pc, [dx, 0, 0]), [1, 0, 0], 24, 4.6));
    return { view: 'front', up: 'a', rest: 'a', cam: [-40, 8], side: [-90, 4], at: at_, gear, beat: cycle(2600) };
  };

  /* ════ colgado e invertido: muscle-ups, trepa de cuerda y pino ════ */
  /* las piernas sin apoyo, desde la cadera: a, lo que sube el muslo hacia delante (0: en la línea del tronco); b, lo que se
     dobla la rodilla; pf, la punta estirada; sp, lo que se abren */
  const legsFree = (q, a, b, pf = 30, sp = 0) => {
    const P = torso(q).pelvis, dir = ang => add(mul(P.y, -cos(RAD(ang))), mul(P.z, sin(RAD(ang))));
    const lg = s => C.legAt(at(P, sd(s, [20, 0, 0])), add(dir(a), mul(P.x, s == 'L' ? sp : -sp)), dir(a - b), s, P.z, pf);
    return C.legsOf({ L: lg('L'), R: lg('R') });
  };
  /* el cuerpo puesto por sus hombros: el punto medio entre ellos, en S; el tronco, con su inclinación (tilt: 180, cabeza
     abajo) y las piernas como diga legsFree */
  const bySh = (S, o) => {
    const q0 = { root: [0, 0, 0], tilt: o.tilt || 0, spine: o.spine || 0, neck: o.neck || 0, shrug: o.shrug || 0, reach: o.reach || 0, roll: o.roll || 0 }, T = torso(q0), S0 = mix(shoulder(T, 'L', q0), shoulder(T, 'R', q0), .5);
    const q = { ...q0, root: sub(S, S0) };
    return { ...q, ...legsFree(q, o.a || 0, o.b || 0, o.pf ?? 30, o.sp || 0) };
  };
  /* una anilla (vista siempre de canto, como en las dominadas): delante del puño, que la tapa */
  const ringOf = (cam, h, s) => { const c = add(h, [0, 6, 0]), P = cam.P(c), r = 11; return { z: P[2] + .5, hand: s, svg: `<ellipse cx="${P[0].toFixed(1)}" cy="${(P[1] - 2).toFixed(1)}" rx="${(r * .55).toFixed(1)}" ry="${r}" fill="none" stroke="#0a0b10" stroke-width="5"/><ellipse cx="${P[0].toFixed(1)}" cy="${(P[1] - 2).toFixed(1)}" rx="${(r * .55).toFixed(1)}" ry="${r}" fill="none" stroke="#c9b98f" stroke-width="3"/>` }; };
  /* el muscle-up: colgado, el balanceo (arqueado y en hueco), el tirón con la cadera hacia la barra (o las anillas), el paso
     por encima con el pecho adelante, el fondo abajo y el empuje hasta el apoyo con los brazos bloqueados; luego baja otra vez
     a colgar. En la barra, las manos no se mueven; en las anillas, se acercan al cuerpo (y giran por fuera en el apoyo) */
  const muscleUp = f => {
    const rings = has(f, 'rings'), YB = 470, G = rings ? 34 : 52;
    const Hn = (dx = 0, dz = 0, dy = 0) => ({ L: [G - dx, YB + dy, dz], R: [-(G - dx), YB + dy, dz] });
    const K0 = (S, o, el, hands = Hn()) => ({ ...bySh(S, o), hands, elbow: both(() => el), barDir: rings ? { L: [0, 0, 1], R: [0, 0, -1] } : [1, 0, 0] });
    const hang = K0([0, YB - 141, -4], { tilt: 0, a: 4, b: 10, shrug: 8 }, [.85, -.25, .45]);
    const arch = K0([0, YB - 140, 16], { tilt: 14, spine: -4, a: -22, b: 24, shrug: 8, neck: 8 }, [.85, -.25, .45]);
    const hollow = K0([0, YB - 138, -22], { tilt: -18, spine: 6, a: 42, b: 10, shrug: 6, neck: -6 }, [.85, -.25, .45]);
    /* (el tirón con la cadera hacia la barra: el cuerpo, detrás de ella. Al pasar, los hombros suben por detrás de la barra con
       los codos doblados atrás y las muñecas encima; abajo del fondo, la barra en el pecho, por delante; en el apoyo, la barra
       en el pliegue de la cadera, por delante de los muslos: el cuerpo siempre detrás de la barra. Las anillas, en el apoyo,
       por fuera de la cadera) */
    const pull = K0([0, YB - 74, -30], { tilt: -18, spine: 4, a: 34, b: 18, shrug: -2, neck: -4 }, [.35, -.6, -.6], rings ? Hn(4, -6) : Hn());
    /* (los codos, doblados del todo, hacia fuera y arriba: hacia atrás sin más iba casi por la línea del hombro a la mano y el
       codo saltaba de arriba abajo) */
    const over = K0([0, YB + 4, -48], { tilt: 30, spine: 10, a: 44, b: 60, shrug: -4, neck: -10 }, [.6, .8, -.3], rings ? Hn(2, -4, -4) : Hn());
    const dip = K0([0, YB + 42, -44], { tilt: 24, spine: 6, a: 24, b: 40, shrug: -2, neck: -6 }, [.6, .7, -.4], rings ? Hn(-2, -6) : Hn());
    const sup = K0([0, YB + 134, 2], { tilt: 14, spine: 2, a: 12, b: 10, shrug: -6, neck: -2 }, [.2, 0, -1], rings ? Hn(-10, -2) : Hn());
    /* (al bajar del apoyo, los hombros caen hacia atrás por detrás de la barra, con los brazos aún doblados, y el cuerpo se
       descuelga: no pasa por las manos) */
    const back = K0([0, YB - 44, -62], { tilt: -8, spine: 4, a: 30, b: 30, shrug: 0, neck: 0 }, [.6, -.6, -.3], rings ? Hn(-2, -10) : Hn());
    const A0 = keyAnim(hang, [[arch, 380, .5], [hollow, 380, .5], [pull, 260, .6], [over, 200, .6], [dip, 220, .45], [sup, 380, .6], [sup, 400, .12], [dip, 420, .5], [over, 220, .4], [back, 260, .5], [hollow, 300, .5], [hang, 360, .4]]);
    /* (lo que se agarra, de través en el puño: con la barra, la muñeca se dobla de lado lo justo; con las anillas, el asa de la
       anilla gira con la mano) */
    const at_ = t => { const q = A0.at(t), { J } = pose(q), want = rings ? [0, 0, 1] : [1, 0, 0]; return { ...q, barDir: { L: mul(acrossFist(J, 'L', want), rings ? -1 : 1), R: acrossFist(J, 'R', want) } }; };
    const A = { at: at_, beat: A0.beat };
    const gear = (q, F, cam) => {
      /* (las cintas suben por fuera de los hombros hasta su anclaje, más abierto que las anillas; en el apoyo (los hombros muy
         por encima de las anillas), si pasan por el hombro, lo rodean por fuera, apoyadas en él) */
      if (rings) {
        const { J } = pose(q);
        return ['L', 'R'].flatMap(s2 => {
          const a = add(q.hands[s2], [0, 17, 0]), b = [sd(s2, [G + 46, 0, 0])[0], YB + 330, 0], S = J[s2].sh, k = (S[1] - a[1]) / (b[1] - a[1]), xo = abs(S[0]) + 24;
          const pts = S[1] - a[1] > 80 && k < 1 && abs(mix(a, b, k)[0]) < xo ? [a, [sd(s2, [xo, 0, 0])[0], S[1], S[2]], b] : [a, b];
          return [...GR.strap(cam, pts, 2.6, GR.C.strap).map(i => ({ ...i, nf: true })), ringOf(cam, q.hands[s2], s2)];
        });
      }
      const segs = L.bar(cam, [-130, YB, 0], [130, YB, 0], 12, 5.2);
      segs.forEach((it, n) => { const x = -130 + (n + .5) * 260 / 12; ['L', 'R'].forEach(s2 => { if (abs(x - q.hands[s2][0]) < 14) it.hand = s2; }); });
      return [...segs, ...GR.sideFade([-1, 1].flatMap(k => GR.tube(cam, [k * 136, YB + 30, 0], [k * 136, 0, 0], 7, GR.C.frame, 8).map(i => ({ ...i, nf: true }))))];
    };
    return { view: 'front', up: 'a', rest: 'a', cam: [-62, 6], side: [-90, 4], feetOff: true, at: A.at, gear, beat: A.beat };
  };
  /* la trepa de cuerda: como si la cámara subiera con quien trepa (la cuerda, lisa, no deja ver que baja). Con piernas: colgado
     con las rodillas arriba y la cuerda pisada entre los pies, se pone de pie sobre ella (las manos bajan al pecho), sube las
     manos de una en una y vuelve a subir las rodillas. Sin piernas: mano sobre mano, con las piernas juntas colgando */
  const ROPE_Z = 36;
  const ropeClimb = f => {
    const legless = has(f, 'legless'), S0 = [0, 330, 0];
    const on = (y, dx = 0) => [dx, y, ROPE_Z];
    if (legless) {
      /* (cada mano: arriba, agarra y tira hasta el pecho mientras la otra sube; el cuerpo, quieto en el encuadre) */
      const hand = (t, ph) => { const u = ((t + ph) % 1 + 1) % 1; return u < .5 ? on(mix(S0[1] + 112, S0[1] + 26, ease(u * 2))) : add(on(mix(S0[1] + 26, S0[1] + 112, ease(u * 2 - 1))), [0, 0, 8 * sin(PI * (u * 2 - 1))]); };
      const at_ = t => {
        const body = bySh(S0, { tilt: 2, spine: 2, a: 14, b: 8, pf: 40, neck: 6, roll: 3 * sin(2 * PI * t) });
        const q = { ...body, hands: { L: add(hand(t, 0), [3, 0, 0]), R: add(hand(t, .5), [-3, 0, 0]) }, elbow: both(() => [.7, -.4, .2]) }, { J } = pose(q);
        return { ...q, barDir: { L: mul(acrossFist(J, 'L', [0, 1, 0]), -1), R: acrossFist(J, 'R', [0, 1, 0]) } };
      };
      const gear = (q, F, cam) => GR.strap(cam, [on(S0[1] + 260), on(S0[1] - 260)], 4.2, ROPE_C).map(i => ({ ...i, nf: true }));
      return { view: 'front', up: 'a', rest: 'a', cam: [-62, 6], side: [-90, 4], feetOff: true, one: true, at: at_, gear, beat: cycle(1400) };
    }
    /* con piernas: los cuatro momentos (las manos, a lo largo de la cuerda; los pies, sobre ella) */
    const knees = { tilt: 4, spine: 6, a: 84, b: 104, pf: 50, neck: 4 }, stand = { tilt: 0, spine: 2, a: 6, b: 6, pf: 50, neck: 6 };
    const K0 = (o, yt, yb2, dy = 0) => ({ ...bySh(add(S0, [0, dy, 0]), o), hands: { L: on(yt, 3), R: on(yb2, -3) }, elbow: both(() => [.7, -.4, .2]), barDir: { L: [0, -1, 0], R: [0, 1, 0] } });
    const k0 = K0(knees, S0[1] + 116, S0[1] + 94), k1 = K0(stand, S0[1] + 40, S0[1] + 18, 4), k2 = K0(stand, S0[1] + 116, S0[1] + 18, 4), k3 = K0(stand, S0[1] + 116, S0[1] + 94, 4);
    const A0 = keyAnim(k0, [[k1, 420, .6], [k2, 240, .4], [k3, 240, .4], [k0, 380, .6]]);
    /* (la cuerda, que va de arriba abajo, cruza el puño casi de través: la muñeca, algo doblada) */
    const A = { at: t => { const q = A0.at(t), { J } = pose(q); return { ...q, barDir: { L: mul(acrossFist(J, 'L', [0, 1, 0]), -1), R: acrossFist(J, 'R', [0, 1, 0]) } }; }, beat: A0.beat };
    const gear = (q, F, cam) => GR.strap(cam, [on(S0[1] + 260), on(S0[1] - 330)], 4.2, ROPE_C).map(i => ({ ...i, nf: true }));
    return { view: 'front', up: 'a', rest: 'a', cam: [-62, 6], side: [-90, 4], feetOff: true, one: true, at: A.at, gear, beat: A.beat };
  };
  /* el pino: las manos planas en el suelo, a la anchura de los hombros (los dedos, hacia fuera de la pared), y el cuerpo cabeza
     abajo, con la espalda hacia la pared y los talones apoyados en ella. Contra la pared quieto; flexiones estrictas (la cabeza
     baja hasta el cojín) y con impulso (las rodillas bajan al pecho y patean arriba al empujar); en pica (los pies en el
     suelo, la cadera arriba); y el wall walk (de la plancha, los pies suben por la pared y las manos se acercan a ella, hasta
     el pino de cara a la pared, y vuelve) */
  const HDH = norm([0, -.5, -15]), HSX = 50, WALL_HZ = 46;
  const hsFlat = { hands: { L: [HSX, 3.9, 0], R: [-HSX, 3.9, 0] }, handDir: both(() => HDH), palm: both(() => [0, -1, 0]), fist: false };
  const crownY = q => { const { F } = pose({ ...q, hands: ZERO, elbow: {} }); return at(F.head, [0, 23.5, -1.5])[1]; };
  const handstand = f => {
    const w = x => has(f, x);
    if (w('walk')) return wallWalk();
    if (w('pike')) return pikePU();
    /* (arriba, los hombros a un brazo de las muñecas; abajo, la coronilla en el cojín) */
    const Wr = sub(hsFlat.hands.L, mul(HDH, LEN.grip)), up = Wr[1] + sqrt((LU + LEN.fore - 2) ** 2 - (47 - HSX) ** 2);
    const top = o => ({ ...bySh([0, up, 4], { tilt: 186, spine: -4, a: 2, b: 4, pf: 40, neck: 18, ...o }), ...hsFlat, elbow: both(() => [.3, .2, 1]) });
    const yLow = solve(y => crownY(bySh([0, y, -6], { tilt: 186, spine: -6, a: 4, b: 6, pf: 40, neck: 26 })) - 9, 40, 200);
    /* (abajo, los codos salen hacia fuera y hacia la cara, no hacia la pared) */
    const low = o => ({ ...bySh([0, yLow, -6], { tilt: 186, spine: -6, a: 4, b: 6, pf: 40, neck: 26, ...o }), ...hsFlat, elbow: both(() => [.6, .1, -.4]) });
    /* (la pared, hasta algo más arriba de los pies; el cojín, bajo la cabeza) */
    const gear = (q, F, cam) => [...GR.under([GR.obox(cam, [0, 210, WALL_HZ + 5], [[1, 0, 0], UP], [110, 210, 5], WALL_C)], 0), ...(w('hold') ? [] : GR.under([GR.obox(cam, [0, 4, -12], [[1, 0, 0], UP], [24, 4, 18], GR.C.pad)], 1))];
    if (w('hold')) {
      const at_ = t => { const b = sin(2 * PI * t); return { ...top({ spine: -4 + 1.2 * b }), root: add(top().root, [0, .8 * b, 0]) }; };
      return { view: 'front', up: 'a', rest: 'a', cam: [-70, 6], side: [-90, 4], feetOff: true, at: at_, gear, beat: cycle(4000) };
    }
    if (w('kip')) {
      /* (abajo, la cabeza en el cojín, las rodillas bajan hacia el pecho; patada arriba con la cadera y empuje a la vez) */
      const tuck = low({ a: 96, b: 120, tilt: 176, spine: 4 }), kick = top({ a: 4, b: 0, tilt: 188 });
      const A = keyAnim(top(), [[low(), 520, .6], [tuck, 300, .5], [kick, 220, .6], [top(), 260, .4], [top(), 300, .1]]);
      return { view: 'front', up: 'a', rest: 'a', cam: [-70, 6], side: [-90, 4], feetOff: true, at: A.at, gear, beat: A.beat };
    }
    const A = keyAnim(top(), [[low(), 900, .8], [low(), 150, .1], [top(), 900, .8], [top(), 300, .1]]);
    return { view: 'front', up: 'a', rest: 'a', cam: [-70, 6], side: [-90, 4], feetOff: true, at: A.at, gear, beat: A.beat };
  };
  /* en pica: los pies en el suelo y la cadera arriba (el cuerpo, una V del revés); la cabeza baja entre las manos y sube */
  const pikePU = () => {
    /* (los pies, donde las piernas quedan estiradas arriba; abajo, la cadera baja un poco y las rodillas se doblan apenas) */
    let ZFt = -120;
    const mk = (sy, sz, tilt, neck) => { const q = bySh([0, sy, sz], { tilt, spine: 4, neck }); return { ...q, feet: both(() => [22, ZFt, 4, 0, 0]), knee: both(() => [0, -.4, 1]), ...hsFlat, handDir: both(() => norm([0, -.5, 15])) }; };
    const Wr = sub(hsFlat.hands.L, mul(norm([0, -.5, 15]), LEN.grip)), upY = Wr[1] + sqrt((LU + LEN.fore - 2) ** 2 - 9 - 100);
    { const P0 = torso(mk(upY, -10, 120, 30)).pelvis, Hp = at(P0, [20, 0, 0]); ZFt = Hp[2] - sqrt(max(0, (LEN.thigh + LEN.shin - 2) ** 2 - (Hp[1] - LEN.ankle) ** 2 - 4)); }
    const top = { ...mk(upY, -10, 120, 30), elbow: both(() => [.4, .3, -1]) };
    const yLow = solve(y => crownY(mk(y, 6, 128, 40)) - 6, 30, upY);
    const bot = { ...mk(yLow, 6, 128, 40), elbow: both(() => [.6, .3, -.8]) };
    const A = keyAnim(top, [[bot, 900, .8], [bot, 150, .1], [top, 900, .8], [top, 300, .1]]);
    return { view: 'front', up: 'a', rest: 'a', cam: [-70, 8], side: [-90, 4], at: A.at, beat: A.beat };
  };
  /* el wall walk: tumbado boca abajo con los pies contra la pared; se sube a la plancha, los pies trepan por la pared mientras
     las manos andan hacia ella, hasta el pino con el pecho de cara a la pared; y vuelve igual */
  const wallWalk = () => {
    /* (la pared, detrás de los pies: tumbado boca abajo, la cabeza va hacia +z y los pies hacia la pared, en -z; al subir, el
       cuerpo gira hasta quedar cabeza abajo con la tripa hacia la pared) */
    const WZ = -40, HDW = norm([0, -.5, 15]);
    const flat = { hands: { L: [HSX, 3.9, 0], R: [-HSX, 3.9, 0] }, handDir: both(() => HDW), palm: both(() => [0, -1, 0]), fist: false };
    const Wr = sub(flat.hands.L, mul(HDW, LEN.grip)), up = Wr[1] + sqrt((LU + LEN.fore - 2) ** 2 - (47 - HSX) ** 2);
    /* cada momento: el cuerpo recto con su inclinación (tilt: 90, tumbado; 180, cabeza abajo), los hombros sobre las manos y
       todo corrido a lo largo hasta que las puntas de los pies tocan la pared */
    const key = (tilt, pf, neck) => {
      const q = { ...bySh([0, up, 0], { tilt, spine: 0, a: 0, b: 0, pf, neck }), ...flat, elbow: both(() => [.3, .2, -1]) };
      const { J } = pose({ ...q }), toe = min(...['L', 'R'].map(s2 => J[s2].ankle[2])) - 14, dz = WZ - toe;
      return C.shift(q, [0, 0, dz]);
    };
    /* (abajo, en plancha, las puntas en el suelo junto a la pared) */
    const plank = (() => { const q = { ...PU.mk(PU.th0, PU.zA), ...flat, elbow: both(() => [.55, .28, -.8]) }, toeZ = q.feet.L[1] - 20; return C.shift(q, [0, 0, WZ - toeZ]); })();
    const k1 = key(116, 50, 16), k2 = key(142, 30, 22), k3 = key(166, 20, 26), k4 = key(178, 10, 28);
    const A = keyAnim(plank, [[k1, 700, .6], [k2, 700, .6], [k3, 700, .6], [k4, 600, .5], [k4, 500, .15], [k3, 600, .5], [k2, 700, .6], [k1, 700, .6], [plank, 700, .6], [plank, 300, .1]]);
    const gear = (q, F, cam) => GR.under([GR.obox(cam, [0, 210, WZ - 5], [[1, 0, 0], UP], [110, 210, 5], WALL_C)], 0);
    return { view: 'front', up: 'a', rest: 'a', cam: [-70, 8], side: [-90, 4], feetOff: true, at: A.at, gear, beat: A.beat };
  };

  /* ════ gateos e inchworm ════ */
  /* el paso de cada apoyo (mano o pie) en el sitio, como en una cinta: apoyado, va hacia atrás de z0 + S/2 a z0 - S/2; en el
     aire, vuelve adelante levantándose h. ph: su desfase; st: la parte de la vuelta apoyado */
  const stepZ = (t, ph, S, st, z0, h) => { const u = ((t + ph) % 1 + 1) % 1; if (u < st) return [z0 + S / 2 - S * u / st, 0]; const v = (u - st) / (1 - st); return [z0 - S / 2 + S * ease(v), h * sin(PI * v)]; };
  /* el oso: a cuatro patas, con la espalda plana y las rodillas a un palmo del suelo; avanza mano y pie contrarios a la vez.
     El cangrejo: boca arriba, la cadera levantada, las manos detrás de los hombros y los pies delante; también a contrarios */
  const crawl = f => has(f, 'crab') ? crabWalk() : bearCrawl();
  const bearCrawl = () => {
    const S = 46, st = .62;
    const at_ = t => {
      const ph = 2 * PI * t;
      /* el tronco: la cadera algo por debajo de los hombros, los hombros sobre las manos (los brazos estirados) */
      const root = [1.5 * sin(ph), 98, -50], q0 = { root, tilt: 80, spine: 4, neck: -40, shrug: 4, reach: 4, roll: 3 * sin(ph), twist: 2 * sin(ph) };
      const { F } = pose({ ...q0, feet: both(() => [18, -60, 0, 0, 60]), knee: both(() => [0, -1, .3]), hands: ZERO, elbow: {} });
      const Sz = shoulder(F, 'L', q0)[2];
      /* (las manos, bajo los hombros; los pies, con las puntas en el suelo detrás de las rodillas) */
      const hand = (s2, phs) => { const [z, h] = stepZ(t, phs, S, st, Sz + 4, 12); return [sd(s2, [40, 0, 0])[0], 3.9 + h, z]; };
      const foot = (s2, phs) => { const [z, h] = stepZ(t, phs, S, st, root[2] - 64, 10); return [18, z, 4, 40.6 - LEN.ankle + h, 66]; };
      return { ...q0, hands: { L: hand('L', 0), R: hand('R', .5) }, feet: { L: foot('L', .5), R: foot('R', 0) }, knee: both(() => [0, -1, .35]), handDir: both(() => norm([0, -.5, 15])), palm: both(() => [0, -1, 0]), fist: false, elbow: both(() => [.3, .1, -1]) };
    };
    return { view: 'front', up: 'a', rest: 'a', cam: [-66, 10], side: [-90, 4], feetOff: true, one: true, at: at_, beat: cycle(1300) };
  };
  const crabWalk = () => {
    const S = 40, st = .62;
    const at_ = t => {
      const ph = 2 * PI * t;
      /* (boca arriba: la cabeza hacia -z; la cadera a medio metro del suelo, los hombros algo más altos, sobre las manos) */
      const root = [1.5 * sin(ph), 66, 0], q0 = { root, tilt: -62, spine: -6, neck: 20, shrug: 8, reach: -4, roll: 3 * sin(ph), twist: 2 * sin(ph) };
      const { F } = pose({ ...q0, feet: both(() => [24, 60, 0, 0, 0]), knee: both(() => [0, 1, .3]), hands: ZERO, elbow: {} });
      const Sz = shoulder(F, 'L', q0)[2];
      /* (las manos, detrás de los hombros, con los dedos hacia los pies; los pies, planos delante, las rodillas arriba) */
      const hand = (s2, phs) => { const [z, h] = stepZ(t, phs, S, st, Sz - 12, 12); return [sd(s2, [48, 0, 0])[0], 3.9 + h, z]; };
      const foot = (s2, phs) => { const [z, h] = stepZ(t, phs, S, st, root[2] + 92, 12); return [24, z, 10, h, 0]; };
      return { ...q0, hands: { L: hand('L', 0), R: hand('R', .5) }, feet: { L: foot('L', .5), R: foot('R', 0) }, knee: both(() => [.15, 1, .3]), handDir: both(() => norm([0, -.5, 15])), palm: both(() => [0, -1, 0]), fist: false, elbow: both(() => [.2, -.2, -1]) };
    };
    return { view: 'front', up: 'a', rest: 'a', cam: [-66, 12], side: [-90, 4], feetOff: true, one: true, at: at_, beat: cycle(1400) };
  };
  /* el inchworm (en el sitio): de pie, se dobla con las piernas estiradas hasta poner las manos en el suelo junto a los pies;
     las manos andan hacia delante hasta la plancha y vuelven andando hasta los pies, y se pone de pie */
  const inchworm = () => {
    /* (las manos planas, con los dedos hacia delante; los pies quietos, en z = -144 respecto de la plancha) */
    const flat = z => ({ hands: { L: [44, 3.9, z], R: [-44, 3.9, z] }, handDir: both(() => norm([0, -.5, 15])), palm: both(() => [0, -1, 0]), fist: false });
    const plank = { ...PU.mk(PU.th0, PU.zA), ...flat(0), elbow: both(() => [.55, .28, -.8]) }, FZ = plank.feet.L[1];
    /* la V del revés con las manos en zh: la cadera alta, las piernas estiradas; los hombros, a un brazo de las manos */
    const vee = (zh, tilt) => {
      const Wr = [44, 3.9 + 4, zh], up = Wr[1] + sqrt((LU + LEN.fore - 4) ** 2 - 9);
      const q = bySh([0, up, zh], { tilt, spine: 4, neck: 20 });
      return { ...q, feet: both(() => [14, FZ, 4, 0, 0]), knee: both(() => [0, -.4, 1]), ...flat(zh), elbow: both(() => [.3, .3, -1]) };
    };
    const stand = (() => { const st = legs({ w: 14, toe: 4, ps: 2, pt: 88 }, { tilt: 0, spine: 0, neck: 0, shrug: 0, reach: 2 }); st.zL = st.zR = FZ; st.rz += FZ; return withHands(st, (F, q) => ({ hands: both(sd2 => add(shoulder(F, sd2, q), sd(sd2, [14, -139, 6]))), elbow: both(() => [.2, 0, -1]), fist: false, palm: both(() => [-1, 0, 0]), handDir: both(() => [0, -1, 0]) })); })();
    /* (doblado: las manos junto a las puntas de los pies) */
    const fold = vee(FZ + 44, 150), mid1 = vee(FZ + 86, 132), mid2 = vee(FZ + 118, 112);
    /* (una mano y luego la otra) */
    const step = (a, b, s2) => { const o = { ...a, hands: { ...a.hands } }; o.hands[s2] = [...b.hands[s2]]; return o; };
    const K = [[fold, 700, .6], [step(fold, mid1, 'L'), 240, .25, 0], [mid1, 240, .25], [step(mid1, mid2, 'R'), 240, .25], [mid2, 240, .25], [step(mid2, plank, 'L'), 240, .25], [plank, 240, .25], [plank, 400, .12],
      [step(plank, mid2, 'R'), 240, .25], [mid2, 240, .25], [step(mid2, mid1, 'L'), 240, .25], [mid1, 240, .25], [step(mid1, fold, 'R'), 240, .25], [fold, 240, .25], [stand, 800, .6], [stand, 300, .1]];
    const A = keyAnim(stand, K);
    return { view: 'front', up: 'a', rest: 'a', cam: [-70, 8], side: [-90, 4], feetOff: true, one: true, at: A.at, beat: A.beat };
  };

  /* ════ battle ropes ════ */
  /* en media sentadilla, con el extremo de una cuerda gruesa en cada mano; las manos suben y bajan a destiempo (olas
     alternas) y las ondas corren por las cuerdas hasta el anclaje, delante, donde mueren; cerca del anclaje la cuerda
     descansa en el suelo */
  const BR_C = ['#3a4058', '#0a0b10'];
  const ropes = () => {
    const ANC = 460, st = legs({ w: 34, toe: 14, ps: 18, pt: 52 }, { tilt: 16, spine: 2, neck: -6, shrug: 4, reach: 6 }), q0 = qOf(st), { F } = pose({ ...q0, hands: ZERO, elbow: {} });
    const H0 = s2 => add(shoulder(F, s2, q0), sd(s2, [-4, -96, 76]));
    const at_ = t => {
      const ph = 2 * PI * t, o = { hands: {} };
      for (const [s2, k] of [['L', 0], ['R', PI]]) o.hands[s2] = add(H0(s2), [0, 26 * sin(ph + k), 6 * cos(ph + k)]);
      /* (el extremo de la cuerda, en el puño con agarre neutro: de través a él, de arriba abajo) */
      const q = { ...q0, ...o, elbow: both(() => [.5, -.6, -.4]) }, { J } = pose(q);
      return { ...q, barDir: { L: mul(acrossFist(J, 'L', [0, 1, 0]), -1), R: acrossFist(J, 'R', [0, 1, 0]) } };
    };
    const gear = (q, F, cam) => ['L', 'R'].flatMap((s2, i) => {
      const h = q.hands[s2], A = [sd(s2, [10, 0, 0])[0], 6, ANC], N = 16, pts = [], ph = 2 * PI * ((Date.now ? 0 : 0) + 0);
      const t0 = Math.atan2(h[1] - H0(s2)[1], (h[2] - H0(s2)[2]) / .23);
      for (let k = 0; k <= N; k++) {
        const u = k / N, base = mix(h, A, u), sag = -min(h[1] - 6, 0) * 0;
        /* (la onda: sale de la mano y se apaga hacia el anclaje; la cuerda baja hacia el suelo y se apoya en él al final) */
        const amp = 26 * (1 - u) ** 1.2, y = max(4, base[1] - (h[1] - 6) * u * (2 - u) * .55 + amp * sin(t0 - 2 * PI * u * 2.2) * (u > 0 ? 1 : 0));
        pts.push([base[0], u == 0 ? h[1] : y, base[2]]);
      }
      return GR.strap(cam, pts, 6, BR_C).map(it => ({ ...it, hand: s2 }));
    }).concat(GR.under([GR.obox(cam, [0, 20, ANC + 10], [[1, 0, 0], UP], [20, 20, 12], GR.C.frame)], 0));
    return { view: 'front', up: 'a', rest: 'a', cam: [-62, 8], side: [-90, 4], one: true, at: at_, gear, beat: cycle(560) };
  };

  /* ════ volteo de neumático ════ */
  /* un neumático grande tumbado (1 m, 35 cm de ancho): en cuclillas, con el pecho contra él y los dedos debajo del borde, se
     levanta empujando con las piernas; el neumático gira sobre su borde de delante hasta ponerse de pie, mientras quien lo
     levanta avanza pegado a él; las manos cambian, lo empujan y cae al otro lado; luego anda hasta él. La cámara va con quien
     lo voltea (el suelo no se ve): es el neumático el que se acerca */
  const TIRE_R = 100, TIRE_W = 70;
  const tire = () => {
    const Z0 = TIRE_R + 30, P1 = Z0 + TIRE_R, P2 = P1 + TIRE_W, TRIP = 2 * TIRE_R + TIRE_W;
    /* el neumático girado a grados: hasta 90, sobre el borde de delante de su cara de abajo; de 90 a 180, sobre el de la otra
       cara (de pie, apoya en su banda) */
    const rot = (d, a) => [d[0] * cos(a) - d[1] * sin(a), d[0] * sin(a) + d[1] * cos(a)];
    const tireAt = ang => {
      if (ang <= 90) { const a = RAD(ang), c = rot([TIRE_W / 2, Z0 - P1], a), x = rot([1, 0], a); return { c: [0, c[0], P1 + c[1]], ax: [0, x[0], x[1]] }; }
      const b = RAD(ang - 90), c = rot([TIRE_R, P1 + TIRE_W / 2 - P2], b), x = rot([0, 1], b);
      return { c: [0, c[0], P2 + c[1]], ax: [0, x[0], x[1]] };
    };
    /* el borde de cerca de la cara de abajo (donde agarran los dedos al levantarlo) */
    const nearEdge = ang => { const a = RAD(min(ang, 90)), d = rot([0, -2 * TIRE_R], a); return [0, d[0], P1 + d[1]]; };
    /* lo que ha avanzado quien lo voltea: nada en cuclillas; pegado al neumático mientras sube; y andando hasta él al final */
    /* (al principio, mientras el borde sube por delante de las piernas, se queda donde está; avanza cuando ya está alto) */
    const travel = t => t < .3 ? 0 : t < .62 ? 76 * ease((t - .3) / .32) : t < .72 ? 76 + 16 * ease((t - .62) / .1) : t < .92 ? 92 + (TRIP - 92) * (t - .72) / .2 : TRIP;
    /* (los pies juntos y las manos por fuera de las rodillas, bajo el borde) */
    const P = { w: 19, toe: 8 };
    /* (abajo, las espinillas casi verticales: las rodillas no pasan por encima del neumático, que es más bajo que ellas) */
    const low = withHands(legs({ ...P, ps: 12, pt: 18 }, { tilt: 56, spine: 8, neck: -26, shrug: 0, reach: 6 }), () => ({}));
    const drive = withHands(legs({ ...P, ps: 16, pt: 50 }, { tilt: 32, spine: 2, neck: -12, shrug: 4, reach: 6 }), () => ({}));
    const up = withHands(legs({ ...P, ps: 10, pt: 74, heel: 10 }, { tilt: 20, spine: 0, neck: -6, shrug: 6, reach: 8 }), () => ({}));
    const push = withHands(legs({ ...P, ps: 18, pt: 64 }, { tilt: 26, spine: 2, neck: -8, shrug: 6, reach: 12 }), () => ({}));
    const seqK = [[0, low, 0], [.18, low, 0], [.38, drive, 30], [.52, up, 62], [.62, push, 90], [.72, push, 180]];
    const at_ = t => {
      const dz = -travel(t);
      if (t > .72) {
        /* (andando en el sitio hasta el neumático, que se acerca; al llegar, los pies juntos y otra vez en cuclillas) */
        const walkQ = u => { const g = gait((u * 2) % 1, { S: 80, w: 19, toe: 6, lift: 10, z0: -16 }), q = { feet: g.feet, knee: g.knee, root: [0, hipOver(g.ank, ROOT_Y - 2), -16], tilt: mix(26, 3, ease(min(1, u * 3))), spine: 0, neck: -4, shrug: 2, reach: 4 }, { F } = pose({ ...q, hands: ZERO, elbow: {} }); return { ...q, hands: both(sd2 => add(shoulder(F, sd2, q), sd(sd2, [16, -138, 10]))), elbow: both(() => [.2, 0, -1]), fist: false, palm: both(() => [-1, 0, 0]) }; };
        if (t < .92) return { ...walkQ((t - .72) / .2), tire: tireAt(180), dz };
        const k = ease((t - .92) / .08), lowQ = { ...low, hands: both(sd2 => add(nearEdge(0), [sd(sd2, [52, 0, 0])[0], 5, -7])), elbow: both(() => [.4, -.6, -.6]), fist: false, palm: both(() => norm([-.3, 1, 0])), handDir: both(() => norm([0, .4, 1])) };
        return { ...qmix(walkQ(1), lowQ, k), tire: tireAt(180), dz };
      }
      let i = 0; while (i < seqK.length - 2 && t > seqK[i + 1][0]) i++;
      const [ta, Ka, aa] = seqK[i], [tb, Kb, ab] = seqK[i + 1], k = ease(clamp((t - ta) / (tb - ta), 0, 1)), ang = aa + (ab - aa) * k;
      /* (al avanzar pegado al neumático, pasos cortos en el sitio) */
      const q = qmix(Ka, Kb, k), stepUp = t > .3 && t < .62 ? 8 * abs(sin(PI * (t - .3) / .32 * 2)) : 0;
      const sL = Math.floor((t - .3) / .32 * 2) % 2 == 0;
      if (stepUp) { q.feet = { L: [...q.feet.L], R: [...q.feet.R] }; q.feet[sL ? 'L' : 'R'][3] += stepUp; }
      const { F } = pose({ ...q, hands: ZERO, elbow: {} });
      /* las manos: debajo del borde mientras sube (los dedos debajo); al pasar de 64°, en la cara, empujando; caído, al frente */
      const E = add(nearEdge(ang), [0, 0, dz]), pw = clamp((ang - 60) / 24, 0, 1), T0 = tireAt(min(ang, 90));
      const under = both(sd2 => add(E, [sd(sd2, [52, 0, 0])[0], 5, -7])), onFace = both(sd2 => add(add(T0.c, [0, 0, dz]), add(mul(T0.ax, -TIRE_W / 2 - 6), [sd(sd2, [34, 0, 0])[0], 0, 0])));
      const hands = ang > 92 ? both(sd2 => add(shoulder(F, sd2, q), sd(sd2, [-8, -4, 132]))) : { L: mix(under.L, onFace.L, pw), R: mix(under.R, onFace.R, pw) };
      return { ...q, hands, elbow: both(() => [.4, -.6, -.6]), fist: false, palm: both(() => norm([-.3, 1 - 2 * pw, pw])), handDir: both(() => norm([0, .4 - .5 * pw, 1])), tire: tireAt(ang), dz };
    };
    const gear = (q, F, cam) => [GR.disc(cam, add(q.tire.c, [0, 0, q.dz]), q.tire.ax, TIRE_R, TIRE_W, 'tire')];
    return { view: 'front', up: 'a', rest: 'a', cam: [-60, 10], side: [-90, 4], feetOff: true, one: true, at: t => reachClamp(at_(t)), gear, beat: cycle(4200) };
  };

  const stub = () => null;
  Object.assign(F3.FAMILIES, { oly, kbell, carry, sled, burpee, wallBall, medBall, boxJump, sideJump, muscleUp, ropeClimb, handstand, crawl, inchworm, svend, ropes, tire });
  F3.flib = { spl, sequence, footUp, legRootA, legsAt, qOf, legs, BASE };
})(window);
